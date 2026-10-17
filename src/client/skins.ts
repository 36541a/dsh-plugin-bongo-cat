/**
 * Built-in Bongo Cat skins.
 *
 * A skin is a palette plus a few decoration flags. The SVG cat (cat-svg.ts)
 * paints every shape from CSS custom properties, so switching a skin is a
 * matter of rewriting those properties on the overlay root — no DOM
 * rebuild, no image assets to ship.
 *
 * Palette fields:
 *   fur      body & head fill
 *   shade    inner ears / subtle shading
 *   ear      inner ear pink
 *   pad      paw pads, nose
 *   eye      eyes, mouth, whiskers outline
 *   line     decorative outlines (keyboard, stripes)
 *   accent   key highlight, blush, sparkles
 *   kb       keyboard bar fill
 *   kbKey    keyboard key fill
 *
 * Decoration flags toggle SVG groups via [data-skin] selectors in CSS:
 *   stripes  tabby forehead + tail stripes
 *   mask     siamese face mask (dark face, ears, paws, tail)
 *   patches  calico orange/black patches
 *   chest    white chest patch (tuxedo)
 *   accessory: 'none' | 'party' | 'witch' | 'crown' | 'bowtie' | 'sakura'
 */
export interface BongoSkin {
  id: string
  name: string
  palette: {
    fur: string
    shade: string
    ear: string
    pad: string
    eye: string
    line: string
    accent: string
    kb: string
    kbKey: string
    mask?: string
    stripe?: string
    patchA?: string
    patchB?: string
  }
  stripes?: boolean
  mask?: boolean
  patches?: boolean
  chest?: boolean
  accessory: 'none' | 'party' | 'witch' | 'crown' | 'bowtie' | 'sakura'
}

export const BUILT_IN_SKINS: BongoSkin[] = [
  {
    id: 'classic',
    name: '经典白猫',
    palette: {
      fur: '#ffffff', shade: '#eef0f6', ear: '#ffb3c6', pad: '#ffb3c6',
      eye: '#3a3a4a', line: '#d9d9e3', accent: '#ff8fab',
      kb: '#8d7b68', kbKey: '#c9b8a5'
    },
    accessory: 'none'
  },
  {
    id: 'midnight',
    name: '午夜黑猫',
    palette: {
      fur: '#3b3b4f', shade: '#2c2c3c', ear: '#ff9fb6', pad: '#ff9fb6',
      eye: '#ffd966', line: '#26263a', accent: '#9d7ff5',
      kb: '#4a4560', kbKey: '#6f6890'
    },
    accessory: 'none'
  },
  {
    id: 'tabby',
    name: '橘猫条条',
    palette: {
      fur: '#ffb35c', shade: '#f59a3d', ear: '#ffc9a3', pad: '#ffb3c6',
      eye: '#4a3520', line: '#d97f2e', accent: '#ff7043',
      stripe: '#e07f22',
      kb: '#a5713f', kbKey: '#d9a870'
    },
    stripes: true,
    accessory: 'none'
  },
  {
    id: 'cloud',
    name: '云朵灰猫',
    palette: {
      fur: '#c7cdd8', shade: '#aeb6c4', ear: '#f0b8c8', pad: '#f0b8c8',
      eye: '#4a5568', line: '#98a1b0', accent: '#7aa5d2',
      kb: '#7d8590', kbKey: '#aab3bd'
    },
    accessory: 'none'
  },
  {
    id: 'siamese',
    name: '暹罗公子',
    palette: {
      fur: '#f2e3d5', shade: '#e3cfbe', ear: '#d8a58f', pad: '#5b4038',
      eye: '#6fb7d9', line: '#b59c8d', accent: '#8d6e63',
      mask: '#5b4038',
      kb: '#6b5849', kbKey: '#9c8873'
    },
    mask: true,
    accessory: 'none'
  },
  {
    id: 'tuxedo',
    name: '礼服猫',
    palette: {
      fur: '#33364a', shade: '#26283a', ear: '#ff9fb6', pad: '#ff9fb6',
      eye: '#ffd966', line: '#23252f', accent: '#ff5252',
      kb: '#3c3f52', kbKey: '#5c6076'
    },
    chest: true,
    accessory: 'bowtie'
  },
  {
    id: 'calico',
    name: '三花泼墨',
    palette: {
      fur: '#ffffff', shade: '#f3f3f8', ear: '#ffb3c6', pad: '#ffb3c6',
      eye: '#4a3520', line: '#d9d9e3', accent: '#ff8fab',
      patchA: '#ffb35c', patchB: '#4a4a55',
      kb: '#8d7b68', kbKey: '#c9b8a5'
    },
    patches: true,
    accessory: 'none'
  },
  {
    id: 'sakura',
    name: '樱花粉粉',
    palette: {
      fur: '#ffeef5', shade: '#ffd6e6', ear: '#ffc2d4', pad: '#ff9ebb',
      eye: '#b85c7a', line: '#f0c2d4', accent: '#ff6f9c',
      kb: '#c98ba6', kbKey: '#efc3d5'
    },
    accessory: 'sakura'
  }
]

export const DEFAULT_SKIN_ID = 'classic'

export function findSkin(id: string): BongoSkin {
  return BUILT_IN_SKINS.find((skin) => skin.id === id) ?? BUILT_IN_SKINS[0]
}
