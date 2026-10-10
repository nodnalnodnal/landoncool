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
let bird, pipes, score, frame, deadAt;
let best = 0;
try { best = +localStorage.getItem('flappyBest') || 0; } catch (e) {}

const restartBtn = { x: WIDTH / 2 - 26, y: HEIGHT / 2 + 26, w: 52, h: 29 };

function reset() {
  bird = { x: 40, y: HEIGHT / 2, vy: 0 };
  pipes = [];
  for (let i = 0; i < 2; i++) pipes.push(newPipe(WIDTH + 40 + i * PIPE_SPACING));
  score = 0;
  frame = 0;
}

function newPipe(x) {
  // gapTop range keeps both pipes touching the screen edges (pipes are 160 tall)
  return { x, gapTop: 32 + Math.floor(Math.random() * 110), scored: false };
}

function flap() {
  if (state === 'menu') { state = 'ready'; reset(); return; }
  if (state === 'ready') state = 'play';
  if (state === 'play') bird.vy = FLAP;
  else if (state === 'dead' && frame - deadAt > 30) { reset(); state = 'ready'; }
}

function hits(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function die() {
  state = 'dead';
  deadAt = frame;
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
    if (!p.scored && p.x + 26 < bird.x) { p.scored = true; score++; }
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
  }
  drawBird();
  drawNumber(score, 24);

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

addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (!e.repeat) flap(); }
});
canvas.addEventListener('pointerdown', e => { e.preventDefault(); flap(); });

reset();
