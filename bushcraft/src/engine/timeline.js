// A small forward-only animation timeline.
//
// Each lesson step builds one Timeline. Items are tweens (apply(p) with p eased 0..1)
// or calls. `begin` runs once, when the item first starts, so a tween can capture its
// "from" value at that moment. Seeking backwards is done by rebuilding the world and
// fast-forwarding (see Player in main.js), which keeps the model simple.

export const ease = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export class Timeline {
  constructor() {
    this.items = [];
    this.time = 0;
    this.duration = 0;
  }

  add(start, dur, apply, { ease: e = ease.inOut, begin } = {}) {
    this.items.push({ start, dur, apply, ease: e, begin, started: false, done: false });
    this.duration = Math.max(this.duration, start + dur);
    return start + dur;
  }

  call(at, fn) {
    return this.add(at, 0, () => {}, { begin: fn });
  }

  // Leave a pause at the end of the step so the viewer can take it in.
  hold(until) {
    this.duration = Math.max(this.duration, until);
    return until;
  }

  seek(t) {
    this.time = Math.min(t, this.duration);
    for (const it of this.items) {
      if (it.done || this.time < it.start) continue;
      if (!it.started) {
        it.started = true;
        it.begin?.();
      }
      const p = it.dur > 0 ? Math.min(1, (this.time - it.start) / it.dur) : 1;
      it.apply(it.ease(p));
      if (p >= 1) it.done = true;
    }
  }

  get finished() {
    return this.time >= this.duration;
  }
}
