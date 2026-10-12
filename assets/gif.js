// tiny animated gif maker for 88x31 buttons. frames are palette indexes (one byte per pixel).
// LC_GIF.encode(w, h, pal ['rrggbb'...], frames [Uint8Array...], delayMs) -> Uint8Array
// LC_GIF.url(...same) -> data: url
(() => {
  function encode(w, h, pal, frames, delay) {
    const out = [];
    const byte = b => out.push(b & 255), word = v => { byte(v); byte(v >> 8); }, str = s => { for (const c of s) byte(c.charCodeAt(0)); };
    let bits = 1; while ((1 << bits) < Math.max(2, pal.length)) bits++;
    const size = 1 << bits;
    str('GIF89a'); word(w); word(h);
    byte(0x80 | ((bits - 1) << 4) | (bits - 1)); byte(0); byte(0); // global color table
    for (let i = 0; i < size; i++) { const c = pal[i] || '000000'; byte(parseInt(c.slice(0, 2), 16)); byte(parseInt(c.slice(2, 4), 16)); byte(parseInt(c.slice(4, 6), 16)); }
    if (frames.length > 1) { byte(0x21); byte(0xff); byte(11); str('NETSCAPE2.0'); byte(3); byte(1); word(0); byte(0); } // loop forever
    const cs = Math.round((delay || 200) / 10);
    for (const f of frames) {
      byte(0x21); byte(0xf9); byte(4); byte(0); word(cs); byte(0); byte(0); // frame delay
      byte(0x2c); word(0); word(0); word(w); word(h); byte(0);
      const min = Math.max(2, bits);
      byte(min);
      const data = lzw(f, min), chunks = [];
      for (let i = 0; i < data.length; i += 255) chunks.push(data.slice(i, i + 255));
      for (const c of chunks) { byte(c.length); for (const b of c) byte(b); }
      byte(0);
    }
    byte(0x3b);
    return new Uint8Array(out);
  }
  function lzw(px, min) {
    const clear = 1 << min, eoi = clear + 1, out = [];
    let size = min + 1, next = eoi + 1, dict = new Map(), cur = 0, nbits = 0;
    const emit = code => { cur |= code << nbits; nbits += size; while (nbits >= 8) { out.push(cur & 255); cur >>>= 8; nbits -= 8; } };
    emit(clear);
    let prefix = px[0];
    for (let i = 1; i < px.length; i++) {
      const k = px[i], key = prefix * 4096 + k;
      if (dict.has(key)) { prefix = dict.get(key); continue; }
      emit(prefix);
      if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
      else { emit(clear); dict = new Map(); size = min + 1; next = eoi + 1; }
      prefix = k;
    }
    emit(prefix); emit(eoi);
    if (nbits > 0) out.push(cur & 255);
    return out;
  }
  function url(w, h, pal, frames, delay) {
    const b = encode(w, h, pal, frames, delay);
    let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
    return 'data:image/gif;base64,' + btoa(s);
  }
  // buttons from the api store frames as base64
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const button = b => url(88, 31, b.pal, b.frames.map(unb64), b.delay);
  window.LC_GIF = { encode, url, button, unb64 };
})();
