/* landon.cool fx: wallpaper, browser chrome polish, wobbly windows, tray balloons,
   my computer, reveals and secrets. loads after main.js, extras.js and retro.js. */
(()=>{const L=window.LC;if(!L)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const {store,reduce,moo}=L;const root=document.documentElement;
const on=(n,f)=>addEventListener('lc:'+n,e=>f(e.detail));
const sfx=n=>{try{L.SFX&&L.SFX[n]&&L.SFX[n]()}catch(e){}};
const unlock=id=>L.unlock&&L.unlock(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fine=matchMedia('(pointer:fine)').matches;
const svg=(name,w)=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','pix');s.setAttribute('width',w);s.setAttribute('height',w);L.paint(s,name);return s};
function safe(name,fn){try{fn()}catch(e){console.warn('fx '+name,e)}}

// extra pixel icons
Object.assign(L.P,{
 pc:["############","#..........#","#.########.#","#.#......#.#","#.#......#.#","#.#......#.#","#.########.#","#..........#","############","....####....","..########.."],
 folder:[".####.......","#....######.","#..........#","############","#..........#","#..........#","#..........#","#..........#","############"],
 rocket:[".....##.....","....####....","....#..#....","...##..##...","...#.##.#...","...#.##.#...","...#....#...","..##....##..",".###.##.###.","##..####..##",".....##.....","....#..#...."],
 globe2:["...######...",".##..##..##.","#...#..#...#","############","#...#..#...#","#...#..#...#","############","#...#..#...#",".##..##..##.","...######..."],
});

/* ================= 1. dithered desktop wallpaper ================= */
safe('wallpaper',()=>{
  const cv=document.createElement('canvas');cv.id='wall';cv.setAttribute('aria-hidden','true');document.body.prepend(cv);
  const g=cv.getContext('2d');const PX=3;let W=0,H=0,img=null,on0=0,off0=0,skip=false,last=0;
  const BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
  const clouds=Array.from({length:6},()=>({x:Math.random(),y:.06+Math.random()*.3,s:.6+Math.random()*.8,v:.003+Math.random()*.005,seed:Math.random()*10}));
  const hex=h=>{h=(h||'').trim().replace('#','');if(h.length===3)h=h.replace(/./g,'$&$&');const n=parseInt(h,16)||0;return [n>>16,(n>>8)&255,n&255]};
  const pack=([r,gg,b])=>(255<<24|b<<16|gg<<8|r)>>>0;
  function colors(){const cs=getComputedStyle(root);const d=hex(cs.getPropertyValue('--desk')),i=hex(cs.getPropertyValue('--ink'));
    const mix=(a,b,t)=>a.map((v,k)=>Math.round(v+(b[k]-v)*t));off0=pack(d);on0=pack(mix(d,i,.16));skip=root.dataset.theme==='moo'}
  function size(){W=Math.ceil(innerWidth/PX);H=Math.ceil(innerHeight/PX);cv.width=W;cv.height=H;img=g.createImageData(W,H)}
  const hill=(xx,ph,amp,base,f)=>base-amp*(Math.sin(xx*f+ph)*.6+Math.sin(xx*f*2.3+ph*1.7)*.25+Math.sin(xx*f*5.1+ph*.3)*.15);
  function render(t){const buf=new Uint32Array(img.data.buffer);const sec=t/1000;
    clouds.forEach(c=>{c.x+=c.v*(reduce?0:1)/60;if(c.x>1.3)c.x=-.3});
    for(let y=0;y<H;y++){const fy=y/H;for(let xx=0;xx<W;xx++){const fx=xx/W;let v;
      const far=hill(fx,1.2,.06,.70,7),near=hill(fx,4.0,.08,.80,4.2);
      if(fy>near)v=.62+((xx*7+y*13)%9===0?.25:0);
      else if(fy>far)v=.38;
      else{v=Math.max(0,(fy-.25))*.45;
        // sun
        const sx=fx-.82,sy=(fy-.2)*H/W;if(sx*sx+sy*sy<.0016)v=.95;
        for(const c of clouds){const dx=(fx-c.x)/(.07*c.s),dy=(fy-c.y)*H/W/(.025*c.s);let d=dx*dx*.5+dy*dy*1.6;d+=Math.sin(dx*3+c.seed)*.25;if(d<1)v=Math.max(v,(1-d)*.85)}}
      buf[y*W+xx]=v>BAY[(y&3)*4+(xx&3)]?on0:off0}}
    g.putImageData(img,0,0);
    // a little cow grazing on the hill
    const cx=Math.round(W*.62),gy=Math.round(H*hill(cx/W,4.0,.08,.80,4.2));L.drawCow(g,cx,gy-P_cowH()+1,1,((t/4000)|0)%2)}
  const P_cowH=()=>L.P.cow.length;
  function loop(t){if(skip||innerWidth<=700||document.hidden){cv.style.display=skip?'none':'';setTimeout(()=>requestAnimationFrame(loop),1000);return}
    cv.style.display='';if(t-last>110){last=t;render(t)}requestAnimationFrame(loop)}
  addEventListener('resize',()=>{size();last=0});on('theme',()=>{colors();last=0});
  new MutationObserver(()=>{colors();last=0}).observe(root,{attributes:true,attributeFilter:['data-theme']});
  colors();size();requestAnimationFrame(loop);
});

/* ================= 4a. tray balloons ================= */
let balloon=()=>{};
safe('balloons',()=>{const box=document.createElement('div');box.id='balloons';box.setAttribute('aria-live','polite');document.body.append(box);
  balloon=(title,text,ic='cow',ms=6500)=>{const b=document.createElement('div');b.className='balloon';
    b.innerHTML=`<b></b>${text?'<p></p>':''}<button class="bx" aria-label="close">x</button>`;b.querySelector('b').append(svg(ic,14),title);if(text)b.querySelector('p').textContent=text;
    box.append(b);while(box.children.length>3)box.firstChild.remove();sfx('notify');
    const gone=()=>{if(!b.parentNode)return;b.classList.add('out');setTimeout(()=>b.remove(),260)};b.querySelector('.bx').onclick=gone;setTimeout(gone,ms);return b};
  L.balloon=balloon;
  // once per visit, after you get in
  let said=false;try{said=sessionStorage.getItem('lc_hi')}catch(e){}
  if(!said){const hi=()=>{try{sessionStorage.setItem('lc_hi','1')}catch(e){}setTimeout(()=>balloon('welcome to landon.cool','the cow on the logo is clickable. so is basically everything else','cow',8000),1400)};
    const sp=$('#splash');if(sp&&!sp.hidden){const b=$('#spEnter');b&&b.addEventListener('click',hi,{once:true})}else hi()}
});

/* ================= 4b. tooltips type themselves out ================= */
safe('tooltips',()=>{const tip=$('#tip');if(!tip)return;let typer;
  new MutationObserver(()=>{if(tip.hidden||tip.dataset.typing)return;const full=tip.textContent;if(!full||reduce)return;clearInterval(typer);tip.dataset.typing='1';let i=0;tip.textContent='';
    typer=setInterval(()=>{i+=2;tip.textContent=full.slice(0,i);if(i>=full.length){clearInterval(typer);delete tip.dataset.typing}},14)}).observe(tip,{attributes:true,attributeFilter:['hidden']});
});

/* ================= 2. browser chrome ================= */
safe('chrome',()=>{const st=$('#stxt'),addr=$('#addr'),page=$('#page'),nav=$('#w-nav');
  // status bar shows where a link goes
  document.addEventListener('mouseover',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a||!st)return;const h=a.getAttribute('href');
    st.dataset.hov='1';st.textContent=h.startsWith('#')?(h==='#'?'javascript:void(0)':'http://landon.cool/'+h):a.href.replace(/^https?:\/\/[^/]+/,'http://landon.cool')});
  document.addEventListener('mouseout',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a||!st||!st.dataset.hov)return;delete st.dataset.hov;st.textContent='done'});
  // loading bar in the address bar when you leave the page
  const bar=document.createElement('i');bar.className='load';addr.append(bar);
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button||e.ctrlKey||e.metaKey||e.shiftKey)return;
    if(a.target==='_blank'||a.origin!==location.origin||(a.pathname===location.pathname&&a.hash)||a.getAttribute('href').startsWith('#'))return;
    bar.style.width='35%';setTimeout(()=>bar.style.width='85%',140);$('#spin')&&$('#spin').classList.add('go')});
  addEventListener('pageshow',()=>{bar.style.width='0';$('#spin')&&$('#spin').classList.remove('go')});
  // bookmark star
  const old=$('#addr > span[aria-hidden]');if(old){const b=document.createElement('button');b.type='button';b.className='star';b.setAttribute('aria-label','bookmark');b.dataset.tip='bookmark this page';b.append(svg('star',12));old.replaceWith(b);
    let onn=false;b.onclick=e=>{e.preventDefault();onn=!onn;b.classList.toggle('on',onn);sfx(onn?'on':'off');
      if(onn)balloon('bookmarked! (sort of)','press '+(/Mac/.test(navigator.platform)?'cmd':'ctrl')+'+d to really bookmark it. websites stopped being allowed to do that around 2006','star')}}
  // tab labels decrypt out of noise on hover
  $$('.tab:not(.plus)').forEach(t=>{const tn=[...t.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).pop();if(!tn)return;const text=tn.textContent;let tm;
    t.addEventListener('mouseenter',()=>{if(reduce)return;let n=0;clearInterval(tm);tm=setInterval(()=>{n++;tn.textContent=text.split('').map((c,i)=>c===' '||i<n/2?c:'#%&*+=?01<>/'[Math.random()*12|0]).join('');
      if(n/2>=text.length){clearInterval(tm);tn.textContent=text}},22)})});
  // + tab opens a random page on the site
  const plus=$('.tab.plus');if(plus){plus.removeAttribute('aria-hidden');plus.setAttribute('role','button');plus.tabIndex=0;plus.dataset.tip='open a random page';
    const go=()=>{const p=PAGES[Math.random()*PAGES.length|0];location.href=p[0]};plus.onclick=go;plus.onkeydown=e=>{if(e.key==='Enter')go()}}
  // scroll meter + back to top rocket
  const meter=document.createElement('div');meter.className='smeter';meter.innerHTML='<i></i>';page.before(meter);
  const rk=document.createElement('button');rk.className='rocket btn';rk.setAttribute('aria-label','back to top');rk.dataset.tip='back to top';rk.append(svg('rocket',18));nav.querySelector('.wbody').append(rk);
  const onScroll=()=>{const max=page.scrollHeight-page.clientHeight,p=max>0?page.scrollTop/max:0;meter.firstChild.style.width=(p*100).toFixed(1)+'%';rk.classList.toggle('show',page.scrollTop>700)};
  page.addEventListener('scroll',()=>requestAnimationFrame(onScroll),{passive:true});onScroll();
  rk.onclick=()=>{rk.classList.add('launch');try{L.play('laser',{vol:.5,rate:.8})}catch(e){}page.scrollTo({top:0,behavior:reduce?'auto':'smooth'});setTimeout(()=>rk.classList.remove('launch'),900)};
});

