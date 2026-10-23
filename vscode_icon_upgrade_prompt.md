# VS Code AI Prompt: Replace All Emojis with Vector & Canvas Icons

Copy and paste the prompt below into your VS Code AI assistant (GitHub Copilot Chat, Cursor Composer, or Claude) with the `sudoku` workspace open.

## Prompt to Copy & Paste

> **Task: Replace every Unicode emoji and symbol across the entire Sudoku TypeScript project with a unified, zero-dependency Vector & Canvas Icon System (`src/ui/icons.ts`).**
>
> ### Strict Constraints
> 1. **Zero npm dependencies:** Do NOT install `lucide`, `heroicons`, `fontawesome`, or any external npm package. Keep `dependencies: {}` in `package.json` so `npm install` continues to have **0 vulnerabilities**.
> 2. **Zero emojis or Unicode dingbats in the UI:** Remove every emoji (`📅`, `🏆`, `⚙️`, `❓`, `🔑`, `⚡`, `✨`, `✎`, `⌫`, `↶`, `↷`, `✦`, `✓`, `▶`, `Ⅱ`, `↻`, `✕`, `⭐`, `☆`, `🔥`, `📤`, `🎉`, `⏰`, `❌`, `💡`, `🌟`, `🧠`, `🎯`, `🏛️`, `👑`, `🟦`, `🟩`) from `index.html`, `src/main.ts`, `src/ui/*`, and `src/services/*`.
> 3. **Theme-aware monochrome/accent vector & canvas rendering:** All UI icons must use crisp 24×24 stroke-based SVG paths (`stroke="currentColor"`, `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`) or HTML5 `<canvas>` rendering so they automatically adapt to Light, Dark, System, Color-Blind Safe, and High-Contrast themes instead of looking like colorful OS stickers.
>
> ### Step-by-Step Implementation Plan
>
> #### 1. Create `src/ui/icons.ts`
> Create a dedicated icon module exporting:
> - `IconName` union type covering all UI and achievement icons:
>   - Navigation & Header: `'calendar' | 'plus' | 'trophy' | 'settings' | 'help' | 'key' | 'close'`
>   - Gameplay Tools & Actions: `'eraser' | 'pencil' | 'sparkles' | 'bolt' | 'undo' | 'redo' | 'play' | 'pause' | 'restart' | 'lightbulb' | 'check-circle' | 'share'`
>   - Status & Overlays: `'clock' | 'alert-triangle' | 'lock'`
>   - Ratings & Streaks: `'star-filled' | 'star-outline' | 'flame'`
>   - Achievements: `'award-star' | 'brain-circuit' | 'target-crosshair' | 'speed-gauge' | 'pillar-shield' | 'calendar-check' | 'flame-streak' | 'crown-gem'`
> - `icon(name: IconName, size = 16, className = ''): string` — returns an inline `<svg class="ui-icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">...</svg>` string.
> - `renderStarRating(stars: 1 | 2 | 3, size = 30): string` — returns 3 vector star icons (`star-filled` for earned stars, `star-outline` for remaining stars).
>
> #### 2. Add Icon Styling in `src/styles/components.css`
> Add clean alignment rules for `.ui-icon`, `.star-rating-row`, and `.achievement-icon`:
> ```css
> .ui-icon {
>   display: inline-block;
>   vertical-align: middle;
>   flex-shrink: 0;
> }
> .star-rating-row {
>   display: inline-flex;
>   align-items: center;
>   justify-content: center;
>   gap: 8px;
>   color: var(--primary);
> }
> .achievement-icon {
>   display: grid;
>   place-items: center;
>   width: 38px;
>   height: 38px;
>   border-radius: 10px;
>   background: var(--primary-soft);
>   color: var(--primary);
>   flex-shrink: 0;
> }
> ```
>
> #### 3. Update `index.html`
> Replace all static emoji/symbol text inside buttons and badges with clean `<svg class="ui-icon">` icons and text spans:
> - `#dailyBtn`: Calendar vector icon + `Daily`
> - `#newBtn`: Plus vector icon + `New Game`
> - `#statsBtn`: Trophy vector icon + `Stats`
> - `#settingsBtn`: Sliders/Gear vector icon + `Settings`
> - `#helpBtn`: Help-circle vector icon + `Guide`
> - `#seedPill`: Key vector icon + `SDK`
> - `#quickFillBtn`: Bolt vector icon + `Quick-Fill: Off`
> - `#eraseBtn`: Eraser vector icon + `Erase`
> - `#notesBtn`: Pencil vector icon + `Notes: Off`
> - `#autoNotesBtn`: Sparkles vector icon + `Auto-Notes`
> - `#undoBtn`: Undo curved-arrow vector icon + `Undo`
> - `#redoBtn`: Redo curved-arrow vector icon + `Redo`
> - `#startBtn`: Restart (`rotate-ccw`) vector icon + `Quick Restart`
> - `#pauseBtn`: Pause vector icon + `Pause`
> - `#hintBtn`: Lightbulb vector icon + `Smart Hint (3)`
> - `#checkBtn`: Check-circle vector icon + `Check Board`
> - Modal close buttons (`[data-close-modal]`): `close` (`X`) vector icon
> - `#winModalTitle`: Remove `🎉` from the heading text
>
> #### 4. Update `src/ui/controls.ts`
> Use `icon(...)` with `.innerHTML` instead of `.textContent` for dynamic button labels so icons stay intact when states change:
> - `#dailyPill`: `${icon('calendar', 13)} <span>Daily (${state.dailyDate})</span>`
> - `#seedPill`: `${icon('key', 13)} <span>${state.seed}</span>`
> - `#notesBtn`: `${icon('pencil', 15)} <span>Notes: ${state.notesMode ? 'On' : 'Off'}</span>`
> - `#quickFillBtn`: `${icon('bolt', 14)} <span>Quick-Fill: ${state.quickFill ? 'On' : 'Off'}</span>`
> - `#pauseBtn`: `${icon(state.paused ? 'play' : 'pause', 15)} <span>${state.paused ? 'Resume' : 'Pause'}</span>`
> - `#hintBtn`: `${icon('lightbulb', 15)} <span>${state.activeHint && state.activeHint.stage === 1 ? `Apply Hint (${state.activeHint.digit})` : `Smart Hint (${state.hintsLeft})`}</span>`
>
> #### 5. Update `src/ui/board.ts`, `src/ui/timer.ts`, and `src/ui/toast.ts`
> - In `src/ui/board.ts`:
>   - On pause overlay, render `${icon('lock', 34)}` above `<h3>Game Paused</h3>` and `${icon('play', 15)} <span>Resume Game</span>` inside `#overlayResumeBtn`.
>   - On loss overlay (`time` or `mistakes`), render `${icon(state.loseReason === 'time' ? 'clock' : 'alert-triangle', 34)}` above the heading and `${icon('restart', 15)} <span>Try New Puzzle</span>` inside `#overlayNewGameBtn`.
> - In `src/ui/timer.ts`:
>   - Replace `'Solved 🎉'` with `'Completed'`.
> - In `src/ui/toast.ts`:
>   - In `renderHintBanner`, replace `💡` with `${icon('lightbulb', 16)}` and add `${icon('check-circle', 14)}` to `#applyHintStage2Btn`.
>
> #### 6. Update `src/services/stats.ts`, `src/services/share.ts`, `src/ui/modals/index.ts`, and `src/main.ts`
> - In `src/services/stats.ts`:
>   - Change `AchievementDef.icon` from emoji characters to `IconName` values (`'award-star'`, `'brain-circuit'`, `'target-crosshair'`, `'speed-gauge'`, `'pillar-shield'`, `'calendar-check'`, `'flame-streak'`, `'crown-gem'`).
> - In `src/ui/modals/index.ts`:
>   - Replace `⭐` / `☆` text in `openWinModal` with `renderStarRating(stars, 30)`.
>   - Replace `🏆`, `📤`, `▶`, `🔥` with `icon('trophy')`, `icon('share')`, `icon('play')`, and `icon('flame')`.
>   - Render each achievement's icon via `${icon(ach.icon, 20)}`.
> - In `src/services/share.ts`:
>   - Format the plain-text clipboard summary using clean ASCII/text indicators (`[3/3 Stars]`, `Time:`, `Mistakes:`, `Hints:`, `Seed:`, and `[#]` / `[+]` ASCII mini-grid) so not a single emoji exists anywhere in the codebase.
> - In `src/main.ts`:
>   - Remove `🎉` from `showBannerMessage('Puzzle solved! Great work.', 'good')`.
>
> #### 7. Verification
> - Run `npm test` and `npm run build` to verify zero TypeScript errors and all unit tests pass.
