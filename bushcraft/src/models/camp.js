import * as THREE from 'three';
import { rng, range, mat, shadowed, speckle, canvasTexture } from './util.js';
import { log, stick } from './kit.js';

// Kit for the shelter lesson: trees, rope, tarp, pegs, leaf beds and the parts of a
// debris shelter. Same conventions as kit.js: built from code, ~1 unit = 1 m.

const AUTUMN = ['#9b6a35', '#b07a3c', '#7d5530', '#8a6a3a', '#a0582c', '#6f5a33'];

// A texture of fallen leaves, shared by every leaf pile and the debris shelter.
let leafTex;
function leaves() {
  if (leafTex) return leafTex;
  leafTex = canvasTexture(512, (ctx, s) => {
    const r = rng(9);
    ctx.fillStyle = '#6e4c2b';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      const x = r() * s, y = r() * s, l = range(r, 9, 18);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * Math.PI * 2);
      ctx.fillStyle = AUTUMN[(r() * AUTUMN.length) | 0];
      ctx.strokeStyle = 'rgba(50,30,15,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, l, l * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-l, 0);
      ctx.lineTo(l, 0);
      ctx.stroke();
      ctx.restore();
    }
  });
  leafTex.wrapS = leafTex.wrapT = THREE.RepeatWrapping;
  return leafTex;
}

function leafMat(repeat) {
  const map = leaves().clone();
  map.repeat.set(...repeat);
  map.needsUpdate = true;
  return mat('#ffffff', { map, roughness: 1, side: THREE.DoubleSide });
}

// A tree trunk with a rounded canopy of leafy clumps.
export function tree({ seed = 1, height = 2.4, rad = 0.13, canopy = '#5f7f3e' } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  const trunk = log(height + 0.2, rad, seed, '#5d5144');
  trunk.rotation.z = Math.PI / 2;
  trunk.position.y = height / 2 - 0.1;
  g.add(trunk);

  const leaf = mat('#ffffff', { vertexColors: true, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 9; i++) {
    const s = range(r, 0.38, 0.62);
    const geo = speckle(new THREE.IcosahedronGeometry(s, 1), canopy, 0.16, r);
    const blob = new THREE.Mesh(geo, leaf);
    const a = r() * Math.PI * 2, d = i === 0 ? 0 : range(r, 0.35, 0.75);
    blob.position.set(Math.cos(a) * d, height + range(r, -0.15, 0.55), Math.sin(a) * d);
    blob.scale.y = 0.8;
    g.add(blob);
  }
  // A couple of branches showing below the canopy.
  for (let i = 0; i < 2; i++) {
    const b = stick(0.7, 0.035, seed * 10 + i, '#5d5144');
    b.position.set(0, height - 0.35 - i * 0.2, 0);
    b.rotation.set(0, r() * 6, 0.5);
    b.position.x += Math.cos(-b.rotation.y) * 0.28;
    b.position.z += Math.sin(-b.rotation.y) * 0.28;
    g.add(b);
  }
  return shadowed(g);
}

// A dead branch, grey and leafless, caught up in a tree: a "widowmaker".
export function deadBranch(seed = 3) {
  const g = new THREE.Group();
  const main = stick(1.1, 0.045, seed, '#8b8378');
  g.add(main);
  const twig = stick(0.4, 0.018, seed + 1, '#8b8378');
  twig.position.set(0.25, 0.06, 0.05);
  twig.rotation.z = 0.6;
  g.add(twig);
  return shadowed(g);
}

// A flat ring painted on the ground, used for "good spot" and "not here".
export function groundRing(radius, color) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.045, radius, 64),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  return m;
}

