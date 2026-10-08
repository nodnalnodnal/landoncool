(()=>{const L=window.LC;if(!L)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const {store,mods,reduce,moo}=L;const root=document.documentElement;
const on=(n,f)=>addEventListener('lc:'+n,e=>f(e.detail));
const unlock=id=>L.unlock&&L.unlock(id);
const svg=(name,w)=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','pix');s.setAttribute('width',w);s.setAttribute('height',w);L.paint(s,name);return s};
const rnd=a=>a[Math.random()*a.length|0];

/* ================= sound effects ================= */
let armed=false,lastClick=0,lastHover=0,lastType=0,master=null;
const A=()=>L.ac();
function out(){const a=A();if(!master){master=a.createGain();const c=a.createDynamicsCompressor();master.connect(c).connect(a.destination)}master.gain.value=.9*L.vol();return master}
function nz(d,v,type,f,when=0,q=1,f2=null){const a=A(),t=a.currentTime+when,len=Math.max(1,a.sampleRate*d|0),b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<len;i++)c[i]=Math.random()*2-1;
  const s=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();s.buffer=b;fl.type=type;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+d);fl.Q.value=q;
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl).connect(g).connect(out());s.start(t)}
function osc(f,d,type,v,when=0,f2=null,att=.003){const a=A(),t=a.currentTime+when,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(out());o.start(t);o.stop(t+d+.05)}
const PL=(n,v,o)=>L.play(n,{vol:v,...(o||{})});
const S={
  click(){PL('click',.45)},
  hover(){PL('hover',.14,{rate:1.1})},
  type(){PL('type',.22,{rate:.85+Math.random()*.4})},
  open(){PL('open',.4)},close(){PL('close',.4)},min(){PL('min',.4)},
  ding(){PL('ding',.55)},error(){PL('error',.6)},notify(){PL('notify',.5)},
  on(){PL('on',.35)},off(){PL('off',.35)},pop(){PL('pop',.5)},glitch(){PL('glitch',.5)},
  startup(){PL('startup',.55)},shutdown(){PL('shutdown',.55)},coin(){PL('coin',.6)},
  blip(f,d){if(performance.now()-lastClick<90)return;PL('hover',.22,{rate:Math.min(2,Math.max(.6,f/1200))})},
};
const SFX={};Object.keys(S).forEach(k=>SFX[k]=(...a)=>{if(!armed||!mods.sound.on)return;try{S[k](...a)}catch(e){}});
window.SFX=SFX;L.SFX=SFX;
const arm=()=>{if(armed)return;armed=true;try{A().resume();L.preloadS()}catch(e){}};
addEventListener('pointerdown',arm,true);addEventListener('keydown',arm,true);
const INTER='a,button,[role=switch],.mod,.cell,.dicon,.swatch,summary,label,input[type=range],input[type=radio],select,canvas#logo,.top8 figure,.blinkie,.award,.tab';
addEventListener('pointerdown',e=>{if(e.button>1)return;const el=e.target.closest&&e.target.closest(INTER);if(el&&!el.disabled){SFX.click();lastClick=performance.now()}},true);
let hovEl=null;
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const el=e.target.closest&&e.target.closest(INTER);if(el===hovEl)return;hovEl=el;if(!el||!mods.hover.on)return;
  const n=performance.now();if(n-lastHover<45)return;lastHover=n;SFX.hover()});
document.addEventListener('keydown',e=>{if(!e.target.matches||!e.target.matches('input,textarea'))return;if(e.key.length===1||e.key==='Backspace'||e.key==='Enter'||e.key===' '){const n=performance.now();if(n-lastType<25)return;lastType=n;SFX.type()}});
on('open',()=>SFX.open());on('close',()=>SFX.close());on('min',()=>SFX.min());on('shut',()=>SFX.shutdown());on('theme',()=>SFX.notify());
on('toggle',id=>{mods[id]&&(mods[id].on?SFX.on():SFX.off())});on('logo',()=>SFX.pop());

