import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ease } from './timeline.js';
import { makeClearing } from '../models/ground.js';

// The 3D world: one renderer, a camera you can drag around, and a clearing cut out
// of the map. A lesson fills `props` with its kit; steps animate it via a Director.

export const DEFAULT_VIEW = { pos: [6.0, 5.6, 7.4], target: [0, 0.1, 0] };

export class World {
  constructor(container, calloutLayer) {
    this.container = container;
    this.calloutLayer = calloutLayer;

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.append(r.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.controls = new OrbitControls(this.camera, r.domElement);
    Object.assign(this.controls, {
      enableDamping: true,
      dampingFactor: 0.08,
      enablePan: false,
      minDistance: 1.6,
      maxDistance: 16,
      minPolarAngle: 0.2,
      maxPolarAngle: 1.38,
    });
    this.setView(DEFAULT_VIEW);

    // Light: soft daylight from above plus a low sun for readable shadows.
    this.hemi = new THREE.HemisphereLight('#fff7e6', '#7d6d52', 1.6);
    this.scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#fff1d6', 2.4));
    sun.position.set(4, 8, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
    sun.shadow.bias = -0.0005;
    sun.shadow.radius = 4;
    this.scene.add(sun);

    this.scene.add(makeClearing());

    this.props = new THREE.Group();
    this.scene.add(this.props);
    this.anchors = new Map();
    this.homes = new Map();
    this.fx = [];
    this.callouts = [];
    this.clock = new THREE.Clock();
    this.time = 0;

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('callouts__lines');
    calloutLayer.append(this.svg);

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    r.setAnimationLoop(() => this.frame());
  }

  setView({ pos, target }) {
    this.camera.position.set(...pos);
    this.controls.target.set(...target);
    this.controls.update();
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Pull back on narrow screens so the whole clearing stays in view.
    this.camera.zoom = Math.min(1, (w / h) / 1.1 + 0.25);
    this.camera.updateProjectionMatrix();
  }

  // Remove the lesson's props and effects so the lesson can rebuild from scratch.
  clear() {
    // Lessons may dim the daylight (for a night scene); every rebuild starts at midday.
    this.hemi.intensity = 1.6;
    this.sun.intensity = 2.4;
    for (const f of this.fx) f.dispose?.();
    this.props.traverse((o) => {
      o.geometry?.dispose();
    });
    this.props.clear();
    this.anchors.clear();
    this.homes.clear();
    this.fx = [];
    this.setCallouts([]);
  }

  // Register a prop at its home (final) placement. Hidden props pop in later.
  add(name, obj, { hidden = false, anchor } = {}) {
    obj.name = name;
    this.props.add(obj);
    this.homes.set(obj, { position: obj.position.clone(), quaternion: obj.quaternion.clone(), scale: obj.scale.clone() });
    this.anchors.set(name, anchor ?? obj);
    obj.visible = !hidden;
    return obj;
  }

  anchor(name, obj) {
    this.anchors.set(name, obj);
  }

  addFx(fx) {
    this.fx.push(fx);
    this.props.add(fx.group);
    return fx;
  }

  setCallouts(list) {
    for (const c of this.callouts) c.el.remove();
    this.svg.replaceChildren();
    this.callouts = list.map((c, i) => {
      const el = document.createElement('div');
      el.className = `callout callout--${c.tone ?? 'ink'}`;
      el.textContent = c.text;
      this.calloutLayer.append(el);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', 4.5);
      this.svg.append(line, dot);
      return { ...c, el, line, dot, i, shown: 0 };
    });
    this.calloutsAt = performance.now();
  }

  placeCallouts() {
    const { clientWidth: w, clientHeight: h } = this.container;
    const v = new THREE.Vector3();
    const age = (performance.now() - this.calloutsAt) / 1000;
    for (const c of this.callouts) {
      const obj = this.anchors.get(c.anchor);
      let visible = !!obj && age > 0.25 + c.i * 0.15;
      if (obj) {
        obj.updateWorldMatrix(true, false);
        obj.getWorldPosition(v);
        if (c.offset) v.add(new THREE.Vector3(...c.offset));
        for (let o = obj; o; o = o.parent) if (!o.visible) visible = false;
        if (obj.scale.x < 0.3) visible = false;
      }
      v.project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      let side = c.side ?? (c.i % 2 ? -1 : 1);
      const reach = c.reach ?? 70, wid = c.el.offsetWidth;
      // Flip a label to the other side rather than let it run off the screen.
      if (side > 0 && x + reach + wid > w - 8) side = -1;
      else if (side < 0 && x - reach - wid < 8) side = 1;
      // Keep the whole label on screen, even on a narrow phone.
      const lx = side > 0 ? Math.min(x + reach, w - 8 - wid) : Math.max(x - reach, 8 + wid);
      const ly = y - (c.lift ?? 64);
      c.el.style.transform = `translate(${lx}px, ${ly}px) translate(${side > 0 ? '0' : '-100%'}, -50%)`;
      c.line.setAttribute('x1', x);
      c.line.setAttribute('y1', y);
      c.line.setAttribute('x2', lx);
      c.line.setAttribute('y2', ly);
      c.dot.setAttribute('cx', x);
      c.dot.setAttribute('cy', y);
      const on = visible && v.z < 1;
      c.el.classList.toggle('is-on', on);
      c.line.classList.toggle('is-on', on);
      c.dot.classList.toggle('is-on', on);
    }
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    this.onTick?.(dt);
    for (const f of this.fx) f.update(dt, this.time);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.placeCallouts();
  }
}

// The Director is what a step's `run` function uses to script its animation.
export class Director {
  constructor(tl, world) {
    this.tl = tl;
    this.w = world;
  }

  // Where an object belongs. Parts of a prop (one seat log of four) are recorded the
  // first time a step touches them, which is always straight after the scene is built.
  home(obj) {
    let h = this.w.homes.get(obj);
    if (!h) {
      h = { position: obj.position.clone(), quaternion: obj.quaternion.clone(), scale: obj.scale.clone() };
      this.w.homes.set(obj, h);
    }
    return h;
  }

  // Pop an object into view at its home scale.
  show(obj, at, dur = 0.55) {
    const s = this.home(obj).scale;
    return this.tl.add(at, dur, (p) => obj.scale.copy(s).multiplyScalar(Math.max(0.001, p)), {
      ease: ease.outBack,
      begin: () => {
        obj.visible = true;
        obj.scale.setScalar(0.001);
      },
    });
  }

  hide(obj, at, dur = 0.35) {
    let s0;
    return this.tl.add(at, dur, (p) => {
      obj.scale.copy(s0).multiplyScalar(Math.max(0.001, 1 - p));
      if (p >= 1) obj.visible = false;
    }, { ease: ease.in, begin: () => (s0 = obj.scale.clone()) });
  }

  // Drop an object in from above to its home position.
  drop(obj, at, dur = 0.6, height = 1.2) {
    const home = this.home(obj).position;
    return this.tl.add(at, dur, (p) => obj.position.set(home.x, home.y + height * (1 - p), home.z), {
      ease: ease.out,
      begin: () => {
        obj.visible = true;
        obj.scale.copy(this.home(obj).scale);
      },
    });
  }

  // Move/rotate to a target. `to.pos` is a position, `to.rot` Euler angles in radians.
  move(obj, to, at, dur = 0.6, e = ease.inOut) {
    let p0, q0;
    const p1 = to.pos ? new THREE.Vector3(...to.pos) : null;
    const q1 = to.rot ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...to.rot)) : null;
    return this.tl.add(at, dur, (p) => {
      if (p1) obj.position.lerpVectors(p0, p1, p);
      if (q1) obj.quaternion.slerpQuaternions(q0, q1, p);
    }, { ease: e, begin: () => { p0 = obj.position.clone(); q0 = obj.quaternion.clone(); obj.visible = true; } });
  }

