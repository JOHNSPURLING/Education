import * as THREE from 'three';
import { mat, shadowed, canvasTexture } from './util.js';
import { paintMap } from '../map.js';

// Kit for the navigation lesson: a paper map of the practice area, a baseplate
// compass, a phone, a whistle, a torch and a survival bag. ~1 unit = 1 m, but the
// compass and phone are drawn several times life size so they can be read.

// --- Paper map -------------------------------------------------------------------

// The paper map covers eastings e0..e1 and northings n0..n1 of the practice map.
export const SHEET = { e0: 47.5, e1: 50.5, n0: 29.9, n1: 31.95, width: 2.6 };
SHEET.height = (SHEET.width * (SHEET.n1 - SHEET.n0)) / (SHEET.e1 - SHEET.e0);
SHEET.unit = SHEET.width / (SHEET.e1 - SHEET.e0); // world units per grid square

// Where a grid position falls on the sheet, in the sheet's own flat coordinates
// (x east, z south), with the sheet centred on its origin.
export function onSheet(e, n) {
  return [(e - (SHEET.e0 + SHEET.e1) / 2) * SHEET.unit, ((SHEET.n0 + SHEET.n1) / 2 - n) * SHEET.unit];
}

export function paperMap() {
  const PX = 1024, PY = Math.round((PX * SHEET.height) / SHEET.width);
  const tex = canvasTexture(1, () => {});
  const cv = document.createElement('canvas');
  cv.width = PX * 2;
  cv.height = PY * 2;
  const ctx = cv.getContext('2d');
  ctx.scale(2, 2);
  const S = PX / (SHEET.e1 - SHEET.e0);
  const ox = -SHEET.e0 * S, oy = SHEET.n1 * S;
  paintMap(ctx, PX, PY, ox, oy, S);

  // Large grid numbers in the margins, so they read in 3D.
  ctx.font = '700 26px "Archivo Narrow", sans-serif';
  ctx.fillStyle = '#2f6f9e';
  for (let e = Math.ceil(SHEET.e0); e <= SHEET.e1; e++) {
    const x = ox + e * S;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(246,243,234,0.85)';
    ctx.fillRect(x - 20, PY - 34, 40, 30);
    ctx.fillStyle = '#2f6f9e';
    ctx.fillText(String(e), x, PY - 10);
  }
  for (let n = Math.ceil(SHEET.n0); n <= SHEET.n1; n++) {
    const y = oy - n * S;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(246,243,234,0.85)';
    ctx.fillRect(6, y - 15, 40, 30);
    ctx.fillStyle = '#2f6f9e';
    ctx.fillText(String(n), 10, y + 9);
  }
  // Camp 3, a north arrow and a fold line or two.
  const [cx, cy] = [ox + 49.1 * S, oy - 30.9 * S];
  ctx.strokeStyle = '#7a2a8a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 11);
  ctx.lineTo(cx + 10, cy + 7);
  ctx.lineTo(cx - 10, cy + 7);
  ctx.closePath();
  ctx.stroke();
  ctx.font = '600 15px "Archivo Narrow", sans-serif';
  ctx.fillStyle = '#7a2a8a';
  ctx.textAlign = 'left';
  ctx.fillText('Camp 3', cx + 14, cy + 5);
  ctx.save();
  ctx.translate(PX - 40, 50);
  ctx.fillStyle = '#1d3540';
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(11, 12);
  ctx.lineTo(0, 5);
  ctx.lineTo(-11, 12);
  ctx.closePath();
  ctx.fill();
  ctx.font = '700 18px "Archivo Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, 32);
  ctx.restore();
  ctx.strokeStyle = 'rgba(80,70,50,0.18)';
  ctx.lineWidth = 2;
  for (const f of [1 / 3, 2 / 3]) {
    ctx.beginPath();
    ctx.moveTo(PX * f, 0);
    ctx.lineTo(PX * f, PY);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, PY / 2);
  ctx.lineTo(PX, PY / 2);
  ctx.stroke();
  ctx.strokeStyle = '#1d3540';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, PX - 3, PY - 3);

  tex.image = cv;
  tex.needsUpdate = true;
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(SHEET.width, SHEET.height),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
  );
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.y = 0.012;
  sheet.receiveShadow = true;
  const g = new THREE.Group();
  g.add(sheet);
  return g;
}

