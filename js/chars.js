/* Personajes dibujados con código (estilo kawaii). Sale de elenco-castillo.html.
   Cada función dibuja con los pies en el origen (0,0); quien llama traslada y escala. */
(() => {
'use strict';
/* ---------- drawing helpers ---------- */
const INK = '#5b3220', DARK = '#33201c';
function ell(c, x, y, rx, ry, fill, lw, rot) {
  c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (lw !== 0) { c.lineWidth = lw || 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); }
}
function limb(c, x1, y1, x2, y2, w, col) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = INK; c.lineWidth = w + 6; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
}
function line(c, x1, y1, x2, y2, w) { c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function star(c, x, y, r, col) {
  c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
  c.closePath(); c.fillStyle = col; c.fill();
}
function heart(c, x, y, s, col) {
  c.beginPath(); c.moveTo(x, y + s * .5); c.bezierCurveTo(x + s * 1.1, y - s * .2, x + s * .55, y - s * 1.05, x, y - s * .4);
  c.bezierCurveTo(x - s * .55, y - s * 1.05, x - s * 1.1, y - s * .2, x, y + s * .5); c.closePath(); c.fillStyle = col; c.fill();
}
function bow(c, x, y, s, col) {
  ell(c, x - s * .95, y, s * .95, s * .66, col, 2.6, -.35); ell(c, x + s * .95, y, s * .95, s * .66, col, 2.6, .35); ell(c, x, y, s * .42, s * .46, col, 2.6);
}
function headPath(c, rx, ry) {
  c.beginPath(); c.moveTo(0, -ry);
  c.bezierCurveTo(rx * .6, -ry, rx, -ry * .55, rx, -ry * .02);
  c.bezierCurveTo(rx, ry * .5, rx * .66, ry * .86, 0, ry * .86);
  c.bezierCurveTo(-rx * .66, ry * .86, -rx, ry * .5, -rx, -ry * .02);
  c.bezierCurveTo(-rx, -ry * .55, -rx * .6, -ry, 0, -ry); c.closePath();
}
function head(c, rx, ry, skin) { headPath(c, rx, ry); c.fillStyle = skin; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); }
const ease = x => x * x * (3 - 2 * x);

/* looks: skin tone + hair, so every baby can be different */
const BABY_LOOKS = [
  { skin: '#ffdcb8', hair: 'curl',    col: '#8a5a2b' },
  { skin: '#7a3f1f', hair: 'bow',     col: '#3b2417', bow: '#ff9ec7' },
  { skin: '#d89a63', hair: 'topknot', col: '#2b1d1a', bow: '#ff9ec7' },
  { skin: '#f2bc8a', hair: 'bob',     col: '#3a2418', bow: '#ff9ec7' },
  { skin: '#8a4a26', hair: 'crop',    col: '#2b1d1a' }
];
const KID_LOOKS = [
  { skin: '#f2bc8a', hair: 'messy', col: '#3a2418' },
  { skin: '#7a3f1f', hair: 'curly', col: '#1f1512' },
  { skin: '#d89a63', hair: 'messy', col: '#2b1d1a' },
  { skin: '#ffdcb8', hair: 'messy', col: '#9a6a34' },
  { skin: '#8a4a26', hair: 'curly', col: '#2b1d1a' }
];

