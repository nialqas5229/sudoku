export type GridSize = 4 | 6 | 9;

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export type GameMode = 'standard' | 'mistakes' | 'purist';

export type ThemeMode = 'light' | 'dark' | 'system' | 'colorblind' | 'high-contrast';

export type FontSize = 'small' | 'medium' | 'large';

export interface BoxDimensions {
  boxRows: number;
  boxCols: number;
}

export interface GridMeta {
  size: GridSize;
  totalCells: number;
  boxRows: number;
  boxCols: number;
  rows: number[][];
  cols: number[][];
  boxes: number[][];
  peers: number[][];
  cellRow: number[];
  cellCol: number[];
  cellBox: number[];
}

export interface HistorySnapshot {
  board: number[];
  notes: number[][];
  hintsLeft: number;
  mistakes: number;
  selected: number;
}

export interface SmartHint {
  cellIndex: number;
  digit: number;
  technique: 'Error Correction' | 'Naked Single' | 'Hidden Single (Row)' | 'Hidden Single (Column)' | 'Hidden Single (Box)' | 'Logical Deduction';
  explanation: string;
  stage: 1 | 2;
}

export interface GeneratedPuzzle {
  puzzle: number[];
  solution: number[];
  size: GridSize;
  difficulty: Difficulty;
  seed: string;
  cluesCount: number;
}

export interface GameConfig {
  size: GridSize;
  difficulty: Difficulty;
  mode: GameMode;
  timeLimit: number; // 0 = stopwatch (no limit), >0 = countdown in seconds
  seed?: string;
  isDaily?: boolean;
  dailyDate?: string;
  customPuzzle?: {
    puzzle: number[];
    solution: number[];
  };
}

export interface GameState {
  id: string;
  seed: string;
  isDaily: boolean;
  dailyDate?: string;
  size: GridSize;
  difficulty: Difficulty;
  mode: GameMode;
  board: number[];
  solution: number[];
  fixed: boolean[];
  notes: number[][];
  selected: number;
  activeDigit: number | null;
  quickFill: boolean;
  notesMode: boolean;
  showErrors: boolean;
  started: boolean;
  paused: boolean;
  ended: boolean;
  won: boolean;
  loseReason: 'time' | 'mistakes' | null;
  timeLimit: number;
  secondsLeft: number;
  elapsed: number;
  hintsLeft: number;
  hintsUsed: number;
  mistakes: number;
  maxMistakes: number;
  activeHint: SmartHint | null;
  lastCompletedUnits: number[]; // indices of cells in newly completed row/col/box for flash animation
  history: HistorySnapshot[];
  historyIndex: number;
}
