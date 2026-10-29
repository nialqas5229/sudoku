import { icon, renderStarRating } from '../icons';
import { DIFFICULTIES, DIFFICULTY_LABELS } from '../../core/constants';
import { parseCustomPuzzleString } from '../../core/generator';
import { Difficulty, FontSize, GameConfig, GameMode, GameState, GridSize, ThemeMode } from '../../core/types';
import { UserSettings } from '../../services/settings';
import { calculateStarRating, formatTimeMMSS, shareOrCopyResult } from '../../services/share';
import { ACHIEVEMENTS, AchievementDef, loadStats } from '../../services/stats';
import { DailyCompletion, formatDailyCompletionDate } from '../../services/daily';

export function openDailyCompletionModal(
  completion: DailyCompletion,
  countdown: string,
  onViewResult: () => void
): void {
  const modal = document.getElementById('dailyCompleteModal');
  const body = document.getElementById('dailyCompleteBody');
  if (!modal || !body) return;
  body.innerHTML = `
    <div class="daily-success-mark" aria-hidden="true">✓</div>
    <p>You've completed today's challenge!</p>
    <div class="daily-result-grid">
      <div class="stat-box"><b>${DIFFICULTY_LABELS[completion.difficulty]}</b><span>Difficulty</span></div>
      <div class="stat-box"><b>${formatTimeMMSS(completion.completionTimeSeconds)}</b><span>Completion Time</span></div>
      <div class="stat-box"><b>${completion.mistakes}</b><span>Mistakes</span></div>
      <div class="stat-box"><b>Saved</b><span>Progress Status</span></div>
    </div>
    <p style="color:var(--muted);font-size:12px;">Completed ${formatDailyCompletionDate(completion.completedAt)}</p>
    <div class="daily-countdown-label">NEXT DAILY PUZZLE IN</div>
    <div class="daily-countdown" id="dailyCountdown" aria-live="off">${countdown}</div>
    <div class="action-stack"><button type="button" class="btn primary" id="viewDailyResultBtn">View Today's Result</button></div>
  `;
  modal.classList.add('open');
  document.getElementById('viewDailyResultBtn')?.addEventListener('click', onViewResult);
}

export function closeAllModals(): void {
  document.querySelectorAll('.modal-backdrop').forEach((el) => el.classList.remove('open'));
  document.dispatchEvent(new Event('modalsclosed'));
}

export function launchConfetti(): void {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
  const particles = Array.from({ length: 85 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 140,
    vx: (Math.random() - 0.5) * 6,
    vy: 3 + Math.random() * 4.5,
    size: 6 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.2,
  }));

  let frame = 0;
  function step() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      ctx.restore();
    }
    frame++;
    if (frame < 130) {
      requestAnimationFrame(step);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(step);
}

