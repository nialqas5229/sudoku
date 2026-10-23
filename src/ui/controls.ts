import { DIFFICULTY_LABELS } from '../core/constants';
import { GameState } from '../core/types';
import { icon } from './icons';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function renderControlsAndStats(state: GameState): void {
  const totalCells = state.size * state.size;
  const filledCount = state.board.filter(Boolean).length;

  const filledEl = document.getElementById('filledStat');
  if (filledEl) filledEl.textContent = `${filledCount}/${totalCells}`;

  const mistakeEl = document.getElementById('mistakeStat');
  if (mistakeEl) {
    mistakeEl.textContent =
      state.mode === 'mistakes' ? `${state.mistakes}/${state.maxMistakes}` : String(state.mistakes);
  }

  const hintEl = document.getElementById('hintStat');
  if (hintEl) {
    hintEl.textContent = state.mode === 'purist' ? 'Off' : String(state.hintsLeft);
  }

  const modePill = document.getElementById('modePill');
  if (modePill) {
    const modeLabel =
      state.mode === 'mistakes'
        ? ' · 3-Strikes'
        : state.mode === 'purist'
        ? ' · Purist'
        : '';
    modePill.textContent = `${state.size}×${state.size} · ${DIFFICULTY_LABELS[state.difficulty]}${modeLabel}`;
  }

  const dailyPill = document.getElementById('dailyPill');
  if (dailyPill) {
    dailyPill.style.display = state.isDaily ? 'inline-flex' : 'none';
    if (state.isDaily) {
      dailyPill.innerHTML = `${icon('calendar', 13)} <span>Daily (${escapeHtml(state.dailyDate || '')})</span>`;
    }
  }

  const seedPill = document.getElementById('seedPill');
  if (seedPill) {
    seedPill.innerHTML = `${icon('key', 13)} <span>${escapeHtml(state.seed)}</span>`;
  }

  const locked = !state.started || state.paused || state.ended;
  const purist = state.mode === 'purist';

  const setBtnDisabled = (id: string, disabled: boolean) => {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (btn) btn.disabled = disabled;
  };

  setBtnDisabled('eraseBtn', locked);
  setBtnDisabled('notesBtn', locked || purist);
  setBtnDisabled('autoNotesBtn', locked || purist);
  setBtnDisabled('quickFillBtn', locked);
  setBtnDisabled('undoBtn', locked || state.historyIndex <= 0);
  setBtnDisabled('redoBtn', locked || state.historyIndex >= state.history.length - 1);
  setBtnDisabled('hintBtn', locked || purist || state.hintsLeft <= 0);
  setBtnDisabled('checkBtn', locked);
  setBtnDisabled('pauseBtn', !state.started || state.ended);

  const notesBtn = document.getElementById('notesBtn');
  if (notesBtn) {
    notesBtn.innerHTML = `${icon('pencil', 15)} <span>Notes: ${state.notesMode ? 'On' : 'Off'}</span>`;
    notesBtn.setAttribute('aria-pressed', String(state.notesMode));
  }

  const quickFillBtn = document.getElementById('quickFillBtn');
  if (quickFillBtn) {
    quickFillBtn.innerHTML = `${icon('bolt', 14)} <span>Quick-Fill: ${state.quickFill ? 'On' : 'Off'}</span>`;
    quickFillBtn.setAttribute('aria-pressed', String(state.quickFill));
  }

  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.innerHTML = `${icon(state.paused ? 'play' : 'pause', 15)} <span>${state.paused ? 'Resume' : 'Pause'}</span>`;
  }

  const hintBtn = document.getElementById('hintBtn');
  if (hintBtn) {
    const label =
      state.activeHint && state.activeHint.stage === 1
        ? `Apply Hint (${state.activeHint.digit})`
        : `Smart Hint (${state.hintsLeft})`;
    hintBtn.innerHTML = `${icon('lightbulb', 15)} <span>${label}</span>`;
  }
}
