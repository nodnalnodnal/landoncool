// shared bits for the shop, cards, games, typing race and buttons pages (needs cowspace/cs.js)
(() => {
  const API = 'https://api.landon.cool/api';
  // guests get a random id so the games + typing race know who they are
  function gid() {
    let g = ''; try { g = localStorage.getItem('lcGid') || ''; } catch (e) {}
    if (!/^[a-f0-9]{16}$/.test(g)) { g = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join(''); try { localStorage.setItem('lcGid', g); } catch (e) {} }
    return g;
  }
  async function call(path, body) {
    const t = CS.token();
    const r = await fetch(API + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({ error: 'the server sent something weird' }));
    if (!r.ok) throw new Error(j.error || 'something went wrong');
    return j;
  }
  // the bar along the top: page name, your coins, log in
  async function bar(title, links = '') {
    const el = document.createElement('div');
    el.className = 'top';
    el.innerHTML = `<a class="logo" href="/">landon.cool</a><span class="small">/</span><b>${CS.esc(title)}</b><span class="sp"></span>${links}
      <a class="coins" href="/shop/" id="arcCoins" title="moo coins"></a><span id="arcMe" class="small"></span>`;
    document.body.prepend(el);
    const me = await CS.me();
    document.getElementById('arcMe').innerHTML = me ? `<a href="/@${CS.esc(me.username)}">@${CS.esc(me.username)}</a>` : '<a href="/cowspace/">log in</a>';
    if (me) refreshCoins(me.coins);
    return me;
  }
  function refreshCoins(n) {
    const el = document.getElementById('arcCoins'); if (!el) return;
    if (n === undefined) return CS.api('/coins').then(j => refreshCoins(j.coins)).catch(() => {});
    el.innerHTML = CS.COIN + ' ' + CS.coins(n);
  }
  let tt = null;
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => { el.hidden = true; }, 2600);
  }
  const who = p => `${p.avatar !== undefined || p.u ? `<img class="av" src="${CS.avatarUrl(p.avatar, p.look && p.look.hat)}" alt=""> ` : ''}${p.u && !p.npc ? `<a href="/@${encodeURIComponent(p.u)}">${CS.nameHtml(p.name || p.username, p.look)}</a>` : CS.nameHtml(p.name || p.username, p.look)}${p.npc ? ' <span class="npc">npc</span>' : ''}${p.guest ? ' <span class="npc">guest</span>' : ''}`;
  window.ARC = { API, gid, call, bar, refreshCoins, toast, who };
})();
