// cowspace on the homepage: the cowspace.exe window and your avatar + name in
// the taskbar tray. logged out, the tray opens the login window. logged in, it
// goes to your profile
(() => {
  const coinsEl = document.getElementById('trCoins');
  const win = document.getElementById('w-cs'), frame = document.getElementById('csWin');
  const tray = document.getElementById('trCs'), trayName = document.getElementById('trCsName');
  if (!win || !tray || !window.CS) return;

  // only load cowspace once the window is actually opened
  new MutationObserver(() => { if (!win.hidden && !frame.src) frame.src = frame.dataset.src; })
    .observe(win, { attributes: true, attributeFilter: ['hidden'] });

  async function refresh() {
    CS.forget();
    const me = await CS.me();
    // the pixel person icon stays, the avatar picture sits next to it and swaps in when logged in
    const icon = tray.querySelector('svg');
    let img = tray.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = ''; img.width = img.height = 14; img.style.imageRendering = 'pixelated'; img.hidden = true;
      icon.after(img);
    }
    if (me) {
      tray.removeAttribute('data-open');
      const reqs = (me.requests || []).length;
      tray.title = `cowspace: @${me.username}` + (reqs ? ` (${reqs} friend request${reqs === 1 ? '' : 's'})` : '');
      trayName.textContent = me.username + (reqs ? ` (${reqs})` : '');
      // with requests waiting, the tray opens cowspace to answer them instead of your profile
      img.src = CS.avatarUrl(me.avatar);
      img.hidden = false; icon.style.display = 'none';
      if (reqs) tray.setAttribute('data-open', 'w-cs');
      tray.onclick = reqs ? null : () => { location.href = '/@' + me.username; };
      syncAch(); checkNotes();
      if (coinsEl) { coinsEl.hidden = false; coinsEl.innerHTML = CS.COIN + ' ' + CS.coins(me.coins); }
    } else {
      tray.setAttribute('data-open', 'w-cs'); // main.js opens windows for anything with data-open
      tray.title = 'cowspace: log in';
      trayName.textContent = 'log in';
      img.hidden = true; icon.style.display = '';
      tray.onclick = null;
      if (bell) bell.hidden = true;
      if (coinsEl) coinsEl.hidden = true;
    }
  }

  // homepage achievements (saved in lc_ach by extras.js) get copied to your profile
  let synced = '';
  async function syncAch() {
    if (!CS.token()) return;
    let got = {};
    try { got = JSON.parse(localStorage.getItem('lc_ach') || '{}'); } catch (e) {}
    const ids = Object.keys(got).sort(), key = ids.join(',');
    if (!ids.length || key === synced) return;
    try { await CS.api('/ach', { ids }); synced = key; } catch (e) {}
  }
  setInterval(syncAch, 20000);

  // notifications: a bell in the tray with how many are unread. click it for the list
  const bell = document.getElementById('trBell'), bellN = document.getElementById('trBellN'), panel = document.getElementById('bellPanel');
  const ICON = { wall: '\u{1F4AC}', request: '\u{1F91D}', friend: '\u{1F91D}', flappy: '\u{1F426}', mention: '@', badge: '\u2605',
    coins: CS.COIN, trade: '\u{1F0CF}', game: '\u{1F3AE}', forum: '\u{1F4CB}', like: '\u2665' };
  let notes = [];
  async function checkNotes() {
    if (!CS.token() || !bell) { if (bell) bell.hidden = true; return; }
    try {
      const j = await CS.api('/notes');
      notes = j.notes; bell.hidden = false;
      bellN.textContent = j.unread ? ' ' + j.unread : '';
      bell.style.fontWeight = j.unread ? '700' : '400';
    } catch (e) {}
  }
  function showNotes() {
    panel.innerHTML = `<div class="tbar" style="background:var(--sel);color:var(--selink)"><span class="ttl">notifications</span></div>` +
      (notes.length ? notes.slice(0, 20).map(n => `<a href="${CS.esc(n.link || '/cowspace/')}" style="display:flex;gap:8px;padding:7px 9px;border-bottom:1px solid var(--line);color:var(--ink);text-decoration:none;${n.read ? 'opacity:.6' : ''}">
        <span>${ICON[n.type] || '\u2022'}</span><span style="flex:1">${CS.esc(n.text)}<br><span class="small">${new Date(n.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></span></a>`).join('')
        : '<div style="padding:10px" class="small">nothing yet</div>');
    panel.hidden = false;
    if (notes.some(n => !n.read)) CS.api('/notes/read', {}).then(() => { bellN.textContent = ''; bell.style.fontWeight = '400'; notes.forEach(n => n.read = true); }).catch(() => {});
  }
  if (bell) {
    bell.onclick = e => { e.stopPropagation(); panel.hidden ? showNotes() : (panel.hidden = true); };
    document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target)) panel.hidden = true; });
    setInterval(checkNotes, 30000);
  }

  // the window tells us when you log in or out inside it
  addEventListener('message', e => {
    if (e.origin === location.origin && e.data && e.data.cowspace) refresh();
  });
  refresh();
})();
