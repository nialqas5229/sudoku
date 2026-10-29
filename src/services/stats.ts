import { IconName } from '../ui/icons';
import { Difficulty, GameMode, GameState, GridSize } from '../core/types';
import { SafeStorage } from './storage';
import { getDailyStreaks } from './daily';

export interface DifficultyStat {
  played: number;
  won: number;
  bestTimeSeconds: number | null;
  totalTimeSeconds: number;
}

export interface GameCompletionRecord {
  gameId: string;
  completedAt: string;
  isDaily: boolean;
  dailyDate?: string;
  difficulty: Difficulty;
  size: GridSize;
  mode: GameMode;
  completionTimeSeconds: number;
  mistakes: number;
  hintsUsed: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: IconName;
}

export interface PlayerStats {
  gamesStarted: number;
  normalGamesStarted: number;
  dailyGamesStarted: number;
  gamesWon: number;
  noHintWins: number;
  flawlessWins: number;
  puristWins: number;
  totalHintsUsed: number;
  currentDailyStreak: number;
  bestDailyStreak: number;
  lastDailyDateWon: string | null;
  completedDailies: string[];
  byDifficulty: Record<Difficulty, DifficultyStat>;
  completionRecords: GameCompletionRecord[];
  unlockedAchievements: Record<string, string>; // id -> ISO date string
}

const STATS_KEY = 'player_stats';
const LEGACY_AUTOSAVE_KEY = 'autosave_state';
const NORMAL_AUTOSAVE_KEY = 'normal_autosave_state';
const DAILY_AUTOSAVE_KEY = 'daily_autosave_state';
const ACTIVE_AUTOSAVE_KIND_KEY = 'active_autosave_kind';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_win',
    title: 'First Steps',
    description: 'Solve your very first Sudoku puzzle.',
    icon: 'award-star',
  },
  {
    id: 'no_hints',
    title: 'Pure Logic',
    description: 'Win a puzzle without using any hints.',
    icon: 'brain-circuit',
  },
  {
    id: 'flawless',
    title: 'Sharp Focus',
    description: 'Complete a puzzle with zero mistakes.',
    icon: 'target-crosshair',
  },
  {
    id: 'speed_demon',
    title: 'Speed Solver',
    description: 'Solve a 9×9 puzzle in under 3 minutes (180s).',
    icon: 'speed-gauge',
  },
  {
    id: 'purist_win',
    title: 'Purist Master',
    description: 'Win a puzzle in Purist Mode (no notes, no hints).',
    icon: 'pillar-shield',
  },
  {
    id: 'daily_solver',
    title: 'Daily Devotee',
    description: 'Complete a Daily Challenge puzzle.',
    icon: 'calendar-check',
  },
  {
    id: 'streak_7',
    title: 'Week of Focus',
    description: 'Reach a 7-day Daily Challenge streak.',
    icon: 'flame-streak',
  },
  {
    id: 'expert_conqueror',
    title: 'Grandmaster',
    description: 'Conquer a 9×9 Expert difficulty puzzle.',
    icon: 'crown-gem',
  },
];

function createEmptyDiffStat(): DifficultyStat {
  return { played: 0, won: 0, bestTimeSeconds: null, totalTimeSeconds: 0 };
}

