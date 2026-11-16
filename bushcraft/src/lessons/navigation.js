import * as THREE from 'three';
import { ease } from '../engine/timeline.js';
import * as nav from '../models/nav.js';
import * as camp from '../models/camp.js';
import * as kit from '../models/kit.js';
import { mat } from '../models/util.js';
import { point, callout } from './helpers.js';

// Lesson: reading grid references, using a compass, what to do if you're lost and
// how to call for help. In the scene, map north (and magnetic north) is world -Z.

const CAMP = [49.1, 30.9]; // Camp 3, grid ref 491 309
const POND = [49.35, 30.55]; // the pond on the map, our bearing target
const BEARING = Math.round(((Math.atan2(POND[0] - CAMP[0], POND[1] - CAMP[1]) * 180) / Math.PI + 360) % 360);
const BEARING_TXT = `${String(BEARING).padStart(3, '0')}°`;
const RAD = (BEARING * Math.PI) / 180;
const AIM = [Math.sin(RAD), 0, -Math.cos(RAD)]; // world direction of the bearing

const VIEW = {
  wide: { pos: [5.2, 5.4, 6.4], target: [0, 0.1, 0.2] },
  map: { pos: [0.3, 3.7, 2.9], target: [0.32, 0, 0.5] },
  square: { pos: [0.55, 2.5, 2.6], target: [0.42, 0, 0.62] },
  compass: { pos: [1.15, 1.25, 1.55], target: [0.55, 0.02, 0.4] },
  bearing: { pos: [0.6, 1.9, 1.7], target: [0.25, 0, 0.2] },
  follow: { pos: [-1.7, 2.1, -1.6], target: [0.55, 0.5, 0.85] },
  lost: { pos: [3.0, 2.3, 3.4], target: [0, 0.2, 0.2] },
  phone: { pos: [0.3, 1.25, 3.0], target: [0.15, 0.3, 0.7] },
};

// Turn a grid position into world coordinates on the paper map (map unrotated).
const at = (e, n, y = 0) => {
  const [x, z] = nav.onSheet(e, n);
  return [x, y, z + MAP_Z];
};
const MAP_Z = 0.1;

// Expanding rings on the ground, one per whistle blast.
class Rings {
  constructor(world, origin) {
    this.world = world;
    this.group = new THREE.Group();
    this.group.position.set(...origin);
    this.times = [];
    this.pool = Array.from({ length: 8 }, () => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.92, 1, 64),
        new THREE.MeshBasicMaterial({ color: '#f07a1a', transparent: true, opacity: 0, depthWrite: false }),
      );
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      this.group.add(m);
      return m;
    });
  }
  emit() {
    if (!this.world.fastForward) this.times.push(this.world.time);
  }
  update(dt, time) {
    this.times = this.times.filter((t) => time - t < 1.4);
    this.pool.forEach((m, i) => {
      const t = this.times[i];
      m.visible = t != null;
      if (t == null) return;
      const a = (time - t) / 1.4;
      m.scale.setScalar(0.15 + a * 1.9);
      m.material.opacity = 0.75 * (1 - a);
    });
  }
}

// Keeps the compass needle pointing north (world -Z), with a little settle.
class NorthNeedle {
  constructor(needle) {
    this.group = new THREE.Group();
    this.needle = needle;
    this.q = new THREE.Quaternion();
  }
  update(dt, time) {
    const parent = this.needle.parent;
    if (!parent) return;
    parent.updateWorldMatrix(true, false);
    parent.getWorldQuaternion(this.q);
    const wobble = Math.sin(time * 3.1) * 0.025;
    const target = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), wobble);
    this.needle.quaternion.copy(this.q.invert().multiply(target));
  }
}

