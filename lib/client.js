window.__ModuleLoader__.load({
  id: "dsh-plugin-bongo-cat",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/BongoCatSection.tsx
var import_react2 = require("react");

// src/shared/widgets.ts
var WIDGET_LIMIT = 12;
var WIDGET_CONFIG_DEFAULTS = {
  clock: { hour12: false, seconds: true, showDate: true },
  counter: { source: "total" },
  focus: { minutes: 25, chime: true }
};
function nextWidgetId(type, existing) {
  const used = new Set(existing.map((widget) => widget.id));
  if (!used.has(type)) return type;
  for (let index = 2; index <= WIDGET_LIMIT + 1; index += 1) {
    const candidate = `${type}-${index}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${type}-${Date.now().toString(36)}`;
}
function newWidget(type, existing, viewport) {
  const step = existing.length % 6;
  const baseX = 24 + step * 12;
  const baseY = Math.max(24, viewport.height - 150 - step * 90);
  return {
    id: nextWidgetId(type, existing),
    type,
    enabled: true,
    x: baseX,
    y: baseY,
    size: "sm",
    opacity: 1,
    config: { ...WIDGET_CONFIG_DEFAULTS[type] }
  };
}
function withWidget(list, id, patch) {
  return list.map((widget) => widget.id === id ? { ...widget, ...patch } : widget);
}
function withoutWidget(list, id) {
  return list.filter((widget) => widget.id !== id);
}

// src/client/widgets/clock.ts
var pad = (value) => String(value).padStart(2, "0");
var formatDate = (date, locale) => date.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
var formatTime = (date, config) => {
  const hours24 = date.getHours();
  const hours = config.hour12 ? (hours24 + 11) % 12 + 1 : hours24;
  const parts = [`${config.hour12 ? hours : pad(hours)}:${pad(date.getMinutes())}`];
  if (config.seconds) parts.push(`:${pad(date.getSeconds())}`);
  if (config.hour12) parts.push(hours24 < 12 ? " AM" : " PM");
  return parts.join("");
};
var clockWidget = {
  type: "clock",
  labelKey: "widgetClock",
  descriptionKey: "widgetClockDesc",
  mount(host, ctx) {
    const root = document.createElement("div");
    root.className = "bc-widget-clock";
    const time = document.createElement("div");
    time.className = "bc-widget-clock-time";
    const date = document.createElement("div");
    date.className = "bc-widget-clock-date";
    root.append(time, date);
    host.append(root);
    const locale = document.documentElement.lang || navigator.language || "zh-CN";
    let config = ctx.instance.config;
    let timer = null;
    const paint = () => {
      const now = /* @__PURE__ */ new Date();
      time.textContent = formatTime(now, config);
      date.textContent = config.showDate ? formatDate(now, locale) : "";
      date.hidden = !config.showDate;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(paint, 1e3);
    };
    const stop = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else paint();
    };
    document.addEventListener("visibilitychange", onVisibility);
    paint();
    return {
      update(instance) {
        config = instance.config;
        paint();
      },
      destroy() {
        document.removeEventListener("visibilitychange", onVisibility);
        stop();
        root.remove();
      }
    };
  }
};

// src/client/widgets/counter.ts
var counterWidget = {
  type: "counter",
  labelKey: "widgetCounter",
  descriptionKey: "widgetCounterDesc",
  mount(host, ctx) {
    const root = document.createElement("div");
    root.className = "bc-widget-counter";
    const value = document.createElement("div");
    value.className = "bc-widget-counter-value";
    const label = document.createElement("div");
    label.className = "bc-widget-counter-label";
    root.append(value, label);
    host.append(root);
    let config = ctx.instance.config;
    let session = 0;
    const format2 = (count) => count.toLocaleString();
    const paint = () => {
      const snapshot = ctx.store.getSnapshot().value;
      const total = snapshot?.lifetimeTaps ?? snapshot?.counter ?? 0;
      const count = config.source === "session" ? session : total;
      value.textContent = format2(count);
      label.textContent = config.source === "session" ? ctx.t("widgetCounterSession") : ctx.t("widgetCounterTotal");
      root.dataset.source = config.source;
    };
    const onKeyDown = (event) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Shift" || event.key === "CapsLock") return;
      session += 1;
      if (config.source === "session") paint();
    };
    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      session += 1;
      if (config.source === "session") paint();
    };
    const unsubscribe = ctx.store.subscribe(paint);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    paint();
    return {
      update(instance) {
        config = instance.config;
        paint();
      },
      destroy() {
        unsubscribe();
        document.removeEventListener("keydown", onKeyDown, true);
        document.removeEventListener("pointerdown", onPointerDown, true);
        root.remove();
      }
    };
  }
};

// src/client/widgets/chime.ts
var context = null;
var ensure = () => {
  if (context !== null) return context;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
};
function chime(volume = 0.5) {
  const ctx = ensure();
  if (ctx === null) return;
  if (ctx.state === "suspended") void ctx.resume();
  const start = ctx.currentTime;
  for (const [index, frequency] of [880, 1320].entries()) {
    const at = start + index * 0.18;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(1e-4, at);
    gain.gain.exponentialRampToValueAtTime(Math.min(0.35, Math.max(0.05, volume * 0.35)), at + 0.01);
    gain.gain.exponentialRampToValueAtTime(1e-4, at + 0.16);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.18);
  }
}

// src/client/widgets/focus.ts
var format = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1e3));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
var focusWidget = {
  type: "focus",
  labelKey: "widgetFocus",
  descriptionKey: "widgetFocusDesc",
  mount(host, ctx) {
    const root = document.createElement("div");
    root.className = "bc-widget-focus";
    const time = document.createElement("div");
    time.className = "bc-widget-focus-time";
    time.dataset.role = "focus-time";
    const bar = document.createElement("div");
    bar.className = "bc-widget-focus-bar";
    const fill = document.createElement("div");
    fill.className = "bc-widget-focus-fill";
    bar.append(fill);
    const controls = document.createElement("div");
    controls.className = "bc-widget-focus-actions";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "bc-widget-button";
    toggle.dataset.role = "focus-toggle";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "bc-widget-button bc-widget-button-ghost";
    reset.dataset.role = "focus-reset";
    reset.textContent = ctx.t("widgetFocusReset");
    controls.append(toggle, reset);
    root.append(time, bar, controls);
    host.append(root);
    let config = ctx.instance.config;
    let remaining = config.minutes * 6e4;
    let total = remaining;
    let deadline = null;
    let ticker = null;
    let rearm = null;
    const stopTicker = () => {
      if (ticker !== null) window.clearInterval(ticker);
      ticker = null;
    };
    const paint = () => {
      if (deadline !== null) remaining = Math.max(0, deadline - Date.now());
      time.textContent = format(remaining);
      const ratio = total === 0 ? 0 : Math.max(0, Math.min(1, remaining / total));
      fill.style.width = `${Math.round(ratio * 100)}%`;
      root.dataset.state = deadline === null ? remaining < total ? "paused" : "idle" : "running";
      toggle.textContent = deadline === null ? ctx.t("widgetFocusStart") : ctx.t("widgetFocusPause");
    };
    const complete = () => {
      deadline = null;
      remaining = 0;
      stopTicker();
      paint();
      if (config.chime) chime(0.6);
      if (rearm !== null) window.clearTimeout(rearm);
      rearm = window.setTimeout(() => {
        rearm = null;
        remaining = total;
        paint();
      }, 5e3);
    };
    const tick = () => {
      if (deadline === null) return;
      remaining = Math.max(0, deadline - Date.now());
      if (remaining === 0) complete();
      else paint();
    };
    const start = () => {
      if (remaining === 0) remaining = total;
      deadline = Date.now() + remaining;
      stopTicker();
      ticker = window.setInterval(tick, 250);
      paint();
    };
    const pause = () => {
      if (deadline === null) return;
      remaining = Math.max(0, deadline - Date.now());
      deadline = null;
      stopTicker();
      paint();
    };
    const onToggle = () => {
      if (deadline === null) start();
      else pause();
    };
    const onReset = () => {
      deadline = null;
      stopTicker();
      remaining = total;
      paint();
    };
    toggle.addEventListener("click", onToggle);
    reset.addEventListener("click", onReset);
    paint();
    return {
      update(instance) {
        const next = instance.config;
        const rearm2 = next.minutes !== config.minutes;
        config = next;
        if (rearm2) {
          total = config.minutes * 6e4;
          if (deadline === null) remaining = total;
          paint();
        }
      },
      destroy() {
        stopTicker();
        if (rearm !== null) window.clearTimeout(rearm);
        rearm = null;
        toggle.removeEventListener("click", onToggle);
        reset.removeEventListener("click", onReset);
        root.remove();
      }
    };
  }
};

// src/client/widgets/registry.ts
var WIDGET_DEFINITIONS = [
  clockWidget,
  counterWidget,
  focusWidget
];
var BY_TYPE = new Map(WIDGET_DEFINITIONS.map((widget) => [widget.type, widget]));
function widgetDefinition(type) {
  return BY_TYPE.get(type);
}

// src/client/cosmetics/WardrobePanel.tsx
var import_react = require("react");

// src/shared/cosmetics.ts
var COSMETIC_SLOTS = ["hat", "face", "back", "accessory"];
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
function emptyEquipped() {
  return { hat: null, face: null, back: null, accessory: null };
}
var WARDROBE_DEFAULTS = {
  equipped: emptyEquipped(),
  fur: "original",
  owned: {},
  claimed: 0,
  ledger: "taps1000",
  filter: "all"
};
var TAPS_PER_ITEM = 1e3;
var itemMapOf = (catalog) => new Map(catalog.map((item) => [item.id, item]));
function itemById(catalog, id) {
  return itemMapOf(catalog).get(id);
}
function itemsForTab(catalog, tab) {
  return tab === "fur" ? [] : catalog.filter((item) => item.slot === tab);
}
function furFilter(id) {
  return FUR_COLORS.find((color) => color.id === id)?.filter ?? "";
}
function collectedCount(state) {
  return Object.keys(state.owned).length;
}
function tapsUntilNextItem(counter) {
  const balance = Math.max(0, Math.floor(counter));
  if (balance === 0) return TAPS_PER_ITEM;
  const remainder = balance % TAPS_PER_ITEM;
  return remainder === 0 ? 0 : TAPS_PER_ITEM - remainder;
}
function equipItem(catalog, state, id) {
  const item = itemById(catalog, id);
  if (item === void 0 || (state.owned[id] ?? 0) === 0) return state;
  const current = state.equipped[item.slot];
  return { ...state, equipped: { ...state.equipped, [item.slot]: current === id ? null : id } };
}
function randomizeOutfit(catalog, state, random = Math.random) {
  const equipped = { ...state.equipped };
  for (const slot of COSMETIC_SLOTS) {
    const pool = catalog.filter((item) => item.slot === slot && (state.owned[item.id] ?? 0) > 0);
    equipped[slot] = pool.length === 0 ? null : pool[Math.floor(random() * pool.length) % pool.length].id;
  }
  return { ...state, equipped };
}
function unequipAll(state) {
  return { ...state, equipped: emptyEquipped() };
}
function withFilter(state, filter) {
  return { ...state, filter };
}

// src/client/cosmetics/cosmetics.css
var tagId = "dsh-plugin-bongo-cat/src/client/cosmetics/cosmetics.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
  tag = document.createElement("style");
  tag.dataset.plugin = "dsh-plugin-bongo-cat";
  tag.dataset.pluginCss = tagId;
  tag.textContent = "/* Cosmetics layer \u2014 extracted Steam overlays worn by the cat.\n   Plain class names: the layer is built as markup (see render.ts), so the\n   CSS-modules map would never be consulted anyway.\n\n   Every overlay PNG was cropped with the same box as the native frames, so\n   stretching it to the stage box aligns it with the artwork exactly. */\n\n.bc-decor {\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n  overflow: visible;\n}\n\n.bc-decor-item {\n  position: absolute;\n  inset: 0;\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: fill;\n  pointer-events: none;\n  user-select: none;\n  -webkit-user-drag: none;\n  filter: drop-shadow(0 2px 3px rgba(30, 20, 30, 0.18));\n  animation: bc-decor-in 220ms ease-out;\n}\n\n@keyframes bc-decor-in {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .bc-decor-item { animation: none; }\n}\n";
  document.head.appendChild(tag);
}
var tag;

// src/client/cosmetics/render.ts
var DECOR_ROLE = "bongo-cat-decor";
var DECOR_BACK_ROLE = "bongo-cat-decor-back";
function cosmeticUrl(id, stamp) {
  return `/plugins/bongo-cat/cosmetic/${encodeURIComponent(id)}.png?v=${encodeURIComponent(stamp)}`;
}
function cosmeticIconUrl(id, stamp) {
  return `/plugins/bongo-cat/cosmetic/${encodeURIComponent(id)}.icon.png?v=${encodeURIComponent(stamp)}`;
}
function cosmeticMarkup(wardrobe, catalog, layer = "front", box) {
  const byId = new Map(catalog.items.map((item) => [item.id, item]));
  const [stageWidth, stageHeight] = catalog.size.length === 2 ? catalog.size : [1, 1];
  const crop = catalog.rectSpace === "canvas" && box?.length === 4 ? { left: box[0], top: box[1], width: Math.max(1, box[2] - box[0]), height: Math.max(1, box[3] - box[1]) } : { left: 0, top: 0, width: stageWidth, height: stageHeight };
  const parts = [];
  for (const slot of COSMETIC_SLOTS) {
    const id = wardrobe.equipped[slot];
    if (id === null) continue;
    const item = byId.get(id);
    if (item === void 0) continue;
    if ((item.layer ?? "front") !== layer) continue;
    const [x, y, width, height] = item.rect ?? [0, 0, crop.width, crop.height];
    const style = [
      `left:${((x - crop.left) / crop.width * 100).toFixed(3)}%`,
      `top:${((y - crop.top) / crop.height * 100).toFixed(3)}%`,
      `width:${(width / crop.width * 100).toFixed(3)}%`,
      `height:${(height / crop.height * 100).toFixed(3)}%`
    ].join(";");
    parts.push(
      `<img class="bc-decor-item" data-slot="${slot}" data-item="${item.id}" style="${style}" src="${cosmeticUrl(item.id, catalog.stamp)}" alt="" draggable="false">`
    );
  }
  return parts.join("");
}
function artworkFilter(wardrobe) {
  return furFilter(wardrobe.fur);
}

// src/client/cosmetics/writer.ts
var chains = /* @__PURE__ */ new WeakMap();
function updateWardrobe(store, mutate) {
  const previous = chains.get(store) ?? Promise.resolve();
  const run = previous.catch(() => void 0).then(async () => {
    const snapshot = store.getSnapshot();
    if (snapshot.status !== "ready" || snapshot.value === void 0) return;
    await store.set({ wardrobe: mutate(snapshot.value.wardrobe) });
  });
  chains.set(store, run.catch(() => void 0));
  return run;
}

