// generator.js — builds a daily board FROM A KNOWN SOLUTION.
// ... (see header) ... IIFE-wrapped to avoid global-name collisions in a browser.
(function(){
const eng = (typeof require !== 'undefined') ? require('./engine.js') : window.LUMEN_ENGINE;
const { prng, rint, pick } = eng;
const { DX, DY, MIRROR_BACK, MIRROR_FWD } = eng;
const _gmod = (typeof module !== 'undefined' && module.exports) ? module.exports : (window.LUMEN_GEN || (window.LUMEN_GEN={}));

const RAMP = [
  { W:5,H:5, targets:1, prisms:0, filters:0, hints:1 },
  { W:5,H:5, targets:2, prisms:0, filters:0, hints:1 },
  { W:6,H:6, targets:2, prisms:1, filters:0, hints:1 },
  { W:6,H:6, targets:2, prisms:0, filters:1, hints:0 },
  { W:7,H:7, targets:3, prisms:1, filters:1, hints:0 },
  { W:7,H:7, targets:3, prisms:2, filters:2, hints:0 },
  { W:8,H:8, targets:4, prisms:2, filters:2, hints:0 },
];

function dateSeed(d) { return (d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate()) >>> 0; }

function mirrorFor(from, to) {
  if (MIRROR_BACK[from] === to) return '\\';
  if (MIRROR_FWD[from] === to) return '/';
  return null;
}

function genBoard(rand, cfg) {
  const W = cfg.W, H = cfg.H;
  const board = new Map();
  const occupied = new Set();
  const mirrorCells = [];

  const side = rint(rand, 0, 3);
  let ex, ey, dir;
  if (side === 0) { ex = 0; ey = rint(rand, 0, H-1); dir = 0; }
  else if (side === 2) { ex = W-1; ey = rint(rand, 0, H-1); dir = 2; }
  else if (side === 1) { ex = rint(rand, 0, W-1); ey = 0; dir = 1; }
  else { ex = rint(rand, 0, W-1); ey = H-1; dir = 3; }

  board.set(ex+','+ey, { type:'emitter', dir, x:ex, y:ey });
  occupied.add(ex+','+ey);
  const startDir = dir; // capture the TRUE emitter direction before the walk mutates it

  // The emitter cell itself is never a mirror: the beam leaves it straight. We
  // advance FIRST, then decide at each entered cell whether to turn (placing a
  // mirror there). This matches engine.simulate: the beam enters a cell, the cell's
  // content is applied, then it continues. So a mirror we place at cell C is hit by
  // the beam arriving at C — exactly as the simulator will replay it.
  const visited = [{ x:ex, y:ey }];
  let x = ex, y = ey;
  const minTurns = Math.max(cfg.targets, 2);
  const maxTurns = Math.max(cfg.targets + 4, 5);
  let turns = 0;
  let guard = 0;

  while (guard++ < 200) {
    // advance one step straight (the beam is currently at x,y traveling `dir`)
    let nx = x+DX[dir], ny = y+DY[dir];
    if (!(nx>=0&&ny>=0&&nx<W&&ny<H) || occupied.has(nx+','+ny)) break; // beam leaves board or hits used cell
    x=nx; y=ny; occupied.add(x+','+y);
    board.set(x+','+y, { type:'empty', x, y });
    visited.push({ x, y });

    // decide whether to turn AT this cell
    const turnOptions = [];
    for (const nd of [(dir+3)%4, (dir+1)%4]) {
      const o = mirrorFor(dir, nd);
      if (!o) continue;
      const tx = x+DX[nd], ty = y+DY[nd];
      if (tx>=0&&ty>=0&&tx<W&&ty<H&&!occupied.has(tx+','+ty)) turnOptions.push({nd,o});
    }
    const canTurn = turnOptions.length > 0;
    // the emitter cell is never a mirror — the beam leaves it straight. Only decide
    // to turn on cells AFTER the first, so the emitter keeps type:'emitter'.
    const atEmitter = (x===ex && y===ey);
    const wantTurn = !atEmitter && canTurn && (turns < minTurns ? rand() < 0.65 : (turns < maxTurns ? rand() < 0.45 : false));
    if (wantTurn) {
      const t = pick(rand, turnOptions);
      board.set(x+','+y, { type:'mirror', o:t.o, x, y });
      mirrorCells.push({ x, y, o:t.o });
      dir = t.nd; turns++;
    }
  }

  // Place targets on visited cells that are currently 'empty' (the beam crosses them
  // straight). A target is not an obstacle, so the beam still passes and lights it.
  const free = visited.filter(p => board.get(p.x+','+p.y) && board.get(p.x+','+p.y).type === 'empty');
  const palette = ['#FF5B7A','#FFD166','#7CE7FF','#9B8CFF'];
  const targets = [];
  for (let i = 0; i < cfg.targets && i < free.length; i++) {
    const cell = free[Math.floor((i + 0.5) / Math.max(cfg.targets,1) * free.length) % free.length];
    const color = '#FFFFFF';
    board.set(cell.x+','+cell.y, { type:'target', color, x:cell.x, y:cell.y });
    targets.push({ x:cell.x, y:cell.y, color });
  }

  // Fixtures go on EMPTY cells the beam does NOT cross (off-route), so the
  // guaranteed solution is never disturbed. They're optional tools for alternative
  // solves: prisms split, filters recolor.
  const offRoute = [];
  for (let yy=0; yy<H; yy++) for (let xx=0; xx<W; xx++) {
    const c = board.get(xx+','+yy);
    if (!c) offRoute.push({ x:xx, y:yy });
  }
  offRoute.sort(() => rand()-0.5);
  const fixtures = [];
  for (let i = 0; i < cfg.prisms && offRoute.length; i++) {
    const p = offRoute.shift();
    board.set(p.x+','+p.y, { type:'prism', x:p.x, y:p.y });
    fixtures.push({ type:'prism', x:p.x, y:p.y });
  }
  for (let i = 0; i < cfg.filters && offRoute.length; i++) {
    const p = offRoute.shift();
    const color = pick(rand, palette);
    board.set(p.x+','+p.y, { type:'filter', color, x:p.x, y:p.y });
    fixtures.push({ type:'filter', color, x:p.x, y:p.y });
  }

  return { board, W, H, emitter:{x:ex,y:ey,dir:startDir}, startDir, targets, mirrorCells, fixtures, visited };
}

// Verify the known solution lights every target; if not, retry with a new seed.
function generate(d, tries = 40) {
  const cfg = RAMP[((d.getDay()+6)%7)];
  for (let attempt = 0; attempt < tries; attempt++) {
    const rand = prng(dateSeed(d) + attempt*7919);
    const g = genBoard(rand, cfg);
    if (g.targets.length < cfg.targets) continue;
    if (g.mirrorCells.length < 1) continue;
    const sol = eng.simulate(g.board, g.W, g.H, g.emitter);
    if (!sol.solved) continue;
    const hidden = g.mirrorCells.slice();
    const keep = Math.min(cfg.hints, hidden.length);
    const visibleMirrors = hidden.slice(0, keep);
    const playable = new Map(g.board);
    for (const m of hidden.slice(keep)) playable.set(m.x+','+m.y, { type:'empty', x:m.x, y:m.y });
    const inventory = hidden.length - keep;
    if (inventory < 1) continue; // always leave at least one mirror to place — no trivial boards
    return { cfg, W:g.W, H:g.H, board:playable, emitter:g.emitter,
             solution:g.mirrorCells, inventory, visibleMirrors, hiddenCount:inventory, targets:g.targets };
  }
  return null;
}

_gmod.generate = generate; _gmod.RAMP = RAMP; _gmod.dateSeed = dateSeed; _gmod.genBoard = genBoard;
})();