  // Move from a start placement to the object's home placement.
  arrive(obj, from, at, dur = 0.7, e = ease.inOut) {
    const h = this.home(obj);
    const p0 = new THREE.Vector3(...from.pos);
    const q0 = from.rot ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...from.rot)) : h.quaternion;
    return this.tl.add(at, dur, (p) => {
      obj.position.lerpVectors(p0, h.position, p);
      obj.quaternion.slerpQuaternions(q0, h.quaternion, p);
    }, { ease: e, begin: () => { obj.visible = true; obj.scale.copy(h.scale); } });
  }

  // Tween a number on any object, e.g. fire.intensity.
  to(target, key, value, at, dur = 1, e = ease.inOut) {
    let v0;
    return this.tl.add(at, dur, (p) => (target[key] = v0 + (value - v0) * p), { ease: e, begin: () => (v0 = target[key]) });
  }

  camera({ pos, target }, at, dur = 1.4) {
    const cam = this.w.camera, ctl = this.w.controls;
    let p0, t0;
    const p1 = new THREE.Vector3(...pos), t1 = new THREE.Vector3(...target);
    return this.tl.add(at, dur, (p) => {
      cam.position.lerpVectors(p0, p1, p);
      ctl.target.lerpVectors(t0, t1, p);
    }, { begin: () => { p0 = cam.position.clone(); t0 = ctl.target.clone(); } });
  }

  call(at, fn) {
    return this.tl.call(at, fn);
  }

  hold(until) {
    return this.tl.hold(until);
  }
}
