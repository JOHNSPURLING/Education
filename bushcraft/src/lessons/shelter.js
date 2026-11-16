import * as THREE from 'three';
import { ease } from '../engine/timeline.js';
import { Rain } from '../fx/rain.js';
import * as kit from '../models/kit.js';
import * as camp from '../models/camp.js';
import { mat, shadowed } from '../models/util.js';
import { point, callout, between, dist } from './helpers.js';

// Lesson: choosing a site, rigging a tarp, insulating from the ground and building
// a debris shelter. Wind blows towards +x: the tarp's narrow end faces it and the
// debris shelter's doorway faces away from it.

const WIND = [0.3, 0, 0.02];
const TARP_Z = -0.6;
const RIDGE_Y = 0.95;
const TREE_X = 1.3;
const TRUNK = 0.13;
const OPEN = 0.63; // how far each tarp half swings out, in radians
const DEBRIS = { x: -0.1, z: 1.45, foot: -1.0, door: 0.85, forkX: 0.72, forkH: 0.72 };

const VIEW = {
  wide: { pos: [6.0, 5.6, 7.4], target: [0, 0.55, 0] },
  up: { pos: [-0.2, 1.0, 3.7], target: [2.35, 1.55, 0.45] },
  down: { pos: [-0.4, 1.9, 2.9], target: [-1.85, 0.05, 0.55] },
  around: { pos: [-4.8, 4.0, 5.4], target: [0, 0.4, 0] },
  tarp: { pos: [-3.2, 2.6, 3.6], target: [0, 0.55, -0.6] },
  knot: { pos: [0.2, 1.6, 1.9], target: [1.25, 0.9, -0.6] },
  bed: { pos: [1.2, 1.9, 2.4], target: [0, 0.12, -0.6] },
  debris: { pos: [2.8, 1.9, 3.6], target: [-0.1, 0.35, 1.45] },
  door: { pos: [2.6, 0.9, 2.4], target: [0.5, 0.3, 1.45] },
  inside: { pos: [-1.6, 1.3, 1.4], target: [0, 0.22, -0.6] },
};

// Ridge height of the debris shelter at a point x along it.
const ridgeAt = (x) => 0.03 + ((x - DEBRIS.foot) / (DEBRIS.forkX - DEBRIS.foot)) * (DEBRIS.forkH - 0.03);

// A thin cord between two points (guylines).
function cord(a, b) {
  const geo = new THREE.CylinderGeometry(0.005, 0.005, dist(a, b), 4);
  geo.rotateZ(Math.PI / 2);
  return between(shadowed(new THREE.Mesh(geo, mat('#e8d9a8')), true, false), a, b);
}

