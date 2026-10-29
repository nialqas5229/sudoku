import { icon } from './icons';
import { getGridMeta } from '../core/constants';
import { GameState, GridSize } from '../core/types';
import { getAllConflictingCells } from '../core/validator';
import { UserSettings } from '../services/settings';

export class BoardView {
  private boardEl: HTMLElement;
  private overlayEl: HTMLElement;
  private currentSize: GridSize | null = null;
  private cellElements: HTMLButtonElement[] = [];
  private lastValues: string[] = [];
  private longPressTimer: number | null = null;
  private longPressTriggered = false;

  constructor(
    boardEl: HTMLElement,
    overlayEl: HTMLElement,
    onSelectCell: (index: number, isLongPress: boolean) => void
  ) {
    this.boardEl = boardEl;
    this.overlayEl = overlayEl;

    // Single delegated click listener on the board container
    this.boardEl.addEventListener('click', (e) => {
      if (this.longPressTriggered) {
        this.longPressTriggered = false;
        return;
      }
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.cell');
      if (!target || target.dataset.i === undefined) return;
      onSelectCell(Number(target.dataset.i), false);
    });

    // Long-press gesture on mobile to toggle notes mode quickly on a cell
    this.boardEl.addEventListener('pointerdown', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.cell');
      if (!target || target.dataset.i === undefined) return;
      const idx = Number(target.dataset.i);
      this.longPressTriggered = false;
      if (this.longPressTimer) window.clearTimeout(this.longPressTimer);
      this.longPressTimer = window.setTimeout(() => {
        this.longPressTriggered = true;
        onSelectCell(idx, true);
      }, 420);
    });

    const cancelLongPress = () => {
      if (this.longPressTimer) {
        window.clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    this.boardEl.addEventListener('pointerup', cancelLongPress);
    this.boardEl.addEventListener('pointercancel', cancelLongPress);
    this.boardEl.addEventListener('pointermove', cancelLongPress);
  }

  private buildGridDOM(size: GridSize): void {
    const meta = getGridMeta(size);
    this.boardEl.innerHTML = '';
    this.boardEl.setAttribute('data-size', String(size));
    this.cellElements = [];
    this.lastValues = new Array(meta.totalCells).fill('');

    for (let r = 0; r < size; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'board-row';
      rowEl.setAttribute('role', 'row');

      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cell';
        btn.dataset.i = String(idx);
        btn.setAttribute('role', 'gridcell');

        if ((c + 1) % meta.boxCols === 0 && c < size - 1) {
          btn.classList.add('box-right');
        }
        if ((r + 1) % meta.boxRows === 0 && r < size - 1) {
          btn.classList.add('box-bottom');
        }
        if (c === size - 1) btn.classList.add('last-col');
        if (r === size - 1) btn.classList.add('last-row');

        rowEl.appendChild(btn);
        this.cellElements.push(btn);
      }
      this.boardEl.appendChild(rowEl);
    }
    this.currentSize = size;
  }

