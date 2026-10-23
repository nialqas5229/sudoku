class HapticsService {
  public enabled = true;

  private vibrate(pattern: number | number[]): void {
    if (!this.enabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore on unsupported devices
    }
  }

  public light(): void {
    this.vibrate(10);
  }

  public medium(): void {
    this.vibrate(22);
  }

  public error(): void {
    this.vibrate([35, 50, 45]);
  }

  public success(): void {
    this.vibrate([20, 40, 30, 40, 60]);
  }
}

export const hapticsService = new HapticsService();
