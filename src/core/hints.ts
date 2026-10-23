import { getGridMeta } from './constants';
import { GridSize, SmartHint } from './types';
import { getCandidatesForCell } from './validator';

/**
 * Finds the most instructive logical next step on the current board.
 * Prioritizes:
 * 1. Error Correction (if a player-placed cell contradicts the solution)
 * 2. Naked Single (a cell with only 1 legal candidate)
 * 3. Hidden Single in a Row, Column, or Box (a digit that can only go in 1 cell of a unit)
 * 4. Logical Deduction (focusing on the selected cell or the most constrained empty cell)
 */
export function findSmartHint(
  board: readonly number[],
  solution: readonly number[],
  fixed: readonly boolean[],
  size: GridSize = 9,
  selectedCell = -1
): SmartHint | null {
  const meta = getGridMeta(size);

  // 1. Check if the player placed an incorrect digit anywhere
  for (let i = 0; i < meta.totalCells; i++) {
    if (!fixed[i] && board[i] !== 0 && board[i] !== solution[i]) {
      const r = meta.cellRow[i] + 1;
      const c = meta.cellCol[i] + 1;
      return {
        cellIndex: i,
        digit: solution[i],
        technique: 'Error Correction',
        explanation: `Row ${r}, Col ${c} currently has ${board[i]}, which conflicts with the solution. Tap Hint again to correct it to ${solution[i]}.`,
        stage: 1,
      };
    }
  }

  // Precompute legal candidates for all empty cells
  const cellCandidates: number[][] = Array.from({ length: meta.totalCells }, (_, i) =>
    board[i] === 0 ? getCandidatesForCell(board, i, size) : []
  );

  // 2. Naked Single: an empty cell with exactly 1 valid candidate matching the solution
  // Check selected cell first if it's a naked single
  const checkOrder = Array.from({ length: meta.totalCells }, (_, i) => i);
  if (selectedCell >= 0 && board[selectedCell] === 0) {
    checkOrder.unshift(selectedCell);
  }

  for (const idx of checkOrder) {
    if (board[idx] === 0 && cellCandidates[idx].length === 1 && cellCandidates[idx][0] === solution[idx]) {
      const r = meta.cellRow[idx] + 1;
      const c = meta.cellCol[idx] + 1;
      const d = solution[idx];
      return {
        cellIndex: idx,
        digit: d,
        technique: 'Naked Single',
        explanation: `Naked Single at Row ${r}, Col ${c}: every other digit is already present in its row, column, or box, leaving ${d} as the only possible candidate.`,
        stage: 1,
      };
    }
  }

  // 3. Hidden Single in Row, Column, or Box
  const checkUnits = (
    units: number[][],
    unitType: 'Row' | 'Column' | 'Box',
    techniqueName: 'Hidden Single (Row)' | 'Hidden Single (Column)' | 'Hidden Single (Box)'
  ): SmartHint | null => {
    for (let u = 0; u < units.length; u++) {
      const unitCells = units[u];
      for (let d = 1; d <= size; d++) {
        // Skip if digit d is already placed in this unit
        if (unitCells.some((idx) => board[idx] === d)) continue;
        const possibleCells = unitCells.filter(
          (idx) => board[idx] === 0 && cellCandidates[idx].includes(d)
        );
        if (possibleCells.length === 1) {
          const target = possibleCells[0];
          if (solution[target] === d) {
            const r = meta.cellRow[target] + 1;
            const c = meta.cellCol[target] + 1;
            return {
              cellIndex: target,
              digit: d,
              technique: techniqueName,
              explanation: `Hidden Single in ${unitType} ${u + 1}: Row ${r}, Col ${c} is the only empty cell in this ${unitType.toLowerCase()} where ${d} can legally be placed.`,
              stage: 1,
            };
          }
        }
      }
    }
    return null;
  };

  const rowHidden = checkUnits(meta.rows, 'Row', 'Hidden Single (Row)');
  if (rowHidden) return rowHidden;

  const colHidden = checkUnits(meta.cols, 'Column', 'Hidden Single (Column)');
  if (colHidden) return colHidden;

  const boxHidden = checkUnits(meta.boxes, 'Box', 'Hidden Single (Box)');
  if (boxHidden) return boxHidden;

  // 4. Fallback: choose selected empty cell, or empty cell with fewest candidates
  let bestCell = -1;
  if (selectedCell >= 0 && board[selectedCell] === 0 && !fixed[selectedCell]) {
    bestCell = selectedCell;
  } else {
    let minCount = size + 1;
    for (let i = 0; i < meta.totalCells; i++) {
      if (board[i] === 0 && !fixed[i]) {
        const count = cellCandidates[i].length || size;
        if (count < minCount) {
          minCount = count;
          bestCell = i;
        }
      }
    }
  }

  if (bestCell === -1) return null;

  const r = meta.cellRow[bestCell] + 1;
  const c = meta.cellCol[bestCell] + 1;
  const d = solution[bestCell];
  const cands = cellCandidates[bestCell];
  return {
    cellIndex: bestCell,
    digit: d,
    technique: 'Logical Deduction',
    explanation: `Focus on Row ${r}, Col ${c} (candidates: ${cands.join(', ') || d}). By cross-hatching rows and boxes, the correct value here is ${d}.`,
    stage: 1,
  };
}