function build(w) {
  const k = {};

  // Trees: two strong ones for the tarp, one with a dead branch.
  k.treeA = w.add('treeA', camp.tree({ seed: 11, height: 2.3 }), { hidden: true });
  k.treeA.position.set(-TREE_X, 0, TARP_Z);
  k.treeB = w.add('treeB', camp.tree({ seed: 12, height: 2.5 }), { hidden: true });
  k.treeB.position.set(TREE_X, 0, TARP_Z);
  k.treeH = w.add('treeH', camp.tree({ seed: 13, height: 2.2, canopy: '#6d7d43' }), { hidden: true });
  k.treeH.position.set(2.2, 0, 0.45);
  for (const t of [k.treeA, k.treeB, k.treeH]) w.homes.get(t).position.copy(t.position);
  k.branch = camp.deadBranch();
  // Hung up in the tree, pointing away from where the shelters will go.
  k.branch.position.set(0.3, 1.45, 0.05);
  k.branch.rotation.set(0.1, -0.3, -0.85);
  k.treeH.add(k.branch);
  w.anchor('branch', k.branch);

  k.noRing = w.add('noRing', camp.groundRing(0.42, '#c8342b'), { hidden: true });
  k.noRing.position.set(2.25, 0.02, 0.35);
  k.puddle = w.add('puddle', camp.puddle(0.42, 0.3), { hidden: true });
  k.puddle.position.set(-1.85, 0.012, 0.55);
  k.wind = w.add('wind', kit.windArrow(1.4), { hidden: true });
  k.wind.position.set(-0.2, 0.015, 2.35);
  k.okRing = w.add('okRing', camp.groundRing(0.8, '#3c7a4b'), { hidden: true });
  k.okRing.position.set(0, 0.02, TARP_Z);
  for (const o of [k.noRing, k.puddle, k.wind, k.okRing]) w.homes.get(o).position.copy(o.position);

  // Ridgeline between the two trees, with a wrap at each end and a pad at one.
  k.ridge = camp.rope(2 * (TREE_X - TRUNK));
  k.ridge.position.set(-TREE_X + TRUNK, RIDGE_Y, TARP_Z);
  w.add('ridge', k.ridge, { hidden: true });
  w.anchor('ridgeMid', point(0, RIDGE_Y, TARP_Z));
  w.props.add(w.anchors.get('ridgeMid'));
  k.wrapA = camp.treeWrap(TRUNK);
  k.wrapA.position.set(-TREE_X, RIDGE_Y, TARP_Z);
  w.add('wrapA', k.wrapA, { hidden: true });
  k.wrapB = camp.treeWrap(TRUNK, true);
  k.wrapB.position.set(TREE_X, RIDGE_Y, TARP_Z);
  w.add('wrapB', k.wrapB, { hidden: true });

  // The tarp: two halves hinged on the ridgeline, hanging closed until pegged out.
  k.tarp = new THREE.Group();
  k.tarp.position.set(0, RIDGE_Y + 0.012, TARP_Z);
  k.front = camp.tarpHalf(2.4, 1.05, 1);
  k.back = camp.tarpHalf(2.4, 1.05, 2);
  k.front.rotation.x = -0.03;
  k.back.rotation.x = 0.03;
  k.tarp.add(k.front, k.back);
  w.add('tarp', k.tarp, { hidden: true });
  // A see-through "cutaway" so you can watch the bed being built under the tarp.
  const tarpMats = [];
  k.tarp.traverse((o) => o.isMesh && tarpMats.push(o.material));
  let see = 1;
  k.cutaway = {
    get v() { return see; },
    set v(x) {
      see = x;
      for (const m of tarpMats) {
        m.opacity = x;
        m.transparent = x < 0.999;
        m.depthWrite = x >= 0.999;
      }
    },
  };
  w.anchor('tarpFace', point(-0.5, RIDGE_Y - 0.45, TARP_Z + 0.3));
  w.props.add(w.anchors.get('tarpFace'));

  const spread = 1.05 * Math.sin(OPEN), low = RIDGE_Y - 1.05 * Math.cos(OPEN);
  k.pegs = [];
  k.guys = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const p = camp.peg();
      p.position.set(sx * 1.34, 0, TARP_Z + sz * (spread + 0.24));
      p.rotation.x = sz * 0.65;
      k.pegs.push(w.add(`peg${k.pegs.length}`, p, { hidden: true }));
      const top = [sx * 1.34, 0.04 + 0.12 * Math.cos(0.65), TARP_Z + sz * (spread + 0.24 + 0.12 * Math.sin(0.65))];
      k.guys.push(w.add(`guy${k.guys.length}`, cord([sx * 1.2, low + 0.02, TARP_Z + sz * spread], top), { hidden: true }));
    }
  }

  // Ground insulation: a heap of gathered leaves, the bed under the tarp, a foam mat.
  k.heap = camp.leafMound(0.32, 0.22, 0.28, 3);
  k.heap.position.set(0.75, 0, 0.5);
  w.add('heap', k.heap, { hidden: true });
  k.bed = camp.leafMound(0.85, 0.15, 0.42, 4);
  k.bed.position.set(0, 0, TARP_Z);
  w.add('bed', k.bed, { hidden: true });
  k.mat = camp.foamMat();
  k.mat.position.set(0, 0.155, TARP_Z);
  w.add('mat', k.mat, { hidden: true });

  // The debris shelter: forked stick, ridgepole, ribs, leaf cover and doorway.
  k.fork = camp.forkedStick(DEBRIS.forkH);
  k.fork.position.set(DEBRIS.forkX, 0, DEBRIS.z);
  w.add('fork', k.fork, { hidden: true });
  k.pole = between(kit.log(2.0, 0.045, 31, '#6a5136'), [DEBRIS.foot, 0.03, DEBRIS.z], [DEBRIS.door + 0.05, ridgeAt(DEBRIS.door + 0.05) + 0.03, DEBRIS.z]);
  w.add('pole', k.pole, { hidden: true });
  k.ribs = [];
  for (let i = 0; i < 8; i++) {
    const x = DEBRIS.foot + 0.2 + i * 0.205;
    const h = ridgeAt(x) + 0.03, wid = h * 0.72 + 0.05;
    for (const sz of [-1, 1]) {
      const a = [x + (sz > 0 ? 0.02 : -0.02), 0.01, DEBRIS.z + sz * wid], b = [x, h, DEBRIS.z];
      const rib = between(kit.stick(dist(a, b) + 0.06, 0.016, 700 + i * 2 + (sz > 0)), a, b);
      k.ribs.push(w.add(`rib${k.ribs.length}`, rib, { hidden: true }));
    }
  }
  k.cover = camp.debrisCover(1.9, 0.6, 0.14);
  k.cover.position.set(DEBRIS.x, 0, DEBRIS.z);
  w.add('cover', k.cover, { hidden: true });
  k.door = camp.doorway(0.27);
  k.door.position.set(DEBRIS.door + 0.012, 0.002, DEBRIS.z);
  w.add('door', k.door, { hidden: true });

  k.rain = w.addFx(new Rain(w, { wind: WIND }));
  return k;
}

