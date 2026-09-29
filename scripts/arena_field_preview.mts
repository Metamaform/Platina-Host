/*
  Превью-скрипт «платформы взлёта» AICE ARENA (не часть приложения).
  Рендерит SVG-снапшоты полей в трёх состояниях (ставки / взлёт / победа)
  из реальной геометрии src/components/arena/arenaPlatform.ts.

  Запуск:  npx tsx scripts/arena_field_preview.mjs
  Вывод:   /tmp/arena_preview_{betting,drawing,completed}.svg
*/

import { buildPlatformLayout, ticketToFrac, SEGMENT_COLORS } from '../src/components/arena/arenaPlatform.js';
import { writeFileSync } from 'node:fs';

const W = 400, H = 190;
const DECK_W = 26;
const BALL = 34;

function mkParticipant(id, contribution, i, name) {
  return {
    id, userId: i + 1, username: name, betAmount: contribution,
    contribution, percentage: 0, status: 'ACTIVE', joinedAt: 0,
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function render(state: 'betting' | 'drawing' | 'completed') {
  const contributions = [25, 5, 60, 10];
  const names = ['alex', 'kirill', 'nastya', 'me'];
  const parts = contributions.map((c, i) => mkParticipant(`bet-${i}`, c, i, names[i]));
  const total = contributions.reduce((a, b) => a + b, 0);
  parts.forEach((p) => { p.percentage = (p.contribution / total) * 100; });

  const layout = buildPlatformLayout(W, H, parts);
  const { geo } = layout;

  let ticketFrac: number | null = null;
  let winnerIdx = -1;
  if (state === 'completed') {
    const ticket = 47.3; // roll * total: победитель — nastya (сегмент 2)
    ticketFrac = ticketToFrac(ticket, layout.sumC);
    let acc = 0;
    for (let i = 0; i < parts.length; i++) {
      acc += contributions[i];
      if (ticket < acc) { winnerIdx = i; break; }
    }
  }

  const rocket = state === 'betting' ? { x: W / 2, y: H / 2 } : state === 'drawing' ? { x: W / 2, y: H / 2 } : geo.pointAt(ticketFrac as number);

  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  // фон карточки
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="24" fill="#0c0d12"/>`);
  out.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="rgba(255,255,255,0.10)"/>`);

  // defs
  // палуба
  out.push(`<path d="${geo.d}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${DECK_W + 12}" stroke-linecap="round"/>`);
  out.push(`<path d="${geo.d}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1.5"/>`);

  // территории
  layout.segs.forEach((s) => {
    const isWinner = state === 'completed' && s.idx === winnerIdx;
    const dimmed = state === 'completed' && !isWinner;
    const op = dimmed ? 0.32 : 0.95;
    const glow = isWinner ? ` filter="url(#wglow)"` : '';
    out.push(`<path d="${geo.d}" fill="none" stroke="${s.color}" stroke-width="${DECK_W - 6}" stroke-linecap="butt" stroke-dasharray="${s.dashLen} ${geo.total}" stroke-dashoffset="${-s.dashStart}" opacity="${op}"${glow}/>`);
  });
  out.push(`<defs><filter id="wglow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="${SEGMENT_COLORS[2]}" flood-opacity="0.9"/>
  </filter></defs>`);

  // подписи (дублируем правила компонента)
  layout.segs.forEach((s) => {
    const name = s.participant.username || '';
    const showPct = s.lenPx >= 26;
    const showCard = s.lenPx >= 90;
    const side = s.mid.y > H * 0.52 ? 'above' : 'below';
    const lx = Math.max(34, Math.min(W - 34, s.mid.x));
    const topY = side === 'above' ? s.mid.y - DECK_W / 2 - 8 : s.mid.y + DECK_W / 2 + 8;
    const op = state === 'completed' && s.idx !== winnerIdx ? 0.45 : 1;
    if (showPct) {
      const txt = `${s.participant.percentage.toFixed(0)}%`;
      const bw = txt.length * 6.2 + 8;
      out.push(`<g opacity="${op}">
        <rect x="${s.mid.x - bw / 2}" y="${s.mid.y - 8}" width="${bw}" height="16" rx="4" fill="rgba(0,0,0,0.5)"/>
        <text x="${s.mid.x}" y="${s.mid.y + 3.5}" font-family="Arial" font-size="10" font-weight="900" fill="#fff" text-anchor="middle">${txt}</text>
      </g>`);
    }
    if (showCard) {
      const ly = side === 'above' ? topY : topY + 24;
      out.push(`<g opacity="${op}">
        <circle cx="${lx - (name.length * 4.6 + 8) / 2 + 11}" cy="${ly - 4}" r="11" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)"/>
        <text x="${lx - (name.length * 4.6 + 8) / 2 + 11}" y="${ly - 1}" font-family="Arial" font-size="10" font-weight="700" fill="rgba(255,255,255,0.9)" text-anchor="middle">${esc(name[0].toUpperCase())}</text>
        <text x="${lx - (name.length * 4.6 + 8) / 2 + 25}" y="${ly}" font-family="Arial" font-size="10" font-weight="700" fill="rgba(255,255,255,0.85)">${esc(name)}</text>
      </g>`);
    }
  });

  // метка билета + корона
  if (state === 'completed' && ticketFrac != null) {
    const tp = geo.pointAt(ticketFrac);
    const topY = Math.max(2, tp.y - 26);
    out.push(`<line x1="${tp.x}" y1="${topY}" x2="${tp.x}" y2="${topY + 52}" stroke="#fcd34d" stroke-width="2"/>`);
    out.push(`<rect x="${tp.x - 4}" y="${topY - 7}" width="8" height="8" fill="#fcd34d" transform="rotate(45 ${tp.x} ${topY - 3})"/>`);
    const crownY = Math.max(4, tp.y - DECK_W / 2 - 10);
    out.push(`<text x="${tp.x}" y="${crownY}" font-size="19" text-anchor="middle">👑</text>`);
  }

  // шарик (свечение + сфера + «полосы» вращение)
  const glowR = BALL * 1.2;
  out.push(`<defs><radialGradient id="ballGlow">
    <stop offset="0%" stop-color="rgba(79,195,255,0.5)"/>
    <stop offset="42%" stop-color="rgba(0,152,234,0.22)"/>
    <stop offset="70%" stop-color="transparent"/>
  </radialGradient>
  <radialGradient id="ballBody" cx="32%" cy="28%" r="75%">
    <stop offset="0%" stop-color="rgba(255,255,255,0.98)"/>
    <stop offset="22%" stop-color="rgba(190,235,255,0.95)"/>
    <stop offset="55%" stop-color="rgba(0,152,234,0.9)"/>
    <stop offset="100%" stop-color="rgba(6,38,74,0.95)"/>
  </radialGradient></defs>`);
  out.push(`<circle cx="${rocket.x}" cy="${rocket.y}" r="${glowR}" fill="url(#ballGlow)"/>`);
  out.push(`<circle cx="${rocket.x}" cy="${rocket.y}" r="${BALL / 2}" fill="url(#ballBody)" stroke="rgba(255,255,255,0.25)"/>`);
  const bAng = state === 'drawing' ? 35 : state === 'completed' ? 200 : 80;
  out.push(`<g transform="translate(${rocket.x}, ${rocket.y}) rotate(${bAng})">
    <path d="M ${-BALL * 0.32} ${-BALL * 0.08} Q 0 ${-BALL * 0.30} ${BALL * 0.32} ${-BALL * 0.08}" stroke="rgba(255,255,255,0.30)" stroke-width="3" fill="none"/>
    <path d="M ${-BALL * 0.30} ${BALL * 0.14} Q 0 ${BALL * 0.32} ${BALL * 0.30} ${BALL * 0.14}" stroke="rgba(255,255,255,0.22)" stroke-width="3" fill="none"/>
  </g>`);
  out.push(`<ellipse cx="${rocket.x - BALL * 0.16}" cy="${rocket.y - BALL * 0.18}" rx="${BALL * 0.16}" ry="${BALL * 0.11}" fill="rgba(255,255,255,0.9)"/>`);

  // статус (для контекста)
  const label = state === 'betting' ? 'ACCEPTING BETS' : state === 'drawing' ? 'DRAWING' : 'COMPLETED';
  out.push(`<rect x="12" y="12" width="112" height="20" rx="10" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>`);
  out.push(`<circle cx="24" cy="22" r="3" fill="${state === 'betting' ? '#4ade80' : state === 'drawing' ? '#67e8f9' : '#34d399'}"/>`);
  out.push(`<text x="34" y="26" font-family="Arial" font-size="9" font-weight="700" fill="rgba(255,255,255,0.7)">${label}</text>`);

  out.push('</svg>');
  return out.join('\n');
}

for (const state of ['betting', 'drawing', 'completed'] as const) {
  const svg = render(state);
  const file = `/tmp/arena_preview_${state}.svg`;
  writeFileSync(file, svg);
  console.log(file);
}
