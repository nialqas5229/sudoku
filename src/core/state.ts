import { getGridMeta } from './constants';
import { generatePuzzle } from './generator';
import { findSmartHint } from './hints';
import { GameConfig, GameState, HistorySnapshot, SmartHint } from './types';
import { getCandidatesForCell, getNewlyCompletedUnitCells, isBoardSolved } from './validator';

export function cloneNotes(notes: readonly (readonly number[])[]): number[][] {
  return notes.map((arr) => [...arr]);
}

export function createSnapshot(state: GameState): HistorySnapshot {
  return {
    board: [...state.board],
    notes: cloneNotes(state.notes),
    hintsLeft: state.hintsLeft,
    mistakes: state.mistakes,
    selected: state.selected,
  };
}

export function createNewGameState(config: GameConfig): GameState {
  const { size, difficulty, mode, timeLimit, isDaily = false, dailyDate } = config;
  const meta = getGridMeta(size);

  let puzzle: number[];
  let solution: number[];
  let seed: string;

  if (config.customPuzzle) {
    puzzle = [...config.customPuzzle.puzzle];
    solution = [...config.customPuzzle.solution];
    seed = config.seed || 'CUSTOM';
  } else {
    const generated = generatePuzzle(size, difficulty, config.seed);
    puzzle = generated.puzzle;
    solution = generated.solution;
    seed = generated.seed;
  }

  const fixed = puzzle.map((v) => v !== 0);
  const notes: number[][] = Array.from({ length: meta.totalCells }, () => []);
  const hintsLeft = mode === 'purist' ? 0 : 3;
  const maxMistakes = mode === 'mistakes' ? 3 : 0;

  const initialState: GameState = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    seed,
    isDaily,
    dailyDate,
    size,
    difficulty,
    mode,
    board: [...puzzle],
    solution: [...solution],
    fixed,
    notes,
    selected: -1,
    activeDigit: null,
    quickFill: false,
    notesMode: false,
    showErrors: true,
    started: true,
    paused: false,
    ended: false,
    won: false,
    loseReason: null,
    timeLimit,
    secondsLeft: timeLimit,
    elapsed: 0,
    hintsLeft,
    hintsUsed: 0,
    mistakes: 0,
    maxMistakes,
    activeHint: null,
    lastCompletedUnits: [],
    history: [],
    historyIndex: 0,
  };

  initialState.history = [createSnapshot(initialState)];
  return initialState;
}

export function pushStateHistory(state: GameState): void {
  const nextHistory = state.history.slice(0, state.historyIndex + 1);
  nextHistory.push(createSnapshot(state));
  if (nextHistory.length > 300) {
    nextHistory.shift();
  }
  state.history = nextHistory;
  state.historyIndex = nextHistory.length - 1;
}

export function restoreSnapshot(state: GameState, snapshot: HistorySnapshot): void {
  state.board = [...snapshot.board];
  state.notes = cloneNotes(snapshot.notes);
  state.hintsLeft = snapshot.hintsLeft;
  state.mistakes = snapshot.mistakes;
  state.selected = snapshot.selected;
  state.activeHint = null;
  state.lastCompletedUnits = [];
}

export function undoState(state: GameState): boolean {
  if (!state.started || state.paused || state.ended || state.historyIndex <= 0) {
    return false;
  }
  state.historyIndex--;
  restoreSnapshot(state, state.history[state.historyIndex]);
  return true;
}

export function redoState(state: GameState): boolean {
  if (
    !state.started ||
    state.paused ||
    state.ended ||
    state.historyIndex >= state.history.length - 1
  ) {
    return false;
  }
  state.historyIndex++;
  restoreSnapshot(state, state.history[state.historyIndex]);
  return true;
}

/**
 * Places a digit (1..size) or erases (0) at `cellIndex` (defaults to `state.selected`).
 * Handles notes mode, auto-cleaning peer notes, mistake counting against solution,
 * 3-strikes loss condition, and win condition.
 */
