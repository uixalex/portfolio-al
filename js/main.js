/* ── NAV ── */
const navLabels = { home:'[ HOME ]', work:'[ WORK ]', about:'[ ABOUT ]', contact:'[ CONTACT ]' };

const typeLines = [
  'DESIGNED IN CHAOS.',
  'DELIVERED IN ORDER.'
];

function typewriterHeadline() {
  const els = [
    document.getElementById('hl0'),
    document.getElementById('hl1')
  ];
  // Clear all
  els.forEach(el => { el.textContent = ''; });

  let lineIdx = 0;
  let charIdx = 0;
  let cursor = null;

  function tick() {
    if (lineIdx >= typeLines.length) {
      if (cursor) setTimeout(() => { cursor.remove(); }, 1200);
      if (window.innerWidth <= 768) {
        // 1. Wait 1s so user reads the text
        // 2. Fade out headline
        // 3. Wait for fade (600ms) then show button
        setTimeout(() => {
          const wrap = document.querySelector('.home-headline-wrap');
          if (wrap) wrap.classList.add('fade-out');
          setTimeout(() => {
            const el = document.getElementById('centerLabel');
            if (el) { el.textContent = '[ THIS WAY ]'; el.classList.add('visible'); }
          }, 650);
        }, 1000);
      }
      return;
    }

    const line = typeLines[lineIdx];
    const el   = els[lineIdx];

    // Move cursor to current line
    if (cursor) cursor.remove();
    cursor = document.createElement('span');
    cursor.className = 'hl-cursor';
    el.appendChild(cursor);

    if (charIdx < line.length) {
      // Insert char before cursor
      el.insertBefore(document.createTextNode(line[charIdx]), cursor);
      charIdx++;
      // Slightly random speed: 40–80ms per char, pause longer on '.'
      const ch = line[charIdx - 1];
      const delay = ch === '.' ? 220 : 38 + Math.random() * 38;
      setTimeout(tick, delay);
    } else {
      // Line done — pause then move to next line
      charIdx = 0;
      lineIdx++;
      setTimeout(tick, 180);
    }
  }

  setTimeout(tick, 300);
}

