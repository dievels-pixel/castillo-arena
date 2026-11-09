(() => {
'use strict';
const $ = id => document.getElementById(id);
const stage = $('stage'), slot = $('slot'), host = $('gl');
const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
host.appendChild(cv);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = v => v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

/* ---------- world constants. Everything is drawn and simulated in "beach pixels" (360x640); 20 px = 1 m.
   View: fixed top-down tilted camera; a thing's height above the sand is drawn upwards (y - h). ---------- */
const W = 360, H = 640;
const CX = 180, CY = 440, CR = 62;        // castle centre and its attack radius
const WALL_R = 112, HOLE_R = 84;          // wall arc radius and friends' holes radius
const SEA_Y = 56;                         // shoreline

/* ---------- canvas sizing ---------- */
let scale = 1, PX = 1;
function fit() {
  const aw = slot.clientWidth, ah = slot.clientHeight - 16;
  scale = Math.max(0.3, Math.min(aw / W, ah / H));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  PX = scale * dpr;
  stage.style.width = W * scale + 'px';
  stage.style.height = H * scale + 'px';
  stage.style.fontSize = 10 * scale + 'px';
  cv.width = Math.round(W * PX); cv.height = Math.round(H * PX);
  cv.style.width = W * scale + 'px'; cv.style.height = H * scale + 'px';
  buildBg();
}

/* ---------- drawing helpers ---------- */
function ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
function rr(t, x, y, w, h, r) { t.beginPath(); t.moveTo(x + r, y); t.arcTo(x + w, y, x + w, y + h, r); t.arcTo(x + w, y + h, x, y + h, r); t.arcTo(x, y + h, x, y, r); t.arcTo(x, y, x + w, y, r); t.closePath(); }
const tintCache = new Map();
function tint(hex, f) {            // mix a colour towards white (hit flash)
  const q = Math.round(clamp(f, 0, 1) * 6); if (!q) return hex;
  const k = hex + q; let v = tintCache.get(k);
  if (!v) {
    const n = parseInt(hex.slice(1), 16), m = q / 6 * .75, c = [n >> 16, (n >> 8) & 255, n & 255].map(x => Math.round(x + (255 - x) * m));
    v = 'rgb(' + c.join(',') + ')'; tintCache.set(k, v);
  }
  return v;
}
function shellIcon(x, y, s, spin) {
  ctx.save(); ctx.translate(x, y); ctx.scale(spin === undefined ? 1 : .55 + .45 * Math.abs(Math.cos(spin)), 1);
  ctx.beginPath(); ctx.moveTo(0, s * .95); ctx.lineTo(-s * .9, -s * .05); ctx.arc(0, -s * .05, s * .9, Math.PI, 0); ctx.closePath();
  ctx.fillStyle = '#f7a8ba'; ctx.fill(); ctx.lineWidth = s * .16; ctx.strokeStyle = '#b85a76'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, s * .95); ctx.lineTo(-s * .4, -s * .75); ctx.moveTo(0, s * .95); ctx.lineTo(0, -s * .9); ctx.moveTo(0, s * .95); ctx.lineTo(s * .4, -s * .75);
  ctx.lineWidth = s * .11; ctx.stroke(); ctx.restore();
}
function conchIcon(x, y, s, spin) {
  ctx.save(); ctx.translate(x, y); ctx.scale(.6 + .4 * Math.abs(Math.cos(spin)), 1);
  ctx.beginPath(); ctx.moveTo(-s, s * .2); ctx.quadraticCurveTo(-s * .2, -s * 1.1, s * 1.1, -s * .2); ctx.quadraticCurveTo(s * .4, s * .9, -s, s * .2);
  ctx.fillStyle = '#f5cf9a'; ctx.fill(); ctx.lineWidth = s * .15; ctx.strokeStyle = '#b98a4a'; ctx.stroke();
  ctx.beginPath(); ctx.arc(-s * .2, -s * .05, s * .38, 0, Math.PI * 1.5); ctx.lineWidth = s * .12; ctx.stroke();
  ctx.restore();
}

/* ---------- static background (sand, rocks, holes) pre-drawn once per resize ---------- */
const bg = document.createElement('canvas'), bgx = bg.getContext('2d');
const holes = [];
for (let j = 0; j < 6; j++) {
  const a = -Math.PI + (j + .5) * Math.PI / 6;
  holes.push({ x: CX + Math.cos(a) * HOLE_R, y: CY + Math.sin(a) * HOLE_R });
}
function buildBg() {
  bg.width = cv.width; bg.height = cv.height;
  const t = bgx; t.setTransform(PX, 0, 0, PX, 0, 0);
  t.fillStyle = '#27b3c7'; t.fillRect(0, 0, W, SEA_Y);
  const g = t.createLinearGradient(0, SEA_Y - 8, 0, H); g.addColorStop(0, '#c9a869'); g.addColorStop(.06, '#e6cb8e'); g.addColorStop(1, '#f1dba6');
  t.fillStyle = g; t.fillRect(0, SEA_Y - 8, W, H);
  let s = 20261109; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 1500; i++) {
    t.fillStyle = r() < .5 ? 'rgba(150,110,50,.16)' : 'rgba(255,248,222,.45)';
    t.beginPath(); t.arc(r() * W, SEA_Y + r() * (H - SEA_Y), .4 + r() * .8, 0, TAU); t.fill();
  }
  const rocks = [[30, 130, 1], [330, 150, 0], [20, 300, 2], [345, 330, 1], [100, 190, 0], [270, 240, 2], [25, 470, 1], [340, 470, 0]];
  rocks.forEach(([x, y, k]) => {
    const z = 6 + k * 2.5;
    t.fillStyle = 'rgba(90,60,20,.2)'; t.beginPath(); t.ellipse(x + 1, y + 1, z * 1.3, z * .5, 0, 0, TAU); t.fill();
    t.fillStyle = k % 2 ? '#8f8372' : '#a99a86';
    t.beginPath(); t.moveTo(x - z * 1.2, y); t.lineTo(x - z * .7, y - z * .9); t.lineTo(x + z * .3, y - z * 1.1); t.lineTo(x + z * 1.2, y - z * .3); t.lineTo(x + z, y + z * .2); t.lineTo(x - z * .6, y + z * .3); t.closePath(); t.fill();
    t.fillStyle = 'rgba(255,255,255,.22)'; t.beginPath(); t.moveTo(x - z * .7, y - z * .9); t.lineTo(x + z * .3, y - z * 1.1); t.lineTo(x - z * .1, y - z * .4); t.closePath(); t.fill();
  });
  holes.forEach(h => {
    t.fillStyle = '#c99d55'; t.beginPath(); t.ellipse(h.x, h.y + 1, 14, 7.5, 0, 0, TAU); t.fill();
    t.fillStyle = '#4f3718'; t.beginPath(); t.ellipse(h.x, h.y, 10.5, 5.5, 0, 0, TAU); t.fill();
  });
  // castle mound
  t.fillStyle = '#d6ae66'; t.beginPath(); t.ellipse(CX, CY + 4, 92, 30, 0, 0, TAU); t.fill();
}
function drawSea(now) {
  const wv = Math.sin(now * 1.4) * 4, y0 = SEA_Y + wv;
  const g = ctx.createLinearGradient(0, 0, 0, y0); g.addColorStop(0, '#138aa3'); g.addColorStop(1, '#2fc0d2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, y0);
  for (let k = 0; k < 2; k++) {
    const ph = now * 2 + k * 1.7, yy = y0 - k * 7;
    ctx.beginPath(); ctx.moveTo(0, yy - 3);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, yy + Math.sin(x * .05 + ph) * 2);
    for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, yy - 3 + Math.sin(x * .05 + ph + 1) * 1.5);
    ctx.closePath(); ctx.fillStyle = k ? 'rgba(243,251,247,.45)' : 'rgba(243,251,247,.85)'; ctx.fill();
  }
}

