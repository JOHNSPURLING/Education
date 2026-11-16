import * as THREE from 'three';
import { ease } from '../engine/timeline.js';
import { Fire } from '../fx/fire.js';
import * as kit from '../models/kit.js';
import { rng, range, mat, shadowed } from '../models/util.js';

// Lesson: lighting, keeping and putting out a fire in a raised fire bowl.
// Wind blows towards +x, so the upwind (safe) side is -x.

const WIND = [0.55, 0, 0.05];
const BOWL_FLOOR = 0.27;

const VIEW = {
  wide: { pos: [6.0, 5.6, 7.4], target: [0, 0.1, 0] },
  site: { pos: [-4.6, 4.4, 5.8], target: [-0.2, 0.15, 0] },
  fuel: { pos: [0.3, 2.3, -3.2], target: [0.15, 0.05, -1.35] },
  bowl: { pos: [-2.3, 2.1, 1.7], target: [0, 0.3, 0] },
  low: { pos: [-2.1, 1.0, -0.55], target: [-0.05, 0.36, 0] },
  burn: { pos: [3.0, 2.4, 3.6], target: [0, 0.45, 0] },
};

// A stick that leans in towards the centre of the bowl, for the tipi.
function leaning(len, rad, seed, angle, baseR, lean, y0 = BOWL_FLOOR + 0.02, make = kit.stick) {
  const pivot = new THREE.Group();
  const s = make(len, rad, seed);
  s.position.x = len / 2;
  pivot.add(s);
  const dir = new THREE.Vector3(-Math.cos(angle) * Math.sin(lean), Math.cos(lean), -Math.sin(angle) * Math.sin(lean)).normalize();
  pivot.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  pivot.position.set(Math.cos(angle) * baseR, y0, Math.sin(angle) * baseR);
  return pivot;
}

