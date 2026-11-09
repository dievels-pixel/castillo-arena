(() => {
'use strict';
const $ = id => document.getElementById(id);
const stage = $('stage'), slot = $('slot'), glHost = $('gl'), fxHost = $('fx');
if (typeof THREE === 'undefined') {
  stage.insertAdjacentHTML('beforeend', '<div class="fail">No se ha podido cargar el motor 3D. Recarga la página.</div>');
  return;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = v => v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- world constants. Game logic runs in 2D "beach pixels" (360x640); 1 px = 0.05 world units ---------- */
const W = 360, H = 640, K = 0.05;
const CX = 180, CY = 440, CR = 62;        // castle centre and its attack radius
const WALL_R = 112, HOLE_R = 84;          // wall arc radius and friends' holes radius
const wx = x => (x - 180) * K, wz = y => (y - 320) * K;

/* ---------- renderer, camera, light ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  stage.insertAdjacentHTML('beforeend', '<div class="fail">Tu navegador no permite WebGL, necesario para el modo 3D.</div>');
  return;
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
glHost.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b6b84);
const camera = new THREE.PerspectiveCamera(32, W / H, 1, 300);
{
  const T = new THREE.Vector3(0, 0, 1.6), el = 66 * Math.PI / 180, d = 60;
  camera.position.set(0, T.y + d * Math.sin(el), T.z + d * Math.cos(el));
  camera.lookAt(T); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
}
scene.add(new THREE.HemisphereLight(0xffffff, 0xe6c98a, 0.68));
const sun = new THREE.DirectionalLight(0xfff3d6, 0.5);
sun.position.set(-9, 18, 10); sun.target.position.set(0, 0, 2);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0006;
{ const c = sun.shadow.camera; c.left = -13; c.right = 13; c.top = 20; c.bottom = -20; c.near = 1; c.far = 60; c.updateProjectionMatrix(); }
scene.add(sun, sun.target);

let scale = 1;
function fit() {
  const aw = slot.clientWidth, ah = slot.clientHeight - 16;
  scale = Math.max(0.3, Math.min(aw / W, ah / H));
  stage.style.width = W * scale + 'px';
  stage.style.height = H * scale + 'px';
  stage.style.fontSize = 10 * scale + 'px';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W * scale, H * scale);
}
addEventListener('resize', fit);
fit();

/* ---------- materials and shared geometry ---------- */
const mat = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
const SAND = mat(0xe8c680), SAND_D = mat(0xd2a95f), WOOD = mat(0x6f4b20), PINK = mat(0xf7a8ba), CREAM = mat(0xf5cf9a);
const SKIN = mat(0xffd3b3), KID = mat(0xf0b48a), WHITE = mat(0xffffff), BLACK = mat(0x3b2814), BALL = mat(0xb78a4b);
const PADM = mat(0xf3e3b5);
const gBox = new THREE.BoxGeometry(1, 1, 1), gSph = new THREE.SphereGeometry(1, 14, 10);
const gCyl = new THREE.CylinderGeometry(1, 1, 1, 14), gHemi = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
function mk(g, m, sx, sy, sz, x, y, z, shadow) {
  const o = new THREE.Mesh(g, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z);
  o.castShadow = shadow !== false; o.receiveShadow = true; return o;
}

/* ---------- beach ---------- */
{
  const c = document.createElement('canvas'); c.width = c.height = 512; const t = c.getContext('2d');
  let s = 20261109; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  t.fillStyle = '#ecd49b'; t.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3200; i++) {
    t.fillStyle = r() < .5 ? 'rgba(150,110,50,.18)' : 'rgba(255,248,222,.35)';
    t.beginPath(); t.arc(r() * 512, r() * 512, .8 + r() * 1.8, 0, 7); t.fill();
  }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 8); tex.anisotropy = 4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 52.4), new THREE.MeshLambertMaterial({ map: tex }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -12.4 + 26.2); ground.receiveShadow = true; scene.add(ground);
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(60, 1.8), mat(0xc9a869));
  wet.rotation.x = -Math.PI / 2; wet.position.set(0, .012, -11.5); scene.add(wet);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), mat(0x27b3c7));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -.12, -12.4 - 20); scene.add(sea);
}
const foam = new THREE.Mesh(new THREE.PlaneGeometry(60, .5), new THREE.MeshBasicMaterial({ color: 0xf3fbf7, transparent: true, opacity: .85 }));
foam.rotation.x = -Math.PI / 2; foam.position.set(0, .03, -12.2); scene.add(foam);
const foam2 = foam.clone(); foam2.scale.y = .6; foam2.material = foam.material.clone(); foam2.material.opacity = .5; scene.add(foam2);
{ // rocks
  const gRock = new THREE.IcosahedronGeometry(1, 0), mr = [mat(0xa99a86), mat(0x8f8372)];
  const spots = [[30, 130], [330, 150], [20, 300], [345, 330], [100, 190], [270, 240], [25, 470], [340, 480], [140, 600], [250, 610], [330, 40 + 90]];
  spots.forEach((p, i) => {
    const s = .25 + (i % 3) * .1, o = mk(gRock, mr[i % 2], s * 1.3, s * .8, s, wx(p[0]), s * .4, wz(p[1]));
    o.rotation.y = i * 1.7; scene.add(o);
  });
}

