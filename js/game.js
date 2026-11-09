/* Castillo de Arena: juego en 2D sobre canvas, sin librerías.
   Unidades: "píxeles de playa" (20 px = 1 m). La pantalla enseña unos 360 px de ancho;
   la playa es más grande y la cámara sigue al niño. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const { drawKid } = window.Chars;

/* ---------- mundo (valores ajustables) ---------- */
const WORLD = { w: 960, h: 1500 };       // tamaño de la playa (48 x 75 m)
const SHORE = 230;                        // altura media de la orilla: por encima está el mar
const CASTLE = { x: 480, y: 820, r: 58 }; // centro del castillo y radio que bloquea el paso
const VIEW_W = 360, VIEW_H = 640;         // vista mínima garantizada en pantalla
const KID_SPEED = 118;                    // px/s (5,9 m/s)
const CHAR_SCALE = 0.5;                   // tamaño de los personajes del elenco dentro del juego
const shoreY = (x, t) => SHORE + Math.sin(x * .012 + t * .8) * 10 + Math.sin(x * .031 - t * 1.3) * 5;

/* ---------- canvas y escala ---------- */
const cv = $('game'), ctx = cv.getContext('2d');
let dpr = 1, zoom = 1, viewW = VIEW_W, viewH = VIEW_H;
function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  zoom = Math.min(w / VIEW_W, h / VIEW_H);
  viewW = w / zoom; viewH = h / zoom;
}
addEventListener('resize', fit);
fit();

/* ---------- arena: una baldosa con puntitos que se repite ---------- */
let seed = 20261109;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sandPattern = (() => {
  const T = 256, R = 2, c = document.createElement('canvas'); c.width = c.height = T * R;
  const t = c.getContext('2d'); t.scale(R, R);
  t.fillStyle = '#ecd49b'; t.fillRect(0, 0, T, T);
  for (let i = 0; i < 520; i++) {
    t.fillStyle = rand() < .55 ? 'rgba(150,110,50,.22)' : 'rgba(255,248,222,.55)';
    t.beginPath(); t.arc(rand() * T, rand() * T, .6 + rand() * 1.4, 0, 7); t.fill();
  }
  const p = ctx.createPattern(c, 'repeat');
  if (p.setTransform) p.setTransform(new DOMMatrix().scale(1 / R));
  return p;
})();

/* ---------- decorado fijo (para que se note que te mueves) ---------- */
const decor = [];
{
  const far = (x, y, d) => Math.hypot(x - CASTLE.x, y - CASTLE.y) > d;
  for (let i = 0; i < 46; i++) {
    const x = 30 + rand() * (WORLD.w - 60), y = SHORE + 60 + rand() * (WORLD.h - SHORE - 90);
    if (!far(x, y, 140)) continue;
    const r = rand();
    decor.push({ x, y, kind: r < .4 ? 'star' : r < .75 ? 'pebble' : 'shell', rot: rand() * 6.28, s: .8 + rand() * .5 });
  }
  const towels = [[150, 560, '#ff8fa3'], [800, 610, '#7fd1e8'], [210, 1250, '#ffd166'], [760, 1180, '#9be29b']];
  for (const [x, y, col] of towels) decor.push({ x, y, kind: 'towel', col, rot: (rand() - .5) * .5 });
  const umbrellas = [[120, 520, '#ff5d4a'], [840, 570, '#2fa6a0'], [250, 1210, '#f59a3b'], [720, 1140, '#8e5bd9']];
  for (const [x, y, col] of umbrellas) decor.push({ x: x + 30, y: y + 6, kind: 'umbrella', col, tall: true });
}
const TALL = decor.filter(d => d.tall), FLAT = decor.filter(d => !d.tall);

/* ---------- estado ---------- */
const kid = { x: CASTLE.x, y: CASTLE.y + 120, face: 1, moving: false, walkT: 0 };
const cam = { x: kid.x, y: kid.y };
let T = 0;

