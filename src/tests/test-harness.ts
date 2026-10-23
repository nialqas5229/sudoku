export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];
let currentSuite = 'Root';

export function describe(suiteName: string, fn: () => void): void {
  const prevSuite = currentSuite;
  currentSuite = suiteName;
  try {
    fn();
  } finally {
    currentSuite = prevSuite;
  }
}

export function it(testName: string, fn: () => void): void {
  try {
    fn();
    results.push({ suite: currentSuite, name: testName, passed: true });
  } catch (err) {
    results.push({
      suite: currentSuite,
      name: testName,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const test = it;

export function expect<T>(actual: T) {
  return {
    toBe(expected: T): void {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: unknown): void {
      const aStr = JSON.stringify(actual);
      const eStr = JSON.stringify(expected);
      if (aStr !== eStr) {
        throw new Error(`Expected ${eStr}, but got ${aStr}`);
      }
    },
    toBeTruthy(): void {
      if (!actual) {
        throw new Error(`Expected truthy value, but got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy(): void {
      if (actual) {
        throw new Error(`Expected falsy value, but got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(num: number): void {
      if (typeof actual !== 'number' || actual <= num) {
        throw new Error(`Expected ${actual} to be greater than ${num}`);
      }
    },
    toBeGreaterThanOrEqual(num: number): void {
      if (typeof actual !== 'number' || actual < num) {
        throw new Error(`Expected ${actual} to be >= ${num}`);
      }
    },
    toBeLessThanOrEqual(num: number): void {
      if (typeof actual !== 'number' || actual > num) {
        throw new Error(`Expected ${actual} to be <= ${num}`);
      }
    },
  };
}

export function getTestResults(): TestResult[] {
  return results;
}
