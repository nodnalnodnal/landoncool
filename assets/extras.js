(()=>{const L=window.LC;if(!L)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const {store,stats,beep,moo,reduce,mods}=L;const C=()=>L.getC();
const svg=(name,w)=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','pix');s.setAttribute('width',w);s.setAttribute('height',w);L.paint(s,name);return s};
const on=(n,f)=>addEventListener('lc:'+n,e=>f(e.detail));
const rnd=a=>a[Math.random()*a.length|0];

/* ========== sound helpers ========== */
function A(){return L.ac()}
function gainOut(v){const a=A(),g=a.createGain();g.gain.value=v*Math.max(.2,L.vol());g.connect(a.destination);return g}
function tone(f,d,type='square',v=.15,when=0,to=null,dest=null){const a=A(),t=a.currentTime+when,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(dest||gainOut(1));o.start(t);o.stop(t+d+.05)}
function noise(d,v=.2,when=0,type='lowpass',freq=1000){const a=A(),t=a.currentTime+when,b=a.createBuffer(1,a.sampleRate*d,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=Math.random()*2-1;
  const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type=type;f.frequency.value=freq;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f).connect(g).connect(gainOut(1));s.start(t)}
const SB=(n,v=.8,o)=>()=>L.play(n,{vol:v,...(o||{})});
const SOUNDS={
  'moo':()=>moo(true),
  'deep moo':SB('moo3',.9,{rate:.8}),
  'boom':SB('boom',.9),
  'laser':SB('laser',.6),
  'teleport':SB('teleport',.6),
  'coins':SB('coin',.7),
  'bonk':SB('bonk',.8),
  'punch':SB('punch',.8),
  'error':SB('error',.7),
  'level up':SB('win',.6),
  'door':SB('door',.8),
  'dice':SB('dice',.7),
  'oink':SB('pig'),
  'bawk':SB('hen'),
  'cock-a-doodle':SB('rooster',.7),
  'baa':SB('sheep',1),
  'neigh':SB('horse',.7),
  'quack':SB('duck',.7),
  'woof':SB('dog',.7),
  'hee-haw':SB('donkey',.6),
};
function xp(){if(!mods.sound.on)return;L.play('achieve',{vol:.5})}

/* ========== achievements ========== */
const ACH=window.LC_ACHIEVEMENTS; // the list lives in achievements.js
let got=store.get('ach',{});
function toast(name){const t=document.createElement('div');t.className='toast';t.append(svg('trophy',28));const d=document.createElement('div');d.innerHTML='<b>achievement get!</b>';d.append(name);t.append(d);$('#toasts').append(t);
  setTimeout(()=>{t.classList.add('bye');setTimeout(()=>t.remove(),400)},4200)}
function unlock(id){if(got[id])return;const a=ACH.find(x=>x[0]===id);if(!a)return;got[id]=Date.now();store.set('ach',got);toast(a[1]);xp();renderAch();
  if(id!=='all'&&ACH.every(x=>x[0]==='all'||got[x[0]]))setTimeout(()=>unlock('all'),1200)}
function renderAch(){const n=ACH.filter(a=>got[a[0]]).length;$('#achStrip').textContent=`achievements: ${n}/${ACH.length}`;$('#achBar').style.width=(n/ACH.length*100)+'%';
  $('#achHead').textContent=`${n} of ${ACH.length} unlocked`;const l=$('#achList');l.innerHTML='';
  ACH.forEach(([id,name,desc,secret])=>{const d=document.createElement('div');const g=got[id];if(!g)d.className='lock';d.append(svg(g?'trophy':'wx',g?18:12));
    const t=document.createElement('div');t.style.cssText='display:block;border:0;padding:0';const b=document.createElement('b');b.textContent=g||!secret?name:'???';const sp=document.createElement('span');sp.textContent=g||!secret?desc:'secret';t.append(b,sp);d.append(t);l.append(d)})}
L.unlock=unlock;L.ACH=ACH;
on('moo',n=>{unlock('moo');if(n>=50)unlock('moo50')});
const seenT=new Set(store.get('seenThemes',[]));
on('theme',t=>{unlock('theme');seenT.add(t);store.set('seenThemes',[...seenT]);if(seenT.size>=7)unlock('allthemes')});
const cmds=new Set(store.get('cmds',[]));
on('cmd',k=>{unlock('cmd');cmds.add(k);store.set('cmds',[...cmds]);if(cmds.size>=10)unlock('cmd10')});
on('toggle',id=>{if(id==='roll')unlock('roll')});
on('bin',()=>unlock('bin'));on('gb',()=>unlock('gb'));on('vote',()=>unlock('vote'));on('shut',()=>unlock('bye'));
on('skin',n=>{if(n.toLowerCase()!=='mrcowlord')unlock('skin')});
if(new Date().getHours()<5)setTimeout(()=>unlock('night'),3000);
renderAch();

/* ========== bsod ========== */
function bsod(){const b=$('#bsod');b.innerHTML='<span class="h">landon.cool</span>\n\na fatal moo has occurred at 0028:c0011e36 in vxd cow(01) + 00010e36. the current website will be terminated.\n\n*  press any key to pretend this didnt happen\n*  press ctrl+alt+del to restart your computer. you will lose all unsaved moos.\n\npress any key to continue _';
  b.hidden=false;if(mods.sound.on)SOUNDS.error();unlock('bsod');const t0=Date.now();
  const close=()=>{if(Date.now()-t0<600)return;b.hidden=true;removeEventListener('keydown',close,true);b.onclick=null};
  addEventListener('keydown',close,true);b.onclick=close}

/* ========== cow sprites + cow rain ========== */
function cowSprite(s){const rows=L.P.cow,c=document.createElement('canvas');c.width=rows[0].length*s;c.height=rows.length*s;L.drawCow(c.getContext('2d'),0,0,s);return c}
function cowRain(){if(reduce){status('moo');return}const cv=document.createElement('canvas');cv.style.cssText='position:fixed;inset:0;z-index:9550;pointer-events:none';const W=innerWidth,H=innerHeight;cv.width=W;cv.height=H;document.body.append(cv);
  const x=cv.getContext('2d'),spr=cowSprite(3);const cows=Array.from({length:70},()=>({x:Math.random()*W,y:-60-Math.random()*H*1.5,v:2+Math.random()*4,r:Math.random()*6,vr:(Math.random()-.5)*.1}));
  const t0=performance.now();let m=0;(function lp(t){x.clearRect(0,0,W,H);cows.forEach(c=>{c.y+=c.v;c.r+=c.vr;x.save();x.translate(c.x,c.y);x.rotate(c.r);x.drawImage(spr,-spr.width/2,-spr.height/2);x.restore()});
    if(t-t0>m*700&&m<5){m++;moo()}if(t-t0<7000)requestAnimationFrame(lp);else cv.remove()})(t0)}
function status(t){L.status(t)}

/* ========== konami ========== */
const KON=['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];let kp=0;
addEventListener('keydown',e=>{if(e.target.matches&&e.target.matches('input,textarea'))return;const k=e.key.toLowerCase();kp=k===KON[kp]?kp+1:(k===KON[0]?1:0);if(kp===KON.length){kp=0;cowRain();unlock('konami');status('cheat activated')}});

/* ========== screensaver ========== */
let last=Date.now(),saving=false;
['pointermove','pointerdown','keydown','wheel','touchstart'].forEach(ev=>addEventListener(ev,()=>{last=Date.now();if(saving)stopSaver()},{capture:true,passive:true}));
const sv=$('#saver');let svRaf;
function startSaver(){if(saving||reduce)return;saving=true;sv.hidden=false;unlock('saver');const W=sv.width=innerWidth,H=sv.height=innerHeight,x=sv.getContext('2d');const spr=cowSprite(3);
  const cows=Array.from({length:60},()=>({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random()}));
  (function lp(){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,0,W,H);cows.sort((a,b)=>b.z-a.z).forEach(c=>{c.z-=.004;if(c.z<=.03){c.x=Math.random()*2-1;c.y=Math.random()*2-1;c.z=1}
    const k=1/c.z,X=W/2+c.x*k*W*.12,Y=H/2+c.y*k*H*.12,s=Math.min(160,8*k);x.drawImage(spr,X-s/2,Y-s*.3,s,s*.6)});
    x.fillStyle='#fff';x.font='20px VT323, monospace';x.fillText('landon.cool',16,H-16);svRaf=requestAnimationFrame(lp)})()}
function stopSaver(){saving=false;sv.hidden=true;cancelAnimationFrame(svRaf);last=Date.now()}
setInterval(()=>{if(mods.saver.on&&!saving&&Date.now()-last>90000&&!document.hidden)startSaver()},3000);

/* ========== moo-ssistant ========== */
const TIPS=[
 'it looks like youre trying to look at a website. want help with that?',
 'type cowsay hi in the terminal',
 'theres a cheat code. its the famous one. im not telling you what it does',
 'right click the desktop',
 'have you fed the cow today. moo.exe. he gets hungry',
 'if you dont touch anything for a while something happens',
 'middle click a module in the menu to bind it to a key',
 'type format c: in the terminal. actually dont',
 'the terminal theme goes hard. try it',
 'theres a soundboard on the desktop. it has a real cow on it',
 'you can play cowsweeper. the mines are not cows. i checked',
 'make sure to come back to the site so i get money',
 'click hmmmsus.png a bunch of times',
 'some achievements are secret. good luck',
 'the poll is rigged btw',
 'type neofetch in the terminal',
];
let ti=Math.random()*TIPS.length|0,clipT;const cl=$('#clippy');
function showTip(){if(!mods.clippy.on)return;$('#clipTxt').textContent=TIPS[ti++%TIPS.length];cl.hidden=false;beep(1200,.04)}
function schedule(ms){clearTimeout(clipT);clipT=setTimeout(()=>{if(cl.hidden)showTip();schedule(150000)},ms)}
$('#clipNext').onclick=showTip;
$('#clipCow').onclick=()=>{moo(true);showTip()};
$('#clipX').onclick=()=>{const n=store.get('clipX',0)+1;store.set('clipX',n);if(n>=3)unlock('clippy');
  if(n===3){$('#clipTxt').textContent='ok fine. you can turn me back on in the menu. moo-ssistant';setTimeout(()=>{cl.hidden=true;if(mods.clippy.on)L.toggle('clippy',false)},2600)}else cl.hidden=true};
on('mod',id=>{if(id==='clippy'){if(!mods.clippy.on)cl.hidden=true;else schedule(1500)}});
schedule(25000);

/* ========== desktop context menu ========== */
const ctx=$('#ctx');
document.addEventListener('contextmenu',e=>{if(e.target.closest('.win,#taskbar,#smenu,#clippy,#ctx,input,textarea'))return;e.preventDefault();ctx.hidden=false;
  const r=ctx.getBoundingClientRect();ctx.style.left=Math.min(e.clientX,innerWidth-r.width-4)+'px';ctx.style.top=Math.min(e.clientY,innerHeight-r.height-4)+'px';beep(900,.03);ctx.querySelector('button').focus()});
document.addEventListener('pointerdown',e=>{if(!ctx.hidden&&!e.target.closest('#ctx'))ctx.hidden=true});
addEventListener('keydown',e=>{if(e.key==='Escape')ctx.hidden=true});
ctx.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(!b)return;ctx.hidden=true;const c=b.dataset.c;
  if(c==='refresh')location.reload();
  if(c==='arrange'){const d=$('#icons');[...d.children].sort(()=>Math.random()-.5).forEach(n=>d.append(n));status('arranged. kind of')}
  if(c==='theme')L.setTheme(L.THEMES[(L.THEMES.indexOf(document.documentElement.dataset.theme)+1)%L.THEMES.length]);
  if(c==='folder'){SOUNDS.error();status('you dont have permission to make folders on my website')}
  if(c==='term')openTerm();
  if(c==='moo')moo(true);
  if(c==='props')L.openWin('w-readme')});