// src/client/cosmetics/wardrobe.module.css
var css = "/* Wardrobe panel \u2014 the item picker shown in Settings \u2192 Bongo Cat.\n   Warm accent on purpose: this is the one playful surface in an otherwise\n   neutral settings page, and it mirrors the game's own picker. */\n\n._bc_board_ipnl35 {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding: 10px;\n  border-radius: 12px;\n  border: 1px solid rgba(255, 143, 163, 0.35);\n  background:\n    linear-gradient(160deg, rgba(255, 143, 163, 0.16), rgba(255, 209, 102, 0.08)),\n    var(--dsw-alias-bg-layer-1, rgba(128, 128, 128, 0.06));\n}\n\n/* \u2500\u2500 category tabs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_tabs_2vtnwf {\n  display: flex;\n  gap: 6px;\n}\n\n._bc_tab_1f7rrl8 {\n  flex: 1;\n  padding: 6px 4px;\n  font-size: 12px;\n  color: inherit;\n  border: 1px solid transparent;\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.12));\n  cursor: pointer;\n  transition: background 120ms ease, border-color 120ms ease;\n}\n\n._bc_tab_1f7rrl8:hover {\n  background: rgba(255, 143, 163, 0.18);\n}\n\n._bc_tab_1f7rrl8[data-active='true'] {\n  border-color: #ff8fa3;\n  background: rgba(255, 143, 163, 0.28);\n  font-weight: 600;\n}\n\n/* \u2500\u2500 item grid \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_grid_hgi3n {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));\n  gap: 6px;\n  max-height: 268px;\n  overflow-y: auto;\n  padding: 4px 2px;\n  scrollbar-width: thin;\n}\n\n._bc_cell_12qlh5p {\n  position: relative;\n  aspect-ratio: 1;\n  padding: 7px;\n  border: 2px solid rgba(255, 143, 163, 0.45);\n  border-radius: 10px;\n  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.1));\n  cursor: pointer;\n  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;\n}\n\n._bc_cell_12qlh5p:hover:not(:disabled) {\n  transform: translateY(-1px);\n  border-color: #ff8fa3;\n}\n\n._bc_cell_12qlh5p:disabled {\n  cursor: not-allowed;\n}\n\n/* not owned yet: a silhouette, so the grid still shows what is out there */\n._bc_cell_12qlh5p[data-owned='false'] {\n  opacity: 0.42;\n  filter: grayscale(0.85);\n  border-style: dashed;\n}\n\n._bc_cell_12qlh5p[data-equipped='true'] {\n  border-color: #ff5c8a;\n  background: rgba(255, 143, 163, 0.2);\n  box-shadow: 0 0 0 2px rgba(255, 92, 138, 0.22);\n}\n\n/* extracted overlay icon (a PNG from the game's own sprite atlas) */\n._bc_icon_17eqpw0 {\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: contain;\n  pointer-events: none;\n}\n\n._bc_stars_cq6gm4 {\n  position: absolute;\n  top: 1px;\n  left: 4px;\n  font-size: 8px;\n  line-height: 1.4;\n  letter-spacing: -1px;\n  color: #e8a317;\n  text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);\n}\n\n._bc_count_g8en5k {\n  position: absolute;\n  left: -4px;\n  bottom: -5px;\n  padding: 0 4px;\n  border-radius: 999px;\n  background: #26222b;\n  color: #fff;\n  font-size: 9.5px;\n  line-height: 15px;\n  font-variant-numeric: tabular-nums;\n}\n\n._bc_check_1ae0065 {\n  position: absolute;\n  right: -5px;\n  bottom: -5px;\n  width: 16px;\n  height: 16px;\n  border-radius: 50%;\n  background: #26222b;\n  color: #fff;\n  font-size: 10px;\n  line-height: 16px;\n  text-align: center;\n}\n\n/* \u2500\u2500 colour wheel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_swatches_2bao8n {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 10px;\n  padding: 8px 4px 10px 4px;\n}\n\n._bc_swatch_19wjmwx {\n  position: relative;\n  width: 44px;\n  height: 44px;\n  border: 2px solid rgba(255, 143, 163, 0.55);\n  border-radius: 50%;\n  cursor: pointer;\n  /* the game's swatches are half-lit, which reads better than a flat chip */\n  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0 50%, transparent 50% 100%);\n  transition: transform 120ms ease, box-shadow 120ms ease;\n}\n\n._bc_swatch_19wjmwx:hover:not(:disabled) {\n  transform: scale(1.06);\n}\n\n._bc_swatch_19wjmwx[data-active='true'] {\n  box-shadow: 0 0 0 2px #ff5c8a;\n}\n\n/* \u2500\u2500 tools \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_tools_1xbr44w {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n\n._bc_tool_9074ar {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  padding: 5px 9px;\n  font-size: 12px;\n  color: inherit;\n  border: 1px solid var(--dsw-alias-border-default, rgba(128, 128, 128, 0.32));\n  border-radius: 8px;\n  background: transparent;\n  cursor: pointer;\n}\n\n._bc_tool_9074ar:hover:not(:disabled) {\n  border-color: #ff8fa3;\n  color: #ff5c8a;\n}\n\n/* tap balance towards the next automatic drop (1000 taps = one item) */\n._bc_progress_1szr8cm {\n  height: 6px;\n  overflow: hidden;\n  border-radius: 999px;\n  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.14));\n}\n\n._bc_progressFill_hho6h5 {\n  height: 100%;\n  border-radius: inherit;\n  background: linear-gradient(90deg, #ff8fa3, #ffd166);\n  transition: width 220ms ease;\n}\n\n/* no exchange button any more: drops are automatic, so the ready flag has\n   no consumer. Kept for profiles whose panel is still mounted on an older\n   build? (harmless dead rule \u2014 the tool row no longer sets it) */\n._bc_tool_9074ar[data-ready='true'] {\n  border-color: #ff5c8a;\n  background: rgba(255, 143, 163, 0.18);\n  color: #ff5c8a;\n  font-weight: 600;\n}\n\n._bc_tool_9074ar:disabled {\n  opacity: 0.4;\n  cursor: not-allowed;\n}\n\n._bc_tool_9074ar svg {\n  width: 14px;\n  height: 14px;\n}\n\n._bc_note_1wlf7sb {\n  font-size: 11.5px;\n  opacity: 0.7;\n  font-variant-numeric: tabular-nums;\n}\n\n._bc_hint_fki37k {\n  font-size: 11.5px;\n  line-height: 1.55;\n  opacity: 0.55;\n}\n\n._bc_empty_4pldgu {\n  grid-column: 1 / -1;\n  padding: 14px 8px;\n  font-size: 12px;\n  text-align: center;\n  opacity: 0.6;\n}\n\n._bc_tab_1f7rrl8:focus-visible,\n._bc_cell_12qlh5p:focus-visible,\n._bc_swatch_19wjmwx:focus-visible,\n._bc_tool_9074ar:focus-visible {\n  outline: 2px solid #ff5c8a;\n  outline-offset: 2px;\n}\n";
var tagId2 = "dsh-plugin-bongo-cat/src/client/cosmetics/wardrobe.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId2) + "]") === null) {
  tag2 = document.createElement("style");
  tag2.dataset.plugin = "dsh-plugin-bongo-cat";
  tag2.dataset.pluginCss = tagId2;
  tag2.textContent = css;
  document.head.appendChild(tag2);
}
var tag2;
var wardrobe_default = { "board": "_bc_board_ipnl35", "tabs": "_bc_tabs_2vtnwf", "tab": "_bc_tab_1f7rrl8", "grid": "_bc_grid_hgi3n", "cell": "_bc_cell_12qlh5p", "icon": "_bc_icon_17eqpw0", "stars": "_bc_stars_cq6gm4", "count": "_bc_count_g8en5k", "check": "_bc_check_1ae0065", "swatches": "_bc_swatches_2bao8n", "swatch": "_bc_swatch_19wjmwx", "tools": "_bc_tools_1xbr44w", "tool": "_bc_tool_9074ar", "progress": "_bc_progress_1szr8cm", "progressFill": "_bc_progressFill_hho6h5", "note": "_bc_note_1wlf7sb", "hint": "_bc_hint_fki37k", "empty": "_bc_empty_4pldgu" };

// src/client/cosmetics/WardrobePanel.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var TAB_KEYS = {
  hat: "wardrobeHat",
  face: "wardrobeFace",
  back: "wardrobeBack",
  accessory: "wardrobeAccessory",
  fur: "wardrobeFur"
};
var FILTER_KEYS = {
  all: "wardrobeFilterAll",
  owned: "wardrobeFilterOwned",
  equipped: "wardrobeFilterEquipped"
};
var TABS = ["hat", "face", "back", "accessory", "fur"];
function stars(rarity) {
  return "\u2605".repeat(rarity);
}
function WardrobePanel({ store, settings, rpc, t, writable }) {
  const [tab, setTab] = (0, import_react.useState)("hat");
  const [note, setNote] = (0, import_react.useState)(null);
  const [catalog, setCatalog] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const wardrobe = settings.wardrobe;
  (0, import_react.useEffect)(() => {
    void store.refreshCounter();
  }, [store]);
  (0, import_react.useEffect)(() => {
    let alive = true;
    const load = async () => {
      const result = await rpc.call("/bongo-cat", "cosmetics/catalog", {});
      if (!alive) return;
      setCatalog(result.ok ? result.value : null);
      setLoading(false);
    };
    void load();
    const onNativeChanged = () => {
      void load();
    };
    window.addEventListener("bongo-cat:native-changed", onNativeChanged);
    return () => {
      alive = false;
      window.removeEventListener("bongo-cat:native-changed", onNativeChanged);
    };
  }, [rpc]);
  const commit = async (mutate) => {
    try {
      await updateWardrobe(store, mutate);
      setNote(null);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  };
  const ownedCount = (id) => wardrobe.owned[id] ?? 0;
  const visible = (item) => {
    if (wardrobe.filter === "owned" && ownedCount(item.id) === 0) return false;
    if (wardrobe.filter === "equipped" && wardrobe.equipped[item.slot] !== item.id) return false;
    return true;
  };
  const items = catalog === null ? [] : itemsForTab(catalog.items, tab);
  const shown = items.filter(visible);
  const equippedCount = Object.values(wardrobe.equipped).filter((id) => id !== null).length;
  const nextItem = tapsUntilNextItem(settings.counter);
  const progress = Math.round((TAPS_PER_ITEM - nextItem) / TAPS_PER_ITEM * 100);
  const total = catalog === null ? 0 : catalog.items.length;
  const stamp = catalog?.stamp ?? "";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: wardrobe_default.board, "data-role": "wardrobe-board", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: wardrobe_default.tabs, role: "tablist", children: TABS.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        role: "tab",
        "aria-selected": tab === entry,
        className: wardrobe_default.tab,
        "data-active": tab === entry,
        "data-tab": entry,
        onClick: () => setTab(entry),
        children: t(TAB_KEYS[entry])
      },
      entry
    )) }),
    tab === "fur" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: wardrobe_default.swatches, children: FUR_COLORS.filter((color) => wardrobe.filter !== "equipped" || color.id === wardrobe.fur).map((color) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: wardrobe_default.swatch,
        "data-color": color.id,
        "data-active": wardrobe.fur === color.id,
        "aria-pressed": wardrobe.fur === color.id,
        disabled: !writable,
        title: color.id,
        style: { backgroundColor: color.swatch },
        onClick: () => void commit((current) => ({ ...current, fur: color.id })),
        children: wardrobe.fur === color.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: wardrobe_default.check, children: "\u2713" })
      },
      color.id
    )) }) : catalog === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: wardrobe_default.empty, children: loading ? t("loading") : t("wardrobeNoAssets") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: wardrobe_default.grid, role: "list", children: [
      shown.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: wardrobe_default.empty, children: t("wardrobeEmpty") }),
      shown.map((item) => {
        const owned = ownedCount(item.id);
        const worn = wardrobe.equipped[item.slot] === item.id;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            role: "listitem",
            className: wardrobe_default.cell,
            "data-item": item.id,
            "data-slot": item.slot,
            "data-owned": owned > 0,
            "data-equipped": worn,
            "aria-pressed": worn,
            disabled: !writable,
            title: `${item.name} \xB7 ${t(TAB_KEYS[item.slot])} \xB7 ${stars(item.rarity)}${owned > 0 ? ` \xD7${owned}` : ` \xB7 ${t("wardrobeLocked")}`}`,
            onClick: () => void commit((current) => equipItem(catalog.items, current, item.id)),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "img",
                {
                  className: wardrobe_default.icon,
                  src: cosmeticIconUrl(item.id, stamp),
                  alt: item.name,
                  loading: "lazy",
                  draggable: false
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: wardrobe_default.stars, children: stars(item.rarity) }),
              owned > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: wardrobe_default.count, children: [
                "\xD7",
                owned
              ] }),
              worn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: wardrobe_default.check, children: "\u2713" })
            ]
          },
          item.id
        );
      })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: wardrobe_default.progress, "data-role": "wardrobe-progress", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: wardrobe_default.progressFill, style: { width: `${progress}%` } }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: wardrobe_default.tools, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: wardrobe_default.tool,
          "data-role": "wardrobe-filter",
          title: t("wardrobeFilter"),
          "aria-label": t("wardrobeFilter"),
          onClick: () => {
            const order = ["all", "owned", "equipped"];
            const index = order.indexOf(wardrobe.filter);
            void commit((current) => withFilter(current, order[(index + 1) % order.length]));
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 4h18l-7 9v6l-4-2v-4z", fill: "currentColor" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t(FILTER_KEYS[wardrobe.filter]) })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: wardrobe_default.tool,
          "data-role": "wardrobe-random",
          title: t("wardrobeRandom"),
          "aria-label": t("wardrobeRandom"),
          disabled: !writable || catalog === null,
          onClick: () => {
            const list = catalog?.items ?? [];
            void commit((current) => randomizeOutfit(list, current));
          },
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "3", width: "18", height: "18", rx: "4", fill: "none", stroke: "currentColor", strokeWidth: "2" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "8.5", cy: "8.5", r: "1.6", fill: "currentColor" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "15.5", cy: "15.5", r: "1.6", fill: "currentColor" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "1.6", fill: "currentColor" })
          ] })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: wardrobe_default.tool,
          "data-role": "wardrobe-unequip",
          title: t("wardrobeUnequip"),
          "aria-label": t("wardrobeUnequip"),
          disabled: !writable || equippedCount === 0,
          onClick: () => void commit((current) => unequipAll(current)),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: wardrobe_default.note, "data-role": "wardrobe-status", children: note ?? `${t("wardrobeCollected")} ${collectedCount(wardrobe)}/${total} \xB7 ${nextItem === 0 ? t("wardrobeReady") : `${t("wardrobeNextDrop")} ${nextItem}`}` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: wardrobe_default.hint, children: t("wardrobeHint") })
  ] });
}

// src/client/presets.ts
var PRESETS = [
  {
    id: "focus",
    labelKey: "presetFocus",
    patch: { size: 0.9, speed: 0.8, soundEnabled: false, showCounter: false }
  },
  {
    id: "zen",
    labelKey: "presetZen",
    patch: { size: 1.1, speed: 0.6, soundEnabled: true, volume: 0.3, showCounter: true }
  },
  {
    id: "party",
    labelKey: "presetParty",
    patch: { size: 1.6, speed: 1.8, soundEnabled: true, volume: 0.9, showCounter: true }
  },
  {
    id: "night",
    labelKey: "presetNight",
    patch: { size: 1, speed: 0.8, soundEnabled: true, volume: 0.35, showCounter: true }
  }
];

// src/shared/settings-contract.ts
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
  /** Tap balance: spent 1000 at a time on automatic wardrobe drops. */
  counter: { kind: "natural", default: 0, writable: false },
  /** Lifetime taps (never debited); the counter above is the spendable balance. */
  lifetimeTaps: { kind: "natural", default: 0, writable: false },
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

// src/client/settings.ts
var BONGO_CAT_NS = "bongo-cat";
function nativeFrameUrl(frame, stamp, file) {
  return `/plugins/bongo-cat/native/${file ?? `${frame}.png`}?v=${encodeURIComponent(stamp)}`;
}
function nativeIconUrl(name, stamp) {
  return `/plugins/bongo-cat/native/icons/${encodeURIComponent(name)}.png?v=${encodeURIComponent(stamp)}`;
}
function skinUrl(revision) {
  return "/plugins/bongo-cat/skin?v=" + revision;
}
function soundUrl(revision) {
  return "/plugins/bongo-cat/sound?v=" + revision;
}