/* ---------- control: joystick que aparece donde tocas, o teclado ---------- */
const joy = { on: false, id: null, ox: 0, oy: 0, px: 0, py: 0, vx: 0, vy: 0 };
const JOY_R = 38;
const toView = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom }; };
cv.addEventListener('pointerdown', e => {
  const p = toView(e);
  Object.assign(joy, { on: true, id: e.pointerId, ox: p.x, oy: p.y, px: p.x, py: p.y, vx: 0, vy: 0 });
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  $('hint').classList.add('off');
});
cv.addEventListener('pointermove', e => {
  if (!joy.on || e.pointerId !== joy.id) return;
  const p = toView(e); let dx = p.x - joy.ox, dy = p.y - joy.oy; const len = Math.hypot(dx, dy);
  if (len > JOY_R) { joy.ox += dx / len * (len - JOY_R); joy.oy += dy / len * (len - JOY_R); dx = p.x - joy.ox; dy = p.y - joy.oy; }
  joy.px = p.x; joy.py = p.y;
  const m = Math.min(1, len / JOY_R);
  if (len > 4) { joy.vx = dx / Math.hypot(dx, dy) * m; joy.vy = dy / Math.hypot(dx, dy) * m; } else joy.vx = joy.vy = 0;
});
const endJoy = e => { if (e.pointerId === joy.id) { joy.on = false; joy.vx = joy.vy = 0; } };
cv.addEventListener('pointerup', endJoy);
cv.addEventListener('pointercancel', endJoy);
cv.addEventListener('contextmenu', e => e.preventDefault());
const keys = new Set();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
    keys.add(k); e.preventDefault(); $('hint').classList.add('off');
  }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

/* ---------- simulación ---------- */
function update(dt) {
  let ix = joy.vx, iy = joy.vy;
  const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const ky = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  if (kx || ky) { const l = Math.hypot(kx, ky); ix = kx / l; iy = ky / l; }
  kid.moving = Math.hypot(ix, iy) > .05;
  if (kid.moving) {
    kid.x += ix * KID_SPEED * dt; kid.y += iy * KID_SPEED * dt; kid.walkT += dt;
    if (Math.abs(ix) > .15) kid.face = ix > 0 ? 1 : -1;
  }
  // límites: bordes de la playa, el agua y el castillo
  kid.x = clamp(kid.x, 16, WORLD.w - 16);
  kid.y = clamp(kid.y, shoreY(kid.x, 0) + 34, WORLD.h - 10);
  const dx = kid.x - CASTLE.x, dy = (kid.y - CASTLE.y) * 1.6, d = Math.hypot(dx, dy);
  if (d < CASTLE.r) { kid.x = CASTLE.x + dx / (d || 1) * CASTLE.r; kid.y = CASTLE.y + dy / (d || 1) * CASTLE.r / 1.6; }
  // cámara: sigue al niño con suavidad, sin salirse de la playa
  const k = 1 - Math.exp(-dt * 6);
  cam.x = lerp(cam.x, kid.x, k); cam.y = lerp(cam.y, kid.y - 40, k);
}
function camView() {
  const x = WORLD.w <= viewW ? (WORLD.w - viewW) / 2 : clamp(cam.x - viewW / 2, 0, WORLD.w - viewW);
  const y = clamp(cam.y - viewH / 2, -40, WORLD.h - viewH);
  return { x, y };
}

/* ---------- dibujo ---------- */
const INK = '#5b3220';
function outline(c, w) { c.lineWidth = w || 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }

