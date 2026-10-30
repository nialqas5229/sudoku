import { Difficulty, GridSize } from '../core/types';
import { SafeStorage } from './storage';

const DAILY_TIME_ZONE = 'Asia/Karachi';
const COMPLETIONS_KEY = 'daily_completions';

export interface DailyCompletion {
  date: string;
  puzzleId: string;
  completed: true;
  difficulty: Difficulty;
  completionTimeSeconds: number;
  completedAt: string;
  mistakes: number;
}

type DailyCompletionHistory = Record<string, DailyCompletion>;

export function getTodayDateString(now = Date.now()): string {
  return dateStringInKarachi(new Date(now));
}

function dateStringInKarachi(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getNextDailyRelease(now = Date.now()): number {
  const [year, month, day] = dateStringInKarachi(new Date(now)).split('-').map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  // Asia/Karachi is UTC+05:00; its next midnight is the prior UTC date at 19:00.
  return Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate()) - 5 * 60 * 60 * 1000;
}

export function getDailyCountdown(now = Date.now()): { hours: number; minutes: number; seconds: number } {
  const remaining = Math.max(0, Math.floor((getNextDailyRelease(now) - now) / 1000));
  return {
    hours: Math.floor(remaining / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  };
}

function readDailyCompletionHistory(): DailyCompletionHistory {
  const value = SafeStorage.get<unknown>(COMPLETIONS_KEY, {});
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const history: DailyCompletionHistory = {};
  for (const [date, record] of Object.entries(value)) {
    if (
      isValidDailyDate(date) && record && typeof record === 'object' &&
      (record as DailyCompletion).completed === true && (record as DailyCompletion).date === date &&
      isKnownDailyPuzzleId(record as DailyCompletion) &&
      ['beginner', 'easy', 'medium', 'hard', 'expert'].includes((record as DailyCompletion).difficulty) &&
      Number.isFinite((record as DailyCompletion).completionTimeSeconds) &&
      (record as DailyCompletion).completionTimeSeconds >= 0 &&
      Number.isInteger((record as DailyCompletion).mistakes) &&
      (record as DailyCompletion).mistakes >= 0 &&
      typeof (record as DailyCompletion).completedAt === 'string' &&
      !Number.isNaN(Date.parse((record as DailyCompletion).completedAt))
    ) history[date] = record as DailyCompletion;
  }
  return history;
}

function isKnownDailyPuzzleId(record: DailyCompletion): boolean {
  const config = getDailyConfig(record.date);
  // Accept the pre-difficulty-ID format so existing completion records survive migration.
  const legacyId = `DAILY-${record.date}-9x9`;
  return record.puzzleId === config.seed ||
    (record.puzzleId === legacyId && record.difficulty === config.difficulty);
}

function isValidDailyDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

function readLegacyDailyDates(): string[] {
  const value = SafeStorage.get<unknown>('player_stats', {});
  if (!value || typeof value !== 'object') return [];
  const stats = value as { completedDailies?: unknown; lastDailyDateWon?: unknown };
  const dates = Array.isArray(stats.completedDailies) ? stats.completedDailies : [];
  return [...dates, stats.lastDailyDateWon].filter(isValidDailyDate);
}

export function getDailyCompletionHistory(): DailyCompletion[] {
  return Object.values(readDailyCompletionHistory()).sort((a, b) => b.date.localeCompare(a.date));
}

export function getDailyCompletedDates(additionalDates: string[] = []): string[] {
  return [...new Set([
    ...Object.keys(readDailyCompletionHistory()),
    ...readLegacyDailyDates(),
    ...additionalDates.filter(isValidDailyDate),
  ])].sort();
}

function addDays(date: string, amount: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

export function getDailyStreaks(
  additionalDates: string[] = [],
  now = Date.now()
): { currentDailyStreak: number; bestDailyStreak: number } {
  const dates = getDailyCompletedDates(additionalDates);
  const completed = new Set(dates);
  let bestDailyStreak = 0;
  let running = 0;
  let previous: string | null = null;

  for (const date of dates) {
    running = previous && addDays(previous, 1) === date ? running + 1 : 1;
    bestDailyStreak = Math.max(bestDailyStreak, running);
    previous = date;
  }

  const today = getTodayDateString(now);
  let cursor = completed.has(today) ? today : completed.has(addDays(today, -1)) ? addDays(today, -1) : '';
  let currentDailyStreak = 0;
  while (cursor && completed.has(cursor)) {
    currentDailyStreak++;
    cursor = addDays(cursor, -1);
  }
  return { currentDailyStreak, bestDailyStreak };
}

export function getDailyCompletion(date = getTodayDateString()): DailyCompletion | null {
  const record = readDailyCompletionHistory()[date];
  return record && isKnownDailyPuzzleId(record) ? record : null;
}

export function saveDailyCompletion(record: DailyCompletion): DailyCompletion {
  const history = readDailyCompletionHistory();
  const existing = history[record.date];
  if (existing) return existing;
  if (!isValidDailyDate(record.date) || !isKnownDailyPuzzleId(record)) return record;
  history[record.date] = record;
  SafeStorage.set(COMPLETIONS_KEY, history);
  return record;
}

export function formatDailyCompletionDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Completion time unavailable';
  return new Intl.DateTimeFormat(undefined, {
    timeZone: DAILY_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date) + ' PKT';
}

export function getDailyConfig(
  dateStr = getTodayDateString(),
  size: GridSize = 9,
  selectedDifficulty?: Difficulty
): {
  seed: string;
  difficulty: Difficulty;
  dateStr: string;
  size: GridSize;
} {
  // Rotate daily difficulty by day of week (Mon-Sun)
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const difficultiesByDay: Difficulty[] = [
    'hard',     // Sun
    'easy',     // Mon
    'medium',   // Tue
    'medium',   // Wed
    'hard',     // Thu
    'hard',     // Fri
    'expert',   // Sat
  ];
  const difficulty = selectedDifficulty || difficultiesByDay[dayOfWeek] || 'medium';
  return {
    seed: `DAILY-${dateStr}-${difficulty}-${size}x${size}`,
    difficulty,
    dateStr,
    size,
  };
}

export function isDailyCompleted(dateStr = getTodayDateString()): boolean {
  return Object.prototype.hasOwnProperty.call(readDailyCompletionHistory(), dateStr) ||
    readLegacyDailyDates().includes(dateStr);
}