function goTo(page) {
  const alreadyHere = document.getElementById('page-' + page).classList.contains('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById('navLabel').textContent = navLabels[page] || '';
  document.getElementById('statusDesc').textContent = '';
  document.getElementById('statusYear').textContent = '';
  if (page === 'work') {
    const workPage = document.getElementById('page-work');
    workPage.classList.add('is-entering');
    setTimeout(() => workPage.classList.remove('is-entering'), 700);
  }
  if (page === 'home' && !alreadyHere) {
    const h = document.getElementById('page-home');
    if (h && h._resetPuzzle) h._resetPuzzle();
    setTimeout(typewriterHeadline, 80);
    if (h && h._syncPuzzleIntro) setTimeout(h._syncPuzzleIntro, 300);
  }
}
function openMenu()  { document.getElementById('menuOverlay').classList.add('open'); }
function closeMenu() { document.getElementById('menuOverlay').classList.remove('open'); }


window.addEventListener('load', () => {
  setTimeout(() => {
    typewriterHeadline();
    const h = document.getElementById('page-home');
    if (h && h._syncPuzzleIntro) h._syncPuzzleIntro();
  }, 300);
});

/* ══════════════════════════════════════
   PUZZLE ASSEMBLY — interactive home animation
══════════════════════════════════════ */
(function() {
  const canvas = document.getElementById('ripple-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, frame = 0;
  let mouse = { x: -999, y: -999 };
  let assembled = 0, targetAssembled = 0;
  let pieces = [];
  let triggered = false;
  let waves = [], flashAlpha = 0, waveFrame = 0;
  let miniPieces = [];
  let exploded   = false;
  let mobileAssemblyStartFrame = -1;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    initPieces();
  }

  function easeOutCubic(t) { return 1 - Math.pow(1-t, 3); }

  function isMouseNearPiece(mx, my, cx, cy, w, h) {
    return Math.abs(mx-cx) < w*0.7 && Math.abs(my-cy) < h*0.7;
  }

  function drawPiece(cx, cy, w, h, tabs, rot, alpha) {
    const nub = w*0.26;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(rot); ctx.translate(-w/2,-h/2);
    ctx.beginPath();
    const [T,R,B,L] = tabs;
    ctx.moveTo(0,0); ctx.lineTo(w*0.3,0);
    ctx.bezierCurveTo(w*0.3,-nub*T,w*0.7,-nub*T,w*0.7,0); ctx.lineTo(w,0);
    ctx.lineTo(w,h*0.3); ctx.bezierCurveTo(w+nub*R,h*0.3,w+nub*R,h*0.7,w,h*0.7);
    ctx.lineTo(w,h); ctx.lineTo(w*0.7,h);
    ctx.bezierCurveTo(w*0.7,h+nub*B,w*0.3,h+nub*B,w*0.3,h); ctx.lineTo(0,h);
    ctx.lineTo(0,h*0.7); ctx.bezierCurveTo(-nub*L,h*0.7,-nub*L,h*0.3,0,h*0.3);
    ctx.closePath();
    const sep = 1 - assembled;
    ctx.shadowColor='rgba(0,0,0,0.65)'; ctx.shadowBlur=16+sep*14;
    ctx.shadowOffsetX=sep*10; ctx.shadowOffsetY=sep*14;
    // Fill: transparent when scattered, white when assembled
    const fillAlpha = assembled * alpha * 0.95;
    if (fillAlpha > 0.005) {
      ctx.fillStyle = 'rgba(255,255,255,' + fillAlpha.toFixed(3) + ')';
      ctx.fill();
    }
    ctx.shadowBlur=0; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
    // Border: always visible, white
    ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(alpha * 1.2, 0.85).toFixed(3) + ')';
    ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  }

  function drawPieceGlitch(cx, cy, w, h, tabs, rot, alpha, glitch) {
    if (glitch < 0.02) { drawPiece(cx,cy,w,h,tabs,rot,alpha); return; }
    const shift = glitch*7;
    const offsets = [
      {dx:-shift,dy:0,    color:'rgba(255,30,30,'},
      {dx: shift,dy:0,    color:'rgba(30,255,80,'},
      {dx:0,     dy:-shift,color:'rgba(30,100,255,'},
      {dx:0,     dy: shift,color:'rgba(255,220,0,'},
    ];
    ctx.save(); ctx.globalCompositeOperation='screen';
    offsets.forEach(o => {
      const nub=w*0.26;
      ctx.save(); ctx.translate(cx+o.dx,cy+o.dy); ctx.rotate(rot); ctx.translate(-w/2,-h/2);
      ctx.beginPath();
      const [T,R,B,L]=tabs;
      ctx.moveTo(0,0); ctx.lineTo(w*0.3,0);
      ctx.bezierCurveTo(w*0.3,-nub*T,w*0.7,-nub*T,w*0.7,0); ctx.lineTo(w,0);
      ctx.lineTo(w,h*0.3); ctx.bezierCurveTo(w+nub*R,h*0.3,w+nub*R,h*0.7,w,h*0.7);
      ctx.lineTo(w,h); ctx.lineTo(w*0.7,h);
      ctx.bezierCurveTo(w*0.7,h+nub*B,w*0.3,h+nub*B,w*0.3,h); ctx.lineTo(0,h);
      ctx.lineTo(0,h*0.7); ctx.bezierCurveTo(-nub*L,h*0.7,-nub*L,h*0.3,0,h*0.3);
      ctx.closePath();
      ctx.fillStyle=o.color+(alpha*glitch*1.1).toFixed(3)+')'; ctx.fill(); ctx.restore();
    });
    ctx.globalCompositeOperation='source-over'; ctx.restore();
    drawPiece(cx,cy,w,h,tabs,rot,alpha);
  }

  // Mini piece draw — flat fill with assigned color, no glitch effect
  function drawMiniPieceGlitch(cx, cy, w, h, tabs, rot, color) {
    const nub = w*0.26;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-w/2,-h/2);
    ctx.beginPath();
    const [T,R,B,L]=tabs;
    ctx.moveTo(0,0); ctx.lineTo(w*0.3,0);
    ctx.bezierCurveTo(w*0.3,-nub*T,w*0.7,-nub*T,w*0.7,0); ctx.lineTo(w,0);
    ctx.lineTo(w,h*0.3); ctx.bezierCurveTo(w+nub*R,h*0.3,w+nub*R,h*0.7,w,h*0.7);
    ctx.lineTo(w,h); ctx.lineTo(w*0.7,h);
    ctx.bezierCurveTo(w*0.7,h+nub*B,w*0.3,h+nub*B,w*0.3,h); ctx.lineTo(0,h);
    ctx.lineTo(0,h*0.7); ctx.bezierCurveTo(-nub*L,h*0.7,-nub*L,h*0.3,0,h*0.3);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }

  function initPieces() {
    const cx=W/2, cy=H/2;
    const pw=Math.min(W,H)*(window.innerWidth<=768?0.18:0.21), ph=pw;
    const sr=Math.min(W,H)*0.36;
    const angles=[Math.PI*1.2,Math.PI*0.25,Math.PI*0.78,Math.PI*1.75];
    const targets=[{tx:cx-pw,ty:cy-ph},{tx:cx,ty:cy-ph},{tx:cx-pw,ty:cy},{tx:cx,ty:cy}];
    const tabCfgs=[[ 1, 1, 1, 1],[ 1,-1,-1,-1],[-1, 1,-1, 1],[ 1, 1,-1,-1]];
    const cols=[
      {f:'rgba(255,255,255,A)',s:'rgba(255,255,255,A)'},
      {f:'rgba(190,205,255,A)',s:'rgba(160,185,255,A)'},
      {f:'rgba(190,205,255,A)',s:'rgba(160,185,255,A)'},
      {f:'rgba(255,255,255,A)',s:'rgba(255,255,255,A)'},
    ];
    pieces=targets.map((t,i)=>({
      sx:cx+Math.cos(angles[i])*sr, sy:cy+Math.sin(angles[i])*sr*0.72,
      srot:(i%2===0?1:-1)*(0.3+Math.random()*0.5),
      tx:t.tx+pw/2, ty:t.ty+ph/2, w:pw, h:ph,
      tabs:tabCfgs[i], col:cols[i], baseAlpha:0.42+i*0.04,
      introProgress:0, introDelay:9999, glitch:0,
      // Float offset — each piece has own phase so they move independently
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.0007 + Math.random() * 0.0004,
      floatAmp:   6 + Math.random() * 6,
    }));
  }

  function fireShockwave() {
    if (triggered) return; triggered=true;
    const maxR=Math.hypot(W,H)*0.75;
    waves=[];
    waves.push({r:0,maxR,speed:9, alpha:0.9, width:3,  color:'255,255,255',delay:0});
    waves.push({r:0,maxR,speed:7, alpha:0.55,width:1.5,color:'180,220,255',delay:12});
    waves.push({r:0,maxR,speed:5, alpha:0.35,width:1,  color:'120,160,255',delay:26});
    flashAlpha=0.25; waveFrame=0;
    setTimeout(spawnMiniPieces, 700);
  }

  const MINI_COLORS = [
    'rgba(255,255,0,0.4)',
    'rgba(255,0,60,0.35)',
    'rgba(0,255,200,0.35)',
    'rgba(248,242,220,0.5)'
  ];

  function spawnMiniPieces() {
    if (pieces.length === 0) return;
    miniPieces = [];
    const perPiece = 10; // 4 × 10 = 40 total

    pieces.forEach(srcPiece => {
      for (let i = 0; i < perPiece; i++) {
        const startX = srcPiece.tx + (Math.random()-0.5) * srcPiece.w * 1.4;
        const startY = srcPiece.ty + (Math.random()-0.5) * srcPiece.h * 1.4;
        const spreadAngle = Math.atan2(startY - H/2, startX - W/2) + (Math.random()-0.5) * 1.4;
        const speed = 2 + Math.random() * 3.5;
        const sz = 20 + Math.random() * 25;
        miniPieces.push({
          x: startX, y: startY,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          w: sz, h: sz,
          tabs: [Math.random()<0.5?1:-1, Math.random()<0.5?1:-1,
                 Math.random()<0.5?1:-1, Math.random()<0.5?1:-1],
          rot: Math.random()*Math.PI*2,
          vrot: (Math.random()-0.5) * 0.018,
          color: MINI_COLORS[Math.floor(Math.random()*MINI_COLORS.length)],
          floatPhase: Math.random()*Math.PI*2,
          floatSpeed: 0.0006 + Math.random()*0.0006,
          floatAmp: 6 + Math.random() * 8,
          drag: 0.982 + Math.random() * 0.008,
        });
      }
    });
    pieces.forEach(p => { p.hidden = true; });
    exploded = true;
    setTimeout(showCenterLabel, 1500);
  }

  function showCenterLabel() {
    const el = document.getElementById('centerLabel');
    if (!el || !exploded) return;
    const text = '[ THIS WAY ]';
    el.textContent = '';
    el.classList.add('visible');
    let i = 0;
    function typeNext() {
      if (!exploded) return;
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(typeNext, 55 + Math.random() * 40);
      }
    }
    typeNext();
  }

  function updateMiniPieces() {
    miniPieces.forEach(p => {
      p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx + Math.sin(frame * p.floatSpeed * Math.PI * 2 + p.floatPhase) * p.floatAmp * 0.03;
      p.y += p.vy + Math.cos(frame * p.floatSpeed * Math.PI * 2 * 0.7 + p.floatPhase) * p.floatAmp * 0.02;
      p.rot += p.vrot;
      if (Math.hypot(p.vx, p.vy) < 1.2) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120 * 0.8;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }
    });
  }

  function drawMiniPieces() {
    miniPieces.forEach(p => {
      drawMiniPieceGlitch(p.x, p.y, p.w, p.h, p.tabs, p.rot, p.color);
    });
  }

  function drawWaves() {
    const cx=W/2, cy=H/2;
    if (flashAlpha>0.005) {
      ctx.save(); ctx.globalAlpha=flashAlpha; ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); ctx.restore();
      flashAlpha*=0.78;
    }
    waveFrame++;
    waves.forEach(w=>{
      if (waveFrame<w.delay) return; w.r+=w.speed;
      const prog=w.r/w.maxR; if(prog>=1) return;
      const a=w.alpha*(1-prog)*(1-prog); if(a<0.005) return;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx,cy,w.r,0,Math.PI*2);
      ctx.strokeStyle=`rgba(${w.color},${a.toFixed(3)})`; ctx.lineWidth=w.width*(1-prog*0.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,Math.max(0,w.r-8),0,Math.PI*2);
      ctx.strokeStyle=`rgba(${w.color},${(a*0.3).toFixed(3)})`; ctx.lineWidth=w.width*6*(1-prog); ctx.stroke();
      ctx.restore();
    });
  }

  function drawBg() {
    const isMobile = window.innerWidth <= 768;
    const glitchRamp=Math.min(1,frame/300);
    const bas=isMobile ? 0.04+glitchRamp*0.08 : 0.03+glitchRamp*0.11;
    const nL=isMobile
      ? 1+Math.floor(Math.random()*(2+glitchRamp*2))
      : 1+Math.floor(Math.random()*(2+glitchRamp*3));
    for(let n=0;n<nL;n++){
      const y=Math.random()*H, lh=1+Math.random()*2, lw=40+Math.random()*(W*0.65), x=Math.random()*(W-lw);
      const al=bas*(0.5+Math.random()*0.5);
      const cols2=['rgba(255,255,255,','rgba(255,40,40,','rgba(40,255,80,','rgba(40,100,255,','rgba(255,220,0,'];
      ctx.fillStyle=cols2[Math.floor(Math.random()*cols2.length)]+al.toFixed(3)+')';
      ctx.fillRect(x,y,lw,lh);
    }
  }

  const home=document.getElementById('page-home');
  home.addEventListener('mousemove',e=>{
    const r=canvas.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top;
  });
  home.addEventListener('mouseleave',()=>{ mouse.x=-999; mouse.y=-999; });
  home.addEventListener('touchmove',e=>{
    e.preventDefault();
    const r=canvas.getBoundingClientRect();
    mouse.x=e.touches[0].clientX-r.left; mouse.y=e.touches[0].clientY-r.top;
  },{passive:false});
  home.addEventListener('touchend',()=>{ mouse.x=-999; mouse.y=-999; });

  function loop() {
    if (!document.getElementById('page-home').classList.contains('active')) { requestAnimationFrame(loop); return; }
    frame++;
    if (window.innerWidth <= 768) { requestAnimationFrame(loop); return; }
    ctx.clearRect(0,0,W,H); ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
    drawBg();

    const isMobile = window.innerWidth <= 768;
    if (exploded) {
      targetAssembled=0; assembled=0;
    } else if (isMobile) {
      if (mouse.x !== -999) {
        // user is touching — manual assembly
        const dist = Math.hypot(mouse.x-W/2, mouse.y-H/2);
        targetAssembled = Math.max(0, 1-dist/(Math.min(W,H)*0.5));
      } else {
        // auto-assemble: wait until all pieces are fully intro'd, then ramp
        if (mobileAssemblyStartFrame < 0 && pieces.length > 0 &&
            pieces.every(p => p.introProgress >= 1)) {
          mobileAssemblyStartFrame = frame + 60;
        }
        if (mobileAssemblyStartFrame > 0 && frame >= mobileAssemblyStartFrame) {
          targetAssembled = Math.min(1, (frame - mobileAssemblyStartFrame) / 120);
        }
      }
      assembled += (targetAssembled - assembled) * 0.06;
    } else {
      if (mouse.x!==-999) {
        const dist=Math.hypot(mouse.x-W/2,mouse.y-H/2);
        targetAssembled=Math.max(0,1-dist/(Math.min(W,H)*0.65));
      } else { targetAssembled=0; }
      assembled+=(targetAssembled-assembled)*0.06;
    }

    if (assembled>0.97 && !triggered && !exploded) fireShockwave();

    pieces.forEach(p=>{
      if (p.hidden) return;
      const a=assembled;
      // Fade in slowly — no sliding from outside
      if(frame>p.introDelay) p.introProgress=Math.min(1,p.introProgress+0.003);
      const intro=easeOutCubic(p.introProgress);

      // Gentle independent float on scatter position
      const floatY = Math.sin(frame * p.floatSpeed * Math.PI * 2 + p.floatPhase) * p.floatAmp;
      const floatX = Math.cos(frame * p.floatSpeed * Math.PI * 2 * 0.7 + p.floatPhase) * p.floatAmp * 0.4;
      const floatRot = Math.sin(frame * p.floatSpeed * Math.PI * 2 * 0.5 + p.floatPhase) * 0.06;

      // Scatter pos with float, then lerp toward assembled target
      const scatterX = p.sx + floatX * (1 - a);
      const scatterY = p.sy + floatY * (1 - a);
      const cx = scatterX + (p.tx - p.sx) * a;
      const cy = scatterY + (p.ty - p.sy) * a;
      const rot = (p.srot + floatRot) * (1 - a);
      const alpha = (p.baseAlpha + a * 0.32) * intro;

      const near=mouse.x!==-999&&isMouseNearPiece(mouse.x,mouse.y,cx,cy,p.w,p.h);
      if(near){p.glitch=Math.min(1,p.glitch+0.12);}else{p.glitch=Math.max(0,p.glitch-0.04);}
      if(p.glitch>0.1&&Math.random()<0.04) p.glitch=Math.min(1,p.glitch+0.4);
      drawPieceGlitch(cx,cy,p.w,p.h,p.tabs,rot,alpha,p.glitch);
    });

    if(assembled>0.85){
      const t=(assembled-0.85)/0.15, cx=W/2, cy=H/2, pw=pieces[0]?pieces[0].w:100;
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,pw*1.5);
      g.addColorStop(0,`rgba(255,255,255,${(t*0.12).toFixed(3)})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    }

    if(waves.length>0) drawWaves();
    if(exploded) { updateMiniPieces(); drawMiniPieces(); }
    requestAnimationFrame(loop);
  }

  resize(); window.addEventListener('resize',resize); loop();
  // Reset intro when returning to home
  document.getElementById('page-home')._resetPuzzle = function() {
    assembled=0; targetAssembled=0; triggered=false;
    miniPieces=[]; exploded=false; mobileAssemblyStartFrame=-1;
    pieces.forEach(p=>{ p.introProgress=0; p.introDelay=9999; p.hidden=false; p.glitch=0; });
    const btn = document.getElementById('explode-cta');
    if (btn) btn.classList.remove('visible');
    const lbl = document.getElementById('centerLabel');
    if (lbl) { lbl.classList.remove('visible'); lbl.textContent = ''; }
    const wrap = document.querySelector('.home-headline-wrap');
    if (wrap) wrap.classList.remove('fade-out');
  };

  document.getElementById('page-home')._syncPuzzleIntro = function() {
    mobileAssemblyStartFrame = -1;
    pieces[0].introProgress=0; pieces[0].introDelay = frame;
    pieces[1].introProgress=0; pieces[1].introDelay = frame + 30;
    pieces[2].introProgress=0; pieces[2].introDelay = frame + 55;
    pieces[3].introProgress=0; pieces[3].introDelay = frame + 80;
  };
})();


/* ── WORK ── */
const projects = [
  { title: 'Feelit',               desc: '',                                          year: '',     img: '' },
  { title: 'Rawr',                 desc: '',                                          year: '',     img: '' },
  { title: 'Quackables',           desc: 'brand identity & product design',           year: '2024', img: 'images/quckables.png' },
  { title: 'Still in exploration', desc: '',                                          year: '',     img: '' },
  { title: 'Still in exploration', desc: '',                                          year: '',     img: '' }
];
const puzzlePaths = [
  `M 30,30 L 510,30 L 510,195 A 46,46 0 0 1 510,287 L 510,450 L 240,450 A 46,46 0 0 0 148,450 L 30,450 Z`,
  `M 30,30 L 236,30 A 46,46 0 0 0 328,30 L 500,30 L 500,200 A 46,46 0 0 1 500,292 L 500,460 L 30,460 Z`,
  `M 30,50 L 216,50 A 46,46 0 0 1 308,50 L 500,50 L 500,460 L 222,460 A 46,46 0 0 0 130,460 L 30,460 Z`,
  `M 50,30 L 500,30 L 500,214 A 46,46 0 0 0 500,306 L 500,460 L 50,460 L 50,260 A 46,46 0 0 1 50,168 L 50,30 Z`
];
const VW = 560, VH = 480;
const puzzleFloat = document.getElementById('workPuzzleFloat');
const puzzleSvg   = document.getElementById('workPuzzleSvg');
const pList       = document.getElementById('projectList');
const NS2 = 'http://www.w3.org/2000/svg';

const svgLayers = projects.map((p, i) => {
  const d = puzzlePaths[i % puzzlePaths.length];
  const cid = `wcp${i}`, spId = `wsp${i}`;
  const g = document.createElementNS(NS2, 'g');
  g.style.display = 'none';
  const defs = document.createElementNS(NS2, 'defs');
  const cp = document.createElementNS(NS2, 'clipPath'); cp.setAttribute('id', cid);
  const cpP = document.createElementNS(NS2, 'path'); cpP.setAttribute('d', d);
  cp.appendChild(cpP); defs.appendChild(cp);
  const spG = document.createElementNS(NS2, 'linearGradient');
  spG.setAttribute('id', spId); spG.setAttribute('x1','0%'); spG.setAttribute('y1','0%');
  spG.setAttribute('x2','55%'); spG.setAttribute('y2','55%');
  ['0%','100%'].forEach((off, k) => {
    const s = document.createElementNS(NS2, 'stop');
    s.setAttribute('offset', off);
    s.setAttribute('stop-color', k===0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0)');
    spG.appendChild(s);
  });
  defs.appendChild(spG); g.appendChild(defs);
  const bg = document.createElementNS(NS2, 'path'); bg.setAttribute('d', d); bg.setAttribute('fill', '#111'); g.appendChild(bg);
  if (p.img) {
    const im = document.createElementNS(NS2, 'image');
    im.setAttribute('href', p.img); im.setAttribute('x','0'); im.setAttribute('y','0');
    im.setAttribute('width', String(VW)); im.setAttribute('height', String(VH));
    im.setAttribute('preserveAspectRatio','xMidYMid slice'); im.setAttribute('clip-path', `url(#${cid})`);
    g.appendChild(im);
  }
  const ov = document.createElementNS(NS2, 'path'); ov.setAttribute('d', d); ov.setAttribute('fill','rgba(0,0,0,0.15)'); g.appendChild(ov);
  const sp = document.createElementNS(NS2, 'path'); sp.setAttribute('d', d); sp.setAttribute('fill', `url(#${spId})`); g.appendChild(sp);
  const edge = document.createElementNS(NS2, 'path'); edge.setAttribute('d', d); edge.setAttribute('fill','none');
  edge.setAttribute('stroke','rgba(255,255,255,0.12)'); edge.setAttribute('stroke-width','1.5'); g.appendChild(edge);
  puzzleSvg.appendChild(g);
  return g;
});