function build(w) {
  const k = {};

  k.map = nav.paperMap();
  k.map.position.z = MAP_Z;
  w.add('map', k.map, { hidden: true });

  // Labels on the map's margins.
  w.anchor('eastings', point(...at(48.5, 29.98, 0.02)));
  w.anchor('northings', point(...at(47.56, 31.5, 0.02)));
  for (const n of ['eastings', 'northings']) k.map.add(w.anchors.get(n)), w.anchors.get(n).position.z -= MAP_Z;

  const u = nav.SHEET.unit;
  const add = (name, obj, e, n) => {
    const [x, , z] = at(e, n);
    obj.position.x = x;
    obj.position.z = z - MAP_Z;
    k.map.add(obj);
    w.anchor(name, obj);
    obj.visible = false;
    return obj;
  };
  k.eLine = add('eLine', nav.highlight(0.035, nav.SHEET.height, '#2f6f9e', 0.75), 49, (nav.SHEET.n0 + nav.SHEET.n1) / 2);
  k.nLine = add('nLine', nav.highlight(nav.SHEET.width, 0.035, '#2f6f9e', 0.75), (nav.SHEET.e0 + nav.SHEET.e1) / 2, 30);
  k.square = add('square', nav.highlight(u, u, '#f4c430', 0.45), 49.5, 30.5);
  k.tenths = add('tenths', nav.tenthsScale(), 49, 30);
  k.pin = add('pin', nav.pin('#7a2a8a'), ...CAMP);
  k.pondPin = add('pondPin', nav.pin('#2f6f9e'), ...POND);
  k.pin.scale.setScalar(0.6);
  k.pondPin.scale.setScalar(0.6);
  w.anchor('eLineLabel', point(0, 0.02, -nav.SHEET.height * 0.3));
  k.eLine.add(w.anchors.get('eLineLabel'));
  w.anchor('nLineLabel', point(-nav.SHEET.width * 0.3, 0.02, 0));
  k.nLine.add(w.anchors.get('nLineLabel'));

  // The compass, its needle kept pointing north.
  const c = nav.compass();
  k.compass = c.group;
  k.housing = c.housing;
  k.needle = c.needle;
  k.compass.position.set(0.62, 0.02, 0.38);
  w.add('compass', k.compass, { hidden: true });
  w.addFx(new NorthNeedle(k.needle));
  w.anchor('travel', point(0, 0.02, -0.22));
  k.compass.add(w.anchors.get('travel'));
  w.anchor('dial', point(0.1, 0.03, 0.0));
  k.housing.add(w.anchors.get('dial'));
  w.anchor('red', point(0, 0.03, -0.09));
  k.needle.add(w.anchors.get('red'));
  w.anchor('index', point(0, 0.03, -0.06));
  k.compass.add(w.anchors.get('index'));

  // A landmark tree on the bearing, and the path to it.
  k.tree = camp.tree({ seed: 21, height: 1.3, rad: 0.09 });
  k.tree.position.set(AIM[0] * 2.3, 0, AIM[2] * 2.3);
  w.add('tree', k.tree, { hidden: true });
  k.path = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.006, 0.12), mat('#b4472f'));
    const d = 0.35 + i * 0.2;
    dash.position.set(AIM[0] * d, 0.012, AIM[2] * d);
    dash.rotation.y = -RAD;
    dash.visible = false;
    k.path.add(dash);
  }
  w.add('path', k.path);

  // If you're lost.
  k.here = nav.pin('#c8342b');
  k.here.scale.setScalar(2.2);
  k.here.position.set(-0.6, 0, -0.1);
  w.add('here', k.here, { hidden: true });
  k.bag = nav.survivalBag();
  k.bag.position.set(-0.2, 0, 0.45);
  k.bag.rotation.y = 0.25;
  w.add('bag', k.bag, { hidden: true });
  k.whistle = nav.whistle();
  k.whistle.scale.setScalar(2);
  k.whistle.position.set(1.0, 0.05, -0.3);
  w.add('whistle', k.whistle, { hidden: true });
  k.rings = w.addFx(new Rings(w, [1.0, 0.02, -0.3]));
  k.torch = nav.torch();
  k.torch.scale.setScalar(2);
  k.torch.position.set(1.0, 0.07, -0.75);
  k.torch.rotation.set(0, Math.PI - 0.45, 0.2);
  w.add('torch', k.torch, { hidden: true });

  // Calling for help.
  k.screens = nav.phoneScreens();
  k.prop = kit.seatLog(41);
  k.prop.position.set(0.15, 0, 0.55);
  w.add('prop', k.prop, { hidden: true });
  k.phone = nav.phone();
  k.phone.position.set(0.15, 0.32, 0.78);
  k.phone.rotation.x = 1.05;
  w.add('phone', k.phone, { hidden: true });
  w.anchor('screenTop', point(0, 0.02, -0.2));
  k.phone.add(w.anchors.get('screenTop'));
  k.setScreen = (name) => {
    const g = k.phone.userData.glass;
    g.material.map = k.screens[name];
    g.material.needsUpdate = true;
  };
  k.setScreen('dial');
  return k;
}

