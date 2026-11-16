import * as THREE from 'three';
import { rng, range } from '../models/util.js';

// Fire, embers, smoke, steam and ferro-rod sparks. All particles are "stateless":
// each one's position is worked out on the GPU from the time and its own seed, so
// there is nothing to simulate on the CPU and seeking the timeline is free.
//
// Tween these numbers (0..1) from a lesson step:
//   intensity  flame size and brightness     smoke  smoke plume
//   steam      white steam when water hits   char   how burnt the fuel looks
//   glow       embers glowing in charred fuel

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { return noise(p) * 0.55 + noise(p * 2.1) * 0.3 + noise(p * 4.3) * 0.15; }
`;

function flames(count, seed) {
  const r = rng(seed);
  const corners = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]];
  const pos = [], uv = [], off = [], size = [], sd = [], idx = [];
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, d = i === 0 ? 0 : range(r, 0.04, 0.13);
    const o = [Math.cos(a) * d, 0, Math.sin(a) * d];
    const s = i === 0 ? [0.34, 0.95] : [range(r, 0.16, 0.26), range(r, 0.45, 0.8)];
    const k = r();
    for (const [x, y] of corners) {
      pos.push(x, y, 0);
      uv.push(x + 0.5, y);
      off.push(...o);
      size.push(...s);
      sd.push(k);
    }
    const b = i * 4;
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aOffset', new THREE.Float32BufferAttribute(off, 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 2));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(sd, 1));
  g.setIndex(idx);
  return g;
}

function points(count, seed) {
  const r = rng(seed);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(Array.from({ length: count * 3 }, r), 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
  return g;
}

const plumeShader = (color) => ({
  vertexShader: /* glsl */ `
    attribute vec3 aSeed;
    uniform float uTime, uAmount, uRise, uSpeed, uPx, uSize;
    uniform vec3 uWind;
    varying float vAlpha;
    void main() {
      float life = fract(uTime * uSpeed + aSeed.x);
      vec3 p = vec3((aSeed.y - 0.5) * 0.18, life * uRise, (aSeed.z - 0.5) * 0.18);
      p += uWind * life * life * uRise * 0.6;
      p.x += sin(uTime * 0.7 + aSeed.y * 6.28) * 0.12 * life;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * (0.35 + life * 1.4) * uPx / -mv.z;
      vAlpha = sin(3.14159 * life) * uAmount * (0.6 + aSeed.z * 0.4);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d) * vAlpha;
      if (a < 0.003) discard;
      gl_FragColor = vec4(uColor, a);
    }`,
  uniforms: {
    uTime: { value: 0 }, uAmount: { value: 0 }, uRise: { value: 2.4 }, uSpeed: { value: 0.16 },
    uPx: { value: 800 }, uSize: { value: 0.5 }, uWind: { value: new THREE.Vector3(0.5, 0, 0) },
    uColor: { value: new THREE.Color(color) },
  },
  transparent: true,
  depthWrite: false,
});

export class Fire {
  constructor(world, { wind = [0.5, 0, 0] } = {}) {
    this.world = world;
    this.group = new THREE.Group();
    this.intensity = 0;
    this.smoke = 0;
    this.steam = 0;
    this.char = 0;
    this.glow = 0;
    this.charMats = [];

    this.flameMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute vec3 aOffset; attribute vec2 aSize; attribute float aSeed;
        uniform float uTime, uIntensity;
        varying vec2 vUv; varying float vSeed;
        void main() {
          vUv = uv; vSeed = aSeed;
          float h = aSize.y * uIntensity * (0.85 + 0.15 * sin(uTime * (5.0 + aSeed * 4.0) + aSeed * 20.0));
          vec3 base = (modelMatrix * vec4(aOffset * (0.5 + uIntensity * 0.6), 1.0)).xyz;
          vec3 toCam = cameraPosition - base; toCam.y = 0.0;
          vec3 right = normalize(cross(vec3(0, 1, 0), normalize(toCam + vec3(1e-4, 0, 0))));
          vec3 world = base + right * position.x * aSize.x * (0.4 + uIntensity * 0.6) + vec3(0, position.y * h, 0);
          gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uIntensity;
        varying vec2 vUv; varying float vSeed;
        ${NOISE}
        void main() {
          float y = vUv.y;
          float n = fbm(vec2(vUv.x * 3.0 + vSeed * 10.0, y * 2.5 - uTime * 2.6));
          float x = (vUv.x - 0.5) + (n - 0.5) * 0.55 * y;
          float width = 0.5 * pow(1.0 - y, 0.9) * smoothstep(0.0, 0.18, y + 0.04);
          float body = smoothstep(width, width * 0.35, abs(x));
          body *= smoothstep(1.0, 0.55, y + (n - 0.5) * 0.5);
          float core = smoothstep(width * 0.6, 0.0, abs(x)) * smoothstep(0.75, 0.0, y);
          vec3 col = mix(vec3(0.85, 0.18, 0.03), vec3(1.0, 0.62, 0.12), body);
          col = mix(col, vec3(1.0, 0.93, 0.6), core);
          float a = body * clamp(uIntensity * 2.0, 0.0, 1.0);
          if (a < 0.01) discard;
          gl_FragColor = vec4(col * a, a);
        }`,
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.flames = new THREE.Mesh(flames(9, 11), this.flameMat);
    this.flames.frustumCulled = false;
    this.flames.renderOrder = 3;
    this.group.add(this.flames);

    this.emberMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute vec3 aSeed;
        uniform float uTime, uAmount, uPx;
        varying float vAlpha;
        void main() {
          float life = fract(uTime * (0.35 + aSeed.x * 0.4) + aSeed.y);
          vec3 p = vec3(sin(aSeed.z * 40.0 + uTime * 1.3) * 0.25 * life, 0.15 + life * 1.5, cos(aSeed.y * 40.0 + uTime) * 0.25 * life);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.018 + aSeed.z * 0.012) * uPx / -mv.z;
          vAlpha = (1.0 - life) * uAmount * step(0.4, aSeed.z);
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float a = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5)) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vec3(1.0, 0.6, 0.2) * a, a);
        }`,
      uniforms: { uTime: { value: 0 }, uAmount: { value: 0 }, uPx: { value: 800 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.embers = new THREE.Points(points(70, 5), this.emberMat);
    this.group.add(this.embers);

    this.smokeMat = new THREE.ShaderMaterial(plumeShader('#b3afa6'));
    this.smokeMat.uniforms.uWind.value.set(...wind);
    this.smokePts = new THREE.Points(points(46, 9), this.smokeMat);
    this.smokePts.position.y = 0.35;
    this.smokePts.renderOrder = 4;
    this.group.add(this.smokePts);

    this.steamMat = new THREE.ShaderMaterial(plumeShader('#f4f6f6'));
    Object.assign(this.steamMat.uniforms, { uSpeed: { value: 0.55 }, uRise: { value: 1.4 }, uSize: { value: 0.42 } });
    this.steamMat.uniforms.uWind.value.set(...wind).multiplyScalar(0.6);
    this.steamPts = new THREE.Points(points(60, 13), this.steamMat);
    this.steamPts.position.y = 0.1;
    this.steamPts.renderOrder = 4;
    this.group.add(this.steamPts);

    // Ferro rod sparks: a short burst under gravity from wherever the rod is.
    this.sparkMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute vec3 aSeed;
        uniform float uAge, uPx; uniform vec3 uOrigin, uDir;
        varying float vAlpha;
        void main() {
          float t = uAge * (0.7 + aSeed.x * 0.6);
          vec3 v = normalize(uDir + (aSeed - 0.5) * vec3(0.9, 0.6, 0.9)) * (1.1 + aSeed.y * 1.4);
          vec3 p = uOrigin + v * t + vec3(0.0, -4.9, 0.0) * t * t;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.012 + aSeed.z * 0.012) * uPx / -mv.z;
          vAlpha = smoothstep(0.42, 0.05, t) * step(0.0, uAge);
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vec3(1.0, 0.86, 0.5) * a, a);
        }`,
      uniforms: { uAge: { value: -1 }, uPx: { value: 800 }, uOrigin: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3(0, -0.3, 1) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.sparks = new THREE.Points(points(45, 21), this.sparkMat);
    this.sparks.frustumCulled = false;
    world.scene.add(this.sparks);
    this.sparkAt = -10;

    this.light = new THREE.PointLight('#ff8a3a', 0, 4.5, 1.6);
    this.light.position.y = 0.45;
    this.group.add(this.light);
  }

  // Fuel that should blacken and glow as it burns.
  burns(obj) {
    obj.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) {
        if (this.charMats.some((c) => c.mat === m)) continue;
        m.emissive ??= new THREE.Color();
        this.charMats.push({ mat: m, color0: m.color.clone() });
      }
    });
  }

  spark(origin, dir) {
    if (this.world.fastForward) return;
    this.sparkAt = this.world.time;
    this.sparkMat.uniforms.uOrigin.value.copy(origin);
    this.sparkMat.uniforms.uDir.value.copy(dir);
  }

  update(dt, time) {
    const px = this.world.container.clientHeight * this.world.camera.zoom / (2 * Math.tan((this.world.camera.fov * Math.PI) / 360));
    for (const m of [this.emberMat, this.smokeMat, this.steamMat, this.sparkMat]) m.uniforms.uPx.value = px;
    this.flameMat.uniforms.uTime.value = time;
    this.flameMat.uniforms.uIntensity.value = this.intensity;
    this.flames.visible = this.intensity > 0.005;
    this.emberMat.uniforms.uTime.value = time;
    this.emberMat.uniforms.uAmount.value = Math.min(1, this.intensity * 1.4);
    this.smokeMat.uniforms.uTime.value = time;
    this.smokeMat.uniforms.uAmount.value = this.smoke * 0.3;
    this.steamMat.uniforms.uTime.value = time;
    this.steamMat.uniforms.uAmount.value = this.steam * 0.7;
    this.sparkMat.uniforms.uAge.value = time - this.sparkAt;

    const flicker = 0.85 + 0.15 * Math.sin(time * 13) * Math.sin(time * 7.3 + 1);
    this.light.intensity = (this.intensity * 3.2 + this.glow * 0.6) * flicker;

    const dark = new THREE.Color('#231610');
    const ember = new THREE.Color('#ff5a14');
    for (const { mat, color0 } of this.charMats) {
      mat.color.copy(color0).lerp(dark, this.char * 0.85);
      mat.emissive.copy(ember).multiplyScalar(this.glow * (0.35 + 0.25 * Math.sin(time * 2.3 + color0.r * 9)));
    }
  }

  dispose() {
    this.world.scene.remove(this.sparks);
    this.sparks.geometry.dispose();
  }
}
