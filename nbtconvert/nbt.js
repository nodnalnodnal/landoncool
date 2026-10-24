// nbt reader / writer (java = big endian, bedrock = little endian) plus java structure -> bedrock mcstructure.
(function (root) {
"use strict";

const T = { END: 0, BYTE: 1, SHORT: 2, INT: 3, LONG: 4, FLOAT: 5, DOUBLE: 6, BYTE_ARRAY: 7, STRING: 8, LIST: 9, COMPOUND: 10, INT_ARRAY: 11, LONG_ARRAY: 12 };
const NAMES = ["end", "byte", "short", "int", "long", "float", "double", "byte_array", "string", "list", "compound", "int_array", "long_array"];

// tags are { type, value }. compound value = Map(name -> tag). list value = { of, items:[tag] }
function read(buf, little) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); let o = 0;
  const dec = new TextDecoder();
  const need = (n) => { if (o + n > dv.byteLength) throw new Error("file ends early at byte " + o); };
  const u8 = () => { need(1); return dv.getUint8(o++); };
  const i8 = () => { need(1); return dv.getInt8(o++); };
  const i16 = () => { need(2); const v = dv.getInt16(o, little); o += 2; return v; };
  const u16 = () => { need(2); const v = dv.getUint16(o, little); o += 2; return v; };
  const i32 = () => { need(4); const v = dv.getInt32(o, little); o += 4; return v; };
  const i64 = () => { need(8); const v = dv.getBigInt64(o, little); o += 8; return v; };
  const f32 = () => { need(4); const v = dv.getFloat32(o, little); o += 4; return v; };
  const f64 = () => { need(8); const v = dv.getFloat64(o, little); o += 8; return v; };
  const str = () => { const n = u16(); need(n); const s = dec.decode(buf.subarray(o, o + n)); o += n; return s; };
  const len = () => { const n = i32(); if (n < 0 || n > 1e8) throw new Error("bad length " + n); return n; };
  function payload(t, depth) {
    if (depth > 512) throw new Error("nested too deep");
    switch (t) {
      case 1: return i8(); case 2: return i16(); case 3: return i32(); case 4: return i64();
      case 5: return f32(); case 6: return f64();
      case 7: { const n = len(); need(n); const a = new Int8Array(buf.slice(o, o + n).buffer); o += n; return a; }
      case 8: return str();
      case 9: { const of = u8(), n = len(); if (of > 12) throw new Error("bad list type " + of); const items = []; for (let i = 0; i < n; i++) items.push({ type: of, value: payload(of, depth + 1) }); return { of, items }; }
      case 10: { const m = new Map(); for (;;) { const tt = u8(); if (tt === 0) break; if (tt > 12) throw new Error("bad tag type " + tt); const k = str(); m.set(k, { type: tt, value: payload(tt, depth + 1) }); } return m; }
      case 11: { const n = len(), a = new Int32Array(n); for (let i = 0; i < n; i++) a[i] = i32(); return a; }
      case 12: { const n = len(), a = new BigInt64Array(n); for (let i = 0; i < n; i++) a[i] = i64(); return a; }
    }
    throw new Error("bad tag type " + t);
  }
  const t = u8(); if (t !== 10) throw new Error("root isn't a compound");
  const name = str(); const value = payload(10, 0);
  return { name, tag: { type: 10, value }, end: o };
}

