export type IconName =
  | 'calendar' | 'plus' | 'trophy' | 'settings' | 'help' | 'key' | 'close'
  | 'eraser' | 'pencil' | 'sparkles' | 'bolt' | 'undo' | 'redo' | 'play' | 'pause'
  | 'restart' | 'lightbulb' | 'check-circle' | 'share' | 'clock' | 'alert-triangle'
  | 'lock' | 'star-filled' | 'star-outline' | 'flame' | 'award-star' | 'brain-circuit'
  | 'target-crosshair' | 'speed-gauge' | 'pillar-shield' | 'calendar-check' | 'flame-streak' | 'crown-gem';

const paths: Record<IconName, string> = {
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trophy: '<path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4"/>',
  settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.6 9a2.5 2.5 0 1 1 4.2 1.8c-1.1 1-1.8 1.4-1.8 3M12 17h.01"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-4 4 3 3m-6-1 3 3"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  eraser: '<path d="m7 21-4-4a2 2 0 0 1 0-3l9-9 9 9-7 7H7Zm5-14 7 7M14 21h7"/>',
  pencil: '<path d="m4 20 4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Zm10-13 3 3"/>',
  sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 11 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM5 3l.8 2.2L8 6l-2.2.8L5 9l-.8-2.2L2 6l2.2-.8L5 3Z"/>',
  bolt: '<path d="m13 2-3 8H5l6 12 3-9h5L13 2Z"/>',
  undo: '<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-2"/>',
  redo: '<path d="m15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12h2"/>',
  play: '<path d="m8 5 12 7-12 7V5Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  restart: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8m0-5v5h5"/>',
  lightbulb: '<path d="M9 18h6m-5 4h4m-2-20a7 7 0 0 0-4 12.7c.6.4 1 1.3 1 2.3h6c0-1 .4-1.9 1-2.3A7 7 0 0 0 12 2Z"/>',
  'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m8 12 2.5 2.5L16 9"/>',
  share: '<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  'alert-triangle': '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2"/>',
  'star-filled': '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" fill="currentColor"/>',
  'star-outline': '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  flame: '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-2-1-3-3-3-5-2 2-4 5-4 9a7 7 0 0 0 7 7Zm0-2a3 3 0 0 1-3-3c0-1.5 1-2.5 2-4 .5 1.5 2 2 2 4a2 2 0 0 1-1 3Z"/>',
  'award-star': '<circle cx="12" cy="9" r="6"/><path d="m8 14-1 8 5-3 5 3-1-8m-4-9 1 2 2 .3-1.5 1.5L14 11l-2-1-2 1 .5-2.2L9 7.3l2-.3 1-2Z"/>',
  'brain-circuit': '<path d="M9 4a3 3 0 0 0-5 2 3 3 0 0 0 0 5 3 3 0 0 0 2 5 3 3 0 0 0 5 2V5a3 3 0 0 0-2-1Zm6 0a3 3 0 0 1 5 2 3 3 0 0 1 0 5 3 3 0 0 1-2 5 3 3 0 0 1-5 2V5a3 3 0 0 1 2-1ZM7 8h3m4 8h4M7 13h3m4-5h4"/>',
  'target-crosshair': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="m16 8 5-5m-4 0h4v4"/>',
  'speed-gauge': '<path d="M4 19a9 9 0 1 1 16 0M12 13l5-5m-5 11h.01M7 15l-1-1m12 1 1-1M12 4v2"/>',
  'pillar-shield': '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="M9 7h6m-5 0v10m4-10v10M8 17h8"/>',
  'calendar-check': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M14 16l2 2 4-4"/>',
  'flame-streak': '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-2-1-3-3-3-5-2 2-4 5-4 9a7 7 0 0 0 7 7Zm0-2a3 3 0 0 1-3-3c0-1.5 1-2.5 2-4 .5 1.5 2 2 2 4a2 2 0 0 1-1 3ZM2 4l3 1M2 8h2"/>',
  'crown-gem': '<path d="m2 8 5 4 5-8 5 8 5-4-2 12H4L2 8Z"/><path d="M4 16h16m-10-4 2-4 2 4-2 4-2-4Z"/>',
};

export function icon(name: IconName, size = 16, className = ''): string {
  const classes = ['ui-icon', className].filter(Boolean).join(' ');
  return `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

export function renderStarRating(stars: 1 | 2 | 3, size = 30): string {
  return `<span class="star-rating-row" aria-label="${stars} of 3 stars">${[1, 2, 3]
    .map((star) => icon(star <= stars ? 'star-filled' : 'star-outline', size))
    .join('')}</span>`;
}
