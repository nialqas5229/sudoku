import { getGridMeta } from './constants';
import { SeededRNG } from './rng';
import { GridSize } from './types';
import { getAllConflictingCells } from './validator';

function countBits(mask: number): number {
  let c = 0;
  let m = mask;
  while (m) {
    m &= m - 1;
    c++;
  }
  return c;
}

/**
 * Fast bitmask + MRV (Minimum Remaining Values) Sudoku solver.
 * Returns a solved board array, or `null` if unsolvable.
 * When `rng` is provided, candidate digits are tried in a randomized order (used by generator).
 */
export function solveSudoku(
  inputBoard: readonly number[],
  size: GridSize = 9,
  rng?: SeededRNG
): number[] | null {
  const meta = getGridMeta(size);
  if (inputBoard.length !== meta.totalCells) return null;
  if (getAllConflictingCells(inputBoard, size).size > 0) return null;

  const board = [...inputBoard];
  const rowMask = new Array(size).fill(0);
  const colMask = new Array(size).fill(0);
  const boxMask = new Array(size).fill(0);
  const allMask = ((1 << size) - 1) << 1;

  for (let i = 0; i < meta.totalCells; i++) {
    const val = board[i];
    if (val > 0) {
      const bit = 1 << val;
      const r = meta.cellRow[i];
      const c = meta.cellCol[i];
      const b = meta.cellBox[i];
      if ((rowMask[r] & bit) || (colMask[c] & bit) || (boxMask[b] & bit)) {
        return null;
      }
      rowMask[r] |= bit;
      colMask[c] |= bit;
      boxMask[b] |= bit;
    }
  }

  function backtrack(): boolean {
    let bestCell = -1;
    let bestCount = size + 1;
    let bestMask = 0;

    for (let i = 0; i < meta.totalCells; i++) {
      if (board[i] !== 0) continue;
      const r = meta.cellRow[i];
      const c = meta.cellCol[i];
      const b = meta.cellBox[i];
      const mask = allMask & ~(rowMask[r] | colMask[c] | boxMask[b]);
      if (mask === 0) return false;
      const count = countBits(mask);
      if (count < bestCount) {
        bestCount = count;
        bestCell = i;
        bestMask = mask;
        if (count === 1) break;
      }
    }

    if (bestCell === -1) return true; // All cells filled!

    const r = meta.cellRow[bestCell];
    const c = meta.cellCol[bestCell];
    const b = meta.cellBox[bestCell];

    const digits: number[] = [];
    for (let d = 1; d <= size; d++) {
      if (bestMask & (1 << d)) digits.push(d);
    }
    const orderedDigits = rng ? rng.shuffle(digits) : digits;

    for (let i = 0; i < orderedDigits.length; i++) {
      const d = orderedDigits[i];
      const bit = 1 << d;
      board[bestCell] = d;
      rowMask[r] |= bit;
      colMask[c] |= bit;
      boxMask[b] |= bit;

      if (backtrack()) return true;

      board[bestCell] = 0;
      rowMask[r] &= ~bit;
      colMask[c] &= ~bit;
      boxMask[b] &= ~bit;
    }

    return false;
  }

  return backtrack() ? board : null;
}

/**
 * Counts the number of valid solutions for `inputBoard`, stopping early once `limit` (default 2) is reached.
 * Used to verify puzzle uniqueness (`countSolutions(puzzle, size, 2) === 1`).
 */
export function countSolutions(
  inputBoard: readonly number[],
  size: GridSize = 9,
  limit = 2
): number {
  const meta = getGridMeta(size);
  if (inputBoard.length !== meta.totalCells) return 0;

  const board = [...inputBoard];
  const rowMask = new Array(size).fill(0);
  const colMask = new Array(size).fill(0);
  const boxMask = new Array(size).fill(0);
  const allMask = ((1 << size) - 1) << 1;

  for (let i = 0; i < meta.totalCells; i++) {
    const val = board[i];
    if (val > 0) {
      const bit = 1 << val;
      const r = meta.cellRow[i];
      const c = meta.cellCol[i];
      const b = meta.cellBox[i];
      if ((rowMask[r] & bit) || (colMask[c] & bit) || (boxMask[b] & bit)) {
        return 0;
      }
      rowMask[r] |= bit;
      colMask[c] |= bit;
      boxMask[b] |= bit;
    }
  }

  let solutions = 0;

  function search(): void {
    if (solutions >= limit) return;

    let bestCell = -1;
    let bestCount = size + 1;
    let bestMask = 0;

    for (let i = 0; i < meta.totalCells; i++) {
      if (board[i] !== 0) continue;
      const r = meta.cellRow[i];
      const c = meta.cellCol[i];
      const b = meta.cellBox[i];
      const mask = allMask & ~(rowMask[r] | colMask[c] | boxMask[b]);
      if (mask === 0) return;
      const count = countBits(mask);
      if (count < bestCount) {
        bestCount = count;
        bestCell = i;
        bestMask = mask;
        if (count === 1) break;
      }
    }

    if (bestCell === -1) {
      solutions++;
      return;
    }

    const r = meta.cellRow[bestCell];
    const c = meta.cellCol[bestCell];
    const b = meta.cellBox[bestCell];

    for (let d = 1; d <= size; d++) {
      const bit = 1 << d;
      if (bestMask & bit) {
        board[bestCell] = d;
        rowMask[r] |= bit;
        colMask[c] |= bit;
        boxMask[b] |= bit;

        search();

        board[bestCell] = 0;
        rowMask[r] &= ~bit;
        colMask[c] &= ~bit;
        boxMask[b] &= ~bit;

        if (solutions >= limit) return;
      }
    }
  }

  search();
  return solutions;
}

export function hasUniqueSolution(board: readonly number[], size: GridSize = 9): boolean {
  return countSolutions(board, size, 2) === 1;
}
