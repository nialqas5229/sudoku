const STORAGE_PREFIX = 'sudoku_v2_';

export const SafeStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): void {
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // Ignore storage errors in private browsing mode
    }
  },
};
