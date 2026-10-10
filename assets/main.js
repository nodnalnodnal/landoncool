(()=>{
/* ---------- edit me ---------- */
const CHANGES=[
  ['10/07/2026','web ','cowsweeper, soundboard, achievements, a cow you feed'],
  ['10/07/2026','web ','moo-ssistant. hes here to help. kind of'],
  ['10/07/2026','web ','cow navigator 2.0: the whole site is a desktop now'],
  ['10/07/2026','web ','skin lab: make any minecraft skin blink'],
  ['10/07/2026','web ','7 themes, crt mode, a start menu that works'],
  ['earlier   ','game','pacman moved in'],
];
// custom terminal commands. a string gets printed, a function gets (args) and returns text to print.
const COMMANDS={
  whoami:'landon. mrcowlord in game.',
  hello:'hi.',
  cow:'   ^__^\n   (oo)\\_______\n   (__)\\       )\\/\\\n       ||----w |\n       ||     ||',
  roll:a=>'you rolled a '+(1+Math.random()*(+a[0]||6)|0),
};
const RING=['/','/pacman/','/aerobics'];
const SKIN_DEFAULT='mrcowlord';
/* ----------------------------- */

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const emit=(n,d)=>dispatchEvent(new CustomEvent('lc:'+n,{detail:d}));
const store={get(k,d){try{const v=localStorage.getItem('lc_'+k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('lc_'+k,JSON.stringify(v))}catch(e){}}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const root=document.documentElement;
const stats=store.get('stats',{visits:0,views:0,toggles:0,moos:0,blinks:0,flips:0});
stats.visits++;stats.views++;
let flakes=[],trail=[],rain=[],fxRun=false;
const bump=k=>{stats[k]=(stats[k]||0)+1;renderStats()};
setInterval(()=>store.set('stats',stats),2000);
addEventListener('pagehide',()=>store.set('stats',stats));

/* ---------- pixel icons ---------- */
const P={
cow:["....#....#....................","...#o#..#o#...................","...#o##.#o#...................",".###ooo#####..................","#oooooo###oo###########.......",".##oo#ooooooooooooooooo#####..","..#oooooooooo###ooooooo###oo#.","..#oooooooooo###oooo##ooooo#o#",".#ooooooooooo###ooo####oooo#o#",".#pppppooooooo#oooo####oooo#o#",".#p#p#po##ooooooooo####oooo#o#","..#ppp##.#ooooooo##oooooooo#o#","...###....#ooooooooooooooo#.##","..........#oo#oo##pp#oo#oo#.#.","..........#oo#oo#.###oo#oo#...","..........#oo#oo#...#oo#oo#...","..........#oo#oo#...#oo#oo#...","...........##.##.....##.##...."],
cube:["....####....","..##....##..","##........##","#.##....##.#","#...####...#","#.....#....#","#.....#....#","#.....#....#","##....#...##","..##..#.##..","....###....."],
img:["############","#..........#","#.##.......#","#.##.......#","#.......#..#","#......###.#","#..#..######","#.##########","############"],
txt:["########....","#......##...","#.####.#.#..","#......####.","#.#######.#.","#.........#.","#.######..#.","#.........#.","#.#####...#.","#.........#.","###########."],
bin:["....####....","############","............",".##########.",".#.#.##.#.#.",".#.#.##.#.#.",".#.#.##.#.#.",".#.#.##.#.#.",".#.#.##.#.#.",".##########.","..########.."],
star:[".....##.....",".....##.....","....####....","############",".##########.","...######...","...######...","..###..###..",".##......##.","#..........#"],
gear:[".....##.....","..#.####.#..",".##########.","..###..###..","####....####","####....####","..###..###..",".##########.","..#.####.#..",".....##....."],
chat:["############","#..........#","#.########.#","#..........#","#.######...#","#..........#","############","..##........",".#.........."],
globe:["...######...",".##.#..#.##.","#..#....#..#","############","#..#....#..#","############","#..#....#..#",".##.#..#.##.","...######..."],
pac:["...######...",".##########.","############","#########...","#######.....","#####.......","#######.....","#########...","############",".##########.","...######..."],
bird:["....####....","..##...#.#..",".#.....#..#.","####...#..#.","#...#..#####","#...#.#....#",".###.#.####.",".#....#....#","..##...####.","....####...."],
ring:["....####....","..##....##..",".#........#.","#..........#","#..........#","#..........#","#..........#",".#........#.","..##....##..","....####...."],
mirror:["#######.....","#.....#.....","#..########.","#..#......#.","####......#.","...#......#.","...#......#.","...########."],
folder:["####........","#...######..","############","#..........#","#..........#","#..........#","#..........#","############"],
grid:["############","#.##.#..#..#","############","#..#.##.#..#","############","#.#..#.##..#","############"],
power:[".....##.....","..#..##..#..",".##..##..##.","##...##...##","##........##","##........##",".##......##.","..########..","....####...."],
palette:["...######...",".##......##.","#..##..#...#","#..##......#","#........###","#.##....#...","#.##....#...",".#......###.","..########.."],
eye:["............","...######...",".##......##.","#...####...#","#..######..#","#...####...#",".##......##.","...######..."],
note:["......######","......##..##","......#....#","......#....#","......#....#","...####..###","..#####.####","..####..###."],
home:[".....##.....","...######...",".##########.","############",".#........#.",".#.##..##.#.",".#.##..##.#.",".#....##..#.",".#....##..#.",".##########."],
wmin:["........","........","........","........","........","........","######..","######.."],
wmax:["########","########","#......#","#......#","#......#","#......#","########"],
mine:[".....#.....","..#..#..#..","...#####...","..##.####..","..#.#####..","###########","..#######..","..#######..","...#####...","..#..#..#..",".....#....."],
cd:["...######...",".##......##.","#....##....#","#...#..#...#","#..#.##.#..#","#..#.##.#..#","#...#..#...#","#....##....#",".##......##.","...######..."],
trophy:["############","#.########.#","#.########.#",".#.######.#.","..########..","...######...",".....##.....",".....##.....","...######...","..########.."],
flag:["..##....","..####..","..######","..####..","..##....","..#.....","..#.....","######.."],
wx:["##....##",".##..##.","..####..","...##...","..####..",".##..##.","##....##"]
};
const COWPAL={'#':'#141414','o':'#ffffff','p':'#f2a7b8'};
function pixSvg(name){const rows=P[name]||P.star;const w=Math.max(...rows.map(r=>r.length)),h=rows.length;let d='',d2='',d3='';
  rows.forEach((r,y)=>{for(let x=0;x<r.length;x++){const q=`M${x} ${y}h1v1h-1z`;if(r[x]==='#')d+=q;else if(r[x]==='o')d2+=q;else if(r[x]==='p')d3+=q}});
  return {w,h,d,d2,d3}}
function paint(svg,name){const {w,h,d,d2,d3}=pixSvg(name);svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.innerHTML=(d2||d3)?`<path d="${d2}" fill="${COWPAL.o}"/><path d="${d3}" fill="${COWPAL.p}"/><path d="${d}" fill="${COWPAL['#']}"/>`:`<path d="${d}" fill="currentColor"/>`}
function drawCow(x,x0,y0,s,flip){const rows=P.cow,w=rows[0].length;rows.forEach((r,yy)=>{for(let xx=0;xx<r.length;xx++){const c=COWPAL[r[xx]];if(!c)continue;x.fillStyle=c;x.fillRect(x0+(flip?w-1-xx:xx)*s,y0+yy*s,s,s)}})}
$$('svg[data-pic]').forEach(s=>paint(s,s.dataset.pic));
$$('.dicon').forEach(b=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','pix');const big=b.dataset.ic==='cow';s.setAttribute('width',big?44:30);s.setAttribute('height',30);paint(s,b.dataset.ic);b.querySelector('i').replaceWith(s)});
(()=>{const {w,h,d,d2,d3}=pixSvg('cow');const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${(h-w)/2} ${w} ${w}" shape-rendering="crispEdges"><path d="${d2}" fill="#fff"/><path d="${d3}" fill="#f2a7b8"/><path d="${d}" fill="#141414"/></svg>`;$('#favicon').href='data:image/svg+xml,'+encodeURIComponent(svg)})();

/* ---------- sound ---------- */
let AC;const ac=()=>AC||(AC=new (window.AudioContext||window.webkitAudioContext)());
function vol(){return (mods.sound.val||5)/10}
function beep(f=880,d=.04,type='square',v=.05){if(!mods.sound.on)return;if(window.SFX){SFX.blip(f,d);return}try{const a=ac(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v*vol(),a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+d);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+d+.02)}catch(e){}}
/* real sound files live in assets/sfx */
const SFX_FILES=['click','hover','type','open','close','min','ding','error','notify','on','off','pop','glitch','startup','shutdown','achieve','win','lose','coin','coin2','boom','laser','teleport','bonk','punch','door','dice','book','moo1','moo2','moo3','pig','hen','rooster','sheep','goat','horse','duck','dog','donkey','bear'];
const SBUF={},SLOAD={};
function loadS(n){if(SBUF[n])return Promise.resolve(SBUF[n]);if(SLOAD[n])return SLOAD[n];const a=ac();
  SLOAD[n]=fetch('assets/sfx/'+n+'.mp3').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(b=>new Promise((res,rej)=>a.decodeAudioData(b,res,rej))).then(b=>SBUF[n]=b).catch(()=>{delete SLOAD[n]});return SLOAD[n]}
function preloadS(){SFX_FILES.forEach(loadS)}
function play(n,o={}){try{const a=ac();if(a.state==='suspended')a.resume();const v=(o.vol??1)*vol()*1.5,b=SBUF[n];
  if(b){const s=a.createBufferSource(),g=a.createGain();s.buffer=b;s.playbackRate.value=o.rate||1;g.gain.value=v;s.connect(g).connect(a.destination);s.start(a.currentTime+(o.when||0));return s}
  loadS(n);const el=new Audio('assets/sfx/'+n+'.mp3');el.volume=Math.min(1,v);if(o.rate){el.preservesPitch=false;el.playbackRate=o.rate}setTimeout(()=>el.play().catch(()=>{}),(o.when||0)*1000);return el}catch(e){return null}}
function moo(force){if(!force&&!mods.sound.on)return;const r=Math.random(),n=r<.12?'moo3':r<.55?'moo2':'moo1';play(n,{vol:.9,rate:.93+Math.random()*.14});bump('moos');emit('moo',stats.moos)}

/* ---------- themes ---------- */
const THEMES=['noir','paper','terminal','amber','moo','fog','blueprint'];
let C={};
function readColors(){const cs=getComputedStyle(root);['ink','page','mute','face','line','sel'].forEach(k=>C[k]=cs.getPropertyValue('--'+k).trim())}
function setTheme(t,quiet){if(!THEMES.includes(t))t='noir';root.dataset.theme=t;store.set('theme',t);readColors();
  $('#themeName').textContent=t;$('#themeName2').textContent=t;$$('.swatch').forEach(s=>s.setAttribute('aria-pressed',s.dataset.t===t));
  $('meta[name=theme-color]').content=C.page;if(!quiet){beep(1200,.05);emit('theme',t)}}
const sw=$('#swatches');
THEMES.forEach(t=>{const b=document.createElement('button');b.className='swatch';b.dataset.t=t;b.title=t;b.setAttribute('aria-label','theme '+t);
  const tmp=document.createElement('div');tmp.dataset.theme=t;sw.append(b);b.addEventListener('click',()=>setTheme(t));});
// swatch colors: render each swatch as split page/ink
const swC={noir:['#0a0a0a','#efefef'],paper:['#fbfbf7','#111'],terminal:['#000','#3dff6e'],amber:['#050300','#ffb31a'],moo:['#fff','#0d0d0d'],fog:['#e5e7ea','#3b3f45'],blueprint:['#0a2566','#e8eeff']};
$$('.swatch').forEach(s=>{const [a,b]=swC[s.dataset.t];s.style.background=`linear-gradient(135deg,${a} 50%,${b} 50%)`;s.style.color=s.dataset.t==='moo'||s.dataset.t==='paper'||s.dataset.t==='fog'?'#000':'#fff'});
const nextTheme=()=>setTheme(THEMES[(THEMES.indexOf(root.dataset.theme)+1)%THEMES.length]);
$('#bmTheme').onclick=nextTheme;$('#smTheme').onclick=()=>{nextTheme()};
setTheme(store.get('theme','noir'),true);

/* ---------- modules ---------- */
const xmas=[10,11].includes(new Date().getMonth());
const MODS=[
 {id:'crt',tab:'visual',name:'crt',desc:'scanlines, a vignette and a bit of flicker. like a monitor from 2004.',set:['strength',1,10,6]},
 {id:'grain',tab:'visual',name:'film grain',desc:'noise over everything. very artsy.',set:['amount',1,10,4]},
 {id:'invert',tab:'visual',name:'invert',desc:'flips every color on the page. black is white now.'},
 {id:'pcur',tab:'visual',name:'custom cursor',desc:'the chunky pixel arrow and hand. turn it off if you miss your normal mouse.',def:true},
 {id:'snow',tab:'fun',name:'snow',desc:'the jolly christmas background, early access. turns itself on in november.',set:['flakes',20,300,120],def:xmas},
 {id:'trail',tab:'fun',name:'sparkle trail',desc:'your mouse leaves sparkles everywhere. very 2003.',set:['length',4,40,18],def:true},
 {id:'ctext',tab:'fun',name:'cursor text',desc:'the letters of landon.cool follow your mouse around.'},
 {id:'popups',tab:'fun',name:'popup ads',desc:'congratulations!! you are the 1,000,000th visitor. turn this off if you hate fun.',def:true},
 {id:'matrix',tab:'fun',name:'matrix',desc:'code rain falls behind the windows, in whatever color your theme is.',set:['speed',1,10,5]},
 {id:'gravity',tab:'fun',name:'gravity',desc:'desktop icons fall down. turn it off and they float back up.'},
 {id:'roll',tab:'fun',name:'barrel roll',desc:'spins the whole browser window once, then turns itself back off.'},
 {id:'mooclick',tab:'fun',name:'moo on click',desc:'every click goes moo. needs sound on.'},
 {id:'clippy',tab:'fun',name:'moo-ssistant',desc:'a cow that pops up with tips. some of them are even helpful.',def:true},
 {id:'saver',tab:'visual',name:'screensaver',desc:'flying cows if you stop touching stuff for a minute and a half.',def:true},
 {id:'sound',tab:'audio',name:'sound effects',desc:'clicks, swooshes, dings. the full 2000s experience.',set:['volume',1,10,5],def:true},
 {id:'hover',tab:'audio',name:'hover ticks',desc:'tiny ticks when you mouse over stuff.',def:true},
];
const saved=store.get('mods',{});const binds=store.get('binds',{});
const mods={};MODS.forEach(m=>{const s=saved[m.id]||{};mods[m.id]={...m,on:m.id==='roll'?false:(s.on??!!m.def),val:s.val??(m.set?m.set[3]:0),open:false}});
if(xmas&&saved.snow===undefined)mods.snow.on=true;
const saveMods=()=>{const o={};for(const k in mods)o[k]={on:mods[k].on,val:mods[k].val};store.set('mods',o)};

function apply(id){const m=mods[id];
  switch(id){
   case 'crt':root.classList.toggle('crt',m.on);root.style.setProperty('--crt',(m.val/10).toFixed(2));$('#bmCrt').textContent='crt: '+(m.on?'on':'off');$('#trCrt').setAttribute('aria-pressed',m.on);break;
   case 'grain':root.classList.toggle('grain',m.on);root.style.setProperty('--grain',(m.val*.03).toFixed(2));break;
   case 'invert':root.classList.toggle('invert',m.on);break;
   case 'pcur':root.classList.toggle('pcur',m.on);break;
   case 'sound':$('#bmSnd').textContent='sound: '+(m.on?'on':'off');$('#trSnd').setAttribute('aria-pressed',m.on);break;
   case 'gravity':gravity(m.on);break;
   case 'roll':if(m.on){const w=$('#w-nav');w.classList.remove('roll');void w.offsetWidth;w.classList.add('roll');setTimeout(()=>{w.classList.remove('roll');m.on=false;renderMods();saveMods()},1150)}break;
  }
  fxKick();emit('mod',id);
}
function toggle(id,force){const m=mods[id];m.on=force??!m.on;bump('toggles');beep(m.on?1320:660,.05);apply(id);saveMods();renderMods();status((m.on?'turned on ':'turned off ')+m.name);emit('toggle',id)}
let tab='all',query='',focusIdx=0;
function renderMods(){const list=$('#mlist');const keep=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#mlist');
  const vis=MODS.filter(m=>(tab==='all'||m.tab===tab)&&m.name.includes(query));
  list.innerHTML='';
  if(!vis.length){list.innerHTML='<div class="mod" style="cursor:default"><span class="nm">no modules match. backspace to clear.</span></div>'}
  vis.forEach((d,i)=>{const m=mods[d.id];const row=document.createElement('div');row.className='mod';row.tabIndex=-1;row.dataset.id=d.id;row.setAttribute('role','switch');row.setAttribute('aria-checked',m.on);
    const bk=Object.keys(binds).find(k=>binds[k]===d.id);
    row.innerHTML=`<span class="led"></span><span class="nm">${d.name}</span><span class="eq"><i></i><i></i><i></i></span><span class="bind">${bindWait===d.id?'[...]':bk?'['+bk+']':''}</span>`;
    list.append(row);
    if(m.open&&d.set){const s=document.createElement('div');s.className='mset';s.innerHTML=`<span>${d.set[0]}</span><input type="range" min="${d.set[1]}" max="${d.set[2]}" value="${m.val}" aria-label="${d.name} ${d.set[0]}"><b>${m.val}</b>`;
      const r=s.querySelector('input');r.oninput=()=>{m.val=+r.value;s.querySelector('b').textContent=m.val;apply(d.id);saveMods()};list.append(s)}
  });
  const rows=$$('.mod[data-id]',list);focusIdx=Math.min(focusIdx,rows.length-1);if(keep&&rows[focusIdx])rows[focusIdx].focus();
  $('#mq').textContent=query;$('#mqh').style.display=query?'none':'';
}
let typer;function shell(t){const el=$('#shtxt');clearInterval(typer);el.textContent='';if(reduce){el.textContent=t;return}let i=0;typer=setInterval(()=>{el.textContent=t.slice(0,++i);if(i>=t.length)clearInterval(typer)},14)}
let bindWait=null;
const ml=$('#mlist');
ml.addEventListener('click',e=>{const r=e.target.closest('.mod[data-id]');if(r)toggle(r.dataset.id)});
ml.addEventListener('contextmenu',e=>{const r=e.target.closest('.mod[data-id]');if(!r)return;e.preventDefault();const m=mods[r.dataset.id];if(!m.set){shell('no settings for '+m.name+'. it just works.');return}m.open=!m.open;beep(990,.03);renderMods()});
ml.addEventListener('auxclick',e=>{const r=e.target.closest('.mod[data-id]');if(!r||e.button!==1)return;e.preventDefault();bindWait=r.dataset.id;shell('press a key to bind '+mods[bindWait].name+'. escape to unbind.');renderMods()});
ml.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault()});
ml.addEventListener('mouseover',e=>{const r=e.target.closest('.mod[data-id]');if(r&&r.dataset.id!==ml._hov){ml._hov=r.dataset.id;shell(mods[r.dataset.id].desc)}});
ml.addEventListener('focusin',e=>{const r=e.target.closest('.mod[data-id]');if(r)shell(mods[r.dataset.id].desc)});
$('#mbox').addEventListener('keydown',e=>{
  if(bindWait)return;
  const rows=$$('.mod[data-id]',ml);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();focusIdx=(focusIdx+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;rows[focusIdx]&&rows[focusIdx].focus();return}
  const r=document.activeElement.closest&&document.activeElement.closest('.mod[data-id]');
  if((e.key==='Enter'||e.key===' ')&&r){e.preventDefault();toggle(r.dataset.id);return}
  if(e.key==='ArrowRight'&&r){const m=mods[r.dataset.id];if(m.set){m.open=!m.open;renderMods()}return}
  if(e.target.matches('input'))return;
  if(e.key==='Backspace'){query=query.slice(0,-1);renderMods();e.preventDefault();return}
  if(e.key==='Escape'){query='';renderMods();return}
  if(e.key.length===1&&/[a-z ]/i.test(e.key)&&!e.ctrlKey&&!e.metaKey){query+=e.key.toLowerCase();focusIdx=0;renderMods();e.preventDefault()}
});
$$('.mtab').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;$$('.mtab').forEach(x=>x.setAttribute('aria-selected',x===b));beep(1100,.03);renderMods()});
addEventListener('keydown',e=>{
  if(bindWait){e.preventDefault();if(e.key==='Escape'){for(const k in binds)if(binds[k]===bindWait)delete binds[k]}else if(e.key.length===1){const k=e.key.toLowerCase();for(const x in binds)if(binds[x]===bindWait)delete binds[x];binds[k]=bindWait;shell('bound '+mods[bindWait].name+' to '+k)}store.set('binds',binds);bindWait=null;renderMods();return}
  if(e.target.matches('input,textarea'))return;
  if(e.code==='ShiftRight'){$('#menu').scrollIntoView({behavior:reduce?'auto':'smooth'});setTimeout(()=>{const r=$('.mod[data-id]');r&&r.focus()},300);return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.target.closest&&e.target.closest('#mbox'))return;
  const id=binds[e.key.toLowerCase()];if(id)toggle(id);
});
MODS.forEach(m=>apply(m.id));renderMods();shell('hover a module to see what it does.');
$('#bmCrt').onclick=$('#trCrt').onclick=()=>toggle('crt');
$('#bmSnd').onclick=$('#trSnd').onclick=()=>toggle('sound');
$$('[data-tog]').forEach(b=>b.onclick=()=>{toggle(b.dataset.tog);closeStart()});

function gravity(on){const desk=$('#icons');$$('.dicon',desk).forEach((ic,i)=>{if(!on){ic.style.transform='';return}
  const bottom=desk.clientHeight-ic.offsetTop-ic.offsetHeight;const rot=(Math.random()*60-30).toFixed(0);ic.style.transitionDelay=(i*60)+'ms';ic.style.transform=`translateY(${bottom}px) rotate(${rot}deg)`})}

/* ---------- fx layers ---------- */
const fx=$('#fx'),fctx=fx.getContext('2d'),bg=$('#bgfx'),bctx=bg.getContext('2d');
let W=0,H=0,DPR=1;
function sizeFx(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;[fx,bg].forEach(c=>{c.width=W*DPR;c.height=H*DPR;c.style.width=W+'px';c.style.height=H+'px'});fctx.setTransform(DPR,0,0,DPR,0,0);bctx.setTransform(DPR,0,0,DPR,0,0);rainInit()}
addEventListener('resize',sizeFx);
function rainInit(){rain=Array.from({length:Math.ceil(W/16)},()=>Math.random()*-H/16)}
addEventListener('pointermove',e=>{if(mods.trail.on){trail.push({x:e.clientX+(Math.random()*16-8),y:e.clientY+(Math.random()*16-8),s:1+Math.random()*3|0,ph:Math.random()*6});if(trail.length>mods.trail.val)trail.shift()}},{passive:true});
function fxKick(){if(reduce)return;if(!fxRun&&(mods.snow.on||mods.trail.on||mods.matrix.on)){fxRun=true;requestAnimationFrame(fxLoop)}}
let rainT=0;
function fxLoop(t){
  fctx.clearRect(0,0,W,H);
  if(mods.snow.on){const n=mods.snow.val;while(flakes.length<n)flakes.push({x:Math.random()*W,y:Math.random()*-H,s:1+Math.random()*3,v:.4+Math.random()*1.2,p:Math.random()*6});flakes.length=Math.min(flakes.length,n);
    fctx.fillStyle='#fff';fctx.strokeStyle='#000';for(const f of flakes){f.y+=f.v;f.x+=Math.sin(t/900+f.p)*.4;if(f.y>H){f.y=-5;f.x=Math.random()*W}const s=Math.round(f.s)*2;fctx.fillRect(f.x|0,f.y|0,s,s)}}
  else flakes.length=0;
  if(mods.trail.on&&trail.length){fctx.fillStyle=C.ink;trail.forEach((p,i)=>{const k=i/trail.length,s=Math.max(1,Math.round(p.s*(.5+k)*(1+Math.sin(t/80+p.ph)*.4)));p.y+=.6;fctx.globalAlpha=k;const X=p.x+10|0,Y=p.y+14|0;fctx.fillRect(X-s*2,Y,s*4+1,1);fctx.fillRect(X,Y-s*2,1,s*4+1);fctx.fillRect(X-s+1,Y-s+1,s*2-1,s*2-1)});fctx.globalAlpha=1;if(t%3<1)trail.shift()}
  else trail.length=0;
  if(mods.matrix.on){if(t-rainT>(110-mods.matrix.val*10)){rainT=t;bctx.fillStyle=C.page+'26';bctx.fillStyle=hexA(C.page,.15);bctx.fillRect(0,0,W,H);bctx.fillStyle=C.ink;bctx.font='16px VT323, monospace';
      rain.forEach((y,i)=>{bctx.fillText(String.fromCharCode(0x30A0+Math.random()*96|0),i*16,y*16);rain[i]=y*16>H&&Math.random()>.97?0:y+1})}}
  else bctx.clearRect(0,0,W,H);
  if(mods.snow.on||mods.trail.on||mods.matrix.on)requestAnimationFrame(fxLoop);else{fxRun=false;fctx.clearRect(0,0,W,H);bctx.clearRect(0,0,W,H)}
}
function hexA(c,a){if(c.startsWith('#')&&c.length===7){const n=parseInt(c.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`}return c}
addEventListener('click',()=>{if(mods.mooclick.on)moo()},true);

/* ---------- windows ---------- */
let z=20;
function focusWin(w){$$('.win').forEach(x=>x.classList.toggle('active',x===w));w.style.zIndex=++z;renderTasks()}
function openWin(id){const w=$('#'+id);if(!w)return;w.hidden=false;w.dataset.open='1';focusWin(w);if(id==='w-gb')renderGb();if(id==='w-moo')mooStart();emit('open',id)}
function closeWin(w){w.hidden=true;delete w.dataset.open;renderTasks();emit('close',w.id)}
function renderTasks(){const t=$('#tasks');t.innerHTML='';$$('.win').forEach(w=>{if(!w.dataset.open&&w.id!=='w-nav')return;if(w.id==='w-nav'&&w.dataset.closed)return;
  const b=document.createElement('button');b.className='btn';b.setAttribute('aria-pressed',w.classList.contains('active')&&!w.hidden);
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','pix');s.setAttribute('width',14);s.setAttribute('height',14);paint(s,w.dataset.ic);
  const sp=document.createElement('span');sp.textContent=w.dataset.title;b.append(s,sp);
  b.onclick=()=>{if(w.hidden){w.hidden=false;focusWin(w)}else if(w.classList.contains('active')){w.hidden=true;w.classList.remove('active');renderTasks()}else focusWin(w)};t.append(b)})}
function wireWin(w){
  w.addEventListener('pointerdown',()=>{if(!w.classList.contains('active'))focusWin(w)});
  const bar=$('.tbar',w);
  bar.addEventListener('pointerdown',e=>{if(e.target.closest('button')||innerWidth<=700||w.classList.contains('max'))return;const r=w.getBoundingClientRect();const ox=e.clientX-r.left,oy=e.clientY-r.top;
    w.dataset.moved='1';w.style.left=r.left+'px';w.style.top=r.top+'px';w.style.width=r.width+'px';w.style.height=r.height+'px';bar.setPointerCapture(e.pointerId);
    const mv=ev=>{w.style.left=Math.max(-r.width+80,Math.min(innerWidth-80,ev.clientX-ox))+'px';w.style.top=Math.max(0,Math.min(innerHeight-80,ev.clientY-oy))+'px'};
    const up=()=>{bar.removeEventListener('pointermove',mv);bar.removeEventListener('pointerup',up)};bar.addEventListener('pointermove',mv);bar.addEventListener('pointerup',up)});
  bar.addEventListener('dblclick',e=>{if(w.id==='w-nav'&&!e.target.closest('button'))w.classList.toggle('max')});
  $$('[data-act]',w).forEach(b=>b.onclick=()=>{const a=b.dataset.act;
    if(a==='close'){if(w.id==='w-nav'){w.hidden=true;w.dataset.closed='1';renderTasks()}else closeWin(w)}
    if(a==='min'){w.hidden=true;w.classList.remove('active');renderTasks();emit('min',w.id)}
    if(a==='max'){w.classList.toggle('max');['left','top','width','height'].forEach(p=>w.style[p]='')}});
}
$$('.win').forEach(wireWin);
document.addEventListener('click',e=>{
  const o=e.target.closest('[data-open]:not(.win)');if(o){e.preventDefault();if(o.dataset.open==='w-nav'){const n=$('#w-nav');delete n.dataset.closed;n.hidden=false;focusWin(n)}else openWin(o.dataset.open);closeStart()}
  const g=e.target.closest('[data-go]');if(g){e.preventDefault();const n=$('#w-nav');delete n.dataset.closed;n.hidden=false;focusWin(n);const t=$('#'+g.dataset.go);t&&t.scrollIntoView({behavior:reduce?'auto':'smooth'});closeStart()}
});
renderTasks();

/* ---------- navigator chrome ---------- */
function status(t){$('#stxt').textContent=t;clearTimeout(status._t);status._t=setTimeout(()=>$('#stxt').textContent='done',2200)}
function loading(){$('#spin').classList.add('go');status('opening page...')}
$$('a[href^="/"]').forEach(a=>a.addEventListener('click',()=>{loading();beep(880,.04)}));
$('#addr').onsubmit=e=>{e.preventDefault();let v=$('#addrIn').value.trim().replace(/^https?:\/\//,'');if(!v.startsWith('landon.cool')){v='landon.cool/'+v.replace(/^\/+/,'')}loading();location.href='https://'+v};
$$('.tab[href^="#"]').forEach(a=>a.addEventListener('click',()=>{$$('.tab').forEach(t=>t.classList.toggle('on',t===a))}));
const page=$('#page');
const secs=['skin','projects'];
page.addEventListener('scroll',()=>{let cur='top';secs.forEach(s=>{const el=$('#'+s);if(el.getBoundingClientRect().top<page.getBoundingClientRect().top+120)cur=s});
  $$('.tab[href^="#"]').forEach(t=>t.classList.toggle('on',t.getAttribute('href')==='#'+cur));$('#addrIn').value='http://landon.cool/'+(cur==='top'?'':'#'+cur)},{passive:true});

/* ---------- start menu + clock ---------- */
const sm=$('#smenu'),st=$('#start');
function closeStart(){sm.hidden=true;st.setAttribute('aria-pressed',false);st.setAttribute('aria-expanded',false)}
st.onclick=e=>{e.stopPropagation();const o=sm.hidden;sm.hidden=!o;st.setAttribute('aria-pressed',o);st.setAttribute('aria-expanded',o);beep(o?900:600,.04);if(o)sm.querySelector('button,a').focus()};
document.addEventListener('pointerdown',e=>{if(!sm.hidden&&!e.target.closest('#smenu,#start'))closeStart()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!sm.hidden){closeStart();st.focus()}});
$('#logoff').onclick=()=>{try{sessionStorage.removeItem('lc_booted')}catch(e){}location.reload()};
$('#shut').onclick=()=>{closeStart();$('#off').hidden=false;beep(330,.3,'triangle');emit('shut')};
$('#off').onclick=()=>{$('#off').hidden=true;beep(990,.08)};
function tick(){const d=new Date();$('#clock').textContent=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}).toLowerCase();cd(d)}
setInterval(tick,1000);

/* ---------- marquee ---------- */
$('#marq').textContent=['*** i did some updates :D','the whole site is a computer now','new: cowsweeper, a soundboard and a cow you have to feed','the skin lab makes your skin blink','theres achievements now. good luck getting all of them','the jolly christmas background comes back in november',`you are visitor number ${stats.visits}`,'make sure to come back to the site so i get money','sign the guestbook ***'].join(' *** ');

/* ---------- boot ---------- */
(()=>{let booted=false;try{booted=sessionStorage.getItem('lc_booted')}catch(e){}
  if(booted||reduce)return;try{sessionStorage.setItem('lc_booted','1')}catch(e){}
  const b=$('#boot');b.hidden=false;const lines=['landon.cool bios v2.0','copyright (c) 2026 cowlord industries','','cpu: one (1) debian box in a house ....... ok','memory: 640k. should be enough for anybody','checking hard drive ...................... ok','detecting cows ........................... 1 found','loading cow navigator 2.0','','click or press any key to skip'];
  let i=0;const iv=setInterval(()=>{b.textContent+=lines[i++]+'\n';if(i>=lines.length){clearInterval(iv);setTimeout(done,500)}},110);
  function done(){clearInterval(iv);if(b.hidden)return;b.classList.add('bye');setTimeout(()=>b.hidden=true,400);removeEventListener('keydown',done)}
  b.onclick=done;addEventListener('keydown',done)})();

/* ---------- hero title screen ---------- */
(()=>{const cv=$('#logo');if(!cv)return;const x=cv.getContext('2d');let W=0,H=0,dpr=1,t0=0,mx=-1,my=-1,over=false,lx=0,ly=0;
  // big logo font, 9 rows
  const B=['......','......','......'];
  const G={l:['##','##','##','##','##','##','##','##','##'],a:[...B,'.####.','....##','.#####','##..##','##..##','.#####'],n:[...B,'#####.','##..##','##..##','##..##','##..##','##..##'],
   d:['....##','....##','....##','.#####','##..##','##..##','##..##','##..##','.#####'],o:[...B,'.####.','##..##','##..##','##..##','##..##','.####.'],
   c:[...B,'.####.','##..##','##....','##....','##..##','.####.'],'.':['..','..','..','..','..','..','..','##','##']};
  // small 3x5 pixel font for the tagline and scroller
  const F={a:['.#.','#.#','###','#.#','#.#'],b:['##.','#.#','##.','#.#','##.'],c:['.##','#..','#..','#..','.##'],d:['##.','#.#','#.#','#.#','##.'],e:['###','#..','##.','#..','###'],
   f:['###','#..','##.','#..','#..'],g:['.##','#..','#.#','#.#','.##'],h:['#.#','#.#','###','#.#','#.#'],i:['###','.#.','.#.','.#.','###'],j:['..#','..#','..#','#.#','.#.'],
   k:['#.#','#.#','##.','#.#','#.#'],l:['#..','#..','#..','#..','###'],m:['#.#','###','###','#.#','#.#'],n:['##.','#.#','#.#','#.#','#.#'],o:['.#.','#.#','#.#','#.#','.#.'],
   p:['##.','#.#','##.','#..','#..'],q:['.#.','#.#','#.#','##.','.##'],r:['##.','#.#','##.','#.#','#.#'],s:['.##','#..','.#.','..#','##.'],t:['###','.#.','.#.','.#.','.#.'],
   u:['#.#','#.#','#.#','#.#','###'],v:['#.#','#.#','#.#','#.#','.#.'],w:['#.#','#.#','###','###','#.#'],x:['#.#','#.#','.#.','#.#','#.#'],y:['#.#','#.#','.#.','.#.','.#.'],
   z:['###','..#','.#.','#..','###'],0:['###','#.#','#.#','#.#','###'],1:['.#.','##.','.#.','.#.','###'],2:['##.','..#','.#.','#..','###'],3:['##.','..#','.#.','..#','##.'],
   4:['#.#','#.#','###','..#','..#'],5:['###','#..','##.','..#','##.'],6:['.##','#..','###','#.#','###'],7:['###','..#','.#.','.#.','.#.'],8:['###','#.#','###','#.#','###'],
   9:['###','#.#','###','..#','##.'],'.':['.','.','.','.','#'],',':['.','.','.','#','#'],'!':['#','#','#','.','#'],'?':['##.','..#','.#.','...','.#.'],"'":['#','#','.','.','.'],
   '(':['.#','#.','#.','#.','.#'],')':['#.','.#','.#','.#','#.'],'-':['...','...','###','...','...'],':':['.','#','.','#','.'],'/':['..#','..#','.#.','#..','#..'],
   '>':['#..','.#.','..#','.#.','#..'],'*':['#.#','.#.','#.#','...','...']};
  const fw=c=>c===' '?3:(F[c]?F[c][0].length:3)+1;
  const tw=(s,p)=>[...s].reduce((w,c)=>w+fw(c),0)*p;
  function txt(s,X,Y,p){for(const c of s){const g=F[c];if(g)g.forEach((r,yy)=>{for(let k=0;k<r.length;k++)if(r[k]==='#')x.fillRect(X+k*p,Y+yy*p,p,p)});X+=fw(c)*p}return X}
  const TAG='the best website in my house';
  const SCROLL='welcome to landon.cool ... feed the cow ... type help in the terminal ... theres a cheat code, the famous one ... sign the guestbook ... play cowsweeper ... make sure to come back so i get money ... moo ...      ';
  const TXT='landon.cool',EYES=[8,9];
  const glyphs=[];let col=0;[...TXT].forEach((c,i)=>{glyphs.push({c,x:col,w:G[c][0].length,i});col+=G[c][0].length+1});const COLS=col-1,ROWS=9;
  const cells=[];glyphs.forEach(g=>G[g.c].forEach((r,y)=>{for(let k=0;k<r.length;k++)if(r[k]==='#')cells.push({x:g.x+k,y,g:g.i,seed:Math.random()})}));
  const top=[];for(let c=0;c<COLS;c++)top[c]=ROWS;cells.forEach(p=>{top[p.x]=Math.min(top[p.x],p.y)});
  const gOf=[];glyphs.forEach(g=>{for(let k=-1;k<=g.w;k++)if(g.x+k>=0&&g.x+k<COLS&&gOf[g.x+k]==null)gOf[g.x+k]=g.i});
  let s=8,u=3;const stars=[],rings=[];
  const respawn=(st,z)=>{st.x=(Math.random()*2-1)*1.2;st.y=(Math.random()*2-1)*1.2;st.z=Math.max(.02,z)};
  for(let i=0;i<240;i++){const st={};respawn(st,Math.random());stars.push(st)}
  function size(){dpr=Math.min(devicePixelRatio||1,2);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);
    s=Math.max(3,Math.min(10,Math.floor(W*.8/COLS)));u=Math.max(1,Math.round(s*.36));lx=Math.round((W-COLS*s)/2);ly=Math.round(H*.36)}
  const bounce=t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375};
  const wave=(gx,now)=>reduce?0:Math.sin(now/450+gx*.22)*s*.22;
  const cow={x:2,dir:1,stop:0,say:0,frame:0};let blinkAt=0,blinkUntil=0,glints=[],last=performance.now();
  function surface(cx,now){const w=P.cow[0].length*u/s;let best=ROWS+9;for(let c=Math.floor(cx+w*.32);c<=Math.ceil(cx+w*.82);c++){if(c<0||c>=COLS)continue;best=Math.min(best,top[c]+wave(c,now)/s)}return best}
  const light=()=>{const m=/^#?([0-9a-f]{6})$/i.exec(C.page||'');if(!m)return false;const n=parseInt(m[1],16);return((n>>16)*.3+((n>>8)&255)*.59+(n&255)*.11)>140};
  let visible=true,running=false;
  function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;const age=reduce?99:(now-t0)/1000;x.clearRect(0,0,W,H);const ink=C.ink,mute=C.mute;
    // warp starfield
    const sp=(over?.35:.07)+(rings.length?.4:0),cx0=W/2+(over?(mx-W/2)*-.03:0),cy0=H/2+(over?(my-H/2)*-.03:0),fov=Math.max(W,H)*.5;
    x.fillStyle=ink;for(const st of stars){if(!reduce)st.z-=sp*dt;if(st.z<=.02){respawn(st,1);continue}const X=cx0+st.x/st.z*fov,Y=cy0+st.y/st.z*fov;
      if(X<-4||Y<-4||X>W+4||Y>H+4){respawn(st,1);continue}const dp=1-st.z;x.globalAlpha=.12+dp*.8;const z=dp>.85?2:1;x.fillRect(X|0,Y|0,z,z)}
    x.globalAlpha=1;
    // click shockwaves
    for(let i=rings.length-1;i>=0;i--){const r=rings[i],k=(now-r.t)/1100;if(k>=1){rings.splice(i,1);continue}const rad=(1-Math.pow(1-k,3))*Math.max(W,H)*.6,n=Math.max(24,rad*.8|0);
      x.globalAlpha=(1-k)*.7;for(let j=0;j<n;j++){const a=j/n*Math.PI*2;x.fillRect(r.x+Math.cos(a)*rad|0,r.y+Math.sin(a)*rad|0,1,1)}}
    x.globalAlpha=1;
    // logo drops in letter by letter, bounces, waves
    const depth=Math.max(2,Math.round(s*.5)),glitchOn=!reduce&&(age%3.3)<.16&&Math.floor(age/3.3)%2===1,gRow=Math.floor(age*37)%ROWS;let landed=true;
    const pos=cells.map(p=>{const k=Math.min(1,Math.max(0,(age-.2-(.6*p.x/COLS+p.seed*.12))/.55));if(k<1)landed=false;
      return [lx+p.x*s+(glitchOn&&p.y===gRow?s*5:0),ly+p.y*s-(1-bounce(k))*(ly+60)+wave(p.x,now),k,p]});
    x.fillStyle=mute;pos.forEach(([X,Y,k])=>{if(k<=0)return;for(let d=depth;d>0;d--){x.globalAlpha=.35+.5*(depth-d)/depth;x.fillRect(X+d,Y+d,s,s)}});x.globalAlpha=1;
    x.fillStyle=ink;pos.forEach(([X,Y,k])=>{if(k>0)x.fillRect(X,Y,s,s)});
    // sheen sweep across the face
    if(!reduce){x.fillStyle=C.page;pos.forEach(([X,Y,k,p])=>{if(k<1)return;const sw=Math.pow(Math.max(0,Math.cos((p.x/COLS-age*.22)*Math.PI*2)),18);if(sw<.05)return;
      x.globalAlpha=sw*.6;const h=Math.max(1,s/3|0);x.fillRect(X,Y+s-h,s,h)});x.globalAlpha=1}
    if(landed){
      // eyes in "cool"
      if(now>blinkAt){blinkUntil=now+130;blinkAt=now+2500+Math.random()*3500}
      EYES.forEach(gi=>{const g=glyphs[gi],hx=lx+(g.x+2)*s,hy=ly+4*s+wave(g.x+2,now);x.fillStyle=C.page;x.fillRect(hx,hy,2*s,4*s);x.fillStyle=ink;
        if(now<blinkUntil){x.fillRect(hx,hy+1.5*s,2*s,Math.max(2,s*.5));return}
        let dx=.5,dy=.5;if(mx>-1e5){const r=cv.getBoundingClientRect(),ex=hx+s,ey=hy+2*s,px=mx+(over?0:0),a=Math.atan2(my-ey,mx-ex),dist=Math.min(1,Math.hypot(my-ey,mx-ex)/200);dx=.5+Math.cos(a)*.5*dist;dy=.5+Math.sin(a)*.5*dist}
        x.fillRect(hx+dx*s|0,hy+(dy*2+.5)*s|0,s,s)});
      // cow
      const cwC=P.cow[0].length*u/s;cow.frame++;
      if(!reduce){if(cow.stop>0)cow.stop--;else{cow.x+=cow.dir*.045;if(cow.x>COLS-cwC){cow.x=COLS-cwC;cow.dir=-1}if(cow.x<0){cow.x=0;cow.dir=1}if(Math.random()<.003){cow.stop=110;cow.say=110}}}
      if(cow.say>0)cow.say--;
      const gy=ly+surface(cow.x,now)*s,step=cow.stop>0||reduce?0:((cow.frame>>3)%2)*u,ccx=lx+cow.x*s|0,ccy=gy-P.cow.length*u-step+u;
      drawCow(x,ccx,ccy,u,cow.dir<0);cow.box=[ccx,ccy,P.cow[0].length*u,P.cow.length*u];
      if(cow.say>0){x.fillStyle=ink;const p=Math.max(1,u-1),w=tw('moo!',p);txt('moo!',cow.dir<0?ccx-w-4:ccx+cow.box[2]+4,ccy+2*u,p)}
      // glints
      if(!reduce&&Math.random()<.012){const p=cells[Math.random()*cells.length|0];glints.push({x:lx+p.x*s+s/2,y:ly+p.y*s+s/2,b:now})}
      glints=glints.filter(gl=>now-gl.b<600);x.fillStyle=C.page;glints.forEach(gl=>{const k=Math.sin((now-gl.b)/600*Math.PI),L=Math.round(s*1.6*k);x.fillRect(gl.x-L,gl.y,L*2+1,1);x.fillRect(gl.x,gl.y-L,1,L*2+1);x.fillRect(gl.x-1,gl.y-1,3,3)})}
    // tagline types itself out
    const ta=age-1.4;if(ta>0){const p=W<520?1:2,shown=TAG.slice(0,Math.floor(ta*26)),X0=Math.round((W-tw(TAG,p))/2),Y0=ly+ROWS*s+depth+18;
      x.fillStyle=mute;const end=txt(shown,X0,Y0,p);if(Math.floor(age*2.2)%2===0){x.fillStyle=ink;x.fillRect(end+p,Y0-p,p*3,p*7)}}
    // sine scroller
    if(!reduce){const p=W<520?1:2,total=tw(SCROLL,p),off=(age*70)%total,baseY=H-(p*5+16);x.fillStyle=ink;let sx=W-off-total;
      while(sx<W){let cur=sx;for(const c of SCROLL){const w=fw(c)*p;if(cur>-w&&cur<W&&c!==' '){const edge=Math.min(1,Math.min(cur,W-cur)/60);x.globalAlpha=Math.max(0,(.55+.45*Math.sin(cur*.01-age*2))*edge);
        txt(c,cur,baseY+Math.sin(cur*.022+age*3)*6,p)}cur+=w}sx+=total}x.globalAlpha=1}
    // scanlines
    x.fillStyle=light()?'rgba(0,0,0,.05)':'rgba(0,0,0,.2)';for(let y=0;y<H;y+=3)x.fillRect(0,y,W,1);
    if(reduce||!visible||document.hidden){running=false;return}requestAnimationFrame(frame)}
  function wake(){if(running)return;running=true;last=performance.now();requestAnimationFrame(frame)}
  new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)wake()}).observe(cv);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake()});
  addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;over=mx>=0&&my>=0&&mx<=r.width&&my<=r.height},{passive:true});
  cv.style.cursor='pointer';cv.dataset.tip='click it';
  cv.onclick=e=>{const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,b=cow.box;
    if(b&&px>=b[0]-4&&px<=b[0]+b[2]+4&&py>=b[1]-4&&py<=b[1]+b[3]+4){moo(true);cow.stop=110;cow.say=110;cow.dir*=-1;return}
    rings.push({x:px,y:py,t:performance.now()});emit('logo');wake()};
  addEventListener('resize',()=>{size();wake()});
  const go=()=>{size();t0=performance.now();wake()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();

/* ---------- moo.exe ---------- */
let mooRun=false;
function mooStart(){if(mooRun)return;mooRun=true;const cv=$('#mooc'),x=cv.getContext('2d');let f=0;
  (function lp(){if($('#w-moo').hidden){mooRun=false;return}f++;x.fillStyle=C.page;x.fillRect(0,0,120,100);const s=5,sq=1+Math.sin(f*.25)*.15,rot=Math.sin(f*.125)*.25;
    if(!mooStart.spr){const c=document.createElement('canvas');c.width=P.cow[0].length;c.height=P.cow.length;drawCow(c.getContext('2d'),0,0,1);mooStart.spr=c}
    x.imageSmoothingEnabled=false;x.save();x.translate(60,88);x.rotate(rot);x.scale(((f>>5)%2?-1:1)/sq,sq);x.drawImage(mooStart.spr,-45,-54,90,54);x.restore();
    x.fillStyle=C.ink;x.fillRect(10,92,100,2);if(!reduce)requestAnimationFrame(lp)})()}
$('#mooBtn').onclick=()=>{moo(true);$('#mooCount').textContent=stats.moos+' moos so far'};
$('#emptyBin').onclick=()=>{$('.binl').innerHTML='<div class="small">the recycle bin is empty. aerobics_feelings.txt has been restored, it refuses to leave.</div>';beep(300,.2,'sawtooth');emit('bin')};

/* ---------- skin lab ---------- */
(()=>{const stage=$('#stage'),cv=$('#skincv'),msg=t=>$('#labmsg').textContent=t;let sv=null,pat='blink',ticks=6,step=0,timer=null,inited=false;
  const url=n=>'https://mc-heads.net/skin/'+encodeURIComponent(n);
  function layers(){const s=sv.playerObject.skin;return [s.head,s.body,s.rightArm,s.leftArm,s.rightLeg,s.leftLeg].map(p=>p.outerLayer)}
  function run(){clearInterval(timer);if(!sv)return;const L=layers();L.forEach(l=>l.visible=true);if(pat==='off'||reduce)return;
    const ms=pat==='strobe'?Math.max(50,ticks*25):ticks*50;
    timer=setInterval(()=>{step++;stats.blinks++;L.forEach((l,i)=>{l.visible=pat==='blink'?step%2===0:pat==='wave'?((step+i)%6)<3:pat==='random'?Math.random()>.5:step%2===0})},ms)}
  function fallback(n){stage.innerHTML='';const im=new Image();im.alt=n+"'s minecraft skin";im.src='https://mc-heads.net/body/'+encodeURIComponent(n)+'/150';stage.append(im);msg('3d viewer could not load, here is the flat version.')}
  function load(n){if(!sv){fallback(n);return}msg('loading '+n+'...');sv.loadSkin(url(n)).then(()=>{msg('loaded '+n+'. drag him around');run();emit('skin',n)}).catch(()=>msg('could not find a skin for "'+n+'". check the spelling.'))}
  function init(){if(inited)return;inited=true;const name=store.get('skin',SKIN_DEFAULT);$('#skinName').value=name;
    if(!window.skinview3d){fallback(name);return}
    try{const w=stage.clientWidth,h=stage.clientHeight;sv=new skinview3d.SkinViewer({canvas:cv,width:w,height:h});sv.zoom=.85;sv.autoRotate=!reduce;sv.autoRotateSpeed=.7;sv.animation=new skinview3d.IdleAnimation();
      addEventListener('resize',()=>{sv.width=stage.clientWidth;sv.height=stage.clientHeight});load(name)}catch(e){sv=null;fallback(name)}}
  new IntersectionObserver(es=>{if(es[0].isIntersecting)init()},{rootMargin:'200px'}).observe(stage);
  $('#skinForm').onsubmit=e=>{e.preventDefault();const n=$('#skinName').value.trim();if(!/^[A-Za-z0-9_]{2,16}$/.test(n)){msg('usernames are 3 to 16 letters, numbers or underscores.');return}store.set('skin',n);if(!inited)init();else if(sv)load(n);else fallback(n)};
  $$('#pats .btn').forEach(b=>b.onclick=()=>{pat=b.dataset.p;$$('#pats .btn').forEach(x=>x.setAttribute('aria-pressed',x===b));beep(1000,.03);run()});
  $('#ticks').oninput=e=>{ticks=+e.target.value;$('#tickv').textContent=ticks;run()};
  $$('#poses .btn').forEach(b=>b.onclick=()=>{if(!sv)return;const a=b.dataset.a;
    if(a==='spin'){sv.autoRotate=!sv.autoRotate;b.setAttribute('aria-pressed',sv.autoRotate);return}
    sv.animation=a==='walk'?new skinview3d.WalkingAnimation():a==='run'?new skinview3d.RunningAnimation():new skinview3d.IdleAnimation();
    $$('#poses .btn:not([data-a=spin])').forEach(x=>x.setAttribute('aria-pressed',x===b))});
})();

/* ---------- terminal ---------- */
(()=>{const box=$('#dos'),out=$('#dosOut'),inp=$('#dosIn');let cwd='landon',hist=store.get('hist',[]),hi=hist.length;
  const PAGES={pacman:'/pacman/',home:'#top',skin:'#skin',projects:'#projects',menu:'#menu'};
  const ps=()=>'c:\\'+cwd+'> ';
  const print=t=>{out.textContent+=t+'\n';box.scrollTop=box.scrollHeight};
  const changes=()=>CHANGES.map(c=>c.join('  ')).join('\n');
  const B={
    help:()=>['commands:','  help              this list','  type changes.txt  what\'s new','  dir               list files','  cls               clear the screen','  open <page>       '+Object.keys(PAGES).join(', '),
      '  theme [name]      '+THEMES.join(', '),'  mod [name]        list or toggle menu modules','  skin <username>   load a skin in the skin lab','  moo               moo','  echo <text>       says it back','  date / time / ver','  guestbook <msg>   sign the guestbook','  clear history','  exit',
      ...(Object.keys(COMMANDS).length?['','more: '+Object.keys(COMMANDS).filter(k=>!((window.LC&&LC.hidden)||[]).includes(k)).join(', ')]:[])].join('\n'),
    type:a=>{const f=(a[0]||'').toLowerCase();if(f==='changes.txt')return changes();if(f==='readme.txt')return 'type help. that\'s the readme.';if(f==='guestbook.txt')return gb().map(e=>e.n+': '+e.m).join('\n');return f?'file not found: '+f:'type what? try: type changes.txt'},
    dir:()=>[' directory of c:\\'+cwd,'','  changes.txt','  readme.txt','  guestbook.txt','  pacman.exe','  moo.exe','  skin_lab.exe'].join('\n'),
    ls:a=>B.dir(a),
    cls:()=>{out.textContent='';return null},clear:a=>{if(a[0]==='history'){hist=[];hi=0;store.set('hist',[]);return 'history cleared.'}out.textContent='';return null},
    cd:a=>{if(!a[0]||a[0]==='..'||a[0]==='\\'){cwd='landon';return null}return 'the system cannot find the path specified. try open '+a[0]},
    open:a=>{const k=(a[0]||'').toLowerCase().replace('.exe','');if(k==='moo'){openWin('w-moo');return 'opened moo.exe'}if(k==='guestbook'){openWin('w-gb');return 'opened guestbook.txt'}
      const u=PAGES[k];if(!u)return 'open what? '+Object.keys(PAGES).join(', ');if(u[0]==='#'){$(u).scrollIntoView({behavior:reduce?'auto':'smooth'});return 'opened '+k}loading();setTimeout(()=>location.href=u,300);return 'loading '+k+'...'},
    start:a=>B.open(a),
    theme:a=>{if(!a[0])return 'current theme: '+root.dataset.theme+'\navailable: '+THEMES.join(', ');if(!THEMES.includes(a[0]))return 'no theme called '+a[0];setTheme(a[0]);return 'theme set to '+a[0]},
    mod:a=>{if(!a[0])return MODS.map(m=>(mods[m.id].on?'[on]  ':'[off] ')+m.id).join('\n');const m=MODS.find(x=>x.id===a[0]||x.name===a.join(' '));if(!m)return 'no module called '+a.join(' ');toggle(m.id);return m.name+' '+(mods[m.id].on?'on':'off')},
    skin:a=>{if(!a[0])return 'usage: skin <username>';$('#skinName').value=a[0];$('#skinForm').requestSubmit();$('#skin').scrollIntoView({behavior:reduce?'auto':'smooth'});return 'loading '+a[0]+'\'s skin...'},
    moo:()=>{moo(true);return 'moo.'},
    echo:a=>a.join(' '),
    date:()=>new Date().toLocaleDateString(),time:()=>new Date().toLocaleTimeString(),
    ver:()=>'cow navigator [version 2.0]',
    guestbook:a=>{if(!a.length)return 'usage: guestbook <message>';const l=gb();l.push({n:'terminal user',m:a.join(' ')});store.set('gb',l);renderGb();emit('gb');renderStats();return 'signed. thanks.'},
    exit:()=>{inp.blur();return 'you can\'t exit. you live here now.'},
    sudo:()=>'nice try.',
  };
  function run(raw){const line=raw.trim();print(ps()+raw);if(!line)return;hist.push(line);hist=hist.slice(-50);hi=hist.length;store.set('hist',hist);
    const [c,...a]=line.split(/\s+/);const k=c.toLowerCase();let r;emit('cmd',k);
    try{if(k in COMMANDS){const v=COMMANDS[k];r=typeof v==='function'?v(a):v}else if(k in B)r=B[k](a);else r="'"+c+"' is not recognized as a command. type help."}catch(e){r='error: '+e.message}
    if(r!=null&&r!=='')print(r+'\n');beep(1800,.01,'square',.02)}
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){run(inp.value);inp.value='';e.preventDefault()}
    else if(e.key==='ArrowUp'){if(hi>0){hi--;inp.value=hist[hi]}e.preventDefault()}
    else if(e.key==='ArrowDown'){hi=Math.min(hist.length,hi+1);inp.value=hist[hi]||'';e.preventDefault()}
    else if(e.key==='Tab'){const all=[...Object.keys(B),...Object.keys(COMMANDS)];const m=all.filter(x=>x.startsWith(inp.value.toLowerCase()));if(m.length===1)inp.value=m[0]+' ';else if(m.length>1)print(ps()+inp.value+'\n'+m.join('  ')+'\n');e.preventDefault()}
    else if(e.key==='l'&&e.ctrlKey){out.textContent='';e.preventDefault()}});
  box.addEventListener('click',()=>{if(!getSelection().toString())inp.focus({preventScroll:true})});
  print(ps()+'type changes.txt\n\n'+changes()+'\n\ntype help for commands.\n');
})();

/* ---------- sidebar ---------- */
function renderStats(){const v=String(stats.visits).padStart(7,'0');$('#odo').innerHTML=[...v].map(c=>`<span>${c}</span>`).join('');
  const rows=[['online now','1'],['your visits',stats.visits],['page views',stats.views],['menu toggles',stats.toggles],['moos',stats.moos],['skin blinks',stats.blinks],['guestbook',gb().length]];
  $('#statl').innerHTML=rows.map(r=>`<span>${r[0]}</span><b>${r[1]}</b>`).join('')}
setInterval(renderStats,1000);
function cd(now){const end=new Date(2027,0,1);let s=Math.floor((end-now)/1000);if(s<=0){$('#cd').textContent="it's 2027. happy new year.";return}
  const dd=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);s%=60;$('#cd').innerHTML=`${dd} days<br>${h} hours<br>${m} minutes<br>${s} seconds`}
const POLL=['cow','creeper','enderman','the warden'];
function renderPoll(){const p=$('#poll'),v=store.get('vote',null);
  if(v===null){p.innerHTML=POLL.map((o,i)=>`<label><input type="radio" name="pv" value="${i}">${o}</label>`).join('')+'<button class="btn" id="pvote" style="margin-top:6px">vote!</button>';
    $('#pvote').onclick=()=>{const c=$('input[name=pv]:checked');if(!c){status('pick one first');return}store.set('vote',+c.value);beep(1400,.06);emit('vote');renderPoll()};return}
  p.innerHTML=POLL.map((o,i)=>`<div>${o}${i===v?' (you)':''}</div><div class="bar"><i style="width:${i===0?100:i===v?6:1}%"></i></div>`).join('')+`<div class="small">results are rigged. cow always wins.</div>`}
renderPoll();
function gb(){return store.get('gb',[{n:'landon',m:'first. sign it.'}])}
function renderGb(){const l=$('#gblist');l.innerHTML='';gb().slice().reverse().forEach(e=>{const d=document.createElement('div');d.textContent=e.n+': '+e.m;l.append(d)})}
$('#gbform').onsubmit=e=>{e.preventDefault();const n=$('#gbname').value.trim()||'anonymous',m=$('#gbmsg').value.trim();if(!m){status('write something first');return}const a=gb();a.push({n,m});store.set('gb',a);$('#gbmsg').value='';emit('gb');beep(1500,.06);renderGb();renderStats()};
const here=RING.indexOf(location.pathname)>=0?RING.indexOf(location.pathname):0;
$('#rprev').href=RING[(here-1+RING.length)%RING.length];$('#rnext').href=RING[(here+1)%RING.length];
$('#rrand').onclick=e=>{e.preventDefault();location.href=RING[Math.random()*RING.length|0]};

readColors();sizeFx();fxKick();tick();renderStats();window.wireWin=wireWin;window.focusWin=focusWin;
function fitNav(){const n=$('#w-nav');if(innerWidth<=700||n.classList.contains('max')||n.dataset.moved)return;const r=Math.max(...$$('.dicon').map(d=>d.getBoundingClientRect().right));
  const left=Math.round(r+12);n.style.left=left+'px';n.style.top='10px';n.style.width=Math.min(1240,innerWidth-left-14)+'px';n.style.height=(innerHeight-parseInt(getComputedStyle(root).getPropertyValue('--tb'))-20)+'px'}
fitNav();addEventListener('resize',fitNav);
window.LC={play,preloadS,drawCow,store,stats,bump,beep,moo,ac,vol,openWin,closeWin,toggle,mods,MODS,setTheme,THEMES,getC:()=>C,P,paint,pixSvg,status,COMMANDS,renderStats,emit,reduce,gb};
document.addEventListener('click',e=>{if(e.target.closest('button,a,.mod'))beep(1600,.015,'square',.03)});
})();