/* ================= 3. wobbly windows, runaway close, crt power ================= */
safe('windows',()=>{
  // tilt while dragging, wobble when you let go
  let drag=null;
  document.addEventListener('pointerdown',e=>{const bar=e.target.closest&&e.target.closest('.win .tbar');if(!bar||e.target.closest('button')||e.button||innerWidth<=700||reduce)return;
    const w=bar.closest('.win');if(w.classList.contains('max'))return;drag={w,lx:e.clientX,t:performance.now(),vx:0,rot:0};cancelAnimationFrame(w._wob)},true);
  addEventListener('pointermove',e=>{if(!drag)return;const now=performance.now();drag.vx=(e.clientX-drag.lx)/Math.max(1,now-drag.t)*16;drag.lx=e.clientX;drag.t=now;
    drag.rot+=(Math.max(-4,Math.min(4,drag.vx*.35))-drag.rot)*.35;drag.w.style.transform=`rotate(${drag.rot.toFixed(2)}deg)`});
  addEventListener('pointerup',()=>{if(!drag)return;const w=drag.w;let r=drag.rot,v=0;drag=null;let last=performance.now();
    (function step(now){const dt=Math.min(.032,(now-last)/1000);last=now;v+=(-r*220-v*10)*dt;r+=v*dt;if(Math.abs(r)<.02&&Math.abs(v)<.05){w.style.transform='';return}
      w.style.transform=`rotate(${r.toFixed(2)}deg)`;w._wob=requestAnimationFrame(step)})(last)});
  // closing the browser? are you sure?
  const cb=$('#w-nav [data-act=close]');let allow=false;
  cb.addEventListener('click',e=>{if(allow){allow=false;return}e.stopImmediatePropagation();e.preventDefault();
    const d=L.dialog({title:'close cow navigator?',ic:'globe',sound:'error',width:320,html:'are you sure you want to close the website?<br><span class="small">the cow will be sad</span>',
      buttons:[['yes',()=>{allow=true;unlock('nope');cb.click()}],['no']]});
    const yes=[...d.querySelectorAll('.dlg-btns .btn')].find(b=>b.textContent==='yes');if(!yes)return;yes.classList.add('runaway');let dodges=0;
    d.addEventListener('pointermove',ev=>{const r=yes.getBoundingClientRect();if(Math.hypot(ev.clientX-(r.left+r.width/2),ev.clientY-(r.top+r.height/2))>70||dodges>12)return;dodges++;
      const box=d.getBoundingClientRect();yes.style.transform=`translate(${((Math.random()-.5)*(box.width-90))|0}px,${(-Math.random()*(box.height-90))|0}px)`;if(dodges===12)yes.textContent='fine. yes.'})},true);
  // crt power off / on
  const crt=(kind,done)=>{if(reduce){done&&done();return}const el=document.createElement('div');el.className='crtp '+kind;el.innerHTML='<i></i>';document.body.append(el);
    setTimeout(()=>{el.remove();done&&done()},kind==='off'?760:900)};
  const shut=$('#shut');if(shut)shut.addEventListener('click',e=>{e.stopImmediatePropagation();const sm=$('#smenu');if(sm)sm.hidden=true;const st=$('#start');st&&st.setAttribute('aria-expanded','false');
    sfx('shutdown');L.emit('shut');crt('off',()=>{$('#off').hidden=false})},true);
  const off=$('#off');if(off)off.addEventListener('click',e=>{e.stopImmediatePropagation();off.hidden=true;crt('on');sfx('startup')},true);
});

