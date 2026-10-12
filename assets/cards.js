// trading cards: draws the art and the cards themselves. used by /cards/, /shop/ and profiles.
// the list of cards comes from api.landon.cool/api/cs/cards/catalog. breeds are drawn from a
// recipe (colors + pattern), site lore uses the homepage desktop icons, npcs use their avatar
(() => {
  const ICONS = {"cow":["....#....#....................","...#o#..#o#...................","...#o##.#o#...................",".###ooo#####..................","#oooooo###oo###########.......",".##oo#ooooooooooooooooo#####..","..#oooooooooo###ooooooo###oo#.","..#oooooooooo###oooo##ooooo#o#",".#ooooooooooo###ooo####oooo#o#",".#pppppooooooo#oooo####oooo#o#",".#p#p#po##ooooooooo####oooo#o#","..#ppp##.#ooooooo##oooooooo#o#","...###....#ooooooooooooooo#.##","..........#oo#oo##pp#oo#oo#.#.","..........#oo#oo#.###oo#oo#...","..........#oo#oo#...#oo#oo#...","..........#oo#oo#...#oo#oo#...","...........##.##.....##.##...."],"eye":["............","...######...",".##......##.","#...####...#","#..######..#","#...####...#",".##......##.","...######..."],"cube":["....####....","..##....##..","##........##","#.##....##.#","#...####...#","#.....#....#","#.....#....#","#.....#....#","##....#...##","..##..#.##..","....###....."],"user":["....####....","...######...","...######...","...######...","....####....","............","..########..",".##########.",".##########.",".##########."],"star":[".....##.....",".....##.....","....####....","############",".##########.","...######...","...######...","..###..###..",".##......##.","#..........#"],"bird":["....####....","..##...#.#..",".#.....#..#.","####...#..#.","#...#..#####","#...#.#....#",".###.#.####.",".#....#....#","..##...####.","....####...."],"grid":["############","#.##.#..#..#","############","#..#.##.#..#","############","#.#..#.##..#","############"],"palette":["...######...",".##......##.","#..##..#...#","#..##......#","#........###","#.##....#...","#.##....#...",".#......###.","..########.."],"tree":["....####....","..########..",".##########.","############","############",".##########.","..########..","....####....",".....##.....",".....##.....",".....##....."],"folder":["####........","#...######..","############","#..........#","#..........#","#..........#","#..........#","############"],"home":[".....##.....","...######...",".##########.","############",".#........#.",".#.##..##.#.",".#.##..##.#.",".#....##..#.",".#....##..#.",".##########."],"txt":["########....","#......##...","#.####.#.#..","#......####.","#.#######.#.","#.........#.","#.######..#.","#.........#.","#.#####...#.","#.........#.","###########."],"cd":["...######...",".##......##.","#....##....#","#...#..#...#","#..#.##.#..#","#..#.##.#..#","#...#..#...#","#....##....#",".##......##.","...######..."],"mine":[".....#.....","..#..#..#..","...#####...","..##.####..","..#.#####..","###########","..#######..","..#######..","...#####...","..#..#..#..",".....#....."],"ring":["....####....","..##....##..",".#........#.","#..........#","#..........#","#..........#","#..........#",".#........#.","..##....##..","....####...."],"chat":["############","#..........#","#.########.#","#..........#","#.######...#","#..........#","############","..##........",".#.........."],"trophy":["############","#.########.#","#.########.#",".#.######.#.","..########..","...######...",".....##.....",".....##.....","...######...","..########.."],"mirror":["#######.....","#.....#.....","#..########.","#..#......#.","####......#.","...#......#.","...#......#.","...########."]};
  const svg = (w, h, rects, bg) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${bg ? `<rect width="${w}" height="${h}" fill="#${bg}"/>` : ''}${rects}</svg>`);
  const px = (x, y, c) => `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="#${c}"/>`;
  // a tiny seeded random, so the same breed always gets the same spots
  const seeded = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h >>> 0) % 10000) / 10000; }; };

  // 16x16 cow face. B = coat, E = ears, k = eyes, N = muzzle, h = horns
  const FACE = ['................', '................', '.hh..........hh.', '..hh........hh..', '.EEEBBBBBBBBEEE.', '.EEBBBBBBBBBBEE.', '...BBBBBBBBBB...', '...BBkkBBkkBB...',
    '...BBkkBBkkBB...', '...BBBBBBBBBB...', '...BBBBBBBBBB...', '..NNNNNNNNNNNN..', '..NNkkNNNNkkNN..', '..NNNNNNNNNNNN..', '...NNNNNNNNNN...', '................'];
  function breedArt(key, a) {
    const r = seeded(key), grid = FACE.map(row => [...row]);
    const horn = 'e8dcc0', nose = a.n || 'f2b8b8';
    // horn styles: 0 none, 1 normal, 2 highland (up and out), 3 longhorn (wide), 4 watusi (huge)
    const h = a.h === undefined ? 1 : a.h;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) if (grid[y][x] === 'h') grid[y][x] = h ? 'h' : '.';
    if (h === 2) { grid[1][0] = grid[1][15] = 'h'; grid[0][0] = grid[0][15] = 'h'; }
    if (h === 3) { for (let x = 0; x < 3; x++) { grid[3][x] = grid[3][15 - x] = 'h'; } grid[2][0] = grid[2][15] = 'h'; }
    if (h === 4) { for (let y = 0; y < 4; y++) { grid[y][1] = grid[y][14] = 'h'; grid[y][2] = grid[y][13] = 'h'; } }
    let out = '';
    const col = (x, y, ch) => {
      if (ch === 'h') return horn;
      if (ch === 'k') return '111111';
      if (ch === 'N') return nose;
      if (ch === 'E' || ch === 'B') {
        let c = a.b;
        if (a.p === 'spots' && r() < 0.28) c = a.s;
        if (a.p === 'roan' && r() < 0.4) c = a.s;
        if (a.p === 'face' && x >= 6 && x <= 9 && y >= 4) c = a.s;
        if (a.p === 'patch' && ((x < 6 && y < 8) || (x > 11 && y > 6))) c = a.s;
        if (a.p === 'belt' && y >= 9) c = a.s;
        return c;
      }
      return null;
    };
    grid.forEach((row, y) => row.forEach((ch, x) => { const c = col(x, y, ch); if (c) out += px(x, y, c); }));
    // extras: fringe over the eyes, mushrooms on top, a moon behind
    if (a.f) for (let x = 3; x < 13; x++) for (let y = 4; y < 7 + (x % 3 === 0 ? 2 : x % 2); y++) out += px(x, y, a.f);
    if (a.mush) for (const mx of [4, 10]) { out += px(mx, 1, a.mush) + px(mx + 1, 1, a.mush) + px(mx - 1, 2, a.mush) + px(mx, 2, 'f4f4f4') + px(mx + 1, 2, a.mush) + px(mx + 2, 2, a.mush) + px(mx, 3, 'e8dcc0') + px(mx + 1, 3, 'e8dcc0'); }
    const bg = a.moon ? '1b2140' : null;
    const moon = a.moon ? [[12, 0], [13, 0], [14, 1], [14, 2], [13, 3], [12, 3]].map(([x, y]) => px(x, y, 'f2e7a8')).join('') : '';
    return svg(16, 16, moon + out, bg);
  }
  function iconArt(name, color) {
    const rows = ICONS[name] || ICONS.star, w = Math.max(...rows.map(r => r.length)), h = rows.length, S = Math.max(w, h) + 4;
    const ox = Math.floor((S - w) / 2), oy = Math.floor((S - h) / 2);
    let out = '';
    rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = ch === '#' ? color : ch === 'o' ? 'ffffff' : ch === 'p' ? 'f2a7b8' : null; if (c) out += px(ox + x, oy + y, c); }));
    return svg(S, S, out);
  }
  const RCOL = { common: '8a8a8a', rare: '3d7be0', epic: '9b5de5', legendary: 'd4a017' };
  function art(c) {
    if (!c) return iconArt('star', '888888');
    if (c.art) return breedArt(c.key, c.art);
    if (c.icon) return iconArt(c.icon, '141414');
    return window.CS ? CS.avatarUrl(c.avatar) : iconArt('user', '444444');
  }

  const CSS = `
.lccard{position:relative;width:150px;background:#f4efe2;border:3px solid #8a8a8a;border-radius:6px;padding:6px;box-sizing:border-box;font:11px Tahoma,Verdana,sans-serif;color:#141414;box-shadow:3px 3px 0 rgba(0,0,0,.35);overflow:hidden;text-align:left}
.lccard .t{display:flex;justify-content:space-between;align-items:center;gap:4px;font-weight:700;font-size:12px;margin-bottom:4px}
.lccard .t b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lccard .gem{flex:none;width:10px;height:10px;transform:rotate(45deg);border:1px solid #0006}
.lccard .art{display:block;width:100%;aspect-ratio:1;image-rendering:pixelated;background:#fff;border:2px solid #0003;box-sizing:border-box}
.lccard .set{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#555;margin:4px 0 2px}
.lccard .fl{font-style:italic;color:#333;min-height:26px;line-height:1.2;font-size:10px}
.lccard .n{position:absolute;top:30px;right:10px;background:#141414;color:#fff;font-weight:700;font-size:11px;padding:0 5px;border-radius:8px}
.lccard.rare{border-color:#3d7be0}.lccard.epic{border-color:#9b5de5;background:#efe6fb}.lccard.legendary{border-color:#d4a017;background:#fbf3d6}
.lccard.legendary::after,.lccard.shiny::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.65) 45%,transparent 60%);background-size:250% 100%;animation:lcholo 3s linear infinite}
.lccard.shiny{background:linear-gradient(135deg,#ffd6e8,#d6f0ff,#e6ffd6,#fff4c2,#ead6ff)}
.lccard.shiny .t b::after{content:" \\2726";color:#d4a017}
.lccard.missing{filter:grayscale(1) brightness(.75);opacity:.45}
.lccard.missing .art{visibility:hidden}
@keyframes lcholo{from{background-position:150% 0}to{background-position:-100% 0}}
@media (prefers-reduced-motion:reduce){.lccard::after{animation:none}}`;
  let styled = false;
  function style() { if (styled || !document.head) return; styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // key may end in * for shiny. n = how many you have (shown as a little number)
  function html(c, key, n, opts = {}) {
    style();
    const shiny = String(key).endsWith('*');
    if (!c) return `<div class="lccard"><div class="t"><b>retired card</b></div><img class="art" src="${art(null)}" alt=""><div class="fl">this one isn't around anymore</div></div>`;
    return `<div class="lccard ${c.rarity}${shiny ? ' shiny' : ''}${opts.missing ? ' missing' : ''}" data-key="${esc(key)}" title="${esc(c.name)} (${c.rarity}${shiny ? ', shiny' : ''})">
      <div class="t"><b>${esc(c.name)}</b><span class="gem" style="background:#${RCOL[c.rarity]}"></span></div>
      <img class="art" src="${art(c)}" alt="">${n > 1 ? `<span class="n">x${n}</span>` : ''}
      <div class="set">${esc(c.set)} &middot; ${c.rarity}${shiny ? ' &middot; shiny' : ''}${c.set === 'npcs' ? ' &middot; npc' : ''}</div>
      <div class="fl">${opts.missing ? '???' : esc(c.flavor)}</div></div>`;
  }
  let cat = null;
  async function catalog() {
    if (cat) return cat;
    const j = await (await fetch('https://api.landon.cool/api/cs/cards/catalog')).json();
    cat = { list: j.cards, by: Object.fromEntries(j.cards.map(c => [c.key, c])), sell: j.sell };
    return cat;
  }
  const base = k => String(k).replace(/\*$/, '');
  window.LC_CARDS = { art, html, catalog, base, RCOL, style };
})();
