// live visitors: how many people are on landon.cool right now, plus everyone
// else's cursor on this page. each tab posts to api.landon.cool/api/here every
// 1.5s with where its mouse is (as a fraction of the window), and gets back
// the others. nothing is stored, people drop off 6s after they leave
(() => {
  const API = 'https://api.landon.cool/api/here';
  const EVERY = 1500;
  let id;
  try { id = sessionStorage.getItem('liveId'); } catch (e) {}
  if (!id) {
    id = Math.random().toString(36).slice(2, 12).padEnd(10, '0');
    try { sessionStorage.setItem('liveId', id); } catch (e) {}
  }

  let x = null, y = null;
  addEventListener('mousemove', e => { x = e.clientX / innerWidth; y = e.clientY / innerHeight; }, { passive: true });
  document.addEventListener('mouseleave', () => { x = y = null; });

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9500;overflow:hidden';
  document.body.appendChild(layer);
  const cursors = new Map(); // id -> element

  // same pixel arrow for everyone, colored from their id
  function cursorEl(cid) {
    let h = 0;
    for (const c of cid) h = (h * 31 + c.charCodeAt(0)) % 360;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;transition:transform 1.5s linear;will-change:transform';
    el.innerHTML = `<svg width="13" height="19" viewBox="0 0 13 19" shape-rendering="crispEdges">
      <path d="M0 0v16l4-4 3 7 3-1-3-7h6z" fill="hsl(${h} 80% 60%)" stroke="#000" stroke-width="1"/></svg>`;
    layer.appendChild(el);
    return el;
  }

  function render(list) {
    const seen = new Set();
    for (const c of list) {
      seen.add(c.id);
      let el = cursors.get(c.id);
      if (!el) {
        el = cursorEl(c.id);
        cursors.set(c.id, el);
        el.style.transition = 'none'; // jump straight there the first time
      } else el.style.transition = '';
      el.style.transform = `translate(${c.x * innerWidth}px,${c.y * innerHeight}px)`;
    }
    for (const [cid, el] of cursors) if (!seen.has(cid)) { el.remove(); cursors.delete(cid); }
  }

  const badge = document.getElementById('online');

  async function ping() {
    if (document.hidden) return;
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, page: location.pathname, x, y }),
      });
      const j = await r.json();
      if (j.error) return;
      if (badge) {
        badge.textContent = '● ' + j.online;
        badge.title = `${j.online} on landon.cool right now, ${j.here} on this page`;
      }
      render(j.cursors || []);
    } catch (e) {}
  }

  ping();
  setInterval(ping, EVERY);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ping(); else render([]); });
})();