/* ---------- castle ---------- */
const castle = new THREE.Group(); castle.position.set(0, 0, wz(CY)); scene.add(castle);
const cIn = new THREE.Group(); castle.add(cIn);
const flags = [];
{
  cIn.add(mk(gSph, SAND_D, 4.4, .55, 2.7, 0, 0, .2, false));
  cIn.add(mk(gBox, SAND, 4.4, 1.5, .9, 0, .75, .9));
  for (let i = 0; i < 4; i++) cIn.add(mk(gBox, SAND, .6, .35, .5, -1.62 + i * 1.08, 1.68, .9));
  cIn.add(mk(gBox, SAND, 1.9, 2.9, 1.7, 0, 1.45, -.6));
  for (let i = 0; i < 3; i++) for (const z of [.2, -1.4]) cIn.add(mk(gBox, SAND, .45, .35, .35, -.7 + i * .7, 3.07, z));
  cIn.add(mk(gBox, WOOD, .9, 1.0, .1, 0, .5, 1.38));
  const arch = mk(gCyl, WOOD, .45, .1, .45, 0, 1.0, 1.38); arch.rotation.x = Math.PI / 2; cIn.add(arch);
  cIn.add(mk(gSph, PINK, .26, .26, .08, -1.4, .85, 1.38)); cIn.add(mk(gSph, PINK, .26, .26, .08, 1.4, .85, 1.38));
  cIn.add(mk(gBox, WOOD, .3, .55, .1, 0, 2.2, .27));
  for (const s of [-1, 1]) {
    const x = s * 3.0;
    cIn.add(mk(gCyl, SAND, .85, 3.1, .85, x, 1.55, .3));
    cIn.add(mk(gCyl, SAND_D, 1.0, .22, 1.0, x, 3.1, .3));
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; cIn.add(mk(gBox, SAND, .3, .36, .3, x + Math.cos(a) * .82, 3.4, .3 + Math.sin(a) * .82)); }
    cIn.add(mk(gBox, WOOD, .25, .5, .1, x, 2.1, 1.14));
  }
  const fcols = [0xff5d4a, 0xffd23f, 0x2c6fe0];
  [[0, 3.05, -.6, 0], [-3.0, 3.1, .3, 1], [3.0, 3.1, .3, 2]].forEach(p => {
    cIn.add(mk(gCyl, WOOD, .04, 1.1, .04, p[0], p[1] + .95, p[2], false));
    const g = new THREE.Group(); g.position.set(p[0], p[1] + 1.25, p[2]);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(.8, .5), new THREE.MeshBasicMaterial({ color: fcols[p[3]], side: THREE.DoubleSide }));
    f.position.x = .4; g.add(f); cIn.add(g); flags.push(g);
  });
}

/* ---------- wall segments (built from the pad) ---------- */
const walls = [];
{
  const ghostM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .2, depthWrite: false });
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI + (i + .5) * Math.PI / 5, len = 3.5;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * WALL_R * K, 0, wz(CY) + Math.sin(a) * WALL_R * K);
    g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    const solid = new THREE.Group();
    solid.add(mk(gBox, SAND, len, 1.25, .85, 0, .62, 0));
    for (let k = 0; k < 4; k++) solid.add(mk(gBox, SAND, .55, .36, .6, -1.3 + k * .87, 1.42, 0));
    const ghost = mk(gBox, ghostM, len, 1.25, .85, 0, .62, 0, false); ghost.receiveShadow = false;
    solid.visible = false; g.add(solid, ghost); scene.add(g);
    walls.push({ a, g, solid, ghost, built: false, hp: 0, shake: 0 });
  }
}
const WALL_ORDER = [2, 1, 3, 0, 4];
const WALL_COST = [15, 22, 30, 40, 52];
const FRIEND_COST = [20, 30, 45, 65, 90, 120];
const wallMax = () => 60 + 40 * S.wallLvl;

