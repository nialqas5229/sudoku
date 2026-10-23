import { generatePuzzle, parseCustomPuzzleString } from '../core/generator';
import { hasUniqueSolution } from '../core/solver';
import { isBoardSolved } from '../core/validator';
import { describe, expect, it } from './test-harness';

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
