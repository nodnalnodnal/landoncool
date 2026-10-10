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
    <span id="csSong"></span><span class="sp"></span><span id="csMe"></span><a class="l" href="/">landon.cool</a></div>
    <iframe id="csframe" sandbox title="${esc(name)}'s profile"></iframe>`;
  document.documentElement.classList.remove('cs-profile');

  let user;
  try { user = (await CS.api('/user?u=' + encodeURIComponent(name))).user; }
  catch (e) {
    document.getElementById('csframe').remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="csmsg"><h2>no cow here</h2><p>${esc(e.message)}</p><p><a href="/cowspace/#signup">make a cowspace</a></p></div>`);
    return;
  }
  document.getElementById('csframe').srcdoc = CS.profileDoc(user);

  // the profile song. browsers won't autoplay sound, so it's a button
  if (user.song >= 0 && CS.songName(user.song)) {
    const b = document.createElement('button');
    let on = false;
    const label = () => { b.innerHTML = (on ? '&#9632; stop ' : '&#9654; play ') + esc(CS.songName(user.song)); };
    b.onclick = () => { on = !on; on ? CS.playSong(user.song) : CS.stopSong(); label(); };
    label();
    document.getElementById('csSong').appendChild(b);
  }

  const me = await CS.me();
  document.getElementById('csMe').innerHTML = me
    ? (me.username === user.username ? '<a class="l" href="/cowspace/">edit my profile</a>' : `<a class="l" href="/@${esc(me.username)}">my profile</a>`)
    : '<a class="l" href="/cowspace/">log in</a> &middot; <a class="l" href="/cowspace/#signup">sign up</a>';
};
document.readyState === 'loading' ? addEventListener('DOMContentLoaded', csProfile) : csProfile();
