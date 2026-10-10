// flappy bird - js port of the old pygame zero version (intro.py)
const WIDTH = 144;
const HEIGHT = 256;
const GRAVITY = 0.2;
const FLAP = -3.4;
const PIPE_SPEED = 1;
const PIPE_SPACING = 85;
const GAP = 64;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// load sprites
const names = [
  'backround_light', 'backround_dark', 'bird_frame_1', 'bird_frame_2', 'bird_frame_3',
  'pipe_green_up', 'pipe_green_down', 'gameover', 'getready', 'restart', 'flappylogo',
  '0_score', '1_score', '2_score', '3_score', '4_score', '5_score', '6_score', '7_score', '8_score', '9_score',
  'coin_gold_light', 'coin_gold_dark', 'coin_silver_light', 'coin_silver_dark',
];
const img = {};
let loading = names.length;
for (const n of names) {
  img[n] = new Image();
  img[n].onload = () => { if (--loading === 0) requestAnimationFrame(loop); };
  img[n].src = 'images/' + n + '.png';
}
const birdFrames = ['bird_frame_1', 'bird_frame_2', 'bird_frame_3'];

// game state: 'menu' -> 'ready' -> 'play' -> 'dead'
let state = 'menu';
let bird, pipes, score, coins, frame, deadAt;
let best = 0, bank = 0;
try { best = +localStorage.getItem('flappyBest') || 0; } catch (e) {}
try { bank = +localStorage.getItem('flappyCoins') || 0; } catch (e) {}

// sounds are made on the fly with web audio, no files needed. m mutes
let audio = null, muted = false;
try { muted = localStorage.getItem('flappyMuted') === '1'; } catch (e) {}

function beep(notes) {
  if (muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    let t = audio.currentTime;
    for (const [freq, len, type = 'square', vol = 0.08, slide] of notes) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + len);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + len);
      t += len * 0.8;
    }
  } catch (e) {}
}

const sfx = {
  flap: () => beep([[520, 0.07, 'triangle', 0.1, 880]]),
  point: () => beep([[880, 0.06], [1320, 0.1]]),
  silver: () => beep([[1200, 0.05, 'square', 0.06], [1800, 0.12, 'square', 0.06]]),
  gold: () => beep([[988, 0.05], [1319, 0.05], [1976, 0.16]]),
  hit: () => beep([[220, 0.25, 'sawtooth', 0.12, 55]]),
};

const restartBtn = { x: WIDTH / 2 - 26, y: HEIGHT / 2 + 26, w: 52, h: 29 };

function reset() {
  bird = { x: 40, y: HEIGHT / 2, vy: 0 };
  pipes = [];
  for (let i = 0; i < 2; i++) pipes.push(newPipe(WIDTH + 40 + i * PIPE_SPACING));
  score = 0;
  coins = 0;
  frame = 0;
}

function newPipe(x) {
  // gapTop range keeps both pipes touching the screen edges (pipes are 160 tall).
  // about a third of pipes have a coin floating between them and the next one,
  // at a random height so you have to go out of your way for it
  const coin = Math.random() < 0.35
    ? { gold: Math.random() < 0.2, y: 30 + Math.floor(Math.random() * 170), taken: false }
    : null;
  return { x, gapTop: 32 + Math.floor(Math.random() * 110), scored: false, coin };
}

function coinX(p) { return p.x + 26 + (PIPE_SPACING - 26) / 2 - 11; }

function flap() {
  if (state === 'menu') { state = 'ready'; reset(); return; }
  if (state === 'ready') { state = 'play'; startRun(); }
  if (state === 'play') { bird.vy = FLAP; sfx.flap(); }
  else if (state === 'dead' && frame - deadAt > 30) { reset(); state = 'ready'; }
}

