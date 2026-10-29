# Sudoku Web Application — Implementation Checklist

**Project:** https://sudoku-by-nialqas.vercel.app/  
**Purpose:** Track and implement the approved improvements in seven controlled phases.

> **Important:** This file is a checklist and implementation guide. Do not implement every phase at once. Work on one phase at a time, verify it, and then continue.

---

## Global Rules

- [ ] Inspect the existing repository before editing.
- [ ] Identify the framework, game-state model, timer, puzzle generation, daily-puzzle logic, storage, settings, statistics, responsive layout, and tests.
- [ ] Extend the existing application; do not rebuild it from scratch.
- [ ] Preserve existing working features, UI, themes, and keyboard shortcuts.
- [ ] **Do not change existing Sudoku cell-colour visibility or add new selected-cell, row/column, or matching-digit colour-highlighting behaviour.**
- [ ] Avoid unnecessary dependencies, refactoring, duplicate timers, and competing sources of truth.
- [ ] Keep normal Sudoku sessions separate from Daily Puzzle records.
- [ ] Preserve existing user data. Use safe storage migrations if needed.
- [ ] Handle unavailable, malformed, or outdated browser storage gracefully.
- [ ] Implement only the phase requested by the current prompt.
- [ ] Run relevant tests, linting, type checks, and production build where available.
- [ ] Report actual test/build results. Never claim checks passed unless they were run.
- [ ] Do not proceed to the next phase until the current phase passes its acceptance criteria, or clearly document any blocker.

## Phase 1 — Game Lifecycle, Start Button, Pause/Resume, and Timer

### Implementation checklist

- [x] Inspect existing game-state, board-rendering, timer, pause/resume, restart, and completion logic.
- [x] Implement or adapt the states: **Ready → Playing → Paused → Completed**.
- [x] When a new playable puzzle loads, show a **Start Game** button.
- [x] Keep the timer stopped until the user explicitly starts the game.
- [x] Starting the game reveals the board and starts the existing timer.
- [x] While playing, provide the existing Pause control.
- [x] When paused, stop the timer and preserve all current progress.
- [x] Keep the real Sudoku board rendered behind the pause overlay.
- [x] Preserve the grid, cell boundaries, reserved/blocked-cell appearance, and existing cell styling.
- [x] Apply a subtle blur and translucent dark overlay to the board layer only; keep overlay text and controls sharp.
- [x] Prevent interaction with the board while paused.
- [x] Resume the same board and continue the timer without counting paused time.
- [x] Support existing stopwatch and countdown modes.
- [x] Stop the timer on completion.
- [x] Make restart reset the appropriate progress and timer, returning to Ready where consistent with the existing design.
- [x] Preserve existing keyboard shortcuts and avoid duplicate timers or invalid transitions.

### Acceptance criteria

- [x] New playable puzzles open in Ready state.
- [x] Timer does not advance before Start Game.
- [x] Start, Pause, and Resume work correctly.
- [x] Paused board remains recognizable behind the overlay.
- [x] Overlay controls remain sharp, accessible, and clickable.
- [x] Resume restores the exact previous board and state.
- [x] Paused time is excluded from active gameplay time.
- [x] Restart and completion behave correctly.
- [x] Existing game features continue to work.

**Phase 1 status:** Complete
**Verification notes:** `npm.cmd test` passed (19 passed, 0 failed). `npm.cmd run build` passed, including `tsc --noEmit` and Vite production build. `git diff --check` passed. Ready-state and timer behavior have focused automated coverage; visual overlay behavior was confirmed from the board-layer implementation, but not exercised in a browser session.

---

## Phase 2 — Daily Puzzle, Completion Persistence, History, Countdown, and Streaks

### Daily puzzle identity

- [x] Inspect the existing daily-puzzle generation mechanism.
- [x] Ensure a given daily date consistently resolves to the same puzzle.
- [x] Reuse the current deterministic generation/seed mechanism where possible.
- [x] Refreshing the page must not generate a different puzzle for the same date.
- [x] Keep Daily Puzzle data separate from normal games.

### Completion persistence

- [x] Save completion automatically when today's Daily Puzzle is solved.
- [x] Store the daily date and stable puzzle identifier.
- [x] Store completion status, timestamp, completion time, and available result details.
- [x] Store difficulty and mistake count when available.
- [x] Preserve earlier daily records.
- [x] Make saving idempotent so duplicate completion events do not overwrite or duplicate the original result.
- [x] Restore completed status after refresh and reopening the website.
- [x] Do not allow a completed daily puzzle to become playable again on the same day.

### Completed state and countdown

