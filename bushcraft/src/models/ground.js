import * as THREE from 'three';
import { rng, range, canvasTexture } from './util.js';

// A round woodland clearing that sits on the map like a cut-out: earth in the
// middle, leaf litter, and grass tufts thickening towards the edge.

const R = 2.75;

export function makeClearing() {
  const g = new THREE.Group();
  const r = rng(7);

  // Soft shadow so the clearing seems to rest on the paper.
  const shadowTex = canvasTexture(256, (ctx, s) => {
    const grd = ctx.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(40,35,20,0.35)');
    grd.addColorStop(1, 'rgba(40,35,20,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, s, s);
  });
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2.6, R * 2.6),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.13;
  g.add(shadow);

  // Earth: a shallow slab with a speckled top.
  const earthTex = canvasTexture(1024, (ctx, s) => {
    const grd = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, '#8f7552');
    grd.addColorStop(0.55, '#86704c');
    grd.addColorStop(0.85, '#6f7a45');
    grd.addColorStop(1, '#5f7440');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * s * 0.5;
      ctx.fillStyle = `rgba(${r() > 0.5 ? '60,45,28' : '170,145,105'},${range(r, 0.08, 0.25)})`;
      ctx.beginPath();
      ctx.arc(s / 2 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, range(r, 1, 4), 0, 7);
      ctx.fill();
    }
  });
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R * 0.98, 0.12, 96, 1),
    [
      new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 1 }),
      new THREE.MeshStandardMaterial({ map: earthTex, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: '#4a3a28', roughness: 1 }),
    ],
  );
  top.position.y = -0.06;
  top.receiveShadow = true;
  g.add(top);

  // Leaf litter: small flat leaves in autumn colours.
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, -0.05);
  leafShape.quadraticCurveTo(0.03, 0, 0, 0.05);
  leafShape.quadraticCurveTo(-0.03, 0, 0, -0.05);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 3);
  leafGeo.rotateX(-Math.PI / 2);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), 700);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const palette = ['#b5652e', '#c98b3a', '#8e4a26', '#a8783f', '#6d5a2f', '#c4a250'];
  for (let i = 0; i < leaves.count; i++) {
    const a = r() * Math.PI * 2, d = R * Math.sqrt(range(r, 0.12, 0.97));
    e.set(range(r, -0.2, 0.2), r() * 7, range(r, -0.2, 0.2));
    q.setFromEuler(e);
    const s = range(r, 0.6, 1.3);
    m.compose(new THREE.Vector3(Math.cos(a) * d, 0.004 + r() * 0.006, Math.sin(a) * d), q, new THREE.Vector3(s, s, s));
    leaves.setMatrixAt(i, m);
    leaves.setColorAt(i, new THREE.Color(palette[(r() * palette.length) | 0]).multiplyScalar(range(r, 0.8, 1.1)));
  }
  leaves.receiveShadow = true;
  g.add(leaves);

  // Grass tufts: thin blades, dense at the rim and sparse inside.
  const blade = new THREE.ConeGeometry(0.007, 0.075, 3, 1);
  blade.translate(0, 0.0375, 0);
  const grass = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), 3800);
  const greens = ['#5f7f3a', '#6e8f42', '#4f6d32', '#7f9a4c', '#8a9a55'];
  for (let i = 0; i < grass.count; i++) {
    const a = r() * Math.PI * 2;
    const d = R * (r() < 0.8 ? range(r, 0.8, 0.99) : range(r, 0.35, 0.8));
    e.set(range(r, -0.45, 0.45), r() * 7, range(r, -0.45, 0.45));
    q.setFromEuler(e);
    const s = range(r, 0.5, 1.4) * (d / R > 0.8 ? 1.2 : 0.7);
    m.compose(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), q, new THREE.Vector3(1, s, 1));
    grass.setMatrixAt(i, m);
    grass.setColorAt(i, new THREE.Color(greens[(r() * greens.length) | 0]));
  }
  grass.castShadow = true;
  grass.receiveShadow = true;
  g.add(grass);

  return g;
}