/* ---------- holes for friends ---------- */
const holes = [];
for (let j = 0; j < 6; j++) {
  const a = -Math.PI + (j + .5) * Math.PI / 6, x = CX + Math.cos(a) * HOLE_R, y = CY + Math.sin(a) * HOLE_R;
  const g = new THREE.Group(); g.position.set(wx(x), 0, wz(y));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(.62, 20), mat(0x4f3718)); disc.rotation.x = -Math.PI / 2; disc.position.y = .025; disc.receiveShadow = true; g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.66, .15, 6, 20), SAND_D); ring.rotation.x = Math.PI / 2; ring.position.y = .06; ring.receiveShadow = true; g.add(ring);
  scene.add(g); holes.push({ x, y });
}

/* ---------- characters ---------- */
function makeKid(trunk, hat, skinM) {
  const g = new THREE.Group(), sk = skinM || KID;
  const tm = mat(trunk), hm = mat(hat);
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-.17, .55, 0); legR.position.set(.17, .55, 0);
  legL.add(mk(gCyl, sk, .13, .55, .13, 0, -.27, 0)); legR.add(mk(gCyl, sk, .13, .55, .13, 0, -.27, 0));
  g.add(legL, legR);
  g.add(mk(gCyl, tm, .34, .32, .27, 0, .66, 0));
  g.add(mk(gCyl, sk, .3, .5, .24, 0, 1.0, 0));
  g.add(mk(gSph, sk, .36, .36, .36, 0, 1.55, 0));
  g.add(mk(gCyl, hm, .56, .05, .56, 0, 1.7, 0));
  g.add(mk(gHemi, hm, .33, .26, .33, 0, 1.7, 0));
  g.add(mk(gSph, BLACK, .05, .05, .05, -.12, 1.55, .33, false)); g.add(mk(gSph, BLACK, .05, .05, .05, .12, 1.55, .33, false));
  const armR = new THREE.Group(), armL = new THREE.Group();
  armR.position.set(.36, 1.2, 0); armL.position.set(-.36, 1.2, 0);
  armR.add(mk(gCyl, sk, .09, .5, .09, 0, -.25, 0)); armL.add(mk(gCyl, sk, .09, .5, .09, 0, -.25, 0));
  const ball = mk(gSph, BALL, .15, .15, .15, 0, -.56, 0, false); armR.add(ball);
  armR.rotation.x = -1.2; g.add(armR, armL);
  return { g, legL, legR, armR, armL, ball };
}

const BABY_GEO = new THREE.SphereGeometry(1, 12, 9);
function makeBaby(type, hue) {
  const big = type === 'big', crawl = type === 'crawl';
  const g = new THREE.Group(), bd = new THREE.Group(); g.add(bd);
  const skin = SKIN.clone(), dia = WHITE.clone();
  const cap = mat(big ? 0xff9a3c : new THREE.Color().setHSL(hue / 360, .75, .68).getHex());
  bd.add(mk(BABY_GEO, dia, .44, .36, .44, 0, .42, 0));
  bd.add(mk(BABY_GEO, skin, .34, .34, .3, 0, .8, 0));
  bd.add(mk(BABY_GEO, skin, .52, .5, .5, 0, 1.3, 0));
  bd.add(mk(gHemi, cap, .55, .5, .53, 0, 1.38, -.02));
  bd.add(mk(BABY_GEO, WHITE, .12, .12, .12, 0, 1.92, 0));
  const eyeL = mk(BABY_GEO, BLACK, .07, .07, .05, -.17, 1.32, .46, false), eyeR = mk(BABY_GEO, BLACK, .07, .07, .05, .17, 1.32, .46, false);
  bd.add(eyeL, eyeR);
  const mouth = mk(BABY_GEO, mat(0xd8434a), .08, .06, .04, 0, 1.12, .48, false); bd.add(mouth);
  const cheek = mat(0xff8a9a);
  bd.add(mk(BABY_GEO, cheek, .08, .06, .03, -.31, 1.2, .4, false), mk(BABY_GEO, cheek, .08, .06, .03, .31, 1.2, .4, false));
  const armL = new THREE.Group(), armR = new THREE.Group(); armL.position.set(-.34, .95, 0); armR.position.set(.34, .95, 0);
  armL.add(mk(gCyl, skin, .08, .42, .08, 0, -.2, 0)); armR.add(mk(gCyl, skin, .08, .42, .08, 0, -.2, 0)); bd.add(armL, armR);
  const fL = mk(BABY_GEO, skin, .12, .08, .16, -.18, .08, .06), fR = mk(BABY_GEO, skin, .12, .08, .16, .18, .08, .06); bd.add(fL, fR);
  const tearM = new THREE.MeshBasicMaterial({ color: 0x6fd3ff }), tears = [];
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(BABY_GEO, tearM); t.scale.setScalar(.06); t.visible = false; bd.add(t); tears.push(t); }
  const s = big ? 1.5 : crawl ? .92 : 1; g.scale.setScalar(s);
  if (crawl) { bd.rotation.x = .55; bd.position.y = -.1; armL.rotation.x = -1.2; armR.rotation.x = -1.2; }
  return { g, bd, skin, dia, cap, eyeL, eyeR, mouth, armL, armR, fL, fR, tears, s, crawl };
}
function setFlash(o, f) { const v = f * .7; o.skin.emissive.setRGB(v, v, v); o.dia.emissive.setRGB(v, v, v); o.cap.emissive.setRGB(v, v, v); }

