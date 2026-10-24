// bedrock <-> java bridge for command porter.
// bedrock converts to and from java 1.21.4 (json text, item components, camelCase gamerules),
// then porter.js carries it the rest of the way to whatever java version you picked.
(function (root) {
"use strict";

const JAVA_PIVOT = "1.21.4";

// ---------------------------------------------------------------- tokens

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
// bedrock lets block states sit after a space ("stone ["x"=1]"), glue them onto the block first
const toks = (s) => {
  const t = splitTop(s.trim(), " ").filter((x) => x !== "");
  for (let i = t.length - 1; i > 0; i--) if (t[i].startsWith("[") && !t[i - 1].startsWith("@") && /[a-z_:]$/i.test(t[i - 1])) { t[i - 1] += t[i]; t.splice(i, 1); }
  return t;
};
const isCoord = (t) => /^[~^]?-?\d*\.?\d*$/.test(t) && t !== "";
const isSel = (t) => /^@[aeprsnvci]|^@initiator/.test(t);
const unq = (s) => (s && s.length > 1 && (s[0] === '"' || s[0] === "'") && s[s.length - 1] === s[0] ? s.slice(1, -1) : s);
const unns = (id) => id.replace(/^minecraft:/, "");

// ---------------------------------------------------------------- shared tables

const GM = { 0: "survival", s: "survival", survival: "survival", 1: "creative", c: "creative", creative: "creative", 2: "adventure", a: "adventure", adventure: "adventure", spectator: "spectator", 6: "spectator" };
const DIFF = { 0: "peaceful", p: "peaceful", peaceful: "peaceful", 1: "easy", e: "easy", easy: "easy", 2: "normal", n: "normal", normal: "normal", 3: "hard", h: "hard", hard: "hard" };
const GAMERULES = ["announceAdvancements", "commandBlockOutput", "commandBlocksEnabled", "disableElytraMovementCheck", "disableRaids", "doDaylightCycle", "doEntityDrops", "doFireTick", "doImmediateRespawn", "doInsomnia", "doLimitedCrafting", "doMobLoot", "doMobSpawning", "doPatrolSpawning", "doTileDrops", "doTraderSpawning", "doVinesSpread", "doWardenSpawning", "doWeatherCycle", "drowningDamage", "fallDamage", "fireDamage", "forgiveDeadPlayers", "freezeDamage", "keepInventory", "logAdminCommands", "maxCommandChainLength", "maxEntityCramming", "mobGriefing", "naturalRegeneration", "playersSleepingPercentage", "pvp", "randomTickSpeed", "reducedDebugInfo", "sendCommandFeedback", "showDeathMessages", "spawnRadius", "spectatorsGenerateChunks", "tntExplodes", "universalAnger"];
const GR_LOWER = Object.fromEntries(GAMERULES.map((g) => [g.toLowerCase(), g]));
// bedrock-only gamerule names that map onto a differently named java rule
GR_LOWER.showcoordinates = null; GR_LOWER.tntexplodes = "tntExplodes"; GR_LOWER.respawnblocksexplode = null; GR_LOWER.showtags = null;
GR_LOWER.playerssleepingpercentage = "playersSleepingPercentage"; GR_LOWER.functioncommandlimit = "maxCommandChainLength"; GR_LOWER.spawnradius = "spawnRadius";

const SLOT_B2J = { "slot.weapon.mainhand": "weapon.mainhand", "slot.weapon.offhand": "weapon.offhand", "slot.armor.head": "armor.head", "slot.armor.chest": "armor.chest", "slot.armor.legs": "armor.legs", "slot.armor.feet": "armor.feet", "slot.hotbar": "hotbar", "slot.inventory": "inventory", "slot.enderchest": "enderchest", "slot.saddle": "horse.saddle", "slot.armor": "horse.body", "slot.chest": "horse" };
const SLOT_J2B = Object.fromEntries(Object.entries(SLOT_B2J).map(([a, b]) => [b, a]));

const CODES = { 0: "black", 1: "dark_blue", 2: "dark_green", 3: "dark_aqua", 4: "dark_red", 5: "dark_purple", 6: "gold", 7: "gray", 8: "dark_gray", 9: "blue", a: "green", b: "aqua", c: "red", d: "light_purple", e: "yellow", f: "white", g: "gold" };
const CODE_OF = Object.fromEntries(Object.entries(CODES).filter(([k]) => k !== "g").map(([k, v]) => [v, k]));
const RGB = { black: [0, 0, 0], dark_blue: [0, 0, 170], dark_green: [0, 170, 0], dark_aqua: [0, 170, 170], dark_red: [170, 0, 0], dark_purple: [170, 0, 170], gold: [255, 170, 0], gray: [170, 170, 170], dark_gray: [85, 85, 85], blue: [85, 85, 255], green: [85, 255, 85], aqua: [85, 255, 255], red: [255, 85, 85], light_purple: [255, 85, 255], yellow: [255, 255, 85], white: [255, 255, 255] };
function nearestColor(hex) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255]; let best = "white", bd = 1e9;
  for (const [k, v] of Object.entries(RGB)) { const d = (v[0] - c[0]) ** 2 + (v[1] - c[1]) ** 2 + (v[2] - c[2]) ** 2; if (d < bd) { bd = d; best = k; } }
  return best;
}