function write(rootName, tag, little) {
  let buf = new Uint8Array(1 << 16), dv = new DataView(buf.buffer), o = 0;
  const enc = new TextEncoder();
  const grow = (n) => { if (o + n <= buf.length) return; let s = buf.length * 2; while (s < o + n) s *= 2; const b = new Uint8Array(s); b.set(buf); buf = b; dv = new DataView(buf.buffer); };
  const u8 = (v) => { grow(1); dv.setUint8(o++, v); };
  const i8 = (v) => { grow(1); dv.setInt8(o++, v); };
  const i16 = (v) => { grow(2); dv.setInt16(o, v, little); o += 2; };
  const i32 = (v) => { grow(4); dv.setInt32(o, v, little); o += 4; };
  const i64 = (v) => { grow(8); dv.setBigInt64(o, BigInt(v), little); o += 8; };
  const str = (s) => { const b = enc.encode(s); grow(2 + b.length); dv.setUint16(o, b.length, little); o += 2; buf.set(b, o); o += b.length; };
  function payload(t, v) {
    switch (t) {
      case 1: return i8(v); case 2: return i16(v); case 3: return i32(v); case 4: return i64(v);
      case 5: grow(4); dv.setFloat32(o, v, little); o += 4; return;
      case 6: grow(8); dv.setFloat64(o, v, little); o += 8; return;
      case 7: i32(v.length); grow(v.length); buf.set(new Uint8Array(v.buffer, v.byteOffset, v.length), o); o += v.length; return;
      case 8: return str(v);
      case 9: { const of = v.items.length ? v.of : (v.of || 0); u8(of); i32(v.items.length); v.items.forEach((x) => payload(of, x.value)); return; }
      case 10: for (const [k, x] of v) { u8(x.type); str(k); payload(x.type, x.value); } u8(0); return;
      case 11: i32(v.length); v.forEach((x) => i32(x)); return;
      case 12: i32(v.length); v.forEach((x) => i64(x)); return;
    }
  }
  u8(10); str(rootName); payload(10, tag.value);
  return buf.slice(0, o);
}

// ---------------------------------------------------------------- snbt preview

function snbt(tag, indent, depth, budget) {
  depth = depth || 0; budget = budget || { n: 4000 };
  if (budget.n-- <= 0) return "…";
  const pad = "  ".repeat(depth + 1), end = "  ".repeat(depth);
  const v = tag.value;
  switch (tag.type) {
    case 1: return v + "b"; case 2: return v + "s"; case 3: return String(v); case 4: return v + "L";
    case 5: return +v.toPrecision(7) + "f"; case 6: return v + "d";
    case 7: return "[B;" + Array.from(v.slice(0, 32)).join(",") + (v.length > 32 ? ",… " + v.length + " total" : "") + "]";
    case 8: return JSON.stringify(v);
    case 9: {
      if (!v.items.length) return "[]";
      const simple = v.of < 7 || v.of === 8;
      if (simple) { const s = v.items.slice(0, 32).map((x) => snbt(x, indent, depth + 1, budget)); return "[" + s.join(",") + (v.items.length > 32 ? ",… " + v.items.length + " total" : "") + "]"; }
      const s = v.items.slice(0, 64).map((x) => pad + snbt(x, indent, depth + 1, budget));
      return "[\n" + s.join(",\n") + (v.items.length > 64 ? ",\n" + pad + "… " + v.items.length + " total" : "") + "\n" + end + "]";
    }
    case 10: {
      if (!v.size) return "{}";
      const s = [...v].map(([k, x]) => pad + (/^[A-Za-z0-9_\-.+]+$/.test(k) ? k : JSON.stringify(k)) + ": " + snbt(x, indent, depth + 1, budget));
      return "{\n" + s.join(",\n") + "\n" + end + "}";
    }
    case 11: return "[I;" + Array.from(v.slice(0, 32)).join(",") + (v.length > 32 ? ",… " + v.length + " total" : "") + "]";
    case 12: return "[L;" + Array.from(v.slice(0, 16)).join(",") + (v.length > 16 ? ",… " + v.length + " total" : "") + "]";
  }
  return "?";
}

// ---------------------------------------------------------------- tag helpers

const tg = (type, value) => ({ type, value });
const S = (s) => tg(8, s), I = (n) => tg(3, n), B = (n) => tg(1, n);
const C = (obj) => tg(10, new Map(Object.entries(obj)));
const L = (of, items) => tg(9, { of, items });
const get = (c, k) => (c && c.type === 10 ? c.value.get(k) : undefined);
const listVals = (t) => (t && t.type === 9 ? t.value.items : []);
const ints = (t) => (t ? (t.type === 11 ? Array.from(t.value) : listVals(t).map((x) => Number(x.value))) : []);

