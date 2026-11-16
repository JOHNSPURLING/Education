import * as THREE from 'three';
import { mat, shadowed } from './util.js';

// A simple wooden lay figure (an artist's mannequin), about the size of a teenager.
// Neutral on purpose: it stands for anyone. Facing +Z. Arms are posed by reaching for
// a point (two-bone IK), so hands can hold and move kit naturally.

const SIZE = {
  pelvis: 0.5, // hip height when standing is computed from the legs
  torso: 0.48,
  neck: 0.06,
  head: 0.1,
  shoulderW: 0.19,
  hipW: 0.09,
  upperArm: 0.29,
  forearm: 0.27,
  thigh: 0.42,
  shin: 0.42,
};

function limb(len, rad, material) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len - rad * 2, 4, 10), material);
  m.position.y = -len / 2;
  g.add(m);
  return g;
}

function joint(rad, material) {
  return new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 8), material);
}

export function figure({ seated = true, tint = '#d9b98f' } = {}) {
  const wood = mat(tint, { roughness: 0.55 });
  const dark = mat('#a98258', { roughness: 0.6 });
  const root = new THREE.Group();

  // Pelvis sits on a stump when seated (seat height ~0.44), or above the feet.
  const pelvis = new THREE.Group();
  pelvis.position.y = seated ? 0.52 : SIZE.thigh + SIZE.shin + 0.05;
  root.add(pelvis);
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.1, 4, 10), wood);
  hips.rotation.z = Math.PI / 2;
  pelvis.add(hips);

  // Upper body turns at the waist (used for the blood bubble sweep).
  const waist = new THREE.Group();
  waist.position.y = 0.04;
  pelvis.add(waist);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, SIZE.torso - 0.24, 4, 12), wood);
  chest.position.y = SIZE.torso / 2;
  chest.scale.set(1.15, 1, 0.75);
  waist.add(chest);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.1, 8), dark);
  neck.position.y = SIZE.torso + 0.03;
  waist.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(SIZE.head, 20, 14), wood);
  head.scale.set(0.9, 1.1, 0.95);
  head.position.y = SIZE.torso + SIZE.neck + SIZE.head + 0.02;
  waist.add(head);
  // A small nose, so you can tell which way the figure faces.
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), wood);
  nose.position.set(0, -0.005, SIZE.head * 0.92);
  head.add(nose);

  const arms = {};
  for (const [side, sx] of [['r', -1], ['l', 1]]) {
    // Figure faces +Z, so its right hand is at -X.
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * SIZE.shoulderW, SIZE.torso - 0.06, 0);
    waist.add(shoulder);
    shoulder.add(joint(0.045, dark));
    const upper = limb(SIZE.upperArm, 0.04, wood);
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -SIZE.upperArm;
    upper.add(elbow);
    elbow.add(joint(0.035, dark));
    const fore = limb(SIZE.forearm, 0.033, wood);
    elbow.add(fore);
    const hand = new THREE.Group();
    hand.position.y = -SIZE.forearm;
    fore.add(hand);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), wood);
    palm.scale.set(0.8, 1.2, 0.6);
    palm.position.y = -0.03;
    hand.add(palm);
    arms[side] = { shoulder, upper, elbow, fore, hand, sx };
  }

  const legs = {};
  for (const [side, sx] of [['r', -1], ['l', 1]]) {
    const hip = new THREE.Group();
    hip.position.set(sx * SIZE.hipW, -0.02, 0);
    pelvis.add(hip);
    const thigh = limb(SIZE.thigh, 0.055, wood);
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -SIZE.thigh;
    thigh.add(knee);
    knee.add(joint(0.05, dark));
    const shin = limb(SIZE.shin, 0.045, wood);
    knee.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.2), dark);
    foot.position.set(0, -SIZE.shin - 0.01, 0.05);
    shin.add(foot);
    if (seated) {
      // Thighs forward, shins down, feet a little apart.
      thigh.rotation.set(-Math.PI / 2 + 0.05, 0, sx * -0.12);
      shin.rotation.x = Math.PI / 2 - 0.05;
      foot.rotation.x = 0;
    }
    legs[side] = { hip, thigh, knee, shin };
  }

  const fig = { root, pelvis, waist, head, arms, legs, size: SIZE, tint: wood };

  // Put a hand at a point (x to the figure's left, y up, z forward). By default the
  // point is in the waist's space, so it turns and leans with the body; with
  // space 'pelvis' it stays put while the body leans. `pole` hints where the elbow goes.
  fig.reach = (side, target, pole = [arms[side].sx * 0.6, -0.6, -0.5], space = 'waist') => {
    const a = arms[side];
    const s = a.shoulder.position;
    const p0 = new THREE.Vector3(...target);
    if (space === 'pelvis') {
      waist.updateMatrix();
      p0.applyMatrix4(waist.matrix.clone().invert());
    }
    const t = p0.sub(s);
    const L1 = SIZE.upperArm, L2 = SIZE.forearm;
    const d = Math.min(t.length(), L1 + L2 - 1e-3);
    const dir = t.clone().normalize();
    const p = new THREE.Vector3(...pole).normalize();
    const n = new THREE.Vector3().crossVectors(dir, p).normalize();
    const a1 = Math.acos(THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const towardPole = new THREE.Vector3().crossVectors(n, dir);
    const u = dir.clone().multiplyScalar(Math.cos(a1)).add(towardPole.multiplyScalar(Math.sin(a1))).normalize();
    const down = new THREE.Vector3(0, -1, 0);
    a.shoulder.quaternion.setFromUnitVectors(down, u);
    const elbowPos = u.clone().multiplyScalar(L1);
    const f = dir.clone().multiplyScalar(d).sub(elbowPos).normalize();
    const fLocal = f.applyQuaternion(a.shoulder.quaternion.clone().invert());
    a.elbow.quaternion.setFromUnitVectors(down, fLocal);
  };

  // Rest pose: hands on the knees when seated, by the sides when standing.
  fig.rest = () => {
    if (seated) {
      fig.reach('r', [-0.13, -0.03, 0.36]);
      fig.reach('l', [0.13, -0.03, 0.36]);
    } else {
      fig.reach('r', [-0.24, -0.02, 0.04]);
      fig.reach('l', [0.24, -0.02, 0.04]);
    }
  };
  fig.rest();
  shadowed(root);
  return fig;
}

// A stump to sit on.
export function stump(seed = 1) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.42, 20), mat('#6f5438', { roughness: 0.95 }));
  top.position.y = 0.21;
  const rings = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), mat('#c9a676'));
  rings.rotation.x = -Math.PI / 2;
  rings.position.y = 0.421;
  g.add(top, rings);
  return shadowed(g);
}