/* ================= lc coin ================= */
(()=>{const c=$('#spin');if(!c)return;const f=c.querySelector('.c3');let n=store.get('coins',0),ang=0,last=performance.now(),flipT=0;
  (function lp(t){const dt=Math.min(.05,(t-last)/1000);last=t;let y=0;
    if(flipT){const p=(t-flipT)/900;if(p>=1)flipT=0;else{ang+=dt*1500*(1-p);y=-Math.sin(p*Math.PI)*14}}
    ang+=dt*(c.classList.contains('go')?800:140);f.style.transform=`translateY(${y.toFixed(1)}px) rotateY(${(ang%360).toFixed(1)}deg)`;requestAnimationFrame(lp)})(last);
  c.onclick=e=>{e.preventDefault();flipT=performance.now();SFX.coin();n++;store.set('coins',n);L.status(n===1?'you found a landon coin':'landon coins: '+n)}})();

/* ================= custom cursors ================= */
const ARROW=["#...........","##..........","#o#.........","#oo#........","#ooo#.......","#oooo#......","#ooooo#.....","#oooooo#....","#ooooooo#...","#oooooooo#..","#ooooo#####.","#oo#oo#.....","#o#.#oo#....","##..#oo#....","#....#oo#...",".....###...."];
const HAND=["....##.........","...#oo#........","...#oo#........","...#oo#........","...#oo###......","...#oo#oo###...","...#oo#oo#oo##.",".###oo#oo#oo#o#","#oo#oooooooo#o#","#ooooooooooooo#",".#oooooooooooo#","..#ooooooooooo#","..#oooooooooo#.","...#ooooooooo#.","....#oooooooo#.","....##########."];
const BEAM=[".ooo.ooo.","o###o###o",".oo###oo.","...o#o...","...o#o...","...o#o...","...o#o...","...o#o...","...o#o...","...o#o...","...o#o...","...o#o...",".oo###oo.","o###o###o",".ooo.ooo."];
function curs(rows,hx,hy,sc=2){const w=Math.max(...rows.map(r=>r.length)),h=rows.length;let d1='',d2='';rows.forEach((r,y)=>{for(let x=0;x<r.length;x++){if(r[x]==='#')d1+=`M${x} ${y}h1v1h-1z`;else if(r[x]==='o')d2+=`M${x} ${y}h1v1h-1z`}});
  const s=`<svg xmlns="http://www.w3.org/2000/svg" width="${w*sc}" height="${h*sc}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"><path d="${d2}" fill="#fff"/><path d="${d1}" fill="#000"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(s)}") ${hx} ${hy}`}
root.style.setProperty('--cur-a',curs(ARROW,0,0));root.style.setProperty('--cur-h',curs(HAND,8,0));root.style.setProperty('--cur-t',curs(BEAM,8,14));

/* ================= tooltips ================= */
const tip=$('#tip');let tipT,tipEl=null,tx=0,ty=0;
document.addEventListener('pointerover',e=>{const el=e.target.closest&&e.target.closest('[title],[data-tip]');if(el===tipEl)return;tipEl=el;clearTimeout(tipT);tip.hidden=true;if(!el)return;
  if(el.hasAttribute('title')){el.dataset.tip=el.getAttribute('title');el.removeAttribute('title')}if(!el.dataset.tip)return;
  tipT=setTimeout(()=>{tip.textContent=el.dataset.tip;tip.hidden=false;place()},450)});
addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY;if(!tip.hidden)place()},{passive:true});
addEventListener('pointerdown',()=>{clearTimeout(tipT);tip.hidden=true},true);
function place(){const r=tip.getBoundingClientRect();tip.style.left=Math.min(tx+14,innerWidth-r.width-6)+'px';tip.style.top=Math.min(ty+22,innerHeight-r.height-6)+'px'}
const TIPS={'w-nav':'the website','w-amp':'music. it slaps','w-sweep':'minesweeper but cows','w-sb':'real farm animals','w-ach':'how many have you got','w-readme':'read me','w-moo':'feed him','w-sus':'hmmm','w-gb':'sign it','w-bin':'dont empty it'};
$$('.dicon').forEach(d=>{d.dataset.tip=TIPS[d.dataset.open]||('open '+d.textContent.trim())});
$$('.badge').forEach(b=>{if(!b.dataset.tip)b.dataset.tip=rnd(['i made this one','88x31. the best size','click it. nothing happens','100% authentic','collect them all'])});
const ttips={'#start':'click here to begin','#trSnd':'sound on/off','#trCrt':'crt on/off','#clock':new Date().toDateString().toLowerCase(),'#spin':'LC. click it','#addr':'type a page and hit enter','#bmTheme':'next theme','#power':'power'};
Object.entries(ttips).forEach(([k,v])=>{const el=$(k);if(el)el.dataset.tip=v});

/* ================= splash ================= */
(()=>{let seen=false;try{seen=sessionStorage.getItem('lc_entered')}catch(e){}if(seen)return;const sp=$('#splash');sp.hidden=false;let p=0;
  const iv=setInterval(()=>{p=Math.min(100,p+(Math.random()*11|0)+3);$('#spBar').style.width=p+'%';$('#spPct').textContent=p<100?'loading... '+p+'%':'done!';if(p>=100){clearInterval(iv);$('#spEnter').disabled=false;$('#spEnter').focus({preventScroll:true})}},reduce?20:110);
  $('#spEnter').onclick=()=>{try{sessionStorage.setItem('lc_entered','1')}catch(e){}arm();SFX.startup();sp.classList.add('bye');setTimeout(()=>sp.hidden=true,460)}})();