// ---------------------------------------------------------------- java -> bedrock blocks

// bedrock 1.21.60 block version, bedrock upgrades older-looking states itself on load
const BLOCK_VERSION = 18168832;

const RENAME = {
  dirt_path: "grass_path", magma_block: "magma", nether_bricks: "nether_brick", red_nether_bricks: "red_nether_brick",
  end_stone_bricks: "end_bricks", snow_block: "snow", snow: "snow_layer", sugar_cane: "reeds", cobweb: "web", lily_pad: "waterlily",
  jack_o_lantern: "lit_pumpkin", terracotta: "hardened_clay", note_block: "noteblock", spawner: "mob_spawner", nether_quartz_ore: "quartz_ore",
  melon: "melon_block", slime_block: "slime", powered_rail: "golden_rail", cave_air: "air", void_air: "air", moving_piston: "moving_block",
  piston_head: "piston_arm_collision", bricks: "brick_block", wall_torch: "torch", redstone_wall_torch: "redstone_torch",
  oak_door: "wooden_door", oak_trapdoor: "trapdoor", oak_fence_gate: "fence_gate", oak_pressure_plate: "wooden_pressure_plate",
  oak_button: "wooden_button", oak_sign: "standing_sign", oak_wall_sign: "wall_sign", attached_melon_stem: "melon_stem",
  attached_pumpkin_stem: "pumpkin_stem", light_gray_glazed_terracotta: "silver_glazed_terracotta", tall_grass: "tall_grass",
  sticky_piston_head: "sticky_piston_arm_collision", nether_portal: "portal", enchanting_table: "enchanting_table", tripwire: "trip_wire",
  rose_bush: "rose_bush", comparator: "unpowered_comparator", repeater: "unpowered_repeater", stone_bricks: "stone_bricks",
  frogspawn: "frog_spawn", bubble_column: "bubble_column", water_cauldron: "cauldron", lava_cauldron: "cauldron", powder_snow_cauldron: "cauldron",
  wheat: "wheat", carrots: "carrots", potatoes: "potatoes", beetroots: "beetroot", cocoa: "cocoa", composter: "composter",
  shulker_box: "undyed_shulker_box", grass_block: "grass_block", short_grass: "short_grass", sweet_berry_bush: "sweet_berry_bush",
  skeleton_skull: "skeleton_skull", player_head: "player_head",
};
// lit java blocks that are separate block ids in bedrock
const LIT = { furnace: "lit_furnace", smoker: "lit_smoker", blast_furnace: "lit_blast_furnace", redstone_ore: "lit_redstone_ore", deepslate_redstone_ore: "lit_deepslate_redstone_ore", redstone_lamp: "lit_redstone_lamp" };
const UNLIT = { redstone_torch: "unlit_redstone_torch", redstone_wall_torch: "unlit_redstone_torch" };
const POWERED = { comparator: "powered_comparator", repeater: "powered_repeater" };
const SIX = /(dispenser|dropper|observer|piston|command_block|barrel|end_rod|lightning_rod|amethyst_cluster|amethyst_bud|hopper|shulker_box|crafter)$/;
const DIR6 = { down: 0, up: 1, north: 2, south: 3, west: 4, east: 5 };
const STAIR = { east: 0, west: 1, south: 2, north: 3 };
const DOOR = { east: 0, south: 1, west: 2, north: 3 };
const TORCH = { east: "west", west: "east", north: "south", south: "north" };
const SAPLING_AGE = /sapling$/;
const CROP_GROWTH = /^(wheat|carrots|potatoes|beetroots|melon_stem|pumpkin_stem)$/;

