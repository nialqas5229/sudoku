import { Difficulty, GridSize } from '../core/types';
import { loadStats } from './stats';

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyConfig(dateStr = getTodayDateString(), size: GridSize = 9): {
  seed: string;
  difficulty: Difficulty;
  dateStr: string;
  size: GridSize;
} {
  // Rotate daily difficulty by day of week (Mon-Sun)
  const dayOfWeek = new Date(`${dateStr}T12:00:00`).getDay();
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