/* ---------- particles (sand puffs) ---------- */
const NP = 160, pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pVel = new Float32Array(NP * 3), pLife = new Float32Array(NP);
for (let i = 0; i < NP; i++) pPos[i * 3 + 1] = -50;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 1.1, vertexColors: true, sizeAttenuation: true }));
pts.frustumCulled = false; scene.add(pts);
let pIdx = 0;
function puff(x, y, h, n, hex) {
  const c = new THREE.Color(hex);
  for (let k = 0; k < n; k++) {
    const i = pIdx++ % NP;
    pPos[i * 3] = wx(x); pPos[i * 3 + 1] = h; pPos[i * 3 + 2] = wz(y);
    pVel[i * 3] = rnd(-2, 2); pVel[i * 3 + 1] = rnd(1.5, 4); pVel[i * 3 + 2] = rnd(-2, 2);
    pLife[i] = rnd(.35, .6); pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;
  }
  pGeo.attributes.color.needsUpdate = true;
}
function updateParticles(dt) {
  for (let i = 0; i < NP; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt; pVel[i * 3 + 1] -= 14 * dt;
    pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    if (pLife[i] <= 0 || pPos[i * 3 + 1] < .02) { pLife[i] = 0; pPos[i * 3 + 1] = -50; }
  }
  pGeo.attributes.position.needsUpdate = true;
}

/* ---------- screen-space helpers (floating text) ---------- */
const _v = new THREE.Vector3();
function scr(x, y, h) { _v.set(wx(x), h, wz(y)).project(camera); return { l: (_v.x * .5 + .5) * 100, t: (-_v.y * .5 + .5) * 100 }; }
const floatPool = [];
for (let i = 0; i < 10; i++) { const d = document.createElement('div'); d.className = 'float'; d.hidden = true; fxHost.appendChild(d); floatPool.push({ d, life: 0, max: 1, x: 0, y: 0, h: 0 }); }
function floatText(txt, x, y, h) {
  const f = floatPool.find(p => p.life <= 0); if (!f) return;
  f.d.textContent = txt; f.life = f.max = 1.1; f.x = x; f.y = y; f.h = h; f.d.hidden = false;
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

let S, best = 0;
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
  const hurt = S.hp < 100 || walls.some((w, i) => w.built && w.hp < wallMax());
  return { name: 'Reparar', val: 'Castillo ' + Math.ceil(S.hp) + '/100', lvl: 'Recupera 35', cost: repairCost(), maxed: false, enabled: hurt };
}
function completePad(p) {
  const id = p.id;
  if (id === 'rate' || id === 'power' || id === 'range') S.up[id]++;
  else if (id === 'wall') {
    if (S.wallBuilt < 5) { const w = walls[WALL_ORDER[S.wallBuilt]]; w.built = true; w.hp = wallMax(); S.wallBuilt++; puff(CX + Math.cos(w.a) * WALL_R, CY + Math.sin(w.a) * WALL_R, .8, 14, 0xe8c680); }
    else { S.wallLvl++; walls.forEach(w => { if (w.built) w.hp = Math.min(wallMax(), w.hp + 40); }); }
  } else if (id === 'friend') {
    if (S.friends.length < 6) recruit(); else S.friendLvl++;
  } else {
    S.hp = Math.min(100, S.hp + 35);
    walls.forEach(w => { if (w.built) w.hp = Math.min(wallMax(), w.hp + .35 * wallMax()); });
  }
  p.prog = 0; p.acc = 0; p.key = ''; updateHud();
  puff(p.x, p.y, .3, 16, 0xfff3b0);
}