// A puddle sitting in a hollow.
export function puddle(w = 0.7, d = 0.45) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), mat('#4f7f9c', { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(w * 2, d * 2, 1);
  m.position.y = 0.012;
  return m;
}

// A length of rope along +X from the origin, so scaling X "pays it out".
export function rope(len, color = '#d9c38f', rad = 0.011) {
  const geo = new THREE.CylinderGeometry(rad, rad, len, 6, 1);
  geo.rotateZ(Math.PI / 2);
  geo.translate(len / 2, 0, 0);
  return shadowed(new THREE.Mesh(geo, mat(color, { roughness: 0.9 })), true, false);
}

// A short wrap of rope round a trunk, with a cloth pad under it.
export function treeWrap(trunkRad, pad = false) {
  const g = new THREE.Group();
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(trunkRad + 0.015, 0.012, 6, 24), mat('#d9c38f'));
  wrap.rotation.x = Math.PI / 2;
  g.add(wrap);
  if (pad) {
    const cloth = new THREE.Mesh(new THREE.CylinderGeometry(trunkRad + 0.008, trunkRad + 0.008, 0.09, 24, 1, true), mat('#c8342b', { side: THREE.DoubleSide }));
    g.add(cloth);
  }
  return shadowed(g);
}

// One half of the tarp, hanging straight down from its top edge at the origin.
// Rotate about X to swing it out into an A-frame.
export function tarpHalf(len = 2.4, drop = 1.05, seed = 1) {
  const r = rng(seed);
  const geo = new THREE.PlaneGeometry(len, drop, 24, 8);
  geo.translate(0, -drop / 2, 0);
  speckle(geo, '#4b6640', 0.05, r);
  const m = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }));
  // A hem along the bottom edge.
  const hem = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.012), mat('#3a5233'));
  hem.position.y = -drop + 0.015;
  const g = new THREE.Group();
  g.add(m, hem);
  return shadowed(g);
}

// A tent peg, driven in at an angle leaning away from the shelter.
export function peg() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.2, 6), mat('#b9bec1', { metalness: 0.7, roughness: 0.35 }));
  shaft.position.y = 0.04;
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12, Math.PI), mat('#b9bec1', { metalness: 0.7 }));
  hook.position.y = 0.14;
  g.add(shaft, hook);
  return shadowed(g);
}

// A low mound of leaf litter: a squashed, lumpy dome.
export function leafMound(w, h, d, seed = 1) {
  const r = rng(seed);
  const geo = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + (r() - 0.5) * 0.12;
    pos.setXYZ(i, v.x * w * k, v.y * h * k, v.z * d * k);
  }
  geo.computeVertexNormals();
  return shadowed(new THREE.Mesh(geo, leafMat([Math.max(1, w * 3), 1])));
}

// The leaf covering of a debris shelter: a half-cone lying along X, high at the
// doorway end (+X) and tapering to the foot end at -X.
export function debrisCover(len = 1.9, wide = 0.62, narrow = 0.14, seed = 5) {
  const r = rng(seed);
  const geo = new THREE.CylinderGeometry(wide, narrow, len, 40, 16, false);
  geo.rotateZ(-Math.PI / 2); // +Y (wide end) now points to +X
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const lump = 1 + (Math.sin(v.x * 9 + v.z * 7) * 0.5 + (r() - 0.5)) * 0.07;
    v.y = Math.max(0, v.y) * 1.25 * lump;
    v.z *= lump;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return shadowed(new THREE.Mesh(geo, leafMat([4, 3])));
}

// The dark opening of the debris shelter, a half-disc facing +X.
export function doorway(radius = 0.5) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 24, 0, Math.PI), mat('#2a2018', { roughness: 1 }));
  m.rotation.y = Math.PI / 2;
  m.scale.y = 1.25;
  return m;
}

// A forked stick, pushed into the ground, to hold up the high end of a ridgepole.
export function forkedStick(h = 0.72, seed = 8) {
  const g = new THREE.Group();
  const post = stick(h, 0.03, seed, '#6b5038');
  post.rotation.z = Math.PI / 2;
  post.position.y = h / 2;
  const fork = stick(0.22, 0.02, seed + 1, '#6b5038');
  fork.rotation.z = Math.PI / 2 - 0.6;
  fork.position.set(0.05, h - 0.02, 0);
  g.add(post, fork);
  return shadowed(g);
}

export function foamMat(len = 1.55, w = 0.5) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.014, w), mat('#2f6f9e', { roughness: 0.7 }));
  return shadowed(m);
}
