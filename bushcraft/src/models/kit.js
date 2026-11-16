import * as THREE from 'three';
import { rng, range, mat, shadowed, speckle, canvasTexture } from './util.js';

// Every piece of kit is built from code: no model files to download.
// Logs and sticks lie along the X axis, centred on the origin.

let endTex;
function endGrain() {
  endTex ??= canvasTexture(256, (ctx, s) => {
    const r = rng(3);
    ctx.fillStyle = '#d8b98a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 14; i > 0; i--) {
      ctx.strokeStyle = `rgba(150,105,60,${0.25 + r() * 0.3})`;
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath();
      ctx.arc(s / 2 + range(r, -3, 3), s / 2 + range(r, -3, 3), (i / 14) * s * 0.46, 0, 7);
      ctx.stroke();
    }
    ctx.fillStyle = '#9b7046';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, 5, 0, 7);
    ctx.fill();
  });
  return endTex;
}

function barkGeo(len, rad, seed, radial = 14) {
  const r = rng(seed);
  const geo = new THREE.CylinderGeometry(rad, rad * 1.04, len, radial, Math.max(4, Math.round(len * 14)));
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const phase = r() * 10;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const side = Math.hypot(v.x, v.z);
    if (side > rad * 0.9) {
      // Bark ridges plus a gentle wobble along the length.
      const ang = Math.atan2(v.z, v.x);
      const k = 1 + 0.06 * Math.sin(ang * 7 + v.y * 9 + phase) + 0.04 * (r() - 0.5);
      v.x *= k;
      v.z *= k;
    }
    v.x += Math.sin(v.y * 2.2 + phase) * rad * 0.15;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  geo.rotateZ(Math.PI / 2);
  return geo;
}

export function log(len = 0.6, rad = 0.05, seed = 1, bark = '#5b4330') {
  const r = rng(seed);
  const geo = speckle(barkGeo(len, rad, seed), bark, 0.12, r, 0);
  const barkMat = mat('#ffffff', { vertexColors: true, roughness: 0.95 });
  const endMat = mat('#ffffff', { map: endGrain(), roughness: 0.9 });
  const m = new THREE.Mesh(geo, [barkMat, endMat, endMat]);
  return shadowed(m);
}

export function stick(len, rad, seed = 1, color = '#6b5038') {
  const r = rng(seed);
  const geo = speckle(barkGeo(len, rad, seed, 7), color, 0.1, r);
  const m = mat('#ffffff', { vertexColors: true, roughness: 0.95 });
  return shadowed(new THREE.Mesh(geo, m));
}

// A pile of sticks of one thickness, laid roughly parallel.
export function pile(count, len, rad, seed, color) {
  const g = new THREE.Group();
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const s = stick(len * range(r, 0.85, 1.1), rad * range(r, 0.85, 1.15), seed * 31 + i, color);
    const row = Math.floor(i / 4);
    s.position.set(range(r, -0.03, 0.03), rad + row * rad * 1.7, (i % 4 - 1.5) * rad * 2.3 + range(r, -0.01, 0.01));
    s.rotation.y = range(r, -0.12, 0.12);
    g.add(s);
  }
  return g;
}

export function fireBowl() {
  const g = new THREE.Group();
  const steel = mat('#3b3d3e', { metalness: 0.55, roughness: 0.6 });
  const profile = [
    [0, 0.26], [0.18, 0.265], [0.33, 0.29], [0.43, 0.35], [0.48, 0.42], [0.5, 0.43], [0.505, 0.445],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), steel);
  bowl.material.side = THREE.DoubleSide;
  g.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 8, 64), steel);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.44;
  g.add(rim);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 8), steel);
    leg.position.set(Math.cos(a) * 0.22, 0.14, Math.sin(a) * 0.22);
    leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 12), steel);
    foot.position.set(Math.cos(a) * 0.28, 0.006, Math.sin(a) * 0.28);
    g.add(foot);
  }
  return shadowed(g);
}

export function bucket() {
  const g = new THREE.Group();
  const zinc = mat('#a9b2b6', { metalness: 0.6, roughness: 0.45 });
  const profile = [[0, 0.004], [0.13, 0.004], [0.165, 0.3], [0.172, 0.31]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 36), zinc);
  body.material.side = THREE.DoubleSide;
  g.add(body);
  for (const y of [0.08, 0.2]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.13 + y * 0.118, 0.006, 6, 40), zinc);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.158, 36), mat('#3f6f8a', { roughness: 0.15, metalness: 0.1 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.26;
  water.name = 'water';
  g.add(water);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.006, 6, 32, Math.PI), mat('#6f7578', { metalness: 0.6 }));
  handle.position.y = 0.3;
  handle.rotation.z = 0;
  handle.rotation.y = Math.PI / 2;
  g.add(handle);
  return shadowed(g);
}

