import './styles/tokens.css';
import './styles/base.css';
import './styles/board.css';
import './styles/components.css';
import './styles/animations.css';

import { DIFFICULTY_LABELS } from './core/constants';
import {
  applyCellInput,
  createNewGameState,
  fillAutoNotes,
  redoState,
  triggerSmartHint,
  undoState,
} from './core/state';
import { Difficulty, GameConfig, GameState } from './core/types';
import { audioService } from './services/audio';
import { getDailyConfig } from './services/daily';
import { hapticsService } from './services/haptics';
import { loadSettings, saveSettings, UserSettings } from './services/settings';
import {
  loadAutosavedGame,
  recordGameStart,
  recordGameWin,
  saveAutosavedGame,
} from './services/stats';
import { BoardView } from './ui/board';
import { renderControlsAndStats } from './ui/controls';
import { KeypadView } from './ui/keypad';
import {
  closeAllModals,
  openHelpModal,
  openNewGameModal,
  openSettingsModal,
  openStatsModal,
  openWinModal,
} from './ui/modals';
import { applyFontSize, applyTheme } from './ui/theme';
import { GameTimer } from './ui/timer';
import {
  clearBannerMessage,
  renderHintBanner,
  setBoardStatus,
  showBannerMessage,
} from './ui/toast';
import type { WorkerRequest, WorkerResponse } from './workers/generator.worker';

let settings: UserSettings = loadSettings();
let state: GameState;
let boardView: BoardView;
let keypadView: KeypadView;
let gameTimer: GameTimer;
let generatorWorker: Worker | null = null;
let workerReqId = 0;

function initWorker(): void {
  try {
    generatorWorker = new Worker(new URL('./workers/generator.worker.ts', import.meta.url), {
      type: 'module',
    });
  } catch {
    generatorWorker = null;
  }
}

function applyUserPreferences(nextSettings: UserSettings): void {
  settings = nextSettings;
  saveSettings(settings);
  applyTheme(settings.theme);
  applyFontSize(settings.fontSize);
  audioService.enabled = settings.soundEnabled;
  hapticsService.enabled = settings.hapticsEnabled;
  if (state) {
    renderAll();
  }
}

function renderAll(): void {
  boardView.render(
    state,
    settings,
    () => togglePause(),
    () => openNewGameModal(state, startNewPuzzle)
  );
  keypadView.render(state);
  renderControlsAndStats(state, settings);
  gameTimer.render(state, settings.showTimer);
  renderHintBanner(state.activeHint, () => handleSmartHint());

  // Sync quick-select dropdowns in the sidebar
  const diffSelect = document.getElementById('difficulty') as HTMLSelectElement | null;
  if (diffSelect && diffSelect.value !== state.difficulty) {
    diffSelect.value = state.difficulty;
  }
  const timeSelect = document.getElementById('timeSelect') as HTMLSelectElement | null;
  if (timeSelect && Number(timeSelect.value) !== state.timeLimit) {
    timeSelect.value = String(state.timeLimit);
  }
}

function handleWin(): void {
  gameTimer.stop();
  audioService.playWin();
  hapticsService.success();
  const unlocked = recordGameWin(state);
  showBannerMessage('Puzzle solved! Great work.', 'good');
  renderAll();
  openWinModal(state, unlocked, () => openNewGameModal(state, startNewPuzzle));
}

function handleLoss(): void {
  gameTimer.stop();
  audioService.playError();
  hapticsService.error();
  saveAutosavedGame(state);
  if (state.loseReason === 'time') {
    showBannerMessage('Time is up! Start a new game to try again.', 'error');
  } else {
    showBannerMessage(`Game over! You reached ${state.maxMistakes} mistakes.`, 'error');
  }
  renderAll();
}

