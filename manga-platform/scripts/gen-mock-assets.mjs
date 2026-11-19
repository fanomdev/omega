/**
 * Generates original mock artwork (SVG) for offline/demo mode:
 *   public/mock/covers/<slug>.svg  — 8 invented series covers (2:3)
 *   public/mock/pages/page-<n>.svg — 8 ink-style manga pages
 * Run: node scripts/gen-mock-assets.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'mock');
mkdirSync(join(root, 'covers'), { recursive: true });
mkdirSync(join(root, 'pages'), { recursive: true });

const W = 1600, H = 2400;

const covers = [
  { slug: 'iron-sovereign', title: ['IRON', 'SOVEREIGN'], tag: 'DARK FANTASY · ACTION', c1: '#2b0a0e', c2: '#571313', glow: '#e5484d', accent: '#ffb3ab', emblem: 'sword' },
  { slug: 'moonlit-alchemist', title: ['MOONLIT', 'ALCHEMIST'], tag: 'FANTASY · MYSTERY', c1: '#120b29', c2: '#2c1b4d', glow: '#9d8df1', accent: '#e6defc', emblem: 'moon' },
  { slug: 'zero-hour-courier', title: ['ZERO HOUR', 'COURIER'], tag: 'CYBERPUNK · THRILLER', c1: '#021b21', c2: '#063a44', glow: '#21d4fd', accent: '#ffd479', emblem: 'bolt' },
  { slug: 'blade-ninth-heaven', title: ['BLADE OF THE', 'NINTH HEAVEN'], tag: 'SAMURA · REVENGE', c1: '#101010', c2: '#242428', glow: '#e5484d', accent: '#f5f0e6', emblem: 'katana' },
  { slug: 'tower-silent-stars', title: ['TOWER OF', 'SILENT STARS'], tag: 'ISEKAI · ASCENSION', c1: '#050d2b', c2: '#123063', glow: '#f5c15a', accent: '#cfe3ff', emblem: 'tower' },
  { slug: 'last-cartographer', title: ['THE LAST', 'CARTOGRAPHER'], tag: 'ADVENTURE · EXPEDITION', c1: '#04241c', c2: '#0d4a34', glow: '#3ddc97', accent: '#f3d9a4', emblem: 'compass' },
  { slug: 'ember-and-ash', title: ['EMBER', '& ASH'], tag: 'ROMANCE · SUPERNATURAL', c1: '#260b04', c2: '#59200c', glow: '#ff7a29', accent: '#ffd9b3', emblem: 'flame' },
  { slug: 'god-underground', title: ['GOD OF THE', 'UNDERGROUND'], tag: 'ACTION · AWAKENING', c1: '#1c1204', c2: '#3d2705', glow: '#e8b64c', accent: '#fff3c9', emblem: 'fist' },
];

// Original geometric emblems, drawn in a shared coordinate box.
const emblems = {
  sword: (g) => `<path d="M800 420 L860 1560 L800 1700 L740 1560 Z" fill="${g}" opacity="0.92"/><rect x="620" y="1560" width="360" height="46" rx="8" fill="${g}"/><rect x="778" y="1600" width="44" height="260" rx="10" fill="${g}"/><circle cx="800" cy="1920" r="34" fill="${g}"/>`,
  moon: (g) => `<path d="M1010 380 A560 560 0 1 0 1010 1340 A440 440 0 1 1 1010 380 Z" fill="${g}" opacity="0.95"/><circle cx="640" cy="560" r="16" fill="${g}" opacity="0.7"/><circle cx="560" cy="760" r="10" fill="${g}" opacity="0.5"/><circle cx="700" cy="900" r="8" fill="${g}" opacity="0.4"/>`,
  bolt: (g) => `<path d="M900 320 L560 1250 L780 1250 L660 2050 L1090 1060 L850 1060 L1080 320 Z" fill="${g}" opacity="0.95"/>`,
  katana: (g) => `<rect x="300" y="1820" width="1000" height="26" rx="13" transform="rotate(-24 800 1800)" fill="${g}" opacity="0.95"/><rect x="290" y="1760" width="220" height="60" rx="12" transform="rotate(-24 800 1800)" fill="${g}" opacity="0.75"/><path d="M1050 320 L1290 900 L1180 940 L950 380 Z" fill="${g}" opacity="0.55"/>`,
  tower: (g) => `<path d="M700 1900 L740 700 L800 560 L860 700 L900 1900 Z" fill="${g}" opacity="0.92"/><circle cx="800" cy="350" r="70" fill="${g}" opacity="0.9"/><path d="M620 1900 h360 v56 h-360 z" fill="${g}"/>`,
  compass: (g) => `<circle cx="800" cy="880" r="330" fill="none" stroke="${g}" stroke-width="34" opacity="0.92"/><path d="M930 750 L860 1010 L800 1060 L740 1010 L670 750 L800 810 Z" fill="${g}" opacity="0.9"/><circle cx="800" cy="880" r="26" fill="${g}"/>`,
  flame: (g) => `<path d="M800 320 C 980 640 1080 900 1080 1130 A280 280 0 0 1 520 1130 C 520 900 620 640 800 320 Z" fill="${g}" opacity="0.92"/><path d="M800 900 C 890 1080 910 1200 910 1300 A110 110 0 0 1 690 1300 C 690 1200 710 1080 800 900 Z" fill="#fff" opacity="0.35"/>`,
  fist: (g) => `<path d="M560 1100 V760 a70 70 0 0 1 140 0 V700 a70 70 0 0 1 140 0 V660 a70 70 0 0 1 140 0 V740 a70 70 0 0 1 140 0 V1150 a220 220 0 0 1 -220 220 H780 a220 220 0 0 1 -220 -220 Z" fill="${g}" opacity="0.92"/>`,
};

const titleBlock = (lines, accent) => {
  const maxLen = Math.max(...lines.map((l) => l.length));
  // Arial Black averages ~0.78em per glyph; keep lines inside the 1600-220px safe area
  const size = Math.max(92, Math.min(180, Math.floor(1280 / (maxLen * 0.78))));
  const startY = 1560;
  const lh = size * 0.92;
  return lines
    .map((ln, i) => `<text x="110" y="${startY + i * lh}" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="${size}" letter-spacing="2" fill="#f5f2ea" stroke="rgba(0,0,0,0.35)" stroke-width="3">${ln}</text>`)
    .join('\n')
    + `\n<rect x="110" y="${startY + lines.length * lh + 30}" width="260" height="14" fill="${accent}"/>`;
};

for (const c of covers) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.62" cy="0.34" r="0.75">
      <stop offset="0" stop-color="${c.glow}" stop-opacity="0.5"/><stop offset="0.55" stop-color="${c.glow}" stop-opacity="0.1"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.16"/></feComponentTransfer><feComposite operator="in" in2="SourceGraphic"/></filter>
    <linearGradient id="vign" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g opacity="0.9">${emblems[c.emblem](c.glow)}</g>
  <rect width="${W}" height="${H}" fill="url(#vign)"/>
  <text x="110" y="150" font-family="'Courier New',monospace" font-size="30" letter-spacing="10" fill="${c.accent}" opacity="0.9">${c.tag}</text>
  ${titleBlock(c.title, c.accent)}
  <rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="3"/>
  <rect width="${W}" height="${H}" fill="#fff" filter="url(#grain)" opacity="0.5"/>
</svg>`;
  writeFileSync(join(root, 'covers', `${c.slug}.svg`), svg);
}

// ---- ink-style pages: paper, panels, halftone, speedlines, silhouettes ----
const PW = 1240, PH = 1754;
const halftone = (id, cx, cy, spacing, r) =>
  `<pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><circle cx="${spacing / 2}" cy="${spacing / 2}" r="${r}" fill="#1a1a1a"/></pattern>`;

const pageLayouts = [
  // [panels as fractions of height, with internal silhouette type]
  { panels: [0.34, 0.36, 0.30], flip: false, word: 'ドゴォ…', scene: 'rooftop' },
  { panels: [0.5, 0.5], flip: true, word: '斬', scene: 'clash' },
  { panels: [0.28, 0.28, 0.44], flip: false, word: 'ゴゴゴ', scene: 'stare' },
  { panels: [0.4, 0.3, 0.3], flip: true, word: 'バキッ', scene: 'punch' },
  { panels: [0.6, 0.4], flip: false, word: 'ザァ…', scene: 'rain' },
  { panels: [0.25, 0.45, 0.3], flip: true, word: 'ドドド', scene: 'tower' },
  { panels: [0.45, 0.55], flip: false, word: 'ゴオオ…', scene: 'awaken' },
  { panels: [0.3, 0.35, 0.35], flip: true, word: 'ドン', scene: 'standoff' },
];

const silhouette = (scene, x, y, w, h, flip) => {
  const ink = '#151515';
  switch (scene) {
    case 'rooftop': return `<path d="M${x + w * 0.44} ${y + h * 0.28} a${w * 0.06} ${h * 0.075} 0 1 1 ${w * 0.001} 0 M${x + w * 0.40} ${y + h * 0.38} q${w * 0.1} -${h * 0.05} ${w * 0.2} 0 l${w * 0.03} ${h * 0.3} h-${w * 0.26} Z M${x + w * 0.40} ${y + h * 0.68} l-${w * 0.04} ${h * 0.3} h${w * 0.1} l${w * 0.03} -${h * 0.3} Z M${x + w * 0.585} ${y + h * 0.68} l${w * 0.04} ${h * 0.3} h-${w * 0.1} l-${w * 0.03} -${h * 0.3} Z" fill="${ink}"/><path d="M${x} ${y + h * 0.98} L${x + w} ${y + h * 0.98} L${x + w * 0.8} ${y + h * 0.78} L${x + w * 0.2} ${y + h * 0.78} Z" fill="${ink}" opacity="0.85"/>`;
    case 'clash': return `<path d="M${x + w * 0.15} ${y + h * 0.5} L${x + w * 0.45} ${y + h * 0.35} L${x + w * 0.5} ${y + h * 0.65} Z" fill="${ink}" opacity="0.9"/><path d="M${x + w * 0.85} ${y + h * 0.5} L${x + w * 0.55} ${y + h * 0.35} L${x + w * 0.5} ${y + h * 0.65} Z" fill="${ink}" opacity="0.9"/><path d="M${x + w * 0.2} ${y + h * 0.55} L${x + w * 0.8} ${y + h * 0.45}" stroke="#f2ede3" stroke-width="${h * 0.045}"/>`;
    case 'stare': return `<circle cx="${x + w * 0.5}" cy="${y + h * 0.4}" r="${w * 0.16}" fill="${ink}"/><rect x="${x + w * 0.34}" y="${y + h * 0.52}" width="${w * 0.32}" height="${h * 0.5}" fill="${ink}"/>`;
    case 'punch': return `<circle cx="${x + w * (flip ? 0.3 : 0.7)}" cy="${y + h * 0.45}" r="${w * 0.12}" fill="${ink}"/><rect x="${x + w * (flip ? 0.4 : 0.1)}" y="${y + h * 0.5}" width="${w * 0.5}" height="${h * 0.22}" transform="skewX(${flip ? 12 : -12})" fill="${ink}" opacity="0.9"/>`;
    case 'rain': return Array.from({ length: 40 }, (_, i) => { const px = x + ((i * 173) % 100) / 100 * w; return `<line x1="${px}" y1="${y}" x2="${px - w * 0.05}" y2="${y + h}" stroke="${ink}" stroke-width="2" opacity="0.35"/>`; }).join('') + `<path d="M${x + w * 0.5} ${y + h * 0.45} a${w * 0.05} ${h * 0.06} 0 1 1 1 0 M${x + w * 0.44} ${y + h * 0.55} q${w * 0.06} -${h * 0.03} ${w * 0.12} 0 l${w * 0.02} ${h * 0.4} h-${w * 0.16} Z" fill="${ink}"/>`;
    case 'tower': return `<path d="M${x + w * 0.42} ${y + h} L${x + w * 0.46} ${y + h * 0.2} L${x + w * 0.54} ${y + h * 0.2} L${x + w * 0.58} ${y + h} Z" fill="${ink}"/><circle cx="${x + w * 0.5}" cy="${y + h * 0.1}" r="${w * 0.05}" fill="${ink}"/>`;
    case 'awaken': return `<circle cx="${x + w * 0.5}" cy="${y + h * 0.4}" r="${w * 0.2}" fill="${ink}"/><path d="M${x + w * 0.5} ${y + h * 0.55} L${x + w * 0.38} ${y + h} L${x + w * 0.62} ${y + h} Z" fill="${ink}"/>` + Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; const cx = x + w * 0.5, cy = y + h * 0.4; return `<line x1="${cx + Math.cos(a) * w * 0.24}" y1="${cy + Math.sin(a) * w * 0.24}" x2="${cx + Math.cos(a) * w * 0.36}" y2="${cy + Math.sin(a) * w * 0.36}" stroke="${ink}" stroke-width="6"/>`; }).join('');
    case 'standoff': return `<rect x="${x + w * 0.1}" y="${y + h * 0.3}" width="${w * 0.24}" height="${h * 0.7}" fill="${ink}"/><rect x="${x + w * 0.66}" y="${y + h * 0.3}" width="${w * 0.24}" height="${h * 0.7}" fill="${ink}"/><line x1="${x + w * 0.34}" y1="${y + h * 0.62}" x2="${x + w * 0.66}" y2="${y + h * 0.62}" stroke="#f2ede3" stroke-width="${h * 0.02}"/>`;
    default: return '';
  }
};

pageLayouts.forEach((p, idx) => {
  const n = idx + 1;
  const total = p.panels.reduce((a, b) => a + b, 0);
  let y = 40;
  const gap = 26;
  const innerH = PH - 80 - gap * (p.panels.length - 1);
  const panels = p.panels.map((f, i) => {
    const h = (f / total) * innerH;
    const x = 40, w = PW - 80;
    const isLast = i === p.panels.length - 1;
    const s = `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f7f3e8" stroke="#111" stroke-width="6"/><rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" fill="url(#ht)" opacity="0.28"/>${silhouette(p.scene, x, y, w, h, p.flip)}${isLast ? `<text x="${x + w - 30}" y="${y + h - 26}" text-anchor="end" font-family="'Hiragino Mincho ProN','Yu Mincho',serif" font-weight="900" font-size="${h * 0.34}" fill="#111" opacity="0.92">${p.word}</text>` : ''}</g>`;
    y += h + gap;
    return s;
  }).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}">
  <defs>${halftone('ht', 0, 0, 14, 2.2)}</defs>
  <rect width="${PW}" height="${PH}" fill="#efe9dc"/>
  ${panels}
</svg>`;
  writeFileSync(join(root, 'pages', `page-${n}.svg`), svg);
});
console.log('mock assets written to', root);
