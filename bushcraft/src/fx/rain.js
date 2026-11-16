import * as THREE from 'three';
import { rng } from '../models/util.js';

// Rain over the clearing. Like the fire, each streak's position is worked out on the
// GPU from the time and its seed. Shelters are "tents" the rain stops at: give each
// one a centre, half-sizes and a ridge height, with the ridge running along X or Z.
//
// Tween `amount` (0..1) from a lesson step.

const MAX = 3;

export class Rain {
  constructor(world, { count = 1800, radius = 2.7, top = 3.4, wind = [0.25, 0, 0] } = {}) {
    this.world = world;
    this.amount = 0;
    const r = rng(77);
    const pos = new Float32Array(count * 2 * 3);
    const seed = new Float32Array(count * 2 * 3);
    const end = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * radius, s = r();
      for (let j = 0; j < 2; j++) {
        seed.set([Math.cos(a) * d, Math.sin(a) * d, s], (i * 2 + j) * 3);
        end[i * 2 + j] = j;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);

    this.uniforms = {
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uTop: { value: top },
      uWind: { value: new THREE.Vector3(...wind) },
      uOcc: { value: Array.from({ length: MAX }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uOccH: { value: Array.from({ length: MAX }, () => new THREE.Vector2(0, 0)) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        attribute vec3 aSeed; attribute float aEnd;
        uniform float uTime, uTop; uniform vec3 uWind;
        varying vec3 vPos; varying float vEnd;
        void main() {
          float fall = fract(uTime * 1.6 + aSeed.z * 13.0);
          float y = uTop * (1.0 - fall) + aEnd * 0.14;
          vec3 p = vec3(aSeed.x, y, aSeed.y) + uWind * (y - uTop * 0.5) * 0.25;
          vPos = p; vEnd = aEnd;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uAmount;
        uniform vec4 uOcc[${MAX}];
        uniform vec2 uOccH[${MAX}];
        varying vec3 vPos; varying float vEnd;
        void main() {
          // Stop at any shelter roof below this drop.
          for (int i = 0; i < ${MAX}; i++) {
            vec4 o = uOcc[i];
            if (o.z <= 0.0) continue;
            vec2 d = abs(vPos.xz - o.xy);
            if (d.x > o.z || d.y > o.w) continue;
            float across = uOccH[i].y > 0.5 ? d.x / o.z : d.y / o.w; // ridge along Z or X
            float roof = uOccH[i].x * (1.0 - across);
            if (vPos.y < roof) discard;
          }
          float a = uAmount * mix(0.15, 0.55, vEnd);
          if (a < 0.01) discard;
          gl_FragColor = vec4(0.62, 0.72, 0.8, a);
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.group = new THREE.Group();
    this.lines = new THREE.LineSegments(geo, mat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 5;
    this.group.add(this.lines);
  }

  // A roof the rain stops at. `ridge` is 'x' if the ridge runs along X.
  shelter(i, { centre: [x, z], half: [hx, hz], height, ridge = 'x' }) {
    this.uniforms.uOcc.value[i].set(x, z, hx, hz);
    this.uniforms.uOccH.value[i].set(height, ridge === 'x' ? 0 : 1);
  }

  update(dt, time) {
    this.uniforms.uTime.value = time;
    this.uniforms.uAmount.value = this.amount;
    this.lines.visible = this.amount > 0.005;
  }
}