/* ---------- castle ---------- */
const SAND = '#e8c680', SAND_L = '#f3dba5', SAND_D = '#cfa45c', WOOD = '#6f4b20';
function flag(x, y, col, now, i) {
  ctx.strokeStyle = WOOD; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 20); ctx.stroke();
  const w = Math.sin(now * 5 + i) * 3;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.quadraticCurveTo(x + 8, y - 19 + w, x + 15, y - 16 + w * 1.3); ctx.quadraticCurveTo(x + 8, y - 13 + w, x, y - 12); ctx.closePath(); ctx.fill();
}
function tower(x, base, h, r) {
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0); g.addColorStop(0, SAND_D); g.addColorStop(.45, SAND); g.addColorStop(1, '#d9b06a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - r, base - h); ctx.lineTo(x - r, base); ctx.ellipse(x, base, r, r * .35, 0, Math.PI, 0, true); ctx.lineTo(x + r, base - h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = SAND_L; ell(x, base - h, r, r * .35); ctx.fill();
  for (let k = 0; k < 5; k++) { const a = Math.PI + k / 4 * Math.PI; ctx.fillStyle = k % 2 ? SAND : SAND_D; ctx.fillRect(x + Math.cos(a) * r * .82 - 3, base - h + Math.sin(a) * r * .3 - 6, 6, 6); }
  for (let k = 0; k < 3; k++) { const xx = x - r * .7 + k * r * .7; ctx.fillStyle = SAND; ctx.fillRect(xx - 3, base - h + r * .3 - 5, 6, 6); }
  ctx.fillStyle = WOOD; rr(ctx, x - 2.5, base - h * .62, 5, 9, 2.5); ctx.fill();
}
function drawCastle(now) {
  const hf = clamp(S.hp / 100, 0, 1), k = .72 + .28 * hf, sx = S.shake > 0 ? Math.sin(now * 90) * S.shake * 10 : 0;
  ctx.save(); ctx.translate(CX + sx, CY); ctx.scale(1, k);
  // keep (back)
  ctx.fillStyle = SAND_D; ctx.fillRect(-20, -66, 40, 54);
  ctx.fillStyle = SAND; ctx.fillRect(-20, -66, 37, 54);
  ctx.fillStyle = SAND_L; ctx.fillRect(-20, -72, 40, 7);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = SAND; ctx.fillRect(-18 + i * 14, -78, 8, 7); }
  ctx.fillStyle = WOOD; rr(ctx, -3, -54, 6, 11, 3); ctx.fill();
  flag(0, -76, '#ff5d4a', now, 0);
  // side towers
  tower(-60, 6, 58, 17); tower(60, 6, 58, 17);
  flag(-60, -58, '#ffd23f', now, 1); flag(60, -58, '#2c6fe0', now, 2);
  // front wall
  ctx.fillStyle = SAND_D; ctx.fillRect(-45, -12, 90, 30);
  ctx.fillStyle = SAND; ctx.fillRect(-45, -12, 90, 27);
  ctx.fillStyle = SAND_L; ctx.fillRect(-45, -18, 90, 7);
  for (let i = 0; i < 5; i++) { ctx.fillStyle = SAND; ctx.fillRect(-43 + i * 19, -24, 10, 7); }
  ctx.fillStyle = WOOD; ctx.beginPath(); ctx.moveTo(-9, 18); ctx.lineTo(-9, 4); ctx.arc(0, 4, 9, Math.PI, 0); ctx.lineTo(9, 18); ctx.closePath(); ctx.fill();
  shellIcon(-28, 3, 4); shellIcon(28, 3, 4);
  ctx.restore();
}

/* ---------- wall segments (built from the pad) ---------- */
const walls = [];
for (let i = 0; i < 5; i++) walls.push({ a: -Math.PI + (i + .5) * Math.PI / 5, built: false, hp: 0, shake: 0 });
const WALL_ORDER = [2, 1, 3, 0, 4];
const WALL_COST = [15, 22, 30, 40, 52];
const FRIEND_COST = [20, 30, 45, 65, 90, 120];
const wallMax = () => 60 + 40 * S.wallLvl;
function drawWall(w, now) {
  const a0 = w.a - Math.PI / 10 + .035, a1 = w.a + Math.PI / 10 - .035, ri = WALL_R - 8, ro = WALL_R + 8;
  if (!w.built || w.hp <= 0) {
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.arc(CX, CY, ro, a0, a1); ctx.arc(CX, CY, ri, a1, a0, true); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    return;
  }
  const f = clamp(w.hp / wallMax(), 0, 1), h = 18 * (.55 + .45 * f), sx = w.shake > 0 ? Math.sin(now * 80) * w.shake * 6 : 0;
  ctx.save(); ctx.translate(sx, 0);
  ctx.fillStyle = 'rgba(90,60,20,.18)'; ctx.beginPath(); ctx.arc(CX, CY + 3, ro, a0, a1); ctx.arc(CX, CY + 3, ri, a1, a0, true); ctx.closePath(); ctx.fill();
  ctx.fillStyle = SAND_D; ctx.beginPath(); ctx.arc(CX, CY, ri, a0, a1); ctx.arc(CX, CY - h, ri, a1, a0, true); ctx.closePath(); ctx.fill();
  ctx.fillStyle = SAND_L; ctx.beginPath(); ctx.arc(CX, CY - h, ro, a0, a1); ctx.arc(CX, CY - h, ri, a1, a0, true); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 3; k++) {
    const a = a0 + (k + .5) * (a1 - a0) / 3, x = CX + Math.cos(a) * WALL_R, y = CY - h + Math.sin(a) * WALL_R;
    ctx.fillStyle = SAND; ctx.fillRect(x - 4, y - 6, 8, 6); ctx.fillStyle = SAND_L; ctx.fillRect(x - 4, y - 8, 8, 2.5);
  }
  ctx.restore();
}