function openTerm(){const n=$('#w-nav');n.hidden=false;delete n.dataset.closed;$('#dos').scrollIntoView({behavior:reduce?'auto':'smooth'});setTimeout(()=>$('#dosIn').focus({preventScroll:true}),400)}

/* ========== cowsweeper ========== */
(()=>{const N=9,M=10,g=$('#swGrid');let mine,open,flag,started,over,t0,tm,flagMode=false,boomI=-1;
  const cells=[];for(let i=0;i<N*N;i++){const b=document.createElement('button');b.className='cell';b.setAttribute('aria-label','cell');b.onclick=()=>flagMode?tog(i):reveal(i);
    b.oncontextmenu=e=>{e.preventDefault();tog(i)};b.onpointerdown=e=>{if(e.button===0&&!over)$('#swFace').textContent=':O'};cells.push(b);g.append(b)}
  addEventListener('pointerup',()=>{if(!over)$('#swFace').textContent=':)'});
  const nb=i=>{const r=[],x=i%N,y=i/N|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<N&&Y<N)r.push(Y*N+X)}return r};
  function reset(){mine=new Array(N*N).fill(false);open=new Array(N*N).fill(false);flag=new Array(N*N).fill(false);started=over=false;boomI=-1;clearInterval(tm);$('#swTime').textContent='000';$('#swFace').textContent=':)';draw()}
  function place(safe){const no=new Set([safe,...nb(safe)]);let n=0;while(n<M){const r=Math.random()*N*N|0;if(!mine[r]&&!no.has(r)){mine[r]=true;n++}}started=true;t0=Date.now();
    tm=setInterval(()=>$('#swTime').textContent=String(Math.min(999,(Date.now()-t0)/1000|0)).padStart(3,'0'),250)}
  function tog(i){if(over||open[i])return;flag[i]=!flag[i];beep(700,.02);draw()}
  function reveal(i){if(over||flag[i]||open[i])return;if(!started)place(i);
    if(mine[i]){over=true;clearInterval(tm);boomI=i;mine.forEach((m,j)=>{if(m)open[j]=true});$('#swFace').textContent='x(';SOUNDS.boom();unlock('boom');draw();return}
    const st=[i];while(st.length){const c=st.pop();if(open[c]||flag[c])continue;open[c]=true;if(!nb(c).some(j=>mine[j]))nb(c).forEach(j=>{if(!open[j])st.push(j)})}
    beep(1500,.015);
    if(open.filter((o,j)=>o&&!mine[j]).length===N*N-M){over=true;clearInterval(tm);$('#swFace').textContent='B)';const sec=(Date.now()-t0)/1000|0;const best=store.get('swBest',null);
      if(best===null||sec<best)store.set('swBest',sec);mine.forEach((m,j)=>{if(m)flag[j]=true});unlock('sweep');SOUNDS['level up']()}
    draw()}
  function draw(){cells.forEach((b,i)=>{b.innerHTML='';b.className='cell'+(open[i]?' r':'')+(i===boomI?' boom':'');b.removeAttribute('data-n');
      if(open[i]){if(mine[i])b.append(svg('mine',14));else{const n=nb(i).filter(j=>mine[j]).length;if(n){b.textContent=n;b.dataset.n=n}}}else if(flag[i])b.append(svg('flag',12))});
    $('#swMines').textContent=String(M-flag.filter(Boolean).length).padStart(3,'0');const best=store.get('swBest',null);$('#swBest').textContent=best===null?'':'best: '+best+'s'}
  $('#swFace').onclick=reset;$('#swFlag').onclick=e=>{flagMode=!flagMode;e.currentTarget.setAttribute('aria-pressed',flagMode)};reset();
})();