// A glowing strip or square drawn on the map, in sheet coordinates.
export function highlight(w, d, color = '#f4c430', opacity = 0.55) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.016;
  m.renderOrder = 2;
  return m;
}

// Ten little marks across a grid square, for estimating tenths.
export function tenthsScale() {
  const g = new THREE.Group();
  const u = SHEET.unit;
  const m = new THREE.MeshBasicMaterial({ color: '#1d3540' });
  for (let i = 0; i <= 10; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, i % 5 ? 0.05 : 0.09), m);
    tick.position.set((i / 10) * u, 0.02, 0);
    g.add(tick);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(u, 0.004, 0.008), m);
  bar.position.set(u / 2, 0.02, -0.02);
  g.add(bar);
  return g;
}

// A map pin standing on a point.
export function pin(color = '#c8342b') {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 12), mat(color, { roughness: 0.4 }));
  head.position.y = 0.26;
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.002, 0.24, 6), mat('#c9ced1', { metalness: 0.7 }));
  needle.position.y = 0.12;
  g.add(head, needle);
  return shadowed(g);
}

// --- Compass --------------------------------------------------------------------

const RED = '#d23a2a';

function baseplateTexture() {
  return canvasTexture(512, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(225,238,240,0.55)';
    ctx.fillRect(0, 0, s, s);
    // Direction of travel arrow at the front (top of the texture).
    ctx.fillStyle = '#1d3540';
    ctx.beginPath();
    ctx.moveTo(s / 2, 14);
    ctx.lineTo(s / 2 + 34, 80);
    ctx.lineTo(s / 2 + 10, 80);
    ctx.lineTo(s / 2 + 10, 150);
    ctx.lineTo(s / 2 - 10, 150);
    ctx.lineTo(s / 2 - 10, 80);
    ctx.lineTo(s / 2 - 34, 80);
    ctx.closePath();
    ctx.fill();
    // Ruler along one edge.
    ctx.strokeStyle = '#1d3540';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const y = 20 + i * 12;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(i % 5 ? 14 : 26, y);
      ctx.stroke();
    }
    // Index line where the bearing is read.
    ctx.fillStyle = '#1d3540';
    ctx.fillRect(s / 2 - 3, 160, 6, 30);
  });
}

