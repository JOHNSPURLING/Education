import * as THREE from 'three';
import { mat, shadowed, canvasTexture, rng, range } from './util.js';

// Knives and the kit around them. A knife is built along +X: handle at the origin,
// blade towards +X, cutting edge facing -Y.

const STEEL = () => mat('#c3c8cc', { metalness: 0.85, roughness: 0.3 });

function bladeGeo(len, depth) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(len * 0.72, 0);
  s.quadraticCurveTo(len, 0, len, depth); // tip curves up to the spine
  s.lineTo(0, depth);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1 });
  g.translate(0, -depth / 2, -0.002);
  return g;
}

// A fixed-blade knife with a bright handle (easy to find if dropped).
// Returns { group, blade }.
export function fixedKnife({ handle = '#f07a1a', scale = 1 } = {}) {
  const g = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.08, 4, 10), mat(handle, { roughness: 0.5 }));
  grip.rotation.z = Math.PI / 2;
  grip.scale.set(1, 1, 0.75);
  grip.position.x = -0.05;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.034, 0.022), mat('#2b2b2b'));
  guard.position.x = 0.0;
  const blade = new THREE.Mesh(bladeGeo(0.1, 0.02), STEEL());
  blade.position.x = 0.004;
  g.add(grip, guard, blade);
  g.scale.setScalar(scale);
  return { group: shadowed(g), blade };
}

// A plastic sheath that the blade slides into (along +X).
export function sheath({ color = '#1f2a2e', scale = 1 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.016), mat(color, { roughness: 0.6 }));
  body.position.x = 0.06;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.03, 8), mat(color));
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 0.13;
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.006), mat('#3a4448'));
  clip.position.set(0.02, 0, -0.011);
  g.add(body, tip, clip);
  g.scale.setScalar(scale);
  return shadowed(g);
}

// A small folding pocketknife: turn `blade` about Z from Math.PI (closed) to 0 (open).
export function pocketKnife({ scale = 1 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.022, 0.016), mat('#c8342b', { roughness: 0.4 }));
  body.position.x = -0.045;
  const pivot = new THREE.Group();
  const blade = new THREE.Mesh(bladeGeo(0.065, 0.015), STEEL());
  blade.position.y = 0.0;
  pivot.add(blade);
  pivot.rotation.z = Math.PI;
  pivot.position.z = 0.0;
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.02, 8), mat('#888'));
  pin.rotation.x = Math.PI / 2;
  g.add(body, pivot, pin);
  g.scale.setScalar(scale);
  return { group: shadowed(g), blade: pivot };
}

// A ruler in centimetres with the 3 inch (7.62 cm) mark picked out.
export function ruler(scale = 1) {
  const tex = canvasTexture(1024, (ctx, s) => {
    const h = s / 8;
    ctx.fillStyle = '#f4efe2';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1d3540';
    ctx.font = `600 ${h * 0.32}px "Archivo Narrow", sans-serif`;
    ctx.textAlign = 'center';
    const pxPerCm = (s - 40) / 10;
    for (let mm = 0; mm <= 100; mm++) {
      const x = 20 + (mm / 10) * pxPerCm;
      const len = mm % 10 === 0 ? h * 0.45 : mm % 5 === 0 ? h * 0.3 : h * 0.18;
      ctx.fillRect(x - 1.5, 0, 3, len);
      if (mm % 10 === 0) ctx.fillText(String(mm / 10), x, h * 0.85);
    }
    const x3 = 20 + 7.62 * pxPerCm;
    ctx.fillStyle = '#c8342b';
    ctx.fillRect(x3 - 3, 0, 6, h);
  });
  tex.repeat.set(1, 1 / 8);
  tex.offset.set(0, 7 / 8);
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.003, 0.0138),
    [mat('#e6e0cf'), mat('#e6e0cf'), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), mat('#e6e0cf'), mat('#e6e0cf'), mat('#e6e0cf')],
  );
  m.scale.setScalar(scale);
  return shadowed(m);
}

// The course's knife tub: a box with a hinged lid.
export function tub() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.38), mat('#2f6f9e', { roughness: 0.6 }));
  box.position.y = 0.11;
  g.add(box);
  const lid = new THREE.Group();
  lid.position.set(0, 0.22, -0.19);
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.4), mat('#285f88', { roughness: 0.6 }));
  lidMesh.position.z = 0.2;
  lid.add(lidMesh);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.08),
    new THREE.MeshStandardMaterial({
      map: canvasTexture(256, (ctx, s) => {
        ctx.fillStyle = '#f4c430';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#1d3540';
        ctx.font = `700 ${s * 0.3}px "Archivo Narrow", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('KNIVES', s / 2, s * 0.62);
      }),
    }),
  );
  label.position.set(0, 0.11, 0.191);
  label.scale.y = 1;
  g.add(label);
  g.add(lid);
  g.userData.lid = lid;
  return shadowed(g);
}

// A green stick for carving, along +X.
export function carvingStick(len = 0.34, rad = 0.014, seed = 3) {
  const r = rng(seed);
  const geo = new THREE.CylinderGeometry(rad, rad * 1.05, len, 10, 6);
  geo.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, [mat('#6c5a3b', { roughness: 0.9 }), mat('#e8dcc0'), mat('#e8dcc0')]);
  // A pale pointed tip, revealed when sharpened.
  const tip = new THREE.Mesh(new THREE.ConeGeometry(rad, 0.05, 10), mat('#e8dcc0', { roughness: 0.8 }));
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = len / 2 + 0.025;
  tip.visible = false;
  m.add(tip);
  m.userData.tip = tip;
  void r;
  return shadowed(m);
}

// A small wood shaving that curls off the stick.
export function shaving(seed = 1) {
  const r = rng(seed);
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(0.008, 0.0025, 4, 10, range(r, 3, 5)),
    mat('#ecdcb8', { roughness: 0.8 }),
  );
  return shadowed(m, true, false);
}

// A translucent dome: the blood bubble.
export function bubble(radius = 1) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#f4c430', transparent: true, opacity: 0.16, roughness: 0.3, depthWrite: false, side: THREE.DoubleSide }),
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.03, radius, 96),
    new THREE.MeshBasicMaterial({ color: '#f4c430', transparent: true, opacity: 0.9, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.015;
  const g = new THREE.Group();
  g.add(m, ring);
  // tone: 0 = yellow (clear), 1 = red (someone inside)
  let tone = 0;
  const yellow = new THREE.Color('#f4c430'), red = new THREE.Color('#d23a2a');
  g.userData.tone = {
    get v() { return tone; },
    set v(x) {
      tone = x;
      m.material.color.copy(yellow).lerp(red, x);
      ring.material.color.copy(yellow).lerp(red, x);
      m.material.opacity = 0.16 + 0.12 * x;
    },
  };
  return g;
}
