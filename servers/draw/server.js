// shared drawing board for landon.cool/draw
// strokes are [x0,y0,x1,y1,color,size] on a fixed 1600x1000 canvas
import { WebSocketServer } from 'ws';
import fs from 'node:fs';

const W = 1600, H = 1000, MAX = 150000, FILE = process.env.DATA || '/data/strokes.json';
const ORIGINS = /^https?:\/\/(localhost(:\d+)?|(.+\.)?landon\.cool)$/;
const COLORS = /^#[0-9a-f]{6}$/i;

let strokes = [];
try { strokes = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
let dirty = false;
setInterval(() => {
  if (!dirty) return;
  dirty = false;
  fs.writeFile(FILE + '.tmp', JSON.stringify(strokes), e => !e && fs.rename(FILE + '.tmp', FILE, () => {}));
}, 10000);

const wss = new WebSocketServer({
  port: 8080,
  maxPayload: 64 * 1024,
  verifyClient: ({ origin }) => !origin || ORIGINS.test(origin),
});

let nextId = 1;
const send = (ws, m) => ws.readyState === 1 && ws.send(JSON.stringify(m));
const all = (m, except) => { const s = JSON.stringify(m); for (const c of wss.clients) if (c !== except && c.readyState === 1) c.send(s); };
const online = () => all({ t: 'n', n: wss.clients.size });

function valid(s) {
  if (!Array.isArray(s) || s.length !== 6) return false;
  const [x0, y0, x1, y1, c, w] = s;
  return [x0, x1].every(v => Number.isInteger(v) && v >= 0 && v <= W)
    && [y0, y1].every(v => Number.isInteger(v) && v >= 0 && v <= H)
    && Math.hypot(x1 - x0, y1 - y0) < 300
    && COLORS.test(c) && Number.isInteger(w) && w >= 1 && w <= 60;
}

wss.on('connection', ws => {
  ws.id = nextId++;
  let budget = 400; // strokes per second, refilled below
  const refill = setInterval(() => { budget = 400; }, 1000);
  send(ws, { t: 'hello', id: ws.id, w: W, h: H, strokes });
  online();

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 's' && Array.isArray(m.s)) {
      const ok = m.s.filter(valid).slice(0, Math.max(0, budget));
      budget -= ok.length;
      if (!ok.length) return;
      strokes.push(...ok);
      if (strokes.length > MAX) strokes.splice(0, strokes.length - MAX);
      dirty = true;
      all({ t: 's', s: ok }, ws);
    } else if (m.t === 'c' && Number.isFinite(m.x) && Number.isFinite(m.y)) {
      all({ t: 'c', id: ws.id, x: m.x | 0, y: m.y | 0, c: COLORS.test(m.c) ? m.c : '#000000' }, ws);
    }
  });
  ws.on('close', () => { clearInterval(refill); all({ t: 'bye', id: ws.id }); online(); });
});

// docker exec landon-draw kill -USR2 1  -> wipe the board
process.on('SIGUSR2', () => { strokes = []; dirty = true; all({ t: 'clear' }); console.log('board cleared'); });
console.log('draw server on :8080 with', strokes.length, 'strokes');
