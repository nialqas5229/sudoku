/**
 * Synthesized Web Audio API sound effects service.
 * Requires zero external audio files and works 100% offline.
 */
class SoundService {
  private ctx: AudioContext | null = null;
  // Sound starts off until the user's saved preference has been applied.
  public enabled = false;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          // Audio can be unavailable or blocked by the browser; gameplay continues silently.
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, durationMs: number, type: OscillatorType = 'sine', gainPeak = 0.08, delayMs = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delayMs / 1000;
    const duration = durationMs / 1000;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  public playPlace(): void {
    this.playTone(520, 90, 'triangle', 0.09);
  }

  public playNote(): void {
    this.playTone(680, 55, 'sine', 0.05);
  }

  public playErase(): void {
    this.playTone(300, 75, 'sine', 0.06);
  }

  public playError(): void {
    this.playTone(185, 160, 'sawtooth', 0.08, 0);
    this.playTone(155, 190, 'sawtooth', 0.08, 90);
  }

  public playHint(): void {
    this.playTone(587.33, 110, 'sine', 0.08, 0);
    this.playTone(880, 180, 'sine', 0.08, 90);
  }

  public playUnitComplete(): void {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((n, i) => this.playTone(n, 130, 'triangle', 0.07, i * 65));
  }

  public playWin(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((n, i) => this.playTone(n, 240, 'triangle', 0.1, i * 95));
  }
}

export const audioService = new SoundService();