- [x] Show a clear completed status and saved result.
- [x] Display the saved completion time.
- [x] Provide a way to view today's result.
- [x] Show a live countdown to the next daily puzzle.
- [x] Calculate the next daily boundary using **Asia/Karachi** timezone.
- [x] Recalculate the countdown after tab suspension, page restoration, and date rollover.
- [x] Refresh the current daily challenge when midnight Pakistan time passes.
- [x] Avoid negative countdowns and duplicate intervals.
- [x] Do not claim the browser-only countdown is tamper-proof.

### Daily history and streaks

- [x] Maintain date-indexed daily completion history.
- [x] Preserve history when a new day begins.
- [x] Show historical results where available.
- [x] Distinguish completed, missed, and not-played days only when the available data supports that distinction.
- [x] Calculate current streak from actual completed-day records.
- [x] Calculate best streak.
- [x] Count no more than one completion per daily date.
- [x] Handle missed days and date transitions correctly.
- [x] Recalculate streaks consistently from records rather than relying only on an incrementing counter.

### Acceptance criteria

- [x] Completion survives refresh and browser reopening.
- [x] Daily puzzle identity is stable for the date.
- [x] Next puzzle becomes available at the correct Pakistan-time boundary.
- [x] History is preserved and accurate.
- [x] Streaks are calculated correctly.
- [x] Normal games do not create Daily Puzzle records.
- [x] Invalid storage data does not crash the application.

**Phase 2 status:** Complete  
**Verification notes:** `npm.cmd test` passed (20 passed, 0 failed). `npm.cmd run build` passed, including TypeScript checking and Vite production build. `git diff --check` passed. Tests cover deterministic identity, Pakistan-midnight boundaries, idempotent persistence, malformed storage, and streak calculation from saved date records. Browser interaction and live tab-suspension behavior were not exercised manually; countdown and rollover use timestamp-based recalculation and visibility/timer callbacks.

---

## Phase 3 — Mistake Prevention and Smart Feedback

### Implementation checklist

- [x] Inspect existing validation and Check Board behaviour.
- [x] Distinguish row/column/box rule conflicts from incorrect final-solution values.
- [x] Provide clear feedback for duplicate digits in a row, column, or 3×3 box.
- [x] Prevent edits to original fixed clues.
- [x] Preserve the current Mistakes counter semantics unless a verified bug requires a fix.
- [x] Add or adapt settings for optional mistake assistance where appropriate.
- [x] Support optional warnings before or after invalid entries, consistent with the existing design.
- [x] Keep Smart Hint compatible with validation.
- [x] Prevent one invalid action from being counted multiple times.
- [x] Preserve Undo and Redo behaviour.
- [x] **Do not change existing cell colours, selection colours, or add matching-digit colour highlighting.**

### Acceptance criteria

- [x] Invalid entries are handled consistently.
- [x] Rule conflicts are distinguished from final-solution mismatches.
- [x] Fixed clues cannot be edited.
- [x] Mistake counts remain accurate.
- [x] Existing cell-colour visibility is unchanged.
- [x] Smart Hint, Undo, and Redo continue working.

**Phase 3 status:** Complete  
**Verification notes:** `npm.cmd test` passed (22 passed, 0 failed). `npm.cmd run build` passed, including TypeScript checking and Vite production build. `git diff --check` passed. Added tests cover per-unit duplicate classification, single-count mistake semantics, fixed-clue protection, and existing hint/undo/redo behavior. Cell-color and browser UI behavior were not manually exercised; the board color classes and styles were not changed.

---

## Phase 4 — Statistics Dashboard

### Implementation checklist

- [x] Inspect the existing Stats UI and saved data.
- [x] Track completed games.
- [x] Track started games only where the existing data can support accurate counting.
- [x] Define and calculate completion rate using a clear denominator.
- [x] Calculate best successful completion time.
- [x] Calculate average successful completion time.
- [x] Show difficulty breakdown.
- [x] Show current Daily Puzzle streak.
- [x] Show best Daily Puzzle streak.
- [x] Separate Daily Puzzle results from normal-game results.
- [x] Avoid duplicate counting of completion events.
- [x] Derive metrics from saved records where possible.
- [x] Handle missing, partial, or older records gracefully.
- [x] Preserve existing statistics during storage migrations.
- [x] Make the dashboard clear and responsive.

### Acceptance criteria

- [x] Statistics match the available saved records.
- [x] Opening the dashboard does not change counts.
- [x] Duplicate events do not inflate statistics.
- [x] Daily and normal games are distinguished correctly.
- [x] Missing historical data is handled honestly.
- [x] Existing Stats navigation continues working.

**Phase 4 status:** Complete  
**Verification notes:** `npm.cmd test` passed (24 passed, 0 failed). `npm.cmd run build` passed, including TypeScript checking and Vite production build. `git diff --check` passed. Tests cover daily/normal start and win classification, duplicate completion idempotency, legacy aggregate preservation, and read-only stats loading. Older wins without detailed records are shown as unclassified; browser UI was not manually exercised.