/* ---------- characters ---------- */
// The kid (and friends): older child, three-quarter view, faces left or right.
function drawKid(x, y, o) {
  const s = o.s || 1, dir = Math.cos(o.aim) >= 0 ? 1 : -1, w = o.moving ? Math.sin(o.walk * 13) : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  const sk = o.skin, skD = o.skinD;
  // legs
  ctx.fillStyle = skD; rr(ctx, -5 - w * 2.5, -16, 4.5, 16, 2.2); ctx.fill();
  ctx.fillStyle = sk; rr(ctx, 0.5 + w * 2.5, -16, 4.5, 16, 2.2); ctx.fill();
  // back arm
  ctx.save(); ctx.translate(-5, -31); ctx.rotate(.3 - w * .5); ctx.fillStyle = skD; rr(ctx, -1.8, 0, 3.6, 12, 1.8); ctx.fill(); ctx.restore();
  // body
  ctx.fillStyle = sk; rr(ctx, -6, -33, 12, 15, 5); ctx.fill();
  ctx.fillStyle = o.trunk; rr(ctx, -6.5, -20, 13, 8, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-6.5, -17, 13, 1.5);
  // head
  ctx.fillStyle = sk; ell(1, -40, 7.5, 7.5); ctx.fill();
  ctx.fillStyle = skD; ell(-5.5, -39.5, 1.8, 2.4); ctx.fill();
  ctx.fillStyle = '#3b2814'; ell(3, -40.5, 1.1, 1.5); ctx.fill(); ell(7, -40.5, .9, 1.4); ctx.fill();
  ctx.strokeStyle = '#8a4a2c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(4.5, -37.6, 2, .2, Math.PI - .2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,120,.4)'; ell(7, -37.5, 1.6, 1); ctx.fill();
  // hat
  if (o.hat === 'straw') {
    ctx.fillStyle = '#e9c46a'; ell(0.5, -45.5, 13, 3.6); ctx.fill(); ctx.strokeStyle = '#c49a3c'; ctx.lineWidth = .8; ctx.stroke();
    ctx.fillStyle = '#efcf7c'; ctx.beginPath(); ctx.ellipse(0.5, -46, 7, 6, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e0453f'; ctx.fillRect(-6.5, -48, 14, 2);
  } else {
    ctx.fillStyle = o.hat; ctx.beginPath(); ctx.ellipse(1, -44, 8, 6.5, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ell(5, -44, 7, 1.8); ctx.fill();
  }
  // throwing arm
  const ang = o.kick > 0 ? -(1.2 + o.kick / .1 * 1.4) : -.3 + w * .3;   // 0 = hanging down, negative = forwards
  ctx.save(); ctx.translate(4.5, -31); ctx.rotate(ang); ctx.fillStyle = sk; rr(ctx, -1.8, 0, 3.6, 12, 1.8); ctx.fill();
  if (o.kick <= .04) { ctx.fillStyle = '#b78a4b'; ell(0, 13, 3, 3); ctx.fill(); }
  ctx.restore();
  ctx.restore();
}

const SKINS = ['#ffdcc2', '#f6c7a1', '#e0a878', '#b9784c', '#8a5634'];
const HAIRS = ['#3b2814', '#6b3e1f', '#c8642b', '#e9c46a', '#1f1a17'];
// Babies: kawaii, no hat, head a bit flat underneath, mouth set between the eyes.
function drawBaby(b) {
  const crawl = b.type === 'crawl', cry = b.state === 'cry', sc = b.type === 'big' ? 1.45 : crawl ? .95 : 1;
  const rate = cry ? 22 : (crawl ? 16 : 9), sw = Math.sin(b.t * rate), bob = Math.abs(sw) * 1.5;
  const f = b.flash > 0 ? b.flash / .12 : 0, sk = tint(b.skin, f), skD = tint(b.skinD, f), dia = tint('#ffffff', f);
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(sc, sc); ctx.rotate(sw * (cry ? .08 : .05));
  let cy;
  if (crawl) {
    ctx.fillStyle = dia; ell(0, -15 - bob * .5, 7, 5.5); ctx.fill(); ctx.strokeStyle = '#e1e1e1'; ctx.lineWidth = .8; ctx.stroke();
    ctx.fillStyle = skD; ell(-6, -2 + sw * 1.2, 2.6, 2); ctx.fill(); ell(6, -2 - sw * 1.2, 2.6, 2); ctx.fill();
    cy = -12 - bob;
  } else {
    ctx.fillStyle = skD; ell(-4 + sw * 1.4, -1.5, 3.2, 2); ctx.fill(); ell(4 - sw * 1.4, -1.5, 3.2, 2); ctx.fill();
    ctx.fillStyle = sk; ell(0, -11 - bob, 6, 5); ctx.fill();
    ctx.fillStyle = dia; ell(0, -6 - bob * .5, 7.5, 5); ctx.fill(); ctx.strokeStyle = '#e1e1e1'; ctx.lineWidth = .8; ctx.stroke();
    ctx.fillStyle = sk;
    if (cry) { ell(-7, -18 - bob, 2.2, 4.2, .5); ctx.fill(); ell(7, -18 - bob, 2.2, 4.2, -.5); ctx.fill(); }
    else { ell(-7, -10 - bob + sw * 1.5, 2.2, 4, .25); ctx.fill(); ell(7, -10 - bob - sw * 1.5, 2.2, 4, -.25); ctx.fill(); }
    cy = -22 - bob;
  }
  // head: round on top, flatter underneath
  ctx.beginPath(); ctx.ellipse(0, cy, 10, 9, 0, Math.PI, TAU); ctx.ellipse(0, cy, 10, 6.5, 0, 0, Math.PI);
  ctx.fillStyle = sk; ctx.fill(); ctx.strokeStyle = skD; ctx.lineWidth = .7; ctx.stroke();
  // hair
  const hc = tint(b.hairC, f);
  ctx.fillStyle = hc; ctx.strokeStyle = hc;
  if (b.hair === 0) { ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, cy - 8.5); ctx.quadraticCurveTo(-1, cy - 14, 3, cy - 13.5); ctx.quadraticCurveTo(5, cy - 11, 2.2, cy - 10.6); ctx.stroke(); }
  else if (b.hair === 1) { for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 3 - 2, cy - 8.2); ctx.lineTo(k * 3.6, cy - 13 + Math.abs(k)); ctx.lineTo(k * 3 + 2, cy - 8.2); ctx.closePath(); ctx.fill(); } }
  else if (b.hair === 2) { ell(-9.5, cy - 5, 2.8, 2.8); ctx.fill(); ell(9.5, cy - 5, 2.8, 2.8); ctx.fill(); ctx.fillStyle = tint('#ff7aa2', f); ell(-7.8, cy - 6.5, 1.6, 1.1); ctx.fill(); ell(7.8, cy - 6.5, 1.6, 1.1); ctx.fill(); }
  else { ctx.beginPath(); ctx.ellipse(0, cy, 10, 9, 0, Math.PI, TAU); for (let x = 10; x >= -10; x -= 4) ctx.lineTo(x, cy - 4 + ((x / 4) % 2 ? 1.5 : 0)); ctx.closePath(); ctx.fill(); }
  // face: eyes wide apart, mouth between them
  if (cry) {
    ctx.strokeStyle = '#3b2814'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, cy - .5); ctx.lineTo(-4.5, cy + .8); ctx.lineTo(-7, cy + 2); ctx.moveTo(7, cy - .5); ctx.lineTo(4.5, cy + .8); ctx.lineTo(7, cy + 2); ctx.stroke();
    ctx.fillStyle = '#8a2d3b'; ell(0, cy + 2.2, 2.4, 2.8); ctx.fill(); ctx.fillStyle = '#ff8a9a'; ell(0, cy + 3.6, 1.4, .9); ctx.fill();
    ctx.fillStyle = '#6fd3ff';
    for (let i = 0; i < 4; i++) { const ph = (b.cryT * 1.6 + i * .25) % 1, sd = i % 2 ? 1 : -1; ell(sd * (7 + ph * 4), cy + 2 + ph * 10, 1.1, 1.6); ctx.fill(); }
  } else {
    ctx.fillStyle = '#2b1d10'; ell(-5.2, cy + .6, 1.5, 2); ctx.fill(); ell(5.2, cy + .6, 1.5, 2); ctx.fill();
    ctx.fillStyle = '#fff'; ell(-4.7, cy - .1, .55, .55); ctx.fill(); ell(5.7, cy - .1, .55, .55); ctx.fill();
    ctx.strokeStyle = '#c2405a'; ctx.lineWidth = .9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-.8, cy + 1.4, .8, .2, Math.PI - .2); ctx.arc(.8, cy + 1.4, .8, .2, Math.PI - .2); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,130,150,.55)'; ell(-7.2, cy + 3.4, 1.9, 1.1); ctx.fill(); ell(7.2, cy + 3.4, 1.9, 1.1); ctx.fill();
  ctx.restore();
  if (b.state === 'walk' && b.hp < b.max) {
    const top = b.y + (cy - 11) * sc, fr = clamp(b.hp / b.max, .02, 1);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, b.x - 11, top - 4, 22, 4, 2); ctx.fill();
    ctx.fillStyle = '#ff5d4a'; rr(ctx, b.x - 10.5, top - 3.5, 21 * fr, 3, 1.5); ctx.fill();
  }
}
function drawFriend(f, now) {
  const e = 1 - Math.pow(1 - f.pop, 3);
  ctx.save(); ctx.beginPath(); ctx.rect(f.x - 24, f.y - 70, 48, 70); ctx.ellipse(f.x, f.y, 10.5, 5.5, 0, 0, Math.PI); ctx.clip();
  drawKid(f.x, f.y + 13 + Math.sin(now * 2 + f.x) * .6, { s: .9 * Math.max(.01, e), aim: f.aim, moving: false, walk: 0, kick: f.kick, skin: f.skin, skinD: f.skinD, trunk: f.trunk, hat: f.hat });
  ctx.restore();
  ctx.fillStyle = '#c99d55'; ctx.beginPath(); ctx.ellipse(f.x, f.y + 1, 14, 7.5, 0, 0, Math.PI); ctx.ellipse(f.x, f.y + 1, 10.5, 4.5, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
}

/* ---------- particles (sand puffs) ---------- */
const parts = [];
for (let i = 0; i < 160; i++) parts.push({ x: 0, y: 0, h: 0, vx: 0, vy: 0, vh: 0, life: 0, c: '#fff' });
let pIdx = 0;
function puff(x, y, h, n, col) {
  for (let k = 0; k < n; k++) {
    const p = parts[pIdx++ % parts.length];
    p.x = x; p.y = y; p.h = h; p.vx = rnd(-40, 40); p.vy = rnd(-25, 25); p.vh = rnd(30, 80); p.life = rnd(.35, .6); p.c = col;
  }
}
function updateParticles(dt) {
  for (const p of parts) {
    if (p.life <= 0) continue;
    p.life -= dt; p.vh -= 280 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.h += p.vh * dt;
    if (p.h < 0) p.life = 0;
  }
}

/* ---------- floating text ---------- */
const floats = [];
for (let i = 0; i < 10; i++) floats.push({ txt: '', life: 0, x: 0, y: 0, h: 0 });
function floatText(txt, x, y, h) {
  const f = floats.find(p => p.life <= 0); if (!f) return;
  f.txt = txt; f.life = 1.1; f.x = x; f.y = y; f.h = h;
}

/* ---------- game data ---------- */
const TYPES = {
  normal: { hp: 4,  sp: 34, r: 11, drop: [1, 2], atk: 3, rate: .9 },
  crawl:  { hp: 3,  sp: 62, r: 9,  drop: [1, 1], atk: 2, rate: .6 },
  big:    { hp: 14, sp: 22, r: 16, drop: [2, 3], atk: 9, rate: 1.1 }
};
const UPG = {
  rate:  { name: 'Cadencia', base: 8,  g: 1.4,  max: 10, val: l => 1.6 + .45 * l,  fmt: v => f1(v) + ' bolas/s' },
  power: { name: 'Daño',     base: 10, g: 1.4,  max: 10, val: l => 2 + .6 * l,     fmt: v => 'daño ' + f1(v) },
  range: { name: 'Alcance',  base: 6,  g: 1.35, max: 8,  val: l => (175 + 14 * l) / 20, fmt: v => f1(v) + ' m' }
};
const upCost = (u, l) => Math.ceil(u.base * Math.pow(u.g, l));
const repairCost = () => 5 + 2 * S.wave;
const fRate = () => .7 + .12 * S.friendLvl, fDmg = () => 1.5 + .5 * S.friendLvl, F_RANGE = 150;

const PADS = [
  { id: 'rate',   x: 62,  y: 528 }, { id: 'power',  x: 180, y: 528 }, { id: 'range',  x: 298, y: 528 },
  { id: 'wall',   x: 62,  y: 598 }, { id: 'friend', x: 180, y: 598 }, { id: 'repair', x: 298, y: 598 }
];
const PAD_W = 70;

let S, best = 0, mode = 'start';   // mode: start | play | pause
try { best = +localStorage.getItem('castillo-arena-best') || 0; } catch (e) {}

function padState(p) {
  const id = p.id;
  if (id === 'rate' || id === 'power' || id === 'range') {
    const u = UPG[id], l = S.up[id], maxed = l >= u.max;
    return { name: u.name, val: u.fmt(u.val(l)), lvl: 'Nivel ' + l + ' de ' + u.max, cost: maxed ? 0 : upCost(u, l), maxed, enabled: true };
  }
  if (id === 'wall') {
    const n = S.wallBuilt;
    if (n < 5) return { name: 'Muralla', val: 'Tramo ' + (n + 1) + ' de 5', lvl: 'Aguanta ' + wallMax(), cost: WALL_COST[n], maxed: false, enabled: true };
    const l = S.wallLvl, maxed = l >= 5;
    return { name: 'Refuerzo', val: 'Aguanta ' + wallMax(), lvl: 'Nivel ' + l + ' de 5', cost: maxed ? 0 : Math.ceil(20 * Math.pow(1.5, l)), maxed, enabled: true };
  }
  if (id === 'friend') {
    const n = S.friends.length;
    if (n < 6) return { name: 'Amigos', val: 'Recluta ' + (n + 1) + ' de 6', lvl: f1(fRate()) + ' bolas/s', cost: FRIEND_COST[n], maxed: false, enabled: true };
    const l = S.friendLvl, maxed = l >= 6;
    return { name: 'Entrenar', val: f1(fRate()) + ' bolas/s', lvl: 'Nivel ' + l + ' de 6', cost: maxed ? 0 : Math.ceil(25 * Math.pow(1.5, l)), maxed, enabled: true };
  }
  const hurt = S.hp < 100 || walls.some(w => w.built && w.hp < wallMax());
  return { name: 'Reparar', val: 'Castillo ' + Math.ceil(S.hp) + '/100', lvl: 'Recupera 35', cost: repairCost(), maxed: false, enabled: hurt };
}
function completePad(p) {
  const id = p.id;
  if (id === 'rate' || id === 'power' || id === 'range') S.up[id]++;
  else if (id === 'wall') {
    if (S.wallBuilt < 5) { const w = walls[WALL_ORDER[S.wallBuilt]]; w.built = true; w.hp = wallMax(); S.wallBuilt++; puff(CX + Math.cos(w.a) * WALL_R, CY + Math.sin(w.a) * WALL_R, 14, 14, '#e8c680'); }
    else { S.wallLvl++; walls.forEach(w => { if (w.built) w.hp = Math.min(wallMax(), w.hp + 40); }); }
  } else if (id === 'friend') {
    if (S.friends.length < 6) recruit(); else S.friendLvl++;
  } else {
    S.hp = Math.min(100, S.hp + 35);
    walls.forEach(w => { if (w.built) w.hp = Math.min(wallMax(), w.hp + .35 * wallMax()); });
  }
  p.prog = 0; p.acc = 0; p.key = ''; updateHud();
  puff(p.x, p.y, 6, 16, '#fff3b0');
}

/* ---------- pads (flat squares on the sand); each label is cached on its own small canvas ---------- */
const padObjs = [];
PADS.forEach(p => {
  const c = document.createElement('canvas'); c.width = c.height = 192;
  p.cv = c; p.prog = 0; p.acc = 0; p.key = ''; p.pulse = 1;
  padObjs.push(p);
});
function drawPad(p, st, active, can) {
  const t = p.cv.getContext('2d'); t.clearRect(0, 0, 192, 192);
  t.fillStyle = active ? 'rgba(255,250,224,.97)' : 'rgba(255,248,226,.86)'; rr(t, 8, 8, 176, 176, 24); t.fill();
  t.lineWidth = 8; t.strokeStyle = st.maxed || !st.enabled ? '#a39d8c' : (can ? '#2fb86a' : '#b07f35'); t.stroke();
  t.textAlign = 'center'; t.textBaseline = 'middle';
  t.fillStyle = '#3b2814'; t.font = '700 27px Fredoka, "Trebuchet MS", sans-serif'; t.fillText(st.name, 96, 40);
  t.fillStyle = '#6b4e2a'; t.font = '800 17px Nunito, system-ui, sans-serif'; t.fillText(st.val, 96, 66);
  if (st.maxed || !st.enabled) {
    t.fillStyle = '#7d765f'; t.font = '700 27px Fredoka, sans-serif'; t.fillText(st.maxed ? 'Máximo' : 'Todo bien', 96, 112);
  } else {
    const txt = p.prog + '/' + st.cost; t.font = '700 36px Fredoka, sans-serif';
    const w = t.measureText(txt).width, tot = w + 38, s0 = 96 - tot / 2;
    t.fillStyle = '#f7a8ba'; t.strokeStyle = '#b85a76'; t.lineWidth = 2.5; t.beginPath();
    t.moveTo(s0 + 14, 126); t.lineTo(s0 + 2, 110); t.arc(s0 + 14, 110, 12, Math.PI, 0); t.closePath(); t.fill(); t.stroke();
    t.fillStyle = '#3b2814'; t.textAlign = 'left'; t.fillText(txt, s0 + 38, 114); t.textAlign = 'center';
    t.fillStyle = '#e3d2a4'; rr(t, 26, 136, 140, 14, 7); t.fill();
    if (p.prog > 0) { t.fillStyle = '#2fb86a'; rr(t, 26, 136, Math.max(14, 140 * p.prog / st.cost), 14, 7); t.fill(); }
  }
  t.fillStyle = '#6b4e2a'; t.font = '700 15px Nunito, system-ui, sans-serif'; t.fillText(st.lvl, 96, 166);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => padObjs.forEach(p => { p.key = ''; }));

/* ---------- state ---------- */
const ents = { babies: [], balls: [], drops: [], flies: [] };
const KID_LOOK = { skin: '#f0b48a', skinD: '#d9976a', trunk: '#2c6fe0', hat: 'straw', s: 1.1 };

function newGame() {
  ents.babies = []; ents.balls = []; ents.drops = []; ents.flies = [];
  walls.forEach(w => { w.built = false; w.hp = 0; });
  padObjs.forEach(p => { p.prog = 0; p.acc = 0; p.key = ''; });
  S = {
    t: 0, hp: 100, shells: 0, wave: 1, kills: 0, spawnLeft: 0, spawnT: 0, gap: null, banner: 0, bannerTxt: '',
    over: false, shake: 0, bump: 0, hint: 9, activePad: null,
    up: { rate: 0, power: 0, range: 0 }, wallBuilt: 0, wallLvl: 0, friends: [], friendLvl: 0,
    player: { x: 180, y: 560, aim: -Math.PI / 2, fireT: 0, walk: 0, moving: false, kick: 0 }
  };
  startWave(1); updateHud();
}
function startWave(n) {
  S.wave = n; S.spawnLeft = 5 + 2 * n; S.spawnT = .8; S.gap = null; S.banner = 1.9; S.bannerTxt = 'Oleada ' + n;
  $('waveNo').textContent = n;
}
function updateHud() {
  const f = clamp(S.hp / 100, 0, 1), fill = $('hpFill');
  fill.style.width = (f * 100) + '%'; fill.classList.toggle('low', f < .3);
  $('shellNo').textContent = S.shells;
}
const FRIEND_LOOK = [['#e0457b', '#7bd389'], ['#2fb86a', '#ff8a3c'], ['#8e5bd9', '#3dc8e8'], ['#ff8a3c', '#e0457b'], ['#3dc8e8', '#ffd23f'], ['#7bd389', '#8e5bd9']];
function recruit() {
  const j = S.friends.length, h = holes[j], c = FRIEND_LOOK[j], dark = j % 2 === 1;
  S.friends.push({ x: h.x, y: h.y, cd: rnd(0, .6), aim: -Math.PI / 2, kick: 0, pop: 0,
    trunk: c[0], hat: c[1], skin: dark ? '#d99a6c' : '#ffd0a8', skinD: dark ? '#b97d52' : '#e8b38a' });
}

/* ---------- input ---------- */
const joy = { on: false, id: null, ox: 0, oy: 0, vx: 0, vy: 0 };
const keys = new Set();
const toLog = e => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; };
function joyDom() {
  const j = $('joy'); j.hidden = !joy.on; if (!joy.on) return;
  j.style.transform = 'translate(' + joy.ox * scale + 'px,' + joy.oy * scale + 'px)';
  $('joyKnob').style.left = joy.vx * 36 * scale + 'px'; $('joyKnob').style.top = joy.vy * 36 * scale + 'px';
}
stage.addEventListener('pointerdown', e => {
  if (mode !== 'play' || S.over || e.target.closest('button')) return;
  const p = toLog(e); joy.on = true; joy.id = e.pointerId; joy.ox = p.x; joy.oy = p.y; joy.vx = joy.vy = 0; joyDom();
  try { stage.setPointerCapture(e.pointerId); } catch (err) {}
});
stage.addEventListener('pointermove', e => {
  if (!joy.on || e.pointerId !== joy.id) return;
  const p = toLog(e), dx = p.x - joy.ox, dy = p.y - joy.oy, len = Math.hypot(dx, dy), max = 36;
  if (len > max) { joy.ox += dx / len * (len - max); joy.oy += dy / len * (len - max); }
  const m = Math.min(1, len / max);
  if (len > 4) { joy.vx = dx / len * m; joy.vy = dy / len * m; } else { joy.vx = joy.vy = 0; }
  joyDom();
});
const endJoy = e => { if (e.pointerId === joy.id) { joy.on = false; joy.vx = joy.vy = 0; joyDom(); } };
stage.addEventListener('pointerup', endJoy);
stage.addEventListener('pointercancel', endJoy);
stage.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { keys.add(k); if (k.startsWith('arrow')) e.preventDefault(); }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
$('again').addEventListener('click', () => { $('over').hidden = true; newGame(); mode = 'play'; });
function showStart() {
  mode = 'start'; $('paused').hidden = true; $('over').hidden = true; $('start').hidden = false;
  const r = $('startRec'); r.hidden = !best; r.textContent = 'Tu récord: oleada ' + best;
}
function pause() {
  if (mode !== 'play' || S.over) return;
  mode = 'pause'; joy.on = false; joy.vx = joy.vy = 0; joyDom(); keys.clear();
  $('pauseTxt').textContent = 'Oleada ' + S.wave + ' · ' + S.kills + (S.kills === 1 ? ' bebé' : ' bebés') + ' llorando';
  $('paused').hidden = false;
}
function resume() { if (mode === 'pause') { mode = 'play'; $('paused').hidden = true; } }
$('play').addEventListener('click', () => { $('start').hidden = true; newGame(); mode = 'play'; });
$('pauseBtn').addEventListener('click', () => (mode === 'pause' ? resume() : pause()));
$('resume').addEventListener('click', resume);
$('quit').addEventListener('click', () => { newGame(); showStart(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (k === 'escape' || k === 'p') (mode === 'pause' ? resume() : pause()); });

function gameOver() {
  S.over = true; joy.on = false; joy.vx = joy.vy = 0; joyDom();
  if (S.wave > best) { best = S.wave; try { localStorage.setItem('castillo-arena-best', String(best)); } catch (e) {} }
  $('overTxt').textContent = 'Has aguantado hasta la oleada ' + S.wave + ' y has mandado llorando a ' + S.kills + (S.kills === 1 ? ' bebé' : ' bebés') + '. Tu récord es la oleada ' + best + '.';
  $('over').hidden = false;
}

/* ---------- simulation ---------- */
function spawnBaby() {
  const n = S.wave, r = Math.random();
  const pBig = n >= 3 ? Math.min(.3, (n - 2) * .06) : 0, pCr = n >= 2 ? Math.min(.35, (n - 1) * .08) : 0;
  const type = r < pBig ? 'big' : (r < pBig + pCr ? 'crawl' : 'normal');
  const T = TYPES[type], hs = 1 + .12 * (n - 1);
  let x, y;
  if (Math.random() < .7) { x = 24 + Math.random() * (W - 48); y = 66; }
  else { x = Math.random() < .5 ? -12 : W + 12; y = 90 + Math.random() * 200; }
  const skin = SKINS[Math.floor(Math.random() * SKINS.length)];
  ents.babies.push({ type, x, y, hp: T.hp * hs, max: T.hp * hs, sp: T.sp * (.9 + Math.random() * .2), r: T.r,
    skin, skinD: darken(skin), hair: Math.floor(Math.random() * 4), hairC: HAIRS[Math.floor(Math.random() * HAIRS.length)],
    state: 'walk', flash: 0, t: Math.random() * 6, atkT: Math.random() * .5, rate: T.rate, atk: T.atk, cryT: 0, fx: 0, fy: 0, inside: false });
}
function darken(hex) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(x => Math.round(x * .82));
  return '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
}
function addDrop(x, y, kind, v) {
  const a = Math.random() * TAU, s = 40 + Math.random() * 60;
  ents.drops.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind, v, t: 0, ph: Math.random() * 6 });
}
function die(b) {
  S.kills++; b.state = 'cry'; b.cryT = 0;
  const dx = b.x - CX, dy = b.y - CY, d = Math.hypot(dx, dy) || 1; b.fx = dx / d; b.fy = dy / d;
  const T = TYPES[b.type], n = T.drop[0] + Math.floor(Math.random() * (T.drop[1] - T.drop[0] + 1));
  for (let i = 0; i < n; i++) addDrop(b.x, b.y, 'shell', 1);
  if (b.type === 'big') addDrop(b.x, b.y, 'conch', 5);
  if (Math.random() < .6) floatText(['¡Buaaa!', '¡Uaaa!', '¡Buaaaa!'][Math.floor(Math.random() * 3)], b.x, b.y, 44);
}
function hitCastle(d) {
  S.hp = Math.max(0, S.hp - d); S.shake = .25;
  puff(CX + rnd(-40, 40), CY + 8, 30, 3, '#d9b873'); updateHud();
  if (S.hp <= 0) gameOver();
}
function hitWall(w, d) {
  const x = CX + Math.cos(w.a) * WALL_R, y = CY + Math.sin(w.a) * WALL_R;
  w.hp -= d; w.shake = .2; puff(x, y, 18, 3, '#d9b873');
  if (w.hp <= 0) { w.hp = 0; puff(x, y, 14, 12, '#d9b873'); }
}
function nearest(x, y, range) {
  let t = null, bd = 1e9;
  for (const b of ents.babies) {
    if (b.state !== 'walk') continue;
    const d = Math.hypot(b.x - x, b.y - y);
    if (d - b.r <= range && d < bd) { bd = d; t = b; }
  }
  return t;
}
function shoot(x, y, a, dmg, max) {
  ents.balls.push({ x, y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, dist: 0, max, dmg });
}

