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

  // hats from the moo coin shop. 16 wide, drawn over the top of the head
  const HATC = { y: 'f2c230', r: 'e5484d', b: '3d7be0', p: 'e85d9e', w: 'f4f4f4', k: '1a1a1a', n: '8a5a30', N: '5a3a1e', g: 'c8c8c8', o: 'f08c2e' };
  const HATS = {
    party: ['.......yy.......', '......pppp......', '.....bbbbbb.....', '....pppppppp....', '...bbbbbbbbbb...', '..pppppppppppp..'],
    beanie: ['.......ww.......', '.....rrrrrr.....', '....rrrrrrrr....', '...rrrrrrrrrr...', '..wwwwwwwwwwww..', '..wwwwwwwwwwww..'],
    cowboy: ['................', '.....nnnnnn.....', '....nnnnnnnn....', '....nnnnnnnn....', '....NNNNNNNN....', 'nnnnnnnnnnnnnnnn'],
    chef: ['....ww.ww.ww....', '...wwwwwwwwww...', '...wwwwwwwwww...', '....wwwwwwww....', '....gggggggg....', '....wwwwwwww....'],
    top: ['....kkkkkkkk....', '....kkkkkkkk....', '....kkkkkkkk....', '....rrrrrrrr....', '....kkkkkkkk....', '..kkkkkkkkkkkk..'],
    propeller: ['..rrrrr..bbbbb..', '.......kk.......', '.....yyrrbb.....', '....yyyrrbbb....', '...yyyyrrbbbb...', '..kkkkkkkkkkkk..'],
    halo: ['....yyyyyyyy....', '...y........y...', '....yyyyyyyy....', '................', '................', '................'],
    crown: ['..y...y..y...y..', '..yy.yyyyyy.yy..', '..yyyyyyyyyyyy..', '..yryyybbyyyry..', '..yyyyyyyyyyyy..', '................'],
  };
  // avatars are pixels (6 hex chars each, '------' = see-through). this turns
  // them into an svg data url, which works inside the sandboxed profile too.
  // with a hat, the face shrinks a little to make room above it
  function avatarUrl(av, hat) {
    if (!av || !av.px) av = DEFAULT_AVATAR;
    const w = av.w || Math.round(Math.sqrt(av.px.length / 6)), H = HATS[hat];
    const k = H ? 16 / w : 1, ox = H ? 2 : 0, oy = H ? 4 : 0, size = H ? 20 : w;
    let rects = '';
    for (let i = 0; i < w * w; i++) {
      const c = av.px.slice(i * 6, i * 6 + 6);
      if (/^[0-9a-f]{6}$/i.test(c)) rects += `<rect x="${ox + (i % w) * k}" y="${oy + Math.floor(i / w) * k}" width="${k + 0.02}" height="${k + 0.02}" fill="#${c}"/>`;
    }
    if (H) H.forEach((row, y) => [...row].forEach((ch, x) => { if (HATC[ch]) rects += `<rect x="${x + 2}" y="${y}" width="1.02" height="1.02" fill="#${HATC[ch]}"/>`; }));
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects}</svg>`);
  }
  // name colors + chat badges from the shop. rainbow is a gradient, so it needs this css
  const COIN_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' shape-rendering='crispEdges'%3E%3Cpath d='M2 0h4v1h1v1h1v4h-1v1h-1v1h-4v-1h-1v-1h-1v-4h1v-1h1z' fill='%23a87a10'/%3E%3Cpath d='M2 1h4v1h1v4h-1v1h-4v-1h-1v-4h1z' fill='%23f2c230'/%3E%3Cpath d='M3 2h2v1h-2zM3 3h1v2h-1zM3 5h2v1h-2z' fill='%23fff3b0'/%3E%3C/svg%3E";
  const COIN = '<span class="lc-coin" role="img" aria-label="moo coins"></span>';
  const NAME_CSS = `.lc-coin{display:inline-block;width:.95em;height:.95em;vertical-align:-.12em;background:url("${COIN_SVG}") center/contain no-repeat;image-rendering:pixelated}` + '.lc-rainbow{background:linear-gradient(90deg,#e5484d,#f08c2e,#d4a017,#3fae4f,#3d7be0,#9b5de5);-webkit-background-clip:text;background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent}';
  try { if (document.head && !document.getElementById('lcNameCss')) { const st = document.createElement('style'); st.id = 'lcNameCss'; st.textContent = NAME_CSS; document.head.appendChild(st); } } catch (e) {}
  function nameHtml(name, look, extra = '') {
    const col = look && look.color, cb = look && look.cb ? `<span class="lc-cb" title="chat badge">${esc(look.cb)}</span> ` : '';
    const st = col && col !== 'rainbow' && /^#[0-9a-f]{6}$/i.test(col) ? ` style="color:${col}"` : '';
    return `${cb}<span class="lc-name${col === 'rainbow' ? ' lc-rainbow' : ''}"${st}${extra}>${esc(name)}</span>`;
  }
  const coins = n => n === 'inf' ? '\u221e' : Number(n || 0).toLocaleString();

  const songName = i => (window.COWAMP_TRACKS || [])[i]?.name || '';
  const fmtDate = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  // ---------- the profile page itself ----------
  // shown in <iframe sandbox srcdoc> with a strict CSP: no scripts, and nothing
  // can load from outside landon.cool except google fonts. people's css goes last
  // so it can restyle everything. the class names here are the ones the editor lists
  const BASE_CSS = `${NAME_CSS}