/* ========== soundboard ========== */
(()=>{const g=$('#sbg'),played=new Set(store.get('sbPlayed',[]));Object.keys(SOUNDS).forEach(k=>{const b=document.createElement('button');b.className='btn';b.textContent=k;
  b.onclick=()=>{try{SOUNDS[k]()}catch(e){}played.add(k);store.set('sbPlayed',[...played]);if(Object.keys(SOUNDS).every(x=>played.has(x)))unlock('dj')};g.append(b)})})();

/* ========== cow pet ========== */
(()=>{const box=$('#pet');let p=store.get('pet',{name:'bessie',h:70,j:70,t:Date.now(),pets:0});
  function decay(){const now=Date.now(),mins=(now-p.t)/60000;if(mins>=1){p.h=Math.max(0,p.h-mins/2);p.j=Math.max(0,p.j-mins/3);p.t=now;store.set('pet',p)}}
  box.innerHTML=`<label class="small">name<input id="petName" class="in" maxlength="16"></label>
    <div class="pb"><span>food</span><div class="bar"><i id="petH"></i></div></div>
    <div class="pb"><span>happy</span><div class="bar"><i id="petJ"></i></div></div>
    <div class="row" style="margin-top:6px"><button class="btn" id="petFeed">feed wheat</button><button class="btn" id="petPet">pet</button></div>
    <div class="mood" id="petMood"></div>`;
  const nm=$('#petName');nm.value=p.name;nm.oninput=()=>{p.name=nm.value.trim()||'cow';store.set('pet',p);draw()};
  function draw(){decay();$('#petH').style.width=p.h+'%';$('#petJ').style.width=p.j+'%';const n=p.name;
    $('#petMood').textContent=p.h<15?n+' is starving. feed him':p.h<40?n+' is kinda hungry':p.j<25?n+' is sad. pet him':p.j>85&&p.h>80?n+' is living his best life':n+' is chillin';$('#mooCount').textContent=stats.moos+' moos'}
  $('#petFeed').onclick=()=>{decay();p.h=Math.min(100,p.h+18);p.j=Math.min(100,p.j+4);store.set('pet',p);moo(true);unlock('feed');draw()};
  $('#petPet').onclick=()=>{decay();p.j=Math.min(100,p.j+6);p.pets=(p.pets||0)+1;store.set('pet',p);beep(1800,.05,'sine');if(mods.sound.on===false)tone(1500,.06,'sine',.08);if(p.pets>=20)unlock('pet20');draw()};
  draw();setInterval(draw,15000);L.pet={get:()=>p,feed:()=>$('#petFeed').click()};
})();