/* ================= cowamp ================= */
const TRACKS=[
 {name:'moo moo groove',bpm:140,wave:'square',drum:'khshkhsh',
  lead:'C5 E5 G5 E5 A5 G5 E5 D5 C5 E5 G5 C6 B5 G5 A5 - F5 A5 C6 A5 G5 E5 C5 E5 D5 E5 F5 D5 G5 - - . C5 E5 G5 E5 A5 G5 E5 D5 C5 E5 G5 C6 B5 G5 A5 - F5 E5 D5 F5 E5 D5 C5 B4 C5 - - - . . . .',
  bass:'C3 . C3 G2 C3 . C3 G2 A2 . A2 E2 A2 . A2 E2 F2 . F2 C3 F2 . F2 C3 G2 . G2 D3 G2 . B2 . C3 . C3 G2 C3 . C3 G2 A2 . A2 E2 A2 . A2 E2 F2 . F2 . G2 . G2 . C3 . G2 . C3 . . .'},
 {name:'debian box at 3am',bpm:92,wave:'triangle',drum:'k..hs..h',
  lead:'A4 - C5 - E5 - D5 - C5 - - - . . . . G4 - B4 - D5 - C5 - B4 - - - . . . . F4 - A4 - C5 - B4 - A4 - - - E5 - - - D5 - C5 - B4 - G4 - A4 - - - - - . .',
  bass:'A2 - - - A2 - - - F2 - - - F2 - - - G2 - - - G2 - - - E2 - - - E2 - - - F2 - - - F2 - - - A2 - - - A2 - - - D2 - - - E2 - - - A2 - - - - - - -'},
 {name:'cowsweeper (boss fight)',bpm:168,wave:'square',drum:'khshkksh',
  lead:'E5 G5 B5 G5 E5 G5 B5 G5 D5 F#5 A5 F#5 D5 F#5 A5 F#5 C5 E5 G5 E5 C5 E5 G5 E5 B4 D#5 F#5 D#5 B4 - B5 - E5 - B4 - E5 G5 F#5 E5 D5 - A4 - D5 F#5 E5 D5 C5 D5 E5 G5 F#5 E5 D#5 F#5 E5 - - - E4 - . .',
  bass:'E2 E2 E3 E2 E2 E2 E3 E2 D2 D2 D3 D2 D2 D2 D3 D2 C2 C2 C3 C2 C2 C2 C3 C2 B1 B1 B2 B1 B1 B1 B2 B1 E2 E2 E3 E2 E2 E2 E3 E2 D2 D2 D3 D2 D2 D2 D3 D2 C2 C2 C3 C2 C2 C2 C3 C2 E2 . E2 . E1 . . .'},
 {name:'bessie eating wheat (chill mix)',bpm:84,wave:'sine',drum:'k...s.h.',
  lead:'E5 - D5 - C5 - G4 - A4 - C5 - D5 - - - E5 - G5 - E5 - D5 - C5 - - - - - . . D5 - E5 - D5 - C5 - A4 - - - G4 - - - C5 - D5 - E5 - D5 - C5 - - - - - - -',
  bass:'C3 - - - G2 - - - A2 - - - G2 - - - C3 - - - E2 - - - F2 - - - - - - - G2 - - - G2 - - - A2 - - - E2 - - - F2 - - - G2 - - - C3 - - - - - - -'},
];
const NOTE={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function freq(t){const m=/^([A-G])(#|b)?(\d)$/.exec(t);if(!m)return 0;const n=(+m[3]+1)*12+NOTE[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);return 440*Math.pow(2,(n-69)/12)}
TRACKS.forEach(t=>{t.L=t.lead.split(/\s+/);t.B=t.bass.split(/\s+/);t.step=60/t.bpm/2;t.len=t.L.length*t.step*2});
let ampG=null,an=null,cur=0,playing=false,paused=false,stepI=0,nextT=0,startT=0,pauseAt=0,sched=null;
function ampOut(){const a=A();if(!ampG){ampG=a.createGain();an=a.createAnalyser();an.fftSize=64;ampG.connect(an);an.connect(a.destination)}ampG.gain.value=$('#ampVol').value/100*.5;return ampG}
function vnote(f,t,d,type,v){const a=A(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.01);g.gain.setValueAtTime(v,t+Math.max(.02,d-.04));g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(ampOut());o.start(t);o.stop(t+d+.02)}
function drum(k,t){const a=A();if(k==='k'){const o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(.7,t);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g).connect(ampOut());o.start(t);o.stop(t+.2)}
  else{const d=k==='s'?.12:.035,len=a.sampleRate*d|0,b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<len;i++)c[i]=Math.random()*2-1;const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type='highpass';f.frequency.value=k==='s'?1400:7000;g.gain.setValueAtTime(k==='s'?.35:.18,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f).connect(g).connect(ampOut());s.start(t)}}
function holds(arr,i){let n=1;while(arr[i+n]==='-')n++;return n}
function tickAmp(){const a=A(),T=TRACKS[cur];while(nextT<a.currentTime+.15){const i=stepI%T.L.length;
    if(stepI>=T.L.length*2){nextTrack(true);return}
    const l=T.L[i],b=T.B[i],dk=T.drum[i%T.drum.length];
    if(freq(l))vnote(freq(l),nextT,holds(T.L,i)*T.step*.95,T.wave,T.wave==='square'?.07:.16);
    if(freq(b))vnote(freq(b),nextT,holds(T.B,i)*T.step*.9,'triangle',.22);
    if(dk!=='.')drum(dk,nextT);
    nextT+=T.step;stepI++}}
function play(){arm();const a=A();a.resume&&a.resume();if(playing&&!paused)return;
  if(paused){paused=false;nextT=a.currentTime+.05;startT=a.currentTime-pauseAt}else{stepI=0;nextT=a.currentTime+.08;startT=nextT}
  playing=true;clearInterval(sched);sched=setInterval(tickAmp,25);ui();unlock('music')}
function pause(){if(!playing)return;paused=!paused;if(paused){clearInterval(sched);pauseAt=A().currentTime-startT}else play();ui()}
function stop(){playing=paused=false;clearInterval(sched);stepI=0;ui()}
function nextTrack(auto){cur=(cur+1)%TRACKS.length;if(playing){const a=A();stepI=0;nextT=Math.max(nextT,a.currentTime+.05);startT=nextT}ui()}
function prevTrack(){cur=(cur-1+TRACKS.length)%TRACKS.length;if(playing){stepI=0;nextT=A().currentTime+.05;startT=nextT}ui()}
function fmt(s){s=Math.max(0,s|0);return (s/60|0)+':'+String(s%60).padStart(2,'0')}
function ui(){const T=TRACKS[cur];$('#ampTitle').textContent=(cur+1)+'. landon - '+T.name+' ('+fmt(T.len)+')';$('.amp-title').classList.toggle('scroll',!reduce);
  $('#ampState').textContent=playing?(paused?'paused':'playing'):'stopped';$$('#ampPl button').forEach((b,i)=>b.classList.toggle('on',i===cur));
  const np=$('#nowPlaying');if(np){np.hidden=!(playing&&!paused);np.textContent='listening to: '+T.name}}
$('#ampPl').innerHTML='';TRACKS.forEach((t,i)=>{const b=document.createElement('button');b.innerHTML=`<span>${i+1}. ${t.name}</span><span>${fmt(t.len)}</span>`;b.ondblclick=b.onclick=()=>{cur=i;if(playing){stepI=0;nextT=A().currentTime+.05;startT=nextT}else play();ui()};$('#ampPl').append(b)});
$('#ampPlay').onclick=()=>{if(paused)pause();else play()};$('#ampPause').onclick=pause;$('#ampStop').onclick=stop;$('#ampNext').onclick=()=>nextTrack();$('#ampPrev').onclick=prevTrack;
$('#ampVol').oninput=()=>{if(ampG)ampG.gain.value=$('#ampVol').value/100*.5};
(()=>{const cv=$('#ampViz'),x=cv.getContext('2d'),d=new Uint8Array(32);(function lp(){x.fillStyle='#000';x.fillRect(0,0,80,26);
  if(an&&playing&&!paused){an.getByteFrequencyData(d);for(let i=0;i<16;i++){const h=Math.round(d[i+1]/255*24);for(let y=0;y<h;y+=2){x.fillStyle=y>18?'#e00000':y>12?'#e0e000':'#00d000';x.fillRect(i*5,25-y,4,1)}}
    const el=A().currentTime-startT,T=TRACKS[cur];$('#ampTime').textContent=fmt(el);$('#ampSeek').style.width=Math.min(100,el/T.len*100)+'%'}
  else{x.fillStyle='#003000';for(let i=0;i<16;i++)x.fillRect(i*5,24,4,1)}
  requestAnimationFrame(lp)})()})();
ui();

/* ================= top 8 ================= */
(()=>{const box=$('#top8');const F=[['MHF_Cow','bessie'],['MHF_Pig','pig'],['MHF_Chicken','chicken'],['MHF_Creeper','creeper'],['MHF_Enderman','enderman'],['MHF_Zombie','zombie'],['MHF_Skeleton','skeleton'],['MHF_Villager','villager']];
  const clicked=new Set(store.get('t8',[]));const msg=t=>$('#t8msg').textContent=t;
  const pl=(n,v,o)=>{if(armed)L.play(n,{vol:v,...(o||{})})};
  const SND={
    bessie:()=>{moo(true);return (L.pet?L.pet.get().name:'bessie')+': moo'},
    pig:()=>{pl('pig',.8);return 'oink'},
    chicken:()=>{pl('hen',.8);return 'bawk'},
    creeper:(fig)=>{if(armed){nz(1.3,.25,'highpass',2500,0,1,6000)}msg('sssssss...');setTimeout(()=>{pl('boom',.9);const w=$('#w-nav');w.classList.remove('shake');void w.offsetWidth;w.classList.add('shake');msg('aw man');unlock('creeper')},1300);return null},
    enderman:(fig)=>{pl('teleport',.7);const figs=[...box.children];box.insertBefore(fig,rnd(figs));return 'dont look at him'},
    zombie:()=>{pl('bear',.7,{rate:.7});return 'uuuhhh'},
    skeleton:()=>{pl('dice',.7,{rate:1.3});return '*bone noises*'},
    villager:()=>{pl('goat',.7,{rate:.7});return 'hrmm'},
  };

  F.forEach(([u,n])=>{const f=document.createElement('figure');f.tabIndex=0;f.setAttribute('role','button');f.dataset.tip=n==='bessie'?'my cow':n;
    const im=new Image();im.alt=n;im.src='https://mc-heads.net/avatar/'+u+'/40';im.onerror=()=>{const s=svg(n==='creeper'?'mine':'cow',40);im.replaceWith(s)};
    im.oncontextmenu=e=>{e.preventDefault();noSteal()};
    const c=document.createElement('figcaption');c.textContent=n==='bessie'?(L.pet?L.pet.get().name:'bessie'):n;f.append(im,c);
    const go=()=>{f.classList.remove('hit');void f.offsetWidth;f.classList.add('hit');const r=SND[n](f);if(r)msg(r);clicked.add(n);store.set('t8',[...clicked]);if(clicked.size>=8)unlock('bff')};
    f.onclick=go;f.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}};box.append(f)});
})();

