import * as THREE from 'three';
import { ease } from '../engine/timeline.js';
import * as blades from '../models/blades.js';
import * as kit from '../models/kit.js';
import { figure, stump } from '../models/figure.js';
import { mat } from '../models/util.js';
import { point, callout } from './helpers.js';

// Lesson: knife law, the blood bubble, carving safely, sheathing and passing, and
// first aid for cuts. The student (A) sits on a stump at the centre facing +Z.

const VIEW = {
  law: { pos: [2.6, 1.5, 1.1], target: [1.15, 0.2, -0.45] },
  display: { pos: [1.55, 0.95, 0.0], target: [1.2, 0.27, -0.7] },
  seat: { pos: [1.5, 1.4, 2.7], target: [0, 0.6, 0.2] },
  wide: { pos: [3.4, 3.6, 4.6], target: [-0.3, 0.3, 0.4] },
  carve: { pos: [1.55, 1.45, 2.3], target: [0, 0.5, 0.45] },
  pass: { pos: [2.4, 1.6, 1.6], target: [0.05, 0.65, 0.5] },
  aid: { pos: [1.9, 1.6, 2.7], target: [0.2, 0.7, 0.35] },
};

// Arm pose targets (x to the student's left, y up, z forward). Carving targets are in
// pelvis space, so they hold still while the body leans forward to carve.
const POSE = {
  stickHand: [0.1, -0.02, 0.42],
  knifeFrom: [-0.03, 0.04, 0.42],
  knifeTo: [0.0, -0.05, 0.52],
  pointTo: [0.0, -0.04, 0.5],
  pointFrom: [-0.02, 0.03, 0.43],
  armOut: [-0.72, 0.42, 0.02],
};
const LEAN = 0.55;
const STICK_DIR = new THREE.Vector3(-0.25, -0.3, 1).normalize();
const BLADE_DIR = new THREE.Vector3(0.12, -0.45, 1).normalize();

// Holds a hand-held object at a fixed angle in the world (and, optionally, a fixed
// distance out from the hand), however the arm is posed.
class Aim {
  constructor(obj, dir, reach = null) {
    this.group = new THREE.Group();
    this.obj = obj;
    this.dir = dir;
    this.reach = reach;
    this.on = false;
    this.q0 = obj.quaternion.clone();
    this.p0 = obj.position.clone();
  }
  set(on) {
    this.on = on;
    if (!on) {
      this.obj.quaternion.copy(this.q0);
      this.obj.position.copy(this.p0);
    }
  }
  update() {
    if (!this.on) return;
    const parent = this.obj.parent;
    parent.updateWorldMatrix(true, false);
    const pq = parent.getWorldQuaternion(new THREE.Quaternion());
    const want = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), this.dir);
    this.obj.quaternion.copy(pq.invert().multiply(want));
    if (this.reach != null) {
      const hand = parent.getWorldPosition(new THREE.Vector3());
      this.obj.position.copy(parent.worldToLocal(hand.add(this.dir.clone().multiplyScalar(this.reach))));
    }
  }
}

function lean(d, fig, to, at, dur = 0.8) {
  return d.to(fig.waist.rotation, 'x', to, at, dur);
}

// Turn a figure to face a heading, the short way round.
function turn(d, fig, yaw, at, dur = 0.5) {
  let from, delta;
  return d.tl.add(at, dur, (p) => (fig.root.rotation.y = from + delta * p), {
    begin: () => {
      from = fig.root.rotation.y;
      delta = Math.atan2(Math.sin(yaw - from), Math.cos(yaw - from));
    },
  });
}

function walk(d, fig, from, to, at, dur) {
  const yaw = Math.atan2(to[0] - from[0], to[2] - from[2]);
  return d.tl.add(at, dur, (p) => {
    fig.root.position.set(from[0] + (to[0] - from[0]) * p, Math.abs(Math.sin(p * Math.PI * 6)) * 0.025, from[2] + (to[2] - from[2]) * p);
    fig.root.rotation.y = yaw;
  }, { ease: ease.linear, begin: () => { fig.root.visible = true; fig.root.scale.setScalar(1); } });
}

