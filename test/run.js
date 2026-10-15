// test/run.js — verify every daily board is solvable by construction.
// Ground truth: the playable board + all solution mirrors must light every target.
const gen = require('../src/generator.js');
const eng = require('../src/engine.js');

function clone(b){ const m=new Map(); for(const [k,c] of b) m.set(k,{...c}); return m; }

let pass=0, fail=0, degenerate=0;
const start = new Date(2026,0,5); // a Monday
for (let d=0; d<70; d++){
  const date = new Date(start.getTime()+d*86400000);
  const g = gen.generate(date);
  if(!g){ console.log(`FAIL null board ${date.toDateString()}`); fail++; continue; }
  // reconstruct the known solution by placing every solution mirror
  const b = clone(g.board);
  for(const m of g.solution) b.set(m.x+','+m.y,{type:'mirror',o:m.o,x:m.x,y:m.y});
  const sol = eng.simulate(b, g.W, g.H, g.emitter);
  const tcount=g.targets.length;
  const litCount=[...sol.lit].length;
  if(sol.solved && tcount>0 && litCount===tcount){ pass++; }
  else { fail++; console.log(`FAIL ${date.toDateString()} solved=${sol.solved} targets=${tcount} lit=${litCount}`); }
  if(g.inventory===0) degenerate++;
}
console.log(`PASS ${pass}  FAIL ${fail}  degenerate ${degenerate}`);
