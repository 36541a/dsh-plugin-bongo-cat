// src/index.ts
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, extname, basename } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// src/shared/cosmetics.ts
var COSMETIC_SLOTS = ["hat", "face", "accessory"];
var COSMETIC_ITEMS = [
  // ── hats ──────────────────────────────────────────────────────
  {
    id: "beanie",
    slot: "hat",
    rarity: 1,
    x: 50,
    y: 6,
    w: 30,
    art: `<path d="M22 66 A28 34 0 0 1 78 66 Z" fill="#7ec8e3" stroke="#3f6f80" stroke-width="3.5" stroke-linejoin="round"/>
<rect x="18" y="62" width="64" height="14" rx="7" fill="#a9dced" stroke="#3f6f80" stroke-width="3.5"/>
<circle cx="50" cy="26" r="8" fill="#fff6fa" stroke="#3f6f80" stroke-width="3.5"/>
<path d="M36 44 L40 62 M50 40 L50 62 M64 44 L60 62" stroke="#3f6f80" stroke-width="2" opacity="0.35"/>`
  },
  {
    id: "cap",
    slot: "hat",
    rarity: 1,
    x: 50,
    y: 7,
    w: 32,
    art: `<path d="M24 62 A26 26 0 0 1 76 62 Z" fill="#5aa9e6" stroke="#2f5f85" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M72 62 Q96 62 96 72 L28 72 Z" fill="#3f8fd0" stroke="#2f5f85" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="50" cy="44" r="5" fill="#dff0ff" stroke="#2f5f85" stroke-width="2.5"/>`
  },
  {
    id: "party",
    slot: "hat",
    rarity: 1,
    x: 50,
    y: 2,
    w: 26,
    art: `<path d="M50 6 L74 80 L26 80 Z" fill="#ff8fa3" stroke="#4a3540" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M39 48 L61 48 M33 64 L67 64" stroke="#fff3f5" stroke-width="6" stroke-linecap="round"/>
<circle cx="50" cy="8" r="7" fill="#ffd166" stroke="#4a3540" stroke-width="3"/>`
  },
  {
    id: "bow",
    slot: "hat",
    rarity: 1,
    x: 50,
    y: 5,
    w: 22,
    art: `<path d="M50 52 L22 34 Q12 52 22 70 Z" fill="#ff9fb2" stroke="#7d3b4d" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M50 52 L78 34 Q88 52 78 70 Z" fill="#ff9fb2" stroke="#7d3b4d" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="50" cy="52" r="9" fill="#ffc2cf" stroke="#7d3b4d" stroke-width="3.5"/>`
  },
  {
    id: "tophat",
    slot: "hat",
    rarity: 2,
    x: 50,
    y: 1,
    w: 26,
    art: `<rect x="28" y="26" width="44" height="42" rx="4" fill="#3a3440" stroke="#22202a" stroke-width="3.5"/>
<rect x="28" y="54" width="44" height="9" fill="#e5484d"/>
<ellipse cx="50" cy="72" rx="34" ry="9" fill="#3a3440" stroke="#22202a" stroke-width="3.5"/>`
  },
  {
    id: "santa",
    slot: "hat",
    rarity: 2,
    x: 50,
    y: 3,
    w: 32,
    art: `<path d="M28 72 Q40 8 74 34 Q66 56 42 72 Z" fill="#e5484d" stroke="#8c2b2f" stroke-width="3.5" stroke-linejoin="round"/>
<rect x="20" y="66" width="58" height="14" rx="7" fill="#fff6f7" stroke="#cfc3c8" stroke-width="3"/>
<circle cx="78" cy="32" r="8" fill="#fff6f7" stroke="#cfc3c8" stroke-width="3"/>`
  },
  {
    id: "flower",
    slot: "hat",
    rarity: 2,
    x: 50,
    y: 6,
    w: 20,
    art: `<g fill="#ffd166" stroke="#b8860b" stroke-width="2.5">
  <circle cx="50" cy="24" r="11"/><circle cx="72" cy="42" r="11"/><circle cx="64" cy="68" r="11"/>
  <circle cx="36" cy="68" r="11"/><circle cx="28" cy="42" r="11"/>
</g>
<circle cx="50" cy="48" r="10" fill="#fff1c9" stroke="#b8860b" stroke-width="2.5"/>`
  },
  {
    id: "headphone",
    slot: "hat",
    rarity: 2,
    x: 50,
    y: 8,
    w: 36,
    art: `<path d="M18 56 A32 32 0 0 1 82 56" fill="none" stroke="#4a4a58" stroke-width="8" stroke-linecap="round"/>
<rect x="8" y="50" width="18" height="30" rx="9" fill="#6c6c7a" stroke="#33333d" stroke-width="3.5"/>
<rect x="74" y="50" width="18" height="30" rx="9" fill="#6c6c7a" stroke="#33333d" stroke-width="3.5"/>`
  },
  {
    id: "crown",
    slot: "hat",
    rarity: 3,
    x: 50,
    y: 6,
    w: 26,
    art: `<path d="M20 70 L20 30 L37 45 L50 20 L63 45 L80 30 L80 70 Z" fill="#ffd166" stroke="#a57c14" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="50" cy="54" r="5" fill="#e5484d"/>
<circle cx="32" cy="58" r="3.5" fill="#4aa3e0"/>
<circle cx="68" cy="58" r="3.5" fill="#4aa3e0"/>`
  },
  {
    id: "horns",
    slot: "hat",
    rarity: 3,
    x: 50,
    y: 4,
    w: 30,
    art: `<path d="M30 62 Q22 32 36 18 Q42 40 42 62 Z" fill="#b39ddb" stroke="#6b529b" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M70 62 Q78 32 64 18 Q58 40 58 62 Z" fill="#b39ddb" stroke="#6b529b" stroke-width="3.5" stroke-linejoin="round"/>`
  },
  // ── face ──────────────────────────────────────────────────────
  {
    id: "blush",
    slot: "face",
    rarity: 1,
    x: 34,
    y: 45,
    w: 34,
    art: `<ellipse cx="18" cy="56" rx="13" ry="8" fill="#ff9fb2" opacity="0.7"/>
<ellipse cx="82" cy="56" rx="13" ry="8" fill="#ff9fb2" opacity="0.7"/>`
  },
  {
    id: "glasses",
    slot: "face",
    rarity: 1,
    x: 33,
    y: 43,
    w: 34,
    art: `<circle cx="33" cy="50" r="15" fill="rgba(255,255,255,0.16)" stroke="#3a2c33" stroke-width="3.5"/>
<circle cx="67" cy="50" r="15" fill="rgba(255,255,255,0.16)" stroke="#3a2c33" stroke-width="3.5"/>
<path d="M48 50 H52" stroke="#3a2c33" stroke-width="3.5"/>
<path d="M18 46 L6 42 M82 46 L94 42" stroke="#3a2c33" stroke-width="3.5" stroke-linecap="round"/>`
  },
  {
    id: "sweat",
    slot: "face",
    rarity: 1,
    x: 52,
    y: 32,
    w: 16,
    art: `<path d="M50 20 Q72 52 50 66 Q28 52 50 20 Z" fill="#9ad9f0" stroke="#4a90ad" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M42 50 Q46 56 50 50" stroke="#4a90ad" stroke-width="3" fill="none" stroke-linecap="round"/>`
  },
  {
    id: "anger",
    slot: "face",
    rarity: 1,
    x: 53,
    y: 31,
    w: 18,
    art: `<g stroke="#e5484d" stroke-width="6" stroke-linecap="round" fill="none">
  <path d="M32 26 L58 52"/><path d="M58 26 L32 52"/>
  <path d="M45 14 L45 22"/><path d="M45 56 L45 64"/>
</g>`
  },
  {
    id: "note",
    slot: "face",
    rarity: 1,
    x: 58,
    y: 30,
    w: 20,
    art: `<path d="M38 22 L38 60" stroke="#5aa9e6" stroke-width="6" stroke-linecap="round"/>
<ellipse cx="30" cy="62" rx="10" ry="8" fill="#5aa9e6"/>
<path d="M38 22 Q56 28 50 44" fill="none" stroke="#5aa9e6" stroke-width="6" stroke-linecap="round"/>`
  },
  {
    id: "shades",
    slot: "face",
    rarity: 2,
    x: 33,
    y: 43,
    w: 36,
    art: `<rect x="12" y="40" width="32" height="20" rx="8" fill="#26222b"/>
<rect x="56" y="40" width="32" height="20" rx="8" fill="#26222b"/>
<path d="M44 46 H56" stroke="#26222b" stroke-width="5"/>
<path d="M16 44 L24 56" stroke="#6b6672" stroke-width="3" opacity="0.8"/>`
  },
  {
    id: "star-eyes",
    slot: "face",
    rarity: 2,
    x: 33,
    y: 43,
    w: 32,
    art: `<path d="M33 34 L37.1 44.3 L48.2 45 L39.7 52.2 L42.4 63 L33 57 L23.6 63 L26.3 52.2 L17.8 45 L28.9 44.3 Z" fill="#ffd166" stroke="#b8860b" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M67 34 L71.1 44.3 L82.2 45 L73.7 52.2 L76.4 63 L67 57 L57.6 63 L60.3 52.2 L51.8 45 L62.9 44.3 Z" fill="#ffd166" stroke="#b8860b" stroke-width="2.5" stroke-linejoin="round"/>`
  },
  {
    id: "hearts",
    slot: "face",
    rarity: 2,
    x: 33,
    y: 43,
    w: 32,
    art: `<path d="M33 64 C18 52 20 38 29 38 C32 38 33 41 33 43 C33 41 34 38 37 38 C46 38 48 52 33 64 Z" fill="#ff6b81" stroke="#b23c4d" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M67 64 C52 52 54 38 63 38 C66 38 67 41 67 43 C67 41 68 38 71 38 C80 38 82 52 67 64 Z" fill="#ff6b81" stroke="#b23c4d" stroke-width="2.5" stroke-linejoin="round"/>`
  },
  // ── accessories ───────────────────────────────────────────────
  {
    id: "scarf",
    slot: "accessory",
    rarity: 1,
    x: 51,
    y: 56,
    w: 46,
    art: `<path d="M20 40 Q50 64 80 40 L82 58 Q50 78 18 58 Z" fill="#e5484d" stroke="#8c2b2f" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M62 66 L60 94 L76 94 L72 66 Z" fill="#d33b3f" stroke="#8c2b2f" stroke-width="3.5" stroke-linejoin="round"/>`
  },
  {
    id: "bowtie",
    slot: "accessory",
    rarity: 1,
    x: 50,
    y: 58,
    w: 22,
    art: `<path d="M50 50 L24 36 Q16 50 24 64 Z" fill="#4a6cf7" stroke="#2f4bb5" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M50 50 L76 36 Q84 50 76 64 Z" fill="#4a6cf7" stroke="#2f4bb5" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="50" cy="50" r="8" fill="#7d97ff" stroke="#2f4bb5" stroke-width="3.5"/>`
  },
  {
    id: "bell",
    slot: "accessory",
    rarity: 1,
    x: 50,
    y: 60,
    w: 28,
    art: `<path d="M18 34 Q50 64 82 34" fill="none" stroke="#c9a227" stroke-width="6" stroke-linecap="round"/>
<circle cx="50" cy="54" r="12" fill="#ffd166" stroke="#a57c14" stroke-width="3.5"/>
<path d="M42 54 H58" stroke="#a57c14" stroke-width="3"/>
<circle cx="50" cy="62" r="2.5" fill="#a57c14"/>`
  },
  {
    id: "badge",
    slot: "accessory",
    rarity: 1,
    x: 28,
    y: 62,
    w: 16,
    art: `<circle cx="50" cy="50" r="26" fill="#ffd166" stroke="#a57c14" stroke-width="3.5"/>
<path d="M50 34 l4.7 10.2 11.3 1.3 -8.3 7.8 2.1 11.1 -9.8 -5.5 -9.8 5.5 2.1 -11.1 -8.3 -7.8 11.3 -1.3 Z" fill="#fff8e1" stroke="#a57c14" stroke-width="2"/>`
  },
  {
    id: "necklace",
    slot: "accessory",
    rarity: 2,
    x: 48,
    y: 62,
    w: 40,
    art: `<path d="M20 34 Q50 72 80 34" fill="none" stroke="#c8cedd" stroke-width="3.5"/>
<path d="M50 62 L58 72 L50 82 L42 72 Z" fill="#7ce0d3" stroke="#2f8a80" stroke-width="3.5" stroke-linejoin="round"/>`
  },
  {
    id: "bag",
    slot: "accessory",
    rarity: 2,
    x: 66,
    y: 64,
    w: 22,
    art: `<path d="M18 10 Q50 30 44 60" fill="none" stroke="#8b5a2b" stroke-width="5" stroke-linecap="round"/>
<rect x="30" y="54" width="48" height="38" rx="8" fill="#c98a4b" stroke="#7a4f24" stroke-width="3.5"/>
<rect x="30" y="64" width="48" height="8" fill="#a86f38"/>
<circle cx="54" cy="68" r="3" fill="#ffd166" stroke="#7a4f24" stroke-width="2"/>`
  },
  {
    id: "medal",
    slot: "accessory",
    rarity: 2,
    x: 32,
    y: 60,
    w: 18,
    art: `<path d="M38 6 L50 40 L62 6" fill="none" stroke="#e5484d" stroke-width="8"/>
<circle cx="50" cy="58" r="24" fill="#ffd166" stroke="#a57c14" stroke-width="3.5"/>
<path d="M50 44 l4 8 9 1 -6.5 6 1.5 9 -8 -4.2 -8 4.2 1.5 -9 -6.5 -6 9 -1 Z" fill="#fff8e1"/>`
  },
  {
    id: "wings",
    slot: "accessory",
    rarity: 3,
    x: 50,
    y: 50,
    w: 96,
    layer: "back",
    art: `<path d="M28 54 Q4 44 4 18 Q24 26 34 44 Z" fill="#f4f7ff" stroke="#93a6c8" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M72 54 Q96 44 96 18 Q76 26 66 44 Z" fill="#f4f7ff" stroke="#93a6c8" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M14 34 Q22 40 26 48 M86 34 Q78 40 74 48" stroke="#93a6c8" stroke-width="2.5" fill="none"/>`
  }
];
var FUR_COLORS = [
  { id: "original", filter: "", swatch: "#f7f2ec" },
  { id: "cream", filter: "sepia(0.3) saturate(1.4) brightness(1.06)", swatch: "#f5e3c0" },
  { id: "ginger", filter: "sepia(0.6) saturate(2.8) hue-rotate(-16deg) brightness(0.98)", swatch: "#e8935a" },
  { id: "cocoa", filter: "sepia(0.75) saturate(2.2) hue-rotate(-30deg) brightness(0.8)", swatch: "#8a5a3b" },
  { id: "ash", filter: "grayscale(0.92) brightness(1.06)", swatch: "#c3c6cf" },
  { id: "night", filter: "grayscale(1) brightness(0.52) contrast(1.15)", swatch: "#4a4d57" },
  { id: "rose", filter: "sepia(0.45) saturate(3) hue-rotate(295deg)", swatch: "#f2a7c3" },
  { id: "sky", filter: "sepia(0.45) saturate(2.6) hue-rotate(170deg)", swatch: "#93c9e8" },
  { id: "mint", filter: "sepia(0.45) saturate(2.2) hue-rotate(115deg)", swatch: "#9fd8b6" },
  { id: "lilac", filter: "sepia(0.45) saturate(2.5) hue-rotate(230deg)", swatch: "#c0a9e6" }
];
var WARDROBE_FILTERS = ["all", "owned", "equipped"];
var WARDROBE_DEFAULTS = {
  equipped: { hat: null, face: null, accessory: null },
  fur: "original",
  owned: { beanie: 1, blush: 1, scarf: 1 },
  claimed: 0,
  filter: "all"
};
var itemMap = new Map(COSMETIC_ITEMS.map((item) => [item.id, item]));
function itemById(id) {
  return itemMap.get(id);
}
var asRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
function sanitizeWardrobe(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, error: "wardrobe must be an object" };
  }
  const input = asRecord(value);
  const ownedIn = asRecord(input.owned);
  const owned = {};
  for (const [id, raw] of Object.entries(ownedIn)) {
    if (itemById(id) === void 0) continue;
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const count = Math.min(999, Math.max(0, Math.round(raw)));
    if (count > 0) owned[id] = count;
  }
  const equippedIn = asRecord(input.equipped);
  const equipped = { hat: null, face: null, accessory: null };
  for (const slot of COSMETIC_SLOTS) {
    const candidate = equippedIn[slot];
    if (typeof candidate !== "string") continue;
    const item = itemById(candidate);
    if (item !== void 0 && item.slot === slot && (owned[item.id] ?? 0) > 0) {
      equipped[slot] = item.id;
    }
  }
  const fur = typeof input.fur === "string" && FUR_COLORS.some((color) => color.id === input.fur) ? input.fur : WARDROBE_DEFAULTS.fur;
  const claimed = typeof input.claimed === "number" && Number.isFinite(input.claimed) ? Math.min(1e9, Math.max(0, Math.round(input.claimed))) : WARDROBE_DEFAULTS.claimed;
  const filter = WARDROBE_FILTERS.includes(String(input.filter)) ? input.filter : WARDROBE_DEFAULTS.filter;
  return { ok: true, value: { equipped, fur, owned, claimed, filter } };
}

