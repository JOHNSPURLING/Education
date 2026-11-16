// The practice map behind every lesson. It is a made-up stretch of English
// countryside drawn in the manner of a walker's map: a numbered grid, contour lines,
// woodland, a stream and paths. Each lesson has a grid reference on it, so students
// practise reading grid references simply by moving between lessons.
//
// Map units are grid squares (as on a 1:25 000 map, one square = 1 km).

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.03, y * 2.03) * 0.3 + vnoise(x * 4.1, y * 4.1) * 0.15;

const height = (e, n) => fbm(e * 0.55 + 3.1, n * 0.55 + 7.7) * 0.85 + 0.25 * Math.sin(e * 0.3 + n * 0.2);
const woodland = (e, n) => fbm(e * 0.9 + 40, n * 0.9 - 12);

const C = {
  paper: '#f6f3ea',
  grid: 'rgba(56, 132, 178, 0.38)',
  gridText: '#3a7aa3',
  contour: 'rgba(196, 120, 60, 0.5)',
  contourBold: 'rgba(186, 104, 44, 0.75)',
  wood: '#dbe8c6',
  woodEdge: 'rgba(96, 140, 70, 0.35)',
  tree: '#5d8a48',
  water: '#4b93c2',
  waterFill: '#cfe5f1',
  path: '#b4472f',
};

