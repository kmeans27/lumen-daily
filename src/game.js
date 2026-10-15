// game.js — LUMEN: the daily light puzzle.
// ... IIFE-wrapped to avoid global-name collisions in a browser.
(function(){
const eng = (typeof require !== 'undefined') ? require('./engine.js') : window.LUMEN_ENGINE;
const gen = (typeof require !== 'undefined') ? require('./generator.js') : window.LUMEN_GEN;
const { simulate } = eng;

// ---------- date key ----------
function dateKey(d){ return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); }

// ---------- headless driver for tests ----------
function runGame(d){
  const g = gen.generate(d);
  if(!g) return null;
  const b = new Map(); for(const [k,c] of g.board) b.set(k,{...c});
  for(const m of g.solution) b.set(m.x+','+m.y,{type:'mirror',o:m.o,x:m.x,y:m.y});
  const sol = simulate(b,g.W,g.H,g.emitter);
  return { g, solved: sol.solved, lit:[...sol.lit] };
}

// ---------- browser boot ----------
function boot(){
  const d = new Date();
  const key = dateKey(d);
  const g = gen.generate(d);
  if(!g){ document.body.innerHTML='<p>No board today.</p>'; return; }

  const W=g.W,H=g.H;
  const board = new Map(); for(const [k,c] of g.board) board.set(k,{...c});
  const emitter = g.emitter;
  const inventory = g.inventory;
  const placed = new Map(); // player-placed mirrors: "x,y" -> {o}

  const canvas = document.getElementById('lumen');
  const ctx = canvas.getContext('2d');
  const CELL = 64;
  canvas.width = W*CELL; canvas.height = H*CELL;

  let st; try { st = JSON.parse(localStorage.getItem('lumen.state')||''); } catch(e){ st=null; }
  if(!st) st = { lastKey:0, streak:0, best:0, played:0, wins:0 };

  let solved=false, moves=0;

  function simulateNow(){
    const b = new Map(); for(const [k,c] of board) b.set(k,{...c});
    for(const [k,m] of placed) { const [x,y]=k.split(',').map(Number); b.set(k,{type:'mirror',o:m.o,x,y}); }
    return simulate(b,W,H,emitter);
  }

  function draw(){
    const r = simulateNow();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#0a0a0f'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='rgba(120,130,150,0.12)'; ctx.lineWidth=1;
    for(let x=0;x<=W;x++){ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,H*CELL);ctx.stroke();}
    for(let y=0;y<=H;y++){ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(W*CELL,y*CELL);ctx.stroke();}
    for(const s of r.trace){
      ctx.strokeStyle=s.color; ctx.lineWidth=3; ctx.shadowColor=s.color; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.moveTo(s.x1*CELL+CELL/2,s.y1*CELL+CELL/2); ctx.lineTo(s.x2*CELL+CELL/2,s.y2*CELL+CELL/2); ctx.stroke();
    }
    ctx.shadowBlur=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const c=board.get(x+','+y); const px=x*CELL+CELL/2, py=y*CELL+CELL/2;
      if(!c) continue;
      if(c.type==='emitter') drawEmitter(px,py,c.dir);
      else if(c.type==='target'){ const on=r.lit.has(x+','+y); drawTarget(px,py,c.color,on); }
      else if(c.type==='prism') drawPrism(px,py);
      else if(c.type==='filter') drawFilter(px,py,c.color);
    }
    for(const [k,m] of placed){ const [x,y]=k.split(',').map(Number); drawMirror(x*CELL+CELL/2,y*CELL+CELL/2,m.o,false); }
    for(const m of g.visibleMirrors){ drawMirror(m.x*CELL+CELL/2,m.y*CELL+CELL/2,m.o,true); }
    if(r.solved) drawWin();
    return r;
  }

  function drawEmitter(px,py,dir){ ctx.fillStyle='#e8eef7'; ctx.beginPath(); ctx.arc(px,py,10,0,7); ctx.fill(); ctx.fillStyle='#0a0a0f'; ctx.beginPath(); ctx.arc(px,py,4,0,7); ctx.fill(); const dx=[1,0,-1,0][dir]*16,dy=[0,1,0,-1][dir]*16; ctx.strokeStyle='#e8eef7'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+dx,py+dy); ctx.stroke(); }
  function drawTarget(px,py,color,on){ ctx.strokeStyle=color; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(px,py,16,0,7); ctx.stroke(); if(on){ ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=18; ctx.beginPath(); ctx.arc(px,py,11,0,7); ctx.fill(); ctx.shadowBlur=0; } }
  function drawPrism(px,py){ ctx.strokeStyle='#cdd6e6'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(px-12,py+12); ctx.lineTo(px+12,py+12); ctx.lineTo(px,py-14); ctx.closePath(); ctx.stroke(); }
  function drawFilter(px,py,color){ ctx.strokeStyle=color; ctx.lineWidth=2; ctx.strokeRect(px-13,py-13,26,26); ctx.fillStyle=color; ctx.globalAlpha=0.25; ctx.fillRect(px-13,py-13,26,26); ctx.globalAlpha=1; }
  function drawMirror(px,py,o,hint){ ctx.strokeStyle=hint?'#7fd7ff':'#e8eef7'; ctx.lineWidth=3; ctx.beginPath(); if(o==='\\'){ctx.moveTo(px-16,py-16);ctx.lineTo(px+16,py+16);}else{ctx.moveTo(px-16,py+16);ctx.lineTo(px+16,py-16);} ctx.stroke(); }
  function drawWin(){ ctx.fillStyle='#e8eef7'; ctx.font='bold 22px sans-serif'; ctx.textAlign='center'; ctx.fillText('SOLVED', canvas.width/2, canvas.height-18); ctx.textAlign='left'; }

  const hud = document.getElementById('hud');
  function render(){ hud.textContent = `LUMEN #${key}  ·  mirrors ${placed.size}/${inventory}`; }

  function cellFromEvent(ev){
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((ev.clientX-rect.left)/CELL), y=Math.floor((ev.clientY-rect.top)/CELL);
    return (x>=0&&y>=0&&x<W&&y<H)?{x,y}:null;
  }

  canvas.addEventListener('pointerdown', ev=>{
    const c=cellFromEvent(ev); if(!c)return;
    const k=c.x+','+c.y; const cur=board.get(k);
    if(cur&&cur.type!=='empty') return; // can't place on emitter/fixture/target
    if(placed.has(k)){
      const m=placed.get(k);
      if(m.o){ placed.set(k,{o: m.o==='\\'?'/':'\\'}); } // rotate
      else { placed.delete(k); }
    } else {
      if(placed.size>=inventory) return; // no spare mirrors — economy is the hook
      placed.set(k,{o:'\\'}); moves++;
    }
    const r=draw(); render();
    if(r.solved && !solved){ solved=true; onWin(); }
  });

  function onWin(){
    st.played++; st.wins++;
    st.streak = (st.lastKey===key-1 || st.lastKey===0)? st.streak+1 : 1;
    if(st.streak>st.best) st.best=st.streak;
    st.lastKey=key;
    try { localStorage.setItem('lumen.state', JSON.stringify(st)); } catch(e){}
    // spoiler-free share card: target count (difficulty), moves, streak
    const tier = gen.RAMP[(d.getDay()+6)%7];
    const dots = '◆'.repeat(Math.min(tier.targets,4));
    const card = `LUMEN #${key} · ${dots} · ${moves} move${moves===1?'':'s'} · ${st.streak}🔆`;
    const shareEl = document.getElementById('share');
    if(shareEl) shareEl.textContent = card;
  }

  render();
  draw();
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { runGame }; }
else { boot(); }
})();