function bezelTexture() {
  return canvasTexture(512, (ctx, s) => {
    const c = s / 2;
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(240,244,244,0.25)';
    ctx.beginPath();
    ctx.arc(c, c, c * 0.8, 0, Math.PI * 2);
    ctx.fill();
    // Orienting lines and arrow (fixed to the dial, pointing to N).
    ctx.strokeStyle = RED;
    ctx.lineWidth = 3;
    for (const x of [-60, -30, 30, 60]) {
      ctx.beginPath();
      ctx.moveTo(c + x, c - 150);
      ctx.lineTo(c + x, c + 150);
      ctx.stroke();
    }
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(c, c - 150);
    ctx.lineTo(c + 22, c - 105);
    ctx.lineTo(c + 10, c - 105);
    ctx.lineTo(c + 10, c + 40);
    ctx.lineTo(c - 10, c + 40);
    ctx.lineTo(c - 10, c - 105);
    ctx.lineTo(c - 22, c - 105);
    ctx.closePath();
    ctx.stroke();
    // Degree ring.
    ctx.fillStyle = '#1d3540';
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.arc(c, c, c * 0.8, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    for (let d = 0; d < 360; d += 2) {
      const a = (d * Math.PI) / 180 - Math.PI / 2;
      const r1 = c * 0.97, r0 = c * (d % 10 ? 0.92 : 0.88);
      ctx.lineWidth = d % 10 ? 1.5 : 3;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.font = '700 30px "Archivo Narrow", sans-serif';
    for (const [d, t] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) {
      const a = (d * Math.PI) / 180;
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(a);
      ctx.fillText(t, 0, -c * 0.82 + 0);
      ctx.restore();
    }
  });
}

// A baseplate compass lying flat, direction of travel pointing to local -Z.
// Returns { group, housing, needle }: turn `housing` to set a bearing; the needle is
// kept pointing north by the lesson.
export function compass() {
  const group = new THREE.Group();
  const W = 0.34, L = 0.56;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.012, L),
    [
      mat('#cfe0e2', { transparent: true, opacity: 0.6, roughness: 0.2 }),
      mat('#cfe0e2', { transparent: true, opacity: 0.6, roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ map: baseplateTexture(), transparent: true, roughness: 0.25 }),
      mat('#cfe0e2', { transparent: true, opacity: 0.6 }),
      mat('#cfe0e2', { transparent: true, opacity: 0.6 }),
      mat('#cfe0e2', { transparent: true, opacity: 0.6 }),
    ],
  );
  plate.position.y = 0.006;
  plate.castShadow = true;
  group.add(plate);

  const housing = new THREE.Group();
  housing.position.set(0, 0.012, 0.09);
  const ringR = 0.14;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(ringR, ringR, 0.04, 48, 1, true), mat('#1d3540', { side: THREE.DoubleSide }));
  rim.position.y = 0.02;
  const face = new THREE.Mesh(new THREE.CircleGeometry(ringR, 48), new THREE.MeshStandardMaterial({ map: bezelTexture(), transparent: true, roughness: 0.3 }));
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.006;
  housing.add(rim, face);
  group.add(housing);

  // Needle: red end points north. Built pointing to local -Z.
  const needle = new THREE.Group();
  const half = (color, dir) => {
    const s = new THREE.Shape();
    s.moveTo(0, dir * 0.115);
    s.lineTo(0.018, 0);
    s.lineTo(-0.018, 0);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return new THREE.Mesh(geo, mat(color, { roughness: 0.4 }));
  };
  needle.add(half(RED, 1), half('#f2f2f2', -1));
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 12), mat('#888'));
  needle.add(pivot);
  needle.position.y = 0.02;
  housing.add(needle);
  // Glass on top.
  const glass = new THREE.Mesh(new THREE.CircleGeometry(ringR, 48), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.05 }));
  glass.rotation.x = -Math.PI / 2;
  glass.position.y = 0.04;
  housing.add(glass);

  // The red "direction of travel" side points to -Z because texture top = -Z.
  return { group: shadowed(group, true, false), housing, needle };
}

// --- Finding help ---------------------------------------------------------------

export function whistle() {
  const g = new THREE.Group();
  const orange = mat('#f07a1a', { roughness: 0.45 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 20), orange);
  body.rotation.z = Math.PI / 2;
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.05), orange);
  mouth.position.x = -0.08;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.04), mat('#1a1a1a'));
  slot.position.set(0.0, 0.034, 0);
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 6, 16), mat('#2f6f9e'));
  cord.position.x = 0.07;
  g.add(body, mouth, slot, cord);
  return shadowed(g);
}

export function survivalBag() {
  const g = new THREE.Group();
  const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.75, 6, 16), mat('#f07a1a', { roughness: 0.55 }));
  bag.rotation.z = Math.PI / 2;
  bag.scale.set(1, 1, 0.7);
  bag.position.y = 0.14;
  g.add(bag);
  const mat2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.32), mat('#2f6f9e'));
  mat2.position.set(0.85, 0.01, 0.1);
  g.add(mat2);
  return shadowed(g);
}