export class PracticeMap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.centre = { e: 48.2, n: 31.7 }; // grid ref of the point under `focus`
    this.focus = { x: 0.4, y: 0.45 }; // where on screen that point sits (fractions)
    this.anim = null;
    addEventListener('resize', () => this.draw());
  }

  // Pan the map so a grid reference (e.g. "482 317") sits under the scene.
  goTo(ref, focus, animate = true) {
    const [e, n] = ref.split(' ').map((s) => Number(s) / 10);
    if (focus) this.focus = focus;
    if (!animate) {
      this.centre = { e, n };
      return this.draw();
    }
    const from = { ...this.centre }, t0 = performance.now();
    cancelAnimationFrame(this.anim);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 900), k = 1 - Math.pow(1 - p, 3);
      this.centre = { e: from.e + (e - from.e) * k, n: from.n + (n - from.n) * k };
      this.draw();
      if (p < 1) this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  }

  draw() {
    const dpr = Math.min(devicePixelRatio, 2);
    const W = innerWidth, H = innerHeight;
    const cv = this.canvas, ctx = this.ctx;
    if (cv.width !== W * dpr || cv.height !== H * dpr) {
      cv.width = W * dpr;
      cv.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const S = Math.max(170, Math.min(W, H) * 0.3); // pixels per grid square
    const ox = W * this.focus.x - this.centre.e * S;
    const oy = H * this.focus.y + this.centre.n * S;
    paintMap(ctx, W, H, ox, oy, S);

    // Light paper grain and a vignette to push the map behind the 3D.
    const g = ctx.createRadialGradient(W * this.focus.x, H * this.focus.y, Math.min(W, H) * 0.2, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
    g.addColorStop(0, 'rgba(246,243,234,0)');
    g.addColorStop(1, 'rgba(232,226,210,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

// Paint the map into any canvas: (ox, oy) is where grid 00 00 would be, S is pixels
// per grid square. Used for the full-screen background and for paper maps in 3D.
export function paintMap(ctx, W, H, ox, oy, S) {
  const toE = (x) => (x - ox) / S, toN = (y) => (oy - y) / S;
  const X = (e) => ox + e * S, Y = (n) => oy - n * S;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);

  // Woodland: a union of soft circles where the woodland noise is high.
  const cell = 14;
  ctx.fillStyle = C.wood;
  ctx.beginPath();
  const trees = [];
  for (let y = -cell; y < H + cell; y += cell) {
    for (let x = -cell; x < W + cell; x += cell) {
      const e = toE(x), n = toN(y);
      const w = woodland(e, n);
      if (w > 0.56) {
        ctx.moveTo(x + cell, y);
        ctx.arc(x, y, cell * 0.95, 0, Math.PI * 2);
        const h = hash(Math.round(e * 40), Math.round(n * 40));
        if (h > 0.83 && w > 0.6) trees.push([x + (h - 0.9) * 20, y, h]);
      }
    }
  }
  ctx.fill();

  // Contours by marching squares on a coarse grid.
  const step = 9;
  const cols = Math.ceil(W / step) + 2, rows = Math.ceil(H / step) + 2;
  const hgt = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) hgt[j * cols + i] = height(toE((i - 1) * step), toN((j - 1) * step));
  const interval = 0.045;
  const lo = Math.floor(Math.min(...hgt) / interval), hi = Math.ceil(Math.max(...hgt) / interval);
  for (let L = lo; L <= hi; L++) {
    const lv = L * interval;
    const bold = L % 5 === 0;
    ctx.strokeStyle = bold ? C.contourBold : C.contour;
    ctx.lineWidth = bold ? 1.5 : 0.9;
    ctx.beginPath();
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = hgt[j * cols + i], b = hgt[j * cols + i + 1], c = hgt[(j + 1) * cols + i + 1], d = hgt[(j + 1) * cols + i];
        const x0 = (i - 1) * step, y0 = (j - 1) * step;
        const pts = [];
        const edge = (v1, v2, ax, ay, bx, by) => {
          if ((v1 < lv) === (v2 < lv)) return;
          const t = (lv - v1) / (v2 - v1);
          pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
        };
        edge(a, b, x0, y0, x0 + step, y0);
        edge(b, c, x0 + step, y0, x0 + step, y0 + step);
        edge(c, d, x0 + step, y0 + step, x0, y0 + step);
        edge(d, a, x0, y0 + step, x0, y0);
        for (let k = 0; k + 1 < pts.length; k += 2) {
          ctx.moveTo(...pts[k]);
          ctx.lineTo(...pts[k + 1]);
        }
      }
    }
    ctx.stroke();
  }

  // A stream winding through the low ground.
  ctx.strokeStyle = C.water;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let e = toE(-40); e < toE(W + 40); e += 0.02) {
    const n = 33.4 - (e - 44) * 0.42 + Math.sin(e * 2.2) * 0.35 + Math.sin(e * 5.3) * 0.08;
    e === toE(-40) ? ctx.moveTo(X(e), Y(n)) : ctx.lineTo(X(e), Y(n));
  }
  ctx.stroke();

  // A pond.
  ctx.fillStyle = C.waterFill;
  ctx.strokeStyle = C.water;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(X(49.35), Y(30.55), S * 0.13, S * 0.08, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Footpaths: short red dashes.
  ctx.strokeStyle = C.path;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 5]);
  for (const [a, b, wob] of [[[44, 28.6], [53, 35.2], 0.3], [[45, 34.5], [52.5, 28.4], 0.25], [[47.6, 36], [48.9, 27], 0.18]]) {
    ctx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.01) {
      const e = a[0] + (b[0] - a[0]) * t + Math.sin(t * 9) * wob * 0.4;
      const n = a[1] + (b[1] - a[1]) * t + Math.cos(t * 7) * wob;
      t === 0 ? ctx.moveTo(X(e), Y(n)) : ctx.lineTo(X(e), Y(n));
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Tree symbols: round broadleaf and pointed conifer.
  for (const [x, y, h] of trees) {
    ctx.fillStyle = C.tree;
    ctx.strokeStyle = C.tree;
    ctx.lineWidth = 1;
    if (h > 0.915) {
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x + 3.6, y + 3);
      ctx.lineTo(x - 3.6, y + 3);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y - 2.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(x, y + 1);
    ctx.lineTo(x, y + 5);
    ctx.stroke();
  }

  // Grid lines with their numbers in the margins.
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.font = '600 12px "Archivo Narrow", sans-serif';
  ctx.fillStyle = C.gridText;
  for (let e = Math.floor(toE(0)); e <= toE(W); e++) {
    const x = Math.round(X(e)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillText(String(e).padStart(2, '0'), x + 4, H - 8);
  }
  for (let n = Math.floor(toN(H)); n <= toN(0); n++) {
    const y = Math.round(Y(n)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(String(n).padStart(2, '0'), W - 6, y - 5);
  }
}