// src/client/BongoCatSection.module.css
var css2 = "/* Bongo Cat settings section \u2014 skin gallery, Steam import, sound,\n   position, counter and easter-egg toggles. */\n._bc_section_1hg3uey {\n  display: flex;\n  flex-direction: column;\n  gap: 18px;\n}\n\n._bc_hint_4mawyw {\n  font-size: 12.5px;\n  line-height: 1.6;\n  opacity: 0.72;\n}\n\n._bc_group_1jjunf0 {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  padding: 14px 16px;\n  border: 1px solid var(--dsw-alias-border-default, rgba(128, 128, 128, 0.28));\n  border-radius: 10px;\n}\n\n._bc_group-title_l1fnl {\n  font-size: 13px;\n  font-weight: 600;\n}\n\n._bc_row_14d9avt {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  flex-wrap: wrap;\n}\n\n._bc_label_1rv7cc5 {\n  font-size: 12.5px;\n  min-width: 64px;\n  opacity: 0.85;\n}\n\n._bc_value_1rwswag {\n  font-size: 12px;\n  opacity: 0.6;\n  font-variant-numeric: tabular-nums;\n  min-width: 42px;\n  text-align: right;\n}\n\n._bc_check_zyqket {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 12.5px;\n  cursor: pointer;\n}\n\n._bc_range_e0x3u4 {\n  flex: 1;\n  min-width: 140px;\n}\n\n._bc_btn_15di817 {\n  padding: 5px 12px;\n  font-size: 12.5px;\n  border: 1px solid var(--dsw-alias-border-default, rgba(128, 128, 128, 0.35));\n  border-radius: 7px;\n  background: transparent;\n  color: inherit;\n  cursor: pointer;\n}\n\n._bc_btn_15di817:hover:not(:disabled) {\n  border-color: var(--dsw-alias-border-strong, rgba(128, 128, 128, 0.6));\n}\n\n._bc_btn_15di817:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n._bc_btn-primary_cncbqi {\n  background: var(--dsw-alias-bg-module-platform, #4a6cf7);\n  border-color: transparent;\n  color: #fff;\n}\n\n._bc_btn-danger_4fj1gd {\n  color: #e5484d;\n  border-color: rgba(229, 72, 77, 0.5);\n}\n\n._bc_btn_15di817._bc_active_qwgo7z {\n  border-color: var(--dsw-alias-bg-module-platform, #4a6cf7);\n  color: var(--dsw-alias-bg-module-platform, #4a6cf7);\n}\n\n._bc_gallery_1ygnf6j {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));\n  gap: 10px;\n}\n\n._bc_skin-card_1eri60l {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 6px;\n  padding: 8px 6px 10px;\n  border: 2px solid transparent;\n  border-radius: 10px;\n  background: var(--dsw-alias-bg-layer-1, rgba(128, 128, 128, 0.08));\n  cursor: pointer;\n}\n\n._bc_skin-card_1eri60l:hover {\n  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.14));\n}\n\n._bc_skin-card_1eri60l._bc_selected_1ih4z2y {\n  border-color: var(--dsw-alias-bg-module-platform, #4a6cf7);\n}\n\n._bc_skin-name_66uali {\n  font-size: 12px;\n}\n\n._bc_scan-list_h3i92b {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  max-height: 260px;\n  overflow: auto;\n}\n\n._bc_scan-root_3xtj53 {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n._bc_scan-root-label_5pl0uk {\n  font-size: 12px;\n  font-weight: 600;\n}\n\n._bc_scan-root-path_x84tk7 {\n  font-size: 11px;\n  opacity: 0.55;\n  word-break: break-all;\n}\n\n._bc_scan-files_1iafqj8 {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  margin-top: 2px;\n}\n\n._bc_scan-file_124flfr {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 3px 8px;\n  font-size: 11.5px;\n  border: 1px solid var(--dsw-alias-border-default, rgba(128, 128, 128, 0.3));\n  border-radius: 999px;\n  cursor: pointer;\n  background: transparent;\n  color: inherit;\n  max-width: 100%;\n}\n\n._bc_scan-file_124flfr:hover:not(:disabled) {\n  border-color: var(--dsw-alias-bg-module-platform, #4a6cf7);\n}\n\n._bc_scan-file_124flfr span {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  max-width: 180px;\n}\n\n._bc_scan-file_124flfr:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n._bc_preview-strip_11cr6jc {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\n\n._bc_preview-thumb_1xw02qa {\n  width: 72px;\n  height: 72px;\n  object-fit: contain;\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-1, rgba(128, 128, 128, 0.1));\n}\n\n._bc_warning_1gk58pl {\n  font-size: 12px;\n  color: #d97706;\n}\n\n._bc_error_163h6x7 {\n  font-size: 12px;\n  color: #e5484d;\n}\n\n._bc_note_phoiw3 {\n  font-size: 11.5px;\n  opacity: 0.6;\n  line-height: 1.5;\n}\n\n._bc_hidden-input_1bt11j6 {\n  display: none;\n}\n\n._bc_select_tushdn {\n  padding: 5px 10px;\n  font-size: 12.5px;\n  border: 1px solid var(--dsw-alias-border-default, rgba(128, 128, 128, 0.35));\n  border-radius: 7px;\n  background: transparent;\n  color: inherit;\n}\n\n/* \u2500\u2500 Steam skin picker \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_skin-grid_18ira3d {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));\n  gap: 6px;\n  max-height: 260px;\n  overflow-y: auto;\n  padding: 4px 2px 6px;\n  margin: 6px 0;\n}\n\n._bc_skin-cell_1wh52qv {\n  position: relative;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  aspect-ratio: 1;\n  padding: 4px;\n  border: 1px solid var(--dsw-alias-border-default, rgba(128, 128, 128, 0.25));\n  border-radius: 9px;\n  background: var(--dsw-alias-bg-elevated, rgba(127, 127, 127, 0.06));\n  cursor: pointer;\n  transition: border-color 120ms ease, transform 120ms ease;\n}\n\n._bc_skin-cell_1wh52qv:hover {\n  border-color: var(--dsw-alias-border-strong, rgba(128, 128, 128, 0.55));\n  transform: translateY(-1px);\n}\n\n._bc_skin-cell_1wh52qv:disabled {\n  cursor: default;\n  opacity: 0.55;\n  transform: none;\n}\n\n._bc_skin-cell-active_11lgaiu {\n  border-color: var(--dsw-alias-brand-primary, #4f7cff);\n  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary, #4f7cff) inset;\n}\n\n._bc_skin-icon_4enjyi {\n  width: 100%;\n  height: 100%;\n  object-fit: contain;\n  image-rendering: auto;\n  pointer-events: none;\n}\n\n._bc_skin-badge_1qknays {\n  position: absolute;\n  right: 2px;\n  bottom: 2px;\n  font-size: 11px;\n  line-height: 1;\n  opacity: 0.8;\n}\n\n._bc_group-toggle_15kg7wz {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  padding: 0;\n  border: 0;\n  background: none;\n  color: inherit;\n  font: inherit;\n  font-size: 12.5px;\n  font-weight: 600;\n  cursor: pointer;\n}\n\n/* \u2500\u2500 desktop widgets \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_widget-card_yqp5s6 {\n  margin: 8px 0;\n  padding: 8px 10px;\n  border: 1px solid rgba(128, 128, 128, 0.18);\n  border-radius: 10px;\n  background: rgba(128, 128, 128, 0.06);\n}\n";
var tagId3 = "dsh-plugin-bongo-cat/src/client/BongoCatSection.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId3) + "]") === null) {
  tag3 = document.createElement("style");
  tag3.dataset.plugin = "dsh-plugin-bongo-cat";
  tag3.dataset.pluginCss = tagId3;
  tag3.textContent = css2;
  document.head.appendChild(tag3);
}
var tag3;
var BongoCatSection_default = { "section": "_bc_section_1hg3uey", "hint": "_bc_hint_4mawyw", "group": "_bc_group_1jjunf0", "group-title": "_bc_group-title_l1fnl", "row": "_bc_row_14d9avt", "label": "_bc_label_1rv7cc5", "value": "_bc_value_1rwswag", "check": "_bc_check_zyqket", "range": "_bc_range_e0x3u4", "btn": "_bc_btn_15di817", "btn-primary": "_bc_btn-primary_cncbqi", "btn-danger": "_bc_btn-danger_4fj1gd", "active": "_bc_active_qwgo7z", "gallery": "_bc_gallery_1ygnf6j", "skin-card": "_bc_skin-card_1eri60l", "selected": "_bc_selected_1ih4z2y", "skin-name": "_bc_skin-name_66uali", "scan-list": "_bc_scan-list_h3i92b", "scan-root": "_bc_scan-root_3xtj53", "scan-root-label": "_bc_scan-root-label_5pl0uk", "scan-root-path": "_bc_scan-root-path_x84tk7", "scan-files": "_bc_scan-files_1iafqj8", "scan-file": "_bc_scan-file_124flfr", "preview-strip": "_bc_preview-strip_11cr6jc", "preview-thumb": "_bc_preview-thumb_1xw02qa", "warning": "_bc_warning_1gk58pl", "error": "_bc_error_163h6x7", "note": "_bc_note_phoiw3", "hidden-input": "_bc_hidden-input_1bt11j6", "select": "_bc_select_tushdn", "skin-grid": "_bc_skin-grid_18ira3d", "skin-cell": "_bc_skin-cell_1wh52qv", "skin-cell-active": "_bc_skin-cell-active_11lgaiu", "skin-icon": "_bc_skin-icon_4enjyi", "skin-badge": "_bc_skin-badge_1qknays", "group-toggle": "_bc_group-toggle_15kg7wz", "widget-card": "_bc_widget-card_yqp5s6" };

