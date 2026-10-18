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
var import_react = require("react");

// src/client/cat-svg.ts
var CAT_SVG = `
<svg class="bc-svg" viewBox="0 0 260 230" aria-hidden="true" focusable="false">
  <!-- tail -->
  <g class="bc-tail">
    <path class="bc-maskable" d="M182 172 C 208 166 220 142 212 118 C 206 104 192 102 186 112"
      fill="none" stroke="var(--bc-fur)" stroke-width="15" stroke-linecap="round"/>
    <circle class="bc-maskable" cx="186" cy="112" r="7.5" fill="var(--bc-fur)"/>
    <path class="deco deco-tail-stripe" d="M196 132 q10 -2 14 -10" stroke="var(--bc-stripe)" stroke-width="6" stroke-linecap="round" fill="none"/>
  </g>

  <!-- keyboard bar: the cat drums on it -->
  <g class="bc-keyboard">
    <rect x="30" y="190" width="200" height="24" rx="8" fill="var(--bc-kb)"/>
    <rect class="bc-key bc-key-l1" x="46" y="195" width="24" height="14" rx="3" fill="var(--bc-kb-key)"/>
    <rect class="bc-key bc-key-l2" x="76" y="195" width="24" height="14" rx="3" fill="var(--bc-kb-key)"/>
    <rect class="bc-key bc-key-space" x="106" y="199" width="48" height="8" rx="3" fill="var(--bc-kb-key)"/>
    <rect class="bc-key bc-key-r2" x="160" y="195" width="24" height="14" rx="3" fill="var(--bc-kb-key)"/>
    <rect class="bc-key bc-key-r1" x="190" y="195" width="24" height="14" rx="3" fill="var(--bc-kb-key)"/>
  </g>

  <!-- body -->
  <g class="bc-body">
    <ellipse cx="130" cy="162" rx="56" ry="50" fill="var(--bc-fur)"/>
    <ellipse cx="130" cy="176" rx="30" ry="26" fill="var(--bc-shade)" opacity="0.55"/>
    <ellipse class="deco deco-chest" cx="130" cy="170" rx="24" ry="22" fill="#ffffff"/>
    <ellipse class="deco deco-patch-b" cx="152" cy="176" rx="17" ry="14" fill="var(--bc-patch-b)"/>
  </g>

  <!-- paws -->
  <g class="bc-paw bc-paw-left">
    <ellipse class="bc-maskable" cx="98" cy="182" rx="18" ry="13" fill="var(--bc-fur)"/>
    <ellipse cx="98" cy="185" rx="10.5" ry="7" fill="var(--bc-pad)"/>
    <path d="M92 178 v6 M98 176 v8 M104 178 v6" stroke="var(--bc-pad)" stroke-width="2" stroke-linecap="round" fill="none"/>
  </g>
  <g class="bc-paw bc-paw-right">
    <ellipse class="bc-maskable" cx="162" cy="182" rx="18" ry="13" fill="var(--bc-fur)"/>
    <ellipse cx="162" cy="185" rx="10.5" ry="7" fill="var(--bc-pad)"/>
    <path d="M156 178 v6 M162 176 v8 M168 178 v6" stroke="var(--bc-pad)" stroke-width="2" stroke-linecap="round" fill="none"/>
  </g>

  <!-- head -->
  <g class="bc-head">
    <g class="bc-ear bc-ear-left">
      <path class="bc-maskable" d="M88 70 L76 28 L118 56 Z" fill="var(--bc-fur)"/>
      <path d="M90 64 L83 40 L110 58 Z" fill="var(--bc-ear)"/>
    </g>
    <g class="bc-ear bc-ear-right">
      <path class="bc-maskable" d="M172 70 L184 28 L142 56 Z" fill="var(--bc-fur)"/>
      <path d="M170 64 L177 40 L150 58 Z" fill="var(--bc-ear)"/>
    </g>

    <!-- accessories -->
    <g class="bc-acc bc-acc-party">
      <path d="M148 56 L166 6 L186 52 Z" fill="var(--bc-accent)"/>
      <path d="M154 44 L166 6 M162 36 L178 42" stroke="var(--bc-shade)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="166" cy="8" r="6" fill="var(--bc-shade)"/>
    </g>
    <g class="bc-acc bc-acc-witch">
      <ellipse cx="130" cy="56" rx="52" ry="9" fill="var(--bc-line)"/>
      <path d="M112 56 L128 2 L150 56 Z" fill="var(--bc-accent)"/>
      <rect x="112" y="46" width="38" height="7" rx="3" fill="var(--bc-line)"/>
    </g>
    <g class="bc-acc bc-acc-crown">
      <path d="M98 58 L106 28 L118 46 L130 22 L142 46 L154 28 L162 58 Z" fill="#ffd966" stroke="#e6b800" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="130" cy="36" r="3" fill="#ff5252"/>
      <circle cx="112" cy="42" r="2.4" fill="#6fb7d9"/>
      <circle cx="148" cy="42" r="2.4" fill="#6fb7d9"/>
    </g>
    <g class="bc-acc bc-acc-bowtie">
      <path d="M130 142 L114 132 L114 152 Z" fill="#ff5252"/>
      <path d="M130 142 L146 132 L146 152 Z" fill="#ff5252"/>
      <circle cx="130" cy="142" r="4" fill="#d32f2f"/>
    </g>
    <g class="bc-acc bc-acc-sakura">
      <g transform="translate(88 40)">
        <circle cx="0" cy="-7" r="5" fill="#ffb7d5"/>
        <circle cx="6.6" cy="-2.2" r="5" fill="#ffb7d5"/>
        <circle cx="4.1" cy="5.7" r="5" fill="#ffb7d5"/>
        <circle cx="-4.1" cy="5.7" r="5" fill="#ffb7d5"/>
        <circle cx="-6.6" cy="-2.2" r="5" fill="#ffb7d5"/>
        <circle cx="0" cy="0" r="3.4" fill="#ffd966"/>
      </g>
    </g>

    <!-- face -->
    <ellipse class="bc-maskable" cx="130" cy="100" rx="54" ry="48" fill="var(--bc-fur)"/>
    <ellipse class="deco deco-patch-a" cx="98" cy="84" rx="16" ry="13" fill="var(--bc-patch-a)"/>
    <g class="deco deco-stripes" stroke="var(--bc-stripe)" stroke-width="4.5" stroke-linecap="round" fill="none">
      <path d="M118 66 L118 52"/>
      <path d="M130 62 L130 46"/>
      <path d="M142 66 L142 52"/>
    </g>

    <!-- eyes: three states, CSS picks one -->
    <g class="bc-eyes bc-eyes-open">
      <ellipse cx="108" cy="98" rx="6.5" ry="9" fill="var(--bc-eye)"/>
      <ellipse cx="152" cy="98" rx="6.5" ry="9" fill="var(--bc-eye)"/>
      <circle cx="105.6" cy="95" r="2.4" fill="#ffffff"/>
      <circle cx="149.6" cy="95" r="2.4" fill="#ffffff"/>
    </g>
    <g class="bc-eyes bc-eyes-closed">
      <path d="M101 98 q7 6 14 0" stroke="var(--bc-eye)" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M145 98 q7 6 14 0" stroke="var(--bc-eye)" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    </g>
    <g class="bc-eyes bc-eyes-freak">
      <path d="M100 92 L116 104 M116 92 L100 104" stroke="var(--bc-eye)" stroke-width="3" stroke-linecap="round"/>
      <path d="M144 92 L160 104 M160 92 L144 104" stroke="var(--bc-eye)" stroke-width="3" stroke-linecap="round"/>
    </g>

    <!-- blush -->
    <ellipse class="bc-blush" cx="94" cy="114" rx="8" ry="4.5" fill="var(--bc-accent)" opacity="0.55"/>
    <ellipse class="bc-blush" cx="166" cy="114" rx="8" ry="4.5" fill="var(--bc-accent)" opacity="0.55"/>

    <!-- nose + mouth -->
    <path d="M126 110 h8 l-4 5 z" fill="var(--bc-pad)"/>
    <path class="bc-mouth" d="M130 117 q-5 6 -10 2 M130 117 q5 6 10 2" stroke="var(--bc-eye)" stroke-width="2" stroke-linecap="round" fill="none"/>

    <!-- whiskers -->
    <g stroke="var(--bc-eye)" stroke-width="1.6" stroke-linecap="round" opacity="0.7">
      <path d="M82 92 L58 86"/>
      <path d="M82 100 L56 98"/>
      <path d="M84 108 L62 112"/>
      <path d="M178 92 L202 86"/>
      <path d="M178 100 L204 98"/>
      <path d="M176 108 L198 112"/>
    </g>
  </g>

  <!-- effects -->
  <g class="bc-zzz" fill="var(--bc-eye)">
    <text class="bc-z bc-z1" x="192" y="72" font-size="15">Z</text>
    <text class="bc-z bc-z2" x="204" y="54" font-size="19">Z</text>
    <text class="bc-z bc-z3" x="218" y="36" font-size="23">Z</text>
  </g>
  <g class="bc-sparks" fill="var(--bc-accent)">
    <path class="bc-spark bc-sp1" transform="translate(38 58)" d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4 Z"/>
    <path class="bc-spark bc-sp2" transform="translate(222 96)" d="M0 -7 L1.9 -1.9 L7 0 L1.9 1.9 L0 7 L-1.9 1.9 L-7 0 L-1.9 -1.9 Z"/>
    <path class="bc-spark bc-sp3" transform="translate(56 30)" d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"/>
    <path class="bc-spark bc-sp4" transform="translate(206 150)" d="M0 -8 L2.1 -2.1 L8 0 L2.1 2.1 L0 8 L-2.1 2.1 L-8 0 L-2.1 -2.1 Z"/>
  </g>
  <path class="bc-heart" transform="translate(130 34) scale(1.6)" d="M0 6 C-8 0 -8 -7 -3 -7 C-1 -7 0 -5 0 -4 C0 -5 1 -7 3 -7 C8 -7 8 0 0 6 Z" fill="#ff6b9d"/>
</svg>
`;
function paletteVars(skin) {
  const parts = [];
  for (const [key, value] of Object.entries(skin.palette)) {
    if (typeof value === "string") parts.push(`--bc-${key}: ${value}`);
  }
  return parts.join("; ");
}
function decoValue(skin) {
  return [
    skin.stripes ? "stripes" : "",
    skin.mask ? "mask" : "",
    skin.patches ? "patches" : "",
    skin.chest ? "chest" : "",
    skin.accessory !== "none" ? `acc-${skin.accessory}` : ""
  ].filter(Boolean).join(" ");
}
function catPreviewSvg(skin) {
  const p = skin.palette;
  const fur = p.fur ?? "#ffffff";
  const ear = p.ear ?? "#ffb3c6";
  const eye = p.eye ?? "#3a3a4a";
  const accent = p.accent ?? "#ff8fab";
  const mask = skin.mask ? p.mask ?? fur : fur;
  const stripe = p.stripe ?? accent;
  const accessory = skin.accessory === "party" ? `<path d="M148 52 L164 10 L182 48 Z" fill="${accent}"/><circle cx="164" cy="12" r="5" fill="${p.shade ?? fur}"/>` : skin.accessory === "witch" ? `<ellipse cx="130" cy="52" rx="46" ry="8" fill="${p.line ?? "#888"}"/><path d="M114 52 L130 8 L148 52 Z" fill="${accent}"/>` : skin.accessory === "crown" ? `<path d="M100 54 L108 28 L119 44 L130 22 L141 44 L152 28 L160 54 Z" fill="#ffd966" stroke="#e6b800" stroke-width="2"/>` : skin.accessory === "bowtie" ? `<path d="M130 118 L116 110 L116 126 Z" fill="#ff5252"/><path d="M130 118 L144 110 L144 126 Z" fill="#ff5252"/>` : skin.accessory === "sakura" ? `<g transform="translate(92 34)"><circle cx="0" cy="-6" r="4.4" fill="#ffb7d5"/><circle cx="5.7" cy="-1.9" r="4.4" fill="#ffb7d5"/><circle cx="3.5" cy="4.9" r="4.4" fill="#ffb7d5"/><circle cx="-3.5" cy="4.9" r="4.4" fill="#ffb7d5"/><circle cx="-5.7" cy="-1.9" r="4.4" fill="#ffb7d5"/><circle cx="0" cy="0" r="3" fill="#ffd966"/></g>` : "";
  const stripes = skin.stripes ? `<g stroke="${stripe}" stroke-width="4" stroke-linecap="round" fill="none">
         <path d="M90 58 L90 46"/><path d="M100 54 L100 40"/><path d="M110 58 L110 46"/>
       </g>` : "";
  const patches = skin.patches ? `<ellipse cx="74" cy="78" rx="13" ry="10.5" fill="${p.patchA ?? "#ffb35c"}"/>
       <ellipse cx="128" cy="112" rx="12" ry="9.5" fill="${p.patchB ?? "#4a4a55"}"/>` : "";
  const chest = skin.chest ? `<ellipse cx="100" cy="118" rx="19" ry="16" fill="#ffffff"/>` : "";
  return `
<svg viewBox="0 0 200 160" class="bc-preview-svg" aria-hidden="true">
  <path d="M64 62 L54 26 L92 50 Z" fill="${mask}"/>
  <path d="M136 62 L146 26 L108 50 Z" fill="${mask}"/>
  <path d="M66 56 L60 36 L84 52 Z" fill="${ear}"/>
  <path d="M134 56 L140 36 L116 52 Z" fill="${ear}"/>
  ${accessory}
  <ellipse cx="100" cy="92" rx="48" ry="42" fill="${fur}"/>
  ${chest}${patches}${stripes}
  <g fill="${eye}">
    <ellipse cx="82" cy="90" rx="5.6" ry="7.8"/>
    <ellipse cx="118" cy="90" rx="5.6" ry="7.8"/>
  </g>
  <circle cx="80" cy="87.5" r="2.1" fill="#ffffff"/>
  <circle cx="116" cy="87.5" r="2.1" fill="#ffffff"/>
  <ellipse cx="70" cy="104" rx="7" ry="4" fill="${accent}" opacity="0.55"/>
  <ellipse cx="130" cy="104" rx="7" ry="4" fill="${accent}" opacity="0.55"/>
  <path d="M96 102 h8 l-4 4.6 z" fill="${p.pad ?? ear}"/>
  <path d="M100 108 q-4.4 5.4 -9 1.8 M100 108 q4.4 5.4 9 1.8" stroke="${eye}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <g stroke="${eye}" stroke-width="1.4" stroke-linecap="round" opacity="0.7">
    <path d="M58 84 L36 79"/>
    <path d="M58 92 L34 90"/>
    <path d="M142 84 L164 79"/>
    <path d="M142 92 L166 90"/>
  </g>
</svg>
`;
}