/* ---------- pads (flat squares on the sand) ---------- */
const padObjs = [];
PADS.forEach(p => {
  const c = document.createElement('canvas'); c.width = c.height = 192;
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const g = new THREE.Group(); g.position.set(wx(p.x), 0, wz(p.y));
  const slab = mk(gBox, PADM, 3.5, .14, 3.5, 0, .07, 0, false); g.add(slab);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  label.rotation.x = -Math.PI / 2; label.position.y = .155; g.add(label); scene.add(g);
  p.cv = c; p.tex = tex; p.slab = slab; p.prog = 0; p.acc = 0; p.key = '';
  padObjs.push(p);
});
function rrect(t, x, y, w, h, r) { t.beginPath(); t.moveTo(x + r, y); t.arcTo(x + w, y, x + w, y + h, r); t.arcTo(x + w, y + h, x, y + h, r); t.arcTo(x, y + h, x, y, r); t.arcTo(x, y, x + w, y, r); t.closePath(); }
function drawPad(p, st, active, can) {
  const t = p.cv.getContext('2d'); t.clearRect(0, 0, 192, 192);
  t.fillStyle = active ? 'rgba(255,250,224,.97)' : 'rgba(255,248,226,.86)'; rrect(t, 8, 8, 176, 176, 24); t.fill();
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
    t.fillStyle = '#e3d2a4'; rrect(t, 26, 136, 140, 14, 7); t.fill();
    if (p.prog > 0) { t.fillStyle = '#2fb86a'; rrect(t, 26, 136, Math.max(14, 140 * p.prog / st.cost), 14, 7); t.fill(); }
  }
  t.fillStyle = '#6b4e2a'; t.font = '700 15px Nunito, system-ui, sans-serif'; t.fillText(st.lvl, 96, 166);
  p.tex.needsUpdate = true;
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => padObjs.forEach(p => { p.key = ''; }));

/* ---------- state ---------- */
const kid = makeKid(0x2c6fe0, 0xffd23f); scene.add(kid.g); kid.g.scale.setScalar(1.15);
const ents = { babies: [], balls: [], drops: [], flies: [] };
function disposeBaby(b) { scene.remove(b.o.g); scene.remove(b.bar); b.o.skin.dispose(); b.o.dia.dispose(); b.o.cap.dispose(); }
const barBgM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .45, depthTest: false });
const barFgM = new THREE.MeshBasicMaterial({ color: 0xff5d4a, depthTest: false });
const gPlane = new THREE.PlaneGeometry(1, 1);
function makeBar() {
  const g = new THREE.Group(), bg = new THREE.Mesh(gPlane, barBgM), fg = new THREE.Mesh(gPlane, barFgM);
  bg.scale.set(1.1, .17, 1); fg.scale.set(1.04, .11, 1); fg.position.z = .01; bg.renderOrder = 5; fg.renderOrder = 6;
  g.add(bg, fg); g.userData.fg = fg; g.visible = false; scene.add(g); return g;
}