function build(w) {
  const k = {};
  const r = rng(42);

  k.seats = new THREE.Group();
  [0.25, 1.82, 3.4, 4.97].forEach((a, i) => {
    const s = kit.seatLog(100 + i);
    s.position.set(Math.cos(a) * 2.15, 0, Math.sin(a) * 2.15);
    s.rotation.y = -a + Math.PI / 2;
    s.visible = false;
    k.seats.add(s);
  });
  w.add('seats', k.seats, { anchor: k.seats.children[1] });

  k.bowl = w.add('bowl', kit.fireBowl(), { hidden: true });
  w.anchor('rim', point(0.42, 0.44, 0.25));
  k.bowl.add(w.anchors.get('rim'));

  k.bucket = kit.bucket();
  k.bucket.position.set(-0.75, 0, 0.95);
  w.add('bucket', k.bucket, { hidden: true });
  k.blanket = kit.fireBlanket();
  k.blanket.position.set(-1.25, 0, 0.75);
  k.blanket.rotation.y = 0.5;
  w.add('blanket', k.blanket, { hidden: true });
  k.aid = kit.firstAid();
  k.aid.position.set(-1.45, 0, 0.3);
  k.aid.rotation.y = -0.3;
  w.add('aid', k.aid, { hidden: true });

  k.wind = kit.windArrow(1.5);
  k.wind.position.set(-0.1, 0.015, 1.65);
  w.add('wind', k.wind, { hidden: true });
  k.mat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.3), mat('#2f6f9e', { roughness: 0.7 }));
  k.mat.position.set(-0.82, 0.0125, 0.05);
  shadowed(k.mat);
  w.add('mat', k.mat, { hidden: true });

  // The "does it snap?" test stick: two halves that break apart.
  k.test = new THREE.Group();
  k.test.position.set(0.95, 0.03, 0.85);
  k.halfA = kit.stick(0.22, 0.012, 7);
  k.halfB = kit.stick(0.22, 0.012, 8);
  k.halfA.position.x = -0.11;
  k.halfB.position.x = 0.11;
  k.test.add(k.halfA, k.halfB);
  w.add('test', k.test, { hidden: true });

  // Fuel, sorted by thickness on a groundsheet.
  k.sheet = kit.groundsheet(1.25, 0.62);
  k.sheet.position.set(0.15, 0.005, -1.45);
  w.add('sheet', k.sheet, { hidden: true });
  const sizes = [
    ['match', 8, 0.3, 0.006, '#7a5c40'],
    ['pencil', 8, 0.36, 0.012, '#6f5238'],
    ['thumb', 6, 0.46, 0.022, '#654a33'],
    ['wrist', 4, 0.52, 0.045, '#5b4330'],
  ];
  k.piles = sizes.map(([name, n, len, rad, col], i) => {
    const p = kit.pile(n, len, rad, 200 + i, col);
    p.rotation.y = Math.PI / 2;
    p.position.set(-0.32 + i * 0.27, 0.01, -1.45);
    return w.add(name, p, { hidden: true });
  });

  k.cotton = kit.cottonWool();
  k.cotton.position.set(0.98, 0, -0.95);
  w.add('cotton', k.cotton, { hidden: true });
  k.birch = kit.birchBark();
  k.birch.position.set(1.12, 0, -1.12);
  w.add('birch', k.birch, { hidden: true });

  // In the bowl: platform, tinder bundle, tipi, feed sticks and logs.
  k.platform = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = kit.stick(0.32, 0.011, 300 + i);
    s.position.set(0, BOWL_FLOOR + 0.012, (i - 2) * 0.035);
    s.rotation.y = range(r, -0.08, 0.08);
    s.visible = false;
    k.platform.add(s);
  }
  w.add('platform', k.platform, { hidden: true });

  k.tinder = new THREE.Group();
  const cw = kit.cottonWool(5);
  cw.scale.setScalar(1.1);
  const bb = kit.birchBark(6);
  bb.scale.setScalar(0.9);
  k.tinder.add(cw, bb);
  k.tinder.position.set(0, BOWL_FLOOR + 0.02, 0);
  w.add('tinder', k.tinder, { hidden: true });

  k.tipi = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    if (Math.abs(((a + Math.PI) % (Math.PI * 2)) - Math.PI) > 2.75) continue; // a door facing the wind
    const s = leaning(i % 2 ? 0.36 : 0.32, i % 2 ? 0.012 : 0.008, 400 + i, a, 0.085, 0.42);
    k.tipi.push(w.add(`tipi${i}`, s, { hidden: true }));
  }
  w.anchor('door', point(-0.1, BOWL_FLOOR + 0.06, 0));
  w.props.add(w.anchors.get('door'));

  k.feed = [0.5, 1.7, 2.9, 4.1, 5.3].map((a, i) => w.add(`feed${i}`, leaning(0.48, 0.02, 500 + i, a, 0.16, 0.5), { hidden: true }));
  k.logs = [0.9, 3.0, 5.0].map((a, i) => w.add(`log${i}`, leaning(0.5, 0.042, 600 + i, a, 0.27, 1.15, BOWL_FLOOR + 0.05, kit.log), { hidden: true }));

  k.ash = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), mat('#8c8780', { roughness: 1 }));
  k.ash.rotation.x = -Math.PI / 2;
  k.ash.position.y = BOWL_FLOOR + 0.008;
  k.ash.receiveShadow = true;
  w.add('ash', k.ash, { hidden: true });

  k.rod = kit.ferroRod();
  k.rod.position.set(-0.6, 0.016, 0.42);
  k.rod.rotation.y = 0.4;
  k.rod.scale.setScalar(1.5); // drawn a little larger than life so it reads on screen
  w.add('rod', k.rod, { hidden: true });
  k.striker = kit.striker();
  k.striker.position.set(-0.52, 0.004, 0.52);
  k.striker.scale.setScalar(1.5);
  w.add('striker', k.striker, { hidden: true });

  k.stir = kit.stick(0.75, 0.014, 9, '#7a5c40');
  k.stir.position.set(-0.9, 0.02, -0.25);
  k.stir.rotation.y = 0.3;
  w.add('stir', k.stir, { hidden: true });

  w.anchor('hand', point(0, 0.45, 0));
  w.props.add(w.anchors.get('hand'));

  // Fire effects, centred in the bowl.
  k.fire = w.addFx(new Fire(w, { wind: WIND }));
  k.fire.group.position.set(0, BOWL_FLOOR + 0.03, 0);
  for (const o of [k.platform, k.tinder, ...k.tipi, ...k.feed, ...k.logs]) k.fire.burns(o);
  return k;
}