/* hair behind the head, then in front of it. Head-local coordinates (origin = head centre) */
function hairBack(c, L, rx, ry) {
  const h = L.hair, col = L.col;
  if (h === 'bow') { for (let i = 0; i < 7; i++) { const a = Math.PI * (1.08 + i * .14); ell(c, Math.cos(a) * rx * .98, Math.sin(a) * ry * .98, rx * .17, rx * .17, col, 2.8); } }
  else if (h === 'bob') ell(c, 0, ry * .1, rx * 1.17, ry * 1.04, col, 3);
  else if (h === 'topknot') {
    c.beginPath(); c.moveTo(-rx * .2, -ry * .9); c.quadraticCurveTo(-rx * .55, -ry * 1.55, -rx * .05, -ry * 1.7); c.quadraticCurveTo(rx * .5, -ry * 1.75, rx * .24, -ry * .9);
    c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
  } else if (h === 'messy') { ell(c, -rx * 1.0, ry * .22, rx * .2, ry * .3, col, 2.8); ell(c, rx * 1.0, ry * .22, rx * .2, ry * .3, col, 2.8); }
  else if (h === 'curly') { for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ell(c, s * rx * (.98 + i * .02), -ry * .1 + i * ry * .3, rx * .17, rx * .17, col, 2.8); }
}
function hairFront(c, L, rx, ry, kid) {
  const h = L.hair, col = L.col;
  c.save(); headPath(c, rx, ry); c.clip();
  if (h === 'bow' || h === 'topknot' || h === 'crop') {
    c.beginPath(); c.ellipse(0, -ry * 1.2, rx * 1.45, ry * .98, 0, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  } else if (h === 'bob') {
    c.fillStyle = col; c.fillRect(-rx, -ry, rx * 2, ry * .88);
    for (let i = 0; i < 5; i++) { const x = -rx * .8 + i * rx * .4; c.beginPath(); c.arc(x, -ry * .12, rx * .21, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = INK; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const x = -rx * .8 + i * rx * .4; c.beginPath(); c.arc(x, -ry * .12, rx * .21, .05 * Math.PI, .95 * Math.PI); c.stroke(); }
  } else if (h === 'messy' || h === 'curly') {
    const by = -ry * .22, n = h === 'curly' ? 6 : 5, rr = rx * (h === 'curly' ? .17 : .2);
    c.fillStyle = col; c.fillRect(-rx, -ry, rx * 2, ry + by);
    const xs = []; for (let i = 0; i < n; i++) xs.push(-rx * .82 + i * (rx * 1.64 / (n - 1)));
    for (const x of xs) { c.beginPath(); c.arc(x, by, rr, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = INK; c.lineWidth = 3; c.lineCap = 'round';
    for (const x of xs) { c.beginPath(); c.arc(x, by, rr, .05 * Math.PI, .95 * Math.PI); c.stroke(); }
  }
  c.restore();
  if (h === 'bob') for (const s of [-1, 1]) { c.beginPath(); c.roundRect(s > 0 ? rx * .72 : -rx * 1.0, -ry * .35, rx * .28, ry * .95, 7); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); }
  if (h === 'curl') { // single curl on top
    c.strokeStyle = INK; c.lineWidth = 2.8; c.lineCap = 'round'; c.beginPath();
    for (let a = 0; a < 9; a += .3) { const r = 1.2 + a * .85, x = -2 + Math.cos(a + 3.3) * r, y = -ry - 6 + Math.sin(a + 3.3) * r * .9 - a * .4; a ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
  }
  if (L.bow) { if (h === 'bow') bow(c, -rx * .4, -ry * 1.0, 8, L.bow); else if (h === 'bob') bow(c, -rx * .62, -ry * .72, 7.5, L.bow); else if (h === 'topknot') bow(c, rx * .02, -ry * .98, 7.5, L.bow); }
}

/* eyes: solid dark dots like the reference; s = -1 left, +1 right */
function eye(c, x, y, r, mode, look, s) {
  if (mode === 'open' || mode === 'angry') {
    ell(c, x, y, r * .82, r * 1.02, DARK, 0);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r * .22 + look * r * .15, y - r * .3, r * .26, 0, 7); c.fill();
    if (mode === 'angry') line(c, x + s * r * 1.25, y - r * 1.85, x - s * r * .75, y - r * 1.4, 3.2);
  } else if (mode === 'pain') {
    c.strokeStyle = DARK; c.lineWidth = 3.6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
    c.moveTo(x + s * r * .95, y - r * .95); c.lineTo(x - s * r * .65, y); c.lineTo(x + s * r * .95, y + r * .95); c.stroke();
  } else if (mode === 'happy') {
    c.strokeStyle = DARK; c.lineWidth = 3.6; c.lineCap = 'round'; c.beginPath(); c.arc(x, y + r * .4, r * .95, 1.12 * Math.PI, 1.88 * Math.PI); c.stroke();
  } else if (mode === 'sob') {
    c.strokeStyle = DARK; c.lineWidth = 3.6; c.lineCap = 'round'; c.beginPath(); c.arc(x, y - r * .25, r * .95, .12 * Math.PI, .88 * Math.PI); c.stroke();
    line(c, x + s * r * 1.15, y - r * 1.35, x - s * r * .8, y - r * 1.95, 3);
  }
}
function mouth(c, x, y, mode, k) {
  k = k || 1;
  if (mode === 'smile') { // small open smile with a pink tongue
    c.beginPath(); c.arc(x, y - 3 * k, 5.4 * k, 0, Math.PI); c.closePath(); c.fillStyle = '#d9556a'; c.fill(); c.lineWidth = 2.6; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
    ell(c, x, y + 1.6 * k, 3 * k, 1.9 * k, '#ff9aa8', 0);
  } else if (mode === 'laugh') {
    c.beginPath(); c.moveTo(x - 8 * k, y - 4 * k); c.quadraticCurveTo(x, y + 12 * k, x + 8 * k, y - 4 * k); c.closePath();
    c.fillStyle = '#d9556a'; c.fill(); c.lineWidth = 2.6; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
    ell(c, x, y + 3.6 * k, 3.8 * k, 2.4 * k, '#ff9aa8', 0);
  } else if (mode === 'grr') {
    c.strokeStyle = DARK; c.lineWidth = 2.8; c.lineCap = 'round'; c.beginPath(); c.arc(x, y + 5 * k, 5 * k, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 3.5 * k, y + 1 * k); c.lineTo(x - 1 * k, y + 1.4 * k); c.lineTo(x - 2.5 * k, y + 4.4 * k); c.closePath(); c.fill();
  } else if (mode === 'shout') {
    ell(c, x, y + 2 * k, 5.8 * k, 6.6 * k, '#d9556a', 2.6); ell(c, x, y + 6 * k, 3.4 * k, 2.2 * k, '#ff9aa8', 0);
  } else if (mode === 'wail') {
    ell(c, x, y + 3 * k, 8.8 * k, 9.8 * k, '#d9556a', 2.8); ell(c, x, y + 8 * k, 5.5 * k, 3.6 * k, '#ff9aa8', 0);
  } else if (mode === 'ow') {
    ell(c, x, y + 2 * k, 3.8 * k, 5.2 * k, '#d9556a', 2.6);
  }
}
function tears(c, t, ex, ey, hs) {
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const ph = (t * 1.5 + i / 4 + (s > 0 ? .13 : 0)) % 1;
    const x = ex * s + s * (3 + ph * 30 * hs), y = ey + ph * 12 + ph * ph * 44;
    c.globalAlpha = Math.min(1, (1 - ph) * 1.6); ell(c, x, y, 3.6, 5.2, '#7fd8ff', 2); c.globalAlpha = 1;
  }
}

/* ---------- kid (older, straw hat) ---------- */
function drawKid(c, t, state, P) {
  const L = P.look, skin = L.skin, hs = P.head, B = P.bounce;
  let bob = 0, hop = 0, tilt = 0, sx = 0, sy = 0, legA = 0, aL = .35, aR = .35, eyes = 'open', mth = 'smile', look = 0, shoot = 0, cheer = 0;
  const w = t * 8;
  if (state === 'idle') { bob = Math.sin(t * 2.2) * 1.6 * B; sy = Math.sin(t * 2.2) * .014 * B; look = Math.sin(t * .8); }
  else if (state === 'walk') { bob = Math.abs(Math.sin(w)) * 5 * B; tilt = Math.sin(w) * .05 * B; legA = Math.sin(w); aL = .35 + Math.sin(w) * .5; aR = .35 - Math.sin(w) * .5; look = 1; sx = Math.sin(w * 2) * .03 * B; sy = -sx; }
  else if (state === 'shoot') {
    const ph = (t % .6) / .6; shoot = ph; look = 1;
    const pull = ph < .12 ? ph / .12 : Math.max(0, 1 - (ph - .12) / .5);
    tilt = -pull * .09 * B; sx = -pull * .07 * B; sy = pull * .05 * B; aR = 1.55; aL = .5; bob = Math.sin(t * 5) * 1 * B; mth = 'laugh'; eyes = 'angry';
  }
  else if (state === 'cheer') { hop = Math.abs(Math.sin(t * 6)) * 24 * B; tilt = Math.sin(t * 6) * .05 * B; eyes = 'happy'; mth = 'laugh'; aL = 2.7 + Math.sin(t * 12) * .15; aR = 2.7 - Math.sin(t * 12) * .15; cheer = 1; legA = Math.sin(t * 12) * .3; }
  c.save();
  c.translate(0, -(bob + hop) / 1.6); c.rotate(tilt); c.scale(1 + sx, 1 - sy);
  for (const s of [-1, 1]) {
    const sw = legA * s * 7, lift = Math.max(0, legA * s) * 5;
    limb(c, s * 8, -27, s * 9 + sw, -4 - lift, 9.5, skin);
    ell(c, s * 9 + sw + s * 1.5, -3.5 - lift, 8, 4.4, skin, 2.6);
  }
  ell(c, 0, -47, 13, 12, skin, 3);
  c.beginPath(); c.roundRect(-16, -41, 32, 17, 8); c.fillStyle = '#f59a3b'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#fff3c9'; c.fillRect(-15, -34, 30, 3.5); // light stripe on the swim trunks
  const arm = (s, a, Ln) => { const sx0 = s * 13.5, sy0 = -50, hx = sx0 + s * Math.sin(a) * Ln, hy = sy0 + Math.cos(a) * Ln; limb(c, sx0, sy0, hx, hy, 8, skin); ell(c, hx, hy, 5.2, 5.2, skin, 2.6); return [hx, hy]; };
  arm(-1, aL, 19);
  const hand = arm(1, aR, 19);
  if (state === 'shoot') {
    const ph = shoot;
    if (ph < .12) ell(c, hand[0] + 4, hand[1] - 1, 5.4, 5.4, '#c79a5b', 2.6);
    else { const d = (ph - .12) / .88, bx = hand[0] + 6 + d * 110, by = hand[1] - 2 - Math.sin(d * Math.PI) * 10; c.globalAlpha = 1 - d * .8; ell(c, bx, by, 5.4, 5.4, '#c79a5b', 2.6); c.globalAlpha = 1; }
  }
  const rx = 30 * hs, ry = 27 * hs, hy = -54 - ry;
  c.save(); c.translate(0, hy);
  hairBack(c, L, rx, ry);
  ell(c, -rx * .97, 5, 5, 6.5, skin, 2.6); ell(c, rx * .97, 5, 5, 6.5, skin, 2.6);
  head(c, rx, ry, skin);
  hairFront(c, L, rx, ry, true);
  // straw hat
  ell(c, 0, -ry * .68, rx * 1.62, 8.5, '#f6d36b', 3);
  c.strokeStyle = 'rgba(130,85,20,.45)'; c.lineWidth = 1.6; c.lineCap = 'round';
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.ellipse(0, -ry * .68, rx * (1.62 - Math.abs(i) * .14 - .1), 8.5 - Math.abs(i) * .6, 0, .1 * Math.PI, .9 * Math.PI); c.stroke(); }
  c.beginPath(); c.ellipse(0, -ry * .68, rx * .94, ry * .8, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#fbe08a'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#2fa6a0'; c.fillRect(-rx * .93, -ry * .68 - 7, rx * 1.86, 6); c.lineWidth = 1.8; c.strokeStyle = INK; c.strokeRect(-rx * .93, -ry * .68 - 7, rx * 1.86, 6);
  // face
  const ex = rx * .44, er = 6.4 * Math.min(1.15, hs), ey = ry * .3;
  eye(c, -ex, ey, er, eyes, look * .9, -1); eye(c, ex, ey, er, eyes, look * .9, 1);
  ell(c, -rx * .78, ey + er * .95, 7, 4, 'rgba(255,110,130,.5)', 0); ell(c, rx * .78, ey + er * .95, 7, 4, 'rgba(255,110,130,.5)', 0);
  mouth(c, 0, ey + er * .5, mth, 1);
  c.restore();
  if (cheer) {
    c.save(); c.translate(0, hy - ry - 34); c.rotate(Math.sin(t * 8) * .15);
    c.beginPath(); c.moveTo(0, 12); c.lineTo(-13, -2); c.arc(0, -2, 13, Math.PI, 0); c.closePath(); c.fillStyle = '#ffb3c7'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 1.6; c.beginPath(); for (let i = -2; i <= 2; i++) { c.moveTo(0, 12); c.lineTo(i * 5, -13); } c.stroke();
    c.restore();
    for (let i = 0; i < 5; i++) {
      const ph = (t * .9 + i / 5) % 1, side = i % 2 ? 1 : -1, x = side * (rx * 1.3 + (i % 3) * 10) + Math.sin(ph * 6 + i) * 4, y = hy - ry * .3 - ph * 60;
      c.globalAlpha = Math.min(1, (1 - ph) * 1.8);
      if (i % 2) heart(c, x, y, 6 + (i % 3), '#ff7fa0'); else star(c, x, y, 7, '#ffe066');
      c.globalAlpha = 1;
    }
  }
  c.restore();
  return { flash: 0, hop: bob * .2 + hop };
}

/* ---------- babies ---------- */
const CFG = { normal: { s: 1, crawl: false }, crawl: { s: .92, crawl: true }, big: { s: 1.3, crawl: false } };
function drawBaby(c, t, type, state, P) {
  const cf = CFG[type], hs = P.head, B = P.bounce, L = P.look, skin = L.skin, crawl = cf.crawl;
  let bob = 0, hop = 0, tilt = 0, sx = 0, sy = 0, ox = 0, aL = 2, aR = 2, legA = 0, eyes = 'angry', mth = 'grr', flash = 0, cry = false, hitT = -1;
  const w = t * (crawl ? 9 : 6);
  if (state === 'walk') {
    bob = Math.abs(Math.sin(w)) * 5 * B; tilt = Math.sin(w) * .07 * B; legA = Math.sin(w);
    aR = 2 + Math.sin(w) * .28; aL = 2 - Math.sin(w) * .28; sx = Math.sin(w * 2) * .035 * B; sy = -sx;
  } else if (state === 'attack') {
    const c1 = (t * 2.2) % 1, c2 = (c1 + .5) % 1;
    const f = p => p < .35 ? 2.5 - 2.1 * ease(p / .35) : 0.4 + 2.1 * ease((p - .35) / .65);
    aR = f(c1); aL = f(c2); mth = 'shout';
    const slam = Math.max(0, 1 - Math.abs(c1 - .35) * 8) + Math.max(0, 1 - Math.abs(c2 - .35) * 8);
    sy = slam * .07 * B; sx = -sy; bob = -slam * 2 * B; tilt = Math.sin(t * 4.4 * Math.PI) * .04 * B; legA = Math.sin(t * 8) * .3;
  } else if (state === 'hit') {
    const cyc = t % 1.3; hitT = cyc;
    flash = cyc < .13 ? 1 - cyc / .13 : 0;
    const e = Math.exp(-cyc * 6.5);
    ox = -16 * e * B; sx = .2 * e * Math.cos(cyc * 26) * B; sy = -sx; tilt = -.14 * e * B;
    aL = aR = cyc < .8 ? .7 + e : 2; eyes = cyc < .8 ? 'pain' : 'angry'; mth = cyc < .8 ? 'ow' : 'grr';
  } else if (state === 'cry') {
    cry = true; hop = Math.abs(Math.sin(t * 7)) * 11 * B; tilt = Math.sin(t * 14) * .07 * B; sx = Math.sin(t * 14) * .035 * B; sy = -sx;
    aL = 2.75 + Math.sin(t * 14) * .3; aR = 2.75 - Math.sin(t * 14) * .3; eyes = 'sob'; mth = 'wail'; legA = Math.sin(t * 14) * .6;
  }
  c.save();
  c.translate(ox / 1.6, -(bob + hop) / 1.6); c.scale(cf.s, cf.s); c.rotate(tilt); c.scale(1 + sx, 1 - sy);
  const hipY = crawl ? -11 : -12;
  for (const s of [-1, 1]) {
    const sw = legA * s * 5, lift = Math.max(0, legA * s) * 4, fx = s * (crawl ? 15 : 9.5) + sw, fy = -3 - lift;
    limb(c, s * 8, hipY, fx, fy, 9, skin); ell(c, fx + s * 1.5, fy + .5, 7.2, 4.6, skin, 2.6);
  }
  const ty = crawl ? -24 : -27;
  ell(c, 0, ty, 10, 9, skin, 3);
  ell(c, 0, -14, 17, 11, '#fff', 3);
  c.fillStyle = '#ffd96b'; c.beginPath(); c.arc(11, -19, 2.6, 0, 7); c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke();
  if (type === 'big') {
    c.beginPath(); c.moveTo(-11, ty - 5); c.quadraticCurveTo(0, ty + 16, 11, ty - 5); c.closePath(); c.fillStyle = '#ff7a6d'; c.fill(); c.lineWidth = 2.8; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
    ell(c, 0, ty + 1, 2.8, 2.8, '#fff', 0);
  }
  const sy0 = ty - 3;
  const arm = (s, a, Ln) => {
    let hx, hy;
    if (crawl && state !== 'cry' && state !== 'hit') { const lf = Math.max(0, Math.sin(w + (s > 0 ? 0 : Math.PI))) * 5; hx = s * 22; hy = -4 - lf; }
    else { hx = s * 9 + s * Math.sin(a) * Ln; hy = sy0 + Math.cos(a) * Ln; }
    limb(c, s * 9, sy0, hx, hy, 8.5, skin); ell(c, hx, hy, 5.4, 5.4, skin, 2.6);
  };
  arm(-1, aL, 14); arm(1, aR, 14);
  const rx = 34 * hs, ry = 30 * hs, hy = (crawl ? -31 : -34) - ry;
  c.save(); c.translate(0, hy);
  hairBack(c, L, rx, ry);
  ell(c, -rx * .97, 7, 5.6, 7, skin, 2.6); ell(c, rx * .97, 7, 5.6, 7, skin, 2.6);
  head(c, rx, ry, skin);
  hairFront(c, L, rx, ry, false);
  const ex = rx * .46, er = 7 * Math.min(1.2, hs), ey = ry * .3;
  eye(c, -ex, ey, er, eyes, 0, -1); eye(c, ex, ey, er, eyes, 0, 1);
  ell(c, -rx * .8, ey + er * .95, 7.8, 4.4, 'rgba(255,110,140,.5)', 0); ell(c, rx * .8, ey + er * .95, 7.8, 4.4, 'rgba(255,110,140,.5)', 0);
  const my = ey + er * .45;
  if (type === 'crawl' && !cry && state !== 'attack') {
    ell(c, 0, my + 1, 7.5, 5.4, '#ff7fb0', 2.6); ell(c, 0, my + 7.5, 4.2, 4.2, null, 2.8); ell(c, 0, my + 1, 2.4, 2, '#fff', 0);
  } else mouth(c, 0, my, mth, 1);
  if (cry) tears(c, t, ex, ey + er * 1.05, hs);
  c.restore();
  if (hitT >= 0 && hitT < .6) {
    const d = hitT / .6;
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + .5; c.globalAlpha = 1 - d; star(c, Math.cos(a) * (rx * .9 + d * 26), hy + Math.sin(a) * (ry * .9 + d * 22), 7 - d * 3, '#ffe066'); c.globalAlpha = 1; }
  }
  c.restore();
  return { flash, hop: (bob + hop) * .5 };
}

window.Chars = { drawKid, drawBaby, BABY_LOOKS, KID_LOOKS };
})();