function drawGround(c, v) {
  const x0 = v.x - 2, x1 = v.x + viewW + 2, y0 = v.y - 2, y1 = v.y + viewH + 2;
  c.fillStyle = sandPattern; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  // arena mojada junto a la orilla
  const g = c.createLinearGradient(0, SHORE - 20, 0, SHORE + 90);
  g.addColorStop(0, 'rgba(176,135,70,.45)'); g.addColorStop(1, 'rgba(176,135,70,0)');
  c.fillStyle = g; c.fillRect(x0, SHORE - 20, x1 - x0, 110);
  // mar
  if (y0 < SHORE + 20) {
    const sg = c.createLinearGradient(0, -40, 0, SHORE + 15);
    sg.addColorStop(0, '#0b6b84'); sg.addColorStop(1, '#27b3c7');
    c.beginPath(); c.moveTo(x0, y0);
    for (let x = x0; x <= x1 + 8; x += 8) c.lineTo(x, shoreY(x, T));
    c.lineTo(x1, y0); c.closePath(); c.fillStyle = sg; c.fill();
    c.beginPath();
    for (let x = x0; x <= x1 + 8; x += 8) { const y = shoreY(x, T); x === x0 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.lineWidth = 5; c.strokeStyle = 'rgba(243,251,247,.9)'; c.stroke();
    // líneas de olas
    c.strokeStyle = 'rgba(243,251,247,.35)'; c.lineWidth = 2.5;
    for (let i = 1; i <= 4; i++) {
      const yb = SHORE - i * 42 - ((T * 9) % 42);
      if (yb < y0 - 10) continue;
      c.beginPath();
      for (let x = x0; x <= x1 + 10; x += 10) { const y = yb + Math.sin(x * .02 + i) * 4; x === x0 ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.stroke();
    }
  }
  for (const d of FLAT) if (inView(d, v, 50)) drawFlat(c, d);
}
const inView = (o, v, m) => o.x > v.x - m && o.x < v.x + viewW + m && o.y > v.y - m && o.y < v.y + viewH + m * 2;

function drawFlat(c, d) {
  c.save(); c.translate(d.x, d.y); c.rotate(d.rot); c.scale(d.s || 1, (d.s || 1) * .75);
  if (d.kind === 'star') {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 3.2 : 8, a = i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fillStyle = '#ff9a6b'; c.fill(); outline(c, 1.6);
  } else if (d.kind === 'pebble') {
    c.beginPath(); c.ellipse(0, 0, 5, 3.4, 0, 0, 7); c.fillStyle = '#b9a58a'; c.fill(); outline(c, 1.4);
  } else if (d.kind === 'shell') {
    c.beginPath(); c.moveTo(0, 5); c.lineTo(-6, -1); c.arc(0, -1, 6, Math.PI, 0); c.closePath(); c.fillStyle = '#f7d9e0'; c.fill(); outline(c, 1.4);
  } else if (d.kind === 'towel') {
    c.scale(1, 1.33);
    c.beginPath(); c.roundRect(-34, -18, 68, 36, 4); c.fillStyle = d.col; c.fill(); outline(c, 2.4);
    c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = -1; i <= 1; i++) c.fillRect(i * 20 - 4, -17, 8, 34);
  }
  c.restore();
}
function drawUmbrella(c, d) {
  c.save(); c.translate(d.x, d.y);
  c.fillStyle = 'rgba(80,52,16,.22)'; c.beginPath(); c.ellipse(-8, 0, 46, 13, 0, 0, 7); c.fill();
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -78); outline(c, 6); c.strokeStyle = '#f3efe6'; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.moveTo(-50, -66);
  for (let i = 0; i < 4; i++) c.quadraticCurveTo(-50 + i * 25 + 12.5, -58, -25 + i * 25, -66);
  c.quadraticCurveTo(40, -110, 0, -112); c.quadraticCurveTo(-40, -110, -50, -66);
  c.fillStyle = d.col; c.fill(); outline(c, 3);
  c.beginPath(); c.moveTo(0, -112); c.quadraticCurveTo(-10, -86, -12, -62); c.moveTo(0, -112); c.quadraticCurveTo(10, -86, 12, -62);
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 6; c.stroke();
  c.restore();
}