projects.forEach((p, i) => {
  const a = document.createElement('a');
  a.className = 'project-item'; a.href = '#'; a.dataset.idx = i;
  a.innerHTML = `<span class="project-num">0${i+1}</span><span class="project-title">${p.title}</span><span class="project-year">${p.year}</span>`;
  a.addEventListener('mouseenter', () => showP(i, a));
  a.addEventListener('mouseleave', hideP);
  a.addEventListener('click', e => e.preventDefault());
  pList.appendChild(a);
});

let curP = -1, hideTimer2 = null;

function positionPuzzle(rowEl) {
  const pageEl   = document.getElementById('page-work');
  const pageRect = pageEl.getBoundingClientRect();
  const rowRect  = rowEl.getBoundingClientRect();
  const pw = puzzleFloat.offsetWidth  || 300;
  const ph = puzzleFloat.offsetHeight || 260;
  const rightX  = pageRect.width - pw - pageRect.width * 0.04;
  const centreY = rowRect.top - pageRect.top + rowRect.height / 2 - ph / 2;
  const clampY  = Math.max(8, Math.min(pageRect.height - ph - 8, centreY));
  puzzleFloat.style.left = rightX + 'px';
  puzzleFloat.style.top  = clampY + 'px';
}

function showP(i, rowEl) {
  if (curP === i) return;
  svgLayers.forEach(g => { g.style.display = 'none'; });
  svgLayers[i].style.display = '';
  pList.querySelectorAll('.project-item').forEach(s => s.classList.remove('active'));
  pList.querySelector(`[data-idx="${i}"]`).classList.add('active');
  positionPuzzle(rowEl);
  puzzleFloat.classList.add('visible');
  document.getElementById('statusDesc').textContent = projects[i].desc;
  document.getElementById('statusYear').textContent = projects[i].year ? '/' + projects[i].year : '';
  curP = i;
}

