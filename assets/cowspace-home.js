// cowspace on the homepage: the cowspace.exe window and your avatar + name in
// the taskbar tray. logged out, the tray opens the login window. logged in, it
// goes to your profile
(() => {
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
    } else {
      tray.setAttribute('data-open', 'w-cs'); // main.js opens windows for anything with data-open
      tray.title = 'cowspace: log in';
      trayName.textContent = 'log in';
      img.hidden = true; icon.style.display = '';
      tray.onclick = null;
    }
  }

  // the window tells us when you log in or out inside it
  addEventListener('message', e => {
    if (e.origin === location.origin && e.data && e.data.cowspace) refresh();
  });
  refresh();
})();