/* ================= 5. my computer ================= */
const PAGES=[
 ['/ascii/','ascii cam','eye'],['/awake/','is landon awake','eye'],['/bonk/','bonk','punch'],['/button/','the button','star'],['/certificate/','certificate','txt'],['/clicker/','cow clicker','cow'],['/countdown/','countdown','gear'],
 ['/cow/','cow','cow'],['/cowify/','cowify (extension)','cow'],['/dial-up/','dial-up','globe'],['/doors/','doors','folder'],['/elevator/','elevator','folder'],['/fake-update/','fake update','gear'],
 ['/flip/','flip a coin','star'],['/fridge/','the fridge','folder'],['/goose/','goose','chat'],['/guestbook/','guestbook','chat'],['/hold/','hold the button','star'],
 ['/lag/','lag','gear'],['/minecraft-time/','minecraft time','cube'],['/moo/','text the cow','chat'],['/moon/','moon','star'],['/oracle/','the oracle','eye'],['/pacman/','pacman','pac'],
 ['/pet/','cowgotchi','cow'],['/piano/','piano','note'],['/rain/','rain','globe2'],['/rate/','i rate things','trophy'],['/receipt/','receipt','txt'],
 ['/scream/','scream','chat'],['/screensaver/','screensaver','pc'],['/skin-ascii/','skin to ascii','cube'],['/stare/','hi','eye'],['/sus/','text cowifier','txt'],['/tv/','tv','pc'],
 ['/typewriter/','typewriter','txt'],['/void/','the void','folder'],['/weather/','local forecast','globe2'],['/wiki/','landonpedia','globe'],
 ['/innioasis.htm','innioasis g1 zone','gear'],['/plain.htm','plain (my language)','txt'],['/game.html','scratch game','cube'],
];
L.PAGES=PAGES;
safe('mycomputer',()=>{
  const w=document.createElement('div');w.className='win out';w.id='w-pc';w.hidden=true;w.dataset.title='my computer';w.dataset.ic='pc';
  w.innerHTML=`<div class="tbar"><svg class="pix" width="14" height="14"></svg><span class="ttl">my computer - c:\\landon.cool</span><span class="grip"></span>
    <button class="tbtn" data-act="min" aria-label="minimize"><svg class="pix" width="8" height="8"></svg></button><button class="tbtn" data-act="close" aria-label="close"><svg class="pix" width="8" height="8"></svg></button></div>
    <div class="wbody"><div class="pc-bar in"><span>c:\\landon.cool\\</span><input class="pc-q" placeholder="search" aria-label="search pages" spellcheck="false"></div><div class="pc-grid in"></div><div class="pc-st small"></div></div>`;
  const ss=w.querySelectorAll('svg');L.paint(ss[0],'pc');L.paint(ss[1],'wmin');L.paint(ss[2],'wx');
  $('#taskbar').before(w);window.wireWin(w);
  const grid=w.querySelector('.pc-grid'),q=w.querySelector('.pc-q'),st=w.querySelector('.pc-st');
  const seen=new Set(store.get('pcSeen',[]));
  function draw(){const f=q.value.trim().toLowerCase();grid.innerHTML='';let n=0;
    PAGES.forEach(([href,name,ic])=>{if(f&&!name.includes(f)&&!href.includes(f))return;n++;const a=document.createElement('a');a.className='pc-item';a.href=href;a.dataset.tip=href;
      a.append(svg(ic,30));const s=document.createElement('span');s.textContent=name;a.append(s);if(seen.has(href))a.classList.add('seen');
      a.addEventListener('click',()=>{seen.add(href);store.set('pcSeen',[...seen]);if(seen.size>=5)unlock('explorer')});grid.append(a)});
    st.textContent=n+' object(s)'+(f?' matching "'+f+'"':'')+' . '+seen.size+' visited'}
  q.oninput=draw;draw();
  // desktop icon + start menu
  const ic=document.createElement('button');ic.className='dicon';ic.dataset.open='w-pc';ic.dataset.ic='pc';ic.dataset.tip='every page on the site';
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','pix');s.setAttribute('width',30);s.setAttribute('height',30);L.paint(s,'pc');
  const lb=document.createElement('span');lb.textContent='my computer';ic.append(s,lb);$('#icons').prepend(ic);setTimeout(()=>dispatchEvent(new Event('resize')),0);
  const sm=$('#smenu ul');if(sm){const li=document.createElement('li');li.innerHTML='<button data-open="w-pc"></button>';const b=li.firstChild;b.append(svg('pc',16));
    const t=document.createElement('span');t.innerHTML='my computer<small>every page on the site</small>';b.append(t);sm.insertBefore(li,sm.children[1])}
  L.COMMANDS.pages=()=>{L.openWin('w-pc');return PAGES.map(p=>p[0].padEnd(20)+p[1]).join('\n')};
  L.COMMANDS.random=()=>{const p=PAGES[Math.random()*PAGES.length|0];setTimeout(()=>location.href=p[0],500);return 'going to '+p[1]+'...'};
});