function update(dt) {
  if (mode !== 'play' || S.over) return;
  S.t += dt;
  const p = S.player;
  S.shake = Math.max(0, S.shake - dt); S.bump = Math.max(0, S.bump - dt);
  S.banner = Math.max(0, S.banner - dt); S.hint = Math.max(0, S.hint - dt); p.kick = Math.max(0, p.kick - dt);

  // movement
  let ix = joy.vx, iy = joy.vy;
  if (keys.size) {
    const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const ky = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    if (kx || ky) { const l = Math.hypot(kx, ky); ix = kx / l; iy = ky / l; }
  }
  const mag = Math.hypot(ix, iy);
  p.moving = mag > .05;
  p.x += ix * 118 * dt; p.y += iy * 118 * dt;
  if (p.moving) p.walk += dt * mag;
  p.x = clamp(p.x, 14, W - 14); p.y = clamp(p.y, 76, H - 16);
  const pdx = p.x - CX, pdy = p.y - CY, pd = Math.hypot(pdx, pdy);
  if (pd < 66 && pd > .01) { p.x = CX + pdx / pd * 66; p.y = CY + pdy / pd * 66; }

  // kid auto fire
  const range = 175 + 14 * S.up.range, target = nearest(p.x, p.y, range);
  if (target) p.aim = Math.atan2(target.y - p.y, target.x - p.x);
  else if (p.moving) p.aim = Math.atan2(iy, ix);
  p.fireT -= dt;
  if (p.fireT <= 0) {
    if (target) { shoot(p.x + Math.cos(p.aim) * 10, p.y + Math.sin(p.aim) * 10, p.aim, 2 + .6 * S.up.power, range + 40); p.kick = .1; p.fireT = 1 / (1.6 + .45 * S.up.rate); }
    else p.fireT = 0;
  }

  // friends
  for (const f of S.friends) {
    f.pop = Math.min(1, f.pop + dt * 3); f.kick = Math.max(0, f.kick - dt); f.cd -= dt;
    const tg = nearest(f.x, f.y, F_RANGE);
    if (tg) f.aim = Math.atan2(tg.y - f.y, tg.x - f.x);
    if (f.cd <= 0) {
      if (tg) { shoot(f.x + Math.cos(f.aim) * 8, f.y + Math.sin(f.aim) * 8, f.aim, fDmg(), F_RANGE + 40); f.kick = .1; f.cd = 1 / fRate(); }
      else f.cd = 0;
    }
  }

  // balls
  for (let i = ents.balls.length - 1; i >= 0; i--) {
    const bl = ents.balls[i];
    bl.x += bl.vx * dt; bl.y += bl.vy * dt; bl.dist += 380 * dt;
    let gone = bl.dist > bl.max || bl.x < -10 || bl.x > W + 10 || bl.y < 40 || bl.y > H + 10;
    if (!gone) {
      for (const b of ents.babies) {
        if (b.state !== 'walk') continue;
        if (Math.hypot(b.x - bl.x, b.y - bl.y) < b.r + 4) {
          b.hp -= bl.dmg; b.flash = .12;
          const l = Math.hypot(bl.vx, bl.vy); b.x += bl.vx / l * 3; b.y += bl.vy / l * 3;
          puff(bl.x, bl.y, 20, 5, '#d4ad6a');
          if (b.hp <= 0) die(b);
          gone = true; break;
        }
      }
    }
    if (gone) ents.balls.splice(i, 1);
  }

  // babies
  for (const b of ents.babies) {
    b.t += dt; b.flash = Math.max(0, b.flash - dt);
    if (b.state === 'walk') {
      const dx = CX - b.x, dy = CY - b.y, d = Math.hypot(dx, dy) || 1;
      let blocked = null;
      if (b.y < CY && !b.inside) {
        if (d < WALL_R - 12) b.inside = true;
        else if (d <= WALL_R + b.r * .5) {
          const ang = Math.atan2(b.y - CY, b.x - CX), idx = clamp(Math.floor((ang + Math.PI) / (Math.PI / 5)), 0, 4), sg = walls[idx];
          if (sg.built && sg.hp > 0) blocked = sg;
        }
      }
      if (blocked) { b.atkT -= dt; if (b.atkT <= 0) { b.atkT = b.rate; hitWall(blocked, b.atk); } }
      else if (d > CR + b.r * .3) { const m = b.sp * dt; b.x += dx / d * m; b.y += dy / d * m; }
      else { b.atkT -= dt; if (b.atkT <= 0) { b.atkT = b.rate; hitCastle(b.atk); if (S.over) return; } }
    } else {
      b.cryT += dt; b.x += b.fx * 110 * dt; b.y += b.fy * 110 * dt;
    }
  }
  for (let i = 0; i < ents.babies.length; i++) {
    const a = ents.babies[i]; if (a.state !== 'walk') continue;
    for (let j = i + 1; j < ents.babies.length; j++) {
      const c = ents.babies[j]; if (c.state !== 'walk') continue;
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), min = (a.r + c.r) * .85;
      if (d < min && d > .01) { const push = (min - d) * .5; a.x -= dx / d * push; a.y -= dy / d * push; c.x += dx / d * push; c.y += dy / d * push; }
    }
  }
  ents.babies = ents.babies.filter(b => !(b.state === 'cry' && (b.cryT > 3.2 || b.x < -30 || b.x > W + 30 || b.y > H + 30 || b.y < 30)));

  // drops (the magnet is built in)
  const magR = 78;
  for (let i = ents.drops.length - 1; i >= 0; i--) {
    const s = ents.drops[i]; s.t += dt;
    const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy);
    if (s.t > .35 && d < magR && d > .001) { const v = 240 + (magR - d) * 3; s.x += dx / d * v * dt; s.y += dy / d * v * dt; }
    else { s.x += s.vx * dt; s.y += s.vy * dt; const f = Math.pow(.02, dt); s.vx *= f; s.vy *= f; }
    s.x = clamp(s.x, 8, W - 8); s.y = clamp(s.y, 72, H - 8);
    if (d < 14 && s.t > .25) { S.shells += s.v; S.bump = .25; ents.drops.splice(i, 1); updateHud(); }
  }

  // pads: stand on one to pay into it
  S.activePad = null;
  for (const pad of padObjs) if (Math.abs(p.x - pad.x) < PAD_W / 2 && Math.abs(p.y - pad.y) < PAD_W / 2) { S.activePad = pad; break; }
  const ap = S.activePad;
  if (ap) {
    const st = padState(ap);
    if (!st.maxed && st.enabled && S.shells > 0) {
      ap.acc += clamp(st.cost * 1.5, 12, 40) * dt;
      const n = Math.min(Math.floor(ap.acc), S.shells, st.cost - ap.prog);
      if (n > 0) {
        ap.acc -= n; S.shells -= n; ap.prog += n; updateHud();
        for (let k = 0; k < Math.min(n, 2); k++) ents.flies.push({ t: 0, sx: p.x, sy: p.y, tx: ap.x, ty: ap.y });
      }
      if (ap.prog >= st.cost) completePad(ap);
    }
  }
  for (let i = ents.flies.length - 1; i >= 0; i--) {
    const f = ents.flies[i]; f.t += dt / .35;
    if (f.t >= 1) ents.flies.splice(i, 1);
  }

  for (const w of walls) w.shake = Math.max(0, w.shake - dt);

  // waves
  if (S.spawnLeft > 0) {
    S.spawnT -= dt;
    if (S.spawnT <= 0) { spawnBaby(); S.spawnLeft--; S.spawnT = Math.max(.45, 1.5 - .07 * S.wave) * (.7 + Math.random() * .6); }
  } else if (S.gap === null) {
    if (!ents.babies.some(b => b.state === 'walk')) { S.gap = 2.2; S.banner = 1.8; S.bannerTxt = '¡Oleada superada!'; }
  } else {
    S.gap -= dt; if (S.gap <= 0) startWave(S.wave + 1);
  }
  updateParticles(dt);
  for (const f of floats) if (f.life > 0) { f.life -= dt; f.h += 24 * dt; }
}