---

## Phase 5 — Responsive and Mobile Experience

### Implementation checklist

- [x] Inspect existing breakpoints and responsive layout.
- [x] Test the board at narrow viewport widths.
- [x] Prevent unintended horizontal overflow.
- [x] Keep number-entry controls easy to access on mobile.
- [x] Provide comfortable touch targets for important controls.
- [x] Adapt Game Controls layout for narrow screens.
- [x] Keep Ready and Paused overlays correctly aligned.
- [x] Preserve board proportions and grid alignment.
- [x] Test portrait and landscape layouts.
- [x] Ensure Settings and Stats remain usable.
- [x] Check scrolling and focus behaviour.
- [x] Avoid unrelated desktop redesigns.
- [x] Preserve existing cell colours and styling.

### Acceptance criteria

- [x] No major layout breakage on supported desktop, tablet, and mobile viewports.
- [x] Board remains playable at supported widths.
- [x] Buttons and controls remain accessible.
- [x] Overlays do not obscure their own controls.
- [x] Production build succeeds.

Use browser-based testing if available. Do not claim physical-device testing if only viewport emulation was performed.

**Phase 5 status:** Complete  
**Verification notes:** Edge production-preview emulation covered 375×812 portrait, 812×375 landscape, 768×1024 tablet, and 1440×1000 desktop. Document widths stayed within the viewport; at 375 px the board measured 325 px square. The board accepted input at mobile width. Settings and Stats opened within the viewport; Stats scrolled (1278 px content in a 790 px card), keyboard navigation moved focus, and the paused overlay/button stayed within the board. `npm.cmd run build` passed. No physical-device testing was performed.

---

## Phase 6 — Optional Sounds and Visual Feedback

### Implementation checklist

- [x] Inspect existing audio and animation functionality.
- [x] Add subtle optional feedback for successful number entry where appropriate.
- [x] Add optional feedback for invalid moves.
- [x] Add optional puzzle-completion feedback.
- [x] Add optional Daily Puzzle completion feedback.
- [x] Keep sound disabled by default unless current settings establish another preference.
- [x] Provide a persistent sound on/off setting.
- [x] Respect browser restrictions on audio before user interaction.
- [x] Avoid unnecessary audio dependencies.
- [x] Keep sound short and unobtrusive.
- [x] Add subtle transitions only where they improve clarity.
- [x] Respect reduced-motion preferences.
- [x] Avoid distracting animations or repeated sounds.
- [x] Preserve keyboard and screen-reader usability.

### Acceptance criteria

- [x] Sound can be completely disabled.
- [x] Sound preference persists where appropriate.
- [x] Audio does not interfere with gameplay.
- [x] Animations remain subtle.
- [x] Reduced-motion preferences are respected.
- [x] Existing settings continue working.

**Phase 6 status:** Complete  
**Verification notes:** Sound defaults off; saved preferences persist and are applied. Tests cover default and saved preferences. In Edge, the setting began unchecked and a change persisted to storage. Existing Web Audio effects remain setting-gated and handle unavailable audio contexts silently. Cell entry/error animations respect reduced motion; Edge reported `1e-05s` animation duration under `prefers-reduced-motion: reduce`. The 30-test suite and production build passed. Audio output was not manually listened to.

---

## Phase 7 — Continue Previous Game / Session Recovery

**Scope note:** This feature is for unfinished normal Sudoku games. Keep it separate from Daily Puzzle completion/history.

### Session persistence

- [x] Inspect existing game-state persistence.
- [x] Save the normal game's state after meaningful moves and at appropriate intervals.
- [x] Save enough puzzle data or a stable identifier to restore the same puzzle.
- [x] Save entered digits and pencil notes.
- [x] Save elapsed active gameplay time.
- [x] Save difficulty and time-limit configuration.
- [x] Save mistakes and hints remaining where supported.
- [x] Preserve undo/redo history if practical and compatible.
- [x] Save only data needed for recovery.
- [x] Do not silently overwrite an unfinished session with another session.

### Welcome Back UI

When an unfinished normal game exists, offer a clear choice:

> **Welcome Back!**  
> You have an unfinished game.  
> Difficulty: [saved difficulty]  
> Progress: [actual filled cells]/[total cells]  
>
> **Continue Game**  
> **Start New Game**

Use actual saved data, not hardcoded example values.

### Continue Game