function hits(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function die() {
  state = 'dead';
  deadAt = frame;
  sfx.hit();
  submitRun(score);
  bank += coins;
  try { localStorage.setItem('flappyCoins', bank); } catch (e) {}
  if (score > best) {
    best = score;
    try { localStorage.setItem('flappyBest', best); } catch (e) {}
  }
}

function update() {
  frame++;
  if (state === 'ready') {
    bird.y = HEIGHT / 2 + Math.sin(frame / 10) * 3;
    return;
  }
  if (state !== 'play') return;

  bird.vy += GRAVITY;
  bird.y += bird.vy;
  if (bird.y < 0) { bird.y = 0; bird.vy = 0; }
  if (bird.y + 12 > HEIGHT) { bird.y = HEIGHT - 12; die(); return; }

  for (const p of pipes) {
    p.x -= PIPE_SPEED;
    if (p.x + 26 < 0) Object.assign(p, newPipe(p.x + PIPE_SPACING * pipes.length));
    // slightly smaller hitbox than the sprite so near misses feel fair
    const bx = bird.x + 2, by = bird.y + 2, bw = 13, bh = 8;
    if (hits(bx, by, bw, bh, p.x, -1000, 26, p.gapTop + 1000) ||
        hits(bx, by, bw, bh, p.x, p.gapTop + GAP, 26, 1000)) { die(); return; }
    if (!p.scored && p.x + 26 < bird.x) { p.scored = true; score++; sfx.point(); }
    if (p.coin && !p.coin.taken && hits(bx, by, bw, bh, coinX(p) + 3, p.coin.y + 3, 16, 16)) {
      p.coin.taken = true;
      coins += p.coin.gold ? 5 : 1;
      (p.coin.gold ? sfx.gold : sfx.silver)();
    }
  }
}

function drawSprite(name, x, y) { ctx.drawImage(img[name], Math.round(x), Math.round(y)); }
function drawCentered(name, cy) { drawSprite(name, (WIDTH - img[name].width) / 2, cy - img[name].height / 2); }

function drawNumber(n, cy) {
  const digits = String(n).split('').map(d => d + '_score');
  const total = digits.reduce((w, d) => w + img[d].width + 1, -1);
  let x = (WIDTH - total) / 2;
  for (const d of digits) { drawSprite(d, x, cy - 9); x += img[d].width + 1; }
}

function drawCoins() {
  // small coin + count in the corner, plus a mute marker
  ctx.drawImage(img.coin_gold_light, 4, 4, 11, 11);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#543847';
  ctx.lineWidth = 3;
  ctx.font = 'bold 9px Verdana, sans-serif';
  ctx.textAlign = 'left';
  ctx.strokeText(String(coins), 18, 13);
  ctx.fillText(String(coins), 18, 13);
  if (muted) {
    ctx.textAlign = 'right';
    ctx.strokeText('MUTED', WIDTH - 4, 13);
    ctx.fillText('MUTED', WIDTH - 4, 13);
  }
}

function drawBird() {
  const f = birdFrames[Math.floor(frame / 8) % 3];
  const angle = state === 'play' ? Math.max(-0.5, Math.min(1.2, bird.vy * 0.15)) : 0;
  ctx.save();
  ctx.translate(Math.round(bird.x + 8.5), Math.round(bird.y + 6));
  ctx.rotate(angle);
  ctx.drawImage(img[f], -8.5, -6);
  ctx.restore();
}

function draw() {
  // night falls every 10 points
  const night = state !== 'menu' && Math.floor(score / 10) % 2 === 1;
  drawSprite(night ? 'backround_dark' : 'backround_light', 0, 0);

  if (state === 'menu') {
    drawCentered('flappylogo', HEIGHT / 2 - 30);
    drawSprite('restart', restartBtn.x, restartBtn.y);
    return;
  }
  for (const p of pipes) {
    drawSprite('pipe_green_down', p.x, p.gapTop - 160);
    drawSprite('pipe_green_up', p.x, p.gapTop + GAP);
    if (p.coin && !p.coin.taken) {
      // light and dark versions swap for a little shimmer, and it bobs
      const c = (p.coin.gold ? 'coin_gold_' : 'coin_silver_') + (Math.floor(frame / 15) % 2 ? 'dark' : 'light');
      drawSprite(c, coinX(p), p.coin.y + Math.sin((frame + p.x) / 12) * 2);
    }
  }
  drawBird();
  drawNumber(score, 24);
  drawCoins();

  if (state === 'ready') drawCentered('getready', HEIGHT / 2 - 40);
  if (state === 'dead') {
    drawCentered('gameover', HEIGHT / 2 - 10);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#543847';
    ctx.lineWidth = 3;
    ctx.font = 'bold 9px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText('BEST ' + best, WIDTH / 2, HEIGHT / 2 + 12);
    ctx.fillText('BEST ' + best, WIDTH / 2, HEIGHT / 2 + 12);
    ctx.strokeText('COINS ' + bank, WIDTH / 2, HEIGHT / 2 + 23);
    ctx.fillText('COINS ' + bank, WIDTH / 2, HEIGHT / 2 + 23);
    if (frame - deadAt > 30) drawSprite('restart', restartBtn.x, restartBtn.y);
  }
}

// fixed 60 updates per second regardless of monitor refresh rate
let last = 0, acc = 0;
function loop(t) {
  if (!last) last = t;
  acc = Math.min(acc + (t - last), 200);
  last = t;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}

// scale the canvas up by whole pixels so the sprites stay crisp
function resize() {
  const s = Math.max(1, Math.floor(Math.min((innerWidth - 16) / WIDTH, (innerHeight - 50) / HEIGHT)));
  canvas.style.width = WIDTH * s + 'px';
  canvas.style.height = HEIGHT * s + 'px';
}
addEventListener('resize', resize);
resize();

// ---------- global leaderboard (api.landon.cool/api/flappy) ----------
// the server hands out a token when a round starts and only takes scores
// that were possible in the time since, so you can't just post a big number
const API = 'https://api.landon.cool/api';
const nameBox = document.getElementById('name');
let run = null;
try { nameBox.value = localStorage.getItem('flappyName') || ''; } catch (e) {}
nameBox.addEventListener('input', () => {
  try { localStorage.setItem('flappyName', nameBox.value.trim()); } catch (e) {}
});

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function showBoard(board, mine) {
  const top = board.slice(0, 10);
  document.getElementById('top').innerHTML = top.length
    ? top.map((e, i) => `<li class="${mine && mine.t === e.t ? 'me' : ''}">${esc(e.name)}<span>${e.score}</span></li>`).join('')
    : '<li class="dim">nobody yet, be first</li>';
}

function loadBoard() {
  fetch(API + '/flappy').then(r => r.json()).then(j => showBoard(j.board || []))
    .catch(() => { document.getElementById('top').innerHTML = '<li class="dim">couldn\'t load</li>'; });
}

function startRun() {
  run = fetch(API + '/flappy/start', { method: 'POST' }).then(r => r.json()).then(j => j.token).catch(() => null);
}

async function submitRun(s) {
  const token = run && await run;
  run = null;
  if (!token) return;
  try {
    const r = await fetch(API + '/flappy/end', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, score: s, name: nameBox.value.trim() }),
    });
    const j = await r.json();
    if (!j.board) return;
    showBoard(j.board, j.rank ? j.board[j.rank - 1] : null);
    document.getElementById('rank').textContent = j.rank ? `you're #${j.rank} with ${j.score}!` : '';
  } catch (e) {}
}

loadBoard();

addEventListener('keydown', e => {
  if (e.target === nameBox) return; // typing your name shouldn't flap
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (!e.repeat) flap(); }
  if (e.code === 'KeyM' && !e.repeat) {
    muted = !muted;
    try { localStorage.setItem('flappyMuted', muted ? '1' : '0'); } catch (e) {}
  }
});
canvas.addEventListener('pointerdown', e => { e.preventDefault(); flap(); });

reset();
