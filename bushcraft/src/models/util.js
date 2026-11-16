import * as THREE from 'three';

// Seeded random numbers, so a rebuilt scene looks exactly the same each time.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (r, a, b) => a + (b - a) * r();

export function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });
}

export function shadowed(obj, cast = true, receive = true) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return obj;
}

// Colour each vertex with a little noise so surfaces don't look flat and plastic.
export function speckle(geo, base, amount, r, along = null) {
  const c = new THREE.Color(base);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const hsl = {};
  c.getHSL(hsl);
  for (let i = 0; i < pos.count; i++) {
    const band = along ? Math.sin(pos.getComponent(i, along) * 37 + r() * 2) * 0.5 : 0;
    const k = new THREE.Color().setHSL(hsl.h + (r() - 0.5) * 0.02, hsl.s, Math.max(0, hsl.l + (r() - 0.5) * amount + band * amount * 0.5));
    cols.set([k.r, k.g, k.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

export function canvasTexture(size, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