const TARP_ROOF = { centre: [0, TARP_Z], half: [1.2, 1.05 * Math.sin(OPEN)], height: RIDGE_Y + 0.02, ridge: 'x' };
const DEBRIS_ROOF = { centre: [DEBRIS.x, DEBRIS.z], half: [0.95, 0.6], height: 0.8, ridge: 'x' };

export default {
  id: 'shelter',
  title: 'Building a shelter',
  short: 'Shelter',
  ref: '475 322',
  place: 'Camp 2, Beech Hanger',
  minutes: 12,
  summary: 'Pick a safe site, rig a tarp shelter, insulate yourself from the ground and build a debris shelter.',
  build,

  stages: [
    {
      title: 'Pick a safe spot',
      card: 'Site',
      lede: 'Look up, look down and look around before you build anything.',
      steps: [
        {
          label: 'Look up for dead branches',
          callouts: [callout('branch', 'Dead branch: don’t build under it', { side: -1, lift: 60 })],
          run(d, k) {
            d.camera(VIEW.wide, 0);
            [k.treeA, k.treeB, k.treeH].forEach((t, i) => d.show(t, 0.2 + i * 0.25, 0.7));
            d.camera(VIEW.up, 1.6, 1.8);
            d.show(k.noRing, 3.4);
            return d.hold(6);
          },
        },
        {
          label: 'Look down for hollows and water',
          callouts: [callout('puddle', 'Hollow: rain and cold air collect', { lift: 70 })],
          run(d, k) {
            d.camera(VIEW.down, 0);
            d.show(k.puddle, 0.8, 0.8);
            return d.hold(4);
          },
        },
        {
          label: 'Look around: which way is the wind?',
          callouts: [callout('wind', 'Wind direction', { lift: 50 })],
          run(d, k) {
            d.camera(VIEW.around, 0);
            d.show(k.wind, 0.6, 0.7);
            return d.hold(3.8);
          },
        },
        {
          label: 'Choose a flat, dry spot',
          callouts: [callout('okRing', 'Good spot: flat and dry', { lift: 90, side: -1 })],
          run(d, k) {
            d.camera(VIEW.wide, 0);
            d.show(k.okRing, 0.6, 0.7);
            return d.hold(4);
          },
        },
      ],
      why: [
        'Dead branches can fall without warning, even on a still day. Look up into every tree near where you plan to build.',
        'Cold, damp air sinks into hollows overnight, and rainwater collects there too. Flat ground that’s slightly raised stays drier and warmer.',
        'Keep away from streams and riverbanks: the water can rise quickly after heavy rain.',
        'In the UK the real danger outdoors is usually being wet and cold in the wind, not freezing temperatures. A shelter’s first job is to keep the wind and rain off you.',
      ],
      safety: [
        'Stay inside the boundary your leader sets.',
        'Avoid trees with dead branches, loose bark or large fungi on the trunk.',
        'Check the ground for nettles, brambles, ant nests and sharp stumps.',
        'Only build where the landowner and your leader allow.',
      ],
      teacher: {
        say: ['Walk the group round the site and point out one hazard in each direction: up, down and around.'],
        ask: ['What could make this spot dangerous after heavy rain?', 'Why is wind a bigger problem than cold on its own?'],
      },
      check: {
        q: 'You find a flat, dry spot under a big tree with a dead branch hanging in it. What do you do?',
        options: ['Build there: it’s flat and dry', 'Find another spot well away from the dead branch', 'Build there, but keep your head at the other end'],
        answer: 1,
        why: 'A dead branch can fall at any time. No spot is worth that risk.',
      },
    },

    {
      title: 'Rig a tarp',
      card: 'Tarp',
      lede: 'A tarp over a tight line between two trees makes a quick, dry shelter.',
      steps: [
        {
          label: 'Tie a ridgeline at waist height',
          callouts: [callout('wrapA', 'Fixed knot', { side: -1, lift: 60 }), callout('wrapB', 'Knot you can tighten and release', { lift: 70 })],
          run(d, k) {
            d.camera(VIEW.tarp, 0);
            d.hide(k.okRing, 0.2);
            d.show(k.wrapA, 0.5, 0.4);
            d.tl.add(0.9, 1.8, (p) => k.ridge.scale.set(Math.max(0.001, p), 1, 1), {
              ease: ease.inOut,
              begin: () => { k.ridge.visible = true; },
            });
            d.show(k.wrapB, 2.6, 0.4);
            return d.hold(5.2);
          },
        },
        {
          label: 'Protect the trees',
          callouts: [callout('wrapB', 'Pad under the rope saves the bark', { lift: 70, side: -1 })],
          run(d) {
            d.camera(VIEW.knot, 0);
            return d.hold(3.6);
          },
        },
        {
          label: 'Hang the tarp over the line',
          callouts: [callout('ridgeMid', 'Narrow end faces the wind', { lift: 120 })],
          run(d, k) {
            d.camera(VIEW.tarp, 0);
            d.drop(k.tarp, 0.4, 0.8, 1.2);
            d.show(k.wind, 0, 0.01);
            return d.hold(3.8);
          },
        },
        {
          label: 'Peg out the sides',
          callouts: [callout('peg0', 'Pegs lean away from the tarp', { lift: 110, reach: 50, side: 1 })],
          run(d, k) {
            d.move(k.front, { rot: [-OPEN, 0, 0] }, 0.3, 1.1);
            d.move(k.back, { rot: [OPEN, 0, 0] }, 0.3, 1.1);
            k.pegs.forEach((p, i) => d.drop(p, 1.3 + i * 0.25, 0.4, 0.4));
            k.guys.forEach((g, i) => d.show(g, 1.6 + i * 0.25, 0.3));
            d.call(1.4, () => k.rain.shelter(0, TARP_ROOF));
            return d.hold(4.6);
          },
        },
      ],
      why: [
        'Tie the ridgeline at about waist height. Lower is warmer and copes better with wind; higher gives you more headroom.',
        'Use a knot that holds firm at one end, such as a round turn and two half hitches, and one you can tighten and release at the other. Your leader will show you which knots to use.',
        'Line the ridgeline up with the wind so the narrow end of the tarp faces it. The wind then slides past instead of catching the tarp like a sail.',
        'A tight tarp sheds rain. A slack one lets water pool and drip through.',
      ],
      safety: [
        'Protect the tree: pad the rope or use a wide strap so it doesn’t cut into the bark.',
        'Push pegs in by hand or with a mallet, and keep your fingers clear.',
        'Make guylines easy to see so nobody trips over them. Tie on a bright strip of cloth if you need to.',
        'Don’t hang anything heavy from the ridgeline.',
      ],
      teacher: {
        say: ['Demonstrate both knots slowly. Let pairs practise on a fence post before anyone rigs a tarp.'],
        ask: ['Which way should the narrow end point today?', 'What happens to rain on a slack tarp?'],
      },
      check: {
        q: 'Why should a tarp be pulled tight?',
        options: ['So it looks tidy', 'So rain runs off instead of pooling and dripping through', 'So more air gets in'],
        answer: 1,
        why: 'Water runs off a taut tarp. On a slack one it collects in dips and soaks through.',
      },
    },

    {
      title: 'Get off the ground',
      card: 'Insulate',
      lede: 'The ground draws heat out of you faster than the air does. Put a thick layer between you and it.',
      steps: [
        {
          label: 'Gather dry leaf litter',
          callouts: [callout('heap', 'Dry, dead leaves', { lift: 60 })],
          run(d, k) {
            d.camera(VIEW.bed, 0);
            d.to(k.cutaway, 'v', 0.28, 0.2, 1);
            d.show(k.heap, 0.6, 0.8);
            return d.hold(3.4);
          },
        },
        {
          label: 'Build a thick bed',
          callouts: [callout('bed', 'Thicker than you think: it squashes flat', { lift: 110, side: -1 })],
          run(d, k) {
            d.tl.add(0.3, 2.4, (p) => k.bed.scale.set(0.6 + 0.4 * p, Math.max(0.02, p), 0.6 + 0.4 * p), {
              ease: ease.out,
              begin: () => { k.bed.visible = true; },
            });
            d.tl.add(0.3, 2.4, (p) => k.heap.scale.setScalar(Math.max(0.3, 1 - p * 0.7)), { ease: ease.inOut });
            return d.hold(4.6);
          },
        },
        {
          label: 'Add a foam mat if you have one',
          callouts: [callout('mat', 'Foam mat', { lift: 70, side: -1 })],
          run(d, k) {
            d.drop(k.mat, 0.4, 0.6, 0.5);
            d.to(k.cutaway, 'v', 1, 3.0, 0.8);
            return d.hold(4);
          },
        },
      ],
      why: [
        'Lying on cold ground draws heat out of your body all night. Even a warm sleeping bag stops working underneath you, because your weight squashes it flat.',
        'Dry leaves trap air, and still air is a good insulator. Pile on far more than you think you need: it squashes down when you lie on it.',
        'On a school trip you’ll usually have a foam mat. On a cold night, use a leaf bed as well.',
      ],
      safety: [
        'Check leaf litter for brambles, holly and sharp sticks before you lie on it.',
        'Check yourself for ticks after lying in leaf litter or long grass, and tell an adult if you find one.',
        'Only use dead material from the ground.',
      ],
      teacher: {
        say: ['Have students sit on the bare ground for a minute, then on a leaf pile, and compare.'],
        ask: ['Why does a sleeping bag stop working underneath you?'],
      },
      check: {
        q: 'Why do you need a thick layer between you and the ground?',
        options: ['To stop the ground drawing heat out of your body', 'To keep insects away', 'Only to make it more comfortable'],
        answer: 0,
        why: 'Cold ground steals body heat much faster than air. Trapped air in dry leaves or a foam mat slows that down.',
      },
    },

    {
      title: 'Build a debris shelter',
      card: 'Debris',
      lede: 'No tarp? Build a frame of fallen wood and cover it in a thick layer of leaves.',
      steps: [
        {
          label: 'Prop up a strong ridgepole',
          callouts: [callout('fork', 'Forked support', { lift: 70 }), callout('pole', 'Ridgepole', { side: -1, lift: 80 })],
          run(d, k) {
            d.camera(VIEW.debris, 0);
            d.drop(k.fork, 0.4, 0.5, 0.6);
            d.arrive(k.pole, { pos: [DEBRIS.x, 1.2, DEBRIS.z + 0.4], rot: [0, 0.4, 0.2] }, 1.0, 1.2);
            return d.hold(4.4);
          },
        },
        {
          label: 'Lean ribs along both sides',
          callouts: [callout('rib9', 'Ribs close together', { lift: 90 })],
          run(d, k) {
            k.ribs.forEach((r, i) => d.drop(r, 0.3 + i * 0.16, 0.4, 0.35));
            return d.hold(0.3 + k.ribs.length * 0.16 + 2.4);
          },
        },
        {
          label: 'Pile on leaves, then more',
          callouts: [callout('cover', 'Thick, overlapping leaves', { lift: 120 })],
          run(d, k) {
            d.tl.add(0.4, 3.2, (p) => k.cover.scale.set(1, 0.35 + 0.65 * p, 0.55 + 0.45 * p), {
              ease: ease.out,
              begin: () => { k.cover.visible = true; },
            });
            d.call(3.4, () => k.rain.shelter(1, DEBRIS_ROOF));
            return d.hold(5);
          },
        },
        {
          label: 'Doorway small, facing away from the wind',
          callouts: [callout('door', 'Doorway away from the wind', { lift: 80 }), callout('wind', 'Wind', { side: -1, lift: 40 })],
          run(d, k) {
            d.camera(VIEW.door, 0);
            d.show(k.door, 0.8, 0.5);
            return d.hold(4);
          },
        },
      ],
      why: [
        'A debris shelter is a frame of sticks covered in a deep layer of leaves. It takes far more leaves than most people expect, so leave plenty of time.',
        'Build it only just big enough to lie in. A small space is warmer, because there’s less air for your body to heat.',
        'Use only dead, fallen wood. Test the ridgepole by pressing down on it before you add anything else.',
        'Face the doorway away from the wind so the wind can’t blow straight in.',
      ],
      safety: [
        'Never cut live wood or strip branches from trees.',
        'The ridgepole must be strong and firmly supported. An adult checks it before anyone goes inside.',
        'Carry long poles with a partner, held low and level.',
        'Never cover a person with debris or block someone in.',
      ],
      teacher: {
        say: ['Set a time limit. Groups almost always underestimate how many leaves they need.'],
        ask: ['Why build it small rather than roomy?'],
      },
      check: {
        q: 'Which way should the doorway of a debris shelter face?',
        options: ['Into the wind, so you can see the weather coming', 'Away from the wind', 'It doesn’t matter'],
        answer: 1,
        why: 'Facing away from the wind stops it blowing straight in and stealing your heat.',
      },
    },

    {
      title: 'Test it, then take it down',
      card: 'Test',
      lede: 'Check your shelter keeps you dry, then leave the site as you found it.',
      steps: [
        {
          label: 'Test it in the rain',
          callouts: [callout('tarpFace', 'Rain runs off', { side: -1, lift: 90 }), callout('cover', 'Leaves shed water', { lift: 110 })],
          run(d, k) {
            d.camera(VIEW.wide, 0);
            d.to(k.rain, 'amount', 1, 0.6, 1.4);
            return d.hold(5);
          },
        },
        {
          label: 'Check inside: dry and draught-free?',
          callouts: [callout('mat', 'Still dry?', { lift: 60 })],
          run(d, k) {
            d.camera(VIEW.inside, 0, 1.6);
            d.to(k.rain, 'amount', 0.5, 0.4, 1);
            d.to(k.cutaway, 'v', 0.3, 0.6, 1);
            return d.hold(4.6);
          },
        },
        {
          label: 'Take it all down',
          callouts: [callout('treeB', 'Count every peg back in', { lift: 40 })],
          run(d, k) {
            d.camera(VIEW.wide, 0, 1.4);
            d.to(k.rain, 'amount', 0, 0, 1.2);
            d.to(k.cutaway, 'v', 1, 0, 0.6);
            d.call(1.2, () => { k.rain.shelter(0, { centre: [0, 0], half: [0, 0], height: 0 }); k.rain.shelter(1, { centre: [0, 0], half: [0, 0], height: 0 }); });
            d.hide(k.mat, 0.8);
            for (const [i, o] of [...k.guys, ...k.pegs].entries()) d.hide(o, 1.0 + i * 0.1, 0.3);
            d.move(k.front, { rot: [-0.03, 0, 0] }, 1.8, 0.7);
            d.move(k.back, { rot: [0.03, 0, 0] }, 1.8, 0.7);
            d.hide(k.tarp, 2.6, 0.5);
            d.hide(k.ridge, 3.0, 0.4);
            d.hide(k.wrapA, 3.2);
            d.hide(k.wrapB, 3.2);
            d.hide(k.door, 2.2);
            d.hide(k.cover, 2.4, 0.9);
            k.ribs.forEach((r, i) => d.hide(r, 3.2 + i * 0.05, 0.3));
            d.hide(k.pole, 4.2);
            d.hide(k.fork, 4.4);
            return d.hold(6);
          },
        },
        {
          label: 'Leave no trace',
          callouts: [callout('treeA', 'Leave it as you found it', { lift: 40, side: -1 })],
          run(d, k) {
            d.tl.add(0.4, 1.6, (p) => k.bed.scale.set(1 + p * 0.5, Math.max(0.02, 1 - p), 1 + p * 0.5), { ease: ease.inOut });
            d.hide(k.bed, 2.0, 0.4);
            d.hide(k.heap, 1.0, 0.6);
            d.hide(k.wind, 1.4);
            d.hide(k.noRing, 1.6);
            return d.hold(4.4);
          },
        },
      ],
      why: [
        'Lie in your shelter for a few minutes. Can you feel a draught? Is anything dripping? Fix it now, not in the middle of the night.',
        'Thick, overlapping leaves make rain run down the outside of a debris shelter instead of soaking through.',
        'When you’ve finished, take it apart unless your leader says otherwise. Put sticks and leaves back where they came from, collect every peg and piece of cord, and leave the site as you found it.',
      ],
      safety: [
        'Count pegs and lines out, and count them back in.',
        'Take the tarp down before you untie the ridgeline.',
        'Check yourself for ticks after the session.',
      ],
      teacher: {
        say: ['Do a peg and cord count at the end of the session.'],
        ask: ['How could someone tell we were here? How do we make sure they can’t?'],
      },
      check: {
        q: 'You’ve finished with your debris shelter. What should you do, unless your leader says otherwise?',
        options: ['Leave it for the next group', 'Knock it flat and leave the pile', 'Take it apart and put the materials back where they came from'],
        answer: 2,
        why: 'Leave no trace: return the wood and leaves to the woodland floor so the site recovers.',
      },
    },
  ],

  sources: [
    { title: 'The Countryside Code', publisher: 'Natural England / GOV.UK', url: 'https://www.gov.uk/government/publications/the-countryside-code' },
    { title: 'Hypothermia', publisher: 'NHS', url: 'https://www.nhs.uk/conditions/hypothermia/' },
    { title: 'Lyme disease (ticks)', publisher: 'NHS', url: 'https://www.nhs.uk/conditions/lyme-disease/' },
    { title: 'Forest School Association', publisher: 'Forest School Association', url: 'https://forestschoolassociation.org/' },
  ],
};
