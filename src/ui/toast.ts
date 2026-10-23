import { SmartHint } from '../core/types';
import { icon } from './icons';

export function setBoardStatus(text: string): void {
  const el = document.getElementById('boardStatus');
  if (el) el.textContent = text;
}

export function showBannerMessage(text: string, type: 'good' | 'warn' | 'error' = 'warn'): void {
  const el = document.getElementById('message');
  if (!el) return;
  el.textContent = text;
  el.className = `message-box show ${type}`;
}

export function clearBannerMessage(): void {
  const el = document.getElementById('message');
  if (el) el.className = 'message-box';
}

export function renderHintBanner(hint: SmartHint | null, onApplyStage2: () => void): void {
  const el = document.getElementById('hintBanner');
  if (!el) return;
  if (!hint) {
    el.className = 'hint-banner';
    el.innerHTML = '';
    return;
  }

  el.className = 'hint-banner visible';
  el.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:8px;">
      <span style="color:var(--cell-hint-ring);margin-top:2px;">${icon('lightbulb', 16)}</span>
      <div><strong>${hint.technique}:</strong> ${hint.explanation}</div>
    </div>
    <button type="button" class="btn primary" id="applyHintStage2Btn" style="white-space:nowrap;">
      ${icon('check-circle', 14)} <span>Fill ${hint.digit}</span>
    </button>
  `;
  const btn = document.getElementById('applyHintStage2Btn');
  if (btn) {
    btn.addEventListener('click', onApplyStage2);
  }
}
