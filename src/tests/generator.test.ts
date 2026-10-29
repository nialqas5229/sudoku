import { generatePuzzle, parseCustomPuzzleString } from '../core/generator';
import { hasUniqueSolution } from '../core/solver';
import { isBoardSolved } from '../core/validator';
import { describe, expect, it } from './test-harness';
import { getDailyCompletion, getDailyConfig, getDailyCountdown, getNextDailyRelease, saveDailyCompletion } from '../services/daily';

function mockLocalStorage(): Map<string, string> {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    },
  });
  return values;
}

describe('Sudoku Generator & Seeded Reproducibility', () => {
  it('generates a 9x9 Medium puzzle with a guaranteed unique solution', () => {
    const gen = generatePuzzle(9, 'medium', 'TEST-SEED-9X9');
    expect(gen.puzzle.length).toBe(81);
    expect(gen.solution.length).toBe(81);
    expect(isBoardSolved(gen.solution, undefined, 9)).toBe(true);
    expect(hasUniqueSolution(gen.puzzle, 9)).toBe(true);
  });

  it('produces identical puzzles when given the same seed, size, and difficulty', () => {
    const first = generatePuzzle(9, 'hard', 'DAILY-2026-10-23');
    const second = generatePuzzle(9, 'hard', 'DAILY-2026-10-23');
    expect(first.puzzle.join('')).toBe(second.puzzle.join(''));
    expect(first.solution.join('')).toBe(second.solution.join(''));
  });

  it('generates valid unique-solution 4x4 and 6x6 mini/midi puzzles', () => {
    const g4 = generatePuzzle(4, 'easy', 'KIDS-4X4');
    expect(g4.puzzle.length).toBe(16);
    expect(hasUniqueSolution(g4.puzzle, 4)).toBe(true);

    const g6 = generatePuzzle(6, 'medium', 'MIDI-6X6');
    expect(g6.puzzle.length).toBe(36);
    expect(hasUniqueSolution(g6.puzzle, 6)).toBe(true);
  });

  it('validates and parses custom 81-character puzzle strings', () => {
    const validRaw =
      '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
    const parsed = parseCustomPuzzleString(validRaw);
    expect(parsed.valid).toBe(true);
    expect(parsed.size).toBe(9);

    const invalidRaw = '12345';
    expect(parseCustomPuzzleString(invalidRaw).valid).toBe(false);
  });
});

describe('Daily puzzle schedule', () => {
  it('keeps daily puzzle identity and difficulty stable for a date', () => {
    const first = getDailyConfig('2026-10-30');
    const repeated = getDailyConfig('2026-10-30');
    expect(first.seed).toBe(repeated.seed);
    expect(first.seed).toBe('DAILY-2026-10-30-9x9');
    expect(first.difficulty).toBe(repeated.difficulty);
    expect(first.seed === getDailyConfig('2026-10-31').seed).toBe(false);
  });

  it('counts down to the next Pakistan midnight regardless of browser timezone', () => {
    const oneSecondBeforeKarachiMidnight = Date.parse('2026-10-30T18:59:59.000Z');
    expect(getNextDailyRelease(oneSecondBeforeKarachiMidnight)).toBe(Date.parse('2026-10-30T19:00:00.000Z'));
    const countdown = getDailyCountdown(oneSecondBeforeKarachiMidnight);
    expect(countdown.hours).toBe(0);
    expect(countdown.minutes).toBe(0);
    expect(countdown.seconds).toBe(1);
  });

  it('moves to the following release boundary when Pakistan midnight passes', () => {
    const justAfterRelease = Date.parse('2026-10-30T19:00:01.000Z');
    expect(getNextDailyRelease(justAfterRelease)).toBe(Date.parse('2026-10-31T19:00:00.000Z'));
  });

  it('persists a daily result once and retains the original completion time', () => {
    mockLocalStorage();
    const first = {
      date: '2026-10-30',
      puzzleId: getDailyConfig('2026-10-30').seed,
      completed: true as const,
      difficulty: getDailyConfig('2026-10-30').difficulty,
      completionTimeSeconds: 522,
      completedAt: '2026-10-30T18:00:00.000Z',
      mistakes: 1,
    };
    saveDailyCompletion(first);
    saveDailyCompletion({ ...first, completionTimeSeconds: 900, completedAt: '2026-10-30T18:30:00.000Z' });
    expect(getDailyCompletion(first.date)?.completionTimeSeconds).toBe(522);
  });

  it('ignores corrupted completion data without throwing', () => {
    const values = mockLocalStorage();
    values.set('sudoku_v2_daily_completions', '{not-json');
    expect(getDailyCompletion('2026-10-30')).toBe(null);
  });
});