function mapBlock(jname, props, notes) {
  let id = jname.replace(/^minecraft:/, ""); const p = props || {}; const st = {}; let water = p.waterlogged === "true";
  const nb = (k, v) => (st[k] = B(v ? 1 : 0));
  // fence / wall / stair connections are left out on purpose, bedrock works them out
  const known = new Set(["waterlogged"]);
  const use = (k) => known.add(k);

  if (p.lit === "true" && LIT[id]) { id = LIT[id]; use("lit"); }
  else if (p.lit === "false" && UNLIT[id]) { const t = id; id = UNLIT[id]; use("lit"); if (t.includes("wall")) id = id + "#wall"; }
  else if (p.lit !== undefined && /candle|campfire/.test(id)) { if (/campfire/.test(id)) nb("extinguished", p.lit !== "true"); else nb("lit", p.lit === "true"); use("lit"); }
  else if (p.lit !== undefined) use("lit");
  if (p.powered === "true" && POWERED[id]) { id = POWERED[id]; use("powered"); }
  if (id === "daylight_detector" && p.inverted === "true") { id = "daylight_detector_inverted"; use("inverted"); }

  // signs
  let m;
  if ((m = /^(\w+?)_wall_sign$/.exec(id)) && m[1] !== "oak") id = m[1] + "_wall_sign";
  else if ((m = /^(\w+?)_sign$/.exec(id)) && m[1] !== "oak" && !/hanging/.test(id)) id = m[1] + "_standing_sign";
  if (/standing_sign$|^standing_sign$|_banner$/.test(id) && p.rotation !== undefined && !/wall/.test(id)) { st.ground_sign_direction = I(+p.rotation); use("rotation"); }
  if (/_banner$/.test(id) && !/wall/.test(id)) { id = "standing_banner"; notes.add("banner colors and patterns live in the block entity, they come out white"); }
  if (/_wall_banner$/.test(id)) { id = "wall_banner"; notes.add("banner colors and patterns live in the block entity, they come out white"); }

  // slabs
  if (/_slab$/.test(id) && p.type) {
    use("type");
    if (p.type === "double") id = id.replace(/_slab$/, "_double_slab");
    st["minecraft:vertical_half"] = S(p.type === "top" ? "top" : "bottom");
  }

  if (p.axis) { st.pillar_axis = S(p.axis); use("axis"); }

  if (p.facing) {
    use("facing"); const f = p.facing;
    if (/_stairs$/.test(id)) st.weirdo_direction = I(STAIR[f] ?? 0);
    else if (/door$/.test(id) && !/trapdoor/.test(id)) st["minecraft:cardinal_direction"] = S(f);
    else if (/trapdoor$/.test(id)) st.direction = I({ west: 1, east: 0, north: 3, south: 2 }[f] ?? 0);
    else if (/torch/.test(id) && /wall/.test(jname)) st.torch_facing_direction = S(TORCH[f] || "top");
    else if (/#wall$/.test(id)) { id = id.replace("#wall", ""); st.torch_facing_direction = S(TORCH[f] || "top"); }
    else if (/(lever|button)$/.test(id)) { st.facing_direction = I(p.face === "floor" ? 1 : p.face === "ceiling" ? 0 : DIR6[f]); use("face"); }
    else if (/ladder|wall_sign|wall_banner|_wall_head|_wall_skull/.test(id)) st.facing_direction = I(DIR6[f]);
    else if (/observer/.test(id)) st["minecraft:facing_direction"] = S(f);
    else if (SIX.test(id)) st.facing_direction = I(DIR6[f]);
    else st["minecraft:cardinal_direction"] = S(f);
  }
  if (id.endsWith("#wall")) { id = id.replace("#wall", ""); }
  if (/torch$/.test(id) && !p.facing && !st.torch_facing_direction) st.torch_facing_direction = S("top");
  if (p.face && /grindstone|bell/.test(id)) { st.attachment = S({ floor: "standing", wall: "side", ceiling: "hanging" }[p.face] || "standing"); use("face"); }

  if (p.half) {
    use("half");
    if (/_stairs$|trapdoor$/.test(id)) nb("upside_down_bit", p.half === "top");
    else if (/door$/.test(id)) nb("upper_block_bit", p.half === "upper");
    else st["minecraft:vertical_half"] = S(p.half === "top" || p.half === "upper" ? "top" : "bottom");
  }
  if (/(_door|^wooden_door)$/.test(id) && p.hinge) { nb("door_hinge_bit", p.hinge === "right"); use("hinge"); }
  if (p.open !== undefined) { nb("open_bit", p.open === "true"); use("open"); }
  if (p.powered !== undefined && !known.has("powered")) {
    use("powered");
    if (/button$/.test(id)) nb("button_pressed_bit", p.powered === "true");
    else if (/rail$/.test(id) || /lever$/.test(id)) nb(/lever/.test(id) ? "open_bit" : "rail_data_bit", p.powered === "true");
    else if (/pressure_plate/.test(id)) st.redstone_signal = I(p.powered === "true" ? 15 : 0);
  }
  if (p.persistent !== undefined) { nb("persistent_bit", p.persistent === "true"); use("persistent"); }
  if (p.age !== undefined) { use("age"); if (CROP_GROWTH.test(id)) st.growth = I(+p.age); else if (SAPLING_AGE.test(id)) nb("age_bit", +p.age > 0); else st.age = I(+p.age); }
  if (p.stage !== undefined && SAPLING_AGE.test(id)) { nb("age_bit", p.stage === "1"); use("stage"); }
  if (p.level !== undefined) { use("level"); if (id === "water" || id === "lava") st.liquid_depth = I(+p.level); else if (/cauldron/.test(jname)) { st.fill_level = I(Math.round(+p.level * 2)); st.cauldron_liquid = S(/lava/.test(jname) ? "lava" : /powder/.test(jname) ? "powder_snow" : "water"); } else if (id === "composter") st.composter_fill_level = I(+p.level); else if (id === "light") st.block_light_level = I(+p.level); }
  if (/lava_cauldron/.test(jname)) { st.fill_level = I(6); st.cauldron_liquid = S("lava"); }
  if (p.layers !== undefined) { st.height = I(+p.layers - 1); use("layers"); }
  if (p.candles !== undefined) { st.candles = I(+p.candles - 1); use("candles"); }
  if (p.pickles !== undefined) { st.cluster_count = I(+p.pickles - 1); use("pickles"); }
  if (p.eggs !== undefined) { st.turtle_egg_count = S(["one_egg", "two_egg", "three_egg", "four_egg"][+p.eggs - 1] || "one_egg"); use("eggs"); }
  if (p.bites !== undefined) { st.bite_counter = I(+p.bites); use("bites"); }
  if (p.moisture !== undefined) { st.moisturized_amount = I(+p.moisture); use("moisture"); }
  if (p.power !== undefined) { st.redstone_signal = I(+p.power); use("power"); }
  if (p.delay !== undefined) { st.repeater_delay = I(+p.delay - 1); use("delay"); }
  if (p.mode !== undefined && /comparator/.test(id)) { nb("output_subtract_bit", p.mode === "subtract"); use("mode"); }
  if (p.type !== undefined && /chest$/.test(id)) { use("type"); if (p.type !== "single") notes.add("double chests pair up from the block entity, place them and they may show as two singles"); }
  if (p.part !== undefined && /_bed$/.test(id)) { nb("head_piece_bit", p.part === "head"); use("part"); }
  if (p.occupied !== undefined) use("occupied");
  if (/_bed$/.test(id)) { if (p.facing) { delete st["minecraft:cardinal_direction"]; st.direction = I(DOOR[p.facing] === undefined ? 0 : { south: 0, west: 1, north: 2, east: 3 }[p.facing]); } notes.add("bed colors live in the block entity, beds come out red"); id = "bed"; }
  if (/_shulker_box$/.test(id) || id === "undyed_shulker_box") { delete st.facing_direction; known.add("facing"); }
  if (/^(tall_grass|large_fern|sunflower|lilac|rose_bush|peony|tall_seagrass|pitcher_plant)$/.test(id) && p.half) { delete st["minecraft:vertical_half"]; nb("upper_block_bit", p.half === "upper"); }

  if (RENAME[id]) id = RENAME[id];
  // anything left over is a state we don't know how to translate
  const left = Object.keys(p).filter((k) => !known.has(k) && !["snowy", "distance", "shape", "north", "south", "east", "west", "up", "note", "instrument", "short", "extended"].includes(k));
  if (left.length) notes.add(jname.replace(/^minecraft:/, "") + ": dropped " + left.join(", ") + " (bedrock fills in defaults)");

  return { name: "minecraft:" + id, states: st, water };
}

function javaStructureToBedrock(java) {
  const root = java.tag, notes = new Set();
  const size = ints(get(root, "size"));
  if (size.length !== 3) throw new Error("no size, this doesn't look like a structure .nbt");
  let palette = get(root, "palette");
  const palettes = get(root, "palettes");
  if (!palette && palettes) { palette = listVals(palettes)[0]; notes.add("this structure has " + listVals(palettes).length + " palette variants, used the first"); }
  const jp = listVals(palette).map((e) => {
    const name = get(e, "Name").value; const props = {};
    const pr = get(e, "Properties"); if (pr) for (const [k, v] of pr.value) props[k] = String(v.value);
    return mapBlock(name, props, notes);
  });
  // bedrock palette: dedupe mapped blocks
  const bp = [], key = new Map(), jToB = [];
  const add = (n, st) => { const k = n + JSON.stringify([...Object.entries(st)].map(([a, b]) => [a, b.value]).sort()); if (!key.has(k)) { key.set(k, bp.length); bp.push(C({ name: S(n), states: C(st), version: I(BLOCK_VERSION) })); } return key.get(k); };
  jp.forEach((b) => jToB.push(add(b.name, b.states)));
  const waterIx = add("minecraft:water", { liquid_depth: I(0) });

  const [sx, sy, sz] = size, n = sx * sy * sz;
  const l0 = new Int32Array(n).fill(-1), l1 = new Int32Array(n).fill(-1);
  const posData = new Map();
  let blocks = 0, be = 0;
  for (const b of listVals(get(root, "blocks"))) {
    const [x, y, z] = ints(get(b, "pos")); const s = Number(get(b, "state").value);
    if (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) continue;
    const i = (x * sy + y) * sz + z;
    l0[i] = jToB[s]; if (jp[s].water) l1[i] = waterIx;
    blocks++;
    if (get(b, "nbt")) be++;
  }
  if (be) notes.add(be + " block entit" + (be === 1 ? "y" : "ies") + " (chest items, sign text, spawner mobs) weren't carried over, their blocks are placed empty");
  const ents = listVals(get(root, "entities")).length;
  if (ents) notes.add(ents + " entit" + (ents === 1 ? "y" : "ies") + " dropped, entity nbt doesn't translate between editions");

  const toList = (arr) => L(3, Array.from(arr, (v) => I(v)));
  const out = C({
    format_version: I(1),
    size: L(3, size.map(I)),
    structure: C({
      block_indices: L(9, [toList(l0), toList(l1)]),
      entities: L(10, []),
      palette: C({ default: C({ block_palette: L(10, bp), block_position_data: tg(10, posData) }) }),
    }),
    structure_world_origin: L(3, [I(0), I(0), I(0)]),
  });
  return { tag: out, notes: [...notes], stats: { size, blocks, palette: bp.length } };
}

const isStructure = (tag) => !!(get(tag, "size") && (get(tag, "palette") || get(tag, "palettes")) && get(tag, "blocks"));

const api = { read, write, snbt, NAMES, isStructure, javaStructureToBedrock, mapBlock };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.NBT = api;
})(this);
