// cowspace shared stuff: login token, api calls, avatars, profile pages, profile songs.
// used by /cowspace/ (login + editor), /@name profiles (404.html) and the homepage.
(() => {
  const API = 'https://api.landon.cool/api/cs';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // the login token lives in localStorage, so each mirror domain has its own login
  const token = () => { try { return localStorage.getItem('csToken') || ''; } catch (e) { return ''; } };
  const setToken = t => { try { t ? localStorage.setItem('csToken', t) : localStorage.removeItem('csToken'); } catch (e) {} };

  async function api(path, body) {
    const t = token();
    const r = await fetch(API + path, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(t ? { authorization: 'Bearer ' + t } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({ error: 'the server sent something weird' }));
    if (r.status === 401 && t && path !== '/login') setToken(''); // token expired or logged out elsewhere
    if (!r.ok) throw new Error(j.error || 'something went wrong');
    return j;
  }

  let meCache = null;
  async function me() {
    if (!token()) return null;
    if (meCache) return meCache;
    try { meCache = (await api('/me')).user; } catch (e) { meCache = null; }
    return meCache;
  }

  // everyone without an avatar gets a little cow face
  const COW = { k: '1a1a1a', w: 'f4f4f4', p: 'f2b8b8', n: '6b3b3b' };
  const DEFAULT_AVATAR = { w: 8, px: ['kkwwwwkk', 'kwwwwwwk', 'wkwwwwkw', 'wwwwwwww', 'wppppppw', 'pnppppnp', 'pppppppp', 'wwwwwwww']
    .join('').split('').map(c => COW[c]).join('') };

  // avatars are pixels (6 hex chars each, '------' = see-through). this turns
  // them into an svg data url, which works inside the sandboxed profile too
  function avatarUrl(av) {
    if (!av || !av.px) av = DEFAULT_AVATAR;
    const w = av.w || Math.round(Math.sqrt(av.px.length / 6));
    let rects = '';
    for (let i = 0; i < w * w; i++) {
      const c = av.px.slice(i * 6, i * 6 + 6);
      if (/^[0-9a-f]{6}$/i.test(c)) rects += `<rect x="${i % w}" y="${Math.floor(i / w)}" width="1.02" height="1.02" fill="#${c}"/>`;
    }
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" shape-rendering="crispEdges">${rects}</svg>`);
  }

  const songName = i => (window.COWAMP_TRACKS || [])[i]?.name || '';
  const fmtDate = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  // ---------- the profile page itself ----------
  // shown in <iframe sandbox srcdoc> with a strict CSP: no scripts, and nothing
  // can load from outside landon.cool except google fonts. people's css goes last
  // so it can restyle everything. the class names here are the ones the editor lists
  const BASE_CSS = `
*{box-sizing:border-box}
body{margin:0;background:#e5e5e5;color:#111;font:13px Verdana,Tahoma,sans-serif}
.page{max-width:820px;margin:0 auto;padding:12px}
.header{background:#036;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.name{font:bold 26px Verdana,sans-serif;margin:0}
.role{font:bold 10px Verdana;text-transform:uppercase;padding:2px 6px;background:#fc0;color:#000}
.role.user{display:none}
.cols{display:flex;gap:12px;margin-top:12px;flex-wrap:wrap}
.left{flex:1 1 250px;min-width:0}.right{flex:2 1 360px;min-width:0}
.box{background:#fff;border:1px solid #6699cc;margin-bottom:12px}
.box h2{margin:0;background:#6699cc;color:#fff;font:bold 13px Verdana;padding:4px 8px}
.box .in{padding:8px}
.avatar{display:block;width:100%;max-width:220px;aspect-ratio:1;margin:8px auto;image-rendering:pixelated;background:#fff}
.mood{text-align:center;padding:4px 8px 8px}
.mood b{color:#036}
.info div{padding:2px 0}.info b{color:#036}
.bio{white-space:pre-wrap;word-wrap:break-word;margin:0;line-height:1.5}
.song{font-size:12px}.song b{color:#036}
.empty{color:#888;font-style:italic}`;

  function profileDoc(u) {
    const role = u.role || 'user';
    const favs = u.favs || {};
    const favRows = [['favorite mob', favs.mob], ['favorite game', favs.game], ['favorite block', favs.block]]
      .filter(r => r[1]).map(r => `<div><b>${r[0]}:</b> ${esc(r[1])}</div>`).join('');
    const csp = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src https://landon.cool data:";
    return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<base href="https://landon.cool/">
<style>${BASE_CSS}</style>
<style>${String(u.css || '').replace(/<\/?style/gi, '')}</style>
</head><body class="role-${esc(role)}"><div class="page">
<div class="header"><h1 class="name">${esc(u.username)}</h1><span class="role ${esc(role)}">${esc(role)}</span></div>
<div class="cols">
  <div class="left">
    <div class="box pic"><h2>${esc(u.username)}</h2>
      <img class="avatar" src="${avatarUrl(u.avatar)}" alt="">
      <div class="mood">${u.mood && (u.mood.t || u.mood.e) ? `<b>mood:</b> ${esc(u.mood.e)} ${esc(u.mood.t)}` : ''}</div>
    </div>
    <div class="box info"><h2>info</h2><div class="in">
      <div><b>joined:</b> ${fmtDate(u.joined)}</div>${favRows}
    </div></div>
    ${u.song >= 0 && songName(u.song) ? `<div class="box song"><h2>profile song</h2><div class="in"><b>&#9835;</b> ${esc(songName(u.song))}</div></div>` : ''}
  </div>
  <div class="right">
    <div class="box about"><h2>about me</h2><div class="in">
      ${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : '<p class="bio empty">nothing here yet</p>'}
    </div></div>
  </div>
</div>
</div></body></html>`;
  }

  // ---------- profile songs (same synth as cowamp) ----------
  let actx = null, songTimer = null, gain = null;
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(t) { const m = /^([A-G])(#|b)?(\d)$/.exec(t); if (!m) return 0; const n = (+m[3] + 1) * 12 + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * Math.pow(2, (n - 69) / 12); }
  function playSong(i) {
    stopSong();
    const T = (window.COWAMP_TRACKS || [])[i];
    if (!T) return;
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    actx.resume && actx.resume();
    gain = actx.createGain(); gain.gain.value = 0.35; gain.connect(actx.destination);
    const L = T.lead.split(/\s+/), B = T.bass.split(/\s+/), step = 60 / T.bpm / 2;
    const held = (arr, k) => { let n = 1; while (arr[k + n] === '-') n++; return n; };
    const note = (f, t, d, type, v) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.setValueAtTime(v, t + Math.max(0.02, d - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(gain); o.start(t); o.stop(t + d + 0.02);
    };
    let k = 0, next = actx.currentTime + 0.08;
    songTimer = setInterval(() => {
      while (next < actx.currentTime + 0.15) {
        const s = k % L.length;
        if (freq(L[s])) note(freq(L[s]), next, held(L, s) * step * 0.95, T.wave, T.wave === 'square' ? 0.07 : 0.16);
        if (freq(B[s])) note(freq(B[s]), next, held(B, s) * step * 0.9, 'triangle', 0.22);
        next += step; k++; // loops forever until stopped
      }
    }, 25);
  }
  function stopSong() { clearInterval(songTimer); songTimer = null; if (gain) { gain.disconnect(); gain = null; } }

  window.CS = { API, esc, token, setToken, api, me, avatarUrl, profileDoc, playSong, stopSong, songName,
    forget: () => { meCache = null; } };
})();