*{box-sizing:border-box}
body{margin:0;background:#e5e5e5;color:#111;font:13px Verdana,Tahoma,sans-serif}
a{color:#036}
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
.empty{color:#888;font-style:italic}
.views{font-variant-numeric:tabular-nums}
.contact .in{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.contact button,.wall button{font:bold 12px Verdana;background:#fc0;border:1px solid #a80;padding:4px 10px;cursor:pointer;color:#000}
.contact button.sec,.wall button.sec{background:#eee;border-color:#999}
.contact .note{font-size:12px;color:#555}
.friends .count{font-size:12px;margin-bottom:8px}
.top8{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.friend{display:block;text-align:center;font-size:11px;color:#036;word-break:break-all;text-decoration:none}
.friend img{display:block;width:100%;max-width:72px;aspect-ratio:1;margin:0 auto 3px;image-rendering:pixelated;background:#fff;border:1px solid #ccc}
.friends .all{display:block;text-align:right;font-size:12px;margin-top:6px;color:#036}
.wall .total{font-size:12px;margin-bottom:8px}
.comment-form{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.comment-form textarea{font:13px Verdana,sans-serif;padding:5px;min-height:56px;resize:vertical;border:1px solid #999}
.comment-form .row{display:flex;justify-content:space-between;align-items:center;gap:6px}
.comment-form .err{color:#c00;font-size:12px}
.comment{display:flex;gap:10px;padding:8px 0;border-top:1px solid #ddd}
.comment .who{flex:none;width:64px;text-align:center;font-size:11px;color:#036;text-decoration:none;word-break:break-all}
.comment .who img{display:block;width:56px;height:56px;margin:0 auto 2px;image-rendering:pixelated;border:1px solid #ccc;background:#fff}
.comment .body{flex:1;min-width:0}
.comment .when{font-size:11px;color:#777;margin-bottom:3px}
.comment .msg{white-space:pre-wrap;word-wrap:break-word}
.comment .del{float:right;background:none!important;border:0!important;color:#c00!important;font-size:11px!important;padding:0!important;text-decoration:underline}
.closed{font-size:12px;color:#777;margin-bottom:10px}
.more{display:block;margin:10px auto 0}
.badges .in{display:flex;flex-wrap:wrap;gap:6px}
.badge{display:inline-flex;align-items:center;gap:4px;font:bold 11px Verdana;padding:3px 8px;border:1px solid #036;background:#eef4ff;color:#036}
.badge .ic{font-size:13px}
.badge.staff{background:#fc0;border-color:#a80;color:#000}
.stats .in div{padding:2px 0}.stats b{color:#036}
.achievements .in{display:flex;flex-wrap:wrap;gap:4px}
.ach{font-size:11px;padding:2px 6px;background:#f3f3f3;border:1px solid #ccc}
.npc-tag{color:#999;font-size:11px}
.binder .in{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end}
.binder .mini{width:56px;text-align:center;font-size:9px;color:#036;text-decoration:none;word-break:break-all}
.binder .mini img{display:block;width:56px;height:56px;image-rendering:pixelated;border:2px solid #999;background:#fff;box-sizing:border-box}
.binder .mini.rare img{border-color:#3d7be0}.binder .mini.epic img{border-color:#9b5de5}.binder .mini.legendary img{border-color:#d4a017}
.binder .mini.shiny img{box-shadow:0 0 0 2px #fff,0 0 8px 2px #f2c230}
.binder .pct{flex-basis:100%;font-size:12px}
.button88 .in{text-align:center}.button88 img{width:176px;height:62px;image-rendering:pixelated}
.trophies .in{display:flex;flex-wrap:wrap;gap:6px}.trophy{font-size:11px;padding:2px 6px;border:1px solid #d4a017;background:#fff8e0}
.comment .sticker{font-size:40px;line-height:1.1;display:block}
.header .name.lc-rainbow{color:transparent}
.comment .npc{display:block;color:#999;font-size:9px}`;

  // the profile page. opts.live = the real interactive profile (friend buttons,
  // posting comments). without it, it's a static picture, used by the editor preview.
  // when live, one tiny script runs inside the sandboxed frame: it can't see your
  // login, it only tells the page around it what got clicked (profile.js does the rest)
  function profileDoc(u, opts = {}) {
    const role = u.role || 'user', favs = u.favs || {}, site = opts.site || 'https://landon.cool';
    const at = n => `${site}/@${encodeURIComponent(n)}`;
    const favRows = [['favorite mob', favs.mob], ['favorite game', favs.game], ['favorite block', favs.block]]
      .filter(r => r[1]).map(r => `<div><b>${r[0]}:</b> ${esc(r[1])}</div>`).join('');
    const nonce = opts.live ? Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) : '';
    const csp = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src https://landon.cool data:"
      + (opts.live ? `; script-src 'nonce-${nonce}'` : '');
    const name = esc(u.username), rel = opts.relation || 'guest';
    const contact = {
      guest: `<a href="${site}/cowspace/#signup" target="_top">log in or join</a> <span class="note">to add ${name}</span>`,
      self: `<span class="note">this is you!</span> <a href="${site}/cowspace/" target="_top">edit profile</a>`,
      none: `<button data-act="friend">add to friends</button>`,
      requested: `<span class="note">friend request sent</span> <button class="sec" data-act="cancel">cancel</button>`,
      incoming: `<span class="note">${name} wants to be friends!</span> <button data-act="accept">accept</button> <button class="sec" data-act="decline">no thanks</button>`,
      friends: `<span class="note">you're friends &#10003;</span> <button class="sec" data-act="unfriend">unfriend</button> <button class="sec" data-act="gift">send moo coins</button>`,
    }[rel] || '';
    const play = rel !== 'self' ? `<a class="note" href="${site}/games/?vs=${encodeURIComponent(u.username)}" target="_top">challenge ${name} to a game</a>` : '';
    const top8 = (u.top8 || []).map(f => `<a class="friend" href="${at(f.username)}" target="_top"><img src="${avatarUrl(f.avatar, f.look && f.look.hat)}" alt="">${nameHtml(f.username, f.look)}</a>`).join('');
    const wall = opts.wall || { comments: [], total: u.wallCount || 0 };
    // badges, stats and homepage achievements (names come from assets/achievements.js)
    const badges = (u.badges || []).map(b => `<span class="badge ${esc(b.id)}${b.custom ? ' custom' : ''}" title="${esc(b.desc)}"${b.color && /^#[0-9a-f]{3,6}$/i.test(b.color) ? ` style="background:${b.color}"` : ''}><span class="ic">${esc(b.icon)}</span>${esc(b.name)}</span>`).join('');
    const st = u.stats || { flappyBest: 0, chat: 0, cowdle: {} }, cd = st.cowdle || {};
    const allAch = window.LC_ACHIEVEMENTS || [], achList = allAch.filter(a => (u.ach || []).includes(a[0]));
    const gm = u.games || {}, GN = { ttt: 'tic-tac-toe', c4: 'connect 4', checkers: 'checkers', cow: 'battlecow' };
    const gameRows = Object.keys(GN).filter(t => gm[t]).map(t => [GN[t], `${gm[t].w}-${gm[t].l}${gm[t].d ? '-' + gm[t].d : ''} (elo ${(u.elo || {})[t] || 1000})`]);
    const statRows = [...(u.coins !== undefined ? [['moo coins', coins(u.coins)]] : []), ['flappy bird best', st.flappyBest], ['cowdle wins', cd.played ? `${cd.wins || 0} of ${cd.played}` : 0],
      ['cowdle streak', cd.played ? `${cd.streak || 0} (best ${cd.max || 0})` : 0], ['typing best', st.typingBest ? st.typingBest + ' wpm' : 0], ['chat messages', st.chat], ['forum posts', st.posts],
      ...gameRows, ['achievements', allAch.length ? `${achList.length}/${allAch.length}` : 0]]
      .map(([k, v]) => `<div><b>${k}:</b> ${esc(v || 0)}</div>`).join('');
    const bd = u.binder, thumbs = opts.binderThumbs || [];
    const binderBox = bd && (bd.have || thumbs.length) ? `<div class="box binder"><h2>card binder</h2><div class="in">
      ${thumbs.map(c => `<a class="mini ${esc(c.rarity)}${c.shiny ? ' shiny' : ''}" href="${site}/cards/?u=${encodeURIComponent(u.username)}" target="_top" title="${esc(c.name)}"><img src="${c.url}" alt="">${esc(c.name)}</a>`).join('')}
      <div class="pct"><b>${bd.have}</b> of ${bd.total} cards (${Math.round(100 * bd.have / Math.max(1, bd.total))}%)${bd.shiny ? `, <b>${bd.shiny}</b> shiny` : ''} &middot; <a href="${site}/cards/?u=${encodeURIComponent(u.username)}" target="_top">see the whole binder</a></div></div></div>` : '';
    const trophies = (u.trophies || []).map(t => `<span class="trophy">${esc(t.icon)} ${esc(t.name)}</span>`).join('');
    const achs = achList.map(a => `<span class="ach" title="${esc(a[2])}">${esc(a[1])}</span>`).join('');
    const comments = wall.comments.map(c => `<div class="comment" data-id="${c.id}">
      <a class="who" href="${at(c.from.username)}" target="_top"><img src="${avatarUrl(c.from.avatar, c.from.look && c.from.look.hat)}" alt="">${nameHtml(c.from.username, c.from.look)}${c.from.npc ? '<span class="npc">npc</span>' : ''}</a>
      <div class="body">${c.canDelete ? `<button class="del" data-act="del" data-id="${c.id}">delete</button>` : ''}<div class="when">${new Date(c.t).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>${c.st ? `<span class="sticker">${esc(c.st)}</span>` : ''}<div class="msg">${esc(c.msg)}</div></div>
    </div>`).join('');
    const form = opts.canPost
      ? `<div class="comment-form"><textarea maxlength="300" placeholder="leave a comment for ${name}">${esc(opts.draft || '')}</textarea><div class="row"><span class="err">${esc(opts.error || '')}</span><span>${(opts.stickers || []).map(st => `<button class="sec" data-act="sticker" data-id="${esc(st.id)}" title="post a ${esc(st.name)}">${esc(st.icon)}</button>`).join(' ')} <button data-act="post">post comment</button></span></div></div>`
      : `<div class="closed">${u.wallMode === 'nobody' ? `${name} turned comments off` : rel === 'guest' ? `<a href="${site}/cowspace/" target="_top">log in</a> to leave a comment` : rel === 'self' ? '' : `only ${name}'s friends can comment`}</div>`;
    return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<base href="https://landon.cool/">
<style>${BASE_CSS}</style>
<style>${String(u.css || '').replace(/<\/?style/gi, '')}</style>
</head><body class="role-${esc(role)}"><div class="page">
<div class="header"><h1 class="name${u.look && u.look.color === 'rainbow' ? ' lc-rainbow' : ''}"${u.look && /^#[0-9a-f]{6}$/i.test(u.look.color || '') ? ` style="color:${u.look.color}"` : ''}>${name}</h1><span class="role ${esc(role)}">${esc(role)}</span></div>
<div class="cols">
  <div class="left">
    <div class="box pic"><h2>${name}</h2>
      <img class="avatar" src="${avatarUrl(u.avatar, u.look && u.look.hat)}" alt="">
      <div class="mood">${u.mood && (u.mood.t || u.mood.e) ? `<b>mood:</b> ${esc(u.mood.e)} ${esc(u.mood.t)}` : ''}</div>
    </div>
    <div class="box contact"><h2>contacting ${name}</h2><div class="in">${contact}${play}</div></div>
    ${opts.buttonUrl ? `<div class="box button88"><h2>${name}'s button</h2><div class="in"><a href="${site}/buttons/" target="_top"><img src="${opts.buttonUrl}" alt="${esc(u.button && u.button.title || '88x31 button')}" title="${esc(u.button && u.button.title || '')}"></a></div></div>` : ''}
    <div class="box info"><h2>info</h2><div class="in">
      <div><b>joined:</b> ${fmtDate(u.joined)}</div>${favRows}
      <div><b>profile views:</b> <span class="views">${String(u.views || 0).padStart(6, '0')}</span></div>
      ${u.npc ? '<div class="npc-tag">npc &middot; a landon.cool character</div>' : ''}
    </div></div>
    <div class="box stats"><h2>stats</h2><div class="in">${statRows}</div></div>
    ${u.song >= 0 && songName(u.song) ? `<div class="box song"><h2>profile song</h2><div class="in"><b>&#9835;</b> ${esc(songName(u.song))}</div></div>` : ''}
  </div>
  <div class="right">
    <div class="box about"><h2>about me</h2><div class="in">
      ${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : '<p class="bio empty">nothing here yet</p>'}
    </div></div>
    ${badges ? `<div class="box badges"><h2>badges</h2><div class="in">${badges}</div></div>` : ''}
    ${trophies ? `<div class="box trophies"><h2>trophy shelf</h2><div class="in">${trophies}</div></div>` : ''}
    ${binderBox}
    <div class="box friends"><h2>${name}'s friend space</h2><div class="in">
      <div class="count">${name} has <b>${u.friendCount || 0}</b> friend${u.friendCount === 1 ? '' : 's'}.</div>
      ${top8 ? `<div class="top8">${top8}</div>` : '<div class="empty">no top 8 yet</div>'}
      <a class="all" href="${site}/cowspace/friends/?u=${encodeURIComponent(u.username)}" target="_top">view all of ${name}'s friends</a>
    </div></div>
    ${achs ? `<div class="box achievements"><h2>achievements (${achList.length}/${allAch.length})</h2><div class="in">${achs}</div></div>` : ''}
    <div class="box wall"><h2>${name}'s friends comments</h2><div class="in">
      <div class="total">displaying <b>${wall.comments.length}</b> of <b>${wall.total}</b> comments</div>
      ${form}
      <div class="comments">${comments || '<div class="empty">no comments yet</div>'}</div>
      ${wall.more ? '<button class="sec more" data-act="more">load more comments</button>' : ''}
    </div></div>
  </div>
</div>
</div>${opts.live ? `<script nonce="${nonce}">
// only passes clicks up to the page around this frame. it can't see your login
addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  e.preventDefault();
  const t = document.querySelector('.comment-form textarea');
  parent.postMessage({ csAct: b.dataset.act, id: b.dataset.id || null, msg: (b.dataset.act === 'post' || b.dataset.act === 'sticker') && t ? t.value : null, scroll: scrollY }, '*');
});
scrollTo(0, ${Math.max(0, Math.floor(opts.scroll || 0))});
// for cursor trails from the shop: where the mouse is, so the page around can draw them
let mt = 0; addEventListener('mousemove', e => { const n = Date.now(); if (n - mt < 30) return; mt = n; parent.postMessage({ csMouse: [e.clientX, e.clientY] }, '*'); });
</script>` : ''}</body></html>`;
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

  window.CS = { COIN, API, esc, token, setToken, api, me, avatarUrl, profileDoc, playSong, stopSong, songName, nameHtml, coins, HATS,
    forget: () => { meCache = null; } };
})();