const BEDROCK_ONLY = ["ability", "agent", "aimassist", "camera", "camerashake", "clearspawnpoint", "controlscheme", "dialogue", "event", "fog", "gametest", "hud", "immutableworld", "inputpermission", "mobevent", "music", "playanimation", "scriptevent", "setmaxplayers", "structure", "tickingarea", "titleraw_dummy", "wsserver", "connect", "volumearea", "permission", "reload", "allowlist", "transfer", "changesetting", "project", "sendshowstoreoffer"];
const JAVA_ONLY = ["advancement", "attribute", "bossbar", "data", "datapack", "debug", "forceload", "item modify", "jfr", "loot", "perf", "place", "publish", "random", "recipe", "return", "spectate", "team", "teammsg", "tm", "trigger", "worldborder", "tick", "rotate", "test", "transfer"];

// ---------------------------------------------------------------- selectors

function selB2J(t, W) {
  const m = /^(@[a-z]+|@initiator)(?:\[(.*)\])?$/s.exec(t); if (!m) return t;
  let head = m[1];
  if (head === "@initiator") { W.push("@initiator is bedrock only (npc dialogue), used @p"); head = "@p"; }
  if (head === "@c" || head === "@v") { W.push(head + " is an education edition agent selector, used @s"); head = "@s"; }
  const args = m[2] ? splitTop(m[2], ",").map((a) => { const i = a.indexOf("="); return [a.slice(0, i).trim(), a.slice(i + 1).trim()]; }) : [];
  const out = [], g = {};
  for (const [k, v] of args) {
    if (["r", "rm", "l", "lm", "rx", "rxm", "ry", "rym", "c"].includes(k)) { g[k] = v; continue; }
    if (k === "m") { const neg = v.startsWith("!"), x = GM[v.replace("!", "")]; if (x) out.push(["gamemode", (neg ? "!" : "") + x]); else W.push("gamemode " + v + " (default) has no java selector, dropped it"); continue; }
    if (["family", "hasitem", "haspermission", "has_property"].includes(k)) { W.push(k + "= has no java selector argument, dropped it" + (k === "hasitem" ? " (java can do this with nbt= or execute if items)" : "")); continue; }
    if (k === "name") { out.push([k, v]); continue; }
    out.push([k, v]);
  }
  const rng = (lo, hi) => (lo !== undefined && hi !== undefined ? lo + ".." + hi : lo !== undefined ? lo + ".." : ".." + hi);
  if (g.r !== undefined || g.rm !== undefined) out.push(["distance", rng(g.rm, g.r)]);
  if (g.l !== undefined || g.lm !== undefined) out.push(["level", rng(g.lm, g.l)]);
  if (g.rx !== undefined || g.rxm !== undefined) out.push(["x_rotation", rng(g.rxm, g.rx)]);
  if (g.ry !== undefined || g.rym !== undefined) out.push(["y_rotation", rng(g.rym, g.ry)]);
  if (g.c !== undefined) {
    const c = parseInt(g.c, 10);
    if (head === "@p" || head === "@r") { if (Math.abs(c) !== 1) out.push(["limit", Math.abs(c)]); if (c < 0) out.push(["sort", "furthest"]); }
    else { out.push(["limit", Math.abs(c)]); out.push(["sort", c < 0 ? "furthest" : "nearest"]); }
  }
  return head + (out.length ? "[" + out.map(([k, v]) => k + "=" + v).join(",") + "]" : "");
}