export function createInitialStats(): PlayerStats {
  return {
    gamesStarted: 0,
    normalGamesStarted: 0,
    dailyGamesStarted: 0,
    gamesWon: 0,
    noHintWins: 0,
    flawlessWins: 0,
    puristWins: 0,
    totalHintsUsed: 0,
    currentDailyStreak: 0,
    bestDailyStreak: 0,
    lastDailyDateWon: null,
    completedDailies: [],
    byDifficulty: {
      beginner: createEmptyDiffStat(),
      easy: createEmptyDiffStat(),
      medium: createEmptyDiffStat(),
      hard: createEmptyDiffStat(),
      expert: createEmptyDiffStat(),
    },
    completionRecords: [],
    unlockedAchievements: {},
  };
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function nonNegativeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeCompletionRecords(value: unknown): GameCompletionRecord[] {
  if (!Array.isArray(value)) return [];
  const records: GameCompletionRecord[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Partial<GameCompletionRecord>;
    if (
      typeof record.gameId !== 'string' || !record.gameId || seen.has(record.gameId) ||
      typeof record.completedAt !== 'string' || Number.isNaN(Date.parse(record.completedAt)) ||
      typeof record.isDaily !== 'boolean' ||
      !['beginner', 'easy', 'medium', 'hard', 'expert'].includes(record.difficulty as string) ||
      ![4, 6, 9].includes(record.size as number) ||
      !['standard', 'mistakes', 'purist'].includes(record.mode as string) ||
      !Number.isFinite(record.completionTimeSeconds) || (record.completionTimeSeconds as number) < 0 ||
      !Number.isInteger(record.mistakes) || (record.mistakes as number) < 0 ||
      !Number.isInteger(record.hintsUsed) || (record.hintsUsed as number) < 0
    ) continue;
    seen.add(record.gameId);
    records.push(record as GameCompletionRecord);
  }
  return records;
}

export function loadStats(): PlayerStats {
  const stored = SafeStorage.get<unknown>(STATS_KEY, {});
  const raw: Partial<PlayerStats> = stored && typeof stored === 'object' && !Array.isArray(stored)
    ? stored as Partial<PlayerStats>
    : {};
  const defaults = createInitialStats();
  const storedDifficulty = raw.byDifficulty && typeof raw.byDifficulty === 'object'
    ? raw.byDifficulty as Partial<Record<Difficulty, Partial<DifficultyStat>>>
    : {};
  const byDifficulty = { ...defaults.byDifficulty };
  for (const difficulty of Object.keys(defaults.byDifficulty) as Difficulty[]) {
    const saved = storedDifficulty[difficulty];
    if (!saved || typeof saved !== 'object') continue;
    byDifficulty[difficulty] = {
      played: nonNegativeInteger(saved.played),
      won: nonNegativeInteger(saved.won),
      bestTimeSeconds: typeof saved.bestTimeSeconds === 'number' && Number.isFinite(saved.bestTimeSeconds) && saved.bestTimeSeconds >= 0
        ? saved.bestTimeSeconds
        : null,
      totalTimeSeconds: nonNegativeNumber(saved.totalTimeSeconds),
    };
  }
  const unlockedAchievements = raw.unlockedAchievements && typeof raw.unlockedAchievements === 'object' && !Array.isArray(raw.unlockedAchievements)
    ? Object.fromEntries(Object.entries(raw.unlockedAchievements).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    : {};
  const completionRecords = normalizeCompletionRecords(raw.completionRecords);
  const gamesWon = Math.max(nonNegativeInteger(raw.gamesWon), completionRecords.length);
  const stats: PlayerStats = {
    ...defaults,
    gamesStarted: Math.max(nonNegativeInteger(raw.gamesStarted), gamesWon),
    normalGamesStarted: nonNegativeInteger(raw.normalGamesStarted),
    dailyGamesStarted: nonNegativeInteger(raw.dailyGamesStarted),
    gamesWon,
    noHintWins: nonNegativeInteger(raw.noHintWins),
    flawlessWins: nonNegativeInteger(raw.flawlessWins),
    puristWins: nonNegativeInteger(raw.puristWins),
    totalHintsUsed: nonNegativeInteger(raw.totalHintsUsed),
    lastDailyDateWon: typeof raw.lastDailyDateWon === 'string' ? raw.lastDailyDateWon : null,
    completedDailies: Array.isArray(raw.completedDailies) ? raw.completedDailies.filter((date): date is string => typeof date === 'string') : [],
    byDifficulty,
    completionRecords,
    unlockedAchievements,
  };
  return { ...stats, ...getDailyStreaks(stats.completedDailies) };
}

export function saveStats(stats: PlayerStats): void {
  SafeStorage.set(STATS_KEY, stats);
}

export function recordGameStart(isDaily = false): void {
  const stats = loadStats();
  stats.gamesStarted++;
  if (isDaily) stats.dailyGamesStarted++;
  else stats.normalGamesStarted++;
  saveStats(stats);
}

/**
 * Records a completed win, updates difficulty records & daily streaks,
 * and returns any newly unlocked Achievement definitions.
 */
export function recordGameWin(state: GameState): AchievementDef[] {
  const stats = loadStats();
  if (stats.completionRecords.some((record) => record.gameId === state.id)) return [];
  const solveTime =
    state.timeLimit > 0 ? Math.max(1, state.timeLimit - state.secondsLeft) : Math.max(1, state.elapsed);

  stats.completionRecords.push({
    gameId: state.id,
    completedAt: new Date().toISOString(),
    isDaily: state.isDaily,
    ...(state.dailyDate ? { dailyDate: state.dailyDate } : {}),
    difficulty: state.difficulty,
    size: state.size,
    mode: state.mode,
    completionTimeSeconds: solveTime,
    mistakes: state.mistakes,
    hintsUsed: state.hintsUsed,
  });

  stats.gamesWon++;
  stats.totalHintsUsed += state.hintsUsed;

  const dStat = stats.byDifficulty[state.difficulty] || createEmptyDiffStat();
  dStat.played = Math.max(dStat.played + 1, dStat.won + 1);
  dStat.won++;
  dStat.totalTimeSeconds += solveTime;
  if (dStat.bestTimeSeconds === null || solveTime < dStat.bestTimeSeconds) {
    dStat.bestTimeSeconds = solveTime;
  }
  stats.byDifficulty[state.difficulty] = dStat;

  if (state.hintsUsed === 0) stats.noHintWins++;
  if (state.mistakes === 0) stats.flawlessWins++;
  if (state.mode === 'purist') stats.puristWins++;

  if (state.isDaily && state.dailyDate) {
    if (!stats.completedDailies.includes(state.dailyDate)) {
      stats.completedDailies.push(state.dailyDate);
    }
    stats.lastDailyDateWon = state.dailyDate;
    Object.assign(stats, getDailyStreaks(stats.completedDailies));
  }

  const newlyUnlocked: AchievementDef[] = [];
  const unlock = (id: string) => {
    if (!stats.unlockedAchievements[id]) {
      stats.unlockedAchievements[id] = new Date().toISOString();
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) newlyUnlocked.push(def);
    }
  };

  unlock('first_win');
  if (state.hintsUsed === 0) unlock('no_hints');
  if (state.mistakes === 0) unlock('flawless');
  if (state.size === 9 && solveTime <= 180) unlock('speed_demon');
  if (state.mode === 'purist') unlock('purist_win');
  if (state.isDaily) unlock('daily_solver');
  if (stats.currentDailyStreak >= 7) unlock('streak_7');
  if (state.size === 9 && state.difficulty === 'expert') unlock('expert_conqueror');

  saveStats(stats);
  clearAutosavedGame(state.isDaily);
  return newlyUnlocked;
}

export function saveAutosavedGame(state: GameState): void {
  if (state.ended || state.won) {
    clearAutosavedGame(state.isDaily);
    return;
  }
  const kind = state.isDaily ? 'daily' : 'normal';
  SafeStorage.set(kind === 'daily' ? DAILY_AUTOSAVE_KEY : NORMAL_AUTOSAVE_KEY, state);
  SafeStorage.set(ACTIVE_AUTOSAVE_KIND_KEY, kind);
}

function isValidAutosavedGame(value: unknown): value is GameState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const saved = value as Partial<GameState>;
  if (
    typeof saved.id !== 'string' || !saved.id || typeof saved.seed !== 'string' ||
    ![4, 6, 9].includes(saved.size as number) ||
    !['beginner', 'easy', 'medium', 'hard', 'expert'].includes(saved.difficulty as string) ||
    !['standard', 'mistakes', 'purist'].includes(saved.mode as string) ||
    typeof saved.isDaily !== 'boolean' || typeof saved.started !== 'boolean' ||
    typeof saved.paused !== 'boolean' || typeof saved.ended !== 'boolean' ||
    typeof saved.won !== 'boolean' || saved.won ||
    (saved.loseReason !== null && saved.loseReason !== 'time' && saved.loseReason !== 'mistakes') ||
    (saved.isDaily && typeof saved.dailyDate !== 'string') ||
    !Number.isInteger(saved.timeLimit) || (saved.timeLimit as number) < 0 ||
    !Number.isInteger(saved.selected) || (saved.selected as number) < -1 || (saved.selected as number) >= (saved.size as number) ** 2 ||
    (saved.activeDigit !== null && (!Number.isInteger(saved.activeDigit) || (saved.activeDigit as number) < 1 || (saved.activeDigit as number) > (saved.size as number))) ||
    typeof saved.quickFill !== 'boolean' || typeof saved.notesMode !== 'boolean' || typeof saved.showErrors !== 'boolean' ||
    !Number.isInteger(saved.secondsLeft) || (saved.secondsLeft as number) < 0 ||
    !Number.isInteger(saved.elapsed) || (saved.elapsed as number) < 0 ||
    !Number.isInteger(saved.hintsLeft) || (saved.hintsLeft as number) < 0 ||
    !Number.isInteger(saved.hintsUsed) || (saved.hintsUsed as number) < 0 ||
    !Number.isInteger(saved.mistakes) || (saved.mistakes as number) < 0 ||
    !Number.isInteger(saved.maxMistakes) || (saved.maxMistakes as number) < 0 ||
    !Array.isArray(saved.lastCompletedUnits) || !saved.lastCompletedUnits.every((index) => Number.isInteger(index) && index >= 0 && index < (saved.size as number) ** 2) ||
    (saved.activeHint !== null && (
      !saved.activeHint || typeof saved.activeHint !== 'object' ||
      !Number.isInteger(saved.activeHint.cellIndex) || saved.activeHint.cellIndex < 0 || saved.activeHint.cellIndex >= (saved.size as number) ** 2 ||
      !Number.isInteger(saved.activeHint.digit) || saved.activeHint.digit < 1 || saved.activeHint.digit > (saved.size as number) ||
      typeof saved.activeHint.explanation !== 'string' ||
      !['Error Correction', 'Naked Single', 'Hidden Single (Row)', 'Hidden Single (Column)', 'Hidden Single (Box)', 'Logical Deduction'].includes(saved.activeHint.technique) ||
      (saved.activeHint.stage !== 1 && saved.activeHint.stage !== 2)
    ))
  ) return false;

  const total = (saved.size as number) ** 2;
  if (
    !Array.isArray(saved.board) || saved.board.length !== total ||
    !Array.isArray(saved.solution) || saved.solution.length !== total ||
    !Array.isArray(saved.fixed) || saved.fixed.length !== total ||
    !Array.isArray(saved.notes) || saved.notes.length !== total ||
    !saved.board.every((digit) => Number.isInteger(digit) && digit >= 0 && digit <= saved.size!) ||
    !saved.solution.every((digit) => Number.isInteger(digit) && digit >= 1 && digit <= saved.size!) ||
    !saved.fixed.every((fixed) => typeof fixed === 'boolean') ||
    !saved.notes.every((notes) => Array.isArray(notes) && notes.every((digit) => Number.isInteger(digit) && digit >= 1 && digit <= saved.size!))
  ) return false;

  if (!Array.isArray(saved.history) || saved.history.length < 1 || saved.history.length > 301 ||
    !Number.isInteger(saved.historyIndex) || (saved.historyIndex as number) < 0 || (saved.historyIndex as number) >= saved.history.length) return false;
  return saved.history.every((snapshot) =>
    !!snapshot && Array.isArray(snapshot.board) && snapshot.board.length === total &&
    Array.isArray(snapshot.notes) && snapshot.notes.length === total &&
    Number.isInteger(snapshot.hintsLeft) && snapshot.hintsLeft >= 0 &&
    Number.isInteger(snapshot.mistakes) && snapshot.mistakes >= 0 &&
    Number.isInteger(snapshot.selected) && snapshot.selected >= -1 && snapshot.selected < total &&
    snapshot.board.every((digit) => Number.isInteger(digit) && digit >= 0 && digit <= saved.size!) &&
    snapshot.notes.every((notes) => Array.isArray(notes) && notes.every((digit) => Number.isInteger(digit) && digit >= 1 && digit <= saved.size!))
  );
}