// src/client/BongoCatSection.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var POSITIONS = ["bottom-right", "bottom-left", "top-left", "top-right"];
var POSITION_KEYS = {
  "bottom-right": "posBR",
  "bottom-left": "posBL",
  "top-left": "posTL",
  "top-right": "posTR"
};
var MAX_SKIN_BYTES = 8 * 1024 * 1024;
var MAX_SOUND_BYTES = 2 * 1024 * 1024;
function useStore(store) {
  return (0, import_react2.useSyncExternalStore)(store.subscribe, store.getSnapshot);
}
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma === -1 ? "" : result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
function BongoCatSection(props) {
  const { store, rpc, isLoopback, t } = props;
  const snapshot = useStore(store);
  const settings = snapshot.value;
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)(null);
  const [scanning, setScanning] = (0, import_react2.useState)(false);
  const [roots, setRoots] = (0, import_react2.useState)(null);
  const [appliedPreset, setAppliedPreset] = (0, import_react2.useState)(null);
  const [native, setNative] = (0, import_react2.useState)({ available: false });
  const [catalog, setCatalog] = (0, import_react2.useState)({ skins: [], current: "", stamp: "", available: false });
  const [nativeBusy, setNativeBusy] = (0, import_react2.useState)(false);
  const [pendingSkin, setPendingSkin] = (0, import_react2.useState)(null);
  const [nativeError, setNativeError] = (0, import_react2.useState)(null);
  const [showCustom, setShowCustom] = (0, import_react2.useState)(false);
  const skinInputRef = (0, import_react2.useRef)(null);
  const soundInputRef = (0, import_react2.useRef)(null);
  const writable = isLoopback;
  const loadNative = async () => {
    const status = await rpc.call("/bongo-cat", "native/status", {});
    setNative(status.ok ? status.value : { available: false });
    const list = await rpc.call("/bongo-cat", "native/catalog", {});
    if (list.ok) setCatalog(list.value);
  };
  (0, import_react2.useEffect)(() => {
    void loadNative();
  }, []);
  const importNative = async (skin) => {
    setNativeBusy(true);
    setPendingSkin(skin ?? null);
    setNativeError(null);
    try {
      const result = await rpc.call("/bongo-cat", "native/import", skin === void 0 ? {} : { skin });
      if (!result.ok) throw new Error(result.error.message);
      setNative(result.value);
      await store.set({ skin: result.value.skin ?? skin ?? settings?.skin ?? "Cat" });
      await loadNative();
      window.dispatchEvent(new Event("bongo-cat:native-changed"));
    } catch (err) {
      setNativeError(err instanceof Error ? err.message : String(err));
    } finally {
      setNativeBusy(false);
      setPendingSkin(null);
    }
  };
  const removeNative = async () => {
    setNativeBusy(true);
    setNativeError(null);
    try {
      const result = await rpc.call("/bongo-cat", "native/remove", {});
      if (!result.ok) throw new Error(result.error.message);
      setNative({ available: false });
      setCatalog({ skins: [], current: "", stamp: "", available: false });
      window.dispatchEvent(new Event("bongo-cat:native-changed"));
    } catch (err) {
      setNativeError(err instanceof Error ? err.message : String(err));
    } finally {
      setNativeBusy(false);
    }
  };
  const applyPreset = async (presetId, patch) => {
    setAppliedPreset(presetId);
    await run(async () => {
      await store.set(patch);
    });
  };
  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  const doScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await rpc.call("/bongo-cat", "skins/scan", {});
      if (!result.ok) throw new Error(result.error.message);
      setRoots(result.value.roots);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  };
  const importSkinFile = async (file) => {
    if (file.size > MAX_SKIN_BYTES) {
      setError(t("tooLarge"));
      return;
    }
    await run(async () => {
      const data = await readFileAsBase64(file);
      const result = await rpc.call("/bongo-cat", "skins/import", { data, name: file.name });
      if (!result.ok) throw new Error(result.error.message);
      await store.set({ customSkinRevision: result.value.revision });
    });
  };
  const importSkinFromPath = async (path) => {
    await run(async () => {
      const result = await rpc.call("/bongo-cat", "skins/import", { path });
      if (!result.ok) throw new Error(result.error.message);
      await store.set({ customSkinRevision: result.value.revision });
    });
  };
  const removeCustomSkin = async () => {
    await run(async () => {
      const result = await rpc.call("/bongo-cat", "skins/remove", {});
      if (!result.ok) throw new Error(result.error.message);
      await store.set({ customSkinRevision: 0 });
    });
  };
  const importSound = async (file) => {
    if (file.size > MAX_SOUND_BYTES) {
      setError(t("tooLarge"));
      return;
    }
    await run(async () => {
      const data = await readFileAsBase64(file);
      const result = await rpc.call("/bongo-cat", "sounds/import", { data, name: file.name });
      if (!result.ok) throw new Error(result.error.message);
      await store.set({ customSoundRevision: result.value.revision });
    });
  };
  const removeSound = async () => {
    await run(async () => {
      const result = await rpc.call("/bongo-cat", "sounds/remove", {});
      if (!result.ok) throw new Error(result.error.message);
      await store.set({ customSoundRevision: 0 });
    });
  };
  const resetCounter = async () => {
    await run(async () => {
      const result = await rpc.call("/bongo-cat", "stats/reset", {});
      if (!result.ok) throw new Error(result.error.message);
      await store.load();
    });
  };
  const patchWidgets = async (next) => {
    await store.set({ widgets: next });
  };
  const addWidgetOfType = async (type) => {
    if (settings === void 0) return;
    if (settings.widgets.length >= WIDGET_LIMIT) return;
    const instance = newWidget(type, settings.widgets, { width: window.innerWidth, height: window.innerHeight });
    await patchWidgets([...settings.widgets, instance]);
  };
  const changeWidget = async (id, mutate) => {
    if (settings === void 0) return;
    await patchWidgets(settings.widgets.map((widget) => widget.id === id ? mutate(widget) : widget));
  };
  if (settings === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.section, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.hint, children: snapshot.status === "unavailable" ? t("unavailable") : t("loading") }) });
  }
  const currentSkin = settings.customSkinRevision > 0 ? "" : catalog.current || settings.skin;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.section, children: [
    !isLoopback && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.warning, children: t("remoteWarning") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.hint, children: t("hint") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: BongoCatSection_default.check, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "input",
        {
          type: "checkbox",
          checked: settings.enabled,
          onChange: (event) => void store.set({ enabled: event.target.checked })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("enabledLabel") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("steamSkinsLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.row, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: BongoCatSection_default.note, children: native.available ? `\u2713 ${t("nativeReady")} \xB7 ${settings.skin}${native.size ? ` \xB7 ${native.size[0]}\xD7${native.size[1]}` : ""}` : t("nativeMissing") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-primary"]}`,
            disabled: !writable || nativeBusy,
            onClick: () => void importNative(),
            children: native.available ? t("nativeReimport") : t("nativeImport")
          }
        ),
        native.available && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-danger"]}`,
            disabled: !writable || nativeBusy,
            onClick: () => void removeNative(),
            children: t("nativeRemove")
          }
        )
      ] }),
      catalog.skins.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["skin-grid"], children: catalog.skins.map((name) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          title: name,
          className: `${BongoCatSection_default["skin-cell"]} ${name === currentSkin ? BongoCatSection_default["skin-cell-active"] : ""}`,
          disabled: !writable || nativeBusy,
          onClick: () => {
            if (name === currentSkin && native.available) return;
            void importNative(name);
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "img",
              {
                className: BongoCatSection_default["skin-icon"],
                loading: "lazy",
                alt: name,
                src: nativeIconUrl(name, catalog.stamp)
              }
            ),
            pendingSkin === name && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: BongoCatSection_default["skin-badge"], children: "\u2026" })
          ]
        },
        name
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.note, children: t("nativeHint") }),
      nativeBusy && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.hint, children: pendingSkin ? `${t("skinImporting")} ${pendingSkin}` : t("nativeBusy") }),
      nativeError !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.error, children: [
        t("nativeFailed"),
        ": ",
        nativeError
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("presetLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.row, children: PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: `${BongoCatSection_default.btn} ${appliedPreset === preset.id ? BongoCatSection_default.active : ""}`,
          disabled: busy,
          onClick: () => void applyPreset(preset.id, preset.patch),
          children: appliedPreset === preset.id ? `${t(preset.labelKey)} \u2713` : t(preset.labelKey)
        },
        preset.id
      )) }),
      appliedPreset !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.note, children: t("presetApplied") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("positionLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.row, children: POSITIONS.map((position) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: `${BongoCatSection_default.btn} ${settings.position === position ? BongoCatSection_default.active : ""}`,
          onClick: () => void store.set({ position }),
          children: t(POSITION_KEYS[position])
        },
        position
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: BongoCatSection_default.label, children: t("sizeLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            className: BongoCatSection_default.range,
            type: "range",
            min: "0.5",
            max: "3",
            step: "0.05",
            value: settings.size,
            onChange: (event) => void store.set({ size: Number(event.target.value) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: BongoCatSection_default.value, children: [
          settings.size.toFixed(2),
          "\xD7"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: BongoCatSection_default.label, children: t("speedLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            className: BongoCatSection_default.range,
            type: "range",
            min: "0.5",
            max: "2.5",
            step: "0.05",
            value: settings.speed,
            onChange: (event) => void store.set({ speed: Number(event.target.value) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: BongoCatSection_default.value, children: [
          settings.speed.toFixed(2),
          "\xD7"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: BongoCatSection_default.label, children: t("offsetLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            className: BongoCatSection_default.range,
            type: "range",
            min: "0",
            max: "400",
            step: "1",
            value: settings.offsetX,
            onChange: (event) => void store.set({ offsetX: Number(event.target.value) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: BongoCatSection_default.value, children: [
          settings.offsetX,
          "px"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("counterLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: BongoCatSection_default.value, children: (settings.lifetimeTaps ?? settings.counter).toLocaleString() }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: BongoCatSection_default.check, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              type: "checkbox",
              checked: settings.showCounter,
              onChange: (event) => void store.set({ showCounter: event.target.checked })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("counterLabel") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-danger"]}`,
            disabled: !writable,
            onClick: () => void resetCounter(),
            children: t("counterReset")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("wardrobeSection") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(WardrobePanel, { store, settings, rpc, t, writable })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("widgetSection") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.note, children: t("widgetHint") }),
      settings.widgets.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.note, children: t("widgetEmpty") }),
      settings.widgets.map((widget) => {
        const definition = WIDGET_DEFINITIONS.find((entry) => entry.type === widget.type);
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default["widget-card"], "data-widget": widget.id, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: BongoCatSection_default.check, children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: widget.enabled,
                  onChange: (event) => void changeWidget(widget.id, (current) => ({ ...current, enabled: event.target.checked }))
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: definition === void 0 ? widget.type : t(definition.labelKey) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-danger"]}`,
                onClick: () => void patchWidgets(withoutWidget(settings.widgets, widget.id)),
                children: t("widgetRemove")
              }
            )
          ] }),
          definition !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.note, children: t(definition.descriptionKey) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: BongoCatSection_default.label, children: t("widgetSize") }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "select",
              {
                className: BongoCatSection_default.select,
                value: widget.size,
                onChange: (event) => void changeWidget(widget.id, (current) => ({ ...current, size: event.target.value })),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "sm", children: t("widgetSizeSm") }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "md", children: t("widgetSizeMd") })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: BongoCatSection_default.label, children: t("widgetOpacity") }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                className: BongoCatSection_default.range,
                type: "range",
                min: "0.4",
                max: "1",
                step: "0.05",
                value: widget.opacity,
                onChange: (event) => void changeWidget(widget.id, (current) => ({ ...current, opacity: Number(event.target.value) }))
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: BongoCatSection_default.value, children: [
              Math.round(widget.opacity * 100),
              "%"
            ] })
          ] }),
          widget.type === "clock" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: BongoCatSection_default.check, children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: widget.config.hour12,
                  onChange: (event) => void changeWidget(widget.id, (current) => ({
                    ...current,
                    config: { ...current.config, hour12: event.target.checked }
                  }))
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("widgetHour12") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: BongoCatSection_default.check, children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: widget.config.seconds,
                  onChange: (event) => void changeWidget(widget.id, (current) => ({
                    ...current,
                    config: { ...current.config, seconds: event.target.checked }
                  }))
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("widgetSeconds") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: BongoCatSection_default.check, children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: widget.config.showDate,
                  onChange: (event) => void changeWidget(widget.id, (current) => ({
                    ...current,
                    config: { ...current.config, showDate: event.target.checked }
                  }))
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("widgetShowDate") })
            ] })
          ] }),
          widget.type === "counter" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: BongoCatSection_default.label, children: t("widgetSource") }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "select",
              {
                className: BongoCatSection_default.select,
                value: widget.config.source,
                onChange: (event) => void changeWidget(widget.id, (current) => ({
                  ...current,
                  config: { ...current.config, source: event.target.value }
                })),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "total", children: t("widgetCounterTotal") }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "session", children: t("widgetCounterSession") })
                ]
              }
            )
          ] }),
          widget.type === "focus" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: BongoCatSection_default.label, children: t("widgetMinutes") }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                className: BongoCatSection_default.select,
                type: "number",
                min: "1",
                max: "120",
                step: "1",
                value: widget.config.minutes,
                onChange: (event) => {
                  const minutes = Math.min(120, Math.max(1, Math.round(Number(event.target.value) || 1)));
                  void changeWidget(widget.id, (current) => ({
                    ...current,
                    config: { ...current.config, minutes }
                  }));
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: BongoCatSection_default.check, children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: widget.config.chime,
                  onChange: (event) => void changeWidget(widget.id, (current) => ({
                    ...current,
                    config: { ...current.config, chime: event.target.checked }
                  }))
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("widgetChime") })
            ] })
          ] })
        ] }, widget.id);
      }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.note, children: t("widgetAdd") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.row, children: WIDGET_DEFINITIONS.map((definition) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: BongoCatSection_default.btn,
          disabled: !writable || settings.widgets.length >= WIDGET_LIMIT,
          onClick: () => void addWidgetOfType(definition.type),
          children: [
            "+ ",
            t(definition.labelKey)
          ]
        },
        definition.type
      )) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("soundLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: BongoCatSection_default.check, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            type: "checkbox",
            checked: settings.soundEnabled,
            onChange: (event) => void store.set({ soundEnabled: event.target.checked })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("soundOnLabel") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: BongoCatSection_default.label, children: t("volumeLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            className: BongoCatSection_default.range,
            type: "range",
            min: "0",
            max: "1",
            step: "0.05",
            value: settings.volume,
            onChange: (event) => void store.set({ volume: Number(event.target.value) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: BongoCatSection_default.value, children: [
          Math.round(settings.volume * 100),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: BongoCatSection_default.btn,
            disabled: !writable,
            onClick: () => soundInputRef.current?.click(),
            children: t("importSoundButton")
          }
        ),
        settings.customSoundRevision > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-danger"]}`,
            disabled: !writable,
            onClick: () => void removeSound(),
            children: t("removeSoundButton")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            ref: soundInputRef,
            type: "file",
            accept: ".wav",
            className: BongoCatSection_default["hidden-input"],
            onChange: (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void importSound(file);
            }
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: BongoCatSection_default["group-toggle"],
          onClick: () => setShowCustom((value) => !value),
          children: [
            showCustom ? "\u25BE" : "\u25B8",
            " ",
            t("customLabel")
          ]
        }
      ),
      showCustom && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.note, children: t("framesHint") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-primary"]}`,
              disabled: !writable,
              onClick: () => skinInputRef.current?.click(),
              children: t("importSkinButton")
            }
          ),
          settings.customSkinRevision > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-danger"]}`,
              disabled: !writable,
              onClick: () => void removeCustomSkin(),
              children: t("removeSkinButton")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              ref: skinInputRef,
              type: "file",
              accept: "image/*",
              className: BongoCatSection_default["hidden-input"],
              onChange: (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importSkinFile(file);
              }
            }
          )
        ] }),
        settings.customSkinRevision > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default.row, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["preview-strip"], children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("img", { className: BongoCatSection_default["preview-thumb"], src: skinUrl(settings.customSkinRevision), alt: "" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: BongoCatSection_default.label, children: t("framesLabel") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              className: BongoCatSection_default.range,
              type: "range",
              min: "2",
              max: "12",
              step: "1",
              value: settings.customSkinFrames,
              onChange: (event) => void store.set({ customSkinFrames: Number(event.target.value) })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: BongoCatSection_default.value, children: settings.customSkinFrames })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.row, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: BongoCatSection_default.btn,
            disabled: !writable || scanning,
            onClick: () => void doScan(),
            children: scanning ? t("scanning") : t("scanButton")
          }
        ) }),
        roots !== null && roots.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.note, children: t("scanEmpty") }),
        roots !== null && roots.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["scan-list"], children: roots.map((rootEntry) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: BongoCatSection_default["scan-root"], children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["scan-root-label"], children: rootEntry.label }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["scan-root-path"], children: rootEntry.path }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default["scan-files"], children: rootEntry.files.map((file) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: BongoCatSection_default["scan-file"],
              disabled: !writable || busy,
              onClick: () => void importSkinFromPath(file.path),
              children: file.name
            },
            file.path
          )) })
        ] }, rootEntry.path)) })
      ] })
    ] }),
    error !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: BongoCatSection_default.error, children: error })
  ] });
}