// Shared moves --------------------------------------------------------------

function snap(d, k, t) {
  d.show(k.test, t);
  d.move(k.halfA, { rot: [0, 0, 0.5], pos: [-0.12, 0.03, 0] }, t + 1.0, 0.25, ease.out);
  d.move(k.halfB, { rot: [0, 0, -0.5], pos: [0.12, 0.03, 0] }, t + 1.0, 0.25, ease.out);
  d.move(k.halfA, { rot: [0, 0.3, 0], pos: [-0.13, 0, 0.02] }, t + 1.3, 0.35, ease.in);
  return d.move(k.halfB, { rot: [0, -0.2, 0], pos: [0.13, 0, -0.01] }, t + 1.3, 0.35, ease.in);
}

function strike(d, k, t) {
  // Rod tip rests just above the tinder; the striker holds still, the rod pulls back.
  const tip = new THREE.Vector3(-0.06, BOWL_FLOOR + 0.07, 0);
  const rodIn = { pos: [-0.24, BOWL_FLOOR + 0.17, 0.0], rot: [0, 0, -0.7] };
  const rodBack = { pos: [-0.33, BOWL_FLOOR + 0.24, 0.0], rot: [0, 0, -0.7] };
  d.move(k.rod, rodIn, t, 0.9);
  d.move(k.striker, { pos: [-0.1, BOWL_FLOOR + 0.1, 0.03], rot: [0, 0, -2.3] }, t + 0.2, 0.9);
  let at = t + 1.4;
  for (let i = 0; i < 3; i++) {
    d.move(k.rod, rodBack, at, 0.22, ease.out);
    d.call(at + 0.05, () => k.fire.spark(tip.clone().add(new THREE.Vector3(-0.02, 0.03, 0)), new THREE.Vector3(0.45, -0.6, 0)));
    d.move(k.rod, rodIn, at + 0.5, 0.4);
    at += 1.0;
  }
  return at;
}

function pour(d, k, t) {
  d.move(k.bucket, { pos: [-0.85, 0.7, 0.2], rot: [0, 0, 0] }, t, 0.8);
  d.move(k.bucket, { pos: [-0.62, 0.9, 0.05], rot: [0, 0, -1.75] }, t + 0.8, 0.7);
  d.to(k.fire, 'steam', 1, t + 1.2, 0.6);
  d.move(k.bucket, { pos: [-0.85, 0.7, 0.2], rot: [0, 0, 0] }, t + 2.4, 0.6);
  return d.move(k.bucket, { pos: [-0.75, 0, 0.95], rot: [0, 0, 0] }, t + 3.0, 0.7);
}

function point(x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  return o;
}

const callout = (anchor, text, opts = {}) => ({ anchor, text, ...opts });

// The lesson --------------------------------------------------------------