export function openWinModal(
  state: GameState,
  newlyUnlocked: AchievementDef[],
  onPlayAgain: () => void
): void {
  const modal = document.getElementById('winModal');
  const body = document.getElementById('winModalBody');
  if (!modal || !body) return;

  const solveSeconds =
    state.timeLimit > 0 ? Math.max(1, state.timeLimit - state.secondsLeft) : Math.max(1, state.elapsed);
  const stars = calculateStarRating(state);
  const starDisplay = renderStarRating(stars, 30);

  const unlockedHtml = newlyUnlocked.length
    ? `<div style="margin-top:12px;padding:10px;border-radius:12px;background:var(--success-bg);color:var(--success-ink);font-size:13px;">
         <strong>${icon('trophy', 15)} New Achievement${newlyUnlocked.length > 1 ? 's' : ''} Unlocked</strong><br>
         ${newlyUnlocked.map((a) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-top:4px;">${icon(a.icon, 15)} <b>${a.title}</b> — ${a.description}</span>`).join('<br>')}
       </div>`
    : '';

  body.innerHTML = `
    <div style="text-align:center;margin-bottom:14px;">
      <div>${starDisplay}</div>
      <p style="margin:6px 0 0;color:var(--muted);font-size:14px;">
        ${state.isDaily ? `Daily Challenge (${state.dailyDate})` : `${state.size}×${state.size} · ${DIFFICULTY_LABELS[state.difficulty]}`}
      </p>
    </div>
    <div class="stats-grid">
      <div class="stat-box"><b>${formatTimeMMSS(solveSeconds)}</b><span>Time</span></div>
      <div class="stat-box"><b>${state.mistakes}</b><span>Mistakes</span></div>
      <div class="stat-box"><b>${state.hintsUsed}</b><span>Hints Used</span></div>
    </div>
    <p style="text-align:center;font-size:12px;color:var(--muted);margin:8px 0;">
      Puzzle Seed: <code>${state.seed}</code>
    </p>
    ${unlockedHtml}
    <div class="action-stack" style="margin-top:16px;">
      <button type="button" class="btn" id="winShareBtn">${icon('share', 15)} <span>Share Result</span></button>
      <button type="button" class="btn primary" id="winPlayAgainBtn">${icon('play', 15)} <span>Play Another</span></button>
    </div>
    <p id="winShareFeedback" style="text-align:center;font-size:12px;color:var(--primary);min-height:18px;margin:8px 0 0;"></p>
  `;

  modal.classList.add('open');
  launchConfetti();

  document.getElementById('winShareBtn')?.addEventListener('click', async () => {
    const outcome = await shareOrCopyResult(state);
    const fb = document.getElementById('winShareFeedback');
    if (fb) {
      fb.textContent =
        outcome === 'shared'
          ? 'Shared!'
          : outcome === 'copied'
          ? 'Result summary copied to clipboard!'
          : 'Could not copy result.';
    }
  });

  document.getElementById('winPlayAgainBtn')?.addEventListener('click', () => {
    closeAllModals();
    onPlayAgain();
  });
}

export function openNewGameModal(
  currentState: GameState,
  onStartGame: (config: GameConfig) => void
): void {
  const modal = document.getElementById('newGameModal');
  const body = document.getElementById('newGameModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="field-group">
      <label class="field-label" for="ngSize">Grid Size (Classic & Kids Modes)</label>
      <select id="ngSize" class="select-input">
        <option value="9" ${currentState.size === 9 ? 'selected' : ''}>9×9 Classic Sudoku</option>
        <option value="6" ${currentState.size === 6 ? 'selected' : ''}>6×6 Midi (2×3 Boxes)</option>
        <option value="4" ${currentState.size === 4 ? 'selected' : ''}>4×4 Mini / Kids (2×2 Boxes)</option>
      </select>
    </div>
    <div class="field-group">
      <label class="field-label" for="ngDifficulty">Difficulty</label>
      <select id="ngDifficulty" class="select-input">
        ${DIFFICULTIES.map(
          (d) => `<option value="${d}" ${currentState.difficulty === d ? 'selected' : ''}>${DIFFICULTY_LABELS[d]}</option>`
        ).join('')}
      </select>
    </div>
    <div class="field-group">
      <label class="field-label" for="ngMode">Game Mode</label>
      <select id="ngMode" class="select-input">
        <option value="standard" ${currentState.mode === 'standard' ? 'selected' : ''}>Standard (Unlimited Mistakes, 3 Hints)</option>
        <option value="mistakes" ${currentState.mode === 'mistakes' ? 'selected' : ''}>3-Strikes Challenge (Max 3 Mistakes)</option>
        <option value="purist" ${currentState.mode === 'purist' ? 'selected' : ''}>Purist Mode (No Notes, No Hints)</option>
      </select>
    </div>
    <div class="field-group">
      <label class="field-label" for="ngTimeLimit">Timer Mode</label>
      <select id="ngTimeLimit" class="select-input">
        <option value="0" ${currentState.timeLimit === 0 ? 'selected' : ''}>No Limit (Stopwatch)</option>
        <option value="180" ${currentState.timeLimit === 180 ? 'selected' : ''}>3 Minutes Rush</option>
        <option value="300" ${currentState.timeLimit === 300 ? 'selected' : ''}>5 Minutes Blitz</option>
        <option value="600" ${currentState.timeLimit === 600 ? 'selected' : ''}>10 Minutes Challenge</option>
      </select>
    </div>
    <div class="field-group">
      <label class="field-label" for="ngSeed">Optional Puzzle Seed (share with friends)</label>
      <input id="ngSeed" type="text" class="text-input" placeholder="Leave blank for random seed (e.g. MY-SEED-1)" />
    </div>
    <div class="field-group">
      <label class="field-label" for="ngCustomString">Or Import Puzzle String (16, 36, or 81 digits, 0/. for empty)</label>
      <input id="ngCustomString" type="text" class="text-input" placeholder="Paste 81-char string here..." />
      <p id="ngErrorMsg" style="color:var(--error-ink);font-size:12px;margin:5px 0 0;display:none;"></p>
    </div>
    <div class="action-stack">
      <button type="button" class="btn" id="ngCancelBtn">Cancel</button>
      <button type="button" class="btn primary" id="ngConfirmBtn">${icon('play', 15)} <span>Start Puzzle</span></button>
    </div>
  `;

  modal.classList.add('open');

  document.getElementById('ngCancelBtn')?.addEventListener('click', closeAllModals);
  document.getElementById('ngConfirmBtn')?.addEventListener('click', () => {
    const size = Number((document.getElementById('ngSize') as HTMLSelectElement).value) as GridSize;
    const difficulty = (document.getElementById('ngDifficulty') as HTMLSelectElement).value as Difficulty;
    const mode = (document.getElementById('ngMode') as HTMLSelectElement).value as GameMode;
    const timeLimit = Number((document.getElementById('ngTimeLimit') as HTMLSelectElement).value);
    const seed = (document.getElementById('ngSeed') as HTMLInputElement).value.trim();
    const customRaw = (document.getElementById('ngCustomString') as HTMLInputElement).value.trim();
    const errEl = document.getElementById('ngErrorMsg');

    if (customRaw) {
      const parsed = parseCustomPuzzleString(customRaw);
      if (!parsed.valid || !parsed.puzzle || !parsed.solution || !parsed.size) {
        if (errEl) {
          errEl.textContent = parsed.error || 'Invalid puzzle string.';
          errEl.style.display = 'block';
        }
        return;
      }
      closeAllModals();
      onStartGame({
        size: parsed.size,
        difficulty,
        mode,
        timeLimit,
        seed: seed || 'IMPORTED',
        customPuzzle: { puzzle: parsed.puzzle, solution: parsed.solution },
      });
      return;
    }

    closeAllModals();
    onStartGame({
      size,
      difficulty,
      mode,
      timeLimit,
      seed: seed || undefined,
    });
  });
}

