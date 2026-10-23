import { countSolutions, hasUniqueSolution, solveSudoku } from '../core/solver';
import { isBoardSolved } from '../core/validator';
import { describe, expect, it } from './test-harness';

describe('Sudoku Solver (4x4, 6x6, 9x9)', () => {
  it('solves a classic 9x9 Easy puzzle accurately', () => {
    const raw =
      '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
    const expected =
      '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
    const board = raw.split('').map(Number);
    const solved = solveSudoku(board, 9);
    expect(solved !== null).toBe(true);
    expect(solved!.join('')).toBe(expected);
    expect(isBoardSolved(solved!, undefined, 9)).toBe(true);
    expect(hasUniqueSolution(board, 9)).toBe(true);
  });

  it('solves a 9x9 Hard puzzle and confirms unique solution', () => {
    const raw =
      '100007090030020008009600500005300900010080002600004000300000010040000007007000300';
    const board = raw.split('').map(Number);
    expect(countSolutions(board, 9, 2)).toBe(1);
    const solved = solveSudoku(board, 9);
    expect(solved !== null).toBe(true);
    expect(isBoardSolved(solved!, undefined, 9)).toBe(true);
  });

  it('detects multiple solutions on an under-constrained 4x4 board', () => {
    const empty4x4 = new Array(16).fill(0);
    expect(countSolutions(empty4x4, 4, 2)).toBe(2);
    expect(hasUniqueSolution(empty4x4, 4)).toBe(false);
  });

  it('returns null for an impossible board with conflicting givens', () => {
    const badBoard = new Array(81).fill(0);
    badBoard[0] = 5;
    badBoard[1] = 5; // Row conflict
    expect(solveSudoku(badBoard, 9)).toBe(null);
    expect(countSolutions(badBoard, 9, 2)).toBe(0);
  });
});