export function applyCellInput(
  state: GameState,
  digit: number,
  options: { autoClearNotes?: boolean; forceNotes?: boolean; cellIndex?: number } = {}
): {
  changed: boolean;
  mistakeMade: boolean;
  wonNow: boolean;
  lostNow: boolean;
  noteToggled: boolean;
} {
  const idx = options.cellIndex !== undefined ? options.cellIndex : state.selected;
  const result = {
    changed: false,
    mistakeMade: false,
    wonNow: false,
    lostNow: false,
    noteToggled: false,
  };

  if (!state.started || state.paused || state.ended || idx < 0 || state.fixed[idx]) {
    return result;
  }

  state.selected = idx;
  state.activeHint = null;
  state.lastCompletedUnits = [];

  const useNotes = (options.forceNotes || state.notesMode) && state.mode !== 'purist';

  // Notes mode (for non-zero digit on an empty cell)
  if (useNotes && digit > 0) {
    if (state.board[idx] !== 0) {
      return result;
    }
    const existing = state.notes[idx];
    const pos = existing.indexOf(digit);
    if (pos >= 0) {
      existing.splice(pos, 1);
    } else {
      existing.push(digit);
      existing.sort((a, b) => a - b);
    }
    result.changed = true;
    result.noteToggled = true;
    pushStateHistory(state);
    return result;
  }

  // Erase cell or notes
  if (digit === 0) {
    if (state.board[idx] === 0 && state.notes[idx].length === 0) {
      return result;
    }
    state.board[idx] = 0;
    state.notes[idx] = [];
    result.changed = true;
    pushStateHistory(state);
    return result;
  }

  // Normal digit entry: if tapping the exact same digit already in the cell, erase it
  if (state.board[idx] === digit) {
    state.board[idx] = 0;
    result.changed = true;
    pushStateHistory(state);
    return result;
  }

  state.board[idx] = digit;
  state.notes[idx] = [];
  result.changed = true;

  // Check if it's a mistake against the true solution
  if (digit !== state.solution[idx]) {
    state.mistakes++;
    result.mistakeMade = true;
    if (state.mode === 'mistakes' && state.maxMistakes > 0 && state.mistakes >= state.maxMistakes) {
      state.ended = true;
      state.won = false;
      state.loseReason = 'mistakes';
      result.lostNow = true;
    }
  } else {
    // Valid placement: auto-remove this digit from all peer cells' notes
    if (options.autoClearNotes !== false) {
      const meta = getGridMeta(state.size);
      for (const peerIdx of meta.peers[idx]) {
        const peerNotes = state.notes[peerIdx];
        const notePos = peerNotes.indexOf(digit);
        if (notePos >= 0) {
          peerNotes.splice(notePos, 1);
        }
      }
    }
    state.lastCompletedUnits = getNewlyCompletedUnitCells(state.board, idx, state.size);
  }

  pushStateHistory(state);

  // Check win condition
  if (!state.ended && isBoardSolved(state.board, state.solution, state.size)) {
    state.ended = true;
    state.won = true;
    result.wonNow = true;
  }

  return result;
}

/**
 * Fills all empty cells with their legal candidate pencil marks.
 */
export function fillAutoNotes(state: GameState): boolean {
  if (!state.started || state.paused || state.ended || state.mode === 'purist') {
    return false;
  }
  const meta = getGridMeta(state.size);
  let anyChanged = false;
  for (let i = 0; i < meta.totalCells; i++) {
    if (state.board[i] === 0 && !state.fixed[i]) {
      const candidates = getCandidatesForCell(state.board, i, state.size);
      if (
        candidates.length !== state.notes[i].length ||
        candidates.some((v, idx) => v !== state.notes[i][idx])
      ) {
        state.notes[i] = candidates;
        anyChanged = true;
      }
    }
  }
  if (anyChanged) {
    pushStateHistory(state);
  }
  return anyChanged;
}

/**
 * Two-stage Smart Hint:
 * - First press: computes `SmartHint` (stage 1), selects the cell, and shows the technique & explanation.
 * - Second press (when `activeHint` is already showing): fills the cell (stage 2), auto-clears peer notes,
 *   decrements `hintsLeft`, increments `hintsUsed`, and records in undo history.
 */
export function triggerSmartHint(
  state: GameState,
  autoClearNotes = true
): { stage: 1 | 2; hint: SmartHint; wonNow: boolean } | null {
  if (
    !state.started ||
    state.paused ||
    state.ended ||
    state.mode === 'purist' ||
    state.hintsLeft <= 0
  ) {
    return null;
  }

  // If Stage 1 is already active, execute Stage 2 (fill the value)
  if (state.activeHint && state.activeHint.stage === 1) {
    const hint = { ...state.activeHint, stage: 2 as const };
    const idx = hint.cellIndex;
    state.selected = idx;
    state.board[idx] = hint.digit;
    state.notes[idx] = [];
    state.hintsLeft--;
    state.hintsUsed++;
    state.activeHint = null;

    if (autoClearNotes) {
      const meta = getGridMeta(state.size);
      for (const peerIdx of meta.peers[idx]) {
        const peerNotes = state.notes[peerIdx];
        const pos = peerNotes.indexOf(hint.digit);
        if (pos >= 0) peerNotes.splice(pos, 1);
      }
    }

    state.lastCompletedUnits = getNewlyCompletedUnitCells(state.board, idx, state.size);
    pushStateHistory(state);

    let wonNow = false;
    if (isBoardSolved(state.board, state.solution, state.size)) {
      state.ended = true;
      state.won = true;
      wonNow = true;
    }

    return { stage: 2, hint, wonNow };
  }

  // Otherwise compute Stage 1 hint
  const hint = findSmartHint(state.board, state.solution, state.fixed, state.size, state.selected);
  if (!hint) return null;

  state.selected = hint.cellIndex;
  state.activeHint = hint;
  return { stage: 1, hint, wonNow: false };
}