// src/client/settings-link.ts
var DIALOG_TRIGGER_SELECTOR = 'button[aria-haspopup="dialog"][aria-expanded]';
var LAUNCHER_SELECTOR = 'button[aria-haspopup="menu"][aria-expanded]';
var SETTINGS_PANEL_SELECTOR = '[data-shortcut-modal="settings"]';
var OUR_ROOTS = "#dsh-bongo-cat-root, #dsh-bongo-cat-widgets";
var SECTION_MARKER = '[data-role="wardrobe-board"]';
var MENU_SETTINGS_LABELS = ["\u8BBE\u7F6E", "Settings", "\u8A2D\u5B9A", "Preferences"];
function rank(node, label) {
  const aria = (node.getAttribute("aria-label") ?? "").trim();
  if (aria === label) return 0;
  const text = (node.textContent ?? "").trim();
  if (text === label) return 1;
  if (text.startsWith(label) || text.endsWith(label)) return 2;
  return -1;
}
function sectionEntry(label) {
  const scope = document.querySelector('[role="dialog"]') ?? document;
  const nodes = [...scope.querySelectorAll('button, [role="tab"], [role="button"], a')];
  let best = null;
  for (const node of nodes) {
    if (node.closest(OUR_ROOTS) !== null) continue;
    const score = rank(node, label);
    if (score < 0) continue;
    if (best === null || score < best.score) best = { node, score };
  }
  return best?.node ?? null;
}
function selectSection(label) {
  if (document.querySelector(SECTION_MARKER) !== null) return true;
  const entry = sectionEntry(label);
  if (entry === null) return false;
  entry.click();
  return true;
}
var FIBER_KEY_PREFIXES = ["__reactFiber$", "__reactInternalInstance$"];
function reactFiberOf(node) {
  const record = node;
  for (const key of Object.keys(record)) {
    if (!FIBER_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    const value = record[key];
    return typeof value === "object" && value !== null ? value : null;
  }
  return null;
}
function openThroughLauncher() {
  const launchers = [...document.querySelectorAll(LAUNCHER_SELECTOR)];
  for (const launcher of launchers) {
    let fiber = reactFiberOf(launcher);
    for (let depth = 0; fiber !== null && depth < 40; depth += 1) {
      const props = fiber.memoizedProps;
      if (props !== null && props !== void 0 && typeof props.openSettings === "function") {
        try {
          ;
          props.openSettings();
          return true;
        } catch {
          break;
        }
      }
      fiber = fiber.return ?? null;
    }
  }
  return false;
}
function openLauncherMenu() {
  const launcher = document.querySelector(LAUNCHER_SELECTOR);
  if (launcher === null) return false;
  if (launcher.getAttribute("aria-expanded") !== "true") launcher.click();
  return true;
}
function clickMenuSettings() {
  for (const item of document.querySelectorAll('[role="menuitem"]')) {
    if (item.closest(OUR_ROOTS) !== null) continue;
    const text = (item.textContent ?? "").trim();
    if (!MENU_SETTINGS_LABELS.some((label) => text === label || text.startsWith(label))) continue;
    item.click();
    return true;
  }
  return false;
}
function openBongoCatSettings(label) {
  const panelOpen = () => document.querySelector(SETTINGS_PANEL_SELECTOR) !== null;
  let menuOpened = false;
  if (!panelOpen()) {
    let opened = openThroughLauncher();
    if (!opened) {
      const trigger = document.querySelector(DIALOG_TRIGGER_SELECTOR);
      if (trigger !== null) {
        if (trigger.getAttribute("aria-expanded") !== "true") trigger.click();
        opened = true;
      }
    }
    if (!opened) {
      menuOpened = openLauncherMenu();
      if (!menuOpened) return false;
    }
  }
  const schedule = [80, 200, 420, 700, 1100, 1600, 2200];
  const attempt = (index) => {
    if (menuOpened && !panelOpen()) clickMenuSettings();
    if (selectSection(label)) return;
    if (index + 1 >= schedule.length) return;
    window.setTimeout(() => attempt(index + 1), schedule[index + 1] - schedule[index]);
  };
  window.setTimeout(() => attempt(0), schedule[0]);
  return true;
}

// src/client/sound.ts
var BongoSound = class {
  ctx = null;
  custom = null;
  customUrl = null;
  volume = 0.6;
  lastTok = 0;
  /** Ensure (and resume) the AudioContext; call from a user gesture. */
  ensure() {
    if (this.custom !== null) return null;
    if (this.ctx === null) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }
  setVolume(volume) {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.custom !== null) this.custom.volume = this.volume;
  }
  /** Suspend the AudioContext while the page is hidden (power saving). */
  suspend() {
    if (this.ctx !== null && this.ctx.state === "running") void this.ctx.suspend();
  }
  /** Resume after the page becomes visible again. */
  resume() {
    if (this.ctx !== null && this.ctx.state === "suspended") void this.ctx.resume();
  }
  /** Point the engine at an imported sound; pass 0 to fall back to synth. */
  setCustomUrl(url) {
    if (url === this.customUrl) return;
    this.customUrl = url;
    this.custom = null;
  }
  /** One tap. Rate > 1 raises the pitch (used by freak mode). */
  tok(rate = 1) {
    if (this.customUrl !== null) {
      this.playCustom();
      return;
    }
    const now = performance.now();
    if (now - this.lastTok < 40) return;
    this.lastTok = now;
    const ctx = this.ensure();
    if (ctx === null || this.volume <= 0) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(340 * rate, t);
    osc.frequency.exponentialRampToValueAtTime(150 * rate, t + 0.07);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(1e-3, t + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
    const frames = Math.floor(ctx.sampleRate * 0.02);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(1e-3, t + 0.03);
    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(t);
  }
  /** A softer rising blip, used when petting the cat. */
  boop() {
    if (this.customUrl !== null) {
      this.playCustom();
      return;
    }
    const ctx = this.ensure();
    if (ctx === null || this.volume <= 0) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(1e-3, t + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }
  playCustom() {
    if (this.custom === null && this.customUrl !== null) {
      this.custom = new Audio(this.customUrl);
      this.custom.volume = this.volume;
    }
    void this.custom?.play().catch(() => void 0);
  }
  dispose() {
    void this.ctx?.close().catch(() => void 0);
    this.ctx = null;
    this.custom = null;
    this.customUrl = null;
  }
};

// src/client/cat.module.css
var css3 = "/* Bongo Cat overlay \u2014 original Steam artwork + counter badge.\n   Class names are scoped by the build script's CSS-modules pass; cat._bc_ts_1euy1p2\n   imports the generated map. */\n\n._bc_bc-root_1gfw1wb {\n  position: fixed;\n  z-index: 9999;\n  user-select: none;\n  -webkit-user-select: none;\n  touch-action: none;\n  font-family: inherit;\n  filter: drop-shadow(0 6px 14px rgba(30, 34, 48, 0.18));\n}\n\n/* click feedback: a short squash, then the settings panel opens */\n._bc_bc-root_1gfw1wb._bc_bc-poked_7kg7vs ._bc_bc-stage_6z6yop {\n  animation: bc-poke 260ms ease-out;\n}\n\n@keyframes bc-poke {\n  0% { transform: scale(1); }\n  35% { transform: scale(1.05, 0.94); }\n  70% { transform: scale(0.98, 1.02); }\n  100% { transform: scale(1); }\n}\n\n._bc_bc-hint_t2xew6 {\n  position: absolute;\n  left: 50%;\n  top: -26px;\n  z-index: 2;\n  transform: translateX(-50%);\n  padding: 3px 9px;\n  border-radius: 999px;\n  background: rgba(24, 26, 38, 0.82);\n  color: #fff;\n  font-size: 11px;\n  line-height: 1.5;\n  white-space: nowrap;\n  pointer-events: none;\n  opacity: 0;\n  transition: opacity 140ms ease;\n}\n\n._bc_bc-stage_6z6yop:hover ._bc_bc-hint_t2xew6 {\n  opacity: 1;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  ._bc_bc-root_1gfw1wb._bc_bc-poked_7kg7vs ._bc_bc-stage_6z6yop { animation: none; }\n}\n\n._bc_bc-root_1gfw1wb._bc_bc-is-dragging_1iho57h {\n  cursor: grabbing;\n  filter: drop-shadow(0 12px 22px rgba(30, 34, 48, 0.28));\n}\n\n._bc_bc-stage_6z6yop {\n  position: relative;\n  width: 150px;\n  cursor: grab;\n}\n\n._bc_bc-root_1gfw1wb._bc_bc-is-dragging_1iho57h ._bc_bc-stage_6z6yop {\n  cursor: grabbing;\n}\n\n/* \u2500\u2500 original artwork frames \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-native_w330fw {\n  display: none;\n  position: relative;\n  width: 100%;\n  line-height: 0;\n}\n\n._bc_bc-root_1gfw1wb._bc_bc-native-mode_1ud1oqa ._bc_bc-native_w330fw {\n  display: block;\n}\n\n._bc_bc-native-img_k0v3le {\n  display: none;\n  width: 100%;\n  height: auto;\n  user-select: none;\n  -webkit-user-drag: none;\n}\n\n._bc_bc-native_w330fw[data-active='idle'] ._bc_bc-native-img_k0v3le[data-frame='idle'],\n._bc_bc-native_w330fw[data-active='tap-left'] ._bc_bc-native-img_k0v3le[data-frame='tap-left'],\n._bc_bc-native_w330fw[data-active='tap-right'] ._bc_bc-native-img_k0v3le[data-frame='tap-right'] {\n  display: block;\n}\n\n/* \u2500\u2500 placeholder when no original artwork is available \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-empty_kq2ts8 {\n  display: none;\n  padding: 10px 12px;\n  border-radius: 10px;\n  background: rgba(24, 26, 38, 0.86);\n  color: #fff;\n  font-size: 12px;\n  line-height: 1.5;\n  text-align: center;\n}\n\n._bc_bc-root_1gfw1wb._bc_bc-empty-mode_6q3thi ._bc_bc-empty_kq2ts8 {\n  display: block;\n}\n\n/* \u2500\u2500 user-imported sprite strip \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-sprite_1wl86c4 {\n  display: none;\n  width: 100%;\n  aspect-ratio: 4 / 3;\n  background-repeat: no-repeat;\n  background-position: 0 50%;\n  background-size: 400% 100%;\n}\n\n._bc_bc-root_1gfw1wb._bc_bc-sprite-mode_fpujiy ._bc_bc-sprite_1wl86c4 {\n  display: block;\n}\n\n._bc_bc-root_1gfw1wb._bc_bc-sprite-mode_fpujiy ._bc_bc-native_w330fw,\n._bc_bc-root_1gfw1wb._bc_bc-sprite-mode_fpujiy ._bc_bc-empty_kq2ts8 {\n  display: none;\n}\n\n/* \u2500\u2500 tap state (frames already convey the hit; class kept for tests) \u2500\u2500 */\n._bc_bc-root_1gfw1wb._bc_bc-tap-left_kmrnce ._bc_bc-native_w330fw,\n._bc_bc-root_1gfw1wb._bc_bc-tap-right_1x2607p ._bc_bc-native_w330fw {\n  transform: translateY(1px);\n}\n\n/* \u2500\u2500 counter badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-badge_1sglz5k {\n  position: absolute;\n  right: -6px;\n  bottom: -4px;\n  display: flex;\n  align-items: center;\n  gap: 3px;\n  padding: 2px 8px;\n  border-radius: 999px;\n  background: rgba(24, 26, 38, 0.82);\n  color: #fff;\n  font-size: 11px;\n  font-variant-numeric: tabular-nums;\n  line-height: 1.6;\n  pointer-events: none;\n}\n\n._bc_bc-badge-drum_ovan7f {\n  font-size: 10px;\n}\n\n._bc_bc-badge-count_sntbq {\n  font-weight: 600;\n}\n\n/* \u2500\u2500 first-run hint toast \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-toast_udulgg {\n  position: absolute;\n  bottom: calc(100% + 10px);\n  left: 50%;\n  transform: translateX(-50%);\n  width: max-content;\n  max-width: 220px;\n  padding: 7px 12px;\n  border-radius: 10px;\n  background: rgba(24, 26, 38, 0.86);\n  color: #fff;\n  font-size: 12px;\n  line-height: 1.5;\n  text-align: center;\n  pointer-events: none;\n  box-shadow: 0 4px 16px rgba(20, 24, 40, 0.3);\n  animation: bc-toast-in 240ms ease-out;\n}\n\n@keyframes bc-toast-in {\n  from { opacity: 0; transform: translateX(-50%) translateY(6px); }\n  to { opacity: 1; transform: translateX(-50%) translateY(0); }\n}\n\n/* automatic drop toast: the granted sticker's art plus its label */\n._bc_bc-toast_udulgg[data-role='bongo-cat-drop'] {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  text-align: left;\n}\n\n._bc_bc-toast-art_i7yrgq {\n  display: inline-flex;\n  flex: none;\n  width: 18px;\n  height: 18px;\n}\n\n._bc_bc-toast-art_i7yrgq img {\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: contain;\n}\n\n/* hidden tab: freeze anything animated (frames are static, kept for parity) */\n._bc_bc-root_1gfw1wb._bc_bc-paused_trpwq3 {\n  animation-play-state: paused;\n}\n";
var tagId4 = "dsh-plugin-bongo-cat/src/client/cat.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId4) + "]") === null) {
  tag4 = document.createElement("style");
  tag4.dataset.plugin = "dsh-plugin-bongo-cat";
  tag4.dataset.pluginCss = tagId4;
  tag4.textContent = css3;
  document.head.appendChild(tag4);
}
var tag4;
var cat_default = { "ts": "_bc_ts_1euy1p2", "bc-root": "_bc_bc-root_1gfw1wb", "bc-poked": "_bc_bc-poked_7kg7vs", "bc-stage": "_bc_bc-stage_6z6yop", "bc-hint": "_bc_bc-hint_t2xew6", "bc-is-dragging": "_bc_bc-is-dragging_1iho57h", "bc-native": "_bc_bc-native_w330fw", "bc-native-mode": "_bc_bc-native-mode_1ud1oqa", "bc-native-img": "_bc_bc-native-img_k0v3le", "bc-empty": "_bc_bc-empty_kq2ts8", "bc-empty-mode": "_bc_bc-empty-mode_6q3thi", "bc-sprite": "_bc_bc-sprite_1wl86c4", "bc-sprite-mode": "_bc_bc-sprite-mode_fpujiy", "bc-tap-left": "_bc_bc-tap-left_kmrnce", "bc-tap-right": "_bc_bc-tap-right_1x2607p", "bc-badge": "_bc_bc-badge_1sglz5k", "bc-badge-drum": "_bc_bc-badge-drum_ovan7f", "bc-badge-count": "_bc_bc-badge-count_sntbq", "bc-toast": "_bc_bc-toast_udulgg", "bc-toast-art": "_bc_bc-toast-art_i7yrgq", "bc-paused": "_bc_bc-paused_trpwq3" };

