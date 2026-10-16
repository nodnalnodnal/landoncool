// command porter: converts minecraft java commands between versions, both directions.
// works as a chain of steps between version eras. upgrading runs steps forward,
// downgrading runs their inverses backward. anything it can't convert gets a warning.
(function (root) {
"use strict";

const VERSIONS = [
  { id: "1.12", label: "1.12.2 and older" },
  { id: "1.13", label: "1.13 - 1.16.5" },
  { id: "1.17", label: "1.17 - 1.20.2" },
  { id: "1.20.3", label: "1.20.3 - 1.20.4" },
  { id: "1.20.5", label: "1.20.5 - 1.21.3" },
  { id: "1.21.4", label: "1.21.4" },
  { id: "1.21.5", label: "1.21.5 - 1.21.10" },
  { id: "1.21.11", label: "1.21.11" },
  { id: "26.1", label: "26.1" },
  { id: "26.2", label: "26.2" },
  { id: "26.3", label: "26.3 and newer" },
];

// ---------------------------------------------------------------- tokenizing

function splitTop(s, sep) {
  const out = []; let cur = "", depth = 0, q = null, esc = false;
  for (const ch of s) {
    if (q) { cur += ch; if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if ("{[(".includes(ch)) depth++;
    if ("}])".includes(ch)) depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
const toks = (s) => splitTop(s.trim(), " ").filter((t) => t !== "");

// ---------------------------------------------------------------- snbt

function parseSNBT(src) {
  let i = 0;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  const err = (m) => { throw new Error(m + " at " + i); };
  function str() {
    const q = src[i++]; let v = "";
    while (i < src.length && src[i] !== q) { if (src[i] === "\\") { i++; v += src[i] === "n" ? "\n" : src[i]; } else v += src[i]; i++; }
    if (src[i] !== q) err("unclosed string"); i++;
    return { t: "str", v, q };
  }
  function bare() {
    const m = /^[^,\]\}:\s=]+/.exec(src.slice(i)); if (!m) err("expected value");
    i += m[0].length; const raw = m[0];
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?[bBsSlLfFdD]?$/.test(raw)) return { t: "num", raw };
    if (raw === "true" || raw === "false") return { t: "bool", v: raw === "true" };
    return { t: "str", v: raw, q: null };
  }
  function value() {
    ws(); const c = src[i];
    if (c === "{") {
      i++; const v = []; ws();
      if (src[i] === "}") { i++; return { t: "comp", v }; }
      for (;;) {
        ws(); const k = src[i] === '"' || src[i] === "'" ? str().v : key();
        ws(); if (src[i] !== ":") err("expected :"); i++;
        v.push([k, value()]); ws();
        if (src[i] === ",") { i++; ws(); if (src[i] === "}") { i++; break; } continue; }
        if (src[i] === "}") { i++; break; } err("expected , or }");
      }
      return { t: "comp", v };
    }
    if (c === "[") {
      i++; ws();
      const arr = /^([BIL]);/.exec(src.slice(i));
      if (arr) { i += 2; const v = []; ws(); while (src[i] !== "]") { v.push(bare().raw); ws(); if (src[i] === ",") i++; ws(); } i++; return { t: "arr", kind: arr[1], v }; }
      const v = []; if (src[i] === "]") { i++; return { t: "list", v }; }
      for (;;) { v.push(value()); ws(); if (src[i] === ",") { i++; ws(); if (src[i] === "]") { i++; break; } continue; } if (src[i] === "]") { i++; break; } err("expected , or ]"); }
      return { t: "list", v };
    }
    if (c === '"' || c === "'") return str();
    return bare();
  }
  function key() {
    const m = /^[^:\s,{}\[\]]+/.exec(src.slice(i)); if (!m) err("expected key");
    i += m[0].length; return m[0];
  }
  const v = value(); ws();
  if (i < src.length) err("trailing text");
  return v;
}

const KEY_OK = /^[A-Za-z0-9_\-.+]+$/;
function quote(s, pref) {
  if (pref === "'" || (s.includes('"') && !s.includes("'")))
    return "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
function toSNBT(n) {
  switch (n.t) {
    case "comp": return "{" + n.v.map(([k, v]) => (KEY_OK.test(k) ? k : quote(k)) + ":" + toSNBT(v)).join(",") + "}";
    case "list": return "[" + n.v.map(toSNBT).join(",") + "]";
    case "arr": return "[" + n.kind + ";" + n.v.join(",") + "]";
    case "num": return n.raw;
    case "bool": return n.v ? "true" : "false";
    case "str": return n.q === null && KEY_OK.test(n.v) && !/^[\d.+-]/.test(n.v) ? n.v : quote(n.v, n.q);
  }
}
const S = (v, q) => ({ t: "str", v, q: q === undefined ? '"' : q });
const N = (raw) => ({ t: "num", raw: String(raw) });
const C = (pairs) => ({ t: "comp", v: pairs });
const L = (items) => ({ t: "list", v: items });
const get = (c, k) => { if (!c || c.t !== "comp") return undefined; const p = c.v.find(([kk]) => kk === k); return p && p[1]; };
const del = (c, k) => { const ix = c.v.findIndex(([kk]) => kk === k); if (ix >= 0) c.v.splice(ix, 1); };
const set = (c, k, val) => { const p = c.v.find(([kk]) => kk === k); if (p) p[1] = val; else c.v.push([k, val]); };
const num = (n) => (n && n.t === "num" ? parseFloat(n.raw) : n && n.t === "bool" ? (n.v ? 1 : 0) : NaN);
const sval = (n) => (n && n.t === "str" ? n.v : n && n.t === "num" ? n.raw : undefined);
const ns = (id) => (id.includes(":") ? id : "minecraft:" + id);
const unns = (id) => id.replace(/^minecraft:/, "");

// snbt <-> plain js (for text components)
class Raw { constructor(n) { this.n = n; } }
// keep=true keeps typed numbers / arrays exact (for predicates), false gives plain json values (for text)
function toJS(n, keep) {
  switch (n.t) {
    case "comp": { const o = {}; n.v.forEach(([k, v]) => (o[k] = toJS(v, keep))); return o; }
    case "list": return n.v.map((x) => toJS(x, keep));
    case "arr": return keep ? new Raw(n) : n.v.map((x) => parseFloat(x));
    case "num": return keep && /[a-z]$/i.test(n.raw) ? new Raw(n) : parseFloat(n.raw);
    case "bool": return n.v;
    case "str": return n.v;
  }
}
function fromJS(o) {
  if (o instanceof Raw) return o.n;
  if (Array.isArray(o)) return L(o.map(fromJS));
  if (o && typeof o === "object") return C(Object.entries(o).map(([k, v]) => [k, fromJS(v)]));
  if (typeof o === "boolean") return { t: "bool", v: o };
  if (typeof o === "number") return N(o);
  return S(String(o));
}

// ---------------------------------------------------------------- selectors

function parseSel(t) {
  const m = /^(@[pares])(?:\[(.*)\])?$/s.exec(t);
  if (!m) return null;
  const args = m[2] ? splitTop(m[2], ",").filter((a) => a.trim()).map((a) => { const ix = a.indexOf("="); return [a.slice(0, ix).trim(), a.slice(ix + 1).trim()]; }) : [];
  return { head: m[1], args };
}
const selStr = (s) => s.head + (s.args.length ? "[" + s.args.map(([k, v]) => k + "=" + v).join(",") + "]" : "");
const range = (lo, hi) => (lo !== undefined && hi !== undefined ? (lo === hi ? lo : lo + ".." + hi) : lo !== undefined ? lo + ".." : ".." + hi);
function unrange(v) {
  if (!v.includes("..")) return [v, v];
  const [a, b] = v.split(".."); return [a === "" ? undefined : a, b === "" ? undefined : b];
}
const GM = ["survival", "creative", "adventure", "spectator"];
const GM_SHORT = { s: 0, c: 1, a: 2, sp: 3 };

function selUp12(t, W) {
  const s = parseSel(t); if (!s) return t;
  const out = [], kv = Object.fromEntries(s.args);
  const scores = {};
  for (const [k, v] of s.args) {
    if (k === "r" || k === "rm") continue;
    if (k === "l" || k === "lm" || k === "rx" || k === "rxm" || k === "ry" || k === "rym") continue;
    if (k === "c") { const n = parseInt(v); out.push(["limit", String(Math.abs(n))]); if (s.head !== "@p" && s.head !== "@r") out.push(["sort", n < 0 ? "furthest" : "nearest"]); else if (n < 0) out.push(["sort", "furthest"]); continue; }
    if (k === "m") { const neg = v.startsWith("!"); let g = v.replace("!", ""); g = GM[parseInt(g)] ?? GM[GM_SHORT[g]] ?? g; out.push(["gamemode", (neg ? "!" : "") + g]); continue; }
    let sm = /^score_(.+?)(_min)?$/.exec(k);
    if (sm) { scores[sm[1]] = scores[sm[1]] || {}; scores[sm[1]][sm[2] ? "min" : "max"] = v; continue; }
    out.push([k, v]);
  }
  if (kv.r !== undefined || kv.rm !== undefined) out.push(["distance", range(kv.rm, kv.r)]);
  if (kv.l !== undefined || kv.lm !== undefined) out.push(["level", range(kv.lm, kv.l)]);
  if (kv.rx !== undefined || kv.rxm !== undefined) out.push(["x_rotation", range(kv.rxm, kv.rx)]);
  if (kv.ry !== undefined || kv.rym !== undefined) out.push(["y_rotation", range(kv.rym, kv.ry)]);
  const sc = Object.entries(scores);
  if (sc.length) out.push(["scores", "{" + sc.map(([o, r]) => o + "=" + range(r.min, r.max)).join(",") + "}"]);
  s.args = out; return selStr(s);
}
function selDown13(t, W) {
  const s = parseSel(t); if (!s) return t;
  const out = []; let limit, sort;
  for (const [k, v] of s.args) {
    if (k === "distance") { const [a, b] = unrange(v); if (a !== undefined) out.push(["rm", a]); if (b !== undefined) out.push(["r", b]); }
    else if (k === "level") { const [a, b] = unrange(v); if (a !== undefined) out.push(["lm", a]); if (b !== undefined) out.push(["l", b]); }
    else if (k === "x_rotation") { const [a, b] = unrange(v); if (a !== undefined) out.push(["rxm", a]); if (b !== undefined) out.push(["rx", b]); }
    else if (k === "y_rotation") { const [a, b] = unrange(v); if (a !== undefined) out.push(["rym", a]); if (b !== undefined) out.push(["ry", b]); }
    else if (k === "gamemode") { const neg = v.startsWith("!"); const g = GM.indexOf(v.replace("!", "")); out.push(["m", (neg ? "!" : "") + (g >= 0 ? g : v)]); }
    else if (k === "limit") limit = parseInt(v);
    else if (k === "sort") sort = v;
    else if (k === "scores") {
      for (const p of splitTop(v.slice(1, -1), ",")) { if (!p.trim()) continue; const [o, r] = p.split("="); const [a, b] = unrange(r.trim()); if (a !== undefined) out.push(["score_" + o.trim() + "_min", a]); if (b !== undefined) out.push(["score_" + o.trim(), b]); }
    }
    else if (k === "nbt" || k === "advancements" || k === "predicate") W.push(`selector argument "${k}" doesn't exist in 1.12, removed it`);
    else out.push([k, v]);
  }
  if (limit !== undefined) out.push(["c", String(sort === "furthest" ? -limit : limit)]);
  if (sort === "random" && s.head !== "@r") W.push("sort=random has no 1.12 version, use @r");
  s.args = out; return selStr(s);
}
const mapSels = (cmd, fn) => toks(cmd).map((t) => (t.startsWith("@") ? fn(t) : t)).join(" ");

// ---------------------------------------------------------------- 1.12 <-> 1.13 tables

const COLORS = ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"];
const COLORED = { wool: "wool", stained_glass: "stained_glass", stained_glass_pane: "stained_glass_pane", stained_hardened_clay: "terracotta", concrete: "concrete", concrete_powder: "concrete_powder", carpet: "carpet", bed: "bed", banner: "banner", shulker_box: null };
const DATA = {
  stone: ["stone", "granite", "polished_granite", "diorite", "polished_diorite", "andesite", "polished_andesite"],
  planks: ["oak_planks", "spruce_planks", "birch_planks", "jungle_planks", "acacia_planks", "dark_oak_planks"],
  log: ["oak_log", "spruce_log", "birch_log", "jungle_log"], log2: ["acacia_log", "dark_oak_log"],
  leaves: ["oak_leaves", "spruce_leaves", "birch_leaves", "jungle_leaves"], leaves2: ["acacia_leaves", "dark_oak_leaves"],
  sapling: ["oak_sapling", "spruce_sapling", "birch_sapling", "jungle_sapling", "acacia_sapling", "dark_oak_sapling"],
  dirt: ["dirt", "coarse_dirt", "podzol"], sand: ["sand", "red_sand"],
  sandstone: ["sandstone", "chiseled_sandstone", "cut_sandstone"], red_sandstone: ["red_sandstone", "chiseled_red_sandstone", "cut_red_sandstone"],
  stonebrick: ["stone_bricks", "mossy_stone_bricks", "cracked_stone_bricks", "chiseled_stone_bricks"],
  quartz_block: ["quartz_block", "chiseled_quartz_block", "quartz_pillar"],
  prismarine: ["prismarine", "prismarine_bricks", "dark_prismarine"],
  red_flower: ["poppy", "blue_orchid", "allium", "azure_bluet", "red_tulip", "orange_tulip", "white_tulip", "pink_tulip", "oxeye_daisy"],
  tallgrass: ["dead_bush", "grass", "fern"], double_plant: ["sunflower", "lilac", "tall_grass", "large_fern", "rose_bush", "peony"],
  cobblestone_wall: ["cobblestone_wall", "mossy_cobblestone_wall"], sponge: ["sponge", "wet_sponge"],
  golden_apple: ["golden_apple", "enchanted_golden_apple"], coal: ["coal", "charcoal"],
  skull: ["skeleton_skull", "wither_skeleton_skull", "zombie_head", "player_head", "creeper_head", "dragon_head"],
  fish: ["cod", "salmon", "tropical_fish", "pufferfish"], cooked_fish: ["cooked_cod", "cooked_salmon"],
  dye: ["ink_sac", "rose_red", "cactus_green", "cocoa_beans", "lapis_lazuli", "purple_dye", "cyan_dye", "light_gray_dye", "gray_dye", "pink_dye", "lime_dye", "dandelion_yellow", "light_blue_dye", "magenta_dye", "orange_dye", "bone_meal"],
};
const RENAME13 = {
  grass: "grass_block", stonebrick: "stone_bricks", brick_block: "bricks", nether_brick: "nether_bricks", quartz_ore: "nether_quartz_ore",
  lit_pumpkin: "jack_o_lantern", snow_layer: "snow", snow: "snow_block", web: "cobweb", deadbush: "dead_bush", yellow_flower: "dandelion",
  noteblock: "note_block", golden_rail: "powered_rail", piston_extension: "moving_piston", stone_slab: "stone_slab", hardened_clay: "terracotta",
  melon_block: "melon", mob_spawner: "spawner", portal: "nether_portal", end_bricks: "end_stone_bricks", slime: "slime_block",
  magma: "magma_block", red_nether_brick: "red_nether_bricks", silver_shulker_box: "light_gray_shulker_box", trapdoor: "oak_trapdoor",
  wooden_door: "oak_door", fence: "oak_fence", fence_gate: "oak_fence_gate", wooden_button: "oak_button", wooden_pressure_plate: "oak_pressure_plate",
  stone_stairs: "cobblestone_stairs", reeds: "sugar_cane", boat: "oak_boat", speckled_melon: "glistering_melon_slice", melon: "melon_slice",
  fireworks: "firework_rocket", firework_charge: "firework_star", netherbrick: "nether_brick", chorus_fruit_popped: "popped_chorus_fruit",
  record_13: "music_disc_13", record_cat: "music_disc_cat", totem: "totem_of_undying", sign: "oak_sign", red_mushroom_block: "red_mushroom_block",
  lit_redstone_ore: "redstone_ore", unlit_redstone_torch: "redstone_torch", standing_banner: "white_banner", writable_book: "writable_book",
};
const ENTITY13 = { evocation_illager: "evoker", vindication_illager: "vindicator", illusion_illager: "illusioner", commandblock_minecart: "command_block_minecart", snowman: "snow_golem", villager_golem: "iron_golem", ender_crystal: "end_crystal", xp_orb: "experience_orb", xp_bottle: "experience_bottle", fireworks_rocket: "firework_rocket", eye_of_ender_signal: "eye_of_ender" };
const ENCH = { 0: "protection", 1: "fire_protection", 2: "feather_falling", 3: "blast_protection", 4: "projectile_protection", 5: "respiration", 6: "aqua_affinity", 7: "thorns", 8: "depth_strider", 9: "frost_walker", 10: "binding_curse", 16: "sharpness", 17: "smite", 18: "bane_of_arthropods", 19: "knockback", 20: "fire_aspect", 21: "looting", 22: "sweeping", 32: "efficiency", 33: "silk_touch", 34: "unbreaking", 35: "fortune", 48: "power", 49: "punch", 50: "flame", 51: "infinity", 61: "luck_of_the_sea", 62: "lure", 70: "mending", 71: "vanishing_curse" };
const EFFECTS = [null, "speed", "slowness", "haste", "mining_fatigue", "strength", "instant_health", "instant_damage", "jump_boost", "nausea", "regeneration", "resistance", "fire_resistance", "water_breathing", "invisibility", "blindness", "night_vision", "hunger", "weakness", "poison", "wither", "health_boost", "absorption", "saturation", "glowing", "levitation", "luck", "unluck"];
const PARTICLES13 = { explode: "poof", largeexplode: "explosion", hugeexplosion: "explosion_emitter", fireworksSpark: "firework", wake: "fishing", suspended: "underwater", depthsuspend: "underwater", magicCrit: "enchanted_hit", smoke: "smoke", largesmoke: "large_smoke", spell: "effect", instantSpell: "instant_effect", mobSpell: "entity_effect", mobSpellAmbient: "ambient_entity_effect", witchMagic: "witch", dripWater: "dripping_water", dripLava: "dripping_lava", angryVillager: "angry_villager", happyVillager: "happy_villager", townaura: "mycelium", enchantmenttable: "enchant", snowballpoof: "item_snowball", slime: "item_slime", reddust: "dust 1 0 0 1", endRod: "end_rod", dragonbreath: "dragon_breath", damageIndicator: "damage_indicator", sweepAttack: "sweep_attack", totem: "totem_of_undying", mobappearance: "elder_guardian", fallingdust: "falling_dust", iconcrack: "item", blockcrack: "block", blockdust: "block" };
const DIFF = ["peaceful", "easy", "normal", "hard"];
const inv = (o) => Object.fromEntries(Object.entries(o).map(([a, b]) => [b, a]));

function flatten(id, data, W) {
  id = unns(id); const d = parseInt(data || "0") || 0;
  if (id in COLORED) { const n = COLORED[id] || id; return COLORS[d] + "_" + n; }
  if (DATA[id]) { if (DATA[id][d]) return DATA[id][d]; W.push(`unknown data value ${d} for ${id}`); return DATA[id][0]; }
  if (d) W.push(`data value ${d} on ${id} has no flattened name here, check the block`);
  return RENAME13[id] || id;
}
function unflatten(id, W) {
  id = unns(id);
  for (const [old, n] of Object.entries(COLORED)) { const nn = n || old; const ci = COLORS.findIndex((c) => id === c + "_" + nn); if (ci >= 0) return [old, ci]; }
  if (id.endsWith("_shulker_box") && id !== "shulker_box") return [id === "light_gray_shulker_box" ? "silver_shulker_box" : id, 0];
  for (const [old, list] of Object.entries(DATA)) { const ix = list.indexOf(id); if (ix >= 0) return [old, ix]; }
  const r = inv(RENAME13); if (r[id]) return [r[id], 0];
  return [id, 0];
}

// 1.12 item nbt (ench, plain Name) <-> 1.13 (Enchantments, json Name)
function itemTagUp12(tag) {
  const e = get(tag, "ench");
  if (e && e.t === "list") { del(tag, "ench"); set(tag, "Enchantments", L(e.v.map((x) => C([["id", S(ns(ENCH[num(get(x, "id"))] || "unknown"))], ["lvl", N(num(get(x, "lvl")) + "s")]])))); }
  const se = get(tag, "StoredEnchantments");
  if (se && se.t === "list") set(tag, "StoredEnchantments", L(se.v.map((x) => C([["id", S(ns(ENCH[num(get(x, "id"))] || "unknown"))], ["lvl", N(num(get(x, "lvl")) + "s")]]))));
  const disp = get(tag, "display");
  if (disp) {
    const nm = get(disp, "Name"); if (nm && nm.t === "str") set(disp, "Name", S(JSON.stringify({ text: nm.v }), "'"));
    const lore = get(disp, "Lore"); if (lore && lore.t === "list") set(disp, "Lore", L(lore.v.map((l) => S(JSON.stringify({ text: l.v }), "'"))));
  }
  return tag;
}
function itemTagDown13(tag, W) {
  const enchToId = inv(ENCH);
  for (const key of ["Enchantments", "StoredEnchantments"]) {
    const e = get(tag, key); if (!e || e.t !== "list") continue;
    const list = L(e.v.map((x) => C([["id", N((enchToId[unns(sval(get(x, "id")) || "")] ?? 0) + "s")], ["lvl", N(num(get(x, "lvl")) + "s")]])));
    del(tag, key); set(tag, key === "Enchantments" ? "ench" : key, list);
  }
  const disp = get(tag, "display");
  if (disp) {
    const nm = get(disp, "Name"); if (nm && nm.t === "str") set(disp, "Name", S(jsonPlain(nm.v)));
    const lore = get(disp, "Lore"); if (lore && lore.t === "list") set(disp, "Lore", L(lore.v.map((l) => S(jsonPlain(l.v)))));
  }
  return tag;
}
function jsonPlain(s) {
  try { const o = JSON.parse(s); const walk = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.map(walk).join("") : (c.text || "") + (c.extra || []).map(walk).join(""); return walk(o); }
  catch (e) { return s; }
}

// ---------------------------------------------------------------- execute 1.12 <-> 1.13

function execUp12(cmd, W, up) {
  const t = toks(cmd);
  // execute <sel> <x> <y> <z> [detect <x> <y> <z> <block> <data>] <command>
  const sel = selUp12(t[1], W), pos = t.slice(2, 5).join(" ");
  let i = 5, cond = "";
  if (t[5] === "detect") { cond = ` if block ${t.slice(6, 9).join(" ")} ${flatten(t[9], t[10], W)}`; i = 11; }
  const rest = up(t.slice(i).join(" "));
  let out = `execute as ${sel} at @s` + (pos !== "~ ~ ~" ? ` positioned ${pos}` : "") + cond + " run " + rest;
  return out.replace(/ run execute /g, " ");
}
function execDown13(cmd, W, down) {
  const t = toks(cmd); let i = 1;
  const frames = []; let cur = null;
  const push = () => { if (cur) frames.push(cur); cur = null; };
  while (i < t.length) {
    const s = t[i];
    if (s === "run") { i++; break; }
    if (s === "as") { push(); cur = { sel: selDown13(t[i + 1], W), pos: "~ ~ ~", det: "" }; i += 2; continue; }
    if (s === "at") { if (t[i + 1] !== "@s") { push(); cur = { sel: selDown13(t[i + 1], W), pos: "~ ~ ~", det: "" }; W.push("execute at <someone> also changes who runs it in 1.12"); } i += 2; continue; }
    if (s === "positioned" && t[i + 1] !== "as") { cur = cur || { sel: "@s", pos: "~ ~ ~", det: "" }; cur.pos = t.slice(i + 1, i + 4).join(" "); i += 4; continue; }
    if (s === "if" && t[i + 1] === "block") { cur = cur || { sel: "@s", pos: "~ ~ ~", det: "" }; const [b, d] = unflatten(t[i + 5].replace(/[\[{].*$/, ""), W); cur.det = ` detect ${t.slice(i + 2, i + 5).join(" ")} ${b} ${d}`; i += 6; continue; }
    if (s === "if" && t[i + 1] === "entity") { push(); cur = { sel: selDown13(t[i + 2], W), pos: "~ ~ ~", det: "" }; W.push("execute if entity becomes a plain execute, it also changes who runs it"); i += 3; continue; }
    W.push(`execute "${s}" has no 1.12 version, left as is`);
    return "execute " + t.slice(1).join(" ");
  }
  push();
  const rest = down(t.slice(i).join(" "));
  return frames.map((f) => `execute ${f.sel} ${f.pos}${f.det}`).join(" ") + " " + rest;
}

// ---------------------------------------------------------------- items <-> components (1.20.5)

// parse "id{nbt}" or "id[comps]{nbt}"
function parseItem(tok) {
  const m = /^([#a-z0-9_.:\/-]+)(.*)$/i.exec(tok); if (!m) return null;
  const id = m[1]; let rest = m[2], comps = null, nbt = null;
  if (rest.startsWith("[")) {
    let depth = 0, q = null, end = -1;
    for (let j = 0; j < rest.length; j++) { const ch = rest[j]; if (q) { if (ch === "\\") j++; else if (ch === q) q = null; continue; } if (ch === '"' || ch === "'") q = ch; else if (ch === "[" || ch === "{") depth++; else if (ch === "]" || ch === "}") { depth--; if (depth === 0) { end = j; break; } } }
    const inner = rest.slice(1, end); rest = rest.slice(end + 1);
    comps = splitTop(inner, ",").filter((p) => p.trim()).map((p) => { const ix = p.indexOf("="); return ix < 0 ? [p.trim(), null] : [p.slice(0, ix).trim(), parseSNBT(p.slice(ix + 1))]; });
  }
  if (rest.startsWith("{")) nbt = parseSNBT(rest);
  return { id, comps, nbt };
}
const itemStr = (it) => it.id + (it.comps && it.comps.length ? "[" + it.comps.map(([k, v]) => (v === null ? k : k + "=" + toSNBT(v))).join(",") + "]" : "") + (it.nbt && it.nbt.v.length ? toSNBT(it.nbt) : "");

// tag compound -> component pairs (1.20.5 format)
function tagToComps(tag, W) {
  const out = [], custom = [];
  for (const [k, v] of tag.v) {
    if (k === "Enchantments" || k === "StoredEnchantments") {
      const lv = v.v.map((x) => [ns(sval(get(x, "id")) || "unknown"), N(Math.round(num(get(x, "lvl"))))]);
      out.push([k === "Enchantments" ? "enchantments" : "stored_enchantments", C([["levels", C(lv)]])]);
    } else if (k === "display") {
      const nm = get(v, "Name"), lore = get(v, "Lore"), col = get(v, "color");
      if (nm) out.push(["custom_name", S(nm.v, "'")]);
      if (lore) out.push(["lore", L(lore.v.map((l) => S(l.v, "'")))]);
      if (col) out.push(["dyed_color", C([["rgb", N(Math.round(num(col)))]])]);
    } else if (k === "Unbreakable") { if (num(v)) out.push(["unbreakable", C([])]); }
    else if (k === "CustomModelData") out.push(["custom_model_data", N(Math.round(num(v)))]);
    else if (k === "Damage") out.push(["damage", N(Math.round(num(v)))]);
    else if (k === "RepairCost") out.push(["repair_cost", N(Math.round(num(v)))]);
    else if (k === "SkullOwner") out.push(["profile", v.t === "str" ? S(v.v) : v]);
    else if (k === "Potion") out.push(["potion_contents", C([["potion", S(ns(v.v))]])]);
    else if (k === "HideFlags") W.push("HideFlags has no direct component, use hide_tooltip / show_in_tooltip:false on each component");
    else if (k === "AttributeModifiers") W.push("AttributeModifiers changed format a lot in 1.20.5, redo it as attribute_modifiers by hand");
    else if (k === "BlockEntityTag") { out.push(["block_entity_data", v]); W.push("block_entity_data needs an id field in 1.20.5, add it"); }
    else if (k === "EntityTag") { out.push(["entity_data", v]); W.push("entity_data needs an id field in 1.20.5, add it"); }
    else custom.push([k, v]);
  }
  if (custom.length) out.push(["custom_data", C(custom)]);
  return out;
}
function compsToTag(comps, W) {
  const tag = C([]), disp = C([]);
  for (const [k0, v] of comps) {
    const k = unns(k0);
    if (v === null) continue;
    if (k === "enchantments" || k === "stored_enchantments") {
      const lv = get(v, "levels") || v;
      set(tag, k === "enchantments" ? "Enchantments" : "StoredEnchantments", L(lv.v.filter(([e]) => e !== "show_in_tooltip").map(([e, l]) => C([["id", S(ns(e))], ["lvl", N(Math.round(num(l)) + "s")]]))));
    } else if (k === "custom_name") set(disp, "Name", S(v.v, "'"));
    else if (k === "lore") set(disp, "Lore", L(v.v.map((l) => S(l.v, "'"))));
    else if (k === "dyed_color") set(disp, "color", N(Math.round(num(get(v, "rgb") || v))));
    else if (k === "unbreakable") set(tag, "Unbreakable", N("1b"));
    else if (k === "custom_model_data") set(tag, "CustomModelData", N(Math.round(num(v))));
    else if (k === "damage") set(tag, "Damage", N(Math.round(num(v))));
    else if (k === "repair_cost") set(tag, "RepairCost", N(Math.round(num(v))));
    else if (k === "profile") set(tag, "SkullOwner", v.t === "str" ? S(v.v) : v);
    else if (k === "potion_contents") { const p = get(v, "potion"); if (p) set(tag, "Potion", S(sval(p))); }
    else if (k === "custom_data") v.v.forEach(([a, b]) => set(tag, a, b));
    else if (k === "block_entity_data") set(tag, "BlockEntityTag", v);
    else if (k === "entity_data") set(tag, "EntityTag", v);
    else W.push(`component ${k} has no pre-1.20.5 version, dropped it`);
  }
  if (disp.v.length) set(tag, "display", disp);
  return tag;
}

// walk every item stack inside an nbt tree
function walkItems(node, fn) {
  if (!node) return;
  if (node.t === "comp") {
    fn(node);
    node.v.forEach(([, v]) => walkItems(v, fn));
  } else if (node.t === "list") node.v.forEach((v) => walkItems(v, fn));
}
function stacksUp205(tree, W) {
  walkItems(tree, (c) => {
    if (!get(c, "id") || !(get(c, "Count") || get(c, "tag"))) return;
    const cnt = get(c, "Count"); if (cnt) { del(c, "Count"); set(c, "count", N(Math.round(num(cnt)))); }
    const tag = get(c, "tag"); if (tag) { del(c, "tag"); const comps = tagToComps(tag, W); if (comps.length) set(c, "components", C(comps.map(([k, v]) => [ns(k), v]))); }
  });
}
function stacksDown205(tree, W) {
  walkItems(tree, (c) => {
    if (!get(c, "id") || !(get(c, "count") || get(c, "components"))) return;
    const cnt = get(c, "count"); if (cnt) { del(c, "count"); set(c, "Count", N(Math.round(num(cnt)) + "b")); }
    const comps = get(c, "components"); if (comps) { del(c, "components"); const tag = compsToTag(comps.v, W); if (tag.v.length) set(c, "tag", tag); }
  });
}

// ---------------------------------------------------------------- text components (1.21.5)

function textUp(o, W) {
  if (Array.isArray(o)) return o.map((x) => textUp(x, W));
  if (!o || typeof o !== "object") return o;
  const r = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "clickEvent") {
      const a = v.action, ce = { action: a };
      if (a === "open_url") ce.url = v.value; else if (a === "run_command" || a === "suggest_command") ce.command = String(v.value).replace(/^\//, a === "run_command" ? "" : "/");
      else if (a === "change_page") ce.page = parseInt(v.value); else ce.value = v.value;
      r.click_event = ce;
    } else if (k === "hoverEvent") {
      const a = v.action, he = { action: a };
      if (a === "show_text") he.value = textUp(v.contents !== undefined ? v.contents : v.value, W);
      else if (a === "show_item") { const c = v.contents || {}; he.id = c.id || v.value; if (c.count) he.count = c.count; if (c.tag) W.push("hover show_item tag needs redoing as components"); }
      else if (a === "show_entity") { const c = v.contents || {}; he.id = c.type; he.uuid = c.id; if (c.name) he.name = textUp(c.name, W); }
      r.hover_event = he;
    } else if (k === "extra" || k === "with") r[k] = textUp(v, W);
    else r[k] = v;
  }
  return r;
}
function textDown(o, W) {
  if (Array.isArray(o)) return o.map((x) => textDown(x, W));
  if (!o || typeof o !== "object") return o;
  const r = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "click_event") r.clickEvent = { action: v.action, value: v.url ?? v.command ?? (v.page !== undefined ? String(v.page) : v.value) };
    else if (k === "hover_event") {
      if (v.action === "show_text") r.hoverEvent = { action: "show_text", contents: textDown(v.value, W) };
      else if (v.action === "show_item") r.hoverEvent = { action: "show_item", contents: { id: v.id, count: v.count || 1 } };
      else if (v.action === "show_entity") r.hoverEvent = { action: "show_entity", contents: { type: v.id, id: v.uuid, name: v.name && textDown(v.name, W) } };
    } else if (k === "extra" || k === "with") r[k] = textDown(v, W);
    else r[k] = v;
  }
  return r;
}
// text argument in a command
function textArgUp(s, W) {
  let o; try { o = JSON.parse(s); } catch (e) { try { o = toJS(parseSNBT(s)); } catch (e2) { return s; } }
  return toSNBT(fromJS(textUp(o, W)));
}
function textArgDown(s, W) {
  let o; try { o = toJS(parseSNBT(s)); } catch (e) { try { o = JSON.parse(s); } catch (e2) { return s; } }
  return JSON.stringify(textDown(o, W));
}
// text stored in nbt: old = string holding json, new = real component
function nbtTextUp(n, W) {
  if (!n || n.t !== "str") return n;
  let o; try { o = JSON.parse(n.v); } catch (e) { return S(n.v); }
  if (o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).length === 1 && typeof o.text === "string") return S(o.text);
  return fromJS(textUp(o, W));
}
function nbtTextDown(n, W) {
  if (!n) return n;
  if (n.t === "str") return S(JSON.stringify({ text: n.v }), "'");
  return S(JSON.stringify(textDown(toJS(n), W)), "'");
}
const TEXT_KEYS = ["CustomName", "custom_name", "minecraft:custom_name", "item_name", "minecraft:item_name"];
const TEXT_LIST_KEYS = ["lore", "minecraft:lore", "messages", "filtered_messages"];
function walkText(tree, fn) {
  walkItems(tree, (c) => {
    for (const p of c.v) {
      if (TEXT_KEYS.includes(p[0])) p[1] = fn(p[1]);
      else if (TEXT_LIST_KEYS.includes(p[0]) && p[1].t === "list") p[1] = L(p[1].v.map(fn));
    }
  });
}
function compsText(it, fn) {
  if (!it.comps) return;
  for (const p of it.comps) {
    if (p[1] === null) continue;
    const k = unns(p[0]);
    if (k === "custom_name" || k === "item_name") p[1] = fn(p[1]);
    else if (k === "lore" && p[1].t === "list") p[1] = L(p[1].v.map(fn));
    else walkText(p[1], fn);
  }
}

// ---------------------------------------------------------------- generic command walkers

// rewrite every {nbt} token and every item token in a command
let WARN = [];
const TEXT_CMDS = ["tellraw", "title", "bossbar", "team"];
function eachNbt(cmd, fn) {
  let stop = false;
  return toks(cmd).map((t, i, all) => {
    if (TEXT_CMDS.includes(t) || (t === "scoreboard" && all[i + 1] === "objectives")) stop = true;
    if (stop) return t;
    if (t.startsWith("{") && t.endsWith("}")) { try { const tree = parseSNBT(t); fn(tree); return toSNBT(tree); } catch (e) { WARN.push("couldn't read the NBT " + t.slice(0, 30) + "..., left it alone"); return t; } }
    const glued = /^([#a-z0-9_.:\/-]+(?:\[[^\]]*\])?)(\{.*\})$/is.exec(t);
    if (glued) { try { const tree = parseSNBT(glued[2]); fn(tree); return glued[1] + toSNBT(tree); } catch (e) { WARN.push("couldn't read the NBT on " + glued[1] + ", left it alone"); return t; } }
    const m = /^(@[pares]\[)(.*)\]$/s.exec(t);
    if (m && m[2].includes("nbt=")) {
      const s = parseSel(t);
      s.args = s.args.map(([k, v]) => { if (k !== "nbt") return [k, v]; const neg = v.startsWith("!"); try { const tree = parseSNBT(neg ? v.slice(1) : v); fn(tree); return [k, (neg ? "!" : "") + toSNBT(tree)]; } catch (e) { return [k, v]; } });
      return selStr(s);
    }
    return t;
  }).join(" ");
}
// nbt glued onto a block: setblock ~ ~ ~ oak_sign[...]{...}
function eachBlockNbt(cmd, fn) {
  return nested(cmd, (c) => {
    const t = toks(c); const ix = t[0] === "setblock" ? 4 : t[0] === "fill" ? 7 : -1;
    if (ix < 0 || !t[ix]) return c;
    const m = /^([^{]*?)(\{.*\})$/s.exec(t[ix]); if (!m) return c;
    try { const tree = parseSNBT(m[2]); fn(tree); t[ix] = m[1] + toSNBT(tree); } catch (e) { WARN.push("couldn't read the block NBT, left it alone"); }
    return t.join(" ");
  });
}
// which token is an item, per command
function itemIndex(t) {
  const c = t[0];
  if (c === "give") return 2;
  if (c === "clear") return 2;
  if (c === "item" && t[1] === "replace") { const w = t.indexOf("with"); return w >= 0 ? w + 1 : -1; }
  if (c === "replaceitem") return t[1] === "block" ? 6 : 4;
  return -1;
}
function eachItem(cmd, fn) {
  const t = toks(cmd); const ix = itemIndex(t);
  if (ix < 0 || !t[ix]) return cmd;
  try { const it = parseItem(t[ix]); if (it) { fn(it); t[ix] = itemStr(it); } } catch (e) { WARN.push("couldn't read the item " + t[ix].slice(0, 30) + ", left it alone"); }
  return t.join(" ");
}
function textCmd(cmd, fn) {
  const t = toks(cmd);
  const idx = t[0] === "tellraw" ? 2 : t[0] === "title" && ["title", "subtitle", "actionbar"].includes(t[2]) ? 3
    : t[0] === "bossbar" && t[1] === "add" ? 3 : t[0] === "bossbar" && t[1] === "set" && t[3] === "name" ? 4
    : t[0] === "scoreboard" && t[1] === "objectives" && t[2] === "add" ? 5 : t[0] === "scoreboard" && t[2] === "modify" && t[4] === "displayname" ? 5
    : t[0] === "team" && t[1] === "add" ? 3 : t[0] === "team" && t[1] === "modify" && ["displayName", "prefix", "suffix"].includes(t[3]) ? 4 : -1;
  if (idx < 0 || t.length <= idx) return cmd;
  return t.slice(0, idx).join(" ") + " " + fn(t.slice(idx).join(" "));
}
// run fn on the command and on every command nested after "run"
function nested(cmd, fn) {
  const t = toks(cmd);
  if (t[0] === "execute") { const r = t.indexOf("run"); if (r >= 0) return t.slice(0, r + 1).join(" ") + " " + nested(t.slice(r + 1).join(" "), fn); return cmd; }
  return fn(cmd);
}


// ---------------------------------------------------------------- inline predicates (26.x)

// every "execute if|unless predicate {...}" in a command, as plain js
// standing signs / banners: default rotation changed 0 -> 8 in 26.1, pin the old default explicitly
function rotFix(cmd, val, W) {
  const t = toks(cmd); const ix = t[0] === "setblock" ? 4 : t[0] === "fill" ? 7 : -1;
  if (ix < 0 || !t[ix]) return cmd;
  const m = /^([a-z0-9_:]+)(\[[^\]]*\])?(.*)$/s.exec(t[ix]);
  if (!m) return cmd;
  const id = unns(m[1]);
  const standing = (/_sign$/.test(id) && !/wall_|hanging/.test(id)) || (/_banner$/.test(id) && !/wall_/.test(id));
  if (!standing || (m[2] && m[2].includes("rotation"))) return cmd;
  t[ix] = m[1] + (m[2] ? m[2].slice(0, -1) + ",rotation=" + val + "]" : "[rotation=" + val + "]") + m[3];
  return t.join(" ");
}
function eachPred(cmd, fn) {
  const t = toks(cmd);
  for (let i = 2; i < t.length; i++) {
    if (t[i - 1] === "predicate" && (t[i - 2] === "if" || t[i - 2] === "unless") && /^[\[{]/.test(t[i])) {
      try { t[i] = toSNBT(fromJS(fn(toJS(parseSNBT(t[i]), true)))); } catch (e) { WARN.push("couldn't read the inline predicate, left it alone"); }
    }
  }
  return t.join(" ");
}
const TS = { lightning: "lightning", fishing_hook: "fishing_hook", player: "player", raider: "raider", sheep: "sheep", slime: "cube_mob" };
// entity predicate: 26.1 style <-> 26.2 style (namespaced keys, type_specific/x)
function epUp(ep) {
  if (!ep || typeof ep !== "object" || Array.isArray(ep)) return ep;
  const r = {};
  for (const [k, v] of Object.entries(ep)) {
    if (k === "type") r["minecraft:entity_type"] = v;
    else if (k === "type_specific" && v && v.type) { const { type, ...rest } = v; r["minecraft:type_specific/" + (TS[unns(type)] || unns(type))] = rest; }
    else if (["vehicle", "passenger", "targeted_entity"].includes(k)) r[ns(k)] = epUp(v);
    else r[k.includes(":") ? k : ns(k)] = v;
  }
  return r;
}
function epDown(ep) {
  if (!ep || typeof ep !== "object" || Array.isArray(ep)) return ep;
  const r = {};
  for (const [k0, v] of Object.entries(ep)) {
    const k = unns(k0);
    if (k === "entity_type") r.type = v;
    else if (k.startsWith("type_specific/")) { const kind = k.split("/")[1]; const back = inv(TS)[kind] || kind; r.type_specific = { type: ns(back), ...v }; }
    else if (k === "entity_tags") WARN.push("entity_tags predicate doesn't exist before 26.2, use tag= in the selector instead");
    else if (["vehicle", "passenger", "targeted_entity"].includes(k)) r[k] = epDown(v);
    else r[k] = v;
  }
  return r;
}
// walk loot conditions (root, any_of/all_of terms, inverted term) and touch each one
function eachCond(node, fn) {
  if (Array.isArray(node)) return node.map((n) => eachCond(n, fn));
  if (!node || typeof node !== "object") return node;
  node = fn(node);
  if (Array.isArray(node.terms)) node.terms = node.terms.map((n) => eachCond(n, fn));
  if (node.term) node.term = eachCond(node.term, fn);
  return node;
}
const condType = (c) => unns(String(c.condition ?? c.type ?? ""));
// 1.21.11 gamerule renames that aren't just camelCase -> snake_case. [new name, value inverted]
const GR = {
  disableElytraMovementCheck: ["elytra_movement_check", true], disablePlayerMovementCheck: ["player_movement_check", true],
  disableRaids: ["raids", true], commandModificationBlockLimit: ["max_block_modifications"], doDaylightCycle: ["advance_time"],
  doMobLoot: ["mob_drops"], announceAdvancements: ["show_advancement_messages"], commandBlocksEnabled: ["command_blocks_work"],
  doEntityDrops: ["entity_drops"], doImmediateRespawn: ["immediate_respawn"], doInsomnia: ["spawn_phantoms"],
  doLimitedCrafting: ["limited_crafting"], doMobSpawning: ["spawn_mobs"], doPatrolSpawning: ["spawn_patrols"],
  doTileDrops: ["block_drops"], doTraderSpawning: ["spawn_wandering_traders"], doVinesSpread: ["spread_vines"],
  doWardenSpawning: ["spawn_wardens"], doWeatherCycle: ["advance_weather"], maxCommandChainLength: ["max_command_sequence_length"],
  maxCommandForkCount: ["max_command_forks"], naturalRegeneration: ["natural_health_regeneration"],
  snowAccumulationHeight: ["max_snow_accumulation_height"], spawnRadius: ["respawn_radius"], spawnerBlocksEnabled: ["spawner_blocks_work"],
  doFireTick: ["fire_spread_radius_around_player"],
};
const COLOR_NAMES = ["black", "dark_blue", "dark_green", "dark_aqua", "dark_red", "dark_purple", "gold", "gray", "dark_gray", "blue", "green", "aqua", "red", "light_purple", "yellow", "white", "reset"];

// ---------------------------------------------------------------- steps

const STEPS = [
  { // 1.12 -> 1.13
    name: "1.13 (flattening + new execute)",
    up(cmd, W) {
      const t = toks(cmd), c = t[0];
      const self = (x) => STEPS[0].up(x, W);
      if (c === "execute" && t[1] && t[1].startsWith("@") && t.length > 5) return execUp12(cmd, W, self);
      let out;
      if (c === "gamemode") { t[1] = GM[parseInt(t[1])] ?? GM[GM_SHORT[t[1]]] ?? t[1]; out = t.join(" "); }
      else if (c === "difficulty") { t[1] = DIFF[parseInt(t[1])] ?? ({ p: "peaceful", e: "easy", n: "normal", h: "hard" })[t[1]] ?? t[1]; out = t.join(" "); }
      else if (c === "effect") {
        if (t[2] === "clear") out = `effect clear ${t[1]}`;
        else { const e = /^\d+$/.test(t[2]) ? EFFECTS[parseInt(t[2])] : unns(t[2]); out = ["effect", "give", t[1], e, ...t.slice(3)].join(" "); if (t[3] === "0") { out = `effect clear ${t[1]} ${e}`; } }
      }
      else if (c === "give") {
        // give <p> <item> [count] [data] [nbt]
        const [p, item, count, data, ...nb] = t.slice(1);
        let id = flatten(item, data, W); let tag = nb.join(" ");
        if (tag) { try { const tr = itemTagUp12(parseSNBT(tag)); id += toSNBT(tr); } catch (e) { id += tag; } }
        out = `give ${p} ${id}` + (count && count !== "1" ? " " + count : "");
      }
      else if (c === "clear" && t[2]) { t[2] = flatten(t[2], t[3] === "-1" ? "0" : t[3], W); out = t.slice(0, 3).concat(t[4] ? [t[4]] : []).join(" "); }
      else if (c === "setblock") {
        const [x, y, z, b, data, mode, ...nb] = t.slice(1);
        out = `setblock ${x} ${y} ${z} ${flatten(b, data, W)}${nb.join(" ")}` + (mode && mode !== "replace" ? " " + mode : "");
      }
      else if (c === "fill") {
        const xyz = t.slice(1, 7).join(" "), [b, data, mode, a, bd] = t.slice(7);
        out = `fill ${xyz} ${flatten(b, data, W)}` + (mode === "replace" && a ? ` replace ${flatten(a, bd, W)}` : mode && mode !== "replace" ? " " + mode : "");
      }
      else if (c === "testfor") out = `execute if entity ${t[1]}` + (t[2] ? "" : "");
      else if (c === "testforblock") out = `execute if block ${t.slice(1, 4).join(" ")} ${flatten(t[4], t[5], W)}`;
      else if (c === "blockdata") out = `data merge block ${t.slice(1, 4).join(" ")} ${t.slice(4).join(" ")}`;
      else if (c === "entitydata") out = `execute as ${t[1]} run data merge entity @s ${t.slice(2).join(" ")}`;
      else if (c === "toggledownfall") { W.push("toggledownfall is gone, picked weather clear"); out = "weather clear"; }
      else if (c === "xp") { const lv = /L$/i.test(t[1]); out = `experience add ${t[2] || "@s"} ${t[1].replace(/L$/i, "")} ${lv ? "levels" : "points"}`; }
      else if (c === "scoreboard" && t[1] === "players" && t[2] === "tag") out = `tag ${t[3]} ${t[4]} ${t.slice(5).join(" ")}`.trim();
      else if (c === "scoreboard" && t[1] === "teams") out = ["team", ...t.slice(2)].join(" ");
      else if (c === "summon") { t[1] = ENTITY13[unns(t[1])] || t[1]; out = t.join(" "); }
      else if (c === "particle") { const p = PARTICLES13[t[1]]; if (t[1] === "reddust") W.push("reddust became dust, colors work differently now"); if (p) t[1] = p; out = t.join(" "); }
      else if (c === "stats") { W.push("/stats was removed in 1.13, use execute store"); out = cmd; }
      else out = cmd;
      out = eachNbt(out, (tree) => walkItems(tree, (n) => { const cn = get(n, "CustomName"); if (cn && cn.t === "str" && !/^\s*[{\["]/.test(cn.v)) set(n, "CustomName", S(JSON.stringify({ text: cn.v }), "'")); }));
      return mapSels(out, (s) => selUp12(s, W));
    },
    down(cmd, W) {
      const t = toks(cmd), c = t[0];
      const self = (x) => STEPS[0].down(x, W);
      if (c === "execute") return execDown13(cmd, W, self);
      let out;
      if (c === "gamemode") { const g = GM.indexOf(t[1]); if (g >= 0) t[1] = String(g); out = t.join(" "); }
      else if (c === "difficulty") { const d = DIFF.indexOf(t[1]); if (d >= 0) t[1] = String(d); out = t.join(" "); }
      else if (c === "effect") {
        if (t[1] === "clear") out = t[3] ? `effect ${t[2]} ${unns(t[3])} 0` : `effect ${t[2]} clear`;
        else out = ["effect", t[2], unns(t[3]), ...t.slice(4)].join(" ");
      }
      else if (c === "give") {
        const it = parseItem(t[2]); const [id, d] = unflatten(it.id, W);
        let nb = ""; if (it.nbt) nb = " " + toSNBT(itemTagDown13(it.nbt, W));
        out = `give ${t[1]} ${id} ${t[3] || 1} ${d}${nb}`;
      }
      else if (c === "clear" && t[2]) { const it = parseItem(t[2]); const [id, d] = unflatten(it.id, W); out = `clear ${t[1]} ${id} ${d}` + (t[3] ? " " + t[3] : ""); }
      else if (c === "setblock") {
        const m = /^([a-z0-9_:]+)(\[[^\]]*\])?(\{.*\})?$/.exec(t[4]) || [];
        const [id, d] = unflatten(m[1] || t[4], W); if (m[2]) W.push("block states dropped, pick the data value by hand");
        out = `setblock ${t.slice(1, 4).join(" ")} ${id} ${d} ${t[5] || "replace"}` + (m[3] ? " " + m[3] : "");
      }
      else if (c === "fill") {
        const [id, d] = unflatten(t[7].replace(/[\[{].*$/, ""), W);
        out = `fill ${t.slice(1, 7).join(" ")} ${id} ${d}` + (t[8] === "replace" && t[9] ? ` replace ${unflatten(t[9].replace(/[\[{].*$/, ""), W).join(" ")}` : t[8] ? " " + t[8] : "");
      }
      else if (c === "data" && t[1] === "merge" && t[2] === "block") out = `blockdata ${t.slice(3, 6).join(" ")} ${t.slice(6).join(" ")}`;
      else if (c === "data" && t[1] === "merge" && t[2] === "entity") out = `entitydata ${t[3]} ${t.slice(4).join(" ")}`;
      else if (c === "experience" || c === "xp") { if (t[1] === "add") out = `xp ${t[3]}${t[4] === "levels" ? "L" : ""} ${t[2]}`; else { W.push("only experience add exists in 1.12"); out = cmd; } }
      else if (c === "tag") out = `scoreboard players tag ${t.slice(1).join(" ")}`;
      else if (c === "team") out = `scoreboard teams ${t.slice(1).join(" ")}`;
      else if (c === "summon") { t[1] = inv(ENTITY13)[unns(t[1])] || t[1]; out = t.join(" "); }
      else if (c === "particle") { const p = inv(PARTICLES13)[t[1]]; if (p) t[1] = p; out = t.join(" "); }
      else if (["data", "bossbar", "datapack", "forceload", "schedule", "teammsg", "loot", "item", "attribute", "damage", "ride", "fillbiome", "place", "random", "return", "tick", "spectate", "summon_item"].includes(c)) { W.push(`/${c} doesn't exist in 1.12`); out = cmd; }
      else out = cmd;
      out = eachNbt(out, (tree) => walkItems(tree, (n) => { const cn = get(n, "CustomName"); if (cn && cn.t === "str") set(n, "CustomName", S(jsonPlain(cn.v))); else if (cn) set(n, "CustomName", S(jsonPlain(JSON.stringify(toJS(cn))))); }));
      return mapSels(out, (s) => selDown13(s, W));
    },
  },
  { // 1.13 -> 1.17
    name: "1.17 (/item, zombified piglin)",
    up(cmd, W) {
      return nested(cmd, (c) => {
        let t = toks(c);
        if (t[0] === "replaceitem") t = t[1] === "block" ? ["item", "replace", "block", ...t.slice(2, 6), "with", ...t.slice(6)] : ["item", "replace", "entity", t[2], t[3], "with", ...t.slice(4)];
        return t.join(" ").replace(/\bzombie_pigman\b/g, "zombified_piglin");
      });
    },
    down(cmd, W) {
      return nested(cmd, (c) => {
        let t = toks(c);
        if (t[0] === "item" && t[1] === "replace") {
          const w = t.indexOf("with");
          if (w < 0) { W.push("item replace ... from has no 1.16 version"); }
          else t = t[2] === "block" ? ["replaceitem", "block", ...t.slice(3, 7), ...t.slice(w + 1)] : ["replaceitem", "entity", t[3], t[4], ...t.slice(w + 1)];
        } else if (t[0] === "item") W.push("/item modify doesn't exist before 1.17");
        return t.join(" ").replace(/\bzombified_piglin\b/g, "zombie_pigman");
      });
    },
  },
  { // 1.17 -> 1.20.3
    name: "1.20.3 (short_grass)",
    up: (cmd) => cmd.replace(/(^|[\s:"'])grass(?=[\s\[{"',\]}]|$)/g, "$1short_grass"),
    down: (cmd) => cmd.replace(/\bshort_grass\b/g, "grass"),
  },
  { // 1.20.4 -> 1.20.5
    name: "1.20.5 (item components)",
    up(cmd, W) {
      return eachNbt(nested(cmd, (c) => {
        return eachItem(c, (it) => {
          if (!it.nbt) return;
          const comps = tagToComps(it.nbt, W); it.nbt = null; it.comps = comps;
        });
      }), (tree) => stacksUp205(tree, W));
    },
    down(cmd, W) {
      return eachNbt(nested(cmd, (c) => {
        return eachItem(c, (it) => {
          if (!it.comps) return;
          it.nbt = compsToTag(it.comps, W); it.comps = null;
        });
      }), (tree) => stacksDown205(tree, W));
    },
  },
  { // 1.21.3 -> 1.21.4
    name: "1.21.4 (custom_model_data)",
    up(cmd) {
      const fix = (v) => (v && v.t === "num" ? C([["floats", L([N(parseFloat(v.raw) + "f")])]]) : v);
      return eachNbt(nested(cmd, (c) => {
        return eachItem(c, (it) => { (it.comps || []).forEach((p) => { if (unns(p[0]) === "custom_model_data") p[1] = fix(p[1]); }); });
      }), (tree) => walkItems(tree, (n) => { const cs = get(n, "components"); const v = get(cs, "minecraft:custom_model_data"); if (v) set(cs, "minecraft:custom_model_data", fix(v)); }));
    },
    down(cmd, W) {
      const fix = (v) => { const f = get(v, "floats"); if (f && f.v.length) return N(Math.round(num(f.v[0]))); W.push("custom_model_data without floats can't go back to a number"); return v; };
      return eachNbt(nested(cmd, (c) => {
        return eachItem(c, (it) => { (it.comps || []).forEach((p) => { if (unns(p[0]) === "custom_model_data" && p[1].t === "comp") p[1] = fix(p[1]); }); });
      }), (tree) => walkItems(tree, (n) => { const cs = get(n, "components"); const v = get(cs, "minecraft:custom_model_data"); if (v && v.t === "comp") set(cs, "minecraft:custom_model_data", fix(v)); }));
    },
  },
  { // 1.21.4 -> 1.21.5
    name: "1.21.5 (snbt text, equipment, simpler components)",
    up(cmd, W) {
      const comp = (p) => {
        const k = unns(p[0]);
        if ((k === "enchantments" || k === "stored_enchantments") && get(p[1], "levels")) { if (get(p[1], "show_in_tooltip")) W.push("show_in_tooltip moved to the tooltip_display component"); p[1] = get(p[1], "levels"); }
        if (k === "dyed_color" && get(p[1], "rgb")) p[1] = get(p[1], "rgb");
        if (p[1] && p[1].t === "comp" && get(p[1], "show_in_tooltip")) { del(p[1], "show_in_tooltip"); W.push("show_in_tooltip moved to the tooltip_display component"); }
      };
      const fn = (n) => nbtTextUp(n, W);
      return eachNbt(nested(cmd, (c) => {
        c = textCmd(c, (s) => textArgUp(s, W));
        return eachItem(c, (it) => { (it.comps || []).forEach(comp); compsText(it, fn); });
      }), (tree) => {
          walkItems(tree, (n) => {
            const cs = get(n, "components"); if (cs) cs.v.forEach(comp);
            const ar = get(n, "ArmorItems"), hd = get(n, "HandItems");
            if (ar || hd) {
              const eq = get(n, "equipment") || C([]);
              if (ar) { ["feet", "legs", "chest", "head"].forEach((s, i) => { const it = ar.v[i]; if (it && it.v.length) set(eq, s, it); }); del(n, "ArmorItems"); }
              if (hd) { ["mainhand", "offhand"].forEach((s, i) => { const it = hd.v[i]; if (it && it.v.length) set(eq, s, it); }); del(n, "HandItems"); }
              set(n, "equipment", eq);
            }
          });
          walkText(tree, fn);
        });
    },
    down(cmd, W) {
      const comp = (p) => {
        const k = unns(p[0]);
        if ((k === "enchantments" || k === "stored_enchantments") && p[1].t === "comp" && !get(p[1], "levels")) p[1] = C([["levels", p[1]]]);
        if (k === "dyed_color" && p[1].t === "num") p[1] = C([["rgb", p[1]]]);
        if (k === "tooltip_display") W.push("tooltip_display doesn't exist before 1.21.5, use show_in_tooltip:false");
      };
      const fn = (n) => nbtTextDown(n, W);
      return eachNbt(nested(cmd, (c) => {
        c = textCmd(c, (s) => textArgDown(s, W));
        return eachItem(c, (it) => { (it.comps || []).forEach(comp); compsText(it, fn); });
      }), (tree) => {
          walkItems(tree, (n) => {
            const cs = get(n, "components"); if (cs) cs.v.forEach(comp);
            const eq = get(n, "equipment");
            if (eq && eq.t === "comp" && !get(n, "id")?.v?.includes?.("_item")) {
              const pick = (s) => get(eq, s) || C([]);
              set(n, "ArmorItems", L(["feet", "legs", "chest", "head"].map(pick)));
              set(n, "HandItems", L(["mainhand", "offhand"].map(pick)));
              del(n, "equipment");
            }
          });
          walkText(tree, fn);
        });
    },
  },
  { // 1.21.10 -> 1.21.11
    name: "1.21.11 (gamerule renames, worldborder ticks, angry_at)",
    up(cmd, W) {
      cmd = nested(cmd, (c) => {
        const t = toks(c);
        if (t[0] === "gamerule" && t[1]) {
          const r = GR[t[1]];
          if (r) { t[1] = r[0]; if (r[1] && t[2]) t[2] = t[2] === "true" ? "false" : t[2] === "false" ? "true" : t[2]; }
          if (t[1] === "fire_spread_radius_around_player" && t[2] === "false") t[2] = "0";
          else if (/[A-Z]/.test(t[1])) t[1] = t[1].replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
          if (t[1] === "fire_spread_radius_around_player") W.push("doFireTick became fire_spread_radius_around_player (a radius, 0 = off), check the value");
        }
        if (t[0] === "worldborder" && ["set", "add"].includes(t[1]) && t[3] && /^\d+(\.\d+)?$/.test(t[3])) t[3] += "s";
        if (t[0] === "worldborder" && ["warning"].includes(t[1]) && t[2] === "time" && t[3] && /^\d+$/.test(t[3])) t[3] += "s";
        return t.join(" ");
      });
      return eachNbt(cmd, (tree) => walkItems(tree, (n) => { const a = get(n, "AngryAt"); if (a) { del(n, "AngryAt"); set(n, "angry_at", a); } if (get(n, "AngerTime")) { del(n, "AngerTime"); W.push("AngerTime is gone in 1.21.11 (it's anger_end_time, a game tick), dropped it"); } }));
    },
    down(cmd, W) {
      cmd = nested(cmd, (c) => {
        const t = toks(c);
        if (t[0] === "gamerule" && t[1]) {
          const id = unns(t[1]); const back = Object.entries(GR).find(([, v]) => v[0] === id);
          if (back) { t[1] = back[0]; if (back[1][1] && t[2]) t[2] = t[2] === "true" ? "false" : t[2] === "false" ? "true" : t[2]; }
          else if (id === "fire_spread_radius_around_player") { t[1] = "doFireTick"; if (t[2]) t[2] = t[2] === "0" ? "false" : "true"; }
          else t[1] = id.replace(/_([a-z])/g, (_, m) => m.toUpperCase());
        }
        if (t[0] === "worldborder" && ["set", "add"].includes(t[1]) && t[3]) { if (/s$/.test(t[3])) t[3] = t[3].slice(0, -1); else if (/^\d+$/.test(t[3])) t[3] = String(parseInt(t[3]) / 20); }
        if (t[0] === "stopwatch") W.push("/stopwatch doesn't exist before 1.21.11");
        return t.join(" ");
      });
      return eachNbt(cmd, (tree) => walkItems(tree, (n) => { const a = get(n, "angry_at"); if (a) { del(n, "angry_at"); set(n, "AngryAt", a); } if (get(n, "anger_end_time")) { del(n, "anger_end_time"); W.push("anger_end_time has no old version (AngerTime), dropped it"); } }));
    },
  },
  { // 1.21.11 -> 26.1
    name: "26.1 (world clocks, /swing)",
    up(cmd, W) {
      return nested(cmd, (c) => {
        const t = toks(c);
        if (t[0] === "time" && t[1] === "set" && ["day", "noon", "night", "midnight"].includes(t[2])) W.push("/time set day/night now skips ahead to the next one in 26.1 instead of jumping straight there");
        if (t[0] === "time" && t[1] === "query" && t[2] === "daytime") t[2] = "minecraft:day";
        else if (t[0] === "time" && t[1] === "query" && t[2] === "day") { t[2] = "minecraft:day"; t.splice(3, 0, "repetition"); }
        let out = t.join(" ").replace(/\bvillager\.(\d+)\b/g, "mob.inventory.$1");
        out = rotFix(out, "0", W);
        return out;
      });
      return eachPred(cmd, (p) => eachCond(p, (c) => { if (condType(c) === "time_check" && !c.clock) c.clock = "minecraft:overworld"; return c; }));
    },
    down(cmd, W) {
      cmd = nested(cmd, (c) => {
        let t = toks(c);
        if (t[0] === "time") {
          if (t[1] === "of") { W.push(`world clock ${t[2]} doesn't exist in 1.21.11, used the normal day cycle`); t = ["time", ...t.slice(3)]; }
          if (t[1] === "set" && t[2] && t[2].includes(":")) { const m = unns(t[2]); if (["day", "noon", "night", "midnight"].includes(m)) t[2] = m; else W.push(`time marker ${t[2]} has no 1.21.11 version, use a number`); }
          if (t[1] === "pause" || t[1] === "resume") { W.push(`/time ${t[1]} doesn't exist in 1.21.11, toggle the daylight cycle gamerule instead`); }
          if (t[1] === "rate") W.push("/time rate doesn't exist in 1.21.11");
          if (t[1] === "query" && t[2] === "minecraft:day") { if (t[3] === "repetition") { t[2] = "day"; t.splice(3, 1); } else t[2] = "daytime"; }
          else if (t[1] === "query" && !["daytime", "gametime", "day"].includes(t[2])) { W.push("only time query daytime/gametime/day exist in 1.21.11"); }
        }
        if (t[0] === "swing") W.push("/swing doesn't exist in 1.21.11, no equivalent");
        c = rotFix(t.join(" ").replace(/\bmob\.inventory\.(\d+)\b/g, "villager.$1"), "8", W);
        c = eachItem(c, (it) => {
          if (!it.comps) return;
          it.comps = it.comps.filter(([k]) => { const kk = unns(k); if (kk === "dye" || kk === "additional_trade_cost") { W.push(`component ${kk} doesn't exist in 1.21.11, dropped it`); return false; } return true; });
        });
        return c;
      });
      return eachPred(cmd, (p) => eachCond(p, (c) => { if (condType(c) === "time_check") delete c.clock; return c; }));
    },
  },
  { // 26.1 -> 26.2
    name: "26.2 (namespaced entity predicates, team colors)",
    up(cmd, W) {
      cmd = nested(cmd, (c) => {
        const t = toks(c);
        if ((t[0] === "team" || t[0] === "waypoint") && t[1] === "modify" && t[3] === "color" && t[4]) {
          const want = t[4].replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
          t[4] = COLOR_NAMES.includes(want) ? want : COLOR_NAMES.find((n) => n.replace("_", "") === want.replace("_", "")) || want;
        }
        return t.join(" ");
      });
      return eachPred(cmd, (p) => eachCond(p, (c) => { if (condType(c) === "entity_properties" && c.predicate) c.predicate = epUp(c.predicate); return c; }));
    },
    down(cmd, W) {
      cmd = nested(cmd, (c) => {
        const t = toks(c);
        if (t[0] === "unpublish") W.push("/unpublish doesn't exist before 26.2");
        if (t[0] === "summon" && unns(t[1] || "") === "sulfur_cube") W.push("sulfur cubes don't exist before 26.2");
        return eachItem(c, (it) => { if (it.comps) it.comps = it.comps.filter(([k]) => { if (unns(k) === "sulfur_cube_content") { W.push("sulfur_cube_content doesn't exist before 26.2, dropped it"); return false; } return true; }); });
      });
      return eachPred(cmd, (p) => eachCond(p, (c) => { if (condType(c) === "entity_properties" && c.predicate) c.predicate = epDown(c.predicate); return c; }));
    },
  },
  { // 26.2 -> 26.3
    name: "26.3 (predicate condition -> type, signs, new commands)",
    up(cmd, W) {
      cmd = eachPred(cmd, (p) => eachCond(p, (c) => {
        if ("condition" in c) { const v = c.condition; delete c.condition; c = { type: unns(String(v)) === "block_state_property" ? "minecraft:match_block" : v, ...c }; }
        if (unns(String(c.type)) === "value_check") WARN.push("value_check got split into int / float versions in 26.3, pick the right one");
        return c;
      }));
      const fix = (tree) => walkItems(tree, (n) => {
        const has = (side) => { const st = get(n, side); return st && toSNBT(st).includes("click_event"); };
        if ((has("front_text") || has("back_text")) && !get(n, "allow_op_features")) { set(n, "allow_op_features", { t: "bool", v: true }); W.push("sign click events need allow_op_features:true in 26.3, added it"); }
      });
      return eachNbt(cmd, fix);
    },
    down(cmd, W) {
      cmd = nested(cmd, (c) => {
        const t = toks(c);
        if (["posteffect", "compute"].includes(t[0])) W.push(`/${t[0]} doesn't exist before 26.3`);
        if (t[0] === "item" && (t[1] === "fill" || t[1] === "override")) W.push(`/item ${t[1]} doesn't exist before 26.3`);
        if (t[0] === "execute" && /\b(if|unless) slots\b/.test(c)) W.push("execute if slots doesn't exist before 26.3");
        return eachItem(c, (it) => {
          if (!it.comps) return;
          it.comps = it.comps.filter(([k]) => { const kk = unns(k); if (kk === "brewing_fuel" || kk === "cooking_fuel") { W.push(`component ${kk} doesn't exist before 26.3, dropped it`); return false; } if (kk === "pot_decorations") W.push("pot_decorations was a list of 4 item ids before 26.3, redo it"); return true; });
        });
      });
      if (/\bslots\b/.test(cmd) && toks(cmd)[0] === "execute") W.push("execute if slots doesn't exist before 26.3");
      cmd = eachPred(cmd, (p) => eachCond(p, (c) => {
        if ("type" in c && !("condition" in c)) { const v = c.type; delete c.type; c = { condition: unns(String(v)) === "match_block" ? "minecraft:block_state_property" : v, ...c }; }
        return c;
      }));
      const strip = (tree) => walkItems(tree, (n) => { if (get(n, "allow_op_features")) del(n, "allow_op_features"); });
      return eachNbt(cmd, strip);
    },
  },
];

// ---------------------------------------------------------------- api

// any version string -> index of the era it falls in ("1.20.4" -> the 1.20.3 era)
function era(v) {
  const key = (x) => x.split(".").map((n) => n.padStart(3, "0")).join(".");
  const k = key(String(v).trim()); let ix = 0;
  VERSIONS.forEach((e, i) => { if (key(e.id) <= k) ix = i; });
  return ix;
}

function portLine(line, from, to, W) {
  const lead = (/^\s*/.exec(line) || [""])[0];
  let cmd = line.trim(); if (!cmd || cmd.startsWith("#")) return line;
  const slash = cmd.startsWith("/"); if (slash) cmd = cmd.slice(1);
  const a = era(from), b = era(to);
  WARN = W;
  try {
    if (a < b) for (let i = a; i < b; i++) cmd = STEPS[i].up(cmd, W);
    else for (let i = a - 1; i >= b; i--) cmd = STEPS[i].down(cmd, W);
    // command blocks / minecarts carry commands as strings, port those too
    if (/Command:/.test(cmd)) {
      cmd = eachNbt(cmd, (tree) => walkItems(tree, (n) => {
        const c = get(n, "Command");
        if (c && c.t === "str" && c.v.trim()) { const sub = []; const v = portLine(c.v, from, to, sub); WARN = W; sub.forEach((m) => W.push("inside a command block: " + m)); set(n, "Command", S(v)); }
      }));
    }
  } catch (e) { W.push("couldn't fully parse this one (" + e.message + "), left it partly converted"); }
  return lead + (slash ? "/" : "") + cmd;
}

function port(text, from, to) {
  const lines = text.split(/\r?\n/), out = [], warnings = [];
  lines.forEach((line, n) => {
    const W = [];
    out.push(portLine(line, from, to, W));
    [...new Set(W)].forEach((w) => warnings.push({ line: n + 1, msg: w }));
  });
  return { output: out.join("\n"), warnings };
}

const api = { VERSIONS, port, era, parseSNBT, toSNBT };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.CommandPorter = api;
})(this);