// Tween a hand from wherever it is to a target, re-solving the arm each frame.
// Targets carry their space: a plain array is waist space; { p: [...] } is pelvis space.
function reachTo(d, fig, side, target, at, dur = 0.8, e = ease.inOut) {
  let from;
  const space = Array.isArray(target) ? 'waist' : 'pelvis';
  const t = new THREE.Vector3(...(Array.isArray(target) ? target : target.p));
  return d.tl.add(at, dur, (p) => {
    const v = from.clone().lerp(t, p);
    fig.reach(side, v.toArray(), undefined, space);
    fig.hands[side] = v;
    fig.spaces[side] = space;
  }, { ease: e, begin: () => (from = (fig.spaces[side] === space ? fig.hands[side] : t).clone()) });
}

function build(w) {
  const k = {};

  // The knife tub, groundsheet and the six course knives.
  k.tub = blades.tub();
  k.tub.position.set(1.2, 0, -0.75);
  k.tub.rotation.y = -0.35;
  w.add('tub', k.tub, { hidden: true });
  k.sheet = kit.groundsheet(0.95, 0.42);
  k.sheet.position.set(1.3, 0.005, -0.12);
  k.sheet.rotation.y = -0.35;
  w.add('sheet', k.sheet, { hidden: true });
  k.six = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const { group } = blades.fixedKnife({ scale: 1.5 });
    const sh = blades.sheath({ scale: 1.5 });
    sh.position.x = 0.003;
    g.add(group, sh);
    g.rotation.set(Math.PI / 2, 0, Math.PI / 2 - 0.35);
    g.position.set(0.95 + i * 0.13, 0.025, -0.06 - i * 0.045);
    k.six.push(w.add(`six${i}`, g, { hidden: true }));
  }

  // Display on the tub lid: pocketknife against a ruler, and a fixed blade.
  k.display = new THREE.Group();
  k.display.position.y = 0.24;
  k.tub.add(k.display);
  const pk = blades.pocketKnife({ scale: 2.5 });
  k.pocket = pk.group;
  k.pocketBlade = pk.blade;
  k.pocket.rotation.x = -Math.PI / 2;
  k.pocket.position.set(-0.05, 0.03, 0.1);
  k.pocket.visible = false;
  k.display.add(k.pocket);
  w.anchor('pocket', k.pocket);
  k.ruler = blades.ruler(2.5);
  k.ruler.position.set(-0.05 + 0.0 + 0.1325, 0.002, 0.14);
  k.ruler.visible = false;
  k.display.add(k.ruler);
  w.anchor('mark', point(-0.05 + 7.62 * 0.0265, 0.01, 0.14));
  k.display.add(w.anchors.get('mark'));
  const fk = blades.fixedKnife({ scale: 2.5 });
  k.fixedShow = fk.group;
  k.fixedShow.rotation.x = -Math.PI / 2;
  k.fixedShow.position.set(-0.05, 0.03, -0.08);
  k.fixedShow.visible = false;
  k.display.add(k.fixedShow);
  w.anchor('fixed', k.fixedShow);

  // The student (A) on a stump, holding a sheathed knife in the right hand.
  k.stumpA = w.add('stumpA', stump(), { hidden: true });
  k.A = figure({ seated: true });
  k.A.hands = { r: new THREE.Vector3(-0.13, -0.03, 0.36), l: new THREE.Vector3(0.13, -0.03, 0.36) };
  k.A.spaces = { r: 'waist', l: 'waist' };
  w.add('A', k.A.root, { hidden: true });
  const kn = blades.fixedKnife({ scale: 1.5 });
  k.knife = kn.group;
  k.knife.rotation.set(0, 0, -Math.PI / 2 + 0.35);
  k.knife.position.y = -0.03;
  k.A.arms.r.hand.add(k.knife);
  k.cover = blades.sheath();
  k.cover.position.x = 0.003;
  k.knife.add(k.cover);
  w.anchor('knife', point(0.08, 0, 0));
  k.knife.add(w.anchors.get('knife'));
  k.belt = blades.sheath({ scale: 1.5 });
  k.belt.rotation.z = -Math.PI / 2;
  k.belt.position.set(0.15, 0.05, 0.06);
  k.belt.visible = false;
  k.A.waist.add(k.belt);
  w.anchor('lefthand', k.A.arms.l.hand);
  w.anchor('righthand', k.A.arms.r.hand);
  w.anchor('lap', point(0, 0.5, 0.25));
  w.props.add(w.anchors.get('lap'));

  // The stick in the left hand, pointing forward from the fist.
  k.stick = blades.carvingStick(0.36, 0.015);
  k.stick.rotation.z = -Math.PI / 2 - 0.25;
  k.stick.position.set(0.02, -0.2, 0.0);
  k.stick.visible = false;
  k.A.arms.l.hand.add(k.stick);
  w.anchor('tip', k.stick.userData.tip);
  k.aimStick = w.addFx(new Aim(k.stick, STICK_DIR, 0.16));
  k.aimKnife = w.addFx(new Aim(k.knife, BLADE_DIR));

  // Shavings that fly off the stick.
  k.shavings = [];
  for (let i = 0; i < 8; i++) {
    const s = blades.shaving(i + 1);
    s.position.set(0.05 + (i % 4) * 0.04, 0.4, 0.75 + (i >> 2) * 0.04);
    k.shavings.push(w.add(`shaving${i}`, s, { hidden: true }));
  }

  // The "never here" zone over the lap.
  k.danger = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.36),
    new THREE.MeshBasicMaterial({ color: '#d23a2a', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
  );
  k.danger.rotation.x = -Math.PI / 2;
  k.danger.position.set(0, 0.58, 0.24);
  w.add('danger', k.danger, { hidden: true });
  k.safe = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 32),
    new THREE.MeshBasicMaterial({ color: '#3c7a4b', transparent: true, opacity: 0.35, depthWrite: false }),
  );
  k.safe.rotation.x = -Math.PI / 2;
  k.safe.position.set(0, 0.02, 0.75);
  w.add('safe', k.safe, { hidden: true });

  // Blood bubbles.
  k.bubble = blades.bubble(1.0);
  w.add('bubble', k.bubble, { hidden: true });
  w.anchor('bubbleEdge', point(0.72, 0.62, 0.62));
  w.props.add(w.anchors.get('bubbleEdge'));

  // A second student (B) two bubbles away, and a standing person (C).
  k.stumpB = stump();
  k.stumpB.position.set(-1.85, 0, 1.05);
  w.add('stumpB', k.stumpB, { hidden: true });
  k.B = figure({ seated: true, tint: '#cfae84' });
  k.B.root.position.set(-1.85, 0, 1.05);
  k.B.root.rotation.y = 0.9;
  w.add('B', k.B.root, { hidden: true });
  k.bubbleB = blades.bubble(1.0);
  k.bubbleB.position.set(-1.85, 0, 1.05);
  w.add('bubbleB', k.bubbleB, { hidden: true });

  k.C = figure({ seated: false, tint: '#c9a57a' });
  k.C.hands = { r: new THREE.Vector3(-0.24, -0.02, 0.04), l: new THREE.Vector3(0.24, -0.02, 0.04) };
  k.C.spaces = { r: 'waist', l: 'waist' };
  w.anchor('Chead', k.C.head);
  k.C.root.position.set(2.4, 0, 1.3);
  w.add('C', k.C.root, { hidden: true });
  w.anchor('Chand', k.C.arms.r.hand);

  // First aid.
  k.aid = kit.firstAid();
  k.aid.position.set(-0.35, 0, 0.7);
  w.add('aid', k.aid, { hidden: true });
  k.pad = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.06), mat('#ffffff'));
  k.pad.position.set(0, -0.06, 0.02);
  k.pad.visible = false;
  k.A.arms.r.hand.add(k.pad);
  k.cut = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, 0.008), mat('#b3261e'));
  k.cut.position.set(0, -0.04, 0.02);
  k.cut.visible = false;
  k.A.arms.l.hand.add(k.cut);
  return k;
}

