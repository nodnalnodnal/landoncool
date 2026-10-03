// up up down down left right left right b a, anywhere on the site
(function(){
  if(window.__konami)return;window.__konami=1;
  const code=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let i=0,on=false,st,rain,off;
  addEventListener('keydown',e=>{
    if(e.key==='Escape'&&on)return stop();
    const k=e.key.length===1?e.key.toLowerCase():e.key;
    i=k===code[i]?i+1:(k===code[0]?1:0);
    if(i===code.length){i=0;on?stop():go()}
  });
  let ac;
  function moo(){
    try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();
    const a=ac,t=a.currentTime,base=80+Math.random()*60,o=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();
    o.type='sawtooth';o.frequency.setValueAtTime(base*1.2,t);o.frequency.linearRampToValueAtTime(base*1.45,t+.25);o.frequency.linearRampToValueAtTime(base,t+1.1);
    f.type='lowpass';f.Q.value=7;f.frequency.setValueAtTime(350,t);f.frequency.linearRampToValueAtTime(1300,t+.3);f.frequency.linearRampToValueAtTime(280,t+1.1);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2,t+.12);g.gain.setValueAtTime(.2,t+.8);g.gain.linearRampToValueAtTime(0,t+1.2);
    o.connect(f);f.connect(g);g.connect(a.destination);o.start(t);o.stop(t+1.25)}catch(e){}
  }
  function go(){
    on=true;moo();
    st=document.createElement('style');
    st.textContent=`*{font-family:"Comic Sans MS","Comic Neue",cursive!important}
html{animation:__k1 3s linear infinite}
body{animation:__k2 9s ease-in-out infinite;transform-origin:50% 40%}
.__moo{position:fixed;top:-40px;z-index:2147483647;pointer-events:none;font:bold 22px "Comic Sans MS",cursive;color:#ff00aa;text-shadow:2px 2px 0 #ff0;animation:__k3 linear forwards}
@keyframes __k1{to{filter:hue-rotate(360deg)}}
@keyframes __k2{0%,100%{transform:rotate(0)}25%{transform:rotate(3deg) scale(1.02)}50%{transform:rotate(-2deg)}75%{transform:rotate(180deg) scale(.9)}}
@keyframes __k3{to{transform:translateY(110vh) rotate(720deg)}}`;
    document.head.appendChild(st);
    rain=setInterval(()=>{const d=document.createElement('div');d.className='__moo';d.textContent=Math.random()<.85?'moo':'moooooo';d.style.left=Math.random()*100+'vw';d.style.animationDuration=(2+Math.random()*3)+'s';document.documentElement.appendChild(d);setTimeout(()=>d.remove(),5200)},120);
    off=setTimeout(stop,15000);
  }
  function stop(){on=false;clearInterval(rain);clearTimeout(off);st&&st.remove()}
})();