// src/shared/widgets.ts
var WIDGET_TYPES = ["clock", "counter", "focus", "steam"];
var WIDGET_SIZES = ["sm", "md"];
var WIDGET_LIMIT = 12;
var WIDGET_CONFIG_DEFAULTS = {
  clock: { hour12: false, seconds: true, showDate: true },
  counter: { source: "total" },
  focus: { minutes: 25, chime: true },
  steam: { limit: 4, showPlaytime: true }
};
var ID_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
var MAX_COORD = 2e4;
var clampNumber = (value, fallback, min, max) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
};
var boolOr = (value, fallback) => typeof value === "boolean" ? value : fallback;
var asRecord2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
function sanitizeWidgetConfig(type, raw) {
  const input = asRecord2(raw);
  switch (type) {
    case "clock": {
      const defaults = WIDGET_CONFIG_DEFAULTS.clock;
      return {
        hour12: boolOr(input.hour12, defaults.hour12),
        seconds: boolOr(input.seconds, defaults.seconds),
        showDate: boolOr(input.showDate, defaults.showDate)
      };
    }
    case "counter": {
      const defaults = WIDGET_CONFIG_DEFAULTS.counter;
      return { source: input.source === "session" ? "session" : defaults.source };
    }
    case "focus": {
      const defaults = WIDGET_CONFIG_DEFAULTS.focus;
      return {
        minutes: Math.round(clampNumber(input.minutes, defaults.minutes, 1, 120)),
        chime: boolOr(input.chime, defaults.chime)
      };
    }
    case "steam": {
      const defaults = WIDGET_CONFIG_DEFAULTS.steam;
      return {
        limit: Math.round(clampNumber(input.limit, defaults.limit, 1, 8)),
        showPlaytime: boolOr(input.showPlaytime, defaults.showPlaytime)
      };
    }
  }
}
function sanitizeWidgets(value) {
  if (!Array.isArray(value)) return { ok: false, error: "widgets must be an array" };
  if (value.length > WIDGET_LIMIT) return { ok: false, error: `widgets supports at most ${WIDGET_LIMIT} instances` };
  const seen = /* @__PURE__ */ new Set();
  const clean = [];
  for (const [index, entry] of value.entries()) {
    const item = asRecord2(entry);
    const id = item.id;
    if (typeof id !== "string" || !ID_PATTERN.test(id)) {
      return { ok: false, error: `widgets[${index}].id must match ${ID_PATTERN}` };
    }
    if (seen.has(id)) return { ok: false, error: `widgets[${index}].id ${JSON.stringify(id)} is duplicated` };
    seen.add(id);
    const type = item.type;
    if (typeof type !== "string" || !WIDGET_TYPES.includes(type)) {
      return { ok: false, error: `widgets[${index}].type must be one of ${WIDGET_TYPES.join(", ")}` };
    }
    if (typeof item.enabled !== "boolean") return { ok: false, error: `widgets[${index}].enabled must be a boolean` };
    const size = item.size;
    if (typeof size !== "string" || !WIDGET_SIZES.includes(size)) {
      return { ok: false, error: `widgets[${index}].size must be one of ${WIDGET_SIZES.join(", ")}` };
    }
    const x = item.x;
    const y = item.y;
    if (typeof x !== "number" || !Number.isFinite(x) || Math.abs(x) > MAX_COORD) {
      return { ok: false, error: `widgets[${index}].x must be a finite number` };
    }
    if (typeof y !== "number" || !Number.isFinite(y) || Math.abs(y) > MAX_COORD) {
      return { ok: false, error: `widgets[${index}].y must be a finite number` };
    }
    if (typeof item.opacity !== "number" || !Number.isFinite(item.opacity) || item.opacity < 0.4 || item.opacity > 1) {
      return { ok: false, error: `widgets[${index}].opacity must be a number in [0.4, 1]` };
    }
    const config = sanitizeWidgetConfig(type, item.config);
    clean.push({
      id,
      type,
      enabled: item.enabled,
      x: Math.round(x),
      y: Math.round(y),
      size,
      opacity: Math.round(item.opacity * 100) / 100,
      config
    });
  }
  return { ok: true, value: clean };
}