function migrateLegacyAutosave(): void {
  const legacy = SafeStorage.get<unknown>(LEGACY_AUTOSAVE_KEY, null);
  if (isValidAutosavedGame(legacy)) {
    const key = legacy.isDaily ? DAILY_AUTOSAVE_KEY : NORMAL_AUTOSAVE_KEY;
    if (!isValidAutosavedGame(SafeStorage.get<unknown>(key, null))) SafeStorage.set(key, legacy);
    if (!SafeStorage.get<string | null>(ACTIVE_AUTOSAVE_KIND_KEY, null)) {
      SafeStorage.set(ACTIVE_AUTOSAVE_KIND_KEY, legacy.isDaily ? 'daily' : 'normal');
    }
  }
  SafeStorage.remove(LEGACY_AUTOSAVE_KEY);
}

function readAutosave(isDaily: boolean): GameState | null {
  const key = isDaily ? DAILY_AUTOSAVE_KEY : NORMAL_AUTOSAVE_KEY;
  const saved = SafeStorage.get<unknown>(key, null);
  if (saved === null) return null;
  if (!isValidAutosavedGame(saved) || saved.ended || saved.won || saved.isDaily !== isDaily) {
    SafeStorage.remove(key);
    return null;
  }
  return saved;
}

export function loadAutosavedGame(): GameState | null {
  migrateLegacyAutosave();
  return readAutosave(false);
}

export function loadAutosavedDailyGame(): GameState | null {
  migrateLegacyAutosave();
  return readAutosave(true);
}

export function loadActiveAutosavedGame(): GameState | null {
  migrateLegacyAutosave();
  const kind = SafeStorage.get<string | null>(ACTIVE_AUTOSAVE_KIND_KEY, null);
  const preferred = kind === 'daily' ? readAutosave(true) : readAutosave(false);
  return preferred || (kind === 'daily' ? readAutosave(false) : readAutosave(true));
}

export function clearAutosavedGame(isDaily = false): void {
  const clearedKind = isDaily ? 'daily' : 'normal';
  SafeStorage.remove(isDaily ? DAILY_AUTOSAVE_KEY : NORMAL_AUTOSAVE_KEY);
  const activeKind = SafeStorage.get<string | null>(ACTIVE_AUTOSAVE_KIND_KEY, null);
  if (activeKind === clearedKind) {
    const alternate = isDaily ? readAutosave(false) : readAutosave(true);
    if (alternate) SafeStorage.set(ACTIVE_AUTOSAVE_KIND_KEY, isDaily ? 'normal' : 'daily');
    else SafeStorage.remove(ACTIVE_AUTOSAVE_KIND_KEY);
  }
}