function newGame() {
  ents.babies.forEach(disposeBaby); ents.balls.forEach(b => scene.remove(b.m)); ents.drops.forEach(d => scene.remove(d.m)); ents.flies.forEach(f => scene.remove(f.m));
  if (S) S.friends.forEach(f => scene.remove(f.o.g));
  ents.babies = []; ents.balls = []; ents.drops = []; ents.flies = [];
  walls.forEach(w => { w.built = false; w.hp = 0; w.solid.visible = false; w.ghost.visible = true; w.solid.scale.y = 1; });
  padObjs.forEach(p => { p.prog = 0; p.acc = 0; p.key = ''; });
  S = {
    t: 0, hp: 100, shells: 0, wave: 1, kills: 0, spawnLeft: 0, spawnT: 0, gap: null, banner: 0, bannerTxt: '',
    over: false, shake: 0, bump: 0, hint: 9,
    up: { rate: 0, power: 0, range: 0 }, wallBuilt: 0, wallLvl: 0, friends: [], friendLvl: 0,
    player: { x: 180, y: 560, aim: -Math.PI / 2, fireT: 0, walk: 0, moving: false, kick: 0, face: 0 }
  };
  startWave(1); updateHud();
  $('hint').style.opacity = 1;
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
function recruit() {
  const j = S.friends.length, h = holes[j];
  const cols = [[0xe0457b, 0x7bd389], [0x2fb86a, 0xff8a3c], [0x8e5bd9, 0x3dc8e8], [0xff8a3c, 0xe0457b], [0x3dc8e8, 0xffd23f], [0x7bd389, 0x8e5bd9]][j];
  const o = makeKid(cols[0], cols[1], j % 2 ? mat(0xd99a6c) : mat(0xffd0a8));
  o.g.position.set(wx(h.x), -.55, wz(h.y)); o.g.scale.setScalar(.01); scene.add(o.g);
  S.friends.push({ x: h.x, y: h.y, o, cd: rnd(0, .6), aim: -Math.PI / 2, kick: 0, pop: 0, face: 0 });
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
  if (S.over || e.target.closest('button')) return;
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
$('again').addEventListener('click', () => { $('over').hidden = true; newGame(); });

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
  const o = makeBaby(type, Math.floor(Math.random() * 360)); scene.add(o.g);
  ents.babies.push({ type, x, y, hp: T.hp * hs, max: T.hp * hs, sp: T.sp * (.9 + Math.random() * .2), r: T.r, o, bar: makeBar(),
    state: 'walk', flash: 0, t: Math.random() * 6, atkT: Math.random() * .5, rate: T.rate, atk: T.atk, cryT: 0, fx: 0, fy: 0, inside: false, face: Math.PI / 2 });
}
function addDrop(x, y, kind, v) {
  const a = Math.random() * 6.283, s = 40 + Math.random() * 60;
  const m = kind === 'conch' ? mk(gSph, CREAM, .5, .24, .36, 0, 0, 0, false) : mk(gSph, PINK, .36, .15, .36, 0, 0, 0, false);
  scene.add(m);
  ents.drops.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind, v, t: 0, ph: Math.random() * 6, m });
}
function die(b) {
  S.kills++; b.state = 'cry'; b.cryT = 0; b.bar.visible = false;
  const dx = b.x - CX, dy = b.y - CY, d = Math.hypot(dx, dy) || 1; b.fx = dx / d; b.fy = dy / d;
  const o = b.o;
  o.eyeL.scale.set(.09, .015, .05); o.eyeR.scale.set(.09, .015, .05);
  o.mouth.scale.set(.15, .17, .06); o.armL.rotation.z = 2.5; o.armR.rotation.z = -2.5; o.armL.rotation.x = 0; o.armR.rotation.x = 0;
  o.tears.forEach(t => { t.visible = true; });
  const T = TYPES[b.type], n = T.drop[0] + Math.floor(Math.random() * (T.drop[1] - T.drop[0] + 1));
  for (let i = 0; i < n; i++) addDrop(b.x, b.y, 'shell', 1);
  if (b.type === 'big') addDrop(b.x, b.y, 'conch', 5);
  if (Math.random() < .6) floatText(['¡Buaaa!', '¡Uaaa!', '¡Buaaaa!'][Math.floor(Math.random() * 3)], b.x, b.y, 2.6);
}
function hitCastle(d) {
  S.hp = Math.max(0, S.hp - d); S.shake = .25;
  puff(CX + rnd(-40, 40), CY + 8, 1.6, 3, 0xd9b873); updateHud();
  if (S.hp <= 0) gameOver();
}
function hitWall(w, d) {
  w.hp -= d; w.shake = .2; puff(CX + Math.cos(w.a) * WALL_R, CY + Math.sin(w.a) * WALL_R, 1, 3, 0xd9b873);
  if (w.hp <= 0) { w.hp = 0; w.solid.visible = false; w.ghost.visible = true; puff(CX + Math.cos(w.a) * WALL_R, CY + Math.sin(w.a) * WALL_R, .8, 12, 0xd9b873); }
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
  const m = mk(gSph, BALL, .2, .2, .2, 0, 0, 0, false); scene.add(m);
  ents.balls.push({ x, y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, dist: 0, max, dmg, m });
}