function drawCastle(c) {
  const { x, y } = CASTLE;
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(80,52,16,.28)'; c.beginPath(); c.ellipse(0, 4, 80, 20, 0, 0, 7); c.fill();
  const SAND = '#e8c680', SAND_D = '#d2a95f';
  const block = (bx, by, w, h) => {
    c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by - h);
    const n = Math.max(2, Math.round(w / 12)), s = w / (n * 2 - 1);
    for (let i = 0; i < n * 2 - 1; i++) { const up = i % 2 === 0; c.lineTo(bx + i * s, by - h - (up ? 7 : 0)); c.lineTo(bx + (i + 1) * s, by - h - (up ? 7 : 0)); }
    c.lineTo(bx + w, by); c.closePath(); c.fillStyle = SAND; c.fill(); outline(c, 3);
    c.fillStyle = SAND_D; c.fillRect(bx + 2, by - h * .35, w - 4, 3); // marca de cubo
  };
  block(-56, 0, 30, 70); block(26, 0, 30, 70);        // torres laterales
  block(-34, 0, 68, 48);                               // muro central
  block(-16, -40, 32, 46);                             // torre central
  c.beginPath(); c.moveTo(-11, 0); c.lineTo(-11, -16); c.arc(0, -16, 11, Math.PI, 0); c.lineTo(11, 0); c.closePath();
  c.fillStyle = '#7a5530'; c.fill(); outline(c, 2.6);  // puerta
  for (const wx of [-41, 41]) { c.beginPath(); c.roundRect(wx - 4, -50, 8, 12, 4); c.fillStyle = '#7a5530'; c.fill(); outline(c, 2); }
  c.beginPath(); c.moveTo(0, -93); c.lineTo(0, -122); outline(c, 3);                       // mástil
  const wave = Math.sin(T * 5) * 3;
  c.beginPath(); c.moveTo(0, -122); c.quadraticCurveTo(12, -122 + wave, 24, -116); c.quadraticCurveTo(12, -112 - wave, 0, -108); c.closePath();
  c.fillStyle = '#ff5d4a'; c.fill(); outline(c, 2.4);
  c.restore();
}

function drawKidAt(c) {
  c.save(); c.translate(kid.x, kid.y);
  c.fillStyle = 'rgba(80,52,16,.28)'; c.beginPath(); c.ellipse(0, 1, 22, 6, 0, 0, 7); c.fill();
  c.scale(CHAR_SCALE * kid.face, CHAR_SCALE);
  drawKid(c, kid.moving ? kid.walkT : T, kid.moving ? 'walk' : 'idle', { look: window.Chars.KID_LOOKS[0], head: 1, bounce: 1 });
  c.restore();
}

function drawJoy(c) {
  if (!joy.on) return;
  c.beginPath(); c.arc(joy.ox, joy.oy, JOY_R, 0, 7); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.65)'; c.stroke();
  c.beginPath(); c.arc(joy.ox + joy.vx * JOY_R, joy.oy + joy.vy * JOY_R, 15, 0, 7); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();
}

function render() {
  const v = camView();
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, -v.x * dpr * zoom, -v.y * dpr * zoom);
  drawGround(ctx, v);
  // todo lo que tiene altura se ordena por su pie: lo de más abajo tapa a lo de más arriba
  const list = [{ y: CASTLE.y, f: drawCastle }, { y: kid.y, f: drawKidAt }];
  for (const d of TALL) if (inView(d, v, 120)) list.push({ y: d.y, f: c => drawUmbrella(c, d) });
  list.sort((a, b) => a.y - b.y);
  for (const o of list) o.f(ctx);
  // capa de pantalla (no se mueve con la cámara)
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
  drawJoy(ctx);
}

/* ---------- bucle ---------- */
let last = 0;
function frame(ms) {
  const dt = Math.min(.05, (ms - last) / 1000 || 0); last = ms;
  T += dt;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