// src/shared/settings-contract.ts
var POSITIONS = ["bottom-right", "bottom-left", "top-left", "top-right"];
var SETTINGS_FIELDS = {
  /** Master switch; the browser half renders nothing while false. */
  enabled: { kind: "boolean", default: true },
  /** Selected original Steam skin (sprite prefix, e.g. "Cat", "Black"). */
  skin: { kind: "string", default: "Cat" },
  /** Server-side revision of the imported custom skin image; 0 = none. */
  customSkinRevision: { kind: "natural", default: 0, max: 1e9 },
  /** Frame count of the imported sprite-strip skin (horizontal strip). */
  customSkinFrames: { kind: "natural", default: 4, min: 2, max: 12 },
  /** Cat scale multiplier. */
  size: { kind: "number", default: 1.2, min: 0.5, max: 3 },
  /** Anchor corner of the floating cat. */
  position: { kind: "position", default: "bottom-right" },
  /** Distance in px from the anchored corner. */
  offsetX: { kind: "natural", default: 28, max: 4e3 },
  offsetY: { kind: "natural", default: 28, max: 4e3 },
  /** Animation speed multiplier. */
  speed: { kind: "number", default: 1, min: 0.5, max: 2.5 },
  /** Synthesized (or imported) tap sound on/off. */
  soundEnabled: { kind: "boolean", default: true },
  /** Sound volume, 0..1. */
  volume: { kind: "number", default: 0.6, min: 0, max: 1 },
  /** Server-side revision of the imported custom sound; 0 = none. */
  customSoundRevision: { kind: "natural", default: 0, max: 1e9 },
  /** Show the tap counter badge. */
  showCounter: { kind: "boolean", default: true },
  /** Total taps, persisted here and bumped through stats/bump. */
  counter: { kind: "natural", default: 0, writable: false },
  /** One-shot first-run hint already shown. */
  hintSeen: { kind: "boolean", default: false },
  /**
   * Desktop widgets (clock / counter / focus / Steam launcher), each an
   * independent instance with its own seat, size and config. Empty by default:
   * the cat alone is the plugin's original behaviour, widgets are opt-in.
   */
  widgets: { kind: "widgets", default: [] },
  /**
   * The cat's wardrobe: worn stickers per slot, fur colour, drop ledger and
   * the grid filter. Default is the untouched cat plus a three-piece starter
   * kit, so the feature can be tried without grinding for drops.
   */
  wardrobe: { kind: "cosmetics", default: WARDROBE_DEFAULTS }
};
var WRITABLE_FIELDS = Object.entries(SETTINGS_FIELDS).filter(([, meta]) => meta.writable !== false).map(([key]) => key);
var SETTINGS_DEFAULTS = Object.fromEntries(
  Object.entries(SETTINGS_FIELDS).map(([key, meta]) => [
    key,
    typeof meta.default === "object" && meta.default !== null ? JSON.parse(JSON.stringify(meta.default)) : meta.default
  ])
);
function sanitizeSettingsPatch(patch) {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return { ok: false, error: "patch must be an object" };
  }
  const input = patch;
  const clean = {};
  for (const key of Object.keys(input)) {
    const meta = SETTINGS_FIELDS[key];
    if (meta === void 0 || meta.writable === false) {
      return { ok: false, error: `field ${JSON.stringify(key)} is not writable` };
    }
    const value = input[key];
    const fail = (message) => ({ ok: false, error: message });
    switch (meta.kind) {
      case "boolean":
        if (typeof value !== "boolean") return fail(`${key} must be a boolean`);
        clean[key] = value;
        break;
      case "string":
        if (typeof value !== "string" || !/^[A-Za-z0-9.]{1,64}$/.test(value)) {
          return fail(`${key} must match /^[A-Za-z0-9.]{1,64}$/`);
        }
        clean[key] = value;
        break;
      case "natural": {
        const min = meta.min ?? 0;
        const max = meta.max ?? Number.MAX_SAFE_INTEGER;
        if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
          return fail(`${key} must be an integer in [${min}, ${max}]`);
        }
        clean[key] = value;
        break;
      }
      case "number": {
        const min = meta.min ?? -Number.MAX_VALUE;
        const max = meta.max ?? Number.MAX_VALUE;
        if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
          return fail(`${key} must be a number in [${min}, ${max}]`);
        }
        clean[key] = Math.round(value * 100) / 100;
        break;
      }
      case "position":
        if (typeof value !== "string" || !POSITIONS.includes(value)) {
          return fail(`${key} must be one of ${POSITIONS.join(", ")}`);
        }
        clean[key] = value;
        break;
      case "enum": {
        const values = meta.values ?? [];
        if (typeof value !== "string" || !values.includes(value)) {
          return fail(`${key} must be one of ${values.join(", ")}`);
        }
        clean[key] = value;
        break;
      }
      case "widgets": {
        const result = sanitizeWidgets(value);
        if (!result.ok) return fail(`${key}: ${result.error}`);
        clean[key] = result.value;
        break;
      }
      case "cosmetics": {
        const result = sanitizeWardrobe(value);
        if (!result.ok) return fail(`${key}: ${result.error}`);
        clean[key] = result.value;
        break;
      }
    }
  }
  return { ok: true, value: clean };
}