/* ================= shoutbox ================= */
(()=>{const l=$('#shl');let list=store.get('shout',[{n:'landon',m:'first',t:'4:20'},{n:'bessie',m:'moo',t:'4:21'},{n:'moo-ssistant',m:'did you know you can type help in the terminal',t:'4:22'}]);
  const now=()=>new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}).toLowerCase().replace(/\s?[ap]m/,'');
  function draw(){l.innerHTML='';list.slice(-40).forEach(e=>{const d=document.createElement('div');const t=document.createElement('span');t.className='t';t.textContent='['+e.t+'] ';const b=document.createElement('b');b.textContent=e.n+': ';d.append(t,b,document.createTextNode(e.m));l.append(d)});l.scrollTop=l.scrollHeight}
  function add(n,m){list.push({n,m,t:now()});list=list.slice(-40);store.set('shout',list);draw()}
  function reply(m){const t=m.toLowerCase();let r;
    if(t.includes('moo'))r=['bessie','moo'];else if(/\b(hi|hey|hello|sup|yo)\b/.test(t))r=['landon','hi'];else if(t.includes('cool'))r=['landon','thanks'];else if(t.includes('?'))r=['moo-ssistant','idk ask the cow'];
    else r=rnd([['bessie','moo'],['landon','real'],['landon','lol'],['moo-ssistant','have you tried turning it off and on again'],['the poll','cow is winning btw'],['creeper','sssss'],['landon','make sure to come back so i get money']]);
    setTimeout(()=>{add(r[0],r[1]);SFX.pop()},1200+Math.random()*1800)}
  $('#shf').onsubmit=e=>{e.preventDefault();const v=$('#shi').value.trim();if(!v){SFX.error();return}add(store.get('shName','you'),v);$('#shi').value='';unlock('shout');reply(v)};
  L.shout=(m)=>{add(store.get('shName','you'),m);unlock('shout');reply(m)};draw()})();