function handleCellSelection(cellIndex: number, isLongPress: boolean): void {
  if (!state.started || state.paused || state.ended) return;

  if (isLongPress && state.mode !== 'purist') {
    state.notesMode = !state.notesMode;
    hapticsService.medium();
    setBoardStatus(`Notes mode turned ${state.notesMode ? 'On' : 'Off'}.`);
  }

  state.selected = cellIndex;

  // If Quick-Fill mode is active and a digit is selected, place it immediately on tap
  if (state.quickFill && state.activeDigit !== null && !state.fixed[cellIndex]) {
    handleDigitInput(state.activeDigit, false, cellIndex);
    return;
  }

  const r = Math.floor(cellIndex / state.size) + 1;
  const c = (cellIndex % state.size) + 1;
  if (state.fixed[cellIndex]) {
    setBoardStatus(`Row ${r}, Col ${c} is a given clue (${state.board[cellIndex]}).`);
  } else {
    setBoardStatus(`Selected Row ${r}, Col ${c}.`);
  }
  renderAll();
}

function handleDigitInput(digit: number, forceNotes = false, targetCell?: number): void {
  if (!state.started || state.paused || state.ended) return;

  if (state.quickFill && digit > 0 && targetCell === undefined) {
    state.activeDigit = state.activeDigit === digit ? null : digit;
    setBoardStatus(
      state.activeDigit
        ? `Quick-Fill active for digit ${state.activeDigit}. Tap empty cells to place it.`
        : 'Quick-Fill digit cleared.'
    );
    renderAll();
    return;
  }

  const outcome = applyCellInput(state, digit, {
    autoClearNotes: settings.autoClearNotes,
    forceNotes,
    cellIndex: targetCell,
  });

  if (!outcome.changed) return;

  saveAutosavedGame(state);

  if (outcome.wonNow) {
    handleWin();
    return;
  }

  if (outcome.lostNow) {
    handleLoss();
    return;
  }

  if (outcome.mistakeMade) {
    audioService.playError();
    hapticsService.error();
    setBoardStatus(`Not quite — ${digit} doesn't belong here.`);
  } else if (outcome.noteToggled) {
    audioService.playNote();
    hapticsService.light();
    setBoardStatus(`Pencil note ${digit} updated.`);
  } else if (digit === 0) {
    audioService.playErase();
    hapticsService.light();
    setBoardStatus('Cell cleared.');
  } else {
    if (state.lastCompletedUnits.length > 0) {
      audioService.playUnitComplete();
    } else {
      audioService.playPlace();
    }
    hapticsService.light();
    setBoardStatus(`Placed ${digit}.`);
  }

  renderAll();
}

function handleSmartHint(): void {
  const res = triggerSmartHint(state, settings.autoClearNotes);
  if (!res) return;

  audioService.playHint();
  hapticsService.medium();
  saveAutosavedGame(state);

  if (res.stage === 1) {
    setBoardStatus(`${res.hint.technique}: see the highlighted cell.`);
  } else {
    setBoardStatus(`Hint filled ${res.hint.digit}.`);
    if (res.wonNow) {
      handleWin();
      return;
    }
  }
  renderAll();
}

function handleCheckBoard(): void {
  if (!state.started || state.paused || state.ended) return;
  const emptyCount = state.board.filter((v) => v === 0).length;
  const wrongCells = state.board.filter((v, i) => v !== 0 && v !== state.solution[i]).length;

  if (wrongCells > 0) {
    audioService.playError();
    showBannerMessage(
      `Found ${wrongCells} incorrect number${wrongCells === 1 ? '' : 's'}. Check the highlighted cells!`,
      'warn'
    );
  } else if (emptyCount > 0) {
    audioService.playHint();
    showBannerMessage(
      `Everything placed so far is accurate! ${emptyCount} empty cell${emptyCount === 1 ? '' : 's'} left.`,
      'good'
    );
  }
  renderAll();
}

function togglePause(): void {
  if (!state.started || state.ended) return;
  state.paused = !state.paused;
  if (state.paused) {
    gameTimer.stop();
    setBoardStatus('Game paused — board hidden.');
  } else {
    gameTimer.start(state);
    setBoardStatus('Game resumed.');
  }
  saveAutosavedGame(state);
  renderAll();
}