// src/client/cat.ts
var ROOT_ID = "dsh-bongo-cat-root";
var BASE_WIDTH = 150;
var TAP_MS = 100;
var NATIVE_FRAMES = ["idle", "tap-left", "tap-right"];
var STATS_FLUSH_TAPS = 20;
var STATS_FLUSH_MS = 4e3;
var CORNER_CYCLE = ["bottom-right", "bottom-left", "top-left", "top-right"];
var StatsFlusher = class {
  constructor(rpc, onResult) {
    this.rpc = rpc;
    this.onResult = onResult;
  }
  rpc;
  onResult;
  pending = 0;
  timer = null;
  inFlight = null;
  disposed = false;
  add(count) {
    this.pending += count;
    if (this.pending >= STATS_FLUSH_TAPS) {
      void this.flush();
      return;
    }
    if (this.timer === null) {
      this.timer = window.setTimeout(() => {
        this.timer = null;
        void this.flush();
      }, STATS_FLUSH_MS);
    }
  }
  async flush() {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.inFlight !== null) return this.inFlight;
    if (this.pending === 0) return;
    const sent = this.pending;
    this.pending = 0;
    this.inFlight = (async () => {
      try {
        const result = await this.rpc.call("/bongo-cat", "stats/bump", { count: sent });
        if (result.ok) this.onResult(result.value, sent);
        else this.pending += sent;
      } catch {
        this.pending += sent;
      }
    })();
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
    }
    if (!this.disposed && this.pending >= STATS_FLUSH_TAPS) void this.flush();
  }
  dispose() {
    this.disposed = true;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    if (this.pending > 0 && this.inFlight === null) void this.flush();
  }
};
function attachBongoCat(ctx, store, rpc, t) {
  if (document.getElementById(ROOT_ID) !== null) return () => void 0;
  const sound = new BongoSound();
  let unsentTaps = 0;
  const stats = new StatsFlusher(rpc, (result, sent) => {
    unsentTaps = Math.max(0, unsentTaps - sent);
    store.applyHostState({
      counter: result.counter,
      ...result.lifetimeTaps === void 0 ? {} : { lifetimeTaps: result.lifetimeTaps },
      ...result.wardrobe === void 0 ? {} : { wardrobe: result.wardrobe }
    });
    if (result.granted !== void 0 && result.granted.length > 0) showDropToast(result.granted);
  });
  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.className = cat_default["bc-root"];
  root.dataset.plugin = "dsh-plugin-bongo-cat";
  const stage = document.createElement("div");
  stage.className = cat_default["bc-stage"];
  stage.title = t ? t("openSettingsHint") : "Click for settings";
  const sprite = document.createElement("div");
  sprite.className = cat_default["bc-sprite"];
  const nativeWrap = document.createElement("div");
  nativeWrap.className = cat_default["bc-native"];
  nativeWrap.dataset.role = "bongo-cat-native";
  const nativeImgs = {};
  for (const frame of NATIVE_FRAMES) {
    const img = document.createElement("img");
    img.className = cat_default["bc-native-img"];
    img.dataset.frame = frame;
    img.alt = "";
    img.draggable = false;
    img.addEventListener("load", () => {
      if (settings !== null && !disposed) applyPosition(settings);
    });
    nativeImgs[frame] = img;
    nativeWrap.append(img);
  }
  nativeWrap.dataset.active = "idle";
  const decorBack = document.createElement("div");
  decorBack.className = "bc-decor";
  decorBack.dataset.role = DECOR_BACK_ROLE;
  decorBack.setAttribute("aria-hidden", "true");
  const decor = document.createElement("div");
  decor.className = "bc-decor";
  decor.dataset.role = DECOR_ROLE;
  decor.setAttribute("aria-hidden", "true");
  const empty = document.createElement("div");
  empty.className = cat_default["bc-empty"];
  empty.dataset.role = "bongo-cat-empty";
  empty.textContent = t ? t("nativeMissingShort") : "\u8BF7\u5148\u5728\u8BBE\u7F6E\u91CC\u5BFC\u5165\u539F\u7248\u8D44\u6E90";
  const badge = document.createElement("div");
  badge.className = cat_default["bc-badge"];
  badge.dataset.role = "bongo-cat-counter";
  const drum = document.createElement("span");
  drum.className = cat_default["bc-badge-drum"];
  drum.textContent = "\u{1F941}";
  const count = document.createElement("span");
  count.className = cat_default["bc-badge-count"];
  count.textContent = "0";
  badge.append(drum, count);
  const hint = document.createElement("div");
  hint.className = cat_default["bc-hint"];
  hint.dataset.role = "bongo-cat-hint-chip";
  hint.textContent = t ? t("openSettings") : "Settings";
  stage.append(decorBack, sprite, nativeWrap, decor, empty, badge, hint);
  root.append(stage);
  document.body.append(root);
  let settings = null;
  let disposed = false;
  let paused = false;
  let nextSide = "left";
  let tapTimer = null;
  let spriteIdleTimer = null;
  let hintToastTimer = null;
  let dropToastTimer = null;
  let nativeStatus = { available: false };
  let nativeStamp = "";
  let nativeFrame = "idle";
  const cls = (name) => cat_default[name] ?? name;
  const applySprite = (next) => {
    const active = next.customSkinRevision > 0;
    root.classList.toggle(cls("bc-sprite-mode"), active);
    if (!active) return;
    const frames = Math.min(12, Math.max(2, next.customSkinFrames));
    sprite.style.backgroundImage = `url("${skinUrl(next.customSkinRevision)}")`;
    sprite.style.backgroundSize = `${frames * 100}% 100%`;
    sprite.style.backgroundPosition = "0 50%";
  };
  const stageHeight = (width) => {
    if (root.classList.contains(cls("bc-sprite-mode"))) return Math.round(width * 0.75);
    const img = nativeImgs.idle;
    if (img !== void 0 && img.naturalWidth > 0 && img.naturalHeight > 0) {
      return Math.round(width * img.naturalHeight / img.naturalWidth);
    }
    return Math.round(width * 501 / 777);
  };
  const applyPosition = (next) => {
    const width = Math.round(BASE_WIDTH * next.size);
    stage.style.width = `${width}px`;
    const height = stage.offsetHeight || stageHeight(width);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left;
    let top;
    if (next.position === "bottom-right") {
      left = vw - next.offsetX - width;
      top = vh - next.offsetY - height;
    } else if (next.position === "bottom-left") {
      left = next.offsetX;
      top = vh - next.offsetY - height;
    } else if (next.position === "top-left") {
      left = next.offsetX;
      top = next.offsetY;
    } else {
      left = vw - next.offsetX - width;
      top = next.offsetY;
    }
    root.style.left = `${Math.round(left)}px`;
    root.style.top = `${Math.round(top)}px`;
  };
  const applyBadge = (next) => {
    badge.style.display = next.showCounter ? "" : "none";
    count.textContent = (next.counter + unsentTaps).toLocaleString();
  };
  const applySound = (next) => {
    sound.setVolume(next.soundEnabled ? next.volume : 0);
    sound.setCustomUrl(next.customSoundRevision > 0 ? soundUrl(next.customSoundRevision) : null);
  };
  const applySpeed = (next) => {
    root.style.setProperty("--bc-speed", String(Math.min(2.5, Math.max(0.5, next.speed))));
  };
  let cosmeticKey = "";
  let catalog = { stamp: "", size: [1, 1], items: [] };
  const applyCosmetics = (next) => {
    const wardrobe = next.wardrobe;
    const box = (nativeStatus.box ?? []).join(",");
    const key = `${catalog.stamp}|${box}|${wardrobe.fur}|${wardrobe.equipped.hat ?? ""}|${wardrobe.equipped.face ?? ""}|${wardrobe.equipped.back ?? ""}|${wardrobe.equipped.accessory ?? ""}`;
    if (key !== cosmeticKey) {
      cosmeticKey = key;
      decor.innerHTML = cosmeticMarkup(wardrobe, catalog, "front", nativeStatus.box);
      decorBack.innerHTML = cosmeticMarkup(wardrobe, catalog, "back", nativeStatus.box);
    }
    const filter = artworkFilter(wardrobe);
    if (nativeWrap.style.filter !== filter) {
      nativeWrap.style.filter = filter;
      sprite.style.filter = filter;
    }
  };
  const applyNativeSources = () => {
    if (!nativeStatus.available) return;
    const stamp = nativeStamp || nativeStatus.extractedAt || "1";
    const blanked = settings !== null && settings.wardrobe.equipped.face !== null;
    for (const frame of NATIVE_FRAMES) {
      const img = nativeImgs[frame];
      if (!img) continue;
      const url = nativeFrameUrl(frame, stamp, blanked ? nativeStatus.faceFrames?.[frame] : void 0);
      if (img.getAttribute("src") !== url) img.src = url;
    }
  };
  const applyMode = (next) => {
    const custom = next.customSkinRevision > 0;
    const native = !custom && nativeStatus.available;
    root.classList.toggle(cls("bc-native-mode"), native);
    root.classList.toggle(cls("bc-empty-mode"), !custom && !native);
    nativeWrap.style.display = native ? "" : "none";
    empty.style.display = !custom && !native ? "" : "none";
    const dressed = custom || native;
    decor.style.display = dressed ? "" : "none";
    decorBack.style.display = dressed ? "" : "none";
    if (native) applyNativeSources();
  };
  const setNativeFrame = (frame) => {
    if (nativeFrame === frame) return;
    nativeFrame = frame;
    nativeWrap.dataset.active = frame;
  };
  const refreshNative = async () => {
    const result = await rpc.call("/bongo-cat", "native/status", {});
    nativeStatus = result.ok ? result.value : { available: false };
    nativeStamp = nativeStatus.extractedAt ?? "";
    if (disposed || settings === null) return;
    applyMode(settings);
    applyPosition(settings);
    applyCosmetics(settings);
  };
  const refreshCosmetics = async () => {
    const result = await rpc.call("/bongo-cat", "cosmetics/catalog", {});
    if (disposed) return;
    catalog = result.ok ? result.value : { stamp: "", size: [1, 1], items: [] };
    if (settings !== null) applyCosmetics(settings);
  };
  const paint = (next) => {
    const prev = settings;
    settings = next;
    if (prev === null || prev.customSkinRevision !== next.customSkinRevision || prev.customSkinFrames !== next.customSkinFrames) {
      applySprite(next);
    }
    applySpeed(next);
    applyPosition(next);
    applyBadge(next);
    applySound(next);
    applyCosmetics(next);
    applyMode(next);
    root.style.display = next.enabled ? "" : "none";
    maybeShowHint(next);
  };
  const maybeShowHint = (next) => {
    if (next.hintSeen || !next.enabled || hintToastTimer !== null) return;
    hintToastTimer = window.setTimeout(() => {
      hintToastTimer = null;
      if (disposed || settings === null || settings.hintSeen) return;
      const toast = document.createElement("div");
      toast.className = cat_default["bc-toast"];
      toast.dataset.role = "bongo-cat-hint";
      toast.textContent = t ? t("hintToast") : "\u6253\u5B57\u3001\u70B9\u9F20\u6807\uFF0C\u732B\u5C31\u4F1A\u6572\u8D77\u6765\uFF01";
      root.append(toast);
      window.setTimeout(() => toast.remove(), 6e3);
      void store.set({ hintSeen: true });
    }, 800);
  };
  const showDropToast = (grants) => {
    if (disposed) return;
    const first = grants[0];
    const item = first === void 0 ? void 0 : itemById(catalog.items, first.id);
    const toast = document.createElement("div");
    toast.className = cat_default["bc-toast"];
    toast.dataset.role = "bongo-cat-drop";
    const art = document.createElement("span");
    art.className = cat_default["bc-toast-art"];
    if (item !== void 0) {
      const img = document.createElement("img");
      img.src = cosmeticIconUrl(item.id, catalog.stamp);
      img.alt = "";
      img.draggable = false;
      art.append(img);
    }
    const text = document.createElement("span");
    const label = t ? t("wardrobeDrop") : "New cosmetic";
    const slot = item === void 0 ? "" : item.slot === "hat" ? t ? t("wardrobeHat") : "Hats" : item.slot === "face" ? t ? t("wardrobeFace") : "Face" : item.slot === "back" ? t ? t("wardrobeBack") : "Wings" : t ? t("wardrobeAccessory") : "Extras";
    text.textContent = grants.length > 1 ? `${label} \xD7${grants.length}` : `${label} \xB7 ${slot}`;
    toast.append(art, text);
    root.append(toast);
    if (dropToastTimer !== null) window.clearTimeout(dropToastTimer);
    dropToastTimer = window.setTimeout(() => {
      toast.remove();
      dropToastTimer = null;
    }, 4200);
  };
  const setTap = (side) => {
    root.classList.remove(cls("bc-tap-left"), cls("bc-tap-right"));
    void root.offsetWidth;
    root.classList.add(cls(`bc-tap-${side}`));
    setNativeFrame(side === "left" ? "tap-left" : "tap-right");
    if (tapTimer !== null) window.clearTimeout(tapTimer);
    tapTimer = window.setTimeout(() => {
      root.classList.remove(cls("bc-tap-left"), cls("bc-tap-right"));
      setNativeFrame("idle");
      tapTimer = null;
    }, TAP_MS);
  };
  const setSpriteFrame = (frame) => {
    if (settings === null || settings.customSkinRevision <= 0) return;
    const frames = Math.min(12, Math.max(2, settings.customSkinFrames));
    const safe = Math.min(frame, frames - 1);
    sprite.style.backgroundPosition = `${safe / (frames - 1) * 100}% 50%`;
    if (spriteIdleTimer !== null) window.clearTimeout(spriteIdleTimer);
    spriteIdleTimer = window.setTimeout(() => {
      sprite.style.backgroundPosition = "0 50%";
      spriteIdleTimer = null;
    }, Math.max(120, TAP_MS * 4));
  };
  const slap = (side) => {
    if (settings === null || paused) return;
    setTap(side);
    setSpriteFrame(side === "left" ? 1 : 2);
    if (settings.soundEnabled) sound.tok(1);
    unsentTaps += 1;
    applyBadge(settings);
    stats.add(1);
  };
  const slapNext = () => {
    const side = nextSide;
    nextSide = side === "left" ? "right" : "left";
    slap(side);
  };
  const cycleCorner = () => {
    if (settings === null) return;
    const index = CORNER_CYCLE.indexOf(settings.position);
    const next = CORNER_CYCLE[(index + 1) % CORNER_CYCLE.length];
    void store.set({ position: next });
  };
  const onKeyDown = (event) => {
    if (disposed || settings === null || !settings.enabled) return;
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Shift" || event.key === "CapsLock") return;
    slapNext();
  };
  const onPointerDown = (event) => {
    if (disposed || settings === null || !settings.enabled) return;
    if (event.button !== 0) return;
    const target = event.target;
    if (target !== null && root.contains(target)) return;
    slapNext();
  };
  let dragStart = null;
  let dragging = false;
  const onStagePointerDown = (event) => {
    if (event.button !== 0) return;
    if (openTimer !== null) {
      window.clearTimeout(openTimer);
      openTimer = null;
      clickCandidate = true;
    }
    dragStart = { x: event.clientX, y: event.clientY, left: root.offsetLeft, top: root.offsetTop };
    stage.setPointerCapture?.(event.pointerId);
  };
  const onStagePointerMove = (event) => {
    if (dragStart === null) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    if (!dragging && Math.hypot(dx, dy) < 5) return;
    dragging = true;
    root.classList.add(cls("bc-is-dragging"));
    const width = stage.offsetWidth;
    const height = stage.offsetHeight;
    const left = Math.min(Math.max(0, dragStart.left + dx), window.innerWidth - width);
    const top = Math.min(Math.max(0, dragStart.top + dy), window.innerHeight - height);
    root.style.left = `${Math.round(left)}px`;
    root.style.top = `${Math.round(top)}px`;
  };
  const onStagePointerUp = (event) => {
    stage.releasePointerCapture?.(event.pointerId);
    if (!dragging) {
      dragStart = null;
      return;
    }
    dragging = false;
    suppressClick = true;
    window.setTimeout(() => {
      suppressClick = false;
    }, 400);
    root.classList.remove(cls("bc-is-dragging"));
    const start = dragStart;
    dragStart = null;
    if (start === null || settings === null) return;
    const width = stage.offsetWidth;
    const height = stage.offsetHeight;
    const left = root.offsetLeft;
    const top = root.offsetTop;
    const right = window.innerWidth - (left + width);
    const bottom = window.innerHeight - (top + height);
    const position = right <= left && bottom <= top ? "bottom-right" : left < right && bottom <= top ? "bottom-left" : left < right && top < bottom ? "top-left" : "top-right";
    void store.set({
      position,
      offsetX: Math.round(Math.min(left, right)),
      offsetY: Math.round(Math.min(top, bottom))
    });
  };
  let suppressClick = false;
  let openTimer = null;
  let pokeTimer = null;
  let clickCandidate = false;
  const poke = () => {
    root.classList.add(cls("bc-poked"));
    if (pokeTimer !== null) window.clearTimeout(pokeTimer);
    pokeTimer = window.setTimeout(() => {
      root.classList.remove(cls("bc-poked"));
      pokeTimer = null;
    }, 260);
  };
  const onStageClick = (event) => {
    if (suppressClick) {
      suppressClick = false;
      clickCandidate = false;
      return;
    }
    if (event.detail > 1 || clickCandidate) {
      clickCandidate = false;
      if (openTimer !== null) {
        window.clearTimeout(openTimer);
        openTimer = null;
      }
      cycleCorner();
      return;
    }
    if (openTimer !== null) window.clearTimeout(openTimer);
    openTimer = window.setTimeout(() => {
      openTimer = null;
      poke();
      openBongoCatSettings(t ? t("nav") : "Bongo Cat");
    }, 240);
  };
  const onVisibilityChange = () => {
    if (disposed) return;
    const hidden = document.visibilityState === "hidden";
    if (hidden === paused) return;
    paused = hidden;
    root.classList.toggle(cls("bc-paused"), paused);
    if (paused) sound.suspend();
    else sound.resume();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  let resizeRaf = 0;
  const onResize = () => {
    if (resizeRaf !== 0) return;
    resizeRaf = window.requestAnimationFrame(() => {
      resizeRaf = 0;
      if (settings !== null) applyPosition(settings);
    });
  };
  const unsubscribe = store.subscribe(() => {
    const snapshot = store.getSnapshot();
    if (snapshot.status !== "ready" || snapshot.value === void 0) return;
    paint(snapshot.value);
  });
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("resize", onResize);
  stage.addEventListener("pointerdown", onStagePointerDown);
  stage.addEventListener("pointermove", onStagePointerMove);
  stage.addEventListener("pointerup", onStagePointerUp);
  stage.addEventListener("pointercancel", onStagePointerUp);
  stage.addEventListener("click", onStageClick);
  const onPageHide = () => {
    void stats.flush();
  };
  window.addEventListener("pagehide", onPageHide);
  const onNativeChanged = () => {
    void refreshNative();
    void refreshCosmetics();
  };
  window.addEventListener("bongo-cat:native-changed", onNativeChanged);
  void refreshNative();
  void refreshCosmetics();
  const initial = store.getSnapshot();
  if (initial.status === "ready" && initial.value !== void 0) paint(initial.value);
  return () => {
    disposed = true;
    window.clearTimeout(tapTimer ?? 0);
    window.clearTimeout(hintToastTimer ?? 0);
    window.clearTimeout(dropToastTimer ?? 0);
    if (openTimer !== null) window.clearTimeout(openTimer);
    if (pokeTimer !== null) window.clearTimeout(pokeTimer);
    if (spriteIdleTimer !== null) window.clearTimeout(spriteIdleTimer);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("bongo-cat:native-changed", onNativeChanged);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pagehide", onPageHide);
    stage.removeEventListener("pointerdown", onStagePointerDown);
    stage.removeEventListener("pointermove", onStagePointerMove);
    stage.removeEventListener("pointerup", onStagePointerUp);
    stage.removeEventListener("pointercancel", onStagePointerUp);
    stage.removeEventListener("click", onStageClick);
    unsubscribe();
    stats.dispose();
    sound.dispose();
    root.remove();
  };
}

// src/client/widgets/widgets.css
var tagId5 = "dsh-plugin-bongo-cat/src/client/widgets/widgets.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId5) + "]") === null) {
  tag5 = document.createElement("style");
  tag5.dataset.plugin = "dsh-plugin-bongo-cat";
  tag5.dataset.pluginCss = tagId5;
  tag5.textContent = '/**\n * Widget dock styles (global, not CSS-module scoped).\n *\n * Class names are a private contract between `dock.ts` / the widget modules\n * and this file. Everything is namespaced with `bc-widget`, so nothing here\n * can collide with the host application.\n *\n * Colours follow the OS/IDE theme through `prefers-color-scheme`, matching how\n * the rest of the plugin renders: light cards on light shells, and a dark\n * translucent surface when the IDE is dark.\n */\n\n.bc-widget-layer {\n  position: fixed;\n  inset: 0;\n  z-index: 9998;\n  pointer-events: none;\n  font-family: inherit;\n  font-size: 13px;\n  line-height: 1.35;\n}\n\n.bc-widget {\n  position: absolute;\n  min-width: 132px;\n  padding: 0;\n  border-radius: 12px;\n  border: 1px solid rgba(30, 34, 48, 0.1);\n  background: rgba(255, 255, 255, 0.94);\n  color: #1f2430;\n  box-shadow: 0 8px 22px rgba(30, 34, 48, 0.14);\n  backdrop-filter: blur(8px);\n  pointer-events: auto;\n  user-select: none;\n  -webkit-user-select: none;\n  touch-action: none;\n  transition: box-shadow 120ms ease, opacity 120ms ease;\n}\n\n.bc-widget[data-dragging="true"] {\n  box-shadow: 0 16px 34px rgba(30, 34, 48, 0.24);\n  transition: none;\n}\n\n.bc-widget[data-size="sm"] { min-width: 132px; }\n.bc-widget[data-size="md"] { min-width: 216px; }\n\n.bc-widget-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 8px 10px 0;\n  cursor: grab;\n}\n\n.bc-widget[data-dragging="true"] .bc-widget-head { cursor: grabbing; }\n\n.bc-widget-title {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  opacity: 0.55;\n  white-space: nowrap;\n}\n\n.bc-widget-grip {\n  font-size: 12px;\n  opacity: 0.35;\n  letter-spacing: 1px;\n}\n\n.bc-widget-body { padding: 4px 12px 12px; }\n\n/* \u2500\u2500 clock \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.bc-widget-clock-time {\n  font-size: 26px;\n  font-weight: 600;\n  font-variant-numeric: tabular-nums;\n  letter-spacing: 0.01em;\n}\n\n.bc-widget-clock-date {\n  margin-top: 2px;\n  font-size: 11px;\n  opacity: 0.55;\n}\n\n/* \u2500\u2500 counter \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.bc-widget-counter-value {\n  font-size: 26px;\n  font-weight: 600;\n  font-variant-numeric: tabular-nums;\n}\n\n.bc-widget-counter-label {\n  font-size: 11px;\n  opacity: 0.55;\n}\n\n/* \u2500\u2500 focus \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.bc-widget-focus-time {\n  font-size: 26px;\n  font-weight: 600;\n  font-variant-numeric: tabular-nums;\n}\n\n.bc-widget-focus-bar {\n  height: 4px;\n  margin: 6px 0 10px;\n  border-radius: 999px;\n  background: rgba(30, 34, 48, 0.12);\n  overflow: hidden;\n}\n\n.bc-widget-focus-fill {\n  height: 100%;\n  width: 100%;\n  border-radius: 999px;\n  background: #4c8dff;\n  transition: width 200ms linear;\n}\n\n.bc-widget[data-size="md"] .bc-widget-focus-bar { height: 5px; }\n\n.bc-widget-focus-actions {\n  display: flex;\n  gap: 6px;\n}\n\n.bc-widget-button {\n  padding: 3px 10px;\n  border: 1px solid transparent;\n  border-radius: 7px;\n  background: #4c8dff;\n  color: #fff;\n  font: inherit;\n  font-size: 11px;\n  cursor: pointer;\n}\n\n.bc-widget-button:hover { filter: brightness(1.05); }\n\n.bc-widget-button-ghost {\n  background: transparent;\n  border-color: rgba(30, 34, 48, 0.16);\n  color: inherit;\n}\n\n.bc-widget-button:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n/* \u2500\u2500 dark shell \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n@media (prefers-color-scheme: dark) {\n  .bc-widget {\n    border-color: rgba(255, 255, 255, 0.1);\n    background: rgba(28, 32, 42, 0.94);\n    color: #e8ebf2;\n    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45);\n  }\n\n  .bc-widget[data-dragging="true"] {\n    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.55);\n  }\n\n  .bc-widget-focus-bar { background: rgba(255, 255, 255, 0.14); }\n\n  .bc-widget-button-ghost {\n    border-color: rgba(255, 255, 255, 0.18);\n    color: inherit;\n  }\n\n}\n';
  document.head.appendChild(tag5);
}
var tag5;