// src/client/skins.ts
var BUILT_IN_SKINS = [
  {
    id: "classic",
    name: "\u7ECF\u5178\u767D\u732B",
    palette: {
      fur: "#ffffff",
      shade: "#eef0f6",
      ear: "#ffb3c6",
      pad: "#ffb3c6",
      eye: "#3a3a4a",
      line: "#d9d9e3",
      accent: "#ff8fab",
      kb: "#8d7b68",
      kbKey: "#c9b8a5"
    },
    accessory: "none"
  },
  {
    id: "midnight",
    name: "\u5348\u591C\u9ED1\u732B",
    palette: {
      fur: "#3b3b4f",
      shade: "#2c2c3c",
      ear: "#ff9fb6",
      pad: "#ff9fb6",
      eye: "#ffd966",
      line: "#26263a",
      accent: "#9d7ff5",
      kb: "#4a4560",
      kbKey: "#6f6890"
    },
    accessory: "none"
  },
  {
    id: "tabby",
    name: "\u6A58\u732B\u6761\u6761",
    palette: {
      fur: "#ffb35c",
      shade: "#f59a3d",
      ear: "#ffc9a3",
      pad: "#ffb3c6",
      eye: "#4a3520",
      line: "#d97f2e",
      accent: "#ff7043",
      stripe: "#e07f22",
      kb: "#a5713f",
      kbKey: "#d9a870"
    },
    stripes: true,
    accessory: "none"
  },
  {
    id: "cloud",
    name: "\u4E91\u6735\u7070\u732B",
    palette: {
      fur: "#c7cdd8",
      shade: "#aeb6c4",
      ear: "#f0b8c8",
      pad: "#f0b8c8",
      eye: "#4a5568",
      line: "#98a1b0",
      accent: "#7aa5d2",
      kb: "#7d8590",
      kbKey: "#aab3bd"
    },
    accessory: "none"
  },
  {
    id: "siamese",
    name: "\u66B9\u7F57\u516C\u5B50",
    palette: {
      fur: "#f2e3d5",
      shade: "#e3cfbe",
      ear: "#d8a58f",
      pad: "#5b4038",
      eye: "#6fb7d9",
      line: "#b59c8d",
      accent: "#8d6e63",
      mask: "#5b4038",
      kb: "#6b5849",
      kbKey: "#9c8873"
    },
    mask: true,
    accessory: "none"
  },
  {
    id: "tuxedo",
    name: "\u793C\u670D\u732B",
    palette: {
      fur: "#33364a",
      shade: "#26283a",
      ear: "#ff9fb6",
      pad: "#ff9fb6",
      eye: "#ffd966",
      line: "#23252f",
      accent: "#ff5252",
      kb: "#3c3f52",
      kbKey: "#5c6076"
    },
    chest: true,
    accessory: "bowtie"
  },
  {
    id: "calico",
    name: "\u4E09\u82B1\u6CFC\u58A8",
    palette: {
      fur: "#ffffff",
      shade: "#f3f3f8",
      ear: "#ffb3c6",
      pad: "#ffb3c6",
      eye: "#4a3520",
      line: "#d9d9e3",
      accent: "#ff8fab",
      patchA: "#ffb35c",
      patchB: "#4a4a55",
      kb: "#8d7b68",
      kbKey: "#c9b8a5"
    },
    patches: true,
    accessory: "none"
  },
  {
    id: "sakura",
    name: "\u6A31\u82B1\u7C89\u7C89",
    palette: {
      fur: "#ffeef5",
      shade: "#ffd6e6",
      ear: "#ffc2d4",
      pad: "#ff9ebb",
      eye: "#b85c7a",
      line: "#f0c2d4",
      accent: "#ff6f9c",
      kb: "#c98ba6",
      kbKey: "#efc3d5"
    },
    accessory: "sakura"
  }
];
function findSkin(id) {
  return BUILT_IN_SKINS.find((skin) => skin.id === id) ?? BUILT_IN_SKINS[0];
}

// src/client/presets.ts
var PRESETS = [
  {
    id: "focus",
    labelKey: "presetFocus",
    patch: {
      size: 0.9,
      speed: 0.8,
      soundEnabled: false,
      showCounter: false,
      eggFreak: false,
      eggSleep: true,
      eggPet: true,
      eggNight: true
    }
  },
  {
    id: "zen",
    labelKey: "presetZen",
    patch: {
      size: 1.1,
      speed: 0.6,
      soundEnabled: true,
      volume: 0.3,
      showCounter: true,
      eggFreak: false,
      eggSleep: true,
      eggPet: true,
      eggNight: true
    }
  },
  {
    id: "party",
    labelKey: "presetParty",
    patch: {
      size: 1.6,
      speed: 1.6,
      soundEnabled: true,
      volume: 0.9,
      showCounter: true,
      eggFreak: true,
      eggPet: true,
      eggSleep: false,
      eggNight: false
    }
  },
  {
    id: "night",
    labelKey: "presetNight",
    patch: {
      skin: "midnight",
      size: 1,
      speed: 0.8,
      soundEnabled: true,
      volume: 0.4,
      showCounter: true,
      eggFreak: false,
      eggSleep: true,
      eggPet: true,
      eggNight: true
    }
  }
];