function hideP() {
  clearTimeout(hideTimer2);
  hideTimer2 = setTimeout(() => {
    if (!pList.querySelector('.project-item:hover')) {
      puzzleFloat.classList.remove('visible');
      svgLayers.forEach(g => { g.style.display = 'none'; });
      pList.querySelectorAll('.project-item').forEach(s => s.classList.remove('active'));
      document.getElementById('statusDesc').textContent = '';
      document.getElementById('statusYear').textContent = '';
      curP = -1;
    }
  }, 80);
}

/* ── WORK PUZZLE 3D TILT ── */
(function() {
  const page  = document.getElementById('page-work');
  const float = document.getElementById('workPuzzleFloat');
  if (!page || !float) return;

  let tiltX = 0, tiltY = 0, tx = 0, ty = 0;

  page.addEventListener('mousemove', e => {
    const r = page.getBoundingClientRect();
    // Normalise mouse to -1..1 relative to page centre
    tx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    ty = ((e.clientY - r.top)  / r.height - 0.5) * 2;
  });
  page.addEventListener('mouseleave', () => { tx = 0; ty = 0; });

  function loop() {
    // Smooth lerp toward target
    tiltX += (tx - tiltX) * 0.08;
    tiltY += (ty - tiltY) * 0.08;

    if (float.classList.contains('visible')) {
      const rotY =  tiltX * 14;   // left-right tilt
      const rotX = -tiltY *  9;   // up-down tilt
      float.style.transform = `scale(1) translateY(0) perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }
    requestAnimationFrame(loop);
  }
  loop();
})();










/* ── ABOUT GLITCH PHOTO ── */
(function() {
  const canvas = document.getElementById('about-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  let W = 0, H = 0, imgLoaded = false;
  let mouse = { x: -1, y: -1, over: false };
  let glitch = 0, targetGlitch = 0;
  let af = 0, running = false;

  img.onload = () => { imgLoaded = true; };
  img.src = 'images/profile.png';

  function resize() {
    const p = canvas.parentElement;
    if (!p) return;
    W = canvas.width  = p.offsetWidth  || p.getBoundingClientRect().width;
    H = canvas.height = p.offsetHeight || p.getBoundingClientRect().height;
  }

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.over = true;
    revealed = true;
  });
  canvas.addEventListener('mouseleave', () => { mouse.over = false; });
  canvas.addEventListener('click', () => { glitch = Math.min(1, glitch + 0.6); });

  function draw() {
    af++;
    if (W === 0 || H === 0) resize();
    if (!imgLoaded || W === 0) { requestAnimationFrame(draw); return; }

    targetGlitch = mouse.over ? 0.6 + Math.sin(af * 0.05) * 0.3 : 0;
    glitch += (targetGlitch - glitch) * 0.07;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    const iR = img.naturalWidth / img.naturalHeight, cR = W / H;
    let dw, dh, dx, dy;
    if (iR > cR) { dh = H; dw = dh * iR; dx = (W - dw) / 2; dy = 0; }
    else          { dw = W; dh = dw / iR; dx = 0; dy = (H - dh) / 2; }

    ctx.drawImage(img, dx, dy, dw, dh);

    if (glitch > 0.02) {
      const sh = glitch * 14;
      const pairs = [
        { dx: -sh, dy: 0,      r:255, g:0,   b:0,   a: glitch*0.55 },
        { dx:  sh, dy: 0,      r:0,   g:255, b:80,  a: glitch*0.45 },
        { dx: 0,   dy: -sh*0.6,r:0,   g:80,  b:255, a: glitch*0.45 },
        { dx: sh*0.5, dy: sh*0.5, r:255,g:220,b:0,  a: glitch*0.35 },
      ];
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      pairs.forEach(o => {
        ctx.globalAlpha = o.a;
        ctx.drawImage(img, dx + o.dx, dy + o.dy, dw, dh);
        ctx.fillStyle = 'rgba('+o.r+','+o.g+','+o.b+','+(o.a*0.35).toFixed(3)+')';
        ctx.fillRect(0, 0, W, H);
      });
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.restore();

      for (let t = 0; t < Math.floor(glitch * 8); t++) {
        const ty = Math.random()*H, th = 1+Math.random()*4, ts = (Math.random()-0.5)*glitch*30;
        try { const s = ctx.getImageData(0, Math.max(0,ty), W, Math.max(1,th)); ctx.putImageData(s, ts, ty); } catch(e) {}
      }
      if (glitch > 0.3 && Math.random() < glitch*0.5) {
        const bx=Math.random()*W*0.8,by=Math.random()*H*0.8,bw=20+Math.random()*W*0.25,bh=4+Math.random()*20;
        try { const b=ctx.getImageData(bx,by,bw,bh); ctx.putImageData(b,bx+(Math.random()-0.5)*glitch*40,by); } catch(e){}
      }
      if (Math.random() < glitch*0.15) {
        const c=['rgba(255,0,60,','rgba(0,255,100,','rgba(0,60,255,'];
        ctx.fillStyle = c[Math.floor(Math.random()*c.length)]+(glitch*0.08).toFixed(3)+')';
        ctx.fillRect(0,0,W,H);
      }
      ctx.globalAlpha = glitch*0.12;
      for (let y=0; y<H; y+=3) { ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,y,W,1); }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    draw();
  }

  // Start when about page becomes visible
  new MutationObserver(() => {
    if (document.getElementById('page-about').classList.contains('active')) {
      requestAnimationFrame(start);
    }
  }).observe(document.getElementById('page-about'), { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', () => {
    if (document.getElementById('page-about').classList.contains('active')) resize();
  });

  // Also try starting if page is already active on load
  if (document.getElementById('page-about').classList.contains('active')) {
    requestAnimationFrame(start);
  }
})();

/* ── CURSOR ── */
const dot = document.getElementById('cursor');
document.addEventListener('mousemove', e => {
  dot.style.transform = `translate3d(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%), 0)`;
}, { passive: true });