/* ---------- drawing ---------- */
const order = [];
function render(now) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bg, 0, 0);
  ctx.setTransform(PX, 0, 0, PX, 0, 0);
  drawSea(now);
  const p = S.player;

  // pads
  for (const pad of padObjs) {
    const st = padState(pad), active = S.activePad === pad;
    const can = !st.maxed && st.enabled && S.shells >= Math.max(1, st.cost - pad.prog) && st.cost > 0;
    const key = [st.name, st.val, st.lvl, st.cost, pad.prog, st.maxed, st.enabled, active, can].join('|');
    if (key !== pad.key) { pad.key = key; drawPad(pad, st, active, can); }
    const k = can ? 1 + Math.sin(now * 6) * .03 : 1, s = 35 * k;
    ctx.fillStyle = '#cdb47a'; rr(ctx, pad.x - s, pad.y - s + 3, s * 2, s * 2, 10); ctx.fill();
    ctx.fillStyle = '#f3e3b5'; rr(ctx, pad.x - s, pad.y - s, s * 2, s * 2, 10); ctx.fill();
    ctx.drawImage(pad.cv, pad.x - 33 * k, pad.y - 33 * k, 66 * k, 66 * k);
  }

  // shadows on the sand
  ctx.fillStyle = 'rgba(90,60,20,.22)';
  ell(p.x, p.y, 10, 3.6); ctx.fill();
  for (const b of ents.babies) { const sc = b.type === 'big' ? 1.45 : 1; ell(b.x, b.y, 8.5 * sc, 3.2 * sc); ctx.fill(); }
  for (const bl of ents.balls) { ell(bl.x, bl.y, 3, 1.3); ctx.fill(); }

  // drops lying on the sand
  for (const s of ents.drops) {
    const yy = s.y - 4 - Math.sin(now * 4 + s.ph) * 1.2, spin = now * 2 + s.ph;
    if (s.kind === 'conch') conchIcon(s.x, yy, 6.5, spin); else shellIcon(s.x, yy, 5, spin);
  }

  // standing things, back to front
  order.length = 0;
  order.push({ y: CY + 16, k: 0 });
  for (const w of walls) order.push({ y: CY + Math.sin(w.a) * WALL_R + 6, k: 1, o: w });
  for (const f of S.friends) order.push({ y: f.y, k: 2, o: f });
  for (const b of ents.babies) order.push({ y: b.y, k: 3, o: b });
  order.push({ y: p.y, k: 4 });
  order.sort((a, b) => a.y - b.y);
  for (const e of order) {
    if (e.k === 0) drawCastle(now);
    else if (e.k === 1) drawWall(e.o, now);
    else if (e.k === 2) drawFriend(e.o, now);
    else if (e.k === 3) drawBaby(e.o);
    else drawKid(p.x, p.y, Object.assign(KID_LOOK, { aim: p.aim, moving: p.moving, walk: p.walk, kick: p.kick }));
  }

  // things in the air
  for (const bl of ents.balls) { ctx.fillStyle = '#b78a4b'; ell(bl.x, bl.y - 20, 3.6, 3.6); ctx.fill(); ctx.fillStyle = 'rgba(255,240,200,.6)'; ell(bl.x - 1.1, bl.y - 21.2, 1.2, 1.2); ctx.fill(); }
  for (const f of ents.flies) {
    const t = f.t, e = t * t * (3 - 2 * t);
    shellIcon(f.sx + (f.tx - f.sx) * e, f.sy + (f.ty - f.sy) * e - 24 - Math.sin(t * Math.PI) * 28, 4.5);
  }
  for (const q of parts) if (q.life > 0) { ctx.globalAlpha = clamp(q.life / .3, 0, 1); ctx.fillStyle = q.c; ctx.fillRect(q.x - 1.2, q.y - q.h - 1.2, 2.4, 2.4); }
  ctx.globalAlpha = 1;
  ctx.font = '700 15px Fredoka, "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const f of floats) if (f.life > 0) {
    ctx.globalAlpha = Math.min(1, f.life / .4);
    ctx.lineWidth = 3; ctx.strokeStyle = '#2a6b86'; ctx.strokeText(f.txt, f.x, f.y - f.h); ctx.fillStyle = '#fff'; ctx.fillText(f.txt, f.x, f.y - f.h);
  }
  ctx.globalAlpha = 1;

  // DOM overlays
  $('shellChip').style.transform = S.bump > 0 ? 'scale(' + (1 + S.bump * .6) + ')' : '';
  const bn = $('banner');
  if (S.banner > 0 && !S.over && mode === 'play') { const a = Math.min(1, S.banner / .5); bn.textContent = S.bannerTxt; bn.style.opacity = a; bn.style.transform = 'scale(' + (1 + (1 - a) * .15) + ')'; } else bn.style.opacity = 0;
  $('hint').style.opacity = S.hint > 0 && !S.over && mode === 'play' ? Math.min(1, S.hint / 1.2) : 0;
}

/* ---------- loop ---------- */
addEventListener('resize', fit);
fit();
newGame();
showStart();
let last = 0;
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  update(dt); render(ts / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(() => { fit(); requestAnimationFrame(frame); });
})();