function selJ2B(t, W) {
  const m = /^(@[a-z]+)(?:\[(.*)\])?$/s.exec(t); if (!m) return t;
  const head = m[1];
  const args = m[2] ? splitTop(m[2], ",").map((a) => { const i = a.indexOf("="); return [a.slice(0, i).trim(), a.slice(i + 1).trim()]; }) : [];
  const out = []; let limit, sort;
  const split = (v) => { const [a, b] = v.includes("..") ? v.split("..") : [v, v]; return [a === "" ? undefined : a, b === "" ? undefined : b]; };
  for (const [k, v] of args) {
    if (k === "distance") { const [lo, hi] = split(v); if (lo !== undefined) out.push(["rm", lo]); if (hi !== undefined) out.push(["r", hi]); }
    else if (k === "level") { const [lo, hi] = split(v); if (lo !== undefined) out.push(["lm", lo]); if (hi !== undefined) out.push(["l", hi]); }
    else if (k === "x_rotation") { const [lo, hi] = split(v); if (lo !== undefined) out.push(["rxm", lo]); if (hi !== undefined) out.push(["rx", hi]); }
    else if (k === "y_rotation") { const [lo, hi] = split(v); if (lo !== undefined) out.push(["rym", lo]); if (hi !== undefined) out.push(["ry", hi]); }
    else if (k === "gamemode") out.push(["m", v]);
    else if (k === "limit") limit = parseInt(v, 10);
    else if (k === "sort") sort = v;
    else if (["type", "name", "tag", "x", "y", "z", "dx", "dy", "dz", "scores"].includes(k)) out.push([k, v]);
    else W.push(k + "= has no bedrock selector argument, dropped it");
  }
  if (sort === "random" && head === "@e") W.push("sort=random has no bedrock equivalent, try @r[type=...] instead");
  if (sort === "arbitrary") W.push("sort=arbitrary dropped, bedrock sorts by distance");
  if (limit !== undefined || sort === "furthest") out.push(["c", (sort === "furthest" ? -1 : 1) * (limit === undefined ? 1 : limit)]);
  return head + (out.length ? "[" + out.map(([k, v]) => k + "=" + v).join(",") + "]" : "");
}
const mapSels = (t, fn, W) => t.map((x) => (isSel(x) ? fn(x, W) : x));

// ---------------------------------------------------------------- blocks

// bedrock: stone["color"="red",age=3] or old stone 2 data values. java: stone[color=red,age=3]
function blockB2J(t, W) {
  return t.replace(/\[(.*)\]$/s, (m, inner) => {
    if (!inner.trim()) return "";
    const parts = splitTop(inner, ",").map((p) => { const i = p.search(/[=:]/); return unq(p.slice(0, i).trim()) + "=" + unq(p.slice(i + 1).trim()); });
    W.push("block states copied over, bedrock and java state names don't always match, double check them");
    return "[" + parts.join(",") + "]";
  });
}
function blockJ2B(t) {
  return t.replace(/\[(.*)\]$/s, (m, inner) => {
    if (!inner.trim()) return "";
    const parts = splitTop(inner, ",").map((p) => { const [k, v] = p.split("="); const val = /^(true|false|-?\d+)$/.test(v.trim()) ? v.trim() : '"' + v.trim() + '"'; return '"' + k.trim() + '"=' + val; });
    return "[" + parts.join(",") + "]";
  });
}
const dataVal = (t, W) => { if (t !== undefined && /^-?\d+$/.test(t) && t !== "0" && t !== "-1") W.push("data value " + t + " has no java meaning anymore, pick the exact block or item name"); };

// ---------------------------------------------------------------- text