// src/index.ts
var name = "bongo-cat";
var BONGO_CAT_APPID = "1337970";
var CHANNEL = "/bongo-cat";
var LOOPBACK_ONLY_ENDPOINTS = /* @__PURE__ */ new Set([
  "skins/import",
  "skins/remove",
  "sounds/import",
  "sounds/remove",
  "native/import",
  "native/remove",
  // Launching a game starts a process on this machine; remote pages must not.
  "steam/launch"
]);
function isLoopbackAddress(address) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}
var ENDPOINT_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
var MAX_RPC_BODY_BYTES = 24e6;
var MAX_IMPORT_BYTES = 8e6;
var MAX_SOUND_BYTES = 2e6;
var MAX_SCAN_FILES_PER_ROOT = 300;
var SCAN_DEPTH = 3;
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]);
var IMAGE_CONTENT_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp"
};
var SOUND_CONTENT_TYPES = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg"
};
function endpointOf(pathname) {
  if (!pathname.startsWith(`${CHANNEL}/`)) return void 0;
  const endpoint = pathname.slice(CHANNEL.length + 1);
  if (endpoint.split("/").some((segment) => segment === "" || segment === "." || segment === ".." || !ENDPOINT_SEGMENT_PATTERN.test(segment))) return void 0;
  return endpoint;
}
function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    req.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_RPC_BODY_BYTES) {
        settled = true;
        rejectBody(Object.assign(new Error("request body is too large"), { code: "body-too-large" }));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!settled) resolveBody(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (error) => {
      if (!settled) rejectBody(error);
    });
  });
}
function respond(res, rpcId, result) {
  const text = JSON.stringify({ type: "server-response", rpcId, result });
  res.writeHead(200, { "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(text)) });
  res.end(text);
}
function assetSize(res, file) {
  let stat;
  try {
    stat = statSync(file);
  } catch {
    stat = void 0;
  }
  if (stat === void 0 || !stat.isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
    return void 0;
  }
  return stat.size;
}
function pipeFile(res, file) {
  const stream = createReadStream(file);
  stream.on("error", () => {
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("asset read failed");
  });
  stream.pipe(res);
}
async function serveRpc(req, res, dispatch) {
  let pathname;
  try {
    pathname = new URL(req.url ?? "/", "http://bongo-cat.local").pathname;
  } catch {
    pathname = "";
  }
  const endpoint = endpointOf(pathname);
  if (req.method !== "POST" || endpoint === void 0) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
    return;
  }
  const contentType = String(req.headers["content-type"] ?? "").split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    res.writeHead(415, { "Content-Type": "text/plain" });
    res.end("content type must be application/json");
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(await readBody(req));
  } catch (error) {
    if (error.code === "body-too-large") {
      req.resume();
      res.writeHead(413, { "Content-Type": "text/plain", Connection: "close" });
      res.end("request body is too large");
      return;
    }
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("body is not JSON");
    return;
  }
  const message = typeof parsed === "object" && parsed !== null ? parsed : {};
  const rpcId = typeof message.rpcId === "string" ? message.rpcId : "invalid-request";
  if (message.type !== "client-request" || typeof message.rpcId !== "string" || typeof message.method !== "string") {
    respond(res, rpcId, failBadRequest("invalid client-request message"));
    return;
  }
  if (message.method !== endpoint) {
    respond(res, rpcId, failBadRequest(`method ${JSON.stringify(message.method)} does not match endpoint ${JSON.stringify(endpoint)}`));
    return;
  }
  if (LOOPBACK_ONLY_ENDPOINTS.has(endpoint) && !isLoopbackAddress(req.socket.remoteAddress)) {
    respond(res, rpcId, failForbidden(`endpoint "${endpoint}" is available from this machine only`));
    return;
  }
  const controller = new AbortController();
  const onAborted = () => controller.abort();
  req.on("aborted", onAborted);
  try {
    respond(res, rpcId, await dispatch(endpoint, message.payload, controller.signal));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`handler failure: ${String(error)}`);
  } finally {
    req.off("aborted", onAborted);
  }
}
function ok(value) {
  return { ok: true, value };
}
function failBadRequest(message) {
  return { ok: false, error: { code: "bad-request", message, details: { issues: [] } } };
}
function failInternal(message) {
  return { ok: false, error: { code: "internal", message, details: {} } };
}
function failForbidden(message) {
  return { ok: false, error: { code: "forbidden", message, details: {} } };
}
function dataDir() {
  const env = process.env.DSH_HOME?.trim();
  const home = env ? resolve(env) : join(homedir(), ".dsh");
  return join(home, "storages", "bongo-cat");
}
function steamRootCandidates() {
  const roots = [];
  if (process.platform === "win32") {
    try {
      const out = execFileSync("reg", ["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"], {
        encoding: "utf8",
        timeout: 4e3,
        windowsHide: true
      });
      const match = out.match(/SteamPath\s+REG_SZ\s+(.+)/i);
      if (match) roots.push(match[1].trim().replace(/\//g, "\\"));
    } catch {
    }
  }
  roots.push(
    "C:\\Program Files (x86)\\Steam",
    "C:\\Program Files\\Steam",
    "D:\\Steam",
    "D:\\SteamLibrary",
    "E:\\Steam",
    join(homedir(), ".steam", "steam")
  );
  return [...new Set(roots.filter((root) => existsSync(root)))];
}
function steamLibraries(steam) {
  const libraries = [join(steam, "steamapps")];
  try {
    const text = readFileSync(join(steam, "steamapps", "libraryfolders.vdf"), "utf8");
    for (const match of text.matchAll(/"path"\s+"([^"]+)"/g)) {
      libraries.push(join(match[1].replace(/\\\\/g, "\\"), "steamapps"));
    }
  } catch {
  }
  return [...new Set(libraries.filter((lib) => existsSync(lib)))];
}
var STEAM_RUNTIME_APPID = 228980;
function steamLibrary() {
  const games = [];
  const seen = /* @__PURE__ */ new Set();
  let foundLibrary = false;
  const readString = (text, key) => {
    const match = new RegExp(`"${key}"\\s+"([^"]*)"`).exec(text);
    return match === null ? "" : match[1];
  };
  for (const steam of steamRootCandidates()) {
    for (const library of steamLibraries(steam)) {
      foundLibrary = true;
      let entries;
      try {
        entries = readdirSync(library, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.startsWith("appmanifest_") || !entry.name.endsWith(".acf")) continue;
        let text;
        try {
          text = readFileSync(join(library, entry.name), "utf8");
        } catch {
          continue;
        }
        const appid = Number(readString(text, "appid"));
        const name2 = readString(text, "name");
        if (!Number.isInteger(appid) || appid <= 0 || appid === STEAM_RUNTIME_APPID) continue;
        if (name2.length === 0 || seen.has(appid)) continue;
        seen.add(appid);
        const playtime = Number(readString(text, "playtime_forever"));
        const lastPlayed = Number(readString(text, "LastPlayed"));
        games.push({
          appid,
          name: name2,
          playtimeMinutes: Number.isFinite(playtime) && playtime > 0 ? Math.round(playtime) : 0,
          lastPlayed: Number.isFinite(lastPlayed) && lastPlayed > 0 ? Math.round(lastPlayed) : 0
        });
      }
    }
  }
  games.sort((a, b) => b.lastPlayed - a.lastPlayed || a.name.localeCompare(b.name));
  return { games, source: foundLibrary ? "steam" : "none" };
}
function collectImages(root, depth = 0) {
  const files = [];
  const walk = (dir, level) => {
    if (files.length >= MAX_SCAN_FILES_PER_ROOT || level > SCAN_DEPTH) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= MAX_SCAN_FILES_PER_ROOT) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, level + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;
      try {
        const size = statSync(full).size;
        if (size > MAX_IMPORT_BYTES) continue;
        files.push({ name: entry.name, path: full, size });
      } catch {
      }
    }
  };
  walk(root, 0);
  return files.sort((a, b) => a.name.localeCompare(b.name));
}
function scanBongoCat() {
  const roots = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (label, path) => {
    if (seen.has(path) || !existsSync(path)) return;
    seen.add(path);
    roots.push({ label, path, files: collectImages(path) });
  };
  for (const steam of steamRootCandidates()) {
    for (const library of steamLibraries(steam)) {
      const common = join(library, "common");
      if (existsSync(common)) {
        let entries;
        try {
          entries = readdirSync(common, { withFileTypes: true });
        } catch {
          entries = [];
        }
        for (const entry of entries) {
          if (entry.isDirectory() && /bongo\s*cat/i.test(entry.name)) {
            push(`Steam \u6E38\u620F\u76EE\u5F55 \xB7 ${entry.name}`, join(common, entry.name));
          }
        }
      }
      push("Steam \u521B\u610F\u5DE5\u574A \xB7 1337970", join(library, "workshop", "content", BONGO_CAT_APPID));
    }
  }
  const appData = process.env.APPDATA?.trim();
  if (appData) {
    push("\u7528\u6237\u6570\u636E \xB7 %APPDATA%\\BongoCat", join(appData, "BongoCat"));
    push("\u7528\u6237\u6570\u636E \xB7 %APPDATA%\\BongoCat\\skins", join(appData, "BongoCat", "skins"));
  }
  return roots;
}
function isInsideScannedRoot(path) {
  const target = resolve(path);
  return scanBongoCat().some((root) => {
    const base = resolve(root.path);
    return target === base || target.startsWith(base + "\\") || target.startsWith(base + "/");
  });
}
function apply(ctx) {
  const dir = dataDir();
  const skinsDir = join(dir, "skins");
  const soundsDir = join(dir, "sounds");
  const nativeDir = join(dir, "native");
  const skinMetaPath = join(skinsDir, "skin.json");
  const soundMetaPath = join(soundsDir, "sound.json");
  mkdirSync(skinsDir, { recursive: true });
  mkdirSync(soundsDir, { recursive: true });
  const NATIVE_FRAMES = ["idle", "tap-left", "tap-right"];
  const NATIVE_CONTENT_TYPES = { ".png": "image/png" };
  const extractorPath = fileURLToPath(new URL("../tools/extract-native.py", import.meta.url));
  let nativeImporting = false;
  const readNativeMeta = () => {
    const meta = readJson(join(nativeDir, "native.json"));
    const missing = NATIVE_FRAMES.filter((frame) => !existsSync(join(nativeDir, `${frame}.png`)));
    if (meta === null || missing.length > 0) {
      return { available: false, ...missing.length > 0 ? { missing: missing.join(", ") } : {} };
    }
    return {
      available: true,
      skin: typeof meta.skin === "string" ? meta.skin : void 0,
      size: Array.isArray(meta.size) ? meta.size : void 0,
      extractedAt: typeof meta.extractedAt === "string" ? meta.extractedAt : void 0,
      gameDir: typeof meta.gameDir === "string" ? meta.gameDir : void 0
    };
  };
  const runCommand = (command, args, timeoutMs) => {
    return new Promise((resolveRun) => {
      let child;
      try {
        child = spawn(command, args, { windowsHide: true });
      } catch (error) {
        resolveRun({ status: -1, out: String(error) });
        return;
      }
      let out = "";
      const timer = setTimeout(() => {
        child.kill();
      }, timeoutMs);
      child.stdout?.on("data", (chunk) => {
        out += chunk.toString("utf8");
      });
      child.stderr?.on("data", (chunk) => {
        out += chunk.toString("utf8");
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        resolveRun({ status: -1, out: String(error) });
      });
      child.on("close", (status) => {
        clearTimeout(timer);
        resolveRun({ status, out });
      });
    });
  };
  const VENV_DIR = join(dir, "pyenv");
  const venvPython = process.platform === "win32" ? join(VENV_DIR, "Scripts", "python.exe") : join(VENV_DIR, "bin", "python");
  const pythonCandidates = () => {
    const list = [];
    if (process.env.DSH_BC_PYTHON) list.push({ cmd: process.env.DSH_BC_PYTHON, prefix: [] });
    list.push({ cmd: "python", prefix: [] }, { cmd: "python3", prefix: [] }, { cmd: "py", prefix: ["-3"] });
    const globDirs = (root, pattern) => {
      if (!root) return;
      try {
        for (const entry of readdirSync(root)) {
          if (!pattern.test(entry)) continue;
          const candidate = join(root, entry, process.platform === "win32" ? "python.exe" : "bin/python3");
          if (existsSync(candidate)) list.push({ cmd: candidate, prefix: [] });
        }
      } catch {
      }
    };
    globDirs(process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Programs", "Python") : void 0, /^Python3/i);
    globDirs(process.env.PROGRAMFILES ? join(process.env.PROGRAMFILES) : void 0, /^Python3/i);
    globDirs(join(homedir(), ".workbuddy", "binaries", "python", "versions"), /^\d+\.\d+\.\d+$/i);
    return list;
  };
  const probeUnityPy = async (cmd, prefix) => {
    const result = await runCommand(cmd, [...prefix, "-c", 'import UnityPy, PIL; print("ok")'], 2e4);
    return result.status === 0 && result.out.includes("ok");
  };
  const discardVenv = () => {
    try {
      rmSync(VENV_DIR, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  };
  const resolvePython = async () => {
    if (existsSync(venvPython)) {
      if (await probeUnityPy(venvPython, [])) return { python: venvPython };
      if (!discardVenv()) {
        return { error: `\u63D2\u4EF6\u79C1\u6709 Python \u73AF\u5883\u5DF2\u635F\u574F\uFF0C\u4E14\u65E0\u6CD5\u81EA\u52A8\u6E05\u7406\uFF08${VENV_DIR}\uFF09\u3002\u8BF7\u624B\u52A8\u5220\u9664\u8BE5\u76EE\u5F55\u540E\u91CD\u8BD5\u3002` };
      }
    }
    for (const { cmd, prefix } of pythonCandidates()) {
      if (await probeUnityPy(cmd, prefix)) return { python: cmd };
    }
    for (const { cmd, prefix } of pythonCandidates()) {
      const version = await runCommand(cmd, [...prefix, "-c", "import sys; print(sys.version_info[0])"], 2e4);
      if (version.status !== 0 || !version.out.includes("3")) continue;
      const created = await runCommand(cmd, [...prefix, "-m", "venv", VENV_DIR], 18e4);
      if (created.status !== 0 || !existsSync(venvPython)) continue;
      const pip = await runCommand(venvPython, ["-m", "pip", "install", "--disable-pip-version-check", "-q", "UnityPy"], 42e4);
      if (pip.status === 0 && await probeUnityPy(venvPython, [])) return { python: venvPython };
      discardVenv();
      return { error: `\u5B89\u88C5 UnityPy \u5931\u8D25\uFF1A${pip.out.slice(-500) || `exit ${pip.status}`}` };
    }
    return { error: "\u672A\u627E\u5230 Python 3.10+\u3002\u8BF7\u5B89\u88C5 Python\uFF08\u52FE\u9009 Add to PATH\uFF09\u540E\u91CD\u8BD5\uFF0C\u6216\u7528 DSH_BC_PYTHON \u6307\u5B9A\u89E3\u91CA\u5668\u3002" };
  };
  const readJson = (path) => {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return null;
    }
  };
  const readSkinMeta = () => {
    const meta = readJson(skinMetaPath);
    if (typeof meta?.revision !== "number" || !Number.isInteger(meta.revision)) return null;
    return meta;
  };
  const readSoundMeta = () => {
    const meta = readJson(soundMetaPath);
    if (typeof meta?.revision !== "number" || !Number.isInteger(meta.revision)) return null;
    return meta;
  };
  const settingsPath = join(dir, "settings.json");
  let settingsCache = null;
  let writeChain = Promise.resolve();
  const loadSettings = () => {
    let stored = {};
    try {
      const raw = JSON.parse(readFileSync(settingsPath, "utf8"));
      if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) stored = raw;
    } catch {
    }
    const next = { ...SETTINGS_DEFAULTS };
    for (const [key, value] of Object.entries(stored)) {
      const fallback = SETTINGS_DEFAULTS[key];
      if (fallback === void 0 || typeof value !== typeof fallback) continue;
      if (typeof value === "number" && !Number.isFinite(value)) continue;
      next[key] = value;
    }
    const catalog = readJson(join(dir, "native", "skins.json"));
    const known = (catalog?.skins ?? []).map((item) => item.name).filter((name2) => typeof name2 === "string");
    if (known.length > 0 && !known.includes(next.skin)) {
      next.skin = SETTINGS_DEFAULTS.skin;
    }
    return next;
  };
  const persistSettings = (next) => {
    settingsCache = next;
    const payload = JSON.stringify(next, null, 2);
    writeChain = writeChain.then(() => {
      const tmp = settingsPath + ".tmp";
      writeFileSync(tmp, payload, "utf8");
      renameSync(tmp, settingsPath);
    }).catch(() => void 0);
    return writeChain;
  };
  const scope = {
    get: () => {
      if (settingsCache === null) settingsCache = loadSettings();
      return settingsCache;
    },
    update: async (patch) => {
      await persistSettings({ ...scope.get(), ...patch });
    }
  };
  const importAsset = (kind, sourcePath, base64, name2) => {
    const assetDir = kind === "skin" ? skinsDir : soundsDir;
    const metaPath = kind === "skin" ? skinMetaPath : soundMetaPath;
    const maxBytes = kind === "skin" ? MAX_IMPORT_BYTES : MAX_SOUND_BYTES;
    const allowed = kind === "skin" ? IMAGE_EXTENSIONS : new Set(Object.keys(SOUND_CONTENT_TYPES));
    let buffer;
    let ext;
    let source;
    if (sourcePath !== null) {
      if (!isInsideScannedRoot(sourcePath)) return "path is outside the scanned Bongo Cat roots";
      ext = extname(sourcePath).toLowerCase();
      if (!allowed.has(ext)) return `unsupported ${kind} extension: ${ext}`;
      try {
        if (!statSync(sourcePath).isFile()) return "path is not a file";
        buffer = readFileSync(sourcePath);
      } catch (error) {
        return `cannot read file: ${String(error)}`;
      }
      source = sourcePath;
    } else {
      if (typeof base64 !== "string" || base64.length === 0 || base64.length > maxBytes * 2) return `data must be a non-empty base64 string under ${maxBytes} bytes`;
      buffer = Buffer.from(base64, "base64");
      ext = extname(name2 || "").toLowerCase();
      if (!allowed.has(ext)) ext = kind === "skin" ? ".png" : ".wav";
    }
    if (buffer.length === 0 || buffer.length > maxBytes) return `${kind} is empty or over ${maxBytes} bytes`;
    if (basename(name2 || "").length > 120) return "name is too long";
    const previous = kind === "skin" ? readSkinMeta() : readSoundMeta();
    const revision = (previous?.revision ?? 0) + 1;
    const target = join(assetDir, `${kind}-${revision}${ext}`);
    const meta = { revision, name: basename(name2 || `${kind}-${revision}${ext}`), source, ext, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    try {
      writeFileSync(target + ".tmp", buffer);
      renameSync(target + ".tmp", target);
    } catch (error) {
      rmSync(target + ".tmp", { force: true });
      return failText(error);
    }
    try {
      writeFileSync(metaPath + ".tmp", JSON.stringify(meta));
      renameSync(metaPath + ".tmp", metaPath);
    } catch (error) {
      rmSync(metaPath + ".tmp", { force: true });
      rmSync(target, { force: true });
      return failText(error);
    }
    return meta;
  };
  const failText = (error) => `write failed: ${String(error)}`;
  const removeAsset = (kind) => {
    const meta = kind === "skin" ? readSkinMeta() : readSoundMeta();
    const assetDir = kind === "skin" ? skinsDir : soundsDir;
    if (meta) rmSync(join(assetDir, `${kind}-${meta.revision}${meta.ext}`), { force: true });
    rmSync(kind === "skin" ? skinMetaPath : soundMetaPath, { force: true });
  };
  const dispatch = async (endpoint, payload, signal) => {
    if (signal?.aborted) return failInternal("aborted");
    switch (endpoint) {
      case "config/get": {
        return ok(scope.get());
      }
      case "config/set": {
        if (typeof payload !== "object" || payload === null) return failBadRequest("payload must be an object");
        const { patch } = payload;
        const sanitized = sanitizeSettingsPatch(patch);
        if (!sanitized.ok) return failBadRequest(sanitized.error);
        try {
          await scope.update(sanitized.value);
          return ok(scope.get());
        } catch (error) {
          return failBadRequest(String(error));
        }
      }
      case "stats/bump": {
        if (typeof payload !== "object" || payload === null) return failBadRequest("payload must be an object");
        const { count } = payload;
        if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 1e4) {
          return failBadRequest("count must be an integer in [1, 10000]");
        }
        try {
          const next = (scope.get().counter ?? 0) + count;
          await scope.update({ counter: next });
          return ok({ counter: next });
        } catch (error) {
          return failInternal(String(error));
        }
      }
      case "stats/reset": {
        try {
          await scope.update({ counter: 0 });
          return ok({ counter: 0 });
        } catch (error) {
          return failInternal(String(error));
        }
      }
      case "skins/scan": {
        try {
          return ok({ roots: scanBongoCat() });
        } catch (error) {
          return failInternal(String(error));
        }
      }
      case "skins/import": {
        if (typeof payload !== "object" || payload === null) return failBadRequest("payload must be an object");
        const { path: filePath, data, name: name2 } = payload;
        if (typeof filePath !== "string" && typeof data !== "string") return failBadRequest("either path or data is required");
        if (typeof name2 !== "string" || name2.length === 0) return failBadRequest("name is required");
        const meta = importAsset("skin", typeof filePath === "string" ? filePath : null, typeof data === "string" ? data : null, name2);
        if (typeof meta === "string") return failBadRequest(meta);
        try {
          await scope.update({ customSkinRevision: meta.revision });
          return ok({ revision: meta.revision, name: meta.name, ext: meta.ext });
        } catch (error) {
          return failInternal(String(error));
        }
      }
      case "skins/remove": {
        try {
          removeAsset("skin");
          await scope.update({ customSkinRevision: 0 });
          return ok({ removed: true });
        } catch (error) {
          return failInternal(String(error));
        }
      }
      case "sounds/import": {
        if (typeof payload !== "object" || payload === null) return failBadRequest("payload must be an object");
        const { data, name: name2 } = payload;
        if (typeof data !== "string") return failBadRequest("data (base64) is required");
        if (typeof name2 !== "string" || name2.length === 0) return failBadRequest("name is required");
        const meta = importAsset("sound", null, data, name2);
        if (typeof meta === "string") return failBadRequest(meta);
        try {
          await scope.update({ customSoundRevision: meta.revision });
          return ok({ revision: meta.revision, name: meta.name, ext: meta.ext });
        } catch (error) {
          return failInternal(String(error));
        }
      }
      case "sounds/remove": {
        try {
          removeAsset("sound");
          await scope.update({ customSoundRevision: 0 });
          return ok({ removed: true });
        } catch (error) {
          return failInternal(String(error));
        }
      }
      case "native/status": {
        return ok(readNativeMeta());
      }
      case "native/catalog": {
        const catalog = readJson(join(nativeDir, "skins.json"));
        const skins = (catalog?.skins ?? []).map((entry) => typeof entry?.name === "string" ? entry.name : "").filter((name2) => name2.length > 0);
        return ok({
          skins,
          current: scope.get().skin,
          stamp: readNativeMeta().extractedAt ?? "",
          available: readNativeMeta().available
        });
      }
      case "native/import": {
        if (!existsSync(extractorPath)) {
          return failInternal(`extractor not found at ${extractorPath}`);
        }
        if (nativeImporting) return failBadRequest("extraction already running, try again when it finishes");
        nativeImporting = true;
        try {
          const python = await resolvePython();
          if ("error" in python) {
            return failBadRequest(python.error);
          }
          const requested = typeof payload === "object" && payload !== null ? payload.skin : void 0;
          const skin = typeof requested === "string" && /^[A-Za-z0-9.]{1,64}$/.test(requested) ? requested : null;
          const args = [extractorPath, "--out", nativeDir];
          if (skin !== null) args.push("--skin", skin);
          const result = await runCommand(python.python, args, 3e5);
          if (result.status !== 0) {
            return failBadRequest(`\u63D0\u53D6\u5931\u8D25\uFF1A${result.out.slice(-600) || `exit ${result.status}`}`);
          }
          if (!existsSync(join(nativeDir, "skins.json"))) {
            await runCommand(python.python, [extractorPath, "--catalog", "--out", nativeDir], 3e5);
          }
          if (skin !== null) await scope.update({ skin });
          const meta = readNativeMeta();
          if (!meta.available) return failInternal("\u63D0\u53D6\u811A\u672C\u5DF2\u8FD0\u884C\uFF0C\u4F46\u672A\u4EA7\u51FA\u5B8C\u6574\u5E27");
          return ok(meta);
        } finally {
          nativeImporting = false;
        }
      }
      case "native/remove": {
        try {
          rmSync(nativeDir, { recursive: true, force: true });
          return ok({ removed: true });
        } catch (error) {
          return failInternal(String(error));
        }
      }
      case "steam/library": {
        try {
          return ok(steamLibrary());
        } catch (error) {
          return failInternal(String(error));
        }
      }
      case "steam/launch": {
        const appid = typeof payload === "object" && payload !== null ? payload.appid : void 0;
        if (typeof appid !== "number" || !Number.isInteger(appid) || appid <= 0 || appid > 4e9) {
          return failBadRequest("appid must be a positive integer");
        }
        const url = `steam://rungameid/${appid}`;
        try {
          if (process.platform === "win32") {
            spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
          } else if (process.platform === "darwin") {
            spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
          } else {
            spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
          }
        } catch (error) {
          return failInternal(`could not launch Steam: ${String(error)}`);
        }
        return ok({ launched: true });
      }
      case "info": {
        return ok({
          skin: readSkinMeta() ?? { revision: 0 },
          sound: readSoundMeta() ?? { revision: 0 },
          native: readNativeMeta()
        });
      }
      default:
        return failBadRequest('unknown bongo-cat endpoint "' + endpoint + '"');
    }
  };
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: CHANNEL,
    handler: (req, res) => {
      void serveRpc(req, res, dispatch);
    }
  }), "bongo-cat: rpc channel");
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/plugins/bongo-cat/skin",
    handler: (req, res) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("method not allowed");
        return;
      }
      let revision;
      try {
        revision = Number(new URL(req.url ?? "/", "http://bongo-cat.local").searchParams.get("v"));
      } catch {
        revision = Number.NaN;
      }
      const meta = readSkinMeta();
      const stale = meta === null || meta.revision === 0 || !Number.isInteger(revision) || revision !== meta.revision;
      const file = meta === null ? "" : join(skinsDir, `skin-${meta.revision}${meta.ext}`);
      if (stale) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
        return;
      }
      const size = assetSize(res, file);
      if (size === void 0) return;
      res.writeHead(200, {
        "Content-Type": IMAGE_CONTENT_TYPES[meta.ext] ?? "application/octet-stream",
        "Content-Length": String(size),
        "Cache-Control": "private, max-age=31536000, immutable"
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      pipeFile(res, file);
    }
  }), "bongo-cat: skin route");
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/plugins/bongo-cat/native",
    handler: (req, res) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("method not allowed");
        return;
      }
      let pathname;
      try {
        pathname = new URL(req.url ?? "/", "http://bongo-cat.local").pathname;
      } catch {
        pathname = "";
      }
      const match = /^\/plugins\/bongo-cat\/native\/([a-z-]+)\.png$/.exec(pathname);
      const iconMatch = /^\/plugins\/bongo-cat\/native\/icons\/([A-Za-z0-9.]+)\.png$/.exec(pathname);
      if (iconMatch !== null) {
        const file2 = join(nativeDir, "icons", `${iconMatch[1]}.png`);
        const iconSize = assetSize(res, file2);
        if (iconSize === void 0) return;
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": String(iconSize),
          "Cache-Control": "private, max-age=31536000, immutable"
        });
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        pipeFile(res, file2);
        return;
      }
      const frame = match === null ? "" : match[1];
      if (!NATIVE_FRAMES.includes(frame)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
        return;
      }
      const file = join(nativeDir, `${frame}.png`);
      const size = assetSize(res, file);
      if (size === void 0) return;
      res.writeHead(200, {
        "Content-Type": NATIVE_CONTENT_TYPES[".png"],
        "Content-Length": String(size),
        "Cache-Control": "private, max-age=31536000, immutable"
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      pipeFile(res, file);
    }
  }), "bongo-cat: native frame route");
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/plugins/bongo-cat/sound",
    handler: (req, res) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("method not allowed");
        return;
      }
      let revision;
      try {
        revision = Number(new URL(req.url ?? "/", "http://bongo-cat.local").searchParams.get("v"));
      } catch {
        revision = Number.NaN;
      }
      const meta = readSoundMeta();
      const stale = meta === null || meta.revision === 0 || !Number.isInteger(revision) || revision !== meta.revision;
      const file = meta === null ? "" : join(soundsDir, `sound-${meta.revision}${meta.ext}`);
      if (stale) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
        return;
      }
      const size = assetSize(res, file);
      if (size === void 0) return;
      res.writeHead(200, {
        "Content-Type": SOUND_CONTENT_TYPES[meta.ext] ?? "application/octet-stream",
        "Content-Length": String(size),
        "Cache-Control": "private, max-age=31536000, immutable"
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      pipeFile(res, file);
    }
  }), "bongo-cat: sound route");
}
var inject = ["webServer"];
export {
  apply,
  inject,
  name
};