function update(dt) {
  if (S.over) return;
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
          puff(bl.x, bl.y, 5, 1.2, 0xd4ad6a);
          if (b.hp <= 0) die(b);
          gone = true; break;
        }
      }
    }
    if (gone) { scene.remove(bl.m); ents.balls.splice(i, 1); }
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
      b.face = Math.atan2(dx, dy);
      if (blocked) { b.atkT -= dt; if (b.atkT <= 0) { b.atkT = b.rate; hitWall(blocked, b.atk); } }
      else if (d > CR + b.r * .3) { const m = b.sp * dt; b.x += dx / d * m; b.y += dy / d * m; }
      else { b.atkT -= dt; if (b.atkT <= 0) { b.atkT = b.rate; hitCastle(b.atk); if (S.over) return; } }
    } else {
      b.cryT += dt; b.x += b.fx * 110 * dt; b.y += b.fy * 110 * dt; b.face = Math.atan2(b.fx, b.fy);
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
  ents.babies = ents.babies.filter(b => {
    const dead = b.state === 'cry' && (b.cryT > 3.2 || b.x < -30 || b.x > W + 30 || b.y > H + 30 || b.y < 30);
    if (dead) disposeBaby(b); return !dead;
  });

  // drops (the magnet is built in)
  const magR = 78;
  for (let i = ents.drops.length - 1; i >= 0; i--) {
    const s = ents.drops[i]; s.t += dt;
    const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy);
    if (s.t > .35 && d < magR && d > .001) { const v = 240 + (magR - d) * 3; s.x += dx / d * v * dt; s.y += dy / d * v * dt; }
    else { s.x += s.vx * dt; s.y += s.vy * dt; const f = Math.pow(.02, dt); s.vx *= f; s.vy *= f; }
    s.x = clamp(s.x, 8, W - 8); s.y = clamp(s.y, 72, H - 8);
    if (d < 14 && s.t > .25) { S.shells += s.v; S.bump = .25; scene.remove(s.m); ents.drops.splice(i, 1); updateHud(); }
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
        for (let k = 0; k < Math.min(n, 2); k++) { const m = mk(gSph, PINK, .3, .12, .3, 0, 0, 0, false); scene.add(m); ents.flies.push({ m, t: 0, sx: p.x, sy: p.y, tx: ap.x, ty: ap.y }); }
      }
      if (ap.prog >= st.cost) completePad(ap);
    }
  }
  for (let i = ents.flies.length - 1; i >= 0; i--) {
    const f = ents.flies[i]; f.t += dt / .35;
    if (f.t >= 1) { scene.remove(f.m); ents.flies.splice(i, 1); }
  }

  // wall repairs visuals
  for (const w of walls) { w.shake = Math.max(0, w.shake - dt); }

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
  for (const f of floatPool) if (f.life > 0) { f.life -= dt; f.h += 1.2 * dt; if (f.life <= 0) f.d.hidden = true; }
}