- [x] Restore the same puzzle.
- [x] Restore entries and pencil notes.
- [x] Restore mistakes and hints remaining.
- [x] Restore active gameplay time correctly.
- [x] Restore relevant settings.
- [x] Return to an appropriate Ready/Paused state.
- [x] Do not count time away from the website as active gameplay time.
- [x] Require an explicit user action before gameplay timing resumes.
- [x] Do not generate a different puzzle.

### Start New Game and cleanup

- [x] Handle the existing unfinished session deliberately.
- [x] Avoid silently losing important progress; request confirmation when appropriate.
- [x] Use the existing new-game generation flow.
- [x] Keep Daily Puzzle records separate.
- [x] Mark completed normal games as completed and stop the timer.
- [x] Do not offer Continue Game for completed sessions.
- [x] Preserve completed-game statistics.
- [x] Remove or archive the active session appropriately.
- [x] Handle corrupted/incomplete saved sessions gracefully.

### Acceptance criteria

- [x] An unfinished normal game survives refresh.
- [x] It can be restored after reopening the browser.
- [x] The restored board matches the saved board.
- [x] Active gameplay time is restored correctly.
- [x] Time away is not counted as active play.
- [x] Completed games are not restored as unfinished.
- [x] Starting a new game does not silently destroy important progress.
- [x] Daily Puzzle history remains separate.

**Phase 7 status:** Complete  
**Verification notes:** Normal and Daily Puzzle autosaves use separate slots, with legacy-key migration and malformed-state validation. Edge production-preview testing entered a value, reloaded, confirmed the Welcome Back prompt, restored the same puzzle and 39/81 filled cells, and kept the timer at 00:00 until explicit Continue. The Start New flow replaced the saved game only after the explicit choice and returned the new puzzle to Ready. Automated coverage includes restoration data, separate slots, completed/corrupt cleanup, and migration. The 30-test suite and production build passed.

---

# Final Verification Checklist

Complete after all seven phases.

### Core gameplay
- [x] Ready → Playing → Paused → Playing works.
- [x] Completion stops the timer.
- [x] Restart works correctly.
- [x] Stopwatch and countdown modes work.
- [x] Keyboard shortcuts work.
- [x] Existing features remain functional.

### Daily Puzzle
- [x] Completion persists.
- [x] Completed status survives refresh.
- [x] Puzzle identity is stable for the date.
- [x] Midnight release uses Asia/Karachi.
- [x] History and streaks are accurate.

### Smart feedback
- [x] Mistake prevention works.
- [x] Smart Hint remains functional.
- [x] Fixed clues cannot be edited.
- [x] Existing cell-colour visibility remains unchanged.

### Statistics
- [x] Counts and completion rate are accurate.
- [x] Best and average times are accurate.
- [x] Daily streak metrics are accurate.

### Responsive experience
- [x] Desktop layout works.
- [x] Tablet layout works.
- [x] Mobile viewport works.
- [x] Ready and Paused overlays remain usable.

### Optional feedback
- [x] Sound can be disabled.
- [x] Sound preference persists.
- [x] Animations are unobtrusive.
- [x] Reduced-motion preference is respected.

### Session recovery
- [x] Continue Game restores an unfinished normal game.
- [x] Start New Game handles saved progress safely.
- [x] Completed games are not restored incorrectly.
- [x] Daily Puzzle history remains separate.

### Technical checks
- [x] Existing tests pass.
- [x] New tests pass.
- [x] Lint checks pass where configured (no lint script is configured).
- [x] Type checks pass where configured.
- [x] Production build succeeds.
- [ ] No unintended console errors remain (browser console was not audited).
- [x] No duplicate timers or conflicting storage logic remain.
- [x] No known regressions remain unresolved.

**Integrated verification (2026-10-30):** `npm.cmd test` passed (30 passed, 0 failed); `npm.cmd run build` passed; `npx.cmd tsc --noEmit` passed; `git diff --check` passed with line-ending warnings. Edge CSS viewport emulation passed at 375×812, 812×375, 768×1024, and 1440×1000. Mobile board entry, Settings/Stats fit and scroll, keyboard focus, paused overlay alignment, reduced-motion timing, normal-game reload recovery, explicit Continue, and explicit Start New were exercised. Physical devices and audible sound output were not tested. The only unverified final-check item is a full browser-console audit.

---

# Execution Protocol for Codex

1. Inspect the repository and establish the baseline.
2. Implement **Phase 1 only**.
3. Run relevant tests and build checks.
4. Report changed files, actual results, limitations, and acceptance status.
5. Wait for the next phase instruction.
6. Repeat in order through Phase 7.
7. Do not implement future phases early.
8. If a requirement conflicts with the existing architecture, explain the conflict and choose the smallest safe approach.
9. Never claim unimplemented or unverified functionality is complete.

**Start with repository inspection and Phase 1 only. Do not start Phase 2 until Phase 1 has been verified.**
