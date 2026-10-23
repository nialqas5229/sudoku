import { IconName } from '../ui/icons';
import { Difficulty, GameState } from '../core/types';
import { SafeStorage } from './storage';

export interface DifficultyStat {
  played: number;
  won: number;
  bestTimeSeconds: number | null;
  totalTimeSeconds: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: IconName;
}

export interface PlayerStats {
  gamesStarted: number;
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
  unlockedAchievements: Record<string, string>; // id -> ISO date string
}

const STATS_KEY = 'player_stats';
const AUTOSAVE_KEY = 'autosave_state';

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
    unlockedAchievements: {},
  };
}

export function loadStats(): PlayerStats {
  const raw = SafeStorage.get<Partial<PlayerStats>>(STATS_KEY, {});
  const defaults = createInitialStats();
  return {
    ...defaults,
    ...raw,
    byDifficulty: {
      ...defaults.byDifficulty,
      ...(raw.byDifficulty || {}),
    },
    unlockedAchievements: {
      ...defaults.unlockedAchievements,
      ...(raw.unlockedAchievements || {}),
    },
    completedDailies: Array.isArray(raw.completedDailies) ? raw.completedDailies : [],
  };
}

export function saveStats(stats: PlayerStats): void {
  SafeStorage.set(STATS_KEY, stats);
}

export function recordGameStart(): void {
  const stats = loadStats();
  stats.gamesStarted++;
  saveStats(stats);
}

function isYesterday(prevDateStr: string, todayDateStr: string): boolean {
  const prev = new Date(`${prevDateStr}T00:00:00Z`);
  const today = new Date(`${todayDateStr}T00:00:00Z`);
  const diffDays = Math.round((today.getTime() - prev.getTime()) / 86400000);
  return diffDays === 1;
}

/**
 * Records a completed win, updates difficulty records & daily streaks,
 * and returns any newly unlocked Achievement definitions.
 */
export function recordGameWin(state: GameState): AchievementDef[] {
  const stats = loadStats();
  const solveTime =
    state.timeLimit > 0 ? Math.max(1, state.timeLimit - state.secondsLeft) : Math.max(1, state.elapsed);

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
    if (stats.lastDailyDateWon !== state.dailyDate) {
      if (stats.lastDailyDateWon && isYesterday(stats.lastDailyDateWon, state.dailyDate)) {
        stats.currentDailyStreak++;
      } else {
        stats.currentDailyStreak = 1;
      }
      stats.lastDailyDateWon = state.dailyDate;
      if (stats.currentDailyStreak > stats.bestDailyStreak) {
        stats.bestDailyStreak = stats.currentDailyStreak;
      }
    }
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
  clearAutosavedGame();
  return newlyUnlocked;
}

export function saveAutosavedGame(state: GameState): void {
  if (state.ended) {
    clearAutosavedGame();
    return;
  }
  SafeStorage.set(AUTOSAVE_KEY, state);
}

export function loadAutosavedGame(): GameState | null {
  const saved = SafeStorage.get<GameState | null>(AUTOSAVE_KEY, null);
  if (!saved || saved.ended || !Array.isArray(saved.board) || !Array.isArray(saved.solution)) {
    return null;
  }
  return saved;
}

export function clearAutosavedGame(): void {
  SafeStorage.remove(AUTOSAVE_KEY);
}
