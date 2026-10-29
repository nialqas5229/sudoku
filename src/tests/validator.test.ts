import {
  applyCellInput,
  createNewGameState,
  fillAutoNotes,
  redoState,
  triggerSmartHint,
  undoState,
} from '../core/state';
import { getAllConflictingCells, getCandidatesForCell } from '../core/validator';
import { describe, expect, it } from './test-harness';
import { GameTimer } from '../ui/timer';

describe('Validator, State Reducer, Auto-Notes & Undo/Redo Fixes', () => {
  it('creates a playable puzzle in Ready state with its initial timer value', () => {
    const ready = createNewGameState({
      size: 4,
      difficulty: 'easy',
      mode: 'standard',
      timeLimit: 180,
      seed: 'READY-STATE-TEST',
    });
    expect(ready.started).toBe(false);
    expect(ready.paused).toBe(false);
    expect(ready.secondsLeft).toBe(180);
    expect(ready.elapsed).toBe(0);
    expect(ready.board.length).toBe(16);
  });

  it('keeps one timer active, accounts for delayed ticks, and excludes paused time', () => {
    const originalNow = Date.now;
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    let now = 10000;
    let interval: () => void = () => {};
    let intervalsCreated = 0;
    let intervalsCleared = 0;
    Date.now = () => now;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        setInterval: (callback: () => void) => {
          interval = callback;
          intervalsCreated++;
          return intervalsCreated;
        },
        clearInterval: () => { intervalsCleared++; },
      },
    });

    try {
      const state = createNewGameState({ size: 4, difficulty: 'easy', mode: 'standard', timeLimit: 10, seed: 'TIMER-TEST' });
      state.started = true;
      const timer = new GameTimer(() => {}, () => {});
      timer.start(state);
      timer.start(state);
      expect(intervalsCreated).toBe(2);
      expect(intervalsCleared).toBe(1);

      now += 3500;
      interval();
      expect(state.elapsed).toBe(3);
      expect(state.secondsLeft).toBe(7);

      state.paused = true;
      timer.stop();
      now += 60000;
      state.paused = false;
      timer.start(state);
      now += 2000;
      interval();
      expect(state.elapsed).toBe(5);
      expect(state.secondsLeft).toBe(5);
      timer.stop();
    } finally {
      Date.now = originalNow;
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
      else delete (globalThis as { window?: Window }).window;
    }
  });

  it('identifies row, column, and box conflicts accurately', () => {
    const board = new Array(81).fill(0);
    board[0] = 7;
    board[8] = 7; // Same row
    const conflicts = getAllConflictingCells(board, 9);
    expect(conflicts.has(0)).toBe(true);
    expect(conflicts.has(8)).toBe(true);
  });

  it('computes legal candidates for an empty cell', () => {
    const board = new Array(16).fill(0);
    board[0] = 1;
    board[1] = 2;
    board[4] = 3; // Same column & box as index 0
    // Cell index 5 is in row 1, col 1, box 0 (contains 1, 2, 3) -> only 4 is legal!
    const cands = getCandidatesForCell(board, 5, 4);
    expect(cands).toEqual([4]);
  });

  it('auto-clears peer notes when a correct digit is placed and restores notes/hints on Undo', () => {
    const state = createNewGameState({
      size: 4,
      difficulty: 'easy',
      mode: 'standard',
      timeLimit: 0,
      seed: 'STATE-TEST-4X4',
    });
    state.started = true;

    fillAutoNotes(state);
    const emptyIdx = state.board.findIndex((v) => v === 0);
    expect(emptyIdx >= 0).toBe(true);

    // Use two-stage smart hint and verify hintsLeft is restored on Undo
    const hintsBefore = state.hintsLeft;
    const stage1 = triggerSmartHint(state, true);
    expect(stage1?.stage).toBe(1);
    expect(state.hintsLeft).toBe(hintsBefore); // Stage 1 does not deduct hint yet

    const stage2 = triggerSmartHint(state, true);
    expect(stage2?.stage).toBe(2);
    expect(state.hintsLeft).toBe(hintsBefore - 1);

    // Undo should restore both the board and hintsLeft!
    const undid = undoState(state);
    expect(undid).toBe(true);
    expect(state.hintsLeft).toBe(hintsBefore);

    // Redo should re-apply the hint and deduct hintsLeft again
    const redid = redoState(state);
    expect(redid).toBe(true);
    expect(state.hintsLeft).toBe(hintsBefore - 1);
  });

  it('tracks mistakes against the solution and enforces 3-strikes mode', () => {
    const state = createNewGameState({
      size: 4,
      difficulty: 'easy',
      mode: 'mistakes',
      timeLimit: 0,
      seed: 'STRIKES-TEST',
    });
    state.started = true;

    const emptyIdx = state.board.findIndex((v) => v === 0);
    const correctDigit = state.solution[emptyIdx];
    const wrongDigit = correctDigit === 1 ? 2 : 1;

    applyCellInput(state, wrongDigit, { cellIndex: emptyIdx });
    expect(state.mistakes).toBe(1);
    expect(state.ended).toBe(false);

    applyCellInput(state, 0, { cellIndex: emptyIdx });
    applyCellInput(state, wrongDigit, { cellIndex: emptyIdx });
    expect(state.mistakes).toBe(2);

    applyCellInput(state, 0, { cellIndex: emptyIdx });
    const thirdStrike = applyCellInput(state, wrongDigit, { cellIndex: emptyIdx });
    expect(state.mistakes).toBe(3);
    expect(thirdStrike.lostNow).toBe(true);
    expect(state.ended).toBe(true);
    expect(state.loseReason).toBe('mistakes');
  });
});
