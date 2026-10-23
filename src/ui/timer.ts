import { GameState } from '../core/types';
import { formatTimeMMSS } from '../services/share';

export class GameTimer {
  private intervalId: number | null = null;
  private onTickCallback: () => void;
  private onTimeUpCallback: () => void;

  constructor(onTick: () => void, onTimeUp: () => void) {
    this.onTickCallback = onTick;
    this.onTimeUpCallback = onTimeUp;
  }

  public start(state: GameState): void {
    this.stop();
    if (!state.started || state.paused || state.ended) return;

    this.intervalId = window.setInterval(() => {
      if (!state.started || state.paused || state.ended) return;
      state.elapsed++;
      if (state.timeLimit > 0) {
        state.secondsLeft = Math.max(0, state.secondsLeft - 1);
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
    }, 1000);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
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
