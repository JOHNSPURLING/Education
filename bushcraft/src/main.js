import './styles.css';
import { World, Director, DEFAULT_VIEW } from './engine/world.js';
import { Timeline } from './engine/timeline.js';
import { PracticeMap } from './map.js';
import { lessons, byId } from './lessons/index.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Progress is a per-device convenience, so it lives in localStorage.
const store = {
  get() {
    try { return JSON.parse(localStorage.getItem('fieldkit') || '{}'); } catch { return {}; }
  },
  set(v) {
    try { localStorage.setItem('fieldkit', JSON.stringify(v)); } catch { /* private mode */ }
  },
};

const app = $('.app');
const map = new PracticeMap($('#map'));
const world = new World($('#scene'), $('#callouts'));

const state = {
  lesson: null,
  stage: 0,
  step: 0,
  playing: true,
  speed: 1,
  mode: 'student',
  tab: 'steps',
  tl: null,
  kit: null,
  wait: 0,
  saved: store.get(),
};

function progress() {
  const id = state.lesson.id;
  state.saved[id] ??= { done: [], checks: {} };
  return state.saved[id];
}

// Playback --------------------------------------------------------------------

// Jump to a step: rebuild the scene, fast-forward every earlier step, then play.
function goTo(stage, step, { play = state.playing } = {}) {
  const L = state.lesson;
  state.stage = stage;
  state.step = step;
  world.clear();
  state.kit = L.build(world);
  world.fastForward = true;
  for (let s = 0; s <= stage; s++) {
    const steps = L.stages[s].steps;
    for (let t = 0; t < (s === stage ? step : steps.length); t++) {
      const tl = new Timeline();
      steps[t].run(new Director(tl, world), state.kit);
      tl.seek(Infinity);
    }
  }
  world.fastForward = false;
  state.tl = new Timeline();
  L.stages[stage].steps[step].run(new Director(state.tl, world), state.kit);
  state.tl.seek(0);
  world.setCallouts(L.stages[stage].steps[step].callouts ?? []);
  state.wait = 0;
  setPlaying(play);
  syncUrl();
  render();
}

function next() {
  const st = state.lesson.stages;
  if (state.step + 1 < st[state.stage].steps.length) goTo(state.stage, state.step + 1, { play: true });
  else if (state.stage + 1 < st.length) {
    state.tab = state.mode === 'teacher' ? 'teacher' : 'steps';
    goTo(state.stage + 1, 0, { play: true });
  } else toast('That’s the end of the lesson.');
}

function prev() {
  if (state.step > 0) goTo(state.stage, state.step - 1, { play: true });
  else if (state.stage > 0) goTo(state.stage - 1, state.lesson.stages[state.stage - 1].steps.length - 1, { play: true });
  else goTo(0, 0, { play: true });
}

function setPlaying(on) {
  state.playing = on;
  app.classList.toggle('is-paused', !on);
  $('#play').setAttribute('aria-label', on ? 'Pause' : 'Play');
}

function stepFinished() {
  const L = state.lesson;
  const last = state.step === L.stages[state.stage].steps.length - 1;
  if (!last) {
    // Students run through a stage on their own; teachers move on when ready.
    if (state.mode === 'student') return next();
    return setPlaying(false);
  }
  setPlaying(false);
  const p = progress();
  if (!p.done.includes(state.stage)) {
    p.done.push(state.stage);
    store.set(state.saved);
  }
  if (state.mode === 'student' && L.stages[state.stage].check && p.checks[state.stage] == null) {
    state.tab = 'check';
    toast('Stage complete. Try the quick check.');
  } else toast(state.stage + 1 < L.stages.length ? 'Stage complete. Press → for the next stage.' : 'Lesson complete. Well done.');
  render();
}

world.onTick = (dt) => {
  if (!state.playing || !state.tl) return;
  state.tl.seek(state.tl.time + dt * state.speed);
  if (state.tl.finished) stepFinished();
};

// Rendering -------------------------------------------------------------------

