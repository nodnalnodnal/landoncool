// draws a cowspace profile at landon.cool/@name. 404.html loads this when the
// path starts with /@ (github pages has no real page there, so it 404s to us)
// waits for the page either way, since it's added with document.write from <head>
const csProfile = async () => {
  const name = location.pathname.match(/^\/@([a-z0-9_]{3,16})/i)[1].toLowerCase();
  const esc = CS.esc;
  document.title = name + ' on cowspace';

  const style = document.createElement('style');
  style.textContent = `
    html,body{height:100%;margin:0}
    body{display:flex!important;flex-direction:column;background:#e5e5e5!important;padding:0!important;font:13px Verdana,Tahoma,sans-serif;color:#111}
    .csbar{background:#036;color:#fff;padding:6px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .csbar .logo{font:bold 18px Verdana,sans-serif;color:#fff;text-decoration:none;letter-spacing:-1px}
    .csbar .logo span{color:#fc0}
    .csbar .sp{flex:1}
    .csbar a.l{color:#cde;font-size:12px}
    .csbar button{font:bold 12px Verdana;background:#fc0;border:1px solid #a80;padding:3px 10px;cursor:pointer}
    #csframe{flex:1;width:100%;border:0;background:#fff}
    .csmsg{margin:40px auto;max-width:420px;text-align:center;background:#fff;border:1px solid #6699cc;padding:20px}`;
  document.head.appendChild(style);
  document.body.innerHTML = `<div class="csbar"><a class="logo" href="/cowspace/">cow<span>space</span></a>
    <span id="csSong"></span><span class="sp"></span><span id="csMe"></span>
    <a class="l" href="/cowspace/members/">members</a><a class="l" href="/">landon.cool</a></div>
    <iframe id="csframe" sandbox="allow-scripts allow-top-navigation-by-user-activation" title="${esc(name)}'s profile"></iframe>`;
  document.documentElement.classList.remove('cs-profile');
  const frame = document.getElementById('csframe');

  // everything the profile shows. the frame gets rebuilt from this after every click
  const st = { user: null, relation: 'guest', canPost: false, comments: [], total: 0, more: false, error: '', draft: '', thumbs: [], buttonUrl: null, stickers: [] };

  async function loadUser(view) {
    const j = await CS.api(`/user?u=${encodeURIComponent(name)}${view ? '&view=1' : ''}`);
    st.user = j.user; st.relation = j.relation; st.canPost = j.canPost;
  }
  async function loadWall(append) {
    const before = append && st.comments.length ? `&before=${st.comments[st.comments.length - 1].id}` : '';
    const j = await CS.api(`/wall?u=${encodeURIComponent(name)}${before}`);
    st.comments = append ? st.comments.concat(j.comments) : j.comments;
    st.total = j.total; st.more = j.more; st.canPost = j.canPost;
  }
  function render(scroll) {
    frame.srcdoc = CS.profileDoc(st.user, { live: true, site: location.origin, relation: st.relation, canPost: st.canPost,
      wall: { comments: st.comments, total: st.total, more: st.more }, error: st.error, draft: st.draft, scroll,
      binderThumbs: st.thumbs, buttonUrl: st.buttonUrl, stickers: st.canPost ? st.stickers : [] });
  }

  try { await Promise.all([loadUser(true), loadWall()]); }
  catch (e) {
    frame.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="csmsg"><h2>no cow here</h2><p>${esc(e.message)}</p><p><a href="/cowspace/#signup">make a cowspace</a></p></div>`);
    return;
  }
  // the extras: their best cards, their 88x31 button, and your stickers to post with
  async function extras() {
    try {
      const b = st.user.binder;
      if (b && b.best && b.best.length && window.LC_CARDS) {
        const cat = await LC_CARDS.catalog();
        st.thumbs = b.best.map(k => { const c = cat.by[LC_CARDS.base(k)]; return c ? { name: c.name, rarity: c.rarity, shiny: k.endsWith('*'), url: LC_CARDS.art(c) } : null; }).filter(Boolean);
      }
    } catch (e) {}
    try { if (st.user.button && window.LC_GIF) st.buttonUrl = LC_GIF.button(st.user.button); } catch (e) {}
    try {
      if (CS.token()) {
        const shop = await CS.api('/shop');
        st.stickers = shop.items.filter(i => i.kind === 'sticker' && (shop.inv || {})[i.id]);
      }
    } catch (e) {}
  }
  render(0);
  extras().then(() => render(0));
  effects(st.user.look || {});

  // clicks inside the frame arrive here. only trust messages from our own frame
  addEventListener('message', async e => {
    if (e.source !== frame.contentWindow || !e.data || !e.data.csAct) return;
    if (e.source === frame.contentWindow && e.data && e.data.csMouse) return trail(e.data.csMouse);
    const { csAct: act, id, msg, scroll } = e.data;
    st.error = '';
    try {
      if (act === 'friend') await CS.api('/friend', { u: name });
      else if (act === 'accept') await CS.api('/friend/accept', { u: name });
      else if (act === 'decline' || act === 'cancel') await CS.api('/friend/decline', { u: name });
      else if (act === 'unfriend') { if (!confirm(`unfriend ${name}?`)) return; await CS.api('/friend/remove', { u: name }); }
      else if (act === 'gift') {
        const n = prompt(`send how many moo coins to ${name}?`, '10');
        if (!n) return;
        const j = await CS.api('/coins/gift', { to: name, n: Number(n) });
        alert(`sent! you have ${CS.coins(j.coins)} moo coins left`);
        return;
      } else if (act === 'post' || act === 'sticker') {
        st.draft = String(msg || '');
        await CS.api('/wall', { u: name, msg: st.draft, ...(act === 'sticker' ? { st: id } : {}) });
        st.draft = '';
        await loadWall(); return render(scroll);
      } else if (act === 'del') {
        if (!confirm('delete this comment?')) return;
        await CS.api('/wall/delete', { u: name, id: Number(id) });
        await loadWall(); return render(scroll);
      } else if (act === 'more') { await loadWall(true); return render(scroll); }
      else return;
      await loadUser(false); // friend count and buttons changed
      render(scroll);
    } catch (err) { st.error = err.message; render(scroll); }
  });

  // the profile song. browsers won't autoplay sound, so it's a button
  if (st.user.song >= 0 && CS.songName(st.user.song)) {
    const b = document.createElement('button');
    let on = false;
    const label = () => { b.innerHTML = (on ? '&#9632; stop ' : '&#9654; play ') + esc(CS.songName(st.user.song)); };
    b.onclick = () => { on = !on; on ? CS.playSong(st.user.song) : CS.stopSong(); label(); };
    label();
    document.getElementById('csSong').appendChild(b);
  }

  const me = await CS.me();
  adminBar(me);
  document.getElementById('csMe').innerHTML = me
    ? (me.username === st.user.username ? '<a class="l" href="/cowspace/">edit my profile</a>' : `<a class="l" href="/@${esc(me.username)}">my profile</a>`)
    : '<a class="l" href="/cowspace/">log in</a> &middot; <a class="l" href="/cowspace/#signup">sign up</a>';

  // landon and mods get quick admin buttons on profiles. the api checks everything again
  async function adminBar(me) {
    if (!me || !['staff', 'mod'].includes(me.role) || me.username === st.user.username) return;
    if (st.user.role === 'staff' || (me.role === 'mod' && st.user.role === 'mod')) return;
    let status; try { status = await CS.api('/admin/status'); } catch (e) { return; }
    const bar = document.createElement('div');
    bar.style.cssText = 'background:#600;color:#fff;padding:5px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px';
    const btn = 'font:bold 11px Verdana;border:1px solid #300;padding:2px 8px;cursor:pointer';
    bar.innerHTML = status.elevated > Date.now()
      ? `<b>admin:</b><button data-x="ban" style="${btn};background:#c33;color:#fff">ban</button>
         <select data-x="clear" style="font-size:11px"><option value="">clear...</option><option>bio</option><option>avatar</option><option>css</option><option>mood</option><option>wall</option><option value="all">everything</option></select>
         <a href="/cowspace/admin/" style="color:#fcc">more in the admin page</a><span id="admMsg"></span>`
      : `<b>admin is locked.</b> <a href="/cowspace/admin/" style="color:#fcc">unlock it on the admin page</a> to get buttons here`;
    document.querySelector('.csbar').after(bar);
    const say = t => { const m = document.getElementById('admMsg'); if (m) m.textContent = ' ' + t; };
    const reload = async () => { await Promise.all([loadUser(false), loadWall()]); render(0); };
    bar.addEventListener('click', async e => {
      if (e.target.dataset.x !== 'ban') return;
      const reason = prompt(`ban ${name}? why (they won't see this)`);
      if (reason === null) return;
      const ip = confirm('also stop new accounts from their ip addresses?\n\nok = yes, cancel = just the account');
      try { await CS.api('/admin/ban', { u: name, reason, ip }); location.reload(); } catch (err) { say(err.message); }
    });
    bar.addEventListener('change', async e => {
      if (e.target.dataset.x !== 'clear' || !e.target.value) return;
      const what = e.target.value; e.target.value = '';
      if (!confirm(`clear ${name}'s ${what === 'all' ? 'bio, avatar, css, mood and wall' : what}?`)) return;
      try { await CS.api('/admin/clear', { u: name, what }); await reload(); say('cleared ' + what); } catch (err) { say(err.message); }
    });
  }
};
// ---------- profile effects + cursor trails from the moo coin shop ----------
// drawn on a see-through canvas over the profile frame, so they don't touch anyone's css
let fxCanvas = null, trailKind = null;
const parts = [];
function effects(look) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || (!look.fx && !look.trail)) return;
  trailKind = look.trail || null;
  fxCanvas = document.createElement('canvas');
  fxCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
  document.body.appendChild(fxCanvas);
  const g = fxCanvas.getContext('2d');
  const size = () => { fxCanvas.width = innerWidth; fxCanvas.height = innerHeight; };
  size(); addEventListener('resize', size);
  const fx = look.fx;
  const spawn = () => {
    const W = innerWidth, H = innerHeight;
    if (fx === 'snow') parts.push({ k: 'snow', x: Math.random() * W, y: -5, vx: (Math.random() - 0.5) * 0.4, vy: 0.6 + Math.random() * 0.8, life: 99999, r: 1.5 + Math.random() * 2 });
    if (fx === 'sparkle') parts.push({ k: 'spark', x: Math.random() * W, y: Math.random() * H, vx: 0, vy: -0.15, life: 60 + Math.random() * 40, c: '#fff6b0' });
    if (fx === 'hearts') parts.push({ k: 'heart', x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 0.3, vy: -0.6 - Math.random() * 0.6, life: 99999 });
    if (fx === 'glitter') parts.push({ k: 'spark', x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0.2, life: 40 + Math.random() * 30, c: `hsl(${Math.random() * 360} 90% 65%)` });
  };
  (function loop() {
    g.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    if (fx && parts.filter(p => !p.trail).length < (fx === 'snow' ? 80 : 45) && Math.random() < 0.5) spawn();
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0 || p.y > innerHeight + 20 || p.y < -30) { parts.splice(i, 1); continue; }
      const a = Math.min(1, p.life / 30);
      g.globalAlpha = p.k === 'snow' || p.k === 'heart' ? 0.8 : a;
      if (p.k === 'snow') { g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.15)'; g.stroke(); }
      else if (p.k === 'heart') { g.font = '16px sans-serif'; g.fillStyle = '#e85d9e'; g.fillText('\u2665', p.x, p.y); }
      else if (p.k === 'spark') { g.fillStyle = p.c; const s = 2 + (p.life % 10 < 5 ? 1 : 0); g.fillRect(p.x - s, p.y, s * 2 + 1, 1); g.fillRect(p.x, p.y - s, 1, s * 2 + 1); }
      else if (p.k === 'moo') { g.font = 'bold 11px Verdana'; g.fillStyle = '#141414'; g.fillText('moo', p.x, p.y); }
      else if (p.k === 'rb') { g.fillStyle = p.c; g.fillRect(p.x - 3, p.y - 3, 6, 6); }
    }
    g.globalAlpha = 1;
    requestAnimationFrame(loop);
  })();
}
// mouse positions come from inside the frame (see cs.js), which starts below the top bar
function trail([mx, my]) {
  if (!trailKind || !fxCanvas) return;
  const r = document.getElementById('csframe').getBoundingClientRect(), x = r.left + mx, y = r.top + my;
  if (trailKind === 'stars') parts.push({ k: 'spark', trail: 1, x, y, vx: (Math.random() - 0.5), vy: Math.random() * 0.8, life: 35, c: '#f2c230' });
  if (trailKind === 'moo' && Math.random() < 0.3) parts.push({ k: 'moo', trail: 1, x, y, vx: 0, vy: -0.6, life: 45 });
  if (trailKind === 'rainbow') parts.push({ k: 'rb', trail: 1, x, y, vx: 0, vy: 0, life: 25, c: `hsl(${(Date.now() / 5) % 360} 90% 60%)` });
}
document.readyState === 'loading' ? addEventListener('DOMContentLoaded', csProfile) : csProfile();
