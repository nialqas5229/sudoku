import { getGridMeta, TARGET_CLUES } from './constants';
import { generateRandomSeed, SeededRNG } from './rng';
import { countSolutions, solveSudoku } from './solver';
import { Difficulty, GeneratedPuzzle, GridSize } from './types';

/**
 * Generates a guaranteed unique-solution Sudoku puzzle for the given grid size, difficulty, and optional seed.
 */
export function generatePuzzle(
  size: GridSize = 9,
  difficulty: Difficulty = 'medium',
  customSeed?: string
): GeneratedPuzzle {
  const seed = (customSeed && customSeed.trim()) || generateRandomSeed(`SDK${size}-${difficulty.slice(0, 3).toUpperCase()}`);
  const rng = new SeededRNG(`${seed}:${size}:${difficulty}`);
  const meta = getGridMeta(size);
  const emptyBoard = new Array(meta.totalCells).fill(0);

  // 1. Generate a complete solved board using seeded RNG
  const solution = solveSudoku(emptyBoard, size, rng);
  if (!solution) {
    throw new Error('Failed to generate solved Sudoku grid.');
  }

  // 2. Dig holes while preserving unique solution (countSolutions === 1)
  const puzzle = [...solution];
  const targetClues = TARGET_CLUES[size][difficulty];
  let currentClues = meta.totalCells;

  // Build symmetric cell pairs (rotational symmetry around center)
  const pairIndices: [number, number][] = [];
  const visited = new Array(meta.totalCells).fill(false);
  const allIndices = rng.shuffle(Array.from({ length: meta.totalCells }, (_, i) => i));

  for (const idx of allIndices) {
    if (visited[idx]) continue;
    const symIdx = meta.totalCells - 1 - idx;
    visited[idx] = true;
    visited[symIdx] = true;
    pairIndices.push([idx, symIdx]);
  }

  // First pass: remove symmetric pairs
  for (const [i, j] of pairIndices) {
    if (currentClues <= targetClues) break;
    const removeCount = i === j ? 1 : 2;
    if (currentClues - removeCount < targetClues && removeCount === 2) continue;

    const savedI = puzzle[i];
    const savedJ = puzzle[j];
    puzzle[i] = 0;
    puzzle[j] = 0;

    if (countSolutions(puzzle, size, 2) === 1) {
      currentClues -= removeCount;
    } else {
      puzzle[i] = savedI;
      puzzle[j] = savedJ;
    }
  }

  // Second pass: if still above targetClues, try single-cell removals in shuffled order
  if (currentClues > targetClues) {
    const singleCandidates = rng.shuffle(
      Array.from({ length: meta.totalCells }, (_, i) => i).filter((i) => puzzle[i] !== 0)
    );
    for (const idx of singleCandidates) {
      if (currentClues <= targetClues) break;
      const saved = puzzle[idx];
      puzzle[idx] = 0;
      if (countSolutions(puzzle, size, 2) === 1) {
        currentClues--;
      } else {
        puzzle[idx] = saved;
      }
    }
  }

  return {
    puzzle,
    solution,
    size,
    difficulty,
    seed,
    cluesCount: currentClues,
  };
}

/** Generate a deterministic daily puzzle, retrying if it matches the prior day's puzzle. */
export function generateDailyPuzzle(
  dateStr: string,
  size: GridSize,
  difficulty: Difficulty,
  generate: typeof generatePuzzle = generatePuzzle
): GeneratedPuzzle {
  const [year, month, day] = dateStr.split('-').map(Number);
  const previousDate = new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
  const dailySeed = (date: string) => `DAILY-${date}-${difficulty}-${size}x${size}`;
  const previousPuzzle = generate(size, difficulty, dailySeed(previousDate)).puzzle;
  const puzzleKey = (puzzle: readonly number[]) => puzzle.join('');
  const previousKey = puzzleKey(previousPuzzle);
  const identitySeed = dailySeed(dateStr);

  for (let retry = 0; ; retry++) {
    const generationSeed = retry === 0 ? identitySeed : `${identitySeed}-retry-${retry}`;
    const candidate = generate(size, difficulty, generationSeed);
    if (puzzleKey(candidate.puzzle) !== previousKey) {
      // Keep the externally visible ID stable even if a collision retry was needed.
      return { ...candidate, seed: identitySeed };
    }
  }
}

/**
 * Parses and validates an imported puzzle string (16, 36, or 81 characters using 0 or . for blanks).
 */
export function parseCustomPuzzleString(raw: string): {
  valid: boolean;
  error?: string;
  size?: GridSize;
  puzzle?: number[];
  solution?: number[];
} {
  const cleaned = raw.replace(/\s+/g, '').replace(/\./g, '0');
  let size: GridSize;
  if (cleaned.length === 16) size = 4;
  else if (cleaned.length === 36) size = 6;
  else if (cleaned.length === 81) size = 9;
  else {
    return {
      valid: false,
      error: `Expected 16 (4×4), 36 (6×6), or 81 (9×9) characters, but received ${cleaned.length}.`,
    };
  }

  const puzzle: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const n = Number(ch);
    if (!Number.isInteger(n) || n < 0 || n > size) {
      return {
        valid: false,
        error: `Invalid character "${ch}" at position ${i + 1}. Allowed digits for ${size}×${size}: 0–${size} or "."`,
      };
    }
    puzzle.push(n);
  }

  const solutionCount = countSolutions(puzzle, size, 2);
  if (solutionCount === 0) {
    return { valid: false, error: 'This puzzle has no valid solution.' };
  }
  if (solutionCount > 1) {
    return { valid: false, error: 'This puzzle has multiple solutions (not a unique Sudoku).' };
  }

  const solution = solveSudoku(puzzle, size);
  if (!solution) {
    return { valid: false, error: 'Could not solve this puzzle.' };
  }

  return {
    valid: true,
    size,
    puzzle,
    solution,
  };
}