function startNewPuzzle(config: GameConfig): void {
  clearBannerMessage();
  setBoardStatus('Generating unique-solution puzzle...');

  const applyCreatedState = (newState: GameState) => {
    state = newState;
    recordGameStart();
    saveAutosavedGame(state);
    gameTimer.start(state);
    setBoardStatus(
      state.isDaily
        ? `Daily Challenge (${state.dailyDate}) started! Select an empty cell.`
        : `New ${state.size}×${state.size} ${DIFFICULTY_LABELS[state.difficulty]} puzzle ready.`
    );
    renderAll();
  };

  // Use Web Worker for non-blocking generation when no custom puzzle string is passed
  if (generatorWorker && !config.customPuzzle) {
    const reqId = ++workerReqId;
    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id !== reqId) return;
      generatorWorker?.removeEventListener('message', onMessage);
      if (e.data.success && e.data.result) {
        const gen = e.data.result;
        const nextState = createNewGameState({
          ...config,
          seed: gen.seed,
          customPuzzle: { puzzle: gen.puzzle, solution: gen.solution },
        });
        applyCreatedState(nextState);
      } else {
        applyCreatedState(createNewGameState(config));
      }
    };
    generatorWorker.addEventListener('message', onMessage);
    const payload: WorkerRequest = {
      id: reqId,
      size: config.size,
      difficulty: config.difficulty,
      seed: config.seed,
    };
    generatorWorker.postMessage(payload);
  } else {
    applyCreatedState(createNewGameState(config));
  }
}

function startDailyPuzzle(): void {
  const daily = getDailyConfig();
  startNewPuzzle({
    size: daily.size,
    difficulty: daily.difficulty,
    mode: 'standard',
    timeLimit: 0,
    seed: daily.seed,
    isDaily: true,
    dailyDate: daily.dateStr,
  });
}

function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ignore shortcuts when typing in an input or when a modal is open
    const activeTag = (document.activeElement?.tagName || '').toLowerCase();
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
    if (document.querySelector('.modal-backdrop.open')) {
      if (e.key === 'Escape') closeAllModals();
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey ? redoState(state) : undoState(state)) {
          saveAutosavedGame(state);
          renderAll();
        }
        return;
      }
      if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (redoState(state)) {
          saveAutosavedGame(state);
          renderAll();
        }
        return;
      }
    }

    if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
      if (state.mode !== 'purist' && state.started && !state.paused && !state.ended) {
        state.notesMode = !state.notesMode;
        setBoardStatus(`Notes mode: ${state.notesMode ? 'On' : 'Off'}`);
        renderAll();
      }
      return;
    }

    if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) {
      togglePause();
      return;
    }

    if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
      handleSmartHint();
      return;
    }

    if (state.selected < 0) return;

    const num = Number(e.key);
    if (Number.isInteger(num) && num >= 1 && num <= state.size) {
      e.preventDefault();
      handleDigitInput(num);
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      handleDigitInput(0);
      return;
    }

    const s = state.size;
    let nextIdx = state.selected;
    if (e.key === 'ArrowUp' && state.selected >= s) {
      e.preventDefault();
      nextIdx = state.selected - s;
    } else if (e.key === 'ArrowDown' && state.selected < s * (s - 1)) {
      e.preventDefault();
      nextIdx = state.selected + s;
    } else if (e.key === 'ArrowLeft' && state.selected % s > 0) {
      e.preventDefault();
      nextIdx = state.selected - 1;
    } else if (e.key === 'ArrowRight' && state.selected % s < s - 1) {
      e.preventDefault();
      nextIdx = state.selected + 1;
    }

    if (nextIdx !== state.selected) {
      state.selected = nextIdx;
      renderAll();
      boardView.focusCell(nextIdx);
    }
  });
}

