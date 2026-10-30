import { getGridMeta } from '../core/constants';
import { getBoardHighlightCategories } from '../core/highlighting';
import { describe, expect, it } from './test-harness';

describe('Board highlighting', () => {
  it('highlights the selected cell region and keeps it above matching-number regions', () => {
    const size = 9;
    const board = new Array<number>(size * size).fill(0);
    const selected = 0;
    board[selected] = 1;
    const matching = 4 * size + 4;
    board[matching] = 1;

    const categories = getBoardHighlightCategories(board, size, selected, true, true);
    const selectedPeers = new Set(getGridMeta(size).peers[selected]);

    expect(categories[selected]).toBe('selected');
    expect(categories[1]).toBe('selected-region');
    expect(categories[size]).toBe('selected-region');
    expect(categories[2 * size + 2]).toBe('selected-region');
    expect(categories[matching]).toBe('matching-number');
    expect(categories[4 * size + 1]).toBe('same-number-region');
    expect(categories[4 * size + 7]).toBe('same-number-region');
    expect(categories[3 * size + 3]).toBe('same-number-region');
    expect([...selectedPeers].every((index) => categories[index] === 'selected-region')).toBe(true);
  });

  it('clears same-number regions for an empty selected cell and when there is no selection', () => {
    const board = new Array<number>(81).fill(0);
    board[40] = 5;
    const notes = Array.from({ length: 81 }, () => [] as number[]);
    notes[0] = [5]; // Candidate notes are separate from the actual zero value in board[0].
    const emptyCellCategories = getBoardHighlightCategories(board, 9, 0, true, true);
    expect(emptyCellCategories.filter((category) => category === 'selected-region').length).toBeGreaterThan(0);
    expect(emptyCellCategories.includes('same-number-region')).toBe(false);
    expect(notes[0].includes(board[40])).toBe(true);

    const noSelection = getBoardHighlightCategories(board, 9, -1, true, true);
    expect(noSelection.every((category) => category === 'normal')).toBe(true);
  });

  it('updates regions directly from current values and supports every grid size', () => {
    for (const size of [4, 6, 9] as const) {
      const board = new Array<number>(size * size).fill(0);
      board[0] = 2;
      const matching = size * size - 1;
      board[matching] = 2;
      const categories = getBoardHighlightCategories(board, size, 0, true, true);
      expect(categories[matching]).toBe('matching-number');

      const noteOnly = size * Math.floor(size / 2) + Math.floor(size / 2);
      if (noteOnly !== 0 && noteOnly !== matching) {
        expect(board[noteOnly]).toBe(0);
        expect(categories[noteOnly] === 'matching-number').toBe(false);
      }

      board[matching] = 0;
      const updated = getBoardHighlightCategories(board, size, 0, true, true);
      expect(updated[matching]).toBe('normal');
    }
  });
});
