import { getGridMeta } from './constants';
import { GridSize } from './types';

export type CellHighlightCategory =
  | 'selected'
  | 'selected-region'
  | 'matching-number'
  | 'same-number-region'
  | 'normal';

/** Calculate highlight layers from board values without mutating game state. */
export function getBoardHighlightCategories(
  board: readonly number[],
  size: GridSize,
  selected: number,
  highlightPeers: boolean,
  highlightSameNumberRegions: boolean
): CellHighlightCategory[] {
  const meta = getGridMeta(size);
  const categories: CellHighlightCategory[] = new Array(meta.totalCells).fill('normal');

  if (selected < 0 || selected >= meta.totalCells) {
    return categories;
  }

  categories[selected] = 'selected';
  if (highlightPeers) {
    for (const peer of meta.peers[selected]) categories[peer] = 'selected-region';
  }

  const selectedValue = board[selected];
  if (highlightSameNumberRegions && selectedValue > 0) {
    const matchingCells: number[] = [];
    for (let index = 0; index < meta.totalCells; index++) {
      if (index === selected || board[index] !== selectedValue) continue;
      matchingCells.push(index);
      if (categories[index] === 'normal') categories[index] = 'same-number-region';
      for (const peer of meta.peers[index]) {
        if (categories[peer] === 'normal') categories[peer] = 'same-number-region';
      }
    }

    // Mark exact matching values after collecting regions so a peer region cannot
    // accidentally downgrade a matching value encountered later in the scan.
    for (const index of matchingCells) {
      if (categories[index] === 'same-number-region') categories[index] = 'matching-number';
    }
  }

  return categories;
}