/* ================= 6. facts, reveals, tilt cards ================= */
safe('reveals',()=>{const page=$('#page');
  // facts row under the hero
  const ach=$('.ach-row');if(ach){const f=document.createElement('div');f.className='facts';
    const facts=[[PAGES.length+1,'pages'],[(L.ACH||[]).length||34,'achievements'],[7,'themes'],[1,'cow']];
    f.innerHTML=facts.map(([n,l])=>`<div class="fact"><b data-count="${n}">${n}</b><span>${l}</span></div>`).join('');ach.before(f)}
  const count=el=>{const to=+el.dataset.count,t0=performance.now();(function st(now){const p=Math.min(1,(now-t0)/900);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(st)})(t0)};
  const els=[...$$('#page h2'),...$$('.facts')];
  if(reduce||!('IntersectionObserver' in window))return;
  root.classList.add('rv');
  const io=new IntersectionObserver(es=>es.forEach(en=>{if(!en.isIntersecting)return;io.unobserve(en.target);en.target.classList.add('shown');$$('[data-count]',en.target).forEach(count)}),{root:page,rootMargin:'0px 0px -30px 0px'});
  els.forEach(el=>io.observe(el));
  // project cards tilt toward the mouse with a glare
  if(fine)$$('#projects fieldset').forEach(c=>{c.classList.add('tilt');
    c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
      c.style.setProperty('--ry',((px-.5)*10).toFixed(2)+'deg');c.style.setProperty('--rx',((.5-py)*10).toFixed(2)+'deg');c.style.setProperty('--gx',(px*100).toFixed(1)+'%');c.style.setProperty('--gy',(py*100).toFixed(1)+'%');c.classList.add('tilting')});
    c.addEventListener('pointerleave',()=>{c.classList.remove('tilting');c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg')})});
});

/* ================= 7. secrets ================= */
safe('secrets',()=>{let typed='';
  addEventListener('keydown',e=>{if(e.target.matches&&e.target.matches('input,textarea')||e.ctrlKey||e.metaKey||e.altKey||e.key.length!==1)return;typed=(typed+e.key.toLowerCase()).slice(-7);
    if(typed.endsWith('moo')){typed='';doWave()}
    if(typed.endsWith('cowlord')){typed='';moo(true);balloon('hey thats me','mrcowlord. hi','cow')}});
  function doWave(){if(reduce)return;$$('#page .cols > main > *, #page aside > *').forEach((el,i)=>el.style.setProperty('--n',i%12));root.classList.remove('waved');void root.offsetWidth;root.classList.add('waved');
    setTimeout(()=>root.classList.remove('waved'),2600);moo(true);unlock('wave');balloon('you found it','the whole page did the wave. type it again, i dare you','cow')}
  // look away and the tab title begs, the favicon blinks
  const fav=$('#favicon');let normal=fav?fav.href:'',inverted=null,tm;const T=document.title;
  if(fav){const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,32,32);g.globalCompositeOperation='difference';g.drawImage(im,0,0,32,32);inverted=c.toDataURL()}catch(e){}};im.src=normal}
  document.addEventListener('visibilitychange',()=>{clearInterval(tm);if(document.hidden){const msg='come back so i get money ... the cow misses you ... ';let i=0;
      tm=setInterval(()=>{i++;document.title=(msg+msg).slice(i%msg.length,i%msg.length+24);if(fav&&inverted)fav.href=i%2?inverted:normal},400)}
    else{document.title=T;if(fav)fav.href=normal}});
});
})();
