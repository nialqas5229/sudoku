import { GameState } from '../core/types';
import { formatTimeMMSS } from '../services/share';

export class GameTimer {
  private intervalId: number | null = null;
  private lastTickAt = 0;
  private partialMilliseconds = 0;
  private onTickCallback: () => void;
  private onTimeUpCallback: () => void;

  constructor(onTick: () => void, onTimeUp: () => void) {
    this.onTickCallback = onTick;
    this.onTimeUpCallback = onTimeUp;
  }

  public start(state: GameState): void {
    this.stop();
    if (!state.started || state.paused || state.ended) return;
    this.lastTickAt = Date.now();

    this.intervalId = window.setInterval(() => {
      if (!state.started || state.paused || state.ended) return;
      const now = Date.now();
      this.partialMilliseconds += Math.max(0, now - this.lastTickAt);
      this.lastTickAt = now;
      const wholeSeconds = Math.floor(this.partialMilliseconds / 1000);
      if (wholeSeconds === 0) return;
      this.partialMilliseconds %= 1000;
      state.elapsed += wholeSeconds;
      if (state.timeLimit > 0) {
        state.secondsLeft = Math.max(0, state.secondsLeft - wholeSeconds);
        this.onTickCallback();
        if (state.secondsLeft <= 0) {
          state.ended = true;
          state.won = false;
          state.loseReason = 'time';
          this.stop();
          this.onTimeUpCallback();
        }
      } else {
        this.onTickCallback();
      }
    }, 250);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.lastTickAt = 0;
    this.partialMilliseconds = 0;
  }

  public render(state: GameState, showTimer = true): void {
    const timerCard = document.getElementById('timerCard');
    const timerEl = document.getElementById('timer');
    const timerStateEl = document.getElementById('timerState');

    if (timerCard) {
      timerCard.style.display = showTimer ? 'flex' : 'none';
    }
    if (!timerEl || !timerStateEl) return;

    const displaySeconds = state.timeLimit > 0 ? state.secondsLeft : state.elapsed;
    timerEl.textContent = formatTimeMMSS(displaySeconds);
    timerEl.classList.toggle('running', state.started && !state.paused && !state.ended);

    if (state.ended) {
      timerStateEl.textContent = state.won ? 'Completed' : state.loseReason === 'time' ? 'Time Up' : 'Game Over';
    } else if (state.paused) {
      timerStateEl.textContent = 'Paused';
    } else if (!state.started) {
      timerStateEl.textContent = 'Ready';
    } else {
      timerStateEl.textContent = state.timeLimit > 0 ? 'Countdown' : 'Stopwatch';
    }
  }
}
