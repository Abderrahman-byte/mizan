/* Minimal stroke icon set, ported from the Bloom prototype's icons.js.
   Each entry is the inner markup of a 24x24 stroke SVG. `IconName` is the
   single source of truth for which icons exist across the app. */

const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-5h5v5"/>',
  cart: '<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2 3h3l2.2 11.5h10L20 7H6.5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  wifi: '<path d="M2 8.5C8 3.5 16 3.5 22 8.5"/><path d="M5.5 12.5c4-3.2 9-3.2 13 0"/><path d="M9 16.3c2-1.5 4-1.5 6 0"/><circle cx="12" cy="20" r="0.6"/>',
  car: '<path d="M3 13l1.8-5A2 2 0 0 1 6.7 6.7h10.6A2 2 0 0 1 19.2 8L21 13"/><path d="M3 13h18v4H3z"/><circle cx="7" cy="17.5" r="1.3"/><circle cx="17" cy="17.5" r="1.3"/>',
  heart: '<path d="M12 20s-7-4.6-9.3-9C1 7.5 3 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3 0 5 3 3.3 6.5C19 15.4 12 20 12 20Z"/>',
  fork: '<path d="M6 3v7a2 2 0 0 0 4 0V3"/><path d="M8 11v10"/><path d="M16 3c-1.5 0-2.5 2-2.5 4.5S15 12 16 12s2.5-2 2.5-4.5S17.5 3 16 3Z"/><path d="M16 12v9"/>',
  cup: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h2.2a2 2 0 0 1 0 4H17"/><path d="M7 3.5v1.5M11 3v2"/>',
  smoke: '<rect x="3" y="13" width="15" height="5" rx="1"/><path d="M14 13v5M21 13v5"/><path d="M15 9c1.5-.7 1.5-2.3 0-3"/>',
  dumbbell: '<path d="M6.5 7.5v9M3.5 9.5v5M17.5 7.5v9M20.5 9.5v5M6.5 12h11"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  shirt: '<path d="M8 3 4 6l2 3 2-1.2V21h8V7.8L18 9l2-3-4-3-2 2H10L8 3Z"/>',
  play: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M10 9l5 3-5 3V9Z"/>',
  piggy: '<path d="M16 8.5c2.5.7 4 2.7 4 5 0 3-3 5-7 5s-7-2-7-5c0-1.7 1-3.2 2.6-4.2"/><path d="M9 8.6A5 5 0 0 1 16 8.5"/><path d="M5.5 13.5C4 13.2 3.5 12 3.7 11"/><path d="M7 18.5V20M15 18.5V20"/><circle cx="16.5" cy="12.5" r="0.6"/>',
  home2: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  ledger: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
  handshake: '<path d="M3 12l3-3 4 3 2-2 4 2 3-3"/><path d="M3 12v3l5 4 2-1 2 1 5-4v-3"/><path d="M10 10 8 8"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevD: '<path d="M5 9l7 7 7-7"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDn: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  arrowOut: '<path d="M7 17 17 7M9 7h8v8"/>',
  arrowIn: '<path d="M17 7 7 17M15 17H7V9"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M14 6l4 4"/>',
  check: '<path d="M5 12l4.5 4.5L19 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  flame: '<path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .4-1.8 1-2.5C8 10 8 8 9 6c.5 2 2 2.5 3-3Z"/>',
  leaf: '<path d="M20 4C9 4 4 9 4 18c0 0 0 2 0 2 6 0 16-3 16-16Z"/><path d="M4 20C9 14 14 11 18 9"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 9h18"/><circle cx="17" cy="13" r="1.2"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8"/>',
  trend: '<path d="M3 17l5-5 4 3 7-8"/><path d="M19 7h-3M19 7v3"/>',
  chart: '<rect x="4" y="13" width="4" height="7" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>',
  cog: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M19.07 4.93l-1.77 1.77M6.7 17.3l-1.77 1.77M19.07 19.07l-1.77-1.77M6.7 6.7 4.93 4.93"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** Returns the full SVG markup for an icon, sized via CSS (width/height 100%). */
export function iconSvg(name: IconName): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[];