function bootstrap(): void {
  applyUserPreferences(settings);
  initWorker();

  const boardEl = document.getElementById('board')!;
  const overlayEl = document.getElementById('boardOverlay')!;
  const numbersEl = document.getElementById('numbers')!;

  boardView = new BoardView(boardEl, overlayEl, handleCellSelection);
  keypadView = new KeypadView(numbersEl, (digit, isLongPress) => {
    handleDigitInput(digit, isLongPress);
  });

  gameTimer = new GameTimer(
    () => {
      gameTimer.render(state, settings.showTimer);
      saveAutosavedGame(state);
    },
    () => handleLoss()
  );

  // Restore autosaved game if available, otherwise generate fresh initial game
  const saved = loadAutosavedGame();
  if (saved) {
    state = saved;
    state.paused = false;
    setBoardStatus('Resumed your saved puzzle automatically.');
    gameTimer.start(state);
  } else {
    state = createNewGameState({
      size: 9,
      difficulty: 'easy',
      mode: 'standard',
      timeLimit: 0,
    });
    recordGameStart();
    saveAutosavedGame(state);
    gameTimer.start(state);
  }

  renderAll();
  setupKeyboardShortcuts();

  // Bind UI buttons
  document.getElementById('newBtn')?.addEventListener('click', () => {
    openNewGameModal(state, startNewPuzzle);
  });

  document.getElementById('dailyBtn')?.addEventListener('click', () => {
    startDailyPuzzle();
  });

  document.getElementById('statsBtn')?.addEventListener('click', () => {
    openStatsModal();
  });

  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    openSettingsModal(settings, applyUserPreferences);
  });

  document.getElementById('helpBtn')?.addEventListener('click', () => {
    openHelpModal();
  });

  document.getElementById('seedPill')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.seed);
      setBoardStatus(`Copied puzzle seed "${state.seed}" to clipboard!`);
    } catch {
      setBoardStatus(`Puzzle seed: ${state.seed}`);
    }
  });

  document.getElementById('eraseBtn')?.addEventListener('click', () => handleDigitInput(0));

  document.getElementById('notesBtn')?.addEventListener('click', () => {
    if (state.mode === 'purist') return;
    state.notesMode = !state.notesMode;
    setBoardStatus(`Notes mode: ${state.notesMode ? 'On' : 'Off'}`);
    renderAll();
  });

  document.getElementById('autoNotesBtn')?.addEventListener('click', () => {
    if (fillAutoNotes(state)) {
      audioService.playNote();
      saveAutosavedGame(state);
      setBoardStatus('Auto-filled all valid candidate notes.');
      renderAll();
    }
  });

  document.getElementById('quickFillBtn')?.addEventListener('click', () => {
    state.quickFill = !state.quickFill;
    if (state.quickFill && !state.activeDigit) {
      state.activeDigit = 1;
    } else if (!state.quickFill) {
      state.activeDigit = null;
    }
    setBoardStatus(
      state.quickFill
        ? `Quick-Fill On: tap a keypad digit, then tap cells to fill.`
        : 'Quick-Fill Off.'
    );
    renderAll();
  });

  document.getElementById('undoBtn')?.addEventListener('click', () => {
    if (undoState(state)) {
      audioService.playErase();
      saveAutosavedGame(state);
      setBoardStatus('Undid last move.');
      renderAll();
    }
  });

  document.getElementById('redoBtn')?.addEventListener('click', () => {
    if (redoState(state)) {
      audioService.playPlace();
      saveAutosavedGame(state);
      setBoardStatus('Redid move.');
      renderAll();
    }
  });

  document.getElementById('hintBtn')?.addEventListener('click', () => handleSmartHint());
  document.getElementById('checkBtn')?.addEventListener('click', () => handleCheckBoard());
  document.getElementById('pauseBtn')?.addEventListener('click', () => togglePause());

  document.getElementById('showBlockedCellsBtn')?.addEventListener('click', () => {
    settings.showBlockedCells = !settings.showBlockedCells;
    saveSettings(settings);
    renderAll();
  });

  document.getElementById('startBtn')?.addEventListener('click', () => {
    const diffSelect = document.getElementById('difficulty') as HTMLSelectElement;
    const timeSelect = document.getElementById('timeSelect') as HTMLSelectElement;
    startNewPuzzle({
      size: state.size,
      difficulty: (diffSelect?.value as Difficulty) || state.difficulty,
      mode: state.mode,
      timeLimit: timeSelect ? Number(timeSelect.value) : state.timeLimit,
    });
  });

  // Close modal buttons & backdrop click
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', closeAllModals);
  });
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeAllModals();
    });
  });

  // Register PWA Service Worker
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