export default {
  id: 'fire',
  title: 'Lighting a fire',
  short: 'Fire',
  ref: '482 317',
  place: 'Camp 1, Hollow Copse',
  minutes: 12,
  summary: 'Set up safely, sort your fuel, light a fire with a ferro rod and put it out properly.',
  build,

  stages: [
    {
      title: 'Set up safely',
      card: 'Set up',
      lede: 'Before anyone strikes a spark, the site, the kit and the rules are ready.',
      steps: [
        {
          label: 'Use the agreed fire spot',
          callouts: [callout('seats', 'Fire circle seating', { lift: 50 })],
          run(d, k) {
            d.camera(VIEW.wide, 0);
            k.seats.children.forEach((s, i) => d.drop(s, 0.3 + i * 0.18, 0.5, 0.6));
            return d.hold(3.2);
          },
        },
        {
          label: 'Raised fire bowl, off the ground',
          callouts: [callout('rim', 'Raised fire bowl')],
          run(d, k) {
            d.camera(VIEW.site, 0);
            d.drop(k.bowl, 0.4, 0.7, 1.5);
            return d.hold(3);
          },
        },
        {
          label: 'Water, fire blanket and first aid in reach',
          callouts: [callout('bucket', 'Bucket of water', { side: -1 }), callout('blanket', 'Fire blanket', { side: -1, lift: 40 }), callout('aid', 'First aid kit', { side: -1, lift: 80 })],
          run(d, k) {
            d.show(k.bucket, 0.2);
            d.show(k.blanket, 0.5);
            d.show(k.aid, 0.8);
            return d.hold(3.4);
          },
        },
        {
          label: 'Check the wind; kneel upwind',
          callouts: [callout('wind', 'Wind direction', { lift: 40 }), callout('mat', 'Kneel here, upwind', { side: -1 })],
          run(d, k) {
            d.camera(VIEW.wide, 0);
            d.show(k.wind, 0.3, 0.7);
            d.show(k.mat, 0.9);
            return d.hold(3.6);
          },
        },
      ],
      why: [
        'You need the landowner’s permission to light a fire. On a school trip that means the agreed fire site, with an adult who has said yes — never a spot you picked yourself.',
        'A raised fire bowl keeps the heat off the ground, so it doesn’t scorch the soil and roots, and it makes leaving no trace easy.',
        'Wind pushes smoke, heat and sparks downwind. Working from the upwind side keeps them away from you.',
      ],
      safety: [
        'Tie back long hair. Tuck in scarves, toggles, cords and loose sleeves.',
        'Walk around the outside of the fire circle, never across it.',
        'Only come into the circle when the adult in charge invites you.',
        'Water and a fire blanket are ready before anything is lit.',
        'For a burn, cool it under cool running water for 20 minutes and tell an adult straight away.',
      ],
      teacher: {
        say: ['Show the group where the water, fire blanket and first aid kit are, and who is in charge.', 'Agree a clear “stop” signal before you start.'],
        ask: ['Which way is the wind blowing today? How can you tell?', 'Why do we walk around the circle rather than across it?'],
      },
      check: {
        q: 'Where should you kneel to tend the fire?',
        options: ['Downwind, so the smoke blows past you', 'Upwind, so smoke and sparks blow away from you', 'Wherever is closest to the fuel pile'],
        answer: 1,
        why: 'Upwind: the wind carries smoke, heat and sparks away from you.',
      },
    },

    {
      title: 'Collect and sort fuel',
      card: 'Fuel',
      lede: 'A fire needs tinder to catch the spark, kindling to grow the flame and fuel wood to keep it going.',
      steps: [
        {
          label: 'Dead, dry and fallen',
          callouts: [callout('test', 'Snaps cleanly = dry', { lift: 56 })],
          run(d, k) {
            d.camera({ pos: [2.0, 1.1, 2.0], target: [0.95, 0.05, 0.85] }, 0);
            const t = snap(d, k, 0.6);
            return d.hold(t + 2.2);
          },
        },
        {
          label: 'Sort kindling by thickness',
          callouts: [
            callout('match', 'Matchstick', { lift: 60, reach: 40, side: 1 }),
            callout('pencil', 'Pencil', { lift: 130, reach: 30, side: 1 }),
            callout('thumb', 'Thumb', { lift: 130, reach: 30, side: -1 }),
            callout('wrist', 'Wrist: fuel wood', { lift: 60, reach: 40, side: -1 }),
          ],
          run(d, k) {
            d.camera(VIEW.fuel, 0);
            d.hide(k.test, 0);
            d.show(k.sheet, 0.4);
            k.piles.forEach((p, i) => d.drop(p, 0.9 + i * 0.45, 0.5, 0.5));
            return d.hold(4.4);
          },
        },
        {
          label: 'Get your tinder ready',
          callouts: [callout('cotton', 'Cotton wool', { side: -1, lift: 50 }), callout('birch', 'Birch bark', { lift: 50 })],
          run(d, k) {
            d.camera({ pos: [2.1, 1.25, -2.4], target: [1.0, 0.03, -1.0] }, 0);
            d.show(k.cotton, 0.6);
            d.show(k.birch, 1.0);
            return d.hold(3.6);
          },
        },
      ],
      why: [
        'Only collect dead wood that has already fallen. Never cut or snap branches off living trees: green wood is full of water and burns badly.',
        'If a stick snaps with a crack, it’s dry. If it bends, it’s damp or still alive, so leave it.',
        'Sorting by thickness lets you feed the fire one size at a time. Most fires fail because people jump from tiny sticks to big ones too soon.',
        'Collect about twice as much kindling as you think you’ll need, before you light. Running out at the key moment is the classic mistake.',
        'Birch bark is full of natural oils and can catch a spark even when damp. Cotton wool is cheap and reliable for practice.',
      ],
      safety: [
        'Collect from the ground. Don’t climb trees or pull at branches.',
        'Wear gloves where there are brambles or nettles.',
        'Leave plenty of dead wood behind: it’s home to insects and fungi.',
      ],
      teacher: {
        say: ['Hand round a dry stick and a green one so everyone can feel and hear the difference.'],
        ask: ['Show me a stick that would burn well and one that wouldn’t. What’s the difference?', 'Why might wood lying on wet ground still be damp inside?'],
      },
      check: {
        q: 'You pick up a stick and it bends instead of snapping. What does that tell you?',
        options: ['It’s dry and perfect for kindling', 'It’s damp or green, so leave it', 'It’s fuel wood, so add it to the big pile'],
        answer: 1,
        why: 'Dry dead wood snaps cleanly. A bendy stick holds water and will smoke rather than burn.',
      },
    },

    {
      title: 'Build the fire',
      card: 'Build',
      lede: 'Build the whole structure before you light it, so you never lean over a lit fire to fix it.',
      steps: [
        {
          label: 'Lay a dry platform',
          callouts: [callout('platform', 'Dry platform', { lift: 70 })],
          run(d, k) {
            d.camera(VIEW.bowl, 0);
            k.platform.children.forEach((s, i) => {
              d.tl.add(0.4 + i * 0.25, 0.5, (p) => {
                s.visible = true;
                s.position.y = BOWL_FLOOR + 0.012 + (1 - p) * 0.4;
              }, { ease: ease.out, begin: () => { k.platform.visible = true; } });
            });
            return d.hold(3.2);
          },
        },
        {
          label: 'Tinder in the middle',
          callouts: [callout('tinder', 'Tinder bundle', { lift: 80, side: -1 })],
          run(d, k) {
            d.arrive(k.tinder, { pos: [0.98, 0.05, -0.95] }, 0.4, 1.1);
            return d.hold(3);
          },
        },
        {
          label: 'Build a small tipi of kindling',
          callouts: [callout('door', 'Gap facing the wind', { side: -1, lift: 90 })],
          run(d, k) {
            k.tipi.forEach((s, i) => d.arrive(s, { pos: [-0.32 + (i % 2) * 0.27, 0.05, -1.45], rot: [0, Math.PI / 2, 0] }, 0.3 + i * 0.32, 0.75));
            return d.hold(0.3 + k.tipi.length * 0.32 + 2.4);
          },
        },
      ],
      why: [
        'A platform of dry sticks keeps the tinder off the cold metal so the heat isn’t drawn away.',
        'Fire needs heat, fuel and oxygen: the fire triangle. Take one away and it goes out. A tipi lets air in from every side and leads the flame up into the kindling.',
        'Leave a gap on the upwind side. That’s where your sparks go in, and the wind then blows the flame into the fire, not at you.',
      ],
      safety: [
        'Build first, light second. Don’t add to a fire you’ve just lit by leaning over it.',
        'Keep the fuel pile well back from the bowl.',
      ],
      teacher: {
        say: ['Name the three sides of the fire triangle as you build.'],
        ask: ['Which side of the fire triangle does a tipi help with?', 'What would happen if we packed the sticks tightly together?'],
      },
      check: {
        q: 'Why do we leave gaps between the sticks in a tipi?',
        options: ['So it looks neat', 'So air (oxygen) can reach the flame', 'So the fire burns more slowly'],
        answer: 1,
        why: 'Oxygen is one side of the fire triangle. Packed-tight sticks starve the flame.',
      },
    },

    {
      title: 'Light it',
      card: 'Light',
      lede: 'One knee down, upwind, sparks aimed into the tinder.',
      steps: [
        {
          label: 'Kneel on one knee, upwind',
          callouts: [callout('mat', '“Respect position”: one knee down', { side: -1, lift: 70 })],
          run(d, k) {
            d.camera(VIEW.low, 0, 1.6);
            d.show(k.rod, 0.8);
            d.show(k.striker, 1.0);
            return d.hold(3.4);
          },
        },
        {
          label: 'Strike the ferro rod',
          callouts: [callout('striker', 'Striker stays still', { lift: 80 }), callout('rod', 'Pull the rod back', { side: -1, lift: 60 })],
          run(d, k) {
            const t = strike(d, k, 0.2);
            d.to(k.fire, 'intensity', 0.12, t - 0.6, 0.8);
            return d.hold(t + 1.2);
          },
        },
        {
          label: 'Let the flame catch, then step back',
          callouts: [callout('tinder', 'Tinder catches', { lift: 90 })],
          run(d, k) {
            d.move(k.rod, { pos: [-0.6, 0.016, 0.42], rot: [0, 0.4, 0] }, 0, 0.8);
            d.move(k.striker, { pos: [-0.52, 0.004, 0.52], rot: [0, 0, 0] }, 0.1, 0.8);
            d.to(k.fire, 'intensity', 0.38, 0.4, 3.5);
            d.to(k.fire, 'char', 0.15, 0.4, 3.5);
            d.to(k.fire, 'smoke', 0.35, 0.8, 2);
            return d.hold(4.4);
          },
        },
      ],
      why: [
        'Kneeling on one knee, sometimes called the respect position, keeps you steady and lets you move back quickly. Never sit cross-legged by a fire or lean over it.',
        'With a ferro rod, hold the striker still on the rod and pull the rod back towards you. The sparks land where you aimed and you don’t knock the tinder over.',
        'Fluff out the cotton wool or birch bark so there is plenty of surface for the sparks to land on.',
      ],
      safety: [
        'Only light the fire when the adult in charge says so.',
        'Aim sparks down into the tinder, away from people.',
        'If the flame needs help, blow gently at the base with your face to the side.',
      ],
      teacher: {
        say: ['Demonstrate the pull-back technique slowly before anyone tries it.'],
        ask: ['Why do we pull the rod back instead of pushing the striker forward?'],
      },
      check: {
        q: 'When you use a ferro rod, which part moves?',
        options: ['The striker pushes forward hard', 'The rod pulls back while the striker stays still', 'Both move towards the tinder'],
        answer: 1,
        why: 'Pulling the rod back keeps your hand steady and the sparks on target, and you don’t smash the tinder.',
      },
    },

    {
      title: 'Keep it going',
      card: 'Keep going',
      lede: 'Feed the fire one size at a time, and never leave it.',
      steps: [
        {
          label: 'Feed it from small to big',
          callouts: [callout('feed1', 'Thumb-thick sticks', { lift: 90 })],
          run(d, k) {
            d.camera(VIEW.bowl, 0);
            k.feed.forEach((s, i) => d.arrive(s, { pos: [0.22, 0.05, -1.45], rot: [0, Math.PI / 2, 0] }, 0.4 + i * 0.45, 0.8));
            d.to(k.fire, 'intensity', 0.62, 1.2, 3);
            d.to(k.fire, 'char', 0.3, 1.2, 3);
            d.to(k.fire, 'smoke', 0.5, 1.2, 2);
            return d.hold(4.6);
          },
        },
        {
          label: 'Add fuel wood once it’s burning well',
          callouts: [callout('log1', 'Fuel wood', { lift: 90, side: -1 })],
          run(d, k) {
            d.camera(VIEW.burn, 0);
            k.logs.forEach((s, i) => d.arrive(s, { pos: [0.49, 0.06, -1.45], rot: [0, Math.PI / 2, 0] }, 0.4 + i * 0.6, 0.9));
            d.to(k.fire, 'intensity', 1, 1.6, 3);
            d.to(k.fire, 'char', 0.55, 1.6, 4);
            d.to(k.fire, 'glow', 0.3, 2, 3);
            d.to(k.fire, 'smoke', 0.7, 1.6, 3);
            return d.hold(5);
          },
        },
        {
          label: 'Never leave it unattended',
          callouts: [callout('rim', 'An adult stays with the fire', { lift: 110 })],
          run(d) {
            d.camera(VIEW.wide, 0, 2);
            return d.hold(4);
          },
        },
      ],
      why: [
        'Add the next size up only when the last one is burning well. Too much too soon smothers the flame.',
        'Lots of white smoke usually means damp fuel or not enough air. Open the fire up rather than piling more on.',
        'Only add as much fuel as you need. A small fire is safer and quicker to put out.',
      ],
      safety: [
        'A fire is never left unattended, not even for a minute.',
        'Place fuel on, from the upwind side. Don’t throw it.',
        'Never put plastic, aerosols, glass or batteries on a fire.',
      ],
      teacher: {
        say: ['Point out the change in smoke as the fire settles.'],
        ask: ['How can you tell when the fire is ready for the next size of fuel?'],
      },
      check: {
        q: 'Your fire is smoking a lot and the flames are shrinking. What’s the best thing to do?',
        options: ['Pile on more big logs', 'Gently open it up and add small dry sticks', 'Pour water on it and start again'],
        answer: 1,
        why: 'It needs air and small, dry fuel. Big logs would smother it.',
      },
    },

    {
      title: 'Put it out, leave no trace',
      card: 'Put out',
      lede: 'Drown, stir, drown, and check it’s cold before you leave.',
      steps: [
        {
          label: 'Stop adding fuel; let it burn down',
          callouts: [callout('ash', 'Burning down to ash', { lift: 100 })],
          run(d, k) {
            d.camera(VIEW.bowl, 0);
            d.to(k.fire, 'char', 1, 0, 3);
            d.to(k.fire, 'glow', 1, 0, 2.5);
            d.to(k.fire, 'intensity', 0.22, 0.2, 3.5);
            d.to(k.fire, 'smoke', 0.4, 0.2, 3);
            d.show(k.ash, 1.2, 1.2);
            [...k.tipi, ...k.feed].forEach((s, i) => d.hide(s, 1 + i * 0.12, 0.6));
            k.platform.children.forEach((s, i) => d.hide(s, 1.6 + i * 0.1, 0.5));
            d.hide(k.tinder, 1.5, 0.5);
            d.hide(k.logs[0], 2.4, 1.2);
            d.hide(k.logs[2], 3.0, 1.2);
            return d.hold(5);
          },
        },
        {
          label: 'Drown it',
          callouts: [callout('bucket', 'Pour from the side', { side: -1, lift: 70 })],
          run(d, k) {
            const t = pour(d, k, 0.2);
            d.to(k.fire, 'intensity', 0, 1.3, 0.6);
            d.to(k.fire, 'glow', 0.45, 1.3, 1);
            d.to(k.fire, 'smoke', 0, 1.3, 1.2);
            d.to(k.fire, 'steam', 0.4, 2.6, 1);
            return d.hold(t + 1);
          },
        },
        {
          label: 'Stir it, then drown it again',
          callouts: [callout('stir', 'Stir to find hidden embers', { lift: 80 })],
          run(d, k) {
            d.move(k.stir, { pos: [-0.5, 0.42, 0], rot: [0, 0, -0.75] }, 0.2, 0.8);
            d.tl.add(1.0, 2.4, (p) => {
              const a = p * Math.PI * 6;
              k.stir.position.set(-0.45 + Math.cos(a) * 0.08, 0.42, Math.sin(a) * 0.1);
            }, { ease: ease.linear });
            d.to(k.fire, 'glow', 0.2, 1, 2);
            d.move(k.stir, { pos: [-0.9, 0.02, -0.25], rot: [0, 0.3, 0] }, 3.5, 0.7);
            const t = pour(d, k, 4.2);
            d.to(k.fire, 'glow', 0, 5.4, 1);
            d.to(k.fire, 'steam', 0.3, 6.6, 1.5);
            return d.hold(t + 0.8);
          },
        },
        {
          label: 'Check it’s cold',
          callouts: [callout('hand', 'Back of your hand near it, not on it', { lift: 80 })],
          run(d, k) {
            d.camera(VIEW.low, 0);
            d.to(k.fire, 'steam', 0, 0.5, 3);
            return d.hold(4);
          },
        },
        {
          label: 'Leave it as you found it',
          callouts: [callout('seats', 'Leave no trace', { lift: 60 })],
          run(d, k) {
            d.camera(VIEW.wide, 0, 2);
            d.hide(k.ash, 1.2, 1);
            for (const o of k.logs) d.hide(o, 1, 0.6);
            [k.piles[0], k.piles[1], k.cotton, k.birch, k.test].forEach((o, i) => d.hide(o, 1.5 + i * 0.15));
            return d.hold(4.4);
          },
        },
      ],
      why: [
        'Stop adding fuel well before the end of the session, so the fire burns down to ash.',
        'Drown, stir, drown: pour water over all of it, stir the ashes to find hidden embers, then pour again.',
        'Hold the back of your hand near the ashes, without touching. If you can feel any warmth, it isn’t out yet.',
        'Leave no trace: once it’s completely cold, deal with the ash in the way your site asks and leave the place as you found it.',
      ],
      safety: [
        'Steam can scald. Pour from the side, then step back.',
        'The metal bowl stays hot long after the flames have gone.',
        'Only the adult in charge decides when the fire is out.',
      ],
      teacher: {
        say: ['Build time for putting out into the session plan: it takes longer than people think.'],
        ask: ['Why isn’t “no flames” the same as “out”?'],
      },
      check: {
        q: 'How do you know a fire is fully out?',
        options: ['There are no flames', 'The smoke has stopped', 'There’s no warmth when you hold the back of your hand near the ashes'],
        answer: 2,
        why: 'Embers can stay hot under ash for hours with no flame or smoke.',
      },
    },
  ],

  sources: [
    { title: 'Burns and scalds: treatment', publisher: 'NHS', url: 'https://www.nhs.uk/conditions/burns-and-scalds/' },
    { title: 'The Countryside Code', publisher: 'Natural England / GOV.UK', url: 'https://www.gov.uk/government/publications/the-countryside-code' },
    { title: 'Forest School Association', publisher: 'Forest School Association', url: 'https://forestschoolassociation.org/' },
  ],
};