// Dim the daylight to dusk (1) or bring it back (0).
function dusk(d, to, at, dur = 1.5) {
  d.to(d.w.sun, 'intensity', to ? 0.25 : 2.4, at, dur);
  d.to(d.w.hemi, 'intensity', to ? 0.35 : 1.6, at, dur);
}

export default {
  id: 'navigation',
  title: 'Navigation and finding help',
  short: 'Navigation',
  ref: '491 309',
  place: 'Camp 3, Mill Pond',
  minutes: 14,
  summary: 'Read grid references, use a compass, know what to do if you’re lost and how to call for help.',
  build,

  stages: [
    {
      title: 'Read a grid reference',
      card: 'Grid refs',
      lede: 'Grid lines split the map into squares. Their numbers let you point to any place on it.',
      steps: [
        {
          label: 'Find the grid numbers',
          callouts: [callout('eastings', 'Eastings: along the bottom', { lift: 50 }), callout('northings', 'Northings: up the side', { lift: 60, side: 1 })],
          run(d, k) {
            d.camera(VIEW.map, 0);
            d.drop(k.map, 0.3, 0.8, 0.6);
            return d.hold(4.4);
          },
        },
        {
          label: 'Along the corridor first',
          callouts: [callout('eLineLabel', 'Along: 49', { lift: 60 })],
          run(d, k) {
            d.tl.add(0.3, 1.2, (p) => k.eLine.scale.set(1, Math.max(0.01, p), 1), { begin: () => (k.eLine.visible = true) });
            return d.hold(3.4);
          },
        },
        {
          label: '…then up the stairs',
          callouts: [callout('nLineLabel', 'Up: 30', { lift: 60, side: -1 }), callout('square', 'Square 4930', { lift: 90 })],
          run(d, k) {
            d.tl.add(0.3, 1.2, (p) => k.nLine.scale.set(Math.max(0.01, p), 1, 1), { begin: () => (k.nLine.visible = true) });
            d.show(k.square, 1.8, 0.6);
            return d.hold(4.4);
          },
        },
        {
          label: 'Six figures: count the tenths',
          callouts: [callout('tenths', 'Tenths of a square', { lift: 70, side: -1 }), callout('pin', '491 309: Camp 3', { lift: 80 })],
          run(d, k) {
            d.camera(VIEW.square, 0);
            d.show(k.tenths, 0.6, 0.5);
            d.drop(k.pin, 1.4, 0.6, 0.6);
            return d.hold(4.6);
          },
        },
      ],
      why: [
        'Grid lines running up the map are eastings; their numbers are along the bottom and top. Lines running across are northings; their numbers are up the sides.',
        'Always give the easting first: “along the corridor, then up the stairs”. The square is named after the lines at its bottom-left corner, so this one is 4930.',
        'For a six-figure reference, imagine each square split into tenths. Camp 3 is 1 tenth along from 49 and 9 tenths up from 30: 491 309. That pins it down to about 100 metres.',
        'On a real Ordnance Survey map, grid references also start with two letters for the 100 km square, such as SK or SU. Give those too when you call for help.',
      ],
      safety: [
        'Before a walk, mark your route and meeting points on the map with your leader.',
        'Keep the map in a waterproof case and in your hand, not in your bag.',
        'Know the grid reference of your camp or start point before you set off.',
      ],
      teacher: {
        say: ['Have pairs give each other four-figure references to features on a real map, then move up to six figures.'],
        ask: ['Why does the easting always come first?', 'What would go wrong if you mixed them up?'],
      },
      check: {
        q: 'Which comes first in a grid reference?',
        options: ['The northing (up the stairs)', 'The easting (along the corridor)', 'Whichever number is bigger'],
        answer: 1,
        why: 'Along the corridor, then up the stairs: eastings first, then northings.',
      },
    },

    {
      title: 'Use a compass',
      card: 'Compass',
      lede: 'A compass shows you which way is north, so you can line up the map and walk on a bearing.',
      steps: [
        {
          label: 'Know the parts of a compass',
          callouts: [
            callout('travel', 'Direction of travel arrow', { side: -1, lift: 50 }),
            callout('dial', 'Dial with degrees', { lift: 50, reach: 90 }),
            callout('red', 'Red end points north', { side: -1, lift: 10, reach: 260 }),
          ],
          run(d, k) {
            d.camera(VIEW.compass, 0);
            d.hide(k.pin, 0);
            for (const o of [k.tenths, k.square, k.eLine, k.nLine]) d.hide(o, 0.1);
            d.drop(k.compass, 0.5, 0.6, 0.5);
            return d.hold(5);
          },
        },
        {
          label: 'Set the map to north',
          callouts: [callout('red', 'Needle runs with the grid lines', { side: -1, lift: 110 })],
          run(d, k) {
            d.camera(VIEW.map, 0);
            // Turn the map away, then turn map and compass together until the
            // map's north lines run with the needle.
            const p0 = k.compass.position.clone();
            let from = 0;
            const turn = (yaw) => {
              k.map.rotation.y = yaw;
              const p = p0.clone().sub(new THREE.Vector3(0, 0, MAP_Z)).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
              k.compass.position.set(p.x, p0.y, p.z + MAP_Z);
              k.compass.rotation.y = yaw;
            };
            d.tl.add(0.3, 1.0, (p) => turn(0.75 * p), { ease: ease.inOut });
            d.tl.add(2.2, 2.6, (p) => turn(0.75 * (1 - p)), { ease: ease.inOut, begin: () => (from = 0.75) });
            return d.hold(6);
          },
        },
        {
          label: 'Take a bearing from the map',
          callouts: [callout('travel', 'Edge from you to the pond', { side: -1, lift: 70 }), callout('index', `Read the bearing: ${BEARING_TXT}`, { lift: 100 })],
          run(d, k) {
            d.camera(VIEW.bearing, 0);
            const A = new THREE.Vector3(...at(...CAMP)), B = new THREE.Vector3(...at(...POND));
            const dir = B.clone().sub(A);
            const yaw = Math.atan2(-dir.x, -dir.z);
            const mid = A.clone().add(B).multiplyScalar(0.5).add(new THREE.Vector3(Math.cos(yaw) * 0.1, 0.02, -Math.sin(yaw) * 0.1));
            d.show(k.pin, 0.2, 0.4);
            d.show(k.pondPin, 0.4, 0.4);
            d.move(k.compass, { pos: [mid.x, mid.y, mid.z], rot: [0, yaw, 0] }, 0.8, 1.2);
            d.move(k.housing, { rot: [0, -yaw, 0] }, 2.4, 1.6);
            return d.hold(6);
          },
        },
        {
          label: 'Turn until red is in the shed',
          callouts: [callout('red', 'Red in the shed', { side: -1, lift: 90 }), callout('tree', 'Walk to a landmark', { lift: 40 })],
          run(d, k) {
            d.camera(VIEW.follow, 0, 1.6);
            for (const o of [k.pin, k.pondPin]) d.hide(o, 0);
            d.hide(k.map, 0.3, 0.6);
            d.move(k.compass, { pos: [0, 0.55, 0.1], rot: [0, -RAD + 1.0, 0] }, 0.4, 1.0);
            d.move(k.compass, { rot: [0, -RAD, 0] }, 1.8, 2.0, ease.inOut);
            d.show(k.tree, 3.6, 0.7);
            k.path.children.forEach((s, i) => d.show(s, 4.0 + i * 0.12, 0.25));
            return d.hold(6.6);
          },
        },
      ],
      why: [
        'Setting the map means turning it until north on the map points north in real life. Then everything on the map lies in the same direction as the real thing.',
        'To take a bearing, lay the compass edge from where you are to where you want to go. Turn the dial until its orienting lines run with the map’s north–south grid lines, with the arrow pointing to the top of the map. Read the number at the index line.',
        `From Camp 3 to the pond, the bearing is ${BEARING_TXT}. Hold the compass flat in front of you and turn your whole body until the red end of the needle sits in the orienting arrow: “red in the shed”. The direction of travel arrow now points the way to go.`,
        'Pick a landmark on that line, such as a tree, walk to it, then pick the next one.',
        'Magnetic north and grid north differ slightly. In Britain the difference is currently small; your map’s margin gives the current figure.',
      ],
      safety: [
        'Keep the compass away from phones, metal and magnets: they pull the needle.',
        'Stay with your group and keep to the route your leader agreed.',
        'If what you see doesn’t match the map, stop and check before going further.',
      ],
      teacher: {
        say: ['Practise “red in the shed” in the playground with a bearing to a fixed point before using it in woodland.'],
        ask: ['What is the difference between setting the map and taking a bearing?'],
      },
      check: {
        q: 'You’ve set a bearing on the dial. How do you know which way to walk?',
        options: ['Follow the red end of the needle', 'Turn until the red needle sits in the orienting arrow, then follow the direction of travel arrow', 'Walk towards the N on the dial'],
        answer: 1,
        why: 'The needle always points north. With red in the shed, the direction of travel arrow points along your bearing.',
      },
    },

    {
      title: 'If you’re lost',
      card: 'Lost',
      lede: 'Stop, stay put and make yourself easy to find.',
      steps: [
        {
          label: 'Stop. Don’t keep walking',
          callouts: [callout('here', 'Stay where you are', { lift: 50 })],
          run(d, k) {
            d.camera(VIEW.lost, 0);
            d.hide(k.compass, 0);
            d.hide(k.tree, 0);
            k.path.children.forEach((s) => d.hide(s, 0, 0.2));
            d.drop(k.here, 0.6, 0.6, 0.8);
            return d.hold(4);
          },
        },
        {
          label: 'Get warm: layers, shelter, food',
          callouts: [callout('bag', 'Survival bag', { lift: 60, side: -1 })],
          run(d, k) {
            d.show(k.bag, 0.4, 0.7);
            return d.hold(3.8);
          },
        },
        {
          label: 'Six whistle blasts, then wait',
          callouts: [callout('whistle', 'Six blasts means help', { lift: 70 })],
          run(d, k) {
            d.show(k.whistle, 0.3, 0.5);
            for (let i = 0; i < 6; i++) d.call(1.2 + i * 0.55, () => k.rings.emit());
            return d.hold(6);
          },
        },
        {
          label: 'In the dark: six torch flashes',
          callouts: [callout('torch', 'Six flashes, then wait', { lift: 60, side: -1, reach: 240 })],
          run(d, k) {
            dusk(d, 1, 0, 1.5);
            d.show(k.torch, 0.8, 0.5);
            const beam = k.torch.userData.beam;
            for (let i = 0; i < 6; i++) {
              d.to(beam, 'v', 1, 1.8 + i * 0.6, 0.08, ease.linear);
              d.to(beam, 'v', 0, 2.1 + i * 0.6, 0.08, ease.linear);
            }
            return d.hold(6.4);
          },
        },
      ],
      why: [
        'Use STOP: Stop, Think, Observe, Plan. Most people who get badly lost made it worse by walking on, hoping to find something familiar.',
        'Staying put keeps you close to where searchers will look first. If you’re in a group, stay together.',
        'Get out of the wind, put on every layer you have, sit on something to keep off the cold ground, and have a drink and something to eat. A survival bag is cheap and can save your life.',
        'The distress signal is six blasts on a whistle, or six flashes of a torch, then a minute’s pause, then repeat. A whistle carries much further than shouting and uses less energy. Rescuers reply with three.',
      ],
      safety: [
        'Always carry a whistle, a torch and a warm layer, even on a short walk.',
        'Agree with your leader what to do if you get separated: usually stay where you are.',
        'Never split up to look for help on your own.',
      ],
      teacher: {
        say: ['Practise the six-blast signal once in the session so everyone knows what it sounds like, and agree that it means a real emergency.'],
        ask: ['Why is staying put usually better than walking on?'],
      },
      check: {
        q: 'What is the distress signal on a whistle?',
        options: ['Three long blasts', 'Six blasts, a minute’s pause, then repeat', 'One blast every ten seconds'],
        answer: 1,
        why: 'Six blasts (or six torch flashes), a pause of a minute, then repeat. The reply is three.',
      },
    },

    {
      title: 'Call for help',
      card: 'Call',
      lede: 'In an emergency, call 999 or 112. For someone lost or hurt in the hills or woods, ask for the police, then Mountain Rescue.',
      steps: [
        {
          label: 'Call 999 or 112',
          callouts: [callout('screenTop', '999 or 112', { lift: 40 })],
          run(d, k) {
            dusk(d, 0, 0, 1.2);
            d.camera(VIEW.phone, 0);
            d.hide(k.torch, 0);
            d.hide(k.whistle, 0);
            d.hide(k.here, 0);
            d.call(0, () => k.setScreen('dial'));
            d.show(k.prop, 0.5, 0.5);
            d.arrive(k.phone, { pos: [0.15, 0.04, 1.1], rot: [0, 0.5, 0] }, 0.8, 1.0);
            return d.hold(4.2);
          },
        },
        {
          label: 'Ask for the police, then Mountain Rescue',
          callouts: [callout('screenTop', 'Police, then Mountain Rescue', { lift: 40, side: -1, reach: 120 })],
          run(d, k) {
            d.call(0.4, () => k.setScreen('ask'));
            return d.hold(4);
          },
        },
        {
          label: 'Say where you are and what happened',
          callouts: [callout('screenTop', 'Grid reference first', { lift: 40 })],
          run(d, k) {
            d.call(0.4, () => k.setScreen('where'));
            return d.hold(4.4);
          },
        },
        {
          label: 'No signal to call? Try a text',
          callouts: [callout('screenTop', 'Register for emergencySMS first', { lift: 40, side: -1, reach: 120 })],
          run(d, k) {
            d.call(0.4, () => k.setScreen('sms'));
            return d.hold(4.8);
          },
        },
      ],
      why: [
        'Call 999 or 112: both work in the UK. If your own network has no signal, an emergency call can use another network.',
        'For someone lost or injured on hills, moors or in remote woodland, ask for the police, then Mountain Rescue. On the coast, ask for the Coastguard.',
        'Give your grid reference first, then what happened, how many people are with you and how they are. Stay on the line and do as you’re told.',
        'If there isn’t enough signal to call, a text to 999 may get through, but only if the phone has been registered with emergencySMS beforehand. Register by texting “register” to 999 and following the reply.',
        'Save your battery: close apps you don’t need, keep the phone warm in an inside pocket, and keep it switched on so rescuers can call you back.',
      ],
      safety: [
        'Know the trip’s emergency plan and the leader’s phone number before you set off.',
        'Don’t move an injured person unless they’re in danger where they are.',
        'Stay where you told the rescuers you are.',
      ],
      teacher: {
        say: ['Role-play an emergency call in pairs: one is the caller, one the call handler asking “Where are you? What happened? How many?”'],
        ask: ['Which service do you ask for when someone is lost in the hills?'],
      },
      check: {
        q: 'Someone in your group is hurt in remote woodland. Who do you ask for when you call 999?',
        options: ['Fire service', 'Police, then Mountain Rescue', 'Ambulance only'],
        answer: 1,
        why: 'Mountain Rescue teams are called out through the police. Give your grid reference first.',
      },
    },
  ],

  sources: [
    { title: 'Calling for help (999, emergencySMS)', publisher: 'Mountain Rescue England and Wales', url: 'https://www.mountain.rescue.org.uk/' },
    { title: 'emergencySMS', publisher: 'emergencySMS service', url: 'https://www.emergencysms.net/' },
    { title: 'Map reading and grid references', publisher: 'Ordnance Survey', url: 'https://www.ordnancesurvey.co.uk/' },
  ],
};