function render() {
  const L = state.lesson, S = L.stages[state.stage], p = progress();
  $('#lesson-name').textContent = L.title;
  $('#lesson-ref').textContent = `Grid ref ${L.ref}`;
  $('#stage-kicker').textContent = `Stage ${state.stage + 1} of ${L.stages.length}`;
  $('#stage-title').textContent = S.title;
  $('#stage-lede').textContent = S.lede;

  const tabs = [
    ['steps', 'Steps'],
    ['why', 'Why'],
    ['safety', 'Safety'],
    state.mode === 'teacher' ? ['teacher', 'Teaching notes'] : ['check', 'Quick check'],
  ];
  if (!tabs.some(([id]) => id === state.tab)) state.tab = 'steps';
  $('#tabs').replaceChildren(...tabs.map(([id, label]) => {
    const b = el('button', 'tab', esc(label));
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', id === state.tab);
    if (id === 'check' && p.checks[state.stage] === true) b.classList.add('tab--ok');
    b.onclick = () => { state.tab = id; render(); };
    return b;
  }));

  const body = $('#notes-body');
  body.replaceChildren();
  if (state.tab === 'steps') {
    const ol = el('ol', 'steps');
    S.steps.forEach((s, i) => {
      const li = el('li', `steps__item${i === state.step ? ' is-current' : ''}${i < state.step ? ' is-done' : ''}`);
      const b = el('button', 'steps__btn', `<span class="steps__num">${i + 1}</span><span>${esc(s.label)}</span>`);
      b.onclick = () => goTo(state.stage, i, { play: true });
      li.append(b);
      ol.append(li);
    });
    body.append(ol);
  } else if (state.tab === 'why') {
    for (const t of S.why) body.append(el('p', 'why', esc(t)));
  } else if (state.tab === 'safety') {
    const ul = el('ul', 'safety');
    for (const t of S.safety) ul.append(el('li', null, esc(t)));
    body.append(ul);
  } else if (state.tab === 'teacher') {
    const { say = [], ask = [] } = S.teacher ?? {};
    body.append(el('h3', 'notes__sub', 'Point out'));
    const a = el('ul', 'tlist');
    for (const t of say) a.append(el('li', null, esc(t)));
    body.append(a, el('h3', 'notes__sub', 'Ask the group'));
    const b = el('ul', 'tlist tlist--ask');
    for (const t of ask) b.append(el('li', null, esc(t)));
    body.append(b);
    if (S.check) body.append(el('p', 'tcheck', `<strong>Exit question:</strong> ${esc(S.check.q)} <em>(Answer: ${esc(S.check.options[S.check.answer])})</em>`));
  } else if (state.tab === 'check') {
    renderCheck(body, S, p);
  }

  // Route along the bottom: one waypoint per stage.
  $('#route-stops').replaceChildren(...L.stages.map((s, i) => {
    const li = el('li', `stop${i === state.stage ? ' is-current' : ''}${p.done.includes(i) ? ' is-done' : ''}`);
    const b = el('button', 'stop__btn', `<span class="stop__pin">${i + 1}</span><span class="stop__label">${esc(s.card)}</span>`);
    b.title = s.title;
    b.onclick = () => { state.tab = state.mode === 'teacher' ? 'teacher' : 'steps'; goTo(i, 0, { play: true }); };
    li.append(b);
    return li;
  }));
  $('#progress-text').textContent = `${p.done.length}/${L.stages.length} stages done`;
}

function renderCheck(body, S, p) {
  const c = S.check;
  const answered = p.checks[state.stage];
  body.append(el('p', 'check__q', esc(c.q)));
  const list = el('div', 'check__opts');
  c.options.forEach((o, i) => {
    const b = el('button', 'check__opt', esc(o));
    b.onclick = () => {
      const right = i === c.answer;
      p.checks[state.stage] = right;
      store.set(state.saved);
      list.querySelectorAll('button').forEach((x, j) => {
        x.classList.toggle('is-right', j === c.answer && right);
        x.classList.toggle('is-wrong', j === i && !right);
      });
      fb.className = `check__fb ${right ? 'is-right' : 'is-wrong'}`;
      fb.textContent = right ? `Correct. ${c.why}` : 'Not quite. Have another look at the “Why” tab and try again.';
      $('#tabs .tab:last-child').classList.toggle('tab--ok', right);
    };
    list.append(b);
  });
  const fb = el('p', 'check__fb');
  if (answered === true) {
    fb.className = 'check__fb is-right';
    fb.textContent = `You got this one right. ${c.why}`;
  }
  body.append(list, fb);
}

// Lesson picker, print card, URL ----------------------------------------------

function openPicker() {
  const list = $('#picker-list');
  list.replaceChildren(...lessons.map((l) => {
    const li = el('li', `pick${l.soon ? ' pick--soon' : ''}${l === state.lesson ? ' is-current' : ''}`);
    const b = el('button', 'pick__btn', `
      <span class="pick__ref">${esc(l.ref)}</span>
      <span class="pick__main"><span class="pick__title">${esc(l.title)}</span><span class="pick__place">${esc(l.place)}</span><span class="pick__sum">${esc(l.summary)}</span></span>
      <span class="pick__tag">${l.soon ? 'Coming next' : `${l.stages.length} stages`}</span>`);
    b.disabled = !!l.soon;
    b.onclick = () => { $('#picker').close(); loadLesson(l.id); };
    li.append(b);
    return li;
  }));
  $('#picker').showModal();
}

