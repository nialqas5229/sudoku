import { DIFFICULTY_LABELS } from '../core/constants';
import { GameState } from '../core/types';

export function calculateStarRating(state: GameState): 1 | 2 | 3 {
  if (state.mistakes === 0 && state.hintsUsed === 0) return 3;
  if (state.mistakes <= 2 && state.hintsUsed <= 1) return 2;
  return 1;
}

export function formatTimeMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Generates a spoiler-free plain-text shareable summary with an ASCII mini-board (zero emojis).
 */
export function buildShareSummary(state: GameState): string {
  const solveSeconds =
    state.timeLimit > 0 ? Math.max(1, state.timeLimit - state.secondsLeft) : Math.max(1, state.elapsed);
  const stars = calculateStarRating(state);
  const starStr = `[${stars}/3 Stars]`;
  const header = state.isDaily
    ? `Sudoku Daily (${state.dailyDate}) ${starStr}`
    : `Sudoku ${state.size}x${state.size} - ${DIFFICULTY_LABELS[state.difficulty]} ${starStr}`;

  const sampleRows = 3;
  const sampleCols = 3;
  const step = Math.max(1, Math.floor(state.size / 3));
  const gridLines: string[] = [];

  for (let r = 0; r < sampleRows; r++) {
    let line = '';
    for (let c = 0; c < sampleCols; c++) {
      const idx = (r * step) * state.size + (c * step);
      line += state.fixed[idx] ? '[#]' : '[+]';
    }
    gridLines.push(line);
  }

  return [
    header,
    `Time: ${formatTimeMMSS(solveSeconds)} | Mistakes: ${state.mistakes} | Hints: ${state.hintsUsed}`,
    `Seed: ${state.seed}`,
    gridLines.join('\n'),
  ].join('\n');
}

export async function shareOrCopyResult(state: GameState): Promise<'shared' | 'copied' | 'failed'> {
  const text = buildShareSummary(state);
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: 'Sudoku — Play & Think',
        text,
      });
      return 'shared';
    }
  } catch {
    // Fallback to clipboard
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    // Ignore clipboard error
  }
  return 'failed';
}