// src/shared/settings-contract.ts
var SETTINGS_FIELDS = {
  /** Master switch; the browser half renders nothing while false. */
  enabled: { kind: "boolean", default: true },
  /**
   * Which cat to draw:
   *   auto   — the original Steam artwork when it has been extracted, else the built-in SVG cat
   *   native — the original Steam artwork (falls back to SVG when missing)
   *   svg    — always the built-in SVG cat
   */
  renderer: { kind: "enum", values: ["auto", "native", "svg"], default: "auto" },
  /** Built-in skin id (see src/client/skins.ts). */
  skin: { kind: "string", default: "classic" },
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
  /** Easter egg: burst typing triggers freak mode. */
  eggFreak: { kind: "boolean", default: true },
  /** Easter egg: idle for a while and the cat dozes off. */
  eggSleep: { kind: "boolean", default: true },
  /** Easter egg: clicking the cat pets it. */
  eggPet: { kind: "boolean", default: true },
  /** Easter egg: late-night sleepy palette. */
  eggNight: { kind: "boolean", default: true }
};
var WRITABLE_FIELDS = Object.entries(SETTINGS_FIELDS).filter(([, meta]) => meta.writable !== false).map(([key]) => key);
var SETTINGS_DEFAULTS = Object.fromEntries(
  Object.entries(SETTINGS_FIELDS).map(([key, meta]) => [key, meta.default])
);

// src/client/settings.ts
var BONGO_CAT_NS = "bongo-cat";
function nativeFrameUrl(frame, stamp) {
  return `/plugins/bongo-cat/native/${frame}.png?v=${encodeURIComponent(stamp)}`;
}
function skinUrl(revision) {
  return "/plugins/bongo-cat/skin?v=" + revision;
}
function soundUrl(revision) {
  return "/plugins/bongo-cat/sound?v=" + revision;
}

// src/client/BongoCatSection.module.css
var css = "/* Bongo Cat settings section \u2014 skin gallery, Steam import, sound,\n   position, counter and easter-egg toggles. */\n._bc_section_1bhg4yo {\n  display: flex;\n  flex-direction: column;\n  gap: 18px;\n}\n\n._bc_hint_zqdh9u {\n  font-size: 12.5px;\n  line-height: 1.6;\n  opacity: 0.72;\n}\n\n._bc_group_17yh6dy {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  padding: 14px 16px;\n  border: 1px solid var(--dsw-alias-border-default, rgba(128, 128, 128, 0.28));\n  border-radius: 10px;\n}\n\n._bc_group-title_gti54r {\n  font-size: 13px;\n  font-weight: 600;\n}\n\n._bc_row_11p08bn {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  flex-wrap: wrap;\n}\n\n._bc_label_1cdon2n {\n  font-size: 12.5px;\n  min-width: 64px;\n  opacity: 0.85;\n}\n\n._bc_value_149aftu {\n  font-size: 12px;\n  opacity: 0.6;\n  font-variant-numeric: tabular-nums;\n  min-width: 42px;\n  text-align: right;\n}\n\n._bc_check_onvuwf {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 12.5px;\n  cursor: pointer;\n}\n\n._bc_range_cqo3a {\n  flex: 1;\n  min-width: 140px;\n}\n\n._bc_btn_5jrmvl {\n  padding: 5px 12px;\n  font-size: 12.5px;\n  border: 1px solid var(--dsw-alias-border-default, rgba(128, 128, 128, 0.35));\n  border-radius: 7px;\n  background: transparent;\n  color: inherit;\n  cursor: pointer;\n}\n\n._bc_btn_5jrmvl:hover:not(:disabled) {\n  border-color: var(--dsw-alias-border-strong, rgba(128, 128, 128, 0.6));\n}\n\n._bc_btn_5jrmvl:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n._bc_btn-primary_19phyb4 {\n  background: var(--dsw-alias-bg-module-platform, #4a6cf7);\n  border-color: transparent;\n  color: #fff;\n}\n\n._bc_btn-danger_baqgkn {\n  color: #e5484d;\n  border-color: rgba(229, 72, 77, 0.5);\n}\n\n._bc_btn_5jrmvl._bc_active_sypfs5 {\n  border-color: var(--dsw-alias-bg-module-platform, #4a6cf7);\n  color: var(--dsw-alias-bg-module-platform, #4a6cf7);\n}\n\n._bc_gallery_1sw40pt {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));\n  gap: 10px;\n}\n\n._bc_skin-card_1v8cdxr {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 6px;\n  padding: 8px 6px 10px;\n  border: 2px solid transparent;\n  border-radius: 10px;\n  background: var(--dsw-alias-bg-layer-1, rgba(128, 128, 128, 0.08));\n  cursor: pointer;\n}\n\n._bc_skin-card_1v8cdxr:hover {\n  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.14));\n}\n\n._bc_skin-card_1v8cdxr._bc_selected_1p6ho74 {\n  border-color: var(--dsw-alias-bg-module-platform, #4a6cf7);\n}\n\n._bc_skin-name_1lm7fp8 {\n  font-size: 12px;\n}\n\n._bc_scan-list_1gth7fd {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  max-height: 260px;\n  overflow: auto;\n}\n\n._bc_scan-root_170i3od {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n._bc_scan-root-label_17sy68m {\n  font-size: 12px;\n  font-weight: 600;\n}\n\n._bc_scan-root-path_1m8z8nx {\n  font-size: 11px;\n  opacity: 0.55;\n  word-break: break-all;\n}\n\n._bc_scan-files_1ccqb2m {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  margin-top: 2px;\n}\n\n._bc_scan-file_1r5as59 {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 3px 8px;\n  font-size: 11.5px;\n  border: 1px solid var(--dsw-alias-border-default, rgba(128, 128, 128, 0.3));\n  border-radius: 999px;\n  cursor: pointer;\n  background: transparent;\n  color: inherit;\n  max-width: 100%;\n}\n\n._bc_scan-file_1r5as59:hover:not(:disabled) {\n  border-color: var(--dsw-alias-bg-module-platform, #4a6cf7);\n}\n\n._bc_scan-file_1r5as59 span {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  max-width: 180px;\n}\n\n._bc_scan-file_1r5as59:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n._bc_preview-strip_gae0ua {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\n\n._bc_preview-thumb_15jaqko {\n  width: 72px;\n  height: 72px;\n  object-fit: contain;\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-1, rgba(128, 128, 128, 0.1));\n}\n\n._bc_warning_y0isrn {\n  font-size: 12px;\n  color: #d97706;\n}\n\n._bc_error_gbqvld {\n  font-size: 12px;\n  color: #e5484d;\n}\n\n._bc_note_1hb9m3d {\n  font-size: 11.5px;\n  opacity: 0.6;\n  line-height: 1.5;\n}\n\n._bc_hidden-input_1b1vfx4 {\n  display: none;\n}\n\n._bc_select_11x9gzl {\n  padding: 5px 10px;\n  font-size: 12.5px;\n  border: 1px solid var(--dsw-alias-border-default, rgba(128, 128, 128, 0.35));\n  border-radius: 7px;\n  background: transparent;\n  color: inherit;\n}\n";
var tagId = "dsh-plugin-bongo-cat/src/client/BongoCatSection.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
  tag = document.createElement("style");
  tag.dataset.plugin = "dsh-plugin-bongo-cat";
  tag.dataset.pluginCss = tagId;
  tag.textContent = css;
  document.head.appendChild(tag);
}
var tag;
var BongoCatSection_default = { "section": "_bc_section_1bhg4yo", "hint": "_bc_hint_zqdh9u", "group": "_bc_group_17yh6dy", "group-title": "_bc_group-title_gti54r", "row": "_bc_row_11p08bn", "label": "_bc_label_1cdon2n", "value": "_bc_value_149aftu", "check": "_bc_check_onvuwf", "range": "_bc_range_cqo3a", "btn": "_bc_btn_5jrmvl", "btn-primary": "_bc_btn-primary_19phyb4", "btn-danger": "_bc_btn-danger_baqgkn", "active": "_bc_active_sypfs5", "gallery": "_bc_gallery_1sw40pt", "skin-card": "_bc_skin-card_1v8cdxr", "selected": "_bc_selected_1p6ho74", "skin-name": "_bc_skin-name_1lm7fp8", "scan-list": "_bc_scan-list_1gth7fd", "scan-root": "_bc_scan-root_170i3od", "scan-root-label": "_bc_scan-root-label_17sy68m", "scan-root-path": "_bc_scan-root-path_1m8z8nx", "scan-files": "_bc_scan-files_1ccqb2m", "scan-file": "_bc_scan-file_1r5as59", "preview-strip": "_bc_preview-strip_gae0ua", "preview-thumb": "_bc_preview-thumb_15jaqko", "warning": "_bc_warning_y0isrn", "error": "_bc_error_gbqvld", "note": "_bc_note_1hb9m3d", "hidden-input": "_bc_hidden-input_1b1vfx4", "select": "_bc_select_11x9gzl" };