function printCard() {
  const L = state.lesson;
  $('#printcard').innerHTML = `
    <h1>${esc(L.title)}</h1>
    <p class="pc-meta">Field Kit · ${esc(L.place)} · grid ref ${esc(L.ref)}</p>
    ${L.stages.map((s, i) => `
      <section>
        <h2>${i + 1}. ${esc(s.title)}</h2>
        <p><em>${esc(s.lede)}</em></p>
        <ol>${s.steps.map((t) => `<li>${esc(t.label)}</li>`).join('')}</ol>
        ${s.why.map((t) => `<p>${esc(t)}</p>`).join('')}
        <p><strong>Safety</strong></p><ul>${s.safety.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${s.check ? `<p><strong>Check:</strong> ${esc(s.check.q)}</p>` : ''}
      </section>`).join('')}
    <p class="pc-foot">Sources: ${L.sources.map((s) => `${esc(s.publisher)}, ${esc(s.title)} (${esc(s.url)})`).join('; ')}.
    Always follow your school’s risk assessment and the instructions of the adult in charge.</p>`;
  print();
}

function syncUrl() {
  const q = new URLSearchParams({ lesson: state.lesson.id });
  if (state.stage || state.step) q.set('stage', state.stage + 1);
  if (state.step) q.set('step', state.step + 1);
  if (state.mode === 'teacher') q.set('mode', 'teacher');
  history.replaceState(null, '', `?${q}`);
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 3200);
}

function setMode(mode) {
  state.mode = mode;
  app.dataset.mode = mode;
  document.querySelectorAll('.mode__btn').forEach((b) => b.setAttribute('aria-checked', b.dataset.mode === mode));
  if (mode === 'teacher' && state.tab === 'check') state.tab = 'teacher';
  if (mode === 'student' && state.tab === 'teacher') state.tab = 'steps';
  if (state.lesson) { syncUrl(); render(); }
}

function mapFocus() {
  const r = $('#scene').getBoundingClientRect();
  const notes = $('#notes').getBoundingClientRect();
  const wide = innerWidth > 900;
  const cx = wide ? (r.left + notes.left) / 2 : r.left + r.width / 2;
  return { x: cx / innerWidth, y: (r.top + r.height * 0.5) / innerHeight };
}

function loadLesson(id, { stage = 0, step = 0 } = {}) {
  state.lesson = byId(id) ?? lessons[0];
  map.goTo(state.lesson.ref, mapFocus(), !!state.tl);
  state.tab = state.mode === 'teacher' ? 'teacher' : 'steps';
  const S = state.lesson.stages;
  const s = Math.min(Math.max(stage, 0), S.length - 1);
  goTo(s, Math.min(Math.max(step, 0), S[s].steps.length - 1), { play: true });
}

// Wiring ------------------------------------------------------------------------

$('#play').onclick = () => {
  if (state.tl?.finished) goTo(state.stage, state.step, { play: true });
  else setPlaying(!state.playing);
};
$('#next').onclick = next;
$('#prev').onclick = prev;
$('#speed').onclick = () => {
  const speeds = [1, 1.5, 0.5];
  state.speed = speeds[(speeds.indexOf(state.speed) + 1) % speeds.length];
  $('#speed').textContent = `${state.speed}×`;
};
$('#view-reset').onclick = () => {
  const tl = new Timeline();
  new Director(tl, world).camera(DEFAULT_VIEW, 0, 1);
  const run = () => { tl.seek(tl.time + 1 / 60); if (!tl.finished) requestAnimationFrame(run); };
  run();
};
$('#lesson-pick').onclick = openPicker;
$('#picker-close').onclick = () => $('#picker').close();
$('#print-btn').onclick = printCard;
document.querySelectorAll('.mode__btn').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
addEventListener('resize', () => state.lesson && map.goTo(state.lesson.ref, mapFocus(), false));

addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, dialog') || e.metaKey || e.ctrlKey) return;
  if (e.key === ' ') { e.preventDefault(); $('#play').click(); }
  else if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
  else if (e.key.toLowerCase() === 'r') $('#view-reset').click();
  else if (e.key.toLowerCase() === 't') setMode(state.mode === 'teacher' ? 'student' : 'teacher');
  else if (e.key.toLowerCase() === 'l') openPicker();
});

const q = new URLSearchParams(location.search);
setMode(q.get('mode') === 'teacher' ? 'teacher' : 'student');
loadLesson(q.get('lesson') ?? 'fire', { stage: Number(q.get('stage') ?? 1) - 1, step: Number(q.get('step') ?? 1) - 1 });
window.__fieldkit = { state, goTo, world };
