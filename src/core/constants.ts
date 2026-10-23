import { Difficulty, GridMeta, GridSize } from './types';

export const GRID_SIZES: GridSize[] = [4, 6, 9];

export const DIFFICULTIES: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

/**
 * Target number of given clues for each grid size and difficulty.
 * Lower clues = harder puzzle, always verified to have a unique solution.
 */
export const TARGET_CLUES: Record<GridSize, Record<Difficulty, number>> = {
  4: {
    beginner: 10,
    easy: 9,
    medium: 8,
    hard: 7,
    expert: 6,
  },
  6: {
    beginner: 22,
    easy: 19,
    medium: 16,
    hard: 14,
    expert: 12,
  },
  9: {
    beginner: 45,
    easy: 38,
    medium: 33,
    hard: 28,
    expert: 24,
  },
};

function buildGridMeta(size: GridSize): GridMeta {
  const totalCells = size * size;
  const boxRows = size === 9 ? 3 : 2;
  const boxCols = size === 9 ? 3 : size === 6 ? 3 : 2;
  const boxesPerRow = size / boxCols;

  const rows: number[][] = Array.from({ length: size }, () => []);
  const cols: number[][] = Array.from({ length: size }, () => []);
  const boxes: number[][] = Array.from({ length: size }, () => []);
  const cellRow: number[] = new Array(totalCells);
  const cellCol: number[] = new Array(totalCells);
  const cellBox: number[] = new Array(totalCells);

  for (let i = 0; i < totalCells; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    const b = Math.floor(r / boxRows) * boxesPerRow + Math.floor(c / boxCols);
    cellRow[i] = r;
    cellCol[i] = c;
    cellBox[i] = b;
    rows[r].push(i);
    cols[c].push(i);
    boxes[b].push(i);
  }

  const peers: number[][] = Array.from({ length: totalCells }, (_, i) => {
    const r = cellRow[i];
    const c = cellCol[i];
    const b = cellBox[i];
    const peerSet = new Set<number>();
    for (const idx of rows[r]) if (idx !== i) peerSet.add(idx);
    for (const idx of cols[c]) if (idx !== i) peerSet.add(idx);
    for (const idx of boxes[b]) if (idx !== i) peerSet.add(idx);
    return Array.from(peerSet);
  });

  return {
    size,
    totalCells,
    boxRows,
    boxCols,
    rows,
    cols,
    boxes,
    peers,
    cellRow,
    cellCol,
    cellBox,
  };
}

export const GRID_META: Record<GridSize, GridMeta> = {
  4: buildGridMeta(4),
  6: buildGridMeta(6),
  9: buildGridMeta(9),
};

export function getGridMeta(size: GridSize): GridMeta {
  return GRID_META[size];
}