/* ================= link to me / awards / blinkies ================= */
$('#lnk').value='<a href="https://landon.cool">landon.cool - the best website in my house</a>';
$('#lnkCopy').onclick=()=>{const t=$('#lnk');t.select();(navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).catch(()=>{try{document.execCommand('copy')}catch(e){}}).finally(()=>{dialog({title:'copied!',ic:'star',html:'copied!! now put it on your website<br>i will know if you dont'});unlock('link')})};
const AW=[['golden cow award 2026','thank you to the academy'],['best website in my house','i voted for myself'],['site of the day','every day actually'],['most moos per page','a record']];
AW.forEach(([n,r])=>{const b=document.createElement('button');b.className='award';b.append(svg('trophy',18));b.append(n);b.onclick=()=>{SFX.ding();L.status(r)};$('#awards').append(b)});
const BL=['i <3 cows','minecraft addict','certified gamer','i survived y2k','debian user','proud scratcher','gta iv > gta v','powered by moo','no flash no problem','i read the readme'];
BL.forEach((t,i)=>{const b=document.createElement('button');b.className='blinkie';b.textContent=t;b.style.setProperty('--sp',(0.6+(i%4)*.35)+'s');b.onclick=()=>{b.classList.remove('spin');void b.offsetWidth;b.classList.add('spin');setTimeout(()=>b.classList.remove('spin'),650)};$('#blinkies').append(b)});