/* ========== sus meter ========== */
(()=>{const img=$('#susImg');if(!img)return;let n=0;img.onclick=()=>{n=Math.min(10,n+1);$('#susMeter').textContent='sus meter: ['+'#'.repeat(n)+'.'.repeat(10-n)+']';beep(400+n*80,.05);
  if(n===10){$('#susMeter').textContent='emergency meeting';SOUNDS.boom();SOUNDS.error();unlock('sus');setTimeout(()=>{n=0;$('#susMeter').textContent='sus meter: [..........]'},3000)}}})();

/* ========== tab title + xmas ========== */
(()=>{const d=new Date(),m=d.getMonth();let t;if(m>=10)t='the christmas background is back. turn on snow in the menu';else{const nov=new Date(d.getFullYear(),10,1);t=Math.ceil((nov-d)/864e5)+' days until the christmas background comes back'}$('#xmas').textContent=t})();

/* ========== terminal commands ========== */
const CM=L.COMMANDS;
L.hidden=['format','rm','del','konami','money','cowrain','xyzzy','landon'];
CM.cowsay=a=>{const t=(a.join(' ')||'moo').slice(0,50);return ' '+'_'.repeat(t.length+2)+'\n< '+t+' >\n '+'-'.repeat(t.length+2)+'\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||'};
CM.fortune=()=>rnd(['you will find a diamond. it will be in a creeper','a cow is watching you. thats fine','your next skin will go hard','do not trust the poll','today is a good day to come back to the site so landon gets money','you will lose at cowsweeper in exactly 3 clicks','something in the recycle bin misses you','the warden is not your friend','you are going to type format c:. dont']);
CM.neofetch=()=>{const n=ACH.filter(a=>got[a[0]]).length,up=Math.floor(performance.now()/60000);const l=['   ^__^','   (oo)\\_______','   (__)\\       )\\/\\','       ||----w |','       ||     ||','','','',''];
  const r=['landon@cool','-----------','os: cow navigator 2.0','host: a debian box in a house','shell: c:\\landon','theme: '+document.documentElement.dataset.theme,'uptime: '+up+' min','achievements: '+n+'/'+ACH.length,'moos: '+stats.moos];return l.map((x,i)=>x.padEnd(22)+r[i]).join('\n')};