// src/client/widgets/dock.ts
var LAYER_ID = "dsh-bongo-cat-widgets";
var DRAG_MARGIN = 8;
function attachWidgetDock(store, rpc, t, isLoopback) {
  if (document.getElementById(LAYER_ID) !== null) return () => void 0;
  const layer = document.createElement("div");
  layer.id = LAYER_ID;
  layer.className = "bc-widget-layer";
  layer.dataset.role = "bongo-cat-widgets";
  document.body.append(layer);
  const mounted = /* @__PURE__ */ new Map();
  let topZ = 10;
  let disposed = false;
  const clamp = (value, max) => Math.max(DRAG_MARGIN, Math.min(value, Math.max(DRAG_MARGIN, max)));
  const seat = (card, instance) => {
    const width = card.offsetWidth || 160;
    const height = card.offsetHeight || 80;
    card.style.left = `${clamp(instance.x, window.innerWidth - width - DRAG_MARGIN)}px`;
    card.style.top = `${clamp(instance.y, window.innerHeight - height - DRAG_MARGIN)}px`;
  };
  const persist = (instance) => {
    const current = store.getSnapshot().value;
    if (current === null || current === void 0) return;
    const next = withWidget(current.widgets, instance.id, { x: instance.x, y: instance.y });
    void store.set({ widgets: next });
  };
  const makeCard = (instance) => {
    const definition = widgetDefinition(instance.type);
    if (definition === void 0) return null;
    const card = document.createElement("section");
    card.className = "bc-widget";
    card.dataset.widgetId = instance.id;
    card.dataset.widgetType = instance.type;
    card.dataset.size = instance.size;
    card.style.opacity = String(instance.opacity);
    const head = document.createElement("header");
    head.className = "bc-widget-head";
    head.dataset.role = "widget-drag";
    const title = document.createElement("span");
    title.className = "bc-widget-title";
    title.textContent = t(definition.labelKey);
    const grip = document.createElement("span");
    grip.className = "bc-widget-grip";
    grip.setAttribute("aria-hidden", "true");
    grip.textContent = "\u283F";
    head.append(title, grip);
    const body = document.createElement("div");
    body.className = "bc-widget-body";
    card.append(head, body);
    layer.append(card);
    const handle = definition.mount(body, { instance, t, rpc, store, isLoopback });
    const record = { card, handle, instance };
    seat(card, instance);
    let dragging = null;
    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (target !== null && target.closest("button, a, input, select, textarea") !== null) return;
      topZ += 1;
      card.style.zIndex = String(topZ);
      dragging = {
        offsetX: event.clientX - card.offsetLeft,
        offsetY: event.clientY - card.offsetTop
      };
      card.dataset.dragging = "true";
      if (typeof card.setPointerCapture === "function") card.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const onPointerMove = (event) => {
      if (dragging === null) return;
      const width = card.offsetWidth;
      const height = card.offsetHeight;
      const left = clamp(event.clientX - dragging.offsetX, window.innerWidth - width - DRAG_MARGIN);
      const top = clamp(event.clientY - dragging.offsetY, window.innerHeight - height - DRAG_MARGIN);
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
    };
    const onPointerUp = (event) => {
      if (dragging === null) return;
      dragging = null;
      delete card.dataset.dragging;
      if (typeof card.hasPointerCapture === "function" && card.hasPointerCapture(event.pointerId)) {
        card.releasePointerCapture(event.pointerId);
      }
      record.instance = { ...record.instance, x: Math.round(card.offsetLeft), y: Math.round(card.offsetTop) };
      persist(record.instance);
    };
    card.addEventListener("pointerdown", onPointerDown);
    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerup", onPointerUp);
    card.addEventListener("pointercancel", onPointerUp);
    return record;
  };
  const destroyCard = (record) => {
    record.handle.destroy();
    record.card.remove();
  };
  const sync = (settings) => {
    const wanted = new Map(settings.widgets.map((instance) => [instance.id, instance]));
    for (const [id, record] of mounted) {
      if (!wanted.has(id)) {
        destroyCard(record);
        mounted.delete(id);
      }
    }
    for (const instance of settings.widgets) {
      if (!instance.enabled) {
        const record = mounted.get(instance.id);
        if (record !== void 0) {
          destroyCard(record);
          mounted.delete(instance.id);
        }
        continue;
      }
      const existing = mounted.get(instance.id);
      if (existing === void 0) {
        const record = makeCard(instance);
        if (record !== null) mounted.set(instance.id, record);
        continue;
      }
      const previous = existing.instance;
      existing.instance = instance;
      existing.card.dataset.size = instance.size;
      existing.card.style.opacity = String(instance.opacity);
      if (previous.x !== instance.x || previous.y !== instance.y) seat(existing.card, instance);
      if (previous.config !== instance.config || previous.size !== instance.size) existing.handle.update(instance);
    }
    for (const [index, instance] of settings.widgets.entries()) {
      const record = mounted.get(instance.id);
      if (record !== void 0) record.card.style.zIndex = String(10 + index);
    }
  };
  const onResize = () => {
    for (const record of mounted.values()) seat(record.card, record.instance);
  };
  const unsubscribe = store.subscribe(() => {
    const snapshot = store.getSnapshot();
    if (snapshot.status === "ready" && snapshot.value !== void 0) sync(snapshot.value);
  });
  const initial = store.getSnapshot();
  if (initial.status === "ready" && initial.value !== void 0) sync(initial.value);
  window.addEventListener("resize", onResize);
  return () => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    window.removeEventListener("resize", onResize);
    for (const record of mounted.values()) destroyCard(record);
    mounted.clear();
    layer.remove();
  };
}

// src/client/store.ts
var BongoCatStore = class {
  constructor(rpc) {
    this.rpc = rpc;
  }
  rpc;
  snapshot = { status: "loading" };
  listeners = /* @__PURE__ */ new Set();
  dirty = null;
  flushing = false;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  publish(snapshot) {
    this.snapshot = snapshot;
    for (const listener of [...this.listeners]) listener();
  }
  /** Pull the host-resolved config once (plugin activation / after imports). */
  async load() {
    const result = await this.rpc.call("/bongo-cat", "config/get", {});
    if (!result.ok) {
      this.publish({ status: "unavailable" });
      return;
    }
    this.publish({ status: "ready", value: result.value });
  }
  /**
   * Refresh host-authoritative fields without replacing the document.
   *
   * `counter` only moves through `stats/bump`, which never round-trips through
   * this store, so a long-lived page holds a stale total. The wardrobe panel
   * needs the real number when it decides whether an exchange is available;
   * merging just that field keeps an in-flight edit from being overwritten by
   * a whole-document reload.
   */
  async refreshCounter() {
    const result = await this.rpc.call("/bongo-cat", "config/get", {});
    if (!result.ok) return;
    if (this.snapshot.status !== "ready" || this.snapshot.value === void 0) return;
    this.publish({
      status: "ready",
      value: { ...this.snapshot.value, counter: result.value.counter, wardrobe: result.value.wardrobe }
    });
  }
  /**
   * Merge a host-authoritative tap result into the mirror.
   *
   * `stats/bump` is the authority for automatic drops: it returns the debited
   * tap balance plus the item(s) it just granted, and both must show up on the
   * cat/panel without waiting for a whole-document reload.
   */
  applyHostState(patch) {
    const snapshot = this.snapshot;
    if (snapshot.status !== "ready" || snapshot.value === void 0) return;
    this.publish({ status: "ready", value: { ...snapshot.value, ...patch } });
  }
  /**
   * Coalescing writer: rapid slider writes merge; only the newest patch
   * re-flushes after the in-flight round-trip, so the host never races
   * itself and the UI never blocks on intermediate responses.
   */
  async set(patch) {
    this.dirty = { ...this.dirty, ...patch };
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.dirty !== null) {
        const next = this.dirty;
        this.dirty = null;
        const result = await this.rpc.call("/bongo-cat", "config/set", { patch: next });
        if (!result.ok) throw new Error(result.error.message);
        this.publish({ status: "ready", value: result.value });
      }
    } finally {
      this.flushing = false;
    }
  }
};

