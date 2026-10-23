import { getGridMeta } from './constants';
import { GridSize } from './types';

/**
 * Returns indices of all peer cells that share the same non-zero value as `value` at `cellIndex`.
 */
export function getCellConflicts(
  board: readonly number[],
  cellIndex: number,
  value: number,
  size: GridSize = 9
): number[] {
  if (!value) return [];
  const meta = getGridMeta(size);
  const peers = meta.peers[cellIndex];
  const conflicts: number[] = [];
  for (let i = 0; i < peers.length; i++) {
    const peerIdx = peers[i];
    if (board[peerIdx] === value) {
      conflicts.push(peerIdx);
    }
  }
  return conflicts;
}

/**
 * Returns a Set of all cell indices on the board that currently have a rule conflict.
 */
export function getAllConflictingCells(board: readonly number[], size: GridSize = 9): Set<number> {
  const meta = getGridMeta(size);
  const conflicting = new Set<number>();
  for (let i = 0; i < meta.totalCells; i++) {
    const val = board[i];
    if (val > 0) {
      const cellConflicts = getCellConflicts(board, i, val, size);
      if (cellConflicts.length > 0) {
        conflicting.add(i);
        for (const c of cellConflicts) conflicting.add(c);
      }
    }
  }
  return conflicting;
}

/**
 * Computes candidate bitmask for a given cell index.
 * Bit `d` (1 << d) is 1 if digit `d` (1..size) can be legally placed at `cellIndex`.
 */
export function getCandidateBitmask(
  board: readonly number[],
  cellIndex: number,
  size: GridSize = 9
): number {
  if (board[cellIndex] !== 0) return 0;
  const meta = getGridMeta(size);
  let usedMask = 0;
  const peers = meta.peers[cellIndex];
  for (let i = 0; i < peers.length; i++) {
    const val = board[peers[i]];
    if (val > 0) {
      usedMask |= 1 << val;
    }
  }
  const allDigitsMask = ((1 << size) - 1) << 1;
  return allDigitsMask & ~usedMask;
}

/**
 * Returns sorted array of valid candidate digits (1..size) for `cellIndex`.
 */
export function getCandidatesForCell(
  board: readonly number[],
  cellIndex: number,
  size: GridSize = 9
): number[] {
  const mask = getCandidateBitmask(board, cellIndex, size);
  const candidates: number[] = [];
  for (let d = 1; d <= size; d++) {
    if (mask & (1 << d)) candidates.push(d);
  }
  return candidates;
}

/**
 * Checks whether the board is completely filled and satisfies all Sudoku rules.
 */
export function isBoardSolved(
  board: readonly number[],
  solution?: readonly number[],
  size: GridSize = 9
): boolean {
  const meta = getGridMeta(size);
  if (board.length !== meta.totalCells) return false;

  if (solution && solution.length === meta.totalCells) {
    for (let i = 0; i < meta.totalCells; i++) {
      if (board[i] !== solution[i] || board[i] === 0) return false;
    }
    return true;
  }

  for (let i = 0; i < meta.totalCells; i++) {
    const val = board[i];
    if (val < 1 || val > size) return false;
    if (getCellConflicts(board, i, val, size).length > 0) return false;
  }
  return true;
}

/**
 * Finds all cell indices belonging to a row, column, or box that just became completely and validly filled
 * when `cellIndex` was set. Used to trigger a subtle unit-completion flash animation.
 */
export function getNewlyCompletedUnitCells(
  board: readonly number[],
  cellIndex: number,
  size: GridSize = 9
): number[] {
  if (cellIndex < 0 || board[cellIndex] === 0) return [];
  const meta = getGridMeta(size);
  const r = meta.cellRow[cellIndex];
  const c = meta.cellCol[cellIndex];
  const b = meta.cellBox[cellIndex];

  const isUnitCompleteAndValid = (unit: number[]): boolean => {
    let seenMask = 0;
    for (const idx of unit) {
      const v = board[idx];
      if (v < 1 || v > size) return false;
      if (seenMask & (1 << v)) return false;
      seenMask |= 1 << v;
    }
    return true;
  };

  const result = new Set<number>();
  if (isUnitCompleteAndValid(meta.rows[r])) {
    for (const idx of meta.rows[r]) result.add(idx);
  }
  if (isUnitCompleteAndValid(meta.cols[c])) {
    for (const idx of meta.cols[c]) result.add(idx);
  }
  if (isUnitCompleteAndValid(meta.boxes[b])) {
    for (const idx of meta.boxes[b]) result.add(idx);
  }
  return Array.from(result);
}