export function torch() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 16), mat('#2b2b2b', { metalness: 0.4, roughness: 0.5 }));
  body.rotation.z = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.032, 0.06, 16), mat('#2b2b2b', { metalness: 0.4 }));
  head.rotation.z = Math.PI / 2;
  head.position.x = 0.14;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshBasicMaterial({ color: '#fff6d8' }));
  lens.rotation.y = Math.PI / 2;
  lens.position.x = 0.171;
  g.add(body, head, lens);
  // The beam: a soft additive cone along +X.
  const beamGeo = new THREE.ConeGeometry(0.5, 2.4, 32, 1, true);
  beamGeo.translate(0, -1.2, 0);
  beamGeo.rotateZ(Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.x = 0.17;
  g.add(beam);
  const light = new THREE.SpotLight('#fff3c4', 0, 6, 0.35, 0.5, 1);
  light.position.x = 0.17;
  light.target.position.set(3, 0, 0);
  g.add(light, light.target);
  shadowed(body);
  // `on` from 0 to 1 sets the beam brightness.
  let on = 0;
  g.userData.beam = {
    get v() { return on; },
    set v(x) { on = x; beamMat.opacity = 0.2 * x; lens.material.color.set(x > 0.5 ? '#fffbe8' : '#8a8578'); light.intensity = 8 * x; },
  };
  g.userData.beam.v = 0;
  return g;
}

// --- Phone ------------------------------------------------------------------------

function screen(draw) {
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#10181c';
    ctx.fillRect(0, 0, s, s);
    ctx.save();
    ctx.scale(1, 1);
    draw(ctx, s);
    ctx.restore();
  });
}

// Screens for the phone, keyed by name. The texture is square; the screen plane
// stretches it to the phone's tall shape, so text is drawn squashed to suit.
export function phoneScreens() {
  const text = (ctx, t, y, size, color = '#ffffff', weight = 700) => {
    ctx.save();
    ctx.scale(1, 0.5);
    ctx.font = `${weight} ${size}px "Archivo Narrow", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(t, 256, y * 2);
    ctx.restore();
  };
  return {
    dial: screen((ctx) => {
      text(ctx, 'Emergency call', 60, 44, '#9fb3bb', 600);
      text(ctx, '999', 190, 150);
      text(ctx, 'or 112', 260, 50, '#9fb3bb', 600);
      ctx.fillStyle = '#2fa05a';
      ctx.beginPath();
      ctx.ellipse(256, 410, 70, 35, 0, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'CALL', 425, 44);
    }),
    ask: screen((ctx) => {
      text(ctx, 'Calling 999…', 60, 46, '#9fb3bb', 600);
      text(ctx, 'Ask for', 150, 52, '#9fb3bb', 600);
      text(ctx, 'POLICE', 240, 96, '#f4c430');
      text(ctx, 'then', 300, 46, '#9fb3bb', 600);
      text(ctx, 'MOUNTAIN', 380, 80, '#f4c430');
      text(ctx, 'RESCUE', 450, 80, '#f4c430');
    }),
    where: screen((ctx) => {
      text(ctx, 'Tell them where you are', 60, 40, '#9fb3bb', 600);
      text(ctx, 'Grid ref', 160, 56, '#9fb3bb', 600);
      text(ctx, '491 309', 260, 120, '#ffffff');
      text(ctx, 'Camp 3, Mill Pond', 340, 46, '#f4c430', 600);
      text(ctx, 'What happened? How many?', 440, 30, '#9fb3bb', 600);
    }),
    sms: screen((ctx) => {
      text(ctx, 'To: 999', 50, 40, '#9fb3bb', 600);
      ctx.fillStyle = '#2f6f9e';
      ctx.beginPath();
      ctx.roundRect(40, 110, 432, 290, 30);
      ctx.fill();
      text(ctx, 'Police. Lost near', 170, 44);
      text(ctx, 'Mill Pond, grid', 225, 44);
      text(ctx, 'ref 491 309. 3 of us,', 280, 44);
      text(ctx, 'all OK, one cold.', 335, 44);
      text(ctx, 'Register first: text REGISTER to 999', 460, 30, '#f4c430', 600);
    }),
  };
}

export function phone() {
  const g = new THREE.Group();
  const W = 0.3, H = 0.62;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, H), mat('#1c1f22', { roughness: 0.4, metalness: 0.3 }));
  g.add(body);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, H * 0.92), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  glass.rotation.x = -Math.PI / 2;
  glass.position.y = 0.0155;
  g.add(glass);
  g.userData.glass = glass;
  return shadowed(g, true, false);
}