export function openStatsModal(): void {
  const modal = document.getElementById('statsModal');
  const body = document.getElementById('statsModalBody');
  if (!modal || !body) return;

  const stats = loadStats();
  const winRate =
    stats.gamesStarted > 0 ? Math.round((stats.gamesWon / stats.gamesStarted) * 100) : 0;

  const diffRows = DIFFICULTIES.map((d) => {
    const ds = stats.byDifficulty[d];
    const best = ds.bestTimeSeconds !== null ? formatTimeMMSS(ds.bestTimeSeconds) : '—';
    const avg = ds.won > 0 ? formatTimeMMSS(Math.round(ds.totalTimeSeconds / ds.won)) : '—';
    return `
      <tr>
        <td style="padding:6px 4px;font-weight:600;">${DIFFICULTY_LABELS[d]}</td>
        <td style="padding:6px 4px;text-align:right;">${ds.won}</td>
        <td style="padding:6px 4px;text-align:right;">${best}</td>
        <td style="padding:6px 4px;text-align:right;">${avg}</td>
      </tr>
    `;
  }).join('');

  const achCards = ACHIEVEMENTS.map((ach) => {
    const unlockedDate = stats.unlockedAchievements[ach.id];
    return `
      <div class="achievement-card ${unlockedDate ? 'unlocked' : ''}">
        <div class="achievement-icon">${icon(ach.icon, 20)}</div>
        <div>
          <div style="font-weight:700;font-size:13px;">${ach.title}</div>
          <div style="font-size:11.5px;color:var(--muted);">${ach.description}</div>
        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div class="stats-grid">
      <div class="stat-box"><b>${stats.gamesWon}/${stats.gamesStarted}</b><span>Won (${winRate}%)</span></div>
      <div class="stat-box"><b style="display:inline-flex;align-items:center;gap:4px;">${icon('flame', 18)} ${stats.currentDailyStreak}</b><span>Daily Streak (Best: ${stats.bestDailyStreak})</span></div>
      <div class="stat-box"><b>${stats.flawlessWins}</b><span>Flawless Wins</span></div>
    </div>
    <h3 style="margin:14px 0 8px;font-size:14px;">Solve Times by Difficulty</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="border-bottom:1px solid var(--panel-border);color:var(--muted);">
          <th style="text-align:left;padding:6px 4px;">Level</th>
          <th style="text-align:right;padding:6px 4px;">Wins</th>
          <th style="text-align:right;padding:6px 4px;">Best</th>
          <th style="text-align:right;padding:6px 4px;">Avg</th>
        </tr>
      </thead>
      <tbody>${diffRows}</tbody>
    </table>
    <h3 style="margin:16px 0 8px;font-size:14px;">Achievements (${Object.keys(stats.unlockedAchievements).length}/${ACHIEVEMENTS.length})</h3>
    <div class="achievements-grid">${achCards}</div>
  `;

  modal.classList.add('open');
}

export function openSettingsModal(
  settings: UserSettings,
  onUpdateSettings: (next: UserSettings) => void
): void {
  const modal = document.getElementById('settingsModal');
  const body = document.getElementById('settingsModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="field-group">
      <label class="field-label" for="setTheme">Appearance & Accessibility Theme</label>
      <select id="setTheme" class="select-input">
        <option value="system" ${settings.theme === 'system' ? 'selected' : ''}>System Default (Auto Light/Dark)</option>
        <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light Theme</option>
        <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark Theme</option>
        <option value="colorblind" ${settings.theme === 'colorblind' ? 'selected' : ''}>Color-Blind Safe (Okabe-Ito Palette)</option>
        <option value="high-contrast" ${settings.theme === 'high-contrast' ? 'selected' : ''}>High Contrast (WCAG AAA)</option>
      </select>
    </div>
    <div class="field-group">
      <label class="field-label" for="setFontSize">Board Digit Size</label>
      <select id="setFontSize" class="select-input">
        <option value="small" ${settings.fontSize === 'small' ? 'selected' : ''}>Compact</option>
        <option value="medium" ${settings.fontSize === 'medium' ? 'selected' : ''}>Standard</option>
        <option value="large" ${settings.fontSize === 'large' ? 'selected' : ''}>Large Print</option>
      </select>
    </div>
    <div class="ToggleRow">
      <span>Auto-remove peer notes on placement</span>
      <input type="checkbox" id="setAutoClearNotes" ${settings.autoClearNotes ? 'checked' : ''} />
    </div>
    <div class="ToggleRow">
      <span>Highlight row, column & box peers</span>
      <input type="checkbox" id="setHighlightPeers" ${settings.highlightPeers ? 'checked' : ''} />
    </div>
    <div class="ToggleRow">
      <span>Highlight matching digits on board</span>
      <input type="checkbox" id="setHighlightSame" ${settings.highlightSameDigit ? 'checked' : ''} />
    </div>
    <div class="ToggleRow">
      <span>Show game clock</span>
      <input type="checkbox" id="setShowTimer" ${settings.showTimer ? 'checked' : ''} />
    </div>
    <div class="ToggleRow">
      <span>Sound effects (Web Audio)</span>
      <input type="checkbox" id="setSound" ${settings.soundEnabled ? 'checked' : ''} />
    </div>
    <div class="ToggleRow" style="border-bottom:0;">
      <span>Haptic vibration (Mobile)</span>
      <input type="checkbox" id="setHaptics" ${settings.hapticsEnabled ? 'checked' : ''} />
    </div>
  `;

  modal.classList.add('open');

  const bindChanges = () => {
    const next: UserSettings = {
      theme: (document.getElementById('setTheme') as HTMLSelectElement).value as ThemeMode,
      fontSize: (document.getElementById('setFontSize') as HTMLSelectElement).value as FontSize,
      autoClearNotes: (document.getElementById('setAutoClearNotes') as HTMLInputElement).checked,
      highlightPeers: (document.getElementById('setHighlightPeers') as HTMLInputElement).checked,
      highlightSameDigit: (document.getElementById('setHighlightSame') as HTMLInputElement).checked,
      showBlockedCells: settings.showBlockedCells,
      showTimer: (document.getElementById('setShowTimer') as HTMLInputElement).checked,
      soundEnabled: (document.getElementById('setSound') as HTMLInputElement).checked,
      hapticsEnabled: (document.getElementById('setHaptics') as HTMLInputElement).checked,
    };
    onUpdateSettings(next);
  };

  body.querySelectorAll('select, input').forEach((el) => {
    el.addEventListener('change', bindChanges);
  });
}

export function openHelpModal(): void {
  const modal = document.getElementById('helpModal');
  if (modal) modal.classList.add('open');
}
