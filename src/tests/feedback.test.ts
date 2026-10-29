import { audioService } from '../services/audio';
import { DEFAULT_SETTINGS, loadSettings } from '../services/settings';
import { describe, expect, it } from './test-harness';

function mockSettingsStorage(value: string | null): void {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => value,
      },
    },
  });
}

describe('Optional sound feedback', () => {
  it('starts disabled by default while respecting a saved user preference', () => {
    expect(DEFAULT_SETTINGS.soundEnabled).toBe(false);
    mockSettingsStorage(null);
    expect(loadSettings().soundEnabled).toBe(false);

    mockSettingsStorage(JSON.stringify({ soundEnabled: true }));
    expect(loadSettings().soundEnabled).toBe(true);
  });

  it('does not create audio before a saved preference enables it', () => {
    expect(audioService.enabled).toBe(false);
  });
});