/* ================= dialogs + popups ================= */
let dn=0;
function dialog({title='landon.cool',ic='globe',html='',width=300,buttons=[['ok']],sound='ding'}={}){const w=document.createElement('div');w.className='win out dlg';w.id='dlg'+(++dn);w.dataset.title=title;w.dataset.ic=ic;w.hidden=true;
  w.innerHTML='<div class="tbar"><svg class="pix" width="14" height="14"></svg><span class="ttl"></span><span class="grip"></span><button class="tbtn" data-act="close" aria-label="close"><svg class="pix" width="8" height="8"></svg></button></div><div class="wbody"><div class="dlg-b"><svg class="pix dlg-ic" width="32" height="32"></svg><div class="dlg-t"></div></div><div class="row dlg-btns"></div></div>';
  const ss=$$('svg',w);L.paint(ss[0],ic);L.paint(ss[1],'wx');L.paint(ss[2],ic);$('.ttl',w).textContent=title;$('.dlg-t',w).innerHTML=html;
  w.style.width=Math.min(width,innerWidth-20)+'px';w.style.left=Math.max(10,Math.random()*(innerWidth-width-40)+20|0)+'px';w.style.top=Math.max(10,Math.random()*(innerHeight-260)|0)+'px';
  const row=$('.dlg-btns',w);buttons.forEach(([label,fn])=>{const b=document.createElement('button');b.className='btn';b.textContent=label;b.onclick=()=>{const keep=fn&&fn(w);if(keep!==true)L.closeWin(w)};row.append(b)});
  document.body.append(w);window.wireWin(w);w.hidden=false;w.dataset.open='1';window.focusWin(w);(SFX[sound]||SFX.ding)();setTimeout(()=>{const b=$('.dlg-btns .btn',w);b&&b.focus({preventScroll:true})},50);return w}
on('close',id=>{if(id&&id.startsWith('dlg'))setTimeout(()=>{const w=document.getElementById(id);w&&w.remove()},50)});
L.dialog=dialog;
function progress(w,label,ms,done){const t=$('.dlg-t',w);t.innerHTML='';const p=document.createElement('div');p.textContent=label;const bar=document.createElement('div');bar.className='bar';const i=document.createElement('i');i.style.width='0';bar.append(i);t.append(p,bar);
  $('.dlg-btns',w).innerHTML='';let v=0;const iv=setInterval(()=>{v=Math.min(100,v+Math.random()*12);i.style.width=v+'%';if(v>=100){clearInterval(iv);done(t,w)}},ms/12)}