export function fireBlanket() {
  const g = new THREE.Group();
  const red = mat('#c8342b', { roughness: 0.7 });
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.26), red);
  pouch.position.y = 0.03;
  g.add(pouch);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.17),
    new THREE.MeshStandardMaterial({
      map: canvasTexture(256, (ctx, s) => {
        ctx.fillStyle = '#c8342b';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${s * 0.16}px Archivo Narrow, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('FIRE', s / 2, s * 0.42);
        ctx.fillText('BLANKET', s / 2, s * 0.62);
      }),
    }),
  );
  label.rotation.x = -Math.PI / 2;
  label.position.y = 0.061;
  g.add(label);
  for (const x of [-0.08, 0.08]) {
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.06), mat('#1f1f1f'));
    tab.position.set(x, 0.066, -0.15);
    g.add(tab);
  }
  return shadowed(g);
}

export function firstAid() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.16), mat('#2f8a4a', { roughness: 0.6 }));
  box.position.y = 0.05;
  g.add(box);
  const white = mat('#ffffff', { roughness: 0.5 });
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.024), white);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.004, 0.08), white);
  a.position.y = b.position.y = 0.102;
  g.add(a, b);
  return shadowed(g);
}

export function groundsheet(w = 1.15, d = 0.7) {
  const sheet = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.01, d),
    mat('#5d6b4a', { roughness: 0.9 }),
  );
  sheet.position.y = 0.005;
  return shadowed(sheet, false, true);
}

export function cottonWool(seed = 2) {
  const r = rng(seed);
  const geo = new THREE.IcosahedronGeometry(0.05, 3);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).multiplyScalar(1 + (r() - 0.5) * 0.35);
    v.y *= 0.6;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat('#f6f3ee', { roughness: 1 }));
  m.position.y = 0.03;
  return shadowed(m);
}

// Curls of birch bark: papery, white outside with dark marks.
export function birchBark(seed = 4) {
  const r = rng(seed);
  const tex = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#efe9dc';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(40,35,30,${range(r, 0.4, 0.8)})`;
      ctx.fillRect(r() * s, r() * s, range(r, 6, 20), range(r, 1, 3));
    }
  });
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const curl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.09, 16, 1, true, 0, range(r, 3.5, 5.5)),
      mat('#ffffff', { map: tex, side: THREE.DoubleSide, roughness: 0.8 }),
    );
    curl.rotation.set(Math.PI / 2, 0, range(r, -0.8, 0.8));
    curl.position.set(range(r, -0.04, 0.04), 0.025, range(r, -0.04, 0.04));
    g.add(curl);
  }
  return shadowed(g);
}

export function ferroRod() {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.11, 10), mat('#4a4a4c', { metalness: 0.7, roughness: 0.4 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.x = 0.075;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.075, 12), mat('#e3a21a', { roughness: 0.5 }));
  handle.rotation.z = Math.PI / 2;
  g.add(rod, handle);
  return shadowed(g);
}

export function striker() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.026), mat('#c9ced1', { metalness: 0.8, roughness: 0.3 }));
  const hole = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.002, 6, 12), mat('#888'));
  hole.rotation.x = Math.PI / 2;
  hole.position.x = -0.02;
  const g = new THREE.Group();
  g.add(m, hole);
  return shadowed(g);
}

// A broad flat arrow painted on the ground to show which way the wind blows.
export function windArrow(len = 1.4) {
  const s = new THREE.Shape();
  const w = 0.09, head = 0.24;
  s.moveTo(-len / 2, -w);
  s.lineTo(len / 2 - head, -w);
  s.lineTo(len / 2 - head, -w * 2.4);
  s.lineTo(len / 2, 0);
  s.lineTo(len / 2 - head, w * 2.4);
  s.lineTo(len / 2 - head, w);
  s.lineTo(-len / 2, w);
  s.closePath();
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#2d7fb0', transparent: true, opacity: 0.75, depthWrite: false }));
  m.position.y = 0.02;
  return m;
}

// A rope ring on the ground marking the edge of the fire circle.
export function ropeRing(radius = 1.75) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 6, 120), mat('#d9c38f', { roughness: 0.9 }));
  m.rotation.x = Math.PI / 2;
  m.position.y = 0.012;
  return shadowed(m);
}

export function seatLog(seed) {
  const g = new THREE.Group();
  const l = log(0.85, 0.11, seed, '#6a5136');
  l.position.y = 0.1;
  g.add(l);
  return g;
}

// An invisible point to pin a label to.
export function marker(h = 0.001) {
  const o = new THREE.Object3D();
  o.position.y = h;
  return o;
}