// src/client/index.tsx
var zh = {
  nav: "\u90A6\u54E5\u732B",
  hint: "\u753B\u9762\u6765\u81EA\u4F60\u672C\u673A\u5B89\u88C5\u7684 Steam \u7248 Bongo Cat\u3002\u6253\u5B57\u3001\u70B9\u9F20\u6807\u5B83\u4F1A\u6572\u8D77\u6765\uFF1B\u6309\u4F4F\u53EF\u62D6\u52A8\uFF0C\u53CC\u51FB\u6362\u89D2\u843D\u3002",
  hintToast: "\u90A6\u54E5\u732B\u4E0A\u7EBF\u5566\uFF01\u6253\u5B57\u3001\u70B9\u9F20\u6807\uFF0C\u5B83\u5C31\u4F1A\u6572\u8D77\u6765\uFF5E",
  openSettings: "\u8BBE\u7F6E",
  openSettingsHint: "\u70B9\u51FB\u6253\u5F00\u8BBE\u7F6E \xB7 \u53CC\u51FB\u6362\u89D2\u843D \xB7 \u62D6\u52A8\u79FB\u52A8",
  enabledLabel: "\u542F\u7528\u90A6\u54E5\u732B",
  steamSkinsLabel: "Steam \u76AE\u80A4",
  skinImporting: "\u6B63\u5728\u63D0\u53D6\u76AE\u80A4\uFF1A",
  nativeLabel: "\u539F\u7248\u8D44\u6E90\uFF08Steam\uFF09",
  nativeHint: "\u76F4\u63A5\u4ECE\u4F60\u672C\u673A\u7684 Bongo Cat \u5B89\u88C5\u91CC\u8BFB\u53D6\u539F\u59CB\u7F8E\u672F\uFF0C\u70B9\u4EFB\u610F\u76AE\u80A4\u5373\u53EF\u6362\u88C5\u3002\u9996\u6B21\u5BFC\u5165\u4F1A\u81EA\u52A8\u51C6\u5907\u73AF\u5883\uFF08\u4E0B\u8F7D UnityPy \u7EA6 50 MB\uFF0C\u9700\u8054\u7F51\uFF0C1 \u5206\u949F\u5DE6\u53F3\uFF09\uFF0C\u4E4B\u540E\u6BCF\u79CD\u76AE\u80A4\u7EA6 3 \u79D2\u3002",
  nativeMissing: "\u5C1A\u672A\u5BFC\u5165\uFF1A\u5148\u70B9\u300C\u4ECE Steam \u5BFC\u5165\u539F\u7248\u8D44\u6E90\u300D",
  nativeMissingShort: "\u8BF7\u5148\u5728\u8BBE\u7F6E\u91CC\u5BFC\u5165\u539F\u7248\u8D44\u6E90",
  nativeReady: "\u5DF2\u5C31\u7EEA",
  nativeImport: "\u4ECE Steam \u5BFC\u5165\u539F\u7248\u8D44\u6E90",
  nativeReimport: "\u91CD\u65B0\u63D0\u53D6\u5F53\u524D\u76AE\u80A4",
  nativeRemove: "\u79FB\u9664\u539F\u7248\u8D44\u6E90",
  nativeBusy: "\u6B63\u5728\u51C6\u5907\u73AF\u5883\u5E76\u63D0\u53D6\uFF08\u9996\u6B21\u9700\u4E0B\u8F7D UnityPy\uFF0C\u7EA6 1 \u5206\u949F\uFF09\u2026",
  nativeFailed: "\u5BFC\u5165\u5931\u8D25",
  customLabel: "\u81EA\u5B9A\u4E49\u56FE\u7247\u76AE\u80A4\uFF08\u53EF\u9009\uFF09",
  importSkinButton: "\u5BFC\u5165\u56FE\u7247\u76AE\u80A4",
  removeSkinButton: "\u79FB\u9664\u81EA\u5B9A\u4E49\u76AE\u80A4",
  framesLabel: "\u5E27\u6570",
  framesHint: "\u6A2A\u5411\u7CBE\u7075\u56FE\uFF1A\u7B2C 1 \u5E27\u5F85\u673A\u3001\u7B2C 2 \u5E27\u5DE6\u722A\u3001\u7B2C 3 \u5E27\u53F3\u722A\uFF0C\u5176\u4F59\u5E27\u4F9D\u6B21\u5FAA\u73AF\u3002",
  scanButton: "\u626B\u63CF\u672C\u673A Bongo Cat",
  scanning: "\u6B63\u5728\u626B\u63CF Steam \u5E93\u4E0E\u521B\u610F\u5DE5\u574A\u2026",
  scanEmpty: "\u8FD9\u91CC\u6CA1\u6709\u627E\u5230\u56FE\u7247\u6587\u4EF6\u3002",
  soundLabel: "\u97F3\u6548",
  soundOnLabel: "\u6572\u51FB\u97F3\u6548",
  volumeLabel: "\u97F3\u91CF",
  importSoundButton: "\u5BFC\u5165 .wav \u97F3\u6548",
  removeSoundButton: "\u79FB\u9664\u81EA\u5B9A\u4E49\u97F3\u6548",
  positionLabel: "\u505C\u9760\u89D2\u843D",
  posBR: "\u53F3\u4E0B\u89D2",
  posBL: "\u5DE6\u4E0B\u89D2",
  posTL: "\u5DE6\u4E0A\u89D2",
  posTR: "\u53F3\u4E0A\u89D2",
  offsetLabel: "\u8FB9\u8DDD",
  sizeLabel: "\u5927\u5C0F",
  speedLabel: "\u6572\u51FB\u901F\u5EA6",
  presetLabel: "\u5FC3\u60C5\u9884\u7F6E",
  presetFocus: "\u4E13\u6CE8",
  presetZen: "\u7985\u57DF",
  presetParty: "\u6D3E\u5BF9",
  presetNight: "\u591C\u732B",
  presetApplied: "\u5DF2\u5957\u7528",
  counterLabel: "\u6572\u51FB\u603B\u6570",
  counterReset: "\u91CD\u7F6E\u8BA1\u6570",
  loading: "\u6B63\u5728\u8BFB\u53D6\u8BBE\u7F6E\u2026",
  unavailable: "\u65E0\u6CD5\u8BFB\u53D6\u90A6\u54E5\u732B\u8BBE\u7F6E\u3002",
  remoteWarning: "\u5F53\u524D\u9875\u9762\u5E76\u975E\u672C\u673A\u8BBF\u95EE\uFF0C\u65E0\u6CD5\u5BFC\u5165\u76AE\u80A4\u6216\u97F3\u6548\uFF08\u4EC5\u672C\u673A\u53EF\u5199\u5165\uFF09\u3002",
  tooLarge: "\u6587\u4EF6\u8FC7\u5927\uFF08\u56FE\u7247 \u2264 8 MB\uFF0C\u97F3\u6548 \u2264 2 MB\uFF09\u3002",
  busy: "\u5904\u7406\u4E2D\u2026",
  widgetSection: "\u684C\u9762\u7EC4\u4EF6",
  widgetHint: "\u7EC4\u4EF6\u4E0E\u732B\u54AA\u4E92\u76F8\u72EC\u7ACB\uFF1A\u53EF\u4EE5\u53EA\u5F00\u7EC4\u4EF6\u4E0D\u5F00\u732B\uFF0C\u4E5F\u53EF\u4EE5\u540C\u4E00\u7C7B\u578B\u653E\u597D\u51E0\u4E2A\u3002\u6309\u4F4F\u7EC4\u4EF6\u6807\u9898\u680F\u62D6\u52A8\u6446\u653E\uFF0C\u7A97\u53E3\u53D8\u5C0F\u65F6\u4F1A\u81EA\u52A8\u6536\u56DE\u53EF\u89C6\u533A\u3002",
  widgetAdd: "\u6DFB\u52A0\u7EC4\u4EF6",
  widgetRemove: "\u79FB\u9664",
  widgetEmpty: "\u8FD8\u6CA1\u6709\u7EC4\u4EF6\u3002\u4ECE\u4E0B\u9762\u6311\u4E00\u4E2A\u52A0\u4E0A\u5427\u3002",
  widgetSize: "\u5C3A\u5BF8",
  widgetSizeSm: "\u5C0F",
  widgetSizeMd: "\u4E2D",
  widgetOpacity: "\u4E0D\u900F\u660E\u5EA6",
  widgetClock: "\u65F6\u949F",
  widgetClockDesc: "\u672C\u5730\u65F6\u95F4\u4E0E\u65E5\u671F\uFF0C\u53EF\u5173\u79D2\u6570\u3001\u5207\u6362 12/24 \u5C0F\u65F6\u3002",
  widgetHour12: "12 \u5C0F\u65F6\u5236",
  widgetSeconds: "\u663E\u793A\u79D2",
  widgetShowDate: "\u663E\u793A\u65E5\u671F",
  widgetCounter: "\u6572\u51FB\u7EDF\u8BA1",
  widgetCounterDesc: "\u8BFB\u5BBF\u4E3B\u6301\u4E45\u5316\u7684\u603B\u6572\u51FB\u6570\uFF0C\u6216\u53EA\u7EDF\u8BA1\u672C\u6B21\u4F1A\u8BDD\u3002",
  widgetCounterTotal: "\u7D2F\u8BA1\u6572\u51FB",
  widgetCounterSession: "\u672C\u6B21\u4F1A\u8BDD",
  widgetSource: "\u6570\u636E\u6765\u6E90",
  widgetFocus: "\u4E13\u6CE8\u8BA1\u65F6",
  widgetFocusDesc: "\u4E00\u4E2A\u5012\u8BA1\u65F6\u756A\u8304\u949F\uFF0C\u5230\u70B9\u54CD\u4E24\u58F0\u3002",
  widgetFocusStart: "\u5F00\u59CB",
  widgetFocusPause: "\u6682\u505C",
  widgetFocusReset: "\u91CD\u7F6E",
  widgetMinutes: "\u5206\u949F",
  widgetChime: "\u7ED3\u675F\u63D0\u793A\u97F3",
  wardrobeSection: "\u88C5\u626E",
  wardrobeHint: "\u88C5\u626E\u76F4\u63A5\u6765\u81EA\u4F60\u672C\u673A Steam \u7248 Bongo Cat \u7684\u7269\u54C1\u5E93\uFF08\u5E3D\u5B50 / \u8868\u60C5 / \u7FC5\u8180 / \u914D\u9970\u5171\u6570\u767E\u4EF6\uFF09\u3002\u6BCF\u6572\u51FB 1000 \u6B21\u81EA\u52A8\u83B7\u5F97\u4E00\u4EF6\uFF0C\u5E76\u81EA\u52A8\u6263\u9664 1000 \u6B21\u8BA1\u6570\uFF1B\u91CD\u590D\u7684\u4F1A\u7D2F\u8BA1\u6210\u6570\u91CF\uFF0C\u70B9\u683C\u5B50\u7A7F\u4E0A\u6216\u6458\u4E0B\uFF0C\u6BDB\u8272\u5728\u5355\u72EC\u7684\u9875\u7B7E\u91CC\u3002",
  wardrobeHat: "\u5E3D\u5B50",
  wardrobeFace: "\u8868\u60C5",
  wardrobeBack: "\u7FC5\u8180",
  wardrobeAccessory: "\u914D\u9970",
  wardrobeFur: "\u6BDB\u8272",
  wardrobeFilter: "\u7B5B\u9009",
  wardrobeFilterAll: "\u5168\u90E8",
  wardrobeFilterOwned: "\u5DF2\u62E5\u6709",
  wardrobeFilterEquipped: "\u5DF2\u88C5\u5907",
  wardrobeRandom: "\u968F\u673A\u642D\u914D",
  wardrobeExchange: "\u5151\u6362",
  wardrobeUnequip: "\u5168\u90E8\u5378\u4E0B",
  wardrobeEmpty: "\u8FD9\u4E2A\u7B5B\u9009\u4E0B\u6CA1\u6709\u5185\u5BB9\u3002",
  wardrobeLocked: "\u672A\u89E3\u9501",
  wardrobeCollected: "\u5DF2\u6536\u96C6",
  wardrobeNextDrop: "\u8DDD\u4E0B\u4E00\u4EF6",
  wardrobeReady: "\u53EF\u5151\u6362",
  wardrobeExchanged: "\u672C\u6B21\u5151\u6362",
  wardrobeNewOnes: "\u5176\u4E2D\u65B0\u89E3\u9501",
  wardrobeNoDrop: "\u8FD8\u6CA1\u6709\u53EF\u5151\u6362\u7684\u88C5\u626E\uFF0C\u518D\u6572\u51E0\u4E0B\u5427\u3002",
  wardrobeDrop: "\u83B7\u5F97\u65B0\u88C5\u626E",
  wardrobeNoAssets: "\u8FD8\u6CA1\u6709\u539F\u7248\u8D44\u6E90\uFF1A\u5148\u5728\u4E0A\u9762\u70B9\u300C\u4ECE Steam \u5BFC\u5165\u539F\u7248\u8D44\u6E90\u300D\uFF0C\u5BFC\u5165\u540E\u8FD9\u91CC\u4F1A\u5217\u51FA\u6E38\u620F\u91CC\u7684\u5168\u90E8\u88C5\u626E\u3002"
};
var en = {
  nav: "Bongo Cat",
  hint: "The artwork comes from your installed Steam Bongo Cat. Type or click and it drums; drag to move, double-click to cycle corners.",
  hintToast: "Bongo Cat is online! Type or click and it starts drumming~",
  openSettings: "Settings",
  openSettingsHint: "Click for settings \xB7 double-click to change corners \xB7 drag to move",
  enabledLabel: "Enable Bongo Cat",
  steamSkinsLabel: "Steam skins",
  skinImporting: "Extracting skin:",
  nativeLabel: "Original assets (Steam)",
  nativeHint: "Reads the original artwork straight from your installed Bongo Cat \u2014 click any skin to switch. The first import bootstraps its own environment (downloads UnityPy, ~50 MB, needs network, about a minute); each skin takes ~3s afterwards.",
  nativeMissing: 'Not imported yet \u2014 click "Import original assets from Steam"',
  nativeMissingShort: "Import the original assets in Settings first",
  nativeReady: "Ready",
  nativeImport: "Import original assets from Steam",
  nativeReimport: "Re-extract current skin",
  nativeRemove: "Remove original assets",
  nativeBusy: "Preparing the environment and extracting (first run downloads UnityPy, ~1 min)\u2026",
  nativeFailed: "Import failed",
  customLabel: "Custom image skin (optional)",
  importSkinButton: "Import image skin",
  removeSkinButton: "Remove custom skin",
  framesLabel: "Frames",
  framesHint: "Horizontal sprite strip: frame 1 idle, 2 left paw, 3 right paw; extra frames cycle.",
  scanButton: "Scan local Bongo Cat",
  scanning: "Scanning Steam libraries and Workshop\u2026",
  scanEmpty: "No image files found here.",
  soundLabel: "Sound",
  soundOnLabel: "Tap sound",
  volumeLabel: "Volume",
  importSoundButton: "Import .wav sound",
  removeSoundButton: "Remove custom sound",
  positionLabel: "Anchor corner",
  posBR: "Bottom right",
  posBL: "Bottom left",
  posTL: "Top left",
  posTR: "Top right",
  offsetLabel: "Margin",
  sizeLabel: "Size",
  speedLabel: "Tap speed",
  presetLabel: "Mood presets",
  presetFocus: "Focus",
  presetZen: "Zen",
  presetParty: "Party",
  presetNight: "Night owl",
  presetApplied: "Applied",
  counterLabel: "Total taps",
  counterReset: "Reset counter",
  loading: "Loading settings\u2026",
  unavailable: "Bongo Cat settings are unavailable.",
  remoteWarning: "This page is not opened from this machine; importing skins or sounds is unavailable (writes are loopback-only).",
  tooLarge: "File too large (images \u2264 8 MB, sounds \u2264 2 MB).",
  busy: "Working\u2026",
  widgetSection: "Desktop widgets",
  widgetHint: "Widgets are independent of the cat: run them with the cat off, or place several of the same type. Drag a widget by its header; it is pulled back into view when the window shrinks.",
  widgetAdd: "Add widget",
  widgetRemove: "Remove",
  widgetEmpty: "No widgets yet. Pick one below.",
  widgetSize: "Size",
  widgetSizeSm: "Small",
  widgetSizeMd: "Medium",
  widgetOpacity: "Opacity",
  widgetClock: "Clock",
  widgetClockDesc: "Local time and date, with optional seconds and 12/24h.",
  widgetHour12: "12-hour clock",
  widgetSeconds: "Show seconds",
  widgetShowDate: "Show date",
  widgetCounter: "Tap counter",
  widgetCounterDesc: "The persisted lifetime total, or just this session.",
  widgetCounterTotal: "Lifetime taps",
  widgetCounterSession: "This session",
  widgetSource: "Source",
  widgetFocus: "Focus timer",
  widgetFocusDesc: "A countdown pomodoro that chimes when it ends.",
  widgetFocusStart: "Start",
  widgetFocusPause: "Pause",
  widgetFocusReset: "Reset",
  widgetMinutes: "Minutes",
  widgetChime: "Chime at the end",
  wardrobeSection: "Dress-up",
  wardrobeHint: "The items come straight from your installed Steam Bongo Cat (hundreds of hats / faces / wings / extras). Every 1000 taps automatically grants one and debits those 1000 taps. Duplicates stack; click a tile to wear or take it off, colours have their own tab.",
  wardrobeHat: "Hats",
  wardrobeFace: "Face",
  wardrobeBack: "Wings",
  wardrobeAccessory: "Extras",
  wardrobeFur: "Fur",
  wardrobeFilter: "Filter",
  wardrobeFilterAll: "All",
  wardrobeFilterOwned: "Owned",
  wardrobeFilterEquipped: "Worn",
  wardrobeRandom: "Random outfit",
  wardrobeExchange: "Exchange",
  wardrobeUnequip: "Take everything off",
  wardrobeEmpty: "Nothing under this filter.",
  wardrobeLocked: "Locked",
  wardrobeCollected: "Collected",
  wardrobeNextDrop: "Next drop in",
  wardrobeReady: "Ready to exchange",
  wardrobeExchanged: "Exchanged",
  wardrobeNewOnes: "new",
  wardrobeNoDrop: "Nothing to exchange yet \u2014 keep tapping.",
  wardrobeDrop: "New cosmetic",
  wardrobeNoAssets: `No original assets yet \u2014 click "Import original assets from Steam" above; the game's full dress-up catalogue appears here afterwards.`
};
var inject = ["slots", "locale", "connection"];
function apply(ctx) {
  const connection = ctx.get("connection");
  const store = new BongoCatStore(connection.rpc);
  ctx.effect(() => ctx.locale.register(BONGO_CAT_NS, { zh, en }), "bongo-cat: dictionaries");
  const translate = ctx.locale.bind(BONGO_CAT_NS);
  const t = (key) => translate(key);
  void store.load();
  ctx.effect(() => attachBongoCat(ctx, store, connection.rpc, t), "bongo-cat: overlay");
  ctx.effect(() => attachWidgetDock(store, connection.rpc, t, connection.isLoopback), "bongo-cat: widgets");
  const injected = () => ({
    store,
    rpc: connection.rpc,
    isLoopback: connection.isLoopback,
    t
  });
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "bongo-cat",
    order: 31,
    label: () => t("nav"),
    inject: injected
  }, BongoCatSection));
}

    return module.exports;
  }
});
