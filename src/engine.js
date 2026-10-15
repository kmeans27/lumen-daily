// engine.js — the optical engine for LUMEN.
// Pure, deterministic, no DOM. Seeded by date so every player worldwide computes
// the identical daily board. This is the single biggest engagement driver in the
// daily-game genre: ONE shared puzzle per day, with no server required.
// Dual-mode: works in Node (CommonJS) AND in a browser <script> (globals on window).
// Wrapped in an IIFE so its top-level names never collide with other scripts.
(function(){
const _mod = (typeof module !== 'undefined' && module.exports) ? module.exports : (window.LUMEN_ENGINE || (window.LUMEN_ENGINE={}));

// ---------- Deterministic PRNG (mulberry32) ----------
function prng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = (t ^ (t >>> 15)) >>> 0;
    t = (t * 0x8EB1C9F7) >>> 0;
    t = (t ^ (t >>> 13)) >>> 0;
    t = (t * 0x9E3779B1) >>> 0;
    t = (t ^ (t >>> 16)) >>> 0;
    return (t >>> 0) / 4294967296;
  };
}

function rint(rand, lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); }
function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }

// ---------- Directions ----------
// dir: 0=E(+x) 1=S(+y) 2=W(-x) 3=N(-y)
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

// Mirror "\": E->S, S->E, W->N, N->W
// Mirror "/": E->N, N->E, W->S, S->W
const MIRROR_BACK = { 0: 1, 1: 0, 2: 3, 3: 2 }; // "\" backslash
const MIRROR_FWD  = { 0: 3, 3: 0, 2: 1, 1: 2 }; // "/" forward slash

// ---------- Cell model ----------
// A cell holds optional content:
//   { type:'mirror', o:'\\' or '/' }   (player-placed)
//   { type:'prism' }                    (fixed: beam splits into two straight-through rays)
//   { type:'filter', color:'#hex' }     (fixed: recolors the beam)
//   { type:'target', color:'#hex' }     (goal; lit when a matching-color beam crosses it)
//   { type:'emitter', dir:int }         (fixed: the beam source)

// ---------- Beam simulation ----------
// Returns { lit:Set("x,y"), trace:[segments], solved:bool, targets:[...] }.
// A beam enters from the emitter and travels cell-to-cell. Mirrors turn it, prisms
// split it (continue straight), filters recolor it. Targets are lit when a beam of
// matching color passes over them; a target is never an obstacle.
//
// Loop-safety: a state is (x,y,dir,color). If a state repeats we stop expanding —
// that terminates any cycle. Split beams are explored as a worklist.
function simulate(board, W, H, emitter) {
  const targets = [];
  for (const [k, c] of board) if (c.type === 'target') targets.push({ x: c.x, y: c.y, color: c.color });

  const lit = new Set();
  const trace = [];
  const seen = new Set();
  const startColor = '#FFFFFF';

  const queue = [];
  const ex = emitter.x, ey = emitter.y, ed = emitter.dir;
  queue.push({ x: ex, y: ey, dir: ed, color: startColor });

  const key = (x, y, d, c) => x + ',' + y + ',' + d + ',' + c;

  while (queue.length) {
    let b = queue.shift();
    // record the beam segment start; we advance until it bends or exits
    let sx = b.x, sy = b.y;
    let guard = 0;
    while (true) {
      if (guard++ > 4000) break;
      const k = key(b.x, b.y, b.dir, b.color);
      if (seen.has(k)) break;
      seen.add(k);

      const cell = board.get(b.x + ',' + b.y);
      // light a target (non-obstacle) when color matches
      if (cell && cell.type === 'target') {
        if (cell.color === b.color) lit.add(cell.x + ',' + cell.y);
      }
      // handle content that changes the beam, then MOVE OUT of the cell so we never
      // re-apply the same cell's content (the classic mirror re-trigger bug).
      if (cell && cell.type === 'mirror') {
        const nd = (cell.o === '\\') ? MIRROR_BACK[b.dir] : MIRROR_FWD[b.dir];
        trace.push({ x1: sx, y1: sy, x2: b.x, y2: b.y, color: b.color });
        b = { x: b.x, y: b.y, dir: nd, color: b.color };
        sx = b.x; sy = b.y;
        // advance past the mirror before continuing the loop
        const mx = b.x + DX[b.dir], my = b.y + DY[b.dir];
        if (mx < 0 || my < 0 || mx >= W || my >= H) { trace.push({x1:sx,y1:sy,x2:mx, y2:my,color:b.color}); break; }
        b = { x: mx, y: my, dir: b.dir, color: b.color };
        continue;
      }
      if (cell && cell.type === 'filter') {
        trace.push({ x1: sx, y1: sy, x2: b.x, y2: b.y, color: b.color });
        b = { x: b.x, y: b.y, dir: b.dir, color: cell.color };
        sx = b.x; sy = b.y;
        const fx = b.x + DX[b.dir], fy = b.y + DY[b.dir];
        if (fx < 0 || fy < 0 || fx >= W || fy >= H) { trace.push({x1:sx,y1:sy,x2:fx,y2:fy,color:b.color}); break; }
        b = { x: fx, y: fy, dir: b.dir, color: b.color };
        continue;
      }
      if (cell && cell.type === 'prism') {
        // split: continue straight (the current beam), plus a perpendicular pair.
        // For a clean, always-terminating effect we split into the two perpendicular
        // directions and stop the straight-through beam at the prism (the "white
        // splitter"). This is the fixture the player must route *into*.
        trace.push({ x1: sx, y1: sy, x2: b.x, y2: b.y, color: b.color });
        const perp = (b.dir % 2 === 0) ? [1, 3] : [0, 2];
        for (const nd of perp) queue.push({ x: b.x, y: b.y, dir: nd, color: b.color });
        break;
      }
      // move forward
      const nx = b.x + DX[b.dir], ny = b.y + DY[b.dir];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) {
        trace.push({ x1: sx, y1: sy, x2: b.x, y2: b.y, color: b.color });
        break;
      }
      b = { x: nx, y: ny, dir: b.dir, color: b.color };
    }
  }

  let solved = targets.length > 0;
  for (const t of targets) if (!lit.has(t.x + ',' + t.y)) { solved = false; break; }
  return { lit, trace, solved, targets };
}

_mod.prng = prng; _mod.rint = rint; _mod.pick = pick; _mod.simulate = simulate;
_mod.DX = DX; _mod.DY = DY; _mod.MIRROR_BACK = MIRROR_BACK; _mod.MIRROR_FWD = MIRROR_FWD;
})();
