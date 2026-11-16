import * as THREE from 'three';

// Small helpers shared by lesson scripts.

// An invisible point in the scene, for pinning a label to.
export function point(x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  return o;
}

export const callout = (anchor, text, opts = {}) => ({ anchor, text, ...opts });

// Place something built along the X axis (a stick, a rope) so it runs from a to b.
export function between(obj, a, b) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  obj.position.copy(A).add(B).multiplyScalar(0.5);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), B.clone().sub(A).normalize());
  return obj;
}

export const dist = (a, b) => new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));