// src/client/BongoCatSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
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
  return (0, import_react.useSyncExternalStore)(store.subscribe, store.getSnapshot);
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
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [scanning, setScanning] = (0, import_react.useState)(false);
  const [roots, setRoots] = (0, import_react.useState)(null);
  const [importedPath, setImportedPath] = (0, import_react.useState)(null);
  const [appliedPreset, setAppliedPreset] = (0, import_react.useState)(null);
  const [native, setNative] = (0, import_react.useState)({ available: false });
  const [nativeBusy, setNativeBusy] = (0, import_react.useState)(false);
  const [nativeError, setNativeError] = (0, import_react.useState)(null);
  const skinInputRef = (0, import_react.useRef)(null);
  const soundInputRef = (0, import_react.useRef)(null);
  const writable = isLoopback;
  const loadNative = async () => {
    const result = await rpc.call("/bongo-cat", "native/status", {});
    setNative(result.ok ? result.value : { available: false });
  };
  (0, import_react.useEffect)(() => {
    void loadNative();
  }, []);
  const importNative = async () => {
    setNativeBusy(true);
    setNativeError(null);
    try {
      const result = await rpc.call("/bongo-cat", "native/import", {});
      if (!result.ok) throw new Error(result.error.message);
      setNative(result.value);
      window.dispatchEvent(new Event("bongo-cat:native-changed"));
    } catch (err) {
      setNativeError(err instanceof Error ? err.message : String(err));
    } finally {
      setNativeBusy(false);
    }
  };
  const removeNative = async () => {
    setNativeBusy(true);
    setNativeError(null);
    try {
      const result = await rpc.call("/bongo-cat", "native/remove", {});
      if (!result.ok) throw new Error(result.error.message);
      setNative({ available: false });
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
  const importSkinFile = async (file) => {
    if (file.size > MAX_SKIN_BYTES) {
      setError(t("tooLarge"));
      return;
    }
    await run(async () => {
      const data = await readFileAsBase64(file);
      const result = await rpc.call("/bongo-cat", "skins/import", { data, name: file.name });
      if (!result.ok) throw new Error(result.error.message);
      await store.load();
    });
  };
  const importSkinPath = async (path, name) => {
    await run(async () => {
      const result = await rpc.call("/bongo-cat", "skins/import", { path, name });
      if (!result.ok) throw new Error(result.error.message);
      setImportedPath(name);
      await store.load();
    });
  };
  const removeSkin = async () => {
    await run(async () => {
      const result = await rpc.call("/bongo-cat", "skins/remove", {});
      if (!result.ok) throw new Error(result.error.message);
      await store.load();
    });
  };
  const importSoundFile = async (file) => {
    if (file.size > MAX_SOUND_BYTES) {
      setError(t("tooLarge"));
      return;
    }
    await run(async () => {
      const data = await readFileAsBase64(file);
      const result = await rpc.call("/bongo-cat", "sounds/import", { data, name: file.name });
      if (!result.ok) throw new Error(result.error.message);
      await store.load();
    });
  };
  const removeSound = async () => {
    await run(async () => {
      const result = await rpc.call("/bongo-cat", "sounds/remove", {});
      if (!result.ok) throw new Error(result.error.message);
      await store.load();
    });
  };
  const scan = async () => {
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
  const resetCounter = async () => {
    await run(async () => {
      const result = await rpc.call("/bongo-cat", "stats/reset", {});
      if (!result.ok) throw new Error(result.error.message);
      await store.load();
    });
  };
  if (snapshot.status === "loading") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.hint, children: t("loading") });
  }
  if (snapshot.status === "unavailable" || settings === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.hint, children: t("unavailable") });
  }
  const totalFiles = roots?.reduce((sum, root) => sum + root.files.length, 0) ?? 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.section, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.hint, children: t("hint") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: BongoCatSection_default.check, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "checkbox",
          checked: settings.enabled,
          onChange: (event) => void store.set({ enabled: event.target.checked })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("enabledLabel") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("rendererLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.row, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "select",
        {
          className: BongoCatSection_default.select,
          value: settings.renderer,
          onChange: (event) => void store.set({ renderer: event.target.value }),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "auto", children: t("rendererAuto") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "native", children: t("rendererNative") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "svg", children: t("rendererSvg") })
          ]
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["group-title"], style: { fontWeight: 400, opacity: 0.7 }, children: t("nativeLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.row, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: BongoCatSection_default.note, children: native.available ? `\u2713 ${t("nativeReady")} \xB7 ${native.skin ?? ""}${native.size ? ` \xB7 ${native.size[0]}\xD7${native.size[1]}` : ""}` : t("nativeMissing") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-primary"]}`,
            disabled: !writable || nativeBusy,
            onClick: () => void importNative(),
            children: native.available ? t("nativeReimport") : t("nativeImport")
          }
        ),
        native.available && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.note, children: t("nativeHint") }),
      nativeBusy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.hint, children: t("nativeBusy") }),
      nativeError !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.error, children: [
        t("nativeFailed"),
        ": ",
        nativeError
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("presetLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.row, children: PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
      appliedPreset !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.note, children: t("presetApplied") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("skinLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["group-title"], style: { fontWeight: 400, opacity: 0.7 }, children: t("builtinLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.gallery, children: BUILT_IN_SKINS.map((skin) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: `${BongoCatSection_default["skin-card"]} ${settings.skin === skin.id ? BongoCatSection_default.selected : ""}`,
          onClick: () => void store.set({ skin: skin.id }),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: catPreviewSvg(skin) } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: BongoCatSection_default["skin-name"], children: skin.name })
          ]
        },
        skin.id
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["group-title"], style: { fontWeight: 400, opacity: 0.7 }, children: t("customLabel") }),
      settings.customSkinRevision > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default["preview-strip"], children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { className: BongoCatSection_default["preview-thumb"], src: skinUrl(settings.customSkinRevision), alt: "" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.row, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-danger"]}`,
            disabled: !writable || busy,
            onClick: () => void removeSkin(),
            children: t("removeSkinButton")
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            ref: skinInputRef,
            type: "file",
            accept: "image/png,image/webp,image/gif,image/jpeg,image/bmp",
            className: BongoCatSection_default["hidden-input"],
            onChange: (event) => {
              const file = event.target.files?.[0] ?? null;
              event.target.value = "";
              if (file !== null) void importSkinFile(file);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-primary"]}`,
            disabled: !writable || busy,
            onClick: () => skinInputRef.current?.click(),
            children: t("importSkinButton")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: BongoCatSection_default.value, children: t("framesLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: BongoCatSection_default.range,
            type: "range",
            min: 2,
            max: 12,
            step: 1,
            value: settings.customSkinFrames,
            onChange: (event) => void store.set({ customSkinFrames: Number(event.target.value) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: BongoCatSection_default.value, children: settings.customSkinFrames })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.note, children: t("framesHint") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: BongoCatSection_default.btn,
            disabled: !writable || scanning,
            onClick: () => void scan(),
            children: scanning ? t("scanning") : t("scanButton")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: BongoCatSection_default.note, children: t("scanHint") })
      ] }),
      roots !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default["scan-list"], children: [
        roots.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.note, children: t("scanEmpty") }),
        roots.map((rootEntry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default["scan-root"], children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["scan-root-label"], children: rootEntry.label }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["scan-root-path"], children: rootEntry.path }),
          rootEntry.files.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.note, children: t("scanEmpty") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["scan-files"], children: rootEntry.files.map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: BongoCatSection_default["scan-file"],
              disabled: !writable || busy,
              title: `${file.path} \xB7 ${(file.size / 1024).toFixed(0)} KB`,
              onClick: () => void importSkinPath(file.path, file.name),
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: importedPath === file.name ? `${file.name} \u2713` : file.name })
            },
            file.path
          )) })
        ] }, rootEntry.path)),
        totalFiles > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.note, children: [
          "\xB7 ",
          totalFiles
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("soundLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: BongoCatSection_default.check, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: settings.soundEnabled,
            onChange: (event) => void store.set({ soundEnabled: event.target.checked })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("soundOnLabel") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: BongoCatSection_default.label, children: t("volumeLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: BongoCatSection_default.range,
            type: "range",
            min: 0,
            max: 100,
            value: Math.round(settings.volume * 100),
            onChange: (event) => void store.set({ volume: Number(event.target.value) / 100 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: BongoCatSection_default.value, children: [
          Math.round(settings.volume * 100),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            ref: soundInputRef,
            type: "file",
            accept: "audio/wav,audio/mpeg,audio/ogg",
            className: BongoCatSection_default["hidden-input"],
            onChange: (event) => {
              const file = event.target.files?.[0] ?? null;
              event.target.value = "";
              if (file !== null) void importSoundFile(file);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: BongoCatSection_default.btn,
            disabled: !writable || busy,
            onClick: () => soundInputRef.current?.click(),
            children: t("importSoundButton")
          }
        ),
        settings.customSoundRevision > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-danger"]}`,
            disabled: !writable || busy,
            onClick: () => void removeSound(),
            children: t("removeSoundButton")
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.note, children: settings.customSoundRevision > 0 ? "\u{1F3B5} " + settings.customSoundRevision : "\u{1F514} " })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("positionLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.row, children: POSITIONS.map((position) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: `${BongoCatSection_default.btn} ${settings.position === position ? BongoCatSection_default.active : ""}`,
          onClick: () => void store.set({ position }),
          children: t(POSITION_KEYS[position])
        },
        position
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: BongoCatSection_default.label, children: t("offsetLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: BongoCatSection_default.range,
            type: "range",
            min: 0,
            max: 240,
            value: Math.min(240, settings.offsetX),
            onChange: (event) => void store.set({ offsetX: Number(event.target.value) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: BongoCatSection_default.value, children: [
          settings.offsetX,
          "px"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: BongoCatSection_default.label, children: t("offsetLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: BongoCatSection_default.range,
            type: "range",
            min: 0,
            max: 240,
            value: Math.min(240, settings.offsetY),
            onChange: (event) => void store.set({ offsetY: Number(event.target.value) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: BongoCatSection_default.value, children: [
          settings.offsetY,
          "px"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: BongoCatSection_default.label, children: t("sizeLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: BongoCatSection_default.range,
            type: "range",
            min: 50,
            max: 300,
            value: Math.round(settings.size * 100),
            onChange: (event) => void store.set({ size: Number(event.target.value) / 100 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: BongoCatSection_default.value, children: [
          Math.round(settings.size * 100),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: BongoCatSection_default.label, children: t("speedLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: BongoCatSection_default.range,
            type: "range",
            min: 50,
            max: 250,
            value: Math.round(settings.speed * 100),
            onChange: (event) => void store.set({ speed: Number(event.target.value) / 100 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: BongoCatSection_default.value, children: [
          Math.round(settings.speed * 100),
          "%"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("counterLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: BongoCatSection_default.label, style: { fontSize: 20, fontWeight: 700 }, children: [
          "\u{1F941} ",
          settings.counter.toLocaleString()
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: `${BongoCatSection_default.btn} ${BongoCatSection_default["btn-danger"]}`,
            disabled: !writable || busy,
            onClick: () => void resetCounter(),
            children: t("counterReset")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: BongoCatSection_default.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default["group-title"], children: t("eggsLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: BongoCatSection_default.check, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: settings.eggFreak,
            onChange: (event) => void store.set({ eggFreak: event.target.checked })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("eggFreak") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: BongoCatSection_default.check, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: settings.eggSleep,
            onChange: (event) => void store.set({ eggSleep: event.target.checked })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("eggSleep") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: BongoCatSection_default.check, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: settings.eggPet,
            onChange: (event) => void store.set({ eggPet: event.target.checked })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("eggPet") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: BongoCatSection_default.check, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: settings.eggNight,
            onChange: (event) => void store.set({ eggNight: event.target.checked })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("eggNight") })
      ] })
    ] }),
    !isLoopback && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.warning, children: t("remoteWarning") }),
    error !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.error, children: error }),
    busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: BongoCatSection_default.hint, children: t("busy") })
  ] });
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
var css2 = "/* Bongo Cat overlay \u2014 motion & decoration gates.\n   Class names are scoped by the build script's CSS-modules pass; cat._bc_ts_166p8b0\n   imports the generated map. State classes (._bc_is-_n2u0xo*) are toggled from JS,\n   decorations are gated by the [data-deco] attribute on the root. */\n\n._bc_bc-root_2fqk0x {\n  position: fixed;\n  z-index: 9999;\n  pointer-events: none;\n  font-family: inherit;\n  transition: left 0.25s ease, top 0.25s ease;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-dragging_1oger8n {\n  transition: none;\n}\n\n._bc_bc-stage_n3fe77 {\n  position: relative;\n  pointer-events: auto;\n  cursor: grab;\n  touch-action: none;\n  user-select: none;\n  -webkit-user-select: none;\n  filter: drop-shadow(0 6px 14px rgba(20, 24, 40, 0.18));\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-dragging_1oger8n ._bc_bc-stage_n3fe77 {\n  cursor: grabbing;\n}\n\n._bc_bc-svg_b19sp1 {\n  display: block;\n  width: 100%;\n  height: auto;\n  overflow: visible;\n}\n\n/* \u2500\u2500 idle motion \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-body_1ssi89j {\n  transform-box: fill-box;\n  transform-origin: 50% 100%;\n  animation: bc-breath calc(2.8s / var(--bc-speed, 1)) ease-in-out infinite;\n}\n\n._bc_bc-head_14e288f {\n  transform-box: fill-box;\n  transform-origin: 50% 100%;\n  animation: bc-bob calc(3.4s / var(--bc-speed, 1)) ease-in-out infinite;\n}\n\n._bc_bc-tail_1ajcqev {\n  transform-box: fill-box;\n  transform-origin: 6% 92%;\n  animation: bc-tail-sway calc(2.6s / var(--bc-speed, 1)) ease-in-out infinite;\n}\n\n._bc_bc-eyes-open_1vyan04 {\n  transform-box: fill-box;\n  transform-origin: 50% 50%;\n  animation: bc-blink calc(5s / var(--bc-speed, 1)) ease-in-out infinite;\n}\n\n@keyframes bc-breath {\n  0%, 100% { transform: scale(1); }\n  50% { transform: scale(1.03); }\n}\n\n@keyframes bc-bob {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-2.5px); }\n}\n\n@keyframes bc-tail-sway {\n  0%, 100% { transform: rotate(-5deg); }\n  50% { transform: rotate(6deg); }\n}\n\n@keyframes bc-blink {\n  0%, 92%, 100% { transform: scaleY(1); }\n  95% { transform: scaleY(0.08); }\n}\n\n/* \u2500\u2500 paw taps \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-paw_1ob9ezl {\n  transform-box: fill-box;\n  transform-origin: 50% 0%;\n  transition: transform calc(90ms / var(--bc-speed, 1)) ease-out;\n}\n\n._bc_bc-key_1jvhafk {\n  transition: fill calc(140ms / var(--bc-speed, 1)) ease-out;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-tap-left_qsgpo4 ._bc_bc-paw-left_1tuzhiv {\n  transform: translateY(13px) rotate(-7deg);\n}\n\n._bc_bc-root_2fqk0x._bc_bc-tap-right_1usz7an ._bc_bc-paw-right_4x3z4c {\n  transform: translateY(13px) rotate(7deg);\n}\n\n._bc_bc-root_2fqk0x._bc_bc-tap-both_uq1w72 ._bc_bc-paw-left_1tuzhiv {\n  transform: translateY(13px) rotate(-7deg);\n}\n\n._bc_bc-root_2fqk0x._bc_bc-tap-both_uq1w72 ._bc_bc-paw-right_4x3z4c {\n  transform: translateY(13px) rotate(7deg);\n}\n\n._bc_bc-root_2fqk0x._bc_bc-tap-left_qsgpo4 ._bc_bc-key-l1_8hop9c,\n._bc_bc-root_2fqk0x._bc_bc-tap-left_qsgpo4 ._bc_bc-key-l2_1nhduo3 {\n  fill: var(--bc-accent);\n}\n\n._bc_bc-root_2fqk0x._bc_bc-tap-right_1usz7an ._bc_bc-key-r1_sivb2,\n._bc_bc-root_2fqk0x._bc_bc-tap-right_1usz7an ._bc_bc-key-r2_ll2o0t {\n  fill: var(--bc-accent);\n}\n\n._bc_bc-root_2fqk0x._bc_bc-tap-both_uq1w72 ._bc_bc-key-l1_8hop9c,\n._bc_bc-root_2fqk0x._bc_bc-tap-both_uq1w72 ._bc_bc-key-l2_1nhduo3,\n._bc_bc-root_2fqk0x._bc_bc-tap-both_uq1w72 ._bc_bc-key-r1_sivb2,\n._bc_bc-root_2fqk0x._bc_bc-tap-both_uq1w72 ._bc_bc-key-r2_ll2o0t,\n._bc_bc-root_2fqk0x._bc_bc-tap-both_uq1w72 ._bc_bc-key-space_xo15dl {\n  fill: var(--bc-accent);\n}\n\n/* \u2500\u2500 eye states \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-eyes-closed_14r0moi,\n._bc_bc-eyes-freak_uz7q57 {\n  display: none;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-sleeping_bor3cv ._bc_bc-eyes-open_1vyan04 {\n  display: none;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-sleeping_bor3cv ._bc_bc-eyes-closed_14r0moi {\n  display: inline;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-freak_1kz6aej ._bc_bc-eyes-open_1vyan04 {\n  display: none;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-freak_1kz6aej ._bc_bc-eyes-freak_uz7q57 {\n  display: inline;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-sleeping_bor3cv ._bc_bc-body_1ssi89j,\n._bc_bc-root_2fqk0x._bc_bc-is-sleeping_bor3cv ._bc_bc-head_14e288f,\n._bc_bc-root_2fqk0x._bc_bc-is-sleeping_bor3cv ._bc_bc-tail_1ajcqev {\n  animation-duration: calc(6s / var(--bc-speed, 1));\n}\n\n/* \u2500\u2500 decorations (default hidden, gated by data-deco) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_deco_10nuig6,\n._bc_bc-acc_1nh3xfq {\n  display: none;\n}\n\n._bc_bc-root_2fqk0x[data-deco~='stripes'] ._bc_deco-stripes_aucmep,\n._bc_bc-root_2fqk0x[data-deco~='stripes'] ._bc_deco-tail-stripe_1malxfj,\n._bc_bc-root_2fqk0x[data-deco~='patches'] ._bc_deco-patch-a_11uw0cp,\n._bc_bc-root_2fqk0x[data-deco~='patches'] ._bc_deco-patch-b_1tgqx7u,\n._bc_bc-root_2fqk0x[data-deco~='chest'] ._bc_deco-chest_1rciici {\n  display: inline;\n}\n\n._bc_bc-root_2fqk0x[data-deco~='mask'] ._bc_bc-maskable_1kiykl5 {\n  fill: var(--bc-mask);\n  stroke: var(--bc-mask);\n}\n\n._bc_bc-root_2fqk0x[data-deco~='acc-party'] ._bc_bc-acc-party_fkqyg5,\n._bc_bc-root_2fqk0x[data-deco~='acc-witch'] ._bc_bc-acc-witch_1r7c08a,\n._bc_bc-root_2fqk0x[data-deco~='acc-crown'] ._bc_bc-acc-crown_1gx9kek,\n._bc_bc-root_2fqk0x[data-deco~='acc-bowtie'] ._bc_bc-acc-bowtie_14yq615,\n._bc_bc-root_2fqk0x[data-deco~='acc-sakura'] ._bc_bc-acc-sakura_1dpb35g {\n  display: inline;\n}\n\n/* \u2500\u2500 freak mode \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-root_2fqk0x._bc_bc-is-freak_1kz6aej ._bc_bc-paw-left_1tuzhiv {\n  animation: bc-flail-l calc(120ms / var(--bc-speed, 1)) linear infinite alternate;\n  transition: none;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-freak_1kz6aej ._bc_bc-paw-right_4x3z4c {\n  animation: bc-flail-r calc(120ms / var(--bc-speed, 1)) linear infinite alternate;\n  transition: none;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-freak_1kz6aej ._bc_bc-key-l1_8hop9c,\n._bc_bc-root_2fqk0x._bc_bc-is-freak_1kz6aej ._bc_bc-key-l2_1nhduo3,\n._bc_bc-root_2fqk0x._bc_bc-is-freak_1kz6aej ._bc_bc-key-r1_sivb2,\n._bc_bc-root_2fqk0x._bc_bc-is-freak_1kz6aej ._bc_bc-key-r2_ll2o0t,\n._bc_bc-root_2fqk0x._bc_bc-is-freak_1kz6aej ._bc_bc-key-space_xo15dl {\n  fill: var(--bc-accent);\n}\n\n@keyframes bc-flail-l {\n  from { transform: translateY(0) rotate(0); }\n  to { transform: translateY(13px) rotate(-9deg); }\n}\n\n@keyframes bc-flail-r {\n  from { transform: translateY(0) rotate(0); }\n  to { transform: translateY(13px) rotate(9deg); }\n}\n\n._bc_bc-sparks_rk9nqn {\n  display: none;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-freak_1kz6aej ._bc_bc-sparks_rk9nqn {\n  display: inline;\n}\n\n._bc_bc-spark_1xw1vek {\n  animation: bc-spark-pop calc(520ms / var(--bc-speed, 1)) ease-in-out infinite;\n}\n\n._bc_bc-sp2_qj3246 { animation-delay: 120ms; }\n._bc_bc-sp3_1v4sdw7 { animation-delay: 240ms; }\n._bc_bc-sp4_1k9ldtc { animation-delay: 360ms; }\n\n@keyframes bc-spark-pop {\n  0%, 100% { opacity: 0; transform: scale(0.4); }\n  50% { opacity: 1; transform: scale(1.15); }\n}\n\n._bc_bc-spark_1xw1vek {\n  transform-box: fill-box;\n  transform-origin: 50% 50%;\n}\n\n/* \u2500\u2500 sleep: floating Zzz \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-zzz_2vntwd {\n  display: none;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-sleeping_bor3cv ._bc_bc-zzz_2vntwd {\n  display: inline;\n}\n\n._bc_bc-z_1gcgoyl {\n  opacity: 0;\n  animation: bc-zzz-float calc(2.4s / var(--bc-speed, 1)) ease-in-out infinite;\n}\n\n._bc_bc-z2_18ljm7 { animation-delay: 0.8s; }\n._bc_bc-z3_14n03ou { animation-delay: 1.6s; }\n\n@keyframes bc-zzz-float {\n  0% { opacity: 0; transform: translate(0, 6px); }\n  40% { opacity: 1; }\n  100% { opacity: 0; transform: translate(8px, -16px); }\n}\n\n._bc_bc-z_1gcgoyl {\n  transform-box: fill-box;\n}\n\n/* \u2500\u2500 petting: floating heart \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-heart_em7er1 {\n  display: none;\n  transform-box: fill-box;\n  transform-origin: 50% 100%;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-is-petting_1x406jp ._bc_bc-heart_em7er1 {\n  display: inline;\n  animation: bc-heart-float calc(750ms / var(--bc-speed, 1)) ease-out;\n}\n\n@keyframes bc-heart-float {\n  0% { opacity: 0; transform: translate(130px, 34px) scale(0.4); }\n  25% { opacity: 1; }\n  100% { opacity: 0; transform: translate(130px, -26px) scale(1.5); }\n}\n\n/* \u2500\u2500 late night: sleepy palette \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-root_2fqk0x[data-night] ._bc_bc-svg_b19sp1 {\n  filter: saturate(0.75) brightness(0.93);\n}\n\n/* \u2500\u2500 counter badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-badge_ogz2ea {\n  position: absolute;\n  top: -8px;\n  right: -14px;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  padding: 2px 8px 2px 6px;\n  border-radius: 999px;\n  background: rgba(24, 26, 38, 0.78);\n  color: #fff;\n  font-size: 11px;\n  line-height: 1.5;\n  font-variant-numeric: tabular-nums;\n  pointer-events: none;\n  box-shadow: 0 2px 8px rgba(20, 24, 40, 0.25);\n  backdrop-filter: blur(4px);\n}\n\n._bc_bc-badge-drum_8ogyo1 {\n  font-size: 11px;\n}\n\n._bc_bc-badge-count_qc01m4 {\n  font-weight: 600;\n}\n\n/* \u2500\u2500 original Steam artwork layer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-native_1c74lk6 {\n  display: none;\n  position: relative;\n  width: 100%;\n  line-height: 0;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-native-mode_7utazs ._bc_bc-native_1c74lk6 {\n  display: block;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-native-mode_7utazs ._bc_bc-svg_b19sp1 {\n  display: none;\n}\n\n._bc_bc-native-img_1nyrrl4 {\n  display: none;\n  width: 100%;\n  height: auto;\n  user-select: none;\n  -webkit-user-drag: none;\n}\n\n._bc_bc-native_1c74lk6[data-active='idle'] ._bc_bc-native-img_1nyrrl4[data-frame='idle'],\n._bc_bc-native_1c74lk6[data-active='tap-left'] ._bc_bc-native-img_1nyrrl4[data-frame='tap-left'],\n._bc_bc-native_1c74lk6[data-active='tap-right'] ._bc_bc-native-img_1nyrrl4[data-frame='tap-right'] {\n  display: block;\n}\n\n/* \u2500\u2500 custom sprite-sheet skin \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-sprite_ijot5a {\n  display: none;\n  width: 100%;\n  aspect-ratio: 1 / 1;\n  background-repeat: no-repeat;\n  background-position: 0 50%;\n  image-rendering: auto;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-sprite-mode_wa3sow ._bc_bc-svg_b19sp1 {\n  display: none;\n}\n\n._bc_bc-root_2fqk0x._bc_bc-sprite-mode_wa3sow ._bc_bc-sprite_ijot5a {\n  display: block;\n}\n\n/* \u2500\u2500 visibility pause (hidden tab: freeze all motion) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-root_2fqk0x._bc_bc-paused_1nz3pn5 ._bc_bc-svg_b19sp1,\n._bc_bc-root_2fqk0x._bc_bc-paused_1nz3pn5 ._bc_bc-svg_b19sp1 * {\n  animation-play-state: paused !important;\n}\n\n/* \u2500\u2500 first-run hint toast \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-toast_10ncxkq {\n  position: absolute;\n  bottom: calc(100% + 10px);\n  left: 50%;\n  transform: translateX(-50%);\n  width: max-content;\n  max-width: 220px;\n  padding: 7px 12px;\n  border-radius: 10px;\n  background: rgba(24, 26, 38, 0.86);\n  color: #fff;\n  font-size: 12px;\n  line-height: 1.5;\n  text-align: center;\n  pointer-events: none;\n  box-shadow: 0 4px 16px rgba(20, 24, 40, 0.3);\n  animation: bc-toast-in 240ms ease-out;\n}\n\n@keyframes bc-toast-in {\n  from { opacity: 0; transform: translateX(-50%) translateY(6px); }\n  to { opacity: 1; transform: translateX(-50%) translateY(0); }\n}\n\n/* \u2500\u2500 skin gallery preview \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n._bc_bc-preview-svg_eup7fm {\n  display: block;\n  width: 100%;\n  height: auto;\n}\n\n/* \u2500\u2500 accessibility \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n@media (prefers-reduced-motion: reduce) {\n  ._bc_bc-svg_b19sp1 *,\n  ._bc_bc-spark_1xw1vek,\n  ._bc_bc-z_1gcgoyl {\n    animation: none !important;\n  }\n}\n";
var tagId2 = "dsh-plugin-bongo-cat/src/client/cat.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId2) + "]") === null) {
  tag2 = document.createElement("style");
  tag2.dataset.plugin = "dsh-plugin-bongo-cat";
  tag2.dataset.pluginCss = tagId2;
  tag2.textContent = css2;
  document.head.appendChild(tag2);
}
var tag2;
var cat_default = { "ts": "_bc_ts_166p8b0", "is-": "_bc_is-_n2u0xo", "bc-root": "_bc_bc-root_2fqk0x", "bc-is-dragging": "_bc_bc-is-dragging_1oger8n", "bc-stage": "_bc_bc-stage_n3fe77", "bc-svg": "_bc_bc-svg_b19sp1", "bc-body": "_bc_bc-body_1ssi89j", "bc-head": "_bc_bc-head_14e288f", "bc-tail": "_bc_bc-tail_1ajcqev", "bc-eyes-open": "_bc_bc-eyes-open_1vyan04", "bc-paw": "_bc_bc-paw_1ob9ezl", "bc-key": "_bc_bc-key_1jvhafk", "bc-tap-left": "_bc_bc-tap-left_qsgpo4", "bc-paw-left": "_bc_bc-paw-left_1tuzhiv", "bc-tap-right": "_bc_bc-tap-right_1usz7an", "bc-paw-right": "_bc_bc-paw-right_4x3z4c", "bc-tap-both": "_bc_bc-tap-both_uq1w72", "bc-key-l1": "_bc_bc-key-l1_8hop9c", "bc-key-l2": "_bc_bc-key-l2_1nhduo3", "bc-key-r1": "_bc_bc-key-r1_sivb2", "bc-key-r2": "_bc_bc-key-r2_ll2o0t", "bc-key-space": "_bc_bc-key-space_xo15dl", "bc-eyes-closed": "_bc_bc-eyes-closed_14r0moi", "bc-eyes-freak": "_bc_bc-eyes-freak_uz7q57", "bc-is-sleeping": "_bc_bc-is-sleeping_bor3cv", "bc-is-freak": "_bc_bc-is-freak_1kz6aej", "deco": "_bc_deco_10nuig6", "bc-acc": "_bc_bc-acc_1nh3xfq", "deco-stripes": "_bc_deco-stripes_aucmep", "deco-tail-stripe": "_bc_deco-tail-stripe_1malxfj", "deco-patch-a": "_bc_deco-patch-a_11uw0cp", "deco-patch-b": "_bc_deco-patch-b_1tgqx7u", "deco-chest": "_bc_deco-chest_1rciici", "bc-maskable": "_bc_bc-maskable_1kiykl5", "bc-acc-party": "_bc_bc-acc-party_fkqyg5", "bc-acc-witch": "_bc_bc-acc-witch_1r7c08a", "bc-acc-crown": "_bc_bc-acc-crown_1gx9kek", "bc-acc-bowtie": "_bc_bc-acc-bowtie_14yq615", "bc-acc-sakura": "_bc_bc-acc-sakura_1dpb35g", "bc-sparks": "_bc_bc-sparks_rk9nqn", "bc-spark": "_bc_bc-spark_1xw1vek", "bc-sp2": "_bc_bc-sp2_qj3246", "bc-sp3": "_bc_bc-sp3_1v4sdw7", "bc-sp4": "_bc_bc-sp4_1k9ldtc", "bc-zzz": "_bc_bc-zzz_2vntwd", "bc-z": "_bc_bc-z_1gcgoyl", "bc-z2": "_bc_bc-z2_18ljm7", "bc-z3": "_bc_bc-z3_14n03ou", "bc-heart": "_bc_bc-heart_em7er1", "bc-is-petting": "_bc_bc-is-petting_1x406jp", "bc-badge": "_bc_bc-badge_ogz2ea", "bc-badge-drum": "_bc_bc-badge-drum_8ogyo1", "bc-badge-count": "_bc_bc-badge-count_qc01m4", "bc-native": "_bc_bc-native_1c74lk6", "bc-native-mode": "_bc_bc-native-mode_7utazs", "bc-native-img": "_bc_bc-native-img_1nyrrl4", "bc-sprite": "_bc_bc-sprite_ijot5a", "bc-sprite-mode": "_bc_bc-sprite-mode_wa3sow", "bc-paused": "_bc_bc-paused_1nz3pn5", "bc-toast": "_bc_bc-toast_10ncxkq", "bc-preview-svg": "_bc_bc-preview-svg_eup7fm" };

// src/client/cat.ts
var ROOT_ID = "dsh-bongo-cat-root";
var BASE_WIDTH = 150;
var TAP_MS = 130;
var NATIVE_FRAMES = ["idle", "tap-left", "tap-right"];
var FREAK_WINDOW_MS = 1500;
var FREAK_MIN_TAPS = 8;
var FREAK_DURATION_MS = 2500;
var SLEEP_IDLE_MS = 9e4;
var SLEEP_NIGHT_MS = 45e3;
var STATS_FLUSH_TAPS = 20;
var STATS_FLUSH_MS = 4e3;
var CORNER_CYCLE = ["bottom-right", "bottom-left", "top-left", "top-right"];
var StatsFlusher = class {
  constructor(rpc) {
    this.rpc = rpc;
  }
  rpc;
  pending = 0;
  timer = null;
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
    if (this.pending === 0) return;
    const count = this.pending;
    const result = await this.rpc.call("/bongo-cat", "stats/bump", { count });
    if (result.ok) this.pending = 0;
  }
  dispose() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }
};
function attachBongoCat(ctx, store, rpc, t) {
  if (document.getElementById(ROOT_ID) !== null) return () => void 0;
  const sound = new BongoSound();
  const stats = new StatsFlusher(rpc);
  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.className = cat_default["bc-root"];
  root.dataset.plugin = "dsh-plugin-bongo-cat";
  const stage = document.createElement("div");
  stage.className = cat_default["bc-stage"];
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
  const svgHost = document.createElement("div");
  svgHost.innerHTML = CAT_SVG;
  const svg = svgHost.firstElementChild;
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
  if (svg !== null) stage.append(svg);
  stage.append(sprite, nativeWrap, badge);
  root.append(stage);
  document.body.append(root);
  let settings = null;
  let disposed = false;
  let paused = false;
  let tapSide = "left";
  let tapTimer = null;
  let freakTimer = null;
  let idleTimer = null;
  let spriteIdleTimer = null;
  let hintToastTimer = null;
  let sessionTaps = 0;
  let lastInputAt = Date.now();
  const recentTaps = [];
  let nativeStatus = { available: false };
  let nativeStamp = "";
  let nativeFrame = "idle";
  const cls = (name) => cat_default[name] ?? name;
  const applyPalette = (next) => {
    const skin = findSkin(next.skin);
    root.setAttribute("style", paletteVars(skin));
    root.dataset.deco = decoValue(skin);
    root.dataset.scheme = "light";
  };
  const applySprite = (next) => {
    const active = next.customSkinRevision > 0;
    root.classList.toggle(cls("bc-sprite-mode"), active);
    if (!active) return;
    const frames = Math.min(12, Math.max(2, next.customSkinFrames));
    sprite.style.backgroundImage = `url("${skinUrl(next.customSkinRevision)}")`;
    sprite.style.backgroundSize = `${frames * 100}% 100%`;
    sprite.style.backgroundPosition = "0 50%";
  };
  const stageSize = (next) => {
    const width = Math.round(BASE_WIDTH * next.size);
    return { width, height: stage.offsetHeight || Math.round(width / (260 / 230)) };
  };
  const applyPosition = (next) => {
    const { width, height } = stageSize(next);
    stage.style.width = `${width}px`;
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
    count.textContent = (next.counter + sessionTaps).toLocaleString();
  };
  const applySound = (next) => {
    sound.setVolume(next.soundEnabled ? next.volume : 0);
    sound.setCustomUrl(next.customSoundRevision > 0 ? soundUrl(next.customSoundRevision) : null);
  };
  const applySpeed = (next) => {
    root.style.setProperty("--bc-speed", String(Math.min(2.5, Math.max(0.5, next.speed))));
  };
  const applyNativeSources = () => {
    if (!nativeStatus.available) return;
    const stamp = nativeStamp || nativeStatus.extractedAt || "1";
    for (const frame of NATIVE_FRAMES) {
      const img = nativeImgs[frame];
      if (!img) continue;
      const url = nativeFrameUrl(frame, stamp);
      if (img.getAttribute("src") !== url) img.src = url;
    }
  };
  const applyMode = (next) => {
    const useNative = next.renderer !== "svg" && nativeStatus.available;
    root.classList.toggle(cls("bc-native-mode"), useNative);
    nativeWrap.style.display = useNative ? "" : "none";
    if (useNative) applyNativeSources();
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
  };
  const applyNight = () => {
    const hour = (/* @__PURE__ */ new Date()).getHours();
    const night = settings?.eggNight === true && (hour >= 23 || hour < 6);
    if (night) root.dataset.night = "";
    else delete root.dataset.night;
  };
  const paint = (next) => {
    const prev = settings;
    settings = next;
    if (prev === null || prev.skin !== next.skin) {
      applyPalette(next);
      applySpeed(next);
    }
    if (prev === null || prev.customSkinRevision !== next.customSkinRevision || prev.customSkinFrames !== next.customSkinFrames) {
      applySprite(next);
    }
    applyPosition(next);
    applyBadge(next);
    applySound(next);
    applyMode(next);
    applyNight();
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
  const setTap = (side) => {
    root.classList.remove(cls("bc-tap-left"), cls("bc-tap-right"), cls("bc-tap-both"));
    void root.offsetWidth;
    root.classList.add(cls(`bc-tap-${side}`));
    setNativeFrame(side === "left" ? "tap-left" : "tap-right");
    if (tapTimer !== null) window.clearTimeout(tapTimer);
    tapTimer = window.setTimeout(() => {
      root.classList.remove(cls("bc-tap-left"), cls("bc-tap-right"), cls("bc-tap-both"));
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
    }, 700);
  };
  const enterFreak = () => {
    if (settings?.eggFreak !== true) return;
    root.classList.add(cls("bc-is-freak"));
    if (freakTimer !== null) window.clearTimeout(freakTimer);
    freakTimer = window.setTimeout(() => {
      root.classList.remove(cls("bc-is-freak"));
      freakTimer = null;
    }, FREAK_DURATION_MS);
  };
  const wake = () => {
    lastInputAt = Date.now();
    root.classList.remove(cls("bc-is-sleeping"));
  };
  const slap = (side) => {
    if (settings === null || paused) return;
    wake();
    if (side === "left" || side === "right") {
      tapSide = side;
      setTap(side);
      setSpriteFrame(side === "left" ? 1 : 2);
    } else {
      setTap("both");
      setSpriteFrame(3);
    }
    if (settings.soundEnabled) {
      const freaking = root.classList.contains(cls("bc-is-freak"));
      sound.tok(freaking ? 1.45 : 1);
    }
    sessionTaps += 1;
    applyBadge(settings);
    stats.add(1);
    const now = Date.now();
    recentTaps.push(now);
    while (recentTaps.length > 0 && now - recentTaps[0] > FREAK_WINDOW_MS) recentTaps.shift();
    if (recentTaps.length >= FREAK_MIN_TAPS) enterFreak();
  };
  const pet = () => {
    if (settings?.eggPet !== true) return;
    wake();
    root.classList.add(cls("bc-is-petting"));
    if (settings.soundEnabled) sound.boop();
    window.setTimeout(() => root.classList.remove(cls("bc-is-petting")), 750);
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
    slap(tapSide === "left" ? "right" : "left");
  };
  const onPointerDown = (event) => {
    if (disposed || settings === null || !settings.enabled) return;
    if (event.button !== 0) return;
    if (event.target !== null && root.contains(event.target)) return;
    slap("both");
  };
  let dragStart = null;
  let dragging = false;
  const onStagePointerDown = (event) => {
    if (event.button !== 0) return;
    dragStart = { x: event.clientX, y: event.clientY, left: root.offsetLeft, top: root.offsetTop };
    stage.setPointerCapture(event.pointerId);
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
  const onStageClick = (event) => {
    if (dragging) return;
    if (event.detail > 1) {
      cycleCorner();
      return;
    }
    pet();
  };
  const onVisibilityChange = () => {
    if (disposed) return;
    const hidden = document.visibilityState === "hidden";
    if (hidden === paused) return;
    paused = hidden;
    root.classList.toggle(cls("bc-paused"), paused);
    if (paused) {
      sound.suspend();
    } else {
      sound.resume();
      lastInputAt = Date.now();
    }
  };
  const onIdleTick = () => {
    if (disposed || settings === null || paused) return;
    applyNight();
    if (settings.eggSleep !== true) return;
    const idle = Date.now() - lastInputAt;
    const night = root.dataset.night !== void 0;
    const threshold = night ? SLEEP_NIGHT_MS : SLEEP_IDLE_MS;
    if (idle >= threshold && !root.classList.contains(cls("bc-is-freak"))) {
      root.classList.add(cls("bc-is-sleeping"));
    }
  };
  idleTimer = window.setInterval(onIdleTick, 5e3);
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
  window.addEventListener("pagehide", () => {
    void stats.flush();
  });
  const onNativeChanged = () => {
    void refreshNative();
  };
  window.addEventListener("bongo-cat:native-changed", onNativeChanged);
  void refreshNative();
  const initial = store.getSnapshot();
  if (initial.status === "ready" && initial.value !== void 0) paint(initial.value);
  return () => {
    disposed = true;
    window.clearTimeout(tapTimer ?? 0);
    window.clearTimeout(freakTimer ?? 0);
    window.clearTimeout(hintToastTimer ?? 0);
    if (idleTimer !== null) window.clearInterval(idleTimer);
    if (spriteIdleTimer !== null) window.clearTimeout(spriteIdleTimer);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("bongo-cat:native-changed", onNativeChanged);
    window.removeEventListener("resize", onResize);
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
  hint: "\u6253\u5B57\u3001\u70B9\u9F20\u6807\uFF0C\u5B83\u90FD\u4F1A\u4E3E\u8D77\u5C0F\u8089\u722A\u6572\u6572\u6253\u6253\u3002\u6309\u4F4F\u5B83\u53EF\u4EE5\u62D6\u52A8\u6362\u4F4D\u7F6E\uFF0C\u53CC\u51FB\u8BA9\u5B83\u6362\u4E2A\u89D2\u843D\u5F85\u7740\u3002",
  hintToast: "\u90A6\u54E5\u732B\u4E0A\u7EBF\u5566\uFF01\u6253\u5B57\u3001\u70B9\u9F20\u6807\uFF0C\u5B83\u5C31\u4F1A\u6572\u8D77\u6765\uFF5E",
  enabledLabel: "\u542F\u7528\u90A6\u54E5\u732B",
  rendererLabel: "\u732B\u54AA\u6765\u6E90",
  rendererAuto: "\u81EA\u52A8\uFF08\u4F18\u5148\u539F\u7248\uFF09",
  rendererNative: "Steam \u539F\u7248",
  rendererSvg: "\u5185\u7F6E SVG",
  nativeLabel: "\u539F\u7248\u8D44\u6E90\uFF08Steam\uFF09",
  nativeHint: "\u4ECE\u4F60\u672C\u673A\u5B89\u88C5\u7684 Bongo Cat \u4E2D\u8BFB\u53D6\u539F\u59CB\u7F8E\u672F\u8D44\u6E90\uFF0C\u5728\u539F\u4F4D\u9010\u5E27\u5408\u6210\uFF0C\u6548\u679C\u4E0E\u539F\u7248\u4E00\u81F4\uFF1B\u8D44\u6E90\u4E0D\u79BB\u5F00\u672C\u673A\u3002\u9996\u6B21\u5BFC\u5165\u4F1A\u81EA\u52A8\u51C6\u5907\u8FD0\u884C\u73AF\u5883\uFF08\u4E0B\u8F7D UnityPy \u7EA6 50 MB\uFF0C\u9700\u8981\u8054\u7F51\uFF0C1 \u5206\u949F\u5DE6\u53F3\uFF09\uFF0C\u4E4B\u540E\u79D2\u5F00\u3002",
  nativeMissing: "\u5C1A\u672A\u5BFC\u5165\uFF1A\u5F53\u524D\u663E\u793A\u7684\u662F\u5185\u7F6E SVG \u732B",
  nativeReady: "\u5DF2\u5C31\u7EEA",
  nativeImport: "\u4ECE Steam \u5BFC\u5165\u539F\u7248\u8D44\u6E90",
  nativeReimport: "\u91CD\u65B0\u63D0\u53D6",
  nativeRemove: "\u79FB\u9664\u539F\u7248\u8D44\u6E90",
  nativeBusy: "\u6B63\u5728\u51C6\u5907\u73AF\u5883\u5E76\u63D0\u53D6\uFF08\u9996\u6B21\u9700\u4E0B\u8F7D UnityPy\uFF0C\u7EA6 1 \u5206\u949F\uFF09\u2026",
  nativeFailed: "\u5BFC\u5165\u5931\u8D25",
  nativeSkin: "\u76AE\u80A4",
  skinLabel: "\u76AE\u80A4",
  builtinLabel: "\u5185\u7F6E\u76AE\u80A4",
  customLabel: "\u81EA\u5B9A\u4E49\u56FE\u7247\u76AE\u80A4\uFF08\u7CBE\u7075\u56FE\uFF09",
  importSkinButton: "\u5BFC\u5165\u56FE\u7247\u76AE\u80A4",
  removeSkinButton: "\u79FB\u9664\u81EA\u5B9A\u4E49\u76AE\u80A4",
  framesLabel: "\u5E27\u6570",
  framesHint: "\u6A2A\u5411\u7CBE\u7075\u56FE\uFF1A\u7B2C 1 \u5E27\u5F85\u673A\u3001\u7B2C 2 \u5E27\u5DE6\u722A\u3001\u7B2C 3 \u5E27\u53F3\u722A\u3001\u7B2C 4 \u5E27\u53CC\u722A\uFF0C\u5176\u4F59\u5E27\u4F9D\u6B21\u5FAA\u73AF\u3002",
  scanButton: "\u626B\u63CF\u672C\u673A Bongo Cat",
  scanning: "\u6B63\u5728\u626B\u63CF Steam \u5E93\u4E0E\u521B\u610F\u5DE5\u574A\u2026",
  scanEmpty: "\u8FD9\u91CC\u6CA1\u6709\u627E\u5230\u56FE\u7247\u6587\u4EF6\u3002",
  scanHint: "\u626B\u63CF Steam \u5E93\u4E2D\u7684 Bongo Cat \u5B89\u88C5\u76EE\u5F55\u4E0E\u521B\u610F\u5DE5\u574A\uFF08app 1337970\uFF09\uFF0C\u70B9\u51FB\u6587\u4EF6\u5373\u53EF\u5BFC\u5165\u4E3A\u76AE\u80A4\u3002",
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
  speedLabel: "\u52A8\u753B\u901F\u5EA6",
  presetLabel: "\u5FC3\u60C5\u9884\u7F6E",
  presetFocus: "\u4E13\u6CE8",
  presetZen: "\u7985\u57DF",
  presetParty: "\u6D3E\u5BF9",
  presetNight: "\u591C\u732B",
  presetApplied: "\u5DF2\u5957\u7528",
  counterLabel: "\u6572\u51FB\u603B\u6570",
  counterReset: "\u91CD\u7F6E\u8BA1\u6570",
  eggsLabel: "\u8DA3\u5473\u5F69\u86CB",
  eggFreak: "\u72C2\u66B4\u6A21\u5F0F\uFF1A\u8FDE\u7EED\u5FEB\u6253\u65F6\u732B\u4F1A\u8FDB\u5165\u75AF\u72C2\u6572\u51FB",
  eggSleep: "\u6253\u778C\u7761\uFF1A\u957F\u65F6\u95F4\u4E0D\u6572\u6253\u65F6\u732B\u4F1A\u7761\u7740",
  eggPet: "\u70B9\u732B\u4E92\u52A8\uFF1A\u5355\u51FB\u732B\u54AA\u89E6\u53D1\u6478\u5934\u6740",
  eggNight: "\u6DF1\u591C\u6A21\u5F0F\uFF1A\u6DF1\u591C\u732B\u54AA\u4F1A\u72AF\u56F0",
  loading: "\u6B63\u5728\u8BFB\u53D6\u8BBE\u7F6E\u2026",
  unavailable: "\u65E0\u6CD5\u8BFB\u53D6\u90A6\u54E5\u732B\u8BBE\u7F6E\u3002",
  remoteWarning: "\u5F53\u524D\u9875\u9762\u5E76\u975E\u672C\u673A\u8BBF\u95EE\uFF0C\u65E0\u6CD5\u5BFC\u5165\u76AE\u80A4\u6216\u97F3\u6548\uFF08\u4EC5\u672C\u673A\u53EF\u5199\u5165\uFF09\u3002",
  tooLarge: "\u6587\u4EF6\u8FC7\u5927\uFF08\u56FE\u7247 \u2264 8 MB\uFF0C\u97F3\u6548 \u2264 2 MB\uFF09\u3002",
  busy: "\u5904\u7406\u4E2D\u2026"
};
var en = {
  nav: "Bongo Cat",
  hint: "Type or click and the cat drums along. Drag it to move, double-click to cycle corners.",
  hintToast: "Bongo Cat is online! Type or click and it starts drumming~",
  enabledLabel: "Enable Bongo Cat",
  rendererLabel: "Cat source",
  rendererAuto: "Auto (prefer original)",
  rendererNative: "Steam original",
  rendererSvg: "Built-in SVG",
  nativeLabel: "Original assets (Steam)",
  nativeHint: "Reads the original artwork from your installed Bongo Cat and composes the frames where the game puts them. Assets never leave this machine. The first import bootstraps its own environment (downloads UnityPy, ~50 MB, needs network, about a minute); later imports are instant.",
  nativeMissing: "Not imported yet \u2014 showing the built-in SVG cat",
  nativeReady: "Ready",
  nativeImport: "Import original assets from Steam",
  nativeReimport: "Re-extract",
  nativeRemove: "Remove original assets",
  nativeBusy: "Preparing the environment and extracting (first run downloads UnityPy, ~1 min)\u2026",
  nativeFailed: "Import failed",
  nativeSkin: "Skin",
  skinLabel: "Skin",
  builtinLabel: "Built-in skins",
  customLabel: "Custom image skin (sprite strip)",
  importSkinButton: "Import image skin",
  removeSkinButton: "Remove custom skin",
  framesLabel: "Frames",
  framesHint: "Horizontal sprite strip: frame 1 idle, 2 left paw, 3 right paw, 4 both paws; extra frames cycle.",
  scanButton: "Scan local Bongo Cat",
  scanning: "Scanning Steam libraries and Workshop\u2026",
  scanEmpty: "No image files found here.",
  scanHint: "Scans Steam libraries for the Bongo Cat install and Workshop content (app 1337970); click a file to import it as a skin.",
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
  speedLabel: "Animation speed",
  presetLabel: "Mood presets",
  presetFocus: "Focus",
  presetZen: "Zen",
  presetParty: "Party",
  presetNight: "Night owl",
  presetApplied: "Applied",
  counterLabel: "Total taps",
  counterReset: "Reset counter",
  eggsLabel: "Easter eggs",
  eggFreak: "Freak mode: burst typing sends the cat into a drumming frenzy",
  eggSleep: "Dozing off after a long stretch without taps",
  eggPet: "Petting: click the cat for a headpat",
  eggNight: "Late night: the cat gets sleepy after midnight",
  loading: "Loading settings\u2026",
  unavailable: "Bongo Cat settings are unavailable.",
  remoteWarning: "This page is not opened from this machine; importing skins or sounds is unavailable (writes are loopback-only).",
  tooLarge: "File too large (images \u2264 8 MB, sounds \u2264 2 MB).",
  busy: "Working\u2026"
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
