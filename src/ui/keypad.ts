import { GameState, GridSize } from '../core/types';

export class KeypadView {
  private container: HTMLElement;
  private currentSize: GridSize | null = null;
  private buttons: HTMLButtonElement[] = [];
  private longPressTimer: number | null = null;
  private longPressFired = false;

  constructor(
    container: HTMLElement,
    onDigitPress: (digit: number, isLongPress: boolean) => void
  ) {
    this.container = container;

    this.container.addEventListener('click', (e) => {
      if (this.longPressFired) {
        this.longPressFired = false;
        return;
      }
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.num-btn');
      if (!btn || !btn.dataset.digit) return;
      onDigitPress(Number(btn.dataset.digit), false);
    });

    this.container.addEventListener('pointerdown', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.num-btn');
      if (!btn || !btn.dataset.digit) return;
      const d = Number(btn.dataset.digit);
      this.longPressFired = false;
      if (this.longPressTimer) window.clearTimeout(this.longPressTimer);
      this.longPressTimer = window.setTimeout(() => {
        this.longPressFired = true;
        onDigitPress(d, true);
      }, 400);
    });

    const clearTimer = () => {
      if (this.longPressTimer) {
        window.clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    this.container.addEventListener('pointerup', clearTimer);
    this.container.addEventListener('pointercancel', clearTimer);
  }

  private buildKeypad(size: GridSize): void {
    this.container.innerHTML = '';
    this.container.setAttribute('data-size', String(size));
    this.buttons = [];

    for (let d = 1; d <= size; d++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'num-btn';
      btn.dataset.digit = String(d);
      btn.innerHTML = `<span class="digit-label">${d}</span><span class="rem-count">${size}</span>`;
      this.container.appendChild(btn);
      this.buttons.push(btn);
    }
    this.currentSize = size;
  }

  public render(state: GameState): void {
    if (this.currentSize !== state.size) {
      this.buildKeypad(state.size);
    }

    // Count how many times each digit is validly placed on the board
    const counts = new Array(state.size + 1).fill(0);
    for (let i = 0; i < state.board.length; i++) {
      const val = state.board[i];
      if (val >= 1 && val <= state.size && val === state.solution[i]) {
        counts[val]++;
      }
    }

    for (let d = 1; d <= state.size; d++) {
      const btn = this.buttons[d - 1];
      if (!btn) continue;
      const remaining = Math.max(0, state.size - counts[d]);
      const remEl = btn.querySelector('.rem-count');
      if (remEl) remEl.textContent = `${remaining} left`;

      const isCompleted = remaining === 0;
      const isActive = state.activeDigit === d;

      btn.disabled = !state.started || state.paused || state.ended;
      btn.classList.toggle('completed-digit', isCompleted);
      btn.classList.toggle('active-digit', isActive);
      btn.setAttribute('aria-label', `Digit ${d}, ${remaining} remaining`);
    }
  }
}
