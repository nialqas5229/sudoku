import { Difficulty, GridSize } from '../core/types';
import { loadStats } from './stats';
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

export function getTodayDateString(): string {
  return dateStringInKarachi(new Date());
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
      /^\d{4}-\d{2}-\d{2}$/.test(date) && record && typeof record === 'object' &&
      (record as DailyCompletion).completed === true && (record as DailyCompletion).date === date &&
      typeof (record as DailyCompletion).puzzleId === 'string' &&
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

export function getDailyCompletion(date = getTodayDateString()): DailyCompletion | null {
  const record = readDailyCompletionHistory()[date];
  return record && record.puzzleId === getDailyConfig(date).seed ? record : null;
}

export function saveDailyCompletion(record: DailyCompletion): DailyCompletion {
  const history = readDailyCompletionHistory();
  const existing = history[record.date];
  if (existing?.puzzleId === record.puzzleId) return existing;
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

export function getDailyConfig(dateStr = getTodayDateString(), size: GridSize = 9): {
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
  const difficulty = difficultiesByDay[dayOfWeek] || 'medium';
  return {
    seed: `DAILY-${dateStr}-${size}x${size}`,
    difficulty,
    dateStr,
    size,
  };
}

export function isDailyCompleted(dateStr = getTodayDateString()): boolean {
  const stats = loadStats();
  return stats.completedDailies.includes(dateStr);
}
