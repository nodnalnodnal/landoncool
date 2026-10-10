// runs cubiomes (compiled to wasm) off the main thread
let e = null, colors = null;
const ready = (async () => {
  const stub = () => 0;
  const { instance } = await WebAssembly.instantiateStreaming(fetch('seedmap.wasm'),
    { wasi_snapshot_preview1: { fd_close: stub, fd_fdstat_get: stub, fd_seek: stub, fd_write: stub, proc_exit: stub } });
  e = instance.exports;
  e._initialize();
  colors = new Uint8Array(e.memory.buffer, e.colors_ptr(), 768).slice();
  const names = [];
  for (let id = 0; id < 256; id++) names.push(str(e.biome_name(id)));
  postMessage({ t: 'ready', names, vers: e.ver_count() });
})();

function str(ptr) {
  const a = new Uint8Array(e.memory.buffer, ptr);
  let s = '';
  for (let i = 0; a[i]; i++) s += String.fromCharCode(a[i]);
  return s;
}
// memory can grow during any call, so always make a fresh view after
const out = n => Array.from(new Int32Array(e.memory.buffer, e.out_ptr(), n * 2));

onmessage = async ({ data: m }) => {
  await ready;
  if (m.t === 'init') {
    e.init(m.ver, m.lo, m.hi, m.large ? 1 : 0);
    // names change slightly between versions
    const names = [];
    for (let id = 0; id < 256; id++) names.push(str(e.biome_name(id)));
    e.spawn();
    const spawn = out(1);
    const sn = e.strongholds(m.ver <= 6 ? 128 : 3);
    postMessage({ t: 'world', gen: m.gen, names, spawn, strongholds: out(sn) });
  } else if (m.t === 'tile') {
    const N = 64, p = e.biomes(m.tx * N, m.tz * N, N, N, m.s);
    const ids = new Uint8Array(N * N), rgba = new Uint8ClampedArray(N * N * 4);
    if (p) {
      const src = new Int32Array(e.memory.buffer, p, N * N);
      for (let i = 0; i < N * N; i++) {
        const id = src[i] & 255;
        ids[i] = id;
        rgba[i * 4] = colors[id * 3]; rgba[i * 4 + 1] = colors[id * 3 + 1]; rgba[i * 4 + 2] = colors[id * 3 + 2]; rgba[i * 4 + 3] = 255;
      }
    }
    postMessage({ t: 'tile', gen: m.gen, key: m.key, ids, rgba }, [ids.buffer, rgba.buffer]);
  } else if (m.t === 'structs') {
    const res = {};
    for (const i of m.types) {
      const n = e.structures(e.stype(i), m.x0, m.z0, m.x1, m.z1);
      res[i] = n < 0 ? null : out(n);
    }
    postMessage({ t: 'structs', gen: m.gen, req: m.req, res });
  }
};