const sheathOn = (d, k, at) => {
  d.call(at, () => (k.belt.visible = false));
  d.call(at, () => { k.cover.visible = true; });
  return d.tl.add(at, 0.5, (p) => (k.cover.position.x = 0.003 + (1 - p) * 0.14), { ease: ease.out });
};
const sheathOff = (d, k, at) => {
  d.tl.add(at, 0.5, (p) => (k.cover.position.x = 0.003 + p * 0.14), { ease: ease.in });
  d.call(at + 0.5, () => { k.cover.visible = false; k.belt.visible = true; });
  return at + 0.5;
};

export default {
  id: 'knives',
  title: 'Using a knife safely',
  short: 'Knives',
  ref: '486 324',
  place: 'Camp 4, Ash Bank',
  minutes: 14,
  summary: 'Knife law, your blood bubble, carving away from yourself, sheathing and passing, and first aid for cuts.',
  build,

  stages: [
    {
      title: 'Knives and the law',
      card: 'Law',
      lede: 'Knives on this course belong to the course. They’re handed out by your leader and counted back in.',
      steps: [
        {
          label: 'Course knives are counted out',
          callouts: [callout('tub', 'Knife tub', { lift: 70, side: -1 }), callout('six5', 'Counted out: 6 knives', { lift: 70 })],
          run(d, k) {
            d.camera(VIEW.law, 0);
            d.show(k.tub, 0.2, 0.5);
            d.move(k.tub.userData.lid, { rot: [-1.9, 0, 0] }, 0.9, 0.7);
            d.show(k.sheet, 1.2, 0.4);
            k.six.forEach((s, i) => d.arrive(s, { pos: [1.2, 0.5, -0.75] }, 1.6 + i * 0.3, 0.5));
            d.move(k.tub.userData.lid, { rot: [0, 0, 0] }, 3.8, 0.6);
            return d.hold(5.4);
          },
        },
        {
          label: 'Small folding knives: 3 inches at most',
          callouts: [callout('pocket', 'Folding, doesn’t lock', { side: -1, lift: 60 }), callout('mark', '3 in (7.62 cm)', { lift: 60 })],
          run(d, k) {
            d.camera(VIEW.display, 0);
            d.show(k.ruler, 0.4, 0.4);
            d.show(k.pocket, 0.7, 0.4);
            d.tl.add(1.4, 1.2, (p) => (k.pocketBlade.rotation.z = Math.PI * (1 - p)), { ease: ease.inOut });
            return d.hold(4.6);
          },
        },
        {
          label: 'Lock knives and fixed blades need a good reason',
          callouts: [callout('fixed', 'Fixed blade: good reason only', { side: -1, lift: 80 })],
          run(d, k) {
            d.show(k.fixedShow, 0.5, 0.5);
            return d.hold(3.8);
          },
        },
      ],
      why: [
        'In the UK it’s against the law to carry a knife in public without a good reason. The exception is a small folding pocketknife that doesn’t lock, with a cutting edge of 3 inches (7.62 cm) or less.',
        'Lock knives (which lock open and need a button or catch pressed to fold) and fixed blades don’t count as pocketknives in law, however small they are.',
        'Carrying any other knife onto school premises without a good reason is a criminal offence, and school rules ban even small pocketknives. Knives for this course stay with the course: your leader hands them out and counts them back in.',
        'It’s illegal for a shop to sell a knife to anyone under 18.',
      ],
      safety: [
        'Never bring your own knife to a session.',
        'Never take a course knife home or out of the session area.',
        'Tell your leader straight away if a knife goes missing.',
      ],
      teacher: {
        say: ['Show the knife tub, the count sheet and where knives are stored. Count the knives out with the group watching.'],
        ask: ['Why can a knife be fine in a bushcraft session but illegal on the walk home?'],
      },
      check: {
        q: 'Which knife can usually be carried in public without a special reason?',
        options: ['A fixed-blade bushcraft knife', 'A small folding knife that doesn’t lock, with a blade of 3 inches or less', 'Any lock knife under 3 inches'],
        answer: 1,
        why: 'Only a small, non-locking folding pocketknife is allowed without a good reason. Lock knives and fixed blades always need one.',
      },
    },

    {
      title: 'Your blood bubble',
      card: 'Bubble',
      lede: 'The space you could reach with your arm and knife is your blood bubble. Nobody else comes inside it.',
      steps: [
        {
          label: 'Sit steady, feet flat',
          callouts: [callout('lap', 'Feet flat, knees apart', { lift: 60 })],
          run(d, k) {
            d.camera(VIEW.seat, 0);
            d.show(k.stumpA, 0.2, 0.5);
            d.drop(k.A.root, 0.6, 0.6, 0.4);
            return d.hold(3.6);
          },
        },
        {
          label: 'Measure your bubble',
          callouts: [callout('bubbleEdge', 'Arm + knife = your bubble', { lift: 40 })],
          run(d, k) {
            d.camera(VIEW.wide, 0);
            reachTo(d, k.A, 'r', POSE.armOut, 0.4, 0.8);
            // Turn at the waist: arm sweeps round to the front, then behind, then back.
            d.tl.add(1.3, 3.0, (p) => (k.A.waist.rotation.y = 1.4 * Math.sin(p * Math.PI * 2)), { ease: ease.linear });
            d.show(k.bubble, 1.6, 1.4);
            reachTo(d, k.A, 'r', [-0.13, -0.03, 0.36], 4.4, 0.8);
            return d.hold(6.2);
          },
        },
        {
          label: 'Keep two bubbles apart',
          callouts: [callout('bubbleB', 'Nobody inside your bubble', { lift: 40, side: -1 })],
          run(d, k) {
            d.show(k.stumpB, 0.3, 0.5);
            d.drop(k.B.root, 0.7, 0.6, 0.4);
            d.show(k.bubbleB, 1.4, 1.0);
            return d.hold(4);
          },
        },
        {
          label: 'Someone close? Sheath it and stop',
          callouts: [callout('Chead', 'Inside the bubble: stop', { lift: 40 })],
          run(d, k) {
            walk(d, k.C, [2.4, 0, 1.3], [0.85, 0, 0.6], 0.4, 2.4);
            d.to(k.bubble.userData.tone, 'v', 1, 2.0, 0.6);
            sheathOn(d, k, 0.4);
            return d.hold(5);
          },
        },
      ],
      why: [
        'Your blood bubble is the space you could reach with your arm out and the knife in your hand. Check it before you start by holding the sheathed knife at arm’s length and turning slowly.',
        'Nobody should be inside your bubble while your knife is out, and you shouldn’t be inside anyone else’s. Space seats at least two bubbles apart.',
        'If someone comes into your bubble, stop cutting and sheath the knife. Only start again when they’ve moved away.',
      ],
      safety: [
        'Knives only come out when you’re seated in your place and the leader says so.',
        'Walk around other people’s bubbles, never through them.',
        'If you need to move, sheath the knife first.',
      ],
      teacher: {
        say: ['Have each student check their bubble with a sheathed knife before anyone unsheathes.'],
        ask: ['What should you do if a friend walks up to talk while you’re carving?'],
      },
      check: {
        q: 'Someone walks into your blood bubble while you’re carving. What do you do?',
        options: ['Keep carving, but carefully', 'Stop and sheath the knife until they move away', 'Point the knife away from them'],
        answer: 1,
        why: 'Stop and sheath it. A slip only matters if someone is within reach, so make sure nobody is.',
      },
    },

    {
      title: 'Carve safely',
      card: 'Carve',
      lede: 'Elbows on knees, cut away from yourself, out beyond your knees.',
      steps: [
        {
          label: 'Elbows on knees, knife out',
          callouts: [callout('righthand', 'Elbows resting on knees', { side: -1, lift: 60 })],
          run(d, k) {
            d.camera(VIEW.carve, 0);
            d.hide(k.C.root, 0, 0.3);
            d.to(k.bubble.userData.tone, 'v', 0, 0, 0.5);
            d.hide(k.bubble, 0.2, 0.4);
            d.hide(k.bubbleB, 0.2, 0.4);
            sheathOff(d, k, 0.6);
            d.call(1.0, () => { k.aimStick.set(true); k.aimKnife.set(true); });
            d.show(k.stick, 1.0, 0.4);
            lean(d, k.A, LEAN, 1.0, 0.9);
            reachTo(d, k.A, 'l', { p: POSE.stickHand }, 1.0, 0.9);
            reachTo(d, k.A, 'r', { p: POSE.knifeFrom }, 1.2, 0.9);
            return d.hold(4);
          },
        },
        {
          label: 'Cut away from you, beyond your knees',
          callouts: [callout('safe', 'If it slips, it goes here', { lift: 40 }), callout('lap', 'Never over your lap', { side: -1, lift: 50 })],
          run(d, k) {
            d.show(k.safe, 0.2, 0.5);
            d.show(k.danger, 0.4, 0.5);
            let at = 0.9;
            for (let i = 0; i < 4; i++) {
              reachTo(d, k.A, 'r', { p: POSE.knifeTo }, at, 0.45, ease.in);
              d.show(k.shavings[i], at + 0.35, 0.2);
              d.move(k.shavings[i], { pos: [0.05 + i * 0.05, 0.02, 0.85 + (i % 2) * 0.06], rot: [1, i, 0.4] }, at + 0.45, 0.6, ease.in);
              reachTo(d, k.A, 'r', { p: POSE.knifeFrom }, at + 0.5, 0.5);
              at += 1.1;
            }
            return d.hold(at + 1.2);
          },
        },
        {
          label: 'Holding hand behind the blade',
          callouts: [callout('lefthand', 'Holding hand stays behind the blade', { lift: 70 })],
          run(d) {
            return d.hold(3.8);
          },
        },
        {
          label: 'Make a point with short strokes',
          callouts: [callout('tip', 'Short, controlled strokes', { lift: 60 })],
          run(d, k) {
            d.hide(k.danger, 0, 0.3);
            let at = 0.4;
            for (let i = 4; i < 8; i++) {
              reachTo(d, k.A, 'r', { p: POSE.pointTo }, at, 0.35, ease.in);
              d.show(k.shavings[i], at + 0.3, 0.2);
              d.move(k.shavings[i], { pos: [-0.05 + (i - 4) * 0.05, 0.02, 0.9], rot: [1, i, 0.4] }, at + 0.35, 0.6, ease.in);
              reachTo(d, k.A, 'r', { p: POSE.pointFrom }, at + 0.4, 0.4);
              at += 0.85;
            }
            d.call(at - 0.4, () => (k.stick.userData.tip.visible = true));
            return d.hold(at + 1.4);
          },
        },
      ],
      why: [
        'Sit with your elbows or forearms resting on your knees. Your arms are steady and the knife can only move forward, away from you.',
        'Cut away from your body, out in front of your knees. If the blade slips, it goes into the ground, not into you. Never carve over your lap or between your thighs: a large artery runs down the inside of each thigh.',
        'Keep the hand holding the wood behind the blade, so the knife can never travel towards it.',
        'Use short, controlled strokes. A sharp knife is safer than a blunt one, because it bites without needing force.',
      ],
      safety: [
        'Your leader may ask you to wear a cut-resistant glove on the hand that holds the wood.',
        'Stop when your hands are cold or tired: that’s when slips happen.',
        'Never use a knife to pry, throw or point at someone.',
      ],
      teacher: {
        say: ['Demonstrate a slip: show with a sheathed knife how a stroke beyond the knees ends in the ground.'],
        ask: ['Why is carving over your lap so dangerous?'],
      },
      check: {
        q: 'Where should you carve?',
        options: ['Over your lap, so shavings fall on your legs', 'Out in front of your knees, cutting away from you', 'Towards your chest, for control'],
        answer: 1,
        why: 'Out in front of your knees and away from you, so a slip ends in the ground.',
      },
    },

    {
      title: 'Sheath, pass and put away',
      card: 'Pass',
      lede: 'A knife is either in your hand being used, or in its sheath.',
      steps: [
        {
          label: 'Sheath it whenever you stop',
          callouts: [callout('knife', 'Sheathed whenever you stop', { side: -1, lift: 60 })],
          run(d, k) {
            d.camera(VIEW.pass, 0);
            for (const s of k.shavings) d.hide(s, 0, 0.3);
            d.hide(k.safe, 0, 0.3);
            d.hide(k.stick, 0.3, 0.3);
            d.call(0.6, () => { k.aimStick.set(false); k.aimKnife.set(false); });
            lean(d, k.A, 0, 0.6, 0.7);
            reachTo(d, k.A, 'l', [0.13, -0.03, 0.36], 0.6, 0.7);
            reachTo(d, k.A, 'r', [-0.08, 0.05, 0.3], 0.6, 0.7);
            sheathOn(d, k, 1.2);
            return d.hold(3.6);
          },
        },
        {
          label: 'Pass it sheathed, handle first',
          callouts: [callout('Chand', 'Say “thank you” as you take it', { lift: 60 })],
          run(d, k) {
            walk(d, k.C, [2.4, 0, 1.3], [0.05, 0, 0.7], 0, 2.0);
            turn(d, k.C, Math.atan2(-0.05, -0.7), 2.0, 0.4);
            reachTo(d, k.A, 'r', [0.0, 0.26, 0.48], 2.4, 0.8);
            reachTo(d, k.C, 'r', [0.04, -0.06, 0.2], 2.6, 0.8);
            d.call(3.5, () => k.C.arms.r.hand.attach(k.knife));
            reachTo(d, k.A, 'r', [-0.13, -0.03, 0.36], 3.7, 0.7);
            reachTo(d, k.C, 'r', [-0.24, -0.02, 0.04], 3.8, 0.8);
            return d.hold(5.6);
          },
        },
        {
          label: 'Carry it sheathed, at your side',
          callouts: [callout('Chand', 'Sheathed, held at your side', { lift: 60 })],
          run(d, k) {
            d.camera(VIEW.law, 0, 1.6);
            walk(d, k.C, [0.05, 0, 0.7], [1.05, 0, -0.3], 0.3, 2.2);
            return d.hold(3.8);
          },
        },
        {
          label: 'Every knife counted back in',
          callouts: [callout('tub', 'Count them all back in', { lift: 70, side: -1 })],
          run(d, k) {
            d.move(k.tub.userData.lid, { rot: [-1.9, 0, 0] }, 0.2, 0.6);
            k.six.forEach((s, i) => d.move(s, { pos: [1.2, 0.4, -0.75] }, 0.9 + i * 0.25, 0.4));
            k.six.forEach((s, i) => d.hide(s, 1.2 + i * 0.25, 0.2));
            d.hide(k.knife, 1.0, 0.3);
            d.move(k.tub.userData.lid, { rot: [0, 0, 0] }, 3.2, 0.6);
            return d.hold(4.6);
          },
        },
      ],
      why: [
        'Sheath the knife every time you stop cutting, even for a moment. An open knife on the ground or a log is easy to kneel on or knock.',
        'Pass a knife sheathed and handle first. The person taking it says “thank you”, and only then does the giver let go, so nobody fumbles it.',
        'Never walk around with an open knife. Carry it sheathed, held at your side and pointing down.',
        'At the end of the session every knife is counted back in. The session isn’t over until the count is right.',
      ],
      safety: [
        'Never hand over or catch a falling knife: let it fall, then pick it up.',
        'Check the sheath clicks shut before you move.',
        'Wipe knives clean and dry before they go back in the tub.',
      ],
      teacher: {
        say: ['Practise the “thank you” pass with sheathed knives before any knife is unsheathed.'],
        ask: ['Why does the giver wait for “thank you” before letting go?'],
      },
      check: {
        q: 'How do you pass a knife to someone?',
        options: ['Blade first, so they can see it', 'Sheathed and handle first; they say “thank you” before you let go', 'Toss it gently onto the ground beside them'],
        answer: 1,
        why: 'Sheathed, handle first, and you let go only when they say “thank you”.',
      },
    },

    {
      title: 'If someone is cut',
      card: 'First aid',
      lede: 'Stop all knives, press on the cut and get an adult.',
      steps: [
        {
          label: 'Stop: every knife sheathed',
          callouts: [callout('lefthand', 'Small cut on the hand', { lift: 60 })],
          run(d, k) {
            d.camera(VIEW.aid, 0);
            d.call(0, () => (k.cut.visible = true));
            reachTo(d, k.A, 'l', [0.06, 0.12, 0.32], 0.4, 0.8);
            walk(d, k.C, [1.05, 0, -0.3], [-0.65, 0, 0.5], 0.6, 2.0);
            turn(d, k.C, Math.atan2(0.65, -0.5), 2.6, 0.4);
            d.show(k.aid, 2.4, 0.5);
            return d.hold(4.2);
          },
        },
        {
          label: 'Press firmly on the cut',
          callouts: [callout('righthand', 'Firm pressure with a clean pad', { side: -1, lift: 60 })],
          run(d, k) {
            d.show(k.pad, 0.4, 0.3);
            reachTo(d, k.A, 'r', [0.04, 0.16, 0.33], 0.4, 0.9);
            return d.hold(3.8);
          },
        },
        {
          label: 'Raise it and keep pressing',
          callouts: [callout('lefthand', 'Raise the hand', { lift: 50 })],
          run(d, k) {
            reachTo(d, k.A, 'l', [0.1, 0.4, 0.26], 0.3, 1.0);
            reachTo(d, k.A, 'r', [0.07, 0.44, 0.28], 0.35, 1.0);
            return d.hold(3.8);
          },
        },
        {
          label: 'Bad bleeding? Call 999',
          callouts: [callout('aid', 'Heavy bleeding: call 999', { lift: 50 })],
          run(d) {
            return d.hold(4);
          },
        },
      ],
      why: [
        'If anyone is cut, everyone stops and sheaths their knife. The adult in charge takes over.',
        'Press firmly on the cut with a clean pad or dressing, and keep pressing. Raising the hand above the heart helps slow the bleeding.',
        'Most knife cuts in bushcraft are small cuts to the hand holding the wood. Once the bleeding stops, clean it and cover it with a plaster or dressing.',
        'Call 999 if there’s a lot of blood, if the bleeding doesn’t stop with firm pressure, or if the cut is deep or long.',
      ],
      safety: [
        'Know where the first aid kit is before any knife comes out.',
        'Use gloves from the first aid kit when helping someone else.',
        'Tell an adult about every cut, however small.',
      ],
      teacher: {
        say: ['Point out the first aid kit and who the first aider is at the start of every knife session.'],
        ask: ['What two things slow bleeding from a cut hand?'],
      },
      check: {
        q: 'Someone cuts their hand. What should you do first?',
        options: ['Rinse it under a tap straight away', 'Press firmly on it with a clean pad and get an adult', 'Wrap it loosely and carry on carving'],
        answer: 1,
        why: 'Firm pressure and an adult first. Cleaning comes once the bleeding has stopped.',
      },
    },
  ],

  sources: [
    { title: 'Buying and carrying knives', publisher: 'GOV.UK', url: 'https://www.gov.uk/buying-carrying-knives' },
    { title: 'Criminal Justice Act 1988, section 139A (school premises)', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/ukpga/1988/33/section/139A' },
    { title: 'Cuts and grazes', publisher: 'NHS', url: 'https://www.nhs.uk/conditions/cuts-and-grazes/' },
    { title: 'Forest School Association', publisher: 'Forest School Association', url: 'https://forestschoolassociation.org/' },
  ],
};