function sectionToComps(text) {
  const out = []; let style = {}, buf = "";
  const flush = () => { if (buf) { out.push(Object.assign({ text: buf }, style)); buf = ""; } };
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "§" && i + 1 < text.length) {
      const c = text[++i].toLowerCase(); flush();
      if (CODES[c]) style = { color: CODES[c] };
      else if (c === "l") style = Object.assign({}, style, { bold: true });
      else if (c === "o") style = Object.assign({}, style, { italic: true });
      else if (c === "k") style = Object.assign({}, style, { obfuscated: true });
      else if (c === "r") style = {};
      continue;
    }
    buf += text[i];
  }
  flush();
  return out;
}
function rawB2J(raw, W) {
  const list = (raw && raw.rawtext) || [];
  const conv = (e) => {
    if (e.text !== undefined) return sectionToComps(String(e.text));
    if (e.selector !== undefined) return [{ selector: selB2J(e.selector, W) }];
    if (e.score) return [{ score: { name: e.score.name === "*" ? "@s" : e.score.name, objective: e.score.objective } }];
    if (e.translate !== undefined) {
      const c = { translate: e.translate };
      if (Array.isArray(e.with)) c.with = e.with.map(String);
      else if (e.with && e.with.rawtext) c.with = e.with.rawtext.flatMap(conv);
      W.push("translate keys are different between editions, check \"" + e.translate + "\"");
      return [c];
    }
    if (e.rawtext) return e.rawtext.flatMap(conv);
    return [];
  };
  const parts = list.flatMap(conv);
  return parts.length === 1 ? parts[0] : ["", ...parts];
}
function compJ2B(comp, W) {
  const out = []; let last = "";
  const style = (s) => {
    let p = "";
    if (s.color) { const col = s.color.startsWith("#") ? nearestColor(s.color) : s.color; if (s.color.startsWith("#")) W.push("hex color " + s.color + " rounded to " + col + ", bedrock only has the 16 chat colors"); if (CODE_OF[col]) p += "§" + CODE_OF[col]; }
    if (s.bold) p += "§l"; if (s.italic) p += "§o"; if (s.obfuscated) p += "§k";
    if (s.underlined || s.strikethrough) W.push("underline and strikethrough don't exist in bedrock chat, dropped");
    if (p === last) return "";
    const pre = last ? "§r" : ""; last = p; return pre + p;
  };
  const walk = (c, inh) => {
    if (typeof c === "string") { out.push({ text: style(inh) + c }); return; }
    if (Array.isArray(c)) { if (!c.length) return; const base = typeof c[0] === "object" && !Array.isArray(c[0]) ? Object.assign({}, inh, c[0]) : inh; c.forEach((x, i) => walk(x, i === 0 ? inh : base)); return; }
    if (!c || typeof c !== "object") return;
    const s = Object.assign({}, inh); ["color", "bold", "italic", "obfuscated", "underlined", "strikethrough"].forEach((k) => { if (c[k] !== undefined) s[k] = c[k]; });
    if (c.click_event || c.clickEvent || c.hover_event || c.hoverEvent) W.push("click and hover events don't exist in bedrock chat, dropped");
    if (c.text !== undefined) out.push({ text: style(s) + c.text });
    else if (c.selector !== undefined) out.push({ selector: selJ2B(c.selector, W) });
    else if (c.score) out.push({ score: { name: c.score.name === "@s" ? "*" : c.score.name, objective: c.score.objective } });
    else if (c.translate !== undefined) { const t = { translate: c.translate }; if (c.with) t.with = { rawtext: compJ2B(c.with, W).rawtext }; out.push(t); W.push("translate keys are different between editions, check \"" + c.translate + "\""); }
    else if (c.keybind || c.nbt) W.push((c.keybind ? "keybind" : "nbt") + " text has no bedrock version, dropped");
    if (c.extra) c.extra.forEach((x) => walk(x, s));
  };
  walk(comp, {});
  // merge plain neighbours to keep it short
  const merged = [];
  for (const e of out) { const last = merged[merged.length - 1]; if (last && last.text !== undefined && e.text !== undefined) last.text += e.text; else merged.push(e); }
  return { rawtext: merged };
}
const parseJSON = (s, W) => { try { return JSON.parse(s); } catch (e) { W.push("couldn't read the json text, left it as is"); return null; } };

// ---------------------------------------------------------------- bedrock -> java

