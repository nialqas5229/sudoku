import { FontSize, ThemeMode } from '../core/types';
import { SafeStorage } from './storage';

export interface UserSettings {
  theme: ThemeMode;
  fontSize: FontSize;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  autoClearNotes: boolean;
  highlightPeers: boolean;
  highlightSameDigit: boolean;
  showBlockedCells: boolean;
  showTimer: boolean;
}

const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  fontSize: 'medium',
  soundEnabled: true,
  hapticsEnabled: true,
  autoClearNotes: true,
  highlightPeers: true,
  highlightSameDigit: true,
  showBlockedCells: true,
  showTimer: true,
};

export function loadSettings(): UserSettings {
  const saved = SafeStorage.get<Partial<UserSettings>>(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(settings: UserSettings): void {
  SafeStorage.set(SETTINGS_KEY, settings);
}
