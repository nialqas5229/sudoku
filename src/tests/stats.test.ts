import { createNewGameState } from '../core/state';
import { getTodayDateString } from '../services/daily';
import {
  clearAutosavedGame,
  loadActiveAutosavedGame,
  loadAutosavedGame,
  loadAutosavedDailyGame,
  loadStats,
  recordGameStart,
  recordGameWin,
  saveAutosavedGame,
} from '../services/stats';
import { describe, expect, it } from './test-harness';

function mockLocalStorage(): Map<string, string> {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    },
  });
  return values;
}

function createWinningState(id: string, isDaily = false) {
  const date = isDaily ? getTodayDateString() : undefined;
  const state = createNewGameState({
    size: 4,
    difficulty: 'easy',
    mode: 'standard',
    timeLimit: 0,
    seed: id,
    isDaily,
    dailyDate: date,
  });
  state.id = id;
  state.started = true;
  state.ended = true;
  state.won = true;
  state.elapsed = 90;
  return state;
}

describe('Statistics aggregation and persistence', () => {
  it('tracks start types and completion types, and ignores duplicate completion events', () => {
    mockLocalStorage();
    recordGameStart(false);
    recordGameStart(true);

    const normal = createWinningState('normal-win');
    const daily = createWinningState('daily-win', true);
    recordGameWin(normal);
    recordGameWin(normal);
    recordGameWin(daily);

    const stats = loadStats();
    expect(stats.gamesStarted).toBe(2);
    expect(stats.normalGamesStarted).toBe(1);
    expect(stats.dailyGamesStarted).toBe(1);
    expect(stats.gamesWon).toBe(2);
    expect(stats.byDifficulty.easy.won).toBe(2);
    expect(stats.completionRecords.length).toBe(2);
    expect(stats.completionRecords.filter((record) => record.isDaily).length).toBe(1);

    const beforeDashboardRead = (globalThis as { window: Window }).window.localStorage.getItem('sudoku_v2_player_stats');
    loadStats();
    const afterDashboardRead = (globalThis as { window: Window }).window.localStorage.getItem('sudoku_v2_player_stats');
    expect(afterDashboardRead).toBe(beforeDashboardRead);
  });

  it('restores normal-game board, notes, configuration, and active elapsed time', () => {
    mockLocalStorage();
    const state = createNewGameState({ size: 4, difficulty: 'medium', mode: 'mistakes', timeLimit: 300, seed: 'recover-normal' });
    const cellIndex = state.fixed.findIndex((fixed) => !fixed);
    state.board[cellIndex] = state.solution[cellIndex];
    state.notes[cellIndex + 1] = [1, 3];
    state.started = true;
    state.paused = true;
    state.elapsed = 47;
    state.secondsLeft = 253;
    state.mistakes = 1;
    state.hintsLeft = 2;
    state.hintsUsed = 1;

    saveAutosavedGame(state);
    const restored = loadAutosavedGame();
    expect(restored?.id).toBe(state.id);
    expect(restored?.board).toEqual(state.board);
    expect(restored?.notes).toEqual(state.notes);
    expect(restored?.solution).toEqual(state.solution);
    expect(restored?.elapsed).toBe(47);
    expect(restored?.secondsLeft).toBe(253);
    expect(restored?.mistakes).toBe(1);
    expect(restored?.hintsLeft).toBe(2);
    expect(restored?.mode).toBe('mistakes');
    expect(restored?.timeLimit).toBe(300);
    expect(loadActiveAutosavedGame()?.id).toBe(state.id);
  });

  it('keeps normal and Daily Puzzle autosaves separate and removes only the completed type', () => {
    mockLocalStorage();
    const normal = createNewGameState({ size: 4, difficulty: 'easy', mode: 'standard', timeLimit: 0, seed: 'normal' });
    const daily = createNewGameState({ size: 4, difficulty: 'easy', mode: 'standard', timeLimit: 0, seed: 'daily', isDaily: true, dailyDate: getTodayDateString() });
    saveAutosavedGame(normal);
    saveAutosavedGame(daily);

    expect(loadAutosavedGame()?.id).toBe(normal.id);
    expect(loadAutosavedDailyGame()?.id).toBe(daily.id);
    expect(loadActiveAutosavedGame()?.id).toBe(daily.id);
    clearAutosavedGame(true);
    expect(loadAutosavedDailyGame()).toBe(null);
    expect(loadAutosavedGame()?.id).toBe(normal.id);
    expect(loadActiveAutosavedGame()?.id).toBe(normal.id);
  });

  it('ignores and removes malformed or completed autosaves', () => {
    const storage = mockLocalStorage();
    storage.set('sudoku_v2_normal_autosave_state', JSON.stringify({ board: [1], solution: [1] }));
    expect(loadAutosavedGame()).toBe(null);
    expect(storage.has('sudoku_v2_normal_autosave_state')).toBe(false);

    const completed = createWinningState('already-completed');
    saveAutosavedGame(completed);
    expect(loadAutosavedGame()).toBe(null);
  });

  it('migrates a legacy autosave to the matching normal or Daily Puzzle slot', () => {
    const storage = mockLocalStorage();
    const legacy = createNewGameState({ size: 4, difficulty: 'hard', mode: 'standard', timeLimit: 0, seed: 'legacy-session' });
    legacy.started = true;
    legacy.paused = true;
    storage.set('sudoku_v2_autosave_state', JSON.stringify(legacy));

    expect(loadActiveAutosavedGame()?.id).toBe(legacy.id);
    expect(loadAutosavedGame()?.id).toBe(legacy.id);
    expect(storage.has('sudoku_v2_autosave_state')).toBe(false);
    expect(storage.has('sudoku_v2_normal_autosave_state')).toBe(true);
  });

  it('preserves valid legacy aggregates and fills missing fields with safe defaults', () => {
    const storage = mockLocalStorage();
    const legacy = JSON.stringify({
      gamesStarted: 3,
      gamesWon: 1,
      byDifficulty: { easy: { played: 2, won: 1, bestTimeSeconds: 42, totalTimeSeconds: 88 } },
      completedDailies: 'malformed',
      unlockedAchievements: null,
    });
    storage.set('sudoku_v2_player_stats', legacy);

    const stats = loadStats();
    expect(stats.gamesStarted).toBe(3);
    expect(stats.gamesWon).toBe(1);
    expect(stats.normalGamesStarted).toBe(0);
    expect(stats.dailyGamesStarted).toBe(0);
    expect(stats.byDifficulty.easy.bestTimeSeconds).toBe(42);
    expect(stats.byDifficulty.easy.totalTimeSeconds).toBe(88);
    expect(stats.completionRecords.length).toBe(0);
    expect(storage.get('sudoku_v2_player_stats')).toBe(legacy);
  });
});