function b2j(cmd, W) {
  let t = toks(cmd); if (!t.length) return cmd;
  const c = t[0].toLowerCase();
  if (BEDROCK_ONLY.includes(c)) { W.push("/" + c + " is bedrock only, commented it out"); return "# bedrock only: " + cmd; }
  if (c === "execute") return execB2J(t, W);
  t = mapSels(t, selB2J, W);
  switch (c) {
    case "gamemode": { const g = GM[t[1]]; if (!g) { W.push("gamemode " + t[1] + " doesn't exist in java, used survival"); t[1] = "survival"; } else t[1] = g; return t.join(" "); }
    case "difficulty": t[1] = DIFF[t[1]] || t[1]; return t.join(" ");
    case "defaultgamemode": t[1] = GM[t[1]] || t[1]; return t.join(" ");
    case "effect": {
      if (t[2] === "clear") return "effect clear " + t[1];
      const hide = t[5] === "true" ? " true" : "";
      return "effect give " + t[1] + " " + unns(t[2]) + (t[3] ? " " + t[3] : "") + (t[4] ? " " + t[4] : (hide ? " 0" : "")) + hide;
    }
    case "xp": { const lv = /l$/i.test(t[1]), n = t[1].replace(/l$/i, ""); return "xp add " + (t[2] || "@s") + " " + n + (lv ? " levels" : ""); }
    case "testfor": return "execute if entity " + t[1];
    case "testforblock": dataVal(t[5], W); return "execute if block " + t.slice(1, 4).join(" ") + " " + blockB2J(t[4], W);
    case "testforblocks": return "execute if blocks " + t.slice(1, 10).join(" ") + " " + (t[10] || "all");
    case "give": {
      dataVal(t[4], W); let item = unns(t[2]) ;
      if (t[5]) item += compsB2J(t.slice(5).join(" "), W);
      return "give " + t[1] + " " + item + (t[3] ? " " + t[3] : "");
    }
    case "clear": dataVal(t[3], W); return ["clear", t[1], t[2], t[4]].filter((x) => x !== undefined).join(" ");
    case "replaceitem": {
      // entity: replaceitem entity <target> <slot> <id> [keep|destroy] <item> [amount] [data]
      // block:  replaceitem block <x y z> slot.container <id> [keep|destroy] <item> [amount] [data]
      const blk = t[1] === "block"; let i = blk ? 7 : 5;
      if (t[i] === "keep" || t[i] === "destroy") { W.push("replaceitem " + t[i] + " mode has no java version, it always replaces"); i++; }
      dataVal(t[i + 2], W);
      const item = unns(t[i]) + (t[i + 1] ? " " + t[i + 1] : "");
      if (blk) return "item replace block " + t.slice(2, 5).join(" ") + " container." + t[6] + " with " + item;
      const base = SLOT_B2J[t[3]] || t[3].replace(/^slot\./, "");
      const indexed = ["hotbar", "inventory", "enderchest", "horse"].includes(base);
      return "item replace entity " + t[2] + " " + base + (indexed ? "." + t[4] : "") + " with " + item;
    }
    case "setblock": { dataVal(t[5] && /^\d+$/.test(t[5]) ? t[5] : undefined, W); const mode = t.slice(5).find((x) => ["replace", "destroy", "keep"].includes(x)); return ["setblock", ...t.slice(1, 4), blockB2J(unns(t[4]), W), mode].filter(Boolean).join(" "); }
    case "fill": {
      const rest = t.slice(8).filter((x) => !/^\d+$/.test(x)); const mode = rest[0];
      let line = ["fill", ...t.slice(1, 7), blockB2J(unns(t[7]), W)].join(" ");
      if (mode) line += " " + mode + (mode === "replace" && rest[1] ? " " + blockB2J(unns(rest[1]), W) : "");
      return line;
    }
    case "tellraw": { const j = parseJSON(t.slice(2).join(" "), W); return j ? "tellraw " + t[1] + " " + JSON.stringify(rawB2J(j, W)) : t.join(" "); }
    case "titleraw": {
      if (["times", "clear", "reset"].includes(t[2])) return "title " + t.slice(1).join(" ");
      const j = parseJSON(t.slice(3).join(" "), W); return j ? "title " + t[1] + " " + t[2] + " " + JSON.stringify(rawB2J(j, W)) : t.join(" ");
    }
    case "title": {
      if (["times", "clear", "reset"].includes(t[2])) return t.join(" ");
      const txt = unq(t.slice(3).join(" ")); const comps = sectionToComps(txt);
      return "title " + t[1] + " " + t[2] + " " + JSON.stringify(comps.length === 1 ? comps[0] : ["", ...comps]);
    }
    case "scoreboard": {
      if (t[1] === "players" && t[2] === "random") return "execute store result score " + t[3] + " " + t[4] + " run random value " + t[5] + ".." + t[6];
      if (t[1] === "players" && t[2] === "test") { const lo = t[5] === "*" ? "" : t[5], hi = !t[6] || t[6] === "*" ? "" : t[6]; return "execute if score " + t[3] + " " + t[4] + " matches " + (lo === hi ? lo : lo + ".." + hi); }
      if (t[1] === "objectives" && t[2] === "setdisplay" && t[3] === "belowname") t[3] = "below_name";
      if (t[1] === "objectives" && t[2] === "setdisplay" && (t[5] === "ascending" || t[5] === "descending")) { W.push("sort order on the display has no java version, dropped"); t.length = 5; }
      if (t[1] === "objectives" && t[2] === "add" && t[5]) t[5] = JSON.stringify({ text: unq(t.slice(5).join(" ")) }), t.length = 6;
      return t.join(" ");
    }
    case "gamerule": {
      const g = GR_LOWER[t[1] && t[1].toLowerCase()];
      if (g === null || (t[1] && g === undefined)) { W.push("gamerule " + t[1] + " is bedrock only, commented it out"); return "# bedrock only: " + cmd; }
      if (g) t[1] = g; return t.join(" ");
    }
    case "summon": {
      // summon <type> [pos] [yRot xRot] [event] [name]  or  summon <type> <name> [pos]
      const type = unns(t[1]); let i = 2, name, pos = [];
      if (t[i] && !isCoord(t[i])) { name = unq(t[i]); i++; }
      while (pos.length < 3 && t[i] && isCoord(t[i])) pos.push(t[i++]);
      if (pos.length === 3 && t[i] && isCoord(t[i]) && t[i + 1] && isCoord(t[i + 1])) { pos.push(t[i], t[i + 1]); W.push("summon rotation moved into Rotation nbt"); i += 2; }
      if (t[i] && /:/.test(t[i]) || (t[i] && t[i + 1])) { W.push("spawn event " + t[i] + " is bedrock only, dropped"); i++; }
      if (!name && t[i]) name = unq(t[i]);
      const nbt = [];
      if (name) nbt.push("CustomName:'" + JSON.stringify({ text: name }).replace(/'/g, "\\'") + "'");
      if (pos.length === 5) nbt.push("Rotation:[" + pos[3] + "f," + pos[4] + "f]");
      return ["summon", type, ...(pos.length ? pos.slice(0, 3) : nbt.length ? ["~", "~", "~"] : []), nbt.length ? "{" + nbt.join(",") + "}" : ""].filter(Boolean).join(" ");
    }
    case "tp": case "teleport": if (t[t.length - 1] === "true" || t[t.length - 1] === "false") { W.push("checkForBlocks flag dropped, java doesn't have it"); t.pop(); } return t.join(" ");
    case "playsound": { const r = [t[0], t[1], "master", t[2] || "@a", ...t.slice(3)]; return r.join(" "); }
    case "particle": W.push("particle names differ between editions, check this one"); return "particle " + unns(t[1]).replace(/_particle$/, "") + " " + t.slice(2, 5).join(" ");
    case "locate": if (t[1] !== "structure" && t[1] !== "biome") return "locate structure " + t[1]; W.push("structure ids differ (village is village_plains etc in java)"); return t.join(" ");
    case "w": case "tell": case "msg": t[0] = c; return t.join(" ");
    default: return t.join(" ");
  }
}

function compsB2J(json, W) {
  const j = parseJSON(json, W); if (!j) return "";
  const out = [];
  const blocks = (v) => "[" + ((v && v.blocks) || []).map((b) => "\"" + ns(b) + "\"").join(",") + "]";
  const ns = (id) => (id.includes(":") ? id : "minecraft:" + id);
  if (j["minecraft:can_destroy"] || j.can_destroy) out.push("can_break={blocks:" + blocks(j["minecraft:can_destroy"] || j.can_destroy) + "}");
  if (j["minecraft:can_place_on"] || j.can_place_on) out.push("can_place_on={blocks:" + blocks(j["minecraft:can_place_on"] || j.can_place_on) + "}");
  if (j["minecraft:keep_on_death"] || j["minecraft:item_lock"]) W.push("keep_on_death and item_lock are bedrock only, dropped");
  return out.length ? "[" + out.join(",") + "]" : "";
}

function execB2J(t, W) {
  // old bedrock execute: execute <target> <x y z> [detect <x y z> <block> <data>] <command>
  if (t[1] && isSel(t[1]) && isCoord(t[2] || "")) {
    let i = 5, out = "execute as " + selB2J(t[1], W) + " at @s";
    const pos = t.slice(2, 5); if (pos.join(" ") !== "~ ~ ~") out += " positioned " + pos.join(" ");
    if (t[i] === "detect") { dataVal(t[i + 5], W); out += " if block " + t.slice(i + 1, i + 4).join(" ") + " " + blockB2J(unns(t[i + 4]), W); i += 6; }
    return out + " run " + b2j(t.slice(i).join(" "), W);
  }
  // new bedrock execute is nearly java already: fix selectors + the run command
  const r = t.indexOf("run");
  const head = t.slice(0, r < 0 ? t.length : r).map((x) => (isSel(x) ? selB2J(x, W) : x));
  for (let i = 0; i < head.length; i++) if ((head[i] === "if" || head[i] === "unless") && head[i + 1] === "block" && head[i + 5]) {
    head[i + 5] = blockB2J(unns(head[i + 5]), W); if (/^\d+$/.test(head[i + 6] || "")) { dataVal(head[i + 6], W); head.splice(i + 6, 1); }
  }
  return head.join(" ") + (r < 0 ? "" : " run " + b2j(t.slice(r + 1).join(" "), W));
}

// ---------------------------------------------------------------- java -> bedrock

function j2b(cmd, W) {
  let t = toks(cmd); if (!t.length) return cmd;
  const c = t[0].toLowerCase(), two = c + " " + (t[1] || "");
  if (JAVA_ONLY.includes(c) || JAVA_ONLY.includes(two)) { W.push("/" + (JAVA_ONLY.includes(two) ? two : c) + " is java only, commented it out"); return "# java only: " + cmd; }
  if (c === "execute") return execJ2B(t, W);
  if (c === "function" || c === "schedule") W.push("function names follow your behavior pack's functions folder, check the path");
  t = mapSels(t, selJ2B, W);
  switch (c) {
    case "effect": {
      if (t[1] === "clear") return "effect " + (t[2] || "@s") + " clear" + (t[3] ? "" : "");
      if (t[1] === "give") return ["effect", t[2], unns(t[3]), t[4], t[5], t[6]].filter((x) => x !== undefined).join(" ");
      return t.join(" ");
    }
    case "xp": case "experience": {
      if (t[1] === "query") { W.push("xp query has no bedrock version"); return "# java only: " + cmd; }
      if (t[1] === "set") W.push("bedrock xp can only add, this adds instead of setting");
      return "xp " + t[3] + (t[4] === "levels" ? "L" : "") + " " + t[2];
    }
    case "give": {
      const m = /^([^\[{]+)(\[.*\])?/s.exec(t[2]); if (m[2] && m[2] !== "[]") W.push("item components dropped, bedrock only supports can_destroy / can_place_on json");
      return "give " + t[1] + " " + unns(m[1]) + " " + (t[3] || 1) + " 0";
    }
    case "clear": { const it = t[2] ? unns(t[2].replace(/[\[{].*$/s, "")) : undefined; return ["clear", t[1], it, it ? "-1" : undefined, t[3]].filter((x) => x !== undefined).join(" "); }
    case "item": {
      if (t[1] !== "replace") { W.push("/item " + t[1] + " is java only"); return "# java only: " + cmd; }
      const w = t.indexOf("with"); if (w < 0) { W.push("item replace ... from has no bedrock version"); return "# java only: " + cmd; }
      if (t[2] === "block") { const idx = t[6].split(".")[1] || "0"; return "replaceitem block " + t.slice(3, 6).join(" ") + " slot.container " + idx + " " + unns(t[w + 1].replace(/[\[{].*$/s, "")) + (t[w + 2] ? " " + t[w + 2] : ""); }
      const [base, idx] = t[4].includes(".") && /\.\d+$/.test(t[4]) ? [t[4].replace(/\.\d+$/, ""), t[4].split(".").pop()] : [t[4], "0"];
      const slot = SLOT_J2B[base]; if (!slot) { W.push("slot " + t[4] + " has no bedrock version"); return "# java only: " + cmd; }
      return "replaceitem entity " + t[3] + " " + slot + " " + idx + " " + unns(t[w + 1].replace(/[\[{].*$/s, "")) + (t[w + 2] ? " " + t[w + 2] : "");
    }
    case "setblock": return ["setblock", ...t.slice(1, 4), blockJ2B(unns(t[4])), t[5]].filter(Boolean).join(" ");
    case "fill": return ["fill", ...t.slice(1, 7), blockJ2B(unns(t[7])), t[8], t[8] === "replace" && t[9] ? blockJ2B(unns(t[9])) : undefined].filter(Boolean).join(" ");
    case "tellraw": { const j = parseJSON(t.slice(2).join(" "), W); return j === null ? t.join(" ") : "tellraw " + t[1] + " " + JSON.stringify(compJ2B(j, W)); }
    case "title": {
      if (["times", "clear", "reset"].includes(t[2])) return t.join(" ");
      const j = parseJSON(t.slice(3).join(" "), W); return j === null ? t.join(" ") : "titleraw " + t[1] + " " + t[2] + " " + JSON.stringify(compJ2B(j, W));
    }
    case "scoreboard": {
      if (t[1] === "objectives" && t[2] === "setdisplay") { if (t[3] === "below_name") t[3] = "belowname"; if (t[3] && t[3].startsWith("sidebar.team")) { W.push("team-colored sidebars are java only"); return "# java only: " + cmd; } }
      if (t[1] === "objectives" && t[2] === "add") { if (t[4] !== "dummy") { W.push("criteria " + t[4] + " doesn't exist in bedrock, used dummy"); t[4] = "dummy"; } if (t[5]) { const j = parseJSON(t.slice(5).join(" "), W); t.length = 5; if (j) t.push(JSON.stringify(compJ2B(j, W).rawtext.map((x) => x.text || "").join(""))); } }
      if (t[1] === "objectives" && t[2] === "modify") { W.push("scoreboard objectives modify is java only"); return "# java only: " + cmd; }
      if (t[1] === "players" && ["enable", "get", "display"].includes(t[2])) { W.push("scoreboard players " + t[2] + " is java only"); return "# java only: " + cmd; }
      return t.join(" ");
    }
    case "gamerule": {
      if (!t[1]) return t.join(" ");
      const camel = t[1].replace(/_([a-z])/g, (m, a) => a.toUpperCase());
      const low = camel.toLowerCase();
      if (!GR_LOWER[low]) W.push("gamerule " + t[1] + " may not exist in bedrock, check it");
      t[1] = low; return t.join(" ");
    }
    case "summon": {
      const nb = t.find((x) => x.startsWith("{")); let name;
      if (nb) { const m = /CustomName:(?:'([^']*)'|"((?:[^"\\]|\\.)*)"|(\{.*?\}))/s.exec(nb); if (m) { const raw = m[1] || (m[2] && m[2].replace(/\\"/g, '"')) || m[3]; try { const j = JSON.parse(raw); name = typeof j === "string" ? j : j.text; } catch (e) { name = raw && raw.replace(/^\{?text:?"?|"?\}?$/g, ""); } } W.push("entity nbt dropped, bedrock summon only takes a name and spawn event"); }
      const pos = t.slice(2).filter((x) => !x.startsWith("{")).slice(0, 3);
      return ["summon", unns(t[1]), ...(pos.length ? pos : name ? ["~", "~", "~"] : []), name ? "minecraft:entity_spawned " + JSON.stringify(name) : undefined].filter(Boolean).join(" ");
    }
    case "playsound": return [t[0], t[1], ...t.slice(3)].join(" ");
    case "particle": W.push("particle names differ between editions, check this one; speed / count args dropped"); return "particle minecraft:" + unns(t[1]).split(/[\s{]/)[0] + "_particle " + (t.slice(2, 5).join(" ") || "~ ~ ~");
    case "stopsound": t.length = Math.min(t.length, 3); return t.join(" ");
    default: return t.join(" ");
  }
}

function execJ2B(t, W) {
  const r = t.indexOf("run");
  const head = t.slice(0, r < 0 ? t.length : r);
  // execute if entity <sel> with nothing after is just testfor
  if (r < 0 && head.length === 4 && head[1] === "if" && head[2] === "entity") return "testfor " + selJ2B(head[3], W);
  // execute store result score <t> <obj> run random value a..b is bedrock's scoreboard players random
  const rv = /^execute store result score (\S+) (\S+) run random value (-?\d+)\.\.(-?\d+)$/.exec(t.join(" "));
  if (rv) return "scoreboard players random " + selJ2B(rv[1], W) + " " + rv[2] + " " + rv[3] + " " + rv[4];
  const out = ["execute"];
  for (let i = 1; i < head.length; i++) {
    const x = head[i];
    if (x === "store" || x === "on" || x === "summon") { W.push("execute " + x + " is java only, commented the line out"); return "# java only: " + t.join(" "); }
    if ((x === "if" || x === "unless") && ["data", "predicate", "biome", "loaded", "dimension", "function", "items"].includes(head[i + 1])) { W.push("execute " + x + " " + head[i + 1] + " is java only, commented the line out"); return "# java only: " + t.join(" "); }
    if ((x === "if" || x === "unless") && head[i + 1] === "block") { out.push(x, "block", head[i + 2], head[i + 3], head[i + 4], blockJ2B(unns(head[i + 5]))); i += 5; continue; }
    out.push(isSel(x) ? selJ2B(x, W) : x);
  }
  return out.join(" ") + (r < 0 ? "" : " run " + j2b(t.slice(r + 1).join(" "), W));
}

// ---------------------------------------------------------------- api

function lines(text, fn) {
  const out = [], warnings = [];
  text.split(/\r?\n/).forEach((line, n) => {
    const lead = (/^\s*/.exec(line) || [""])[0]; let cmd = line.trim();
    if (!cmd || cmd.startsWith("#")) { out.push(line); return; }
    const slash = cmd.startsWith("/"); if (slash) cmd = cmd.slice(1);
    const W = []; let r;
    try { r = fn(cmd, W); } catch (e) { W.push("couldn't fully parse this one (" + e.message + "), left it as is"); r = cmd; }
    out.push(lead + (slash && !r.startsWith("#") ? "/" : "") + r);
    [...new Set(W)].forEach((w) => warnings.push({ line: n + 1, msg: w }));
  });
  return { output: out.join("\n"), warnings };
}

const api = { JAVA_PIVOT, toJava: (text) => lines(text, b2j), fromJava: (text) => lines(text, j2b) };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BedrockPorter = api;
})(this);