CM.achievements=()=>ACH.map(([id,n,d,s])=>(got[id]?'[x] ':'[ ] ')+(got[id]||!s?n+': '+d:'???')).join('\n');
CM.cowsweeper=()=>{L.openWin('w-sweep');return 'good luck'};CM.sweep=CM.cowsweeper;
CM.soundboard=()=>{L.openWin('w-sb');return 'opened soundboard.exe'};
CM.play=a=>{if(a[0]==='vine'&&a[1]==='boom')a=['boom'];const k=a.join(' ').toLowerCase();if(!SOUNDS[k])return 'sounds: '+Object.keys(SOUNDS).join(', ');SOUNDS[k]();return 'playing '+k};
CM.feed=()=>{L.pet.feed();return L.pet.get().name+' ate some wheat. moo'};
CM.pet=()=>{L.openWin('w-moo');const p=L.pet.get();return p.name+': food '+Math.round(p.h)+'%, happy '+Math.round(p.j)+'%'};
CM.readme=()=>{L.openWin('w-readme');return 'opened readme.txt'};
CM.sus=()=>{L.openWin('w-sus');return 'hmmm'};
CM.ping=a=>{const h=a[0]||'landon.cool';return 'pinging '+h+' with 32 bytes of moo:\n'+[0,1,2,3].map(()=>'reply from '+h+': bytes=32 time='+(5+Math.random()*60|0)+'ms ttl=64').join('\n')};
CM.screensaver=()=>{setTimeout(startSaver,300);return 'zzz'};
CM.money=()=>'make sure to come back to the site so i get money';
CM.konami=()=>'nice try. do it for real';
CM.cowrain=()=>{cowRain();return 'its raining cows'};
CM.xyzzy=()=>'nothing happens. wrong game';
CM.landon=()=>'thats me';
CM.format=a=>{setTimeout(bsod,900);return 'formatting '+(a[0]||'c:')+'...\n'};
CM.rm=a=>{if(a.join(' ').includes('-rf')){setTimeout(bsod,900);return 'deleting everything...'}return 'rm what'};
CM.del=a=>{if(a.join(' ').toLowerCase().includes('system32')){setTimeout(bsod,900);return 'deleting system32...'}return 'del what'};
})();