  public render(
    state: GameState,
    settings: UserSettings,
    onResumeClick: () => void,
    onNewGameClick: () => void
  ): void {
    if (this.currentSize !== state.size || this.cellElements.length !== state.size * state.size) {
      this.buildGridDOM(state.size);
    }

    const meta = getGridMeta(state.size);
    const inputBlocked = !state.started || state.paused || state.ended;
    this.boardEl.inert = inputBlocked;
    if (inputBlocked) this.boardEl.setAttribute('aria-hidden', 'true');
    else this.boardEl.removeAttribute('aria-hidden');
    this.boardEl.parentElement?.classList.toggle('is-paused', state.paused);
    const conflicts = getAllConflictingCells(state.board, state.size);
    const selected = state.selected;
    // Blocking highlights must never replace the selected cell's normal blue area.
    // Preserve the user's peer-highlight preference when blocking is disabled.
    const selectedPeers =
      selected >= 0 && (settings.highlightPeers || settings.showBlockedCells)
        ? new Set(meta.peers[selected])
        : new Set<number>();

    const blueCells = new Set(selectedPeers);
    if (selected >= 0) blueCells.add(selected);

    const blockedCells = new Set<number>();
    if (settings.showBlockedCells && selected >= 0 && state.board[selected] > 0) {
      const digit = state.board[selected];
      for (let i = 0; i < meta.totalCells; i++) {
        if (i === selected || state.board[i] !== digit) continue;
        if (!blueCells.has(i)) blockedCells.add(i);
        for (const peer of meta.peers[i]) {
          if (!blueCells.has(peer)) blockedCells.add(peer);
        }
      }
    }

    const highlightDigit =
      state.activeDigit ||
      (selected >= 0 && state.board[selected] > 0 ? state.board[selected] : null);

    const flashSet = new Set(state.lastCompletedUnits);

    for (let i = 0; i < meta.totalCells; i++) {
      const el = this.cellElements[i];
      if (!el) continue;

      const r = meta.cellRow[i];
      const c = meta.cellCol[i];
      const val = state.board[i];
      const isFixed = state.fixed[i];
      const isSelected = selected === i;
      const isPeer = selectedPeers.has(i);
      const isBlockHighlight = blockedCells.has(i);
      const isSameDigit =
        settings.highlightSameDigit && highlightDigit !== null && val === highlightDigit;
      const isHintTarget = state.activeHint?.cellIndex === i;

      const hasRuleConflict = conflicts.has(i);
      const hasSolutionError =
        state.showErrors && !isFixed && val > 0 && val !== state.solution[i];
      const isConflict = hasRuleConflict || hasSolutionError;

      // Reset dynamic state classes while preserving structural border classes
      el.classList.toggle('fixed', isFixed);
      el.classList.toggle('peer', isPeer);
      el.classList.toggle('block-highlight', isBlockHighlight);
      el.classList.toggle('same-digit', isSameDigit);
      el.classList.toggle('selected', isSelected);
      el.classList.toggle('hint-target', isHintTarget);
      el.classList.toggle('conflict', isConflict);
      el.classList.toggle('unit-complete-anim', flashSet.has(i));

      // Roving tabindex for keyboard navigation
      const focusIndex = selected >= 0 ? selected : 0;
      el.tabIndex = i === focusIndex ? 0 : -1;

      const cellNotes = state.notes[i];
      const renderKey = val
        ? `V:${val}`
        : cellNotes.length > 0
        ? `N:${cellNotes.join(',')}:H:${highlightDigit || 0}`
        : 'E';

      if (this.lastValues[i] !== renderKey) {
        if (val > 0) {
          el.textContent = String(val);
        } else if (cellNotes.length > 0) {
          let notesHtml = '<div class="notes-grid">';
          for (let d = 1; d <= state.size; d++) {
            const hasNote = cellNotes.includes(d);
            const activeClass = hasNote && highlightDigit === d ? ' active-note' : '';
            notesHtml += `<span class="note-item${activeClass}">${hasNote ? d : ''}</span>`;
          }
          notesHtml += '</div>';
          el.innerHTML = notesHtml;
        } else {
          el.innerHTML = '';
        }
        this.lastValues[i] = renderKey;
      }

      const ariaParts = [
        `Row ${r + 1}, column ${c + 1}`,
        val ? `value ${val}` : cellNotes.length ? `notes ${cellNotes.join(', ')}` : 'empty',
        isFixed ? 'given' : '',
        isConflict ? 'conflict' : '',
      ].filter(Boolean);
      el.setAttribute('aria-label', ariaParts.join(', '));
    }

    // Render Ready, Paused, or Ended Overlay above the unchanged board.
    if (!state.started && !state.ended) {
      this.overlayEl.className = 'board-overlay visible ready';
      this.overlayEl.innerHTML = `
        <div class="board-overlay-icon">${icon('play', 34)}</div>
        <h3>Ready to Play</h3>
        <p>Start when you're ready.</p>
        <button type="button" class="btn primary" id="overlayResumeBtn">${icon('play', 15)} <span>Start Game</span></button>
      `;
      document.getElementById('overlayResumeBtn')?.addEventListener('click', onResumeClick);
    } else if (state.paused) {
      this.overlayEl.className = 'board-overlay visible paused';
      this.overlayEl.innerHTML = `
        <div class="board-overlay-icon">${icon('lock', 34)}</div>
        <h3>Game Paused</h3>
        <p>Your progress is saved. Resume whenever you're ready.</p>
        <button type="button" class="btn primary" id="overlayResumeBtn">${icon('play', 15)} <span>Resume Game</span></button>
      `;
      document.getElementById('overlayResumeBtn')?.addEventListener('click', onResumeClick);
    } else if (state.ended && !state.won) {
      this.overlayEl.className = 'board-overlay visible';
      const title = state.loseReason === 'time' ? 'Time is Up' : 'Too Many Mistakes';
      const overlayIcon = state.loseReason === 'time' ? icon('clock', 34) : icon('alert-triangle', 34);
      const desc =
        state.loseReason === 'time'
          ? 'You ran out of time on this puzzle.'
          : `You reached the ${state.maxMistakes}-mistake limit.`;
      this.overlayEl.innerHTML = `
        <div style="color:var(--error-border);">${overlayIcon}</div>
        <h3>${title}</h3>
        <p>${desc}</p>
        <button type="button" class="btn primary" id="overlayNewGameBtn">${icon('restart', 15)} <span>Try New Puzzle</span></button>
      `;
      document.getElementById('overlayNewGameBtn')?.addEventListener('click', onNewGameClick);
    } else {
      this.overlayEl.className = 'board-overlay';
      this.overlayEl.innerHTML = '';
    }
  }

  public focusCell(index: number): void {
    const el = this.cellElements[index];
    if (el) el.focus();
  }
}
