/**
 * The Bongo Cat SVG.
 *
 * Every paintable shape reads its color from a CSS custom property
 * (--bc-*), so a skin switch only rewrites those properties on the
 * overlay root — no DOM rebuild. Decoration groups (stripes / mask /
 * patches / chest / accessories) are toggled through [data-deco]
 * selectors in cat.module.css.
 *
 * Animated groups (paws, eyes, tail, body, effects) are plain SVG groups
 * driven by CSS classes on the root: .is-tapping, .is-freak, .is-sleeping,
 * .is-petting. See cat.module.css for the motion.
 */
export const CAT_SVG = `
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
`

/** Inline style seeding the palette CSS variables for a skin. */
export function paletteVars(skin: { palette: Record<string, string | undefined> }): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(skin.palette)) {
    if (typeof value === 'string') parts.push(`--bc-${key}: ${value}`)
  }
  return parts.join('; ')
}

/** data-deco attribute value for a skin (drives the CSS decoration gates). */
export function decoValue(skin: {
  stripes?: boolean
  mask?: boolean
  patches?: boolean
  chest?: boolean
  accessory: string
}): string {
  return [
    skin.stripes ? 'stripes' : '',
    skin.mask ? 'mask' : '',
    skin.patches ? 'patches' : '',
    skin.chest ? 'chest' : '',
    skin.accessory !== 'none' ? `acc-${skin.accessory}` : ''
  ].filter(Boolean).join(' ')
}

/**
 * A compact self-contained cat preview for the skin gallery in Settings.
 * Uses literal palette colors (no CSS variables) so it can be dropped into
 * any container; decorations render per-skin.
 */
export function catPreviewSvg(skin: {
  id: string
  palette: Record<string, string | undefined>
  stripes?: boolean
  mask?: boolean
  patches?: boolean
  chest?: boolean
  accessory: string
}): string {
  const p = skin.palette
  const fur = p.fur ?? '#ffffff'
  const ear = p.ear ?? '#ffb3c6'
  const eye = p.eye ?? '#3a3a4a'
  const accent = p.accent ?? '#ff8fab'
  const mask = skin.mask ? (p.mask ?? fur) : fur
  const stripe = p.stripe ?? accent

  const accessory =
    skin.accessory === 'party'
      ? `<path d="M148 52 L164 10 L182 48 Z" fill="${accent}"/><circle cx="164" cy="12" r="5" fill="${p.shade ?? fur}"/>`
      : skin.accessory === 'witch'
        ? `<ellipse cx="130" cy="52" rx="46" ry="8" fill="${p.line ?? '#888'}"/><path d="M114 52 L130 8 L148 52 Z" fill="${accent}"/>`
        : skin.accessory === 'crown'
          ? `<path d="M100 54 L108 28 L119 44 L130 22 L141 44 L152 28 L160 54 Z" fill="#ffd966" stroke="#e6b800" stroke-width="2"/>`
          : skin.accessory === 'bowtie'
            ? `<path d="M130 118 L116 110 L116 126 Z" fill="#ff5252"/><path d="M130 118 L144 110 L144 126 Z" fill="#ff5252"/>`
            : skin.accessory === 'sakura'
              ? `<g transform="translate(92 34)"><circle cx="0" cy="-6" r="4.4" fill="#ffb7d5"/><circle cx="5.7" cy="-1.9" r="4.4" fill="#ffb7d5"/><circle cx="3.5" cy="4.9" r="4.4" fill="#ffb7d5"/><circle cx="-3.5" cy="4.9" r="4.4" fill="#ffb7d5"/><circle cx="-5.7" cy="-1.9" r="4.4" fill="#ffb7d5"/><circle cx="0" cy="0" r="3" fill="#ffd966"/></g>`
              : ''

  const stripes = skin.stripes
    ? `<g stroke="${stripe}" stroke-width="4" stroke-linecap="round" fill="none">
         <path d="M90 58 L90 46"/><path d="M100 54 L100 40"/><path d="M110 58 L110 46"/>
       </g>`
    : ''

  const patches = skin.patches
    ? `<ellipse cx="74" cy="78" rx="13" ry="10.5" fill="${p.patchA ?? '#ffb35c'}"/>
       <ellipse cx="128" cy="112" rx="12" ry="9.5" fill="${p.patchB ?? '#4a4a55'}"/>`
    : ''

  const chest = skin.chest ? `<ellipse cx="100" cy="118" rx="19" ry="16" fill="#ffffff"/>` : ''

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
`
}