const POPS=[
 ()=>dialog({title:'congratulations!!!',ic:'trophy',html:'<b>you are the 1,000,000th visitor!!</b><br>click below to claim your prize',buttons:[['claim prize',()=>{setTimeout(()=>dialog({title:'your prize',ic:'star',html:'you won: nothing<br>but you did get an achievement'}),200);unlock('prize')}],['no thanks']]}),
 ()=>dialog({title:'cow antivirus 2003',ic:'eye',sound:'error',html:'<b>warning:</b> your computer may be infected with moo.<br>scan now?',buttons:[['scan now',w=>{progress(w,'scanning c:\\ for moo...',2600,(t,w)=>{t.innerHTML='scan complete.<br>found 1 cow. its fine. he lives here now';const b=document.createElement('button');b.className='btn';b.textContent='ok';b.onclick=()=>L.closeWin(w);$('.dlg-btns',w).append(b);SFX.notify();unlock('scan')});return true}],['ignore']]}),
 ()=>dialog({title:'hot cows in your area',ic:'cow',html:'<b>hot cows in your area</b> want to moo at you',buttons:[['moo back',()=>moo(true)],['close']]}),
 ()=>dialog({title:'free robux',ic:'star',html:'click here for <b>free robux</b>!!!',buttons:[['get robux',()=>setTimeout(()=>dialog({title:'error',ic:'wx',sound:'error',html:'no'}),200)],['close']]}),
 ()=>dialog({title:'low memory',ic:'gear',sound:'error',html:'your computer is low on ram.<br>download more ram?',buttons:[['download',w=>{progress(w,'downloading ram...',3000,(t,w)=>{t.innerHTML='downloaded 0 bytes of ram.<br>try again never';const b=document.createElement('button');b.className='btn';b.textContent='ok';b.onclick=()=>L.closeWin(w);$('.dlg-btns',w).append(b)});return true}],['no']]}),
 ()=>dialog({title:'you have (1) new message',ic:'chat',sound:'notify',html:'from: bessie<br>subject: moo<br><br>moo',buttons:[['reply',()=>moo(true)],['delete']]}),
 ()=>dialog({title:'netscape navigator',ic:'globe',html:'this site is best viewed in netscape navigator 4.0.<br>you are using something else. thats fine i guess',buttons:[['ok'],['download netscape',()=>setTimeout(()=>dialog({title:'error',ic:'wx',sound:'error',html:'netscape is dead. sorry'}),200)]]}),
];
let pi=Math.random()*POPS.length|0;
function popup(){POPS[pi++%POPS.length]()}
L.popup=popup;
function popLoop(ms){setTimeout(()=>{if(mods.popups.on&&!document.hidden&&!$('.dlg')&&$('#splash').hidden)popup();popLoop(240000+Math.random()*120000)},ms)}
popLoop(80000);
function noSteal(){dialog({title:'no stealing',ic:'wx',sound:'error',html:'<b>right click is disabled.</b><br>this content is protected by cow law'})}
document.addEventListener('contextmenu',e=>{if(e.target.tagName==='IMG'){e.preventDefault();noSteal()}});

/* ================= cursor text ================= */
(()=>{const ct=$('#ctext'),word='landon.cool';const ls=[...word].map(ch=>{const s=document.createElement('span');s.textContent=ch;ct.append(s);return {el:s,x:-50,y:-50}});
  let mx=-50,my=-50,run=false,t=0;addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY},{passive:true});
  function lp(){if(!mods.ctext.on||reduce){ct.hidden=true;run=false;return}ct.hidden=false;t+=.08;ls.forEach((l,i)=>{const tx=i?ls[i-1].x+11:mx+14,ty=i?ls[i-1].y:my+18;l.x+=(tx-l.x)*.4;l.y+=(ty-l.y)*.4;l.el.style.transform=`translate(${l.x|0}px,${(l.y+Math.sin(t+i*.6)*4)|0}px)`});requestAnimationFrame(lp)}
  const start=()=>{if(!run&&mods.ctext.on){run=true;lp()}};on('mod',id=>{if(id==='ctext')start()});start()})();

/* ================= status bar scroller ================= */
(()=>{const M=['welcome to landon.cool','sign the guestbook!!','best viewed at 800x600','cowamp is on the desktop','make sure to come back so i get money','theres a cheat code. the famous one','done'];let i=0;
  setInterval(()=>{const s=$('#stxt');if(s.textContent==='done'||M.includes(s.textContent)){s.textContent=M[i++%M.length]}},3500)})();

/* ================= terminal ================= */
const CM=L.COMMANDS;
CM.music=a=>{L.openWin('w-amp');if(a[0]==='stop'){stop();return 'stopped'}if(a[0]==='next'){nextTrack();return 'next'}play();return 'now playing: '+TRACKS[cur].name};
CM.cowamp=CM.music;
CM.shout=a=>{if(!a.length)return 'usage: shout <message>';L.shout(a.join(' '));return 'shouted'};
CM.popup=()=>{popup();return 'here you go'};
CM.top8=()=>'bessie, pig, chicken, creeper, enderman, zombie, skeleton, villager. in that order. dont tell them';
CM.myspace=()=>'thanks for the add!';
L.hidden.push('myspace');
})();
