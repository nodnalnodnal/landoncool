// plain for vs code: run button + discord rich presence
const vscode = require('vscode');
const net = require('net');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ---------- discord ipc (no dependencies) ----------
// frames are: op (int32 le) + length (int32 le) + json
class Discord {
  constructor(clientId, log) { this.id = clientId; this.log = log; this.sock = null; this.ready = false; this.buf = Buffer.alloc(0); this.want = null; this.sent = undefined; this.lastSend = 0; this.lastTry = 0; this.pending = null; }

  paths() {
    if (process.platform === 'win32') return [...Array(10).keys()].map(i => `\\\\?\\pipe\\discord-ipc-${i}`);
    const base = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
    const dirs = [base, path.join(base, 'app/com.discordapp.Discord'), path.join(base, 'snap.discord'), path.join(base, '.flatpak/dev.vencord.Vesktop/xdg-run'), '/tmp'];
    return dirs.flatMap(d => [...Array(10).keys()].map(i => path.join(d, `discord-ipc-${i}`)));
  }

  connect() {
    if (this.sock || Date.now() - this.lastTry < 10000) return;
    this.lastTry = Date.now();
    const tryAt = list => {
      if (!list.length) { this.log('discord not running, will retry'); return; }
      const p = list[0];
      if (process.platform !== 'win32' && !fs.existsSync(p)) return tryAt(list.slice(1));
      const s = net.createConnection(p);
      s.once('error', () => { s.destroy(); tryAt(list.slice(1)); });
      s.once('connect', () => {
        s.removeAllListeners('error');
        this.sock = s;
        s.on('data', d => this.read(d));
        s.on('error', () => this.drop());
        s.on('close', () => this.drop());
        this.send(0, { v: 1, client_id: this.id });
      });
    };
    tryAt(this.paths());
  }

  drop() { if (this.sock) this.sock.destroy(); this.sock = null; this.ready = false; this.buf = Buffer.alloc(0); this.sent = undefined; clearTimeout(this.pending); this.pending = null; }

  send(op, obj) {
    if (!this.sock) return;
    const body = Buffer.from(JSON.stringify(obj));
    const head = Buffer.alloc(8);
    head.writeInt32LE(op, 0); head.writeInt32LE(body.length, 4);
    this.sock.write(Buffer.concat([head, body]));
  }

  read(d) {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 8) {
      const op = this.buf.readInt32LE(0), len = this.buf.readInt32LE(4);
      if (this.buf.length < 8 + len) return;
      const msg = JSON.parse(this.buf.subarray(8, 8 + len).toString());
      this.buf = this.buf.subarray(8 + len);
      if (op === 1 && msg.evt === 'READY') { this.ready = true; this.log('connected to discord'); this.flush(); }
      else if (op === 2) { this.log('discord closed: ' + (msg.message || '')); this.drop(); }
      else if (msg.evt === 'ERROR') this.log('discord error: ' + JSON.stringify(msg.data));
    }
  }

  set(activity) { this.want = activity; if (this.ready) this.flush(); else this.connect(); }

  // discord allows ~5 updates per 20s, so skip repeats and space them out
  flush() {
    const key = JSON.stringify(this.want);
    if (key === this.sent || this.pending) return;
    const wait = 4000 - (Date.now() - this.lastSend);
    if (wait > 0) { this.pending = setTimeout(() => { this.pending = null; this.flush(); }, wait); return; }
    this.sent = key; this.lastSend = Date.now();
    this.send(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: this.want || undefined }, nonce: String(Date.now()) + Math.random() });
  }
}

// ---------- extension ----------
let rpc = null, started = Date.now(), lastFile = null, timer = null, out;

function cfg() { return vscode.workspace.getConfiguration('plain'); }

function presence() {
  const c = cfg();
  const id = c.get('discord.clientId');
  if (!c.get('discord.enabled') || !id) { if (rpc) { rpc.set(null); rpc.drop(); rpc = null; } return; }
  if (!rpc || rpc.id !== id) { if (rpc) rpc.drop(); rpc = new Discord(id, m => out.appendLine(m)); }
  const ed = vscode.window.activeTextEditor;
  if (ed && ed.document.languageId === 'plain') {
    const file = path.basename(ed.document.fileName);
    if (file !== lastFile) { lastFile = file; started = Date.now(); }
    const lines = ed.document.lineCount;
    rpc.set({
      details: `editing ${file}`,
      state: `${lines} line${lines === 1 ? '' : 's'} of plain`,
      timestamps: { start: Math.floor(started / 1000) },
      assets: { large_image: 'plain', large_text: 'plain: code in words', small_image: 'cow', small_text: 'mrcowlord' },
      buttons: [{ label: 'what is plain', url: 'https://landon.cool/plain.htm' }],
    });
  } else {
    lastFile = null;
    rpc.set(null); // clear when you leave plain
  }
}

function runFile() {
  const ed = vscode.window.activeTextEditor;
  if (!ed || ed.document.languageId !== 'plain') return vscode.window.showWarningMessage('open a .plain file first');
  ed.document.save().then(() => {
    const file = ed.document.fileName;
    const dir = cfg().get('folder') || path.dirname(file);
    if (!fs.existsSync(path.join(dir, 'boot.py')) || !fs.existsSync(path.join(dir, 'plain.plain'))) {
      return vscode.window.showErrorMessage(`cant find boot.py and plain.plain in ${dir}. set "plain.folder" in settings.`, 'open settings')
        .then(b => b && vscode.commands.executeCommand('workbench.action.openSettings', 'plain.folder'));
    }
    const py = cfg().get('python') || (process.platform === 'win32' ? 'py' : 'python3');
    const q = s => `"${s}"`;
    let t = vscode.window.terminals.find(x => x.name === 'plain');
    if (!t) t = vscode.window.createTerminal({ name: 'plain', cwd: path.dirname(file) });
    t.show(true);
    t.sendText(`${py} ${q(path.join(dir, 'boot.py'))} ${q(path.join(dir, 'plain.plain'))} ${q(file)}`);
  });
}

function activate(context) {
  out = vscode.window.createOutputChannel('plain');
  context.subscriptions.push(
    out,
    vscode.commands.registerCommand('plain.run', runFile),
    vscode.window.onDidChangeActiveTextEditor(presence),
    vscode.workspace.onDidChangeTextDocument(e => { if (e.document.languageId === 'plain') presence(); }),
    vscode.workspace.onDidChangeConfiguration(e => { if (e.affectsConfiguration('plain')) presence(); }),
  );
  presence();
  timer = setInterval(presence, 15000); // reconnects if discord was opened later
}

function deactivate() { clearInterval(timer); if (rpc) { rpc.set(null); rpc.drop(); } }

module.exports = { activate, deactivate, Discord };