/* ---------- scene sync ---------- */
const lerpAng = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };
function sync(now) {
  const p = S.player, k = kid;
  k.g.position.set(wx(p.x), Math.abs(Math.sin(p.walk * 13)) * (p.moving ? .08 : 0), wz(p.y));
  p.face = lerpAng(p.face, Math.PI / 2 - p.aim, .25); k.g.rotation.y = p.face;
  const w = p.moving ? Math.sin(p.walk * 13) * .7 : 0;
  k.legL.rotation.x = w; k.legR.rotation.x = -w; k.armL.rotation.x = -w * .8;
  k.armR.rotation.x = -1.2 + p.kick * 5;

  S.friends.forEach(f => {
    const e = 1 - Math.pow(1 - f.pop, 3);
    f.o.g.scale.setScalar(Math.max(.01, e * 1.05));
    f.o.g.position.y = -.55 + Math.sin(now * 2 + f.x) * .02;
    f.face = lerpAng(f.face, Math.PI / 2 - f.aim, .2); f.o.g.rotation.y = f.face;
    f.o.armR.rotation.x = -1.2 + f.kick * 5;
  });

  for (const b of ents.babies) {
    const o = b.o, cry = b.state === 'cry';
    o.g.position.set(wx(b.x), 0, wz(b.y));
    o.g.rotation.y = lerpAng(o.g.rotation.y, b.face, .25);
    const rate = cry ? 22 : (b.type === 'crawl' ? 16 : 9);
    o.bd.rotation.z = Math.sin(b.t * rate) * (cry ? .14 : .1);
    o.bd.position.y = (o.crawl ? -.1 : 0) + Math.abs(Math.sin(b.t * rate)) * .07;
    if (!cry) { const sw = Math.sin(b.t * rate) * .6; o.fL.position.z = .06 + sw * .12; o.fR.position.z = .06 - sw * .12; if (!o.crawl) { o.armL.rotation.x = sw; o.armR.rotation.x = -sw; } }
    setFlash(o, b.flash > 0 ? b.flash / .12 : 0);
    if (cry) o.tears.forEach((t, i) => { const ph = (b.cryT * 1.6 + i * .25) % 1, sd = i % 2 ? 1 : -1; t.position.set(sd * (.2 + ph * .2), 1.25 - ph * .6, .45); });
    const bar = b.bar;
    bar.visible = b.state === 'walk' && b.hp < b.max;
    if (bar.visible) {
      bar.position.set(wx(b.x), 2.05 * o.s + .35, wz(b.y)); bar.quaternion.copy(camera.quaternion);
      const f = clamp(b.hp / b.max, .02, 1), fg = bar.userData.fg; fg.scale.x = 1.04 * f; fg.position.x = -(1 - f) * .52;
    }
  }
  for (const bl of ents.balls) bl.m.position.set(wx(bl.x), 1.05, wz(bl.y));
  for (const s of ents.drops) { s.m.position.set(wx(s.x), .2 + Math.sin(now * 4 + s.ph) * .06, wz(s.y)); s.m.rotation.y = now * 2 + s.ph; }
  for (const f of ents.flies) {
    const t = f.t, e = t * t * (3 - 2 * t);
    f.m.position.set(wx(f.sx + (f.tx - f.sx) * e), 1.2 + Math.sin(t * Math.PI) * 1.4, wz(f.sy + (f.ty - f.sy) * e));
  }

  // castle and walls
  const hf = clamp(S.hp / 100, 0, 1);
  cIn.scale.y = .72 + .28 * hf;
  castle.position.x = S.shake > 0 ? Math.sin(now * 90) * S.shake * .5 : 0;
  flags.forEach((g, i) => { g.rotation.y = Math.sin(now * 5 + i) * .35; });
  for (const w of walls) {
    if (!w.built) continue;
    const f = clamp(w.hp / wallMax(), 0, 1);
    w.solid.visible = w.hp > 0; w.ghost.visible = w.hp <= 0;
    w.solid.scale.y = .55 + .45 * f; w.solid.position.x = w.shake > 0 ? Math.sin(now * 80) * w.shake * .3 : 0;
  }
  foam.position.z = -12.2 + Math.sin(now * 1.4) * .45; foam2.position.z = -12.8 + Math.sin(now * 1.4 + 1.3) * .35;

  // pads
  for (const pad of padObjs) {
    const st = padState(pad), active = S.activePad === pad;
    const can = !st.maxed && st.enabled && S.shells >= Math.max(1, st.cost - pad.prog) && st.cost > 0;
    const key = [st.name, st.val, st.lvl, st.cost, pad.prog, st.maxed, st.enabled, active, can].join('|');
    if (key !== pad.key) { pad.key = key; drawPad(pad, st, active, can); }
    const pulse = can ? 1 + Math.sin(now * 6) * .03 : 1; pad.slab.scale.set(3.5 * pulse, .14, 3.5 * pulse);
  }

  // DOM overlays
  $('shellChip').style.transform = S.bump > 0 ? 'scale(' + (1 + S.bump * .6) + ')' : '';
  const bn = $('banner');
  if (S.banner > 0 && !S.over) { const a = Math.min(1, S.banner / .5); bn.textContent = S.bannerTxt; bn.style.opacity = a; bn.style.transform = 'scale(' + (1 + (1 - a) * .15) + ')'; } else bn.style.opacity = 0;
  $('hint').style.opacity = S.hint > 0 && !S.over ? Math.min(1, S.hint / 1.2) : 0;
  for (const f of floatPool) if (f.life > 0) {
    const q = scr(f.x, f.y, f.h);
    f.d.style.left = q.l + '%'; f.d.style.top = q.t + '%'; f.d.style.opacity = Math.min(1, f.life / .4);
  }
}

/* ---------- loop ---------- */
newGame();
let last = 0;
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  update(dt); sync(ts / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(() => { fit(); requestAnimationFrame(frame); });
})();
