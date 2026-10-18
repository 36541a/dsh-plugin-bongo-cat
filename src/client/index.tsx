/**
 * dsh-plugin-bongo-cat — browser half.
 *
 * Registers the Bongo Cat settings section, the zh/en dictionaries, and
 * attaches the reactive cat overlay. Cross-plugin collaboration goes
 * through cordis services only: slots, locale and connection are
 * injected; no value imports from other plugin packages.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'

// Type-only imports activate the Context service augmentations:
//   ctx.slots (runtime) and the settings.section SlotMap contract
//   (ui-settings). The connection wire handle is fetched through
//   ctx.get('connection') — the official client-plugin pattern —
//   because the typed Context declaration for the client half is not
//   part of the published rc.6 type surface.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

import { BongoCatSection } from './BongoCatSection'
import { attachBongoCat } from './cat'
import { BongoCatStore } from './store'
import { BONGO_CAT_NS, BongoCatKey } from './settings'

// Dictionary namespace registration for the locale runtime (the official
// LocaleNamespaceMap augmentation pattern; keeps ctx.locale.bind typed).
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'bongo-cat': BongoCatKey
  }
}

const zh: Record<BongoCatKey, string> = {
  nav: '邦哥猫',
  hint: '打字、点鼠标，它都会举起小肉爪敲敲打打。按住它可以拖动换位置，双击让它换个角落待着。',
  hintToast: '邦哥猫上线啦！打字、点鼠标，它就会敲起来～',
  enabledLabel: '启用邦哥猫',
  rendererLabel: '猫咪来源',
  rendererAuto: '自动（优先原版）',
  rendererNative: 'Steam 原版',
  rendererSvg: '内置 SVG',
  nativeLabel: '原版资源（Steam）',
  nativeHint: '从你本机安装的 Bongo Cat 中读取原始美术资源，在原位逐帧合成，效果与原版一致；资源不离开本机、不随插件分发。需要 Python 3.10+ 与 UnityPy（pip install UnityPy）。',
  nativeMissing: '尚未导入：当前显示的是内置 SVG 猫',
  nativeReady: '已就绪',
  nativeImport: '从 Steam 导入原版资源',
  nativeReimport: '重新提取',
  nativeRemove: '移除原版资源',
  nativeBusy: '正在从游戏资源中提取，首次可能需要 10–30 秒…',
  nativeFailed: '导入失败',
  nativeSkin: '皮肤',
  skinLabel: '皮肤',
  builtinLabel: '内置皮肤',
  customLabel: '自定义图片皮肤（精灵图）',
  importSkinButton: '导入图片皮肤',
  removeSkinButton: '移除自定义皮肤',
  framesLabel: '帧数',
  framesHint: '横向精灵图：第 1 帧待机、第 2 帧左爪、第 3 帧右爪、第 4 帧双爪，其余帧依次循环。',
  scanButton: '扫描本机 Bongo Cat',
  scanning: '正在扫描 Steam 库与创意工坊…',
  scanEmpty: '这里没有找到图片文件。',
  scanHint: '扫描 Steam 库中的 Bongo Cat 安装目录与创意工坊（app 1337970），点击文件即可导入为皮肤。',
  soundLabel: '音效',
  soundOnLabel: '敲击音效',
  volumeLabel: '音量',
  importSoundButton: '导入 .wav 音效',
  removeSoundButton: '移除自定义音效',
  positionLabel: '停靠角落',
  posBR: '右下角',
  posBL: '左下角',
  posTL: '左上角',
  posTR: '右上角',
  offsetLabel: '边距',
  sizeLabel: '大小',
  speedLabel: '动画速度',
  presetLabel: '心情预置',
  presetFocus: '专注',
  presetZen: '禅域',
  presetParty: '派对',
  presetNight: '夜猫',
  presetApplied: '已套用',
  counterLabel: '敲击总数',
  counterReset: '重置计数',
  eggsLabel: '趣味彩蛋',
  eggFreak: '狂暴模式：连续快打时猫会进入疯狂敲击',
  eggSleep: '打瞌睡：长时间不敲打时猫会睡着',
  eggPet: '点猫互动：单击猫咪触发摸头杀',
  eggNight: '深夜模式：深夜猫咪会犯困',
  loading: '正在读取设置…',
  unavailable: '无法读取邦哥猫设置。',
  remoteWarning: '当前页面并非本机访问，无法导入皮肤或音效（仅本机可写入）。',
  tooLarge: '文件过大（图片 ≤ 8 MB，音效 ≤ 2 MB）。',
  busy: '处理中…'
}

const en: Record<BongoCatKey, string> = {
  nav: 'Bongo Cat',
  hint: 'Type or click and the cat drums along. Drag it to move, double-click to cycle corners.',
  hintToast: 'Bongo Cat is online! Type or click and it starts drumming~',
  enabledLabel: 'Enable Bongo Cat',
  rendererLabel: 'Cat source',
  rendererAuto: 'Auto (prefer original)',
  rendererNative: 'Steam original',
  rendererSvg: 'Built-in SVG',
  nativeLabel: 'Original assets (Steam)',
  nativeHint: 'Reads the original artwork from your installed Bongo Cat, composes the frames exactly where the game puts them. Assets never leave this machine and are never shipped with the plugin. Requires Python 3.10+ with UnityPy (pip install UnityPy).',
  nativeMissing: 'Not imported yet — showing the built-in SVG cat',
  nativeReady: 'Ready',
  nativeImport: 'Import original assets from Steam',
  nativeReimport: 'Re-extract',
  nativeRemove: 'Remove original assets',
  nativeBusy: 'Extracting from the game files, first run may take 10–30s…',
  nativeFailed: 'Import failed',
  nativeSkin: 'Skin',
  skinLabel: 'Skin',
  builtinLabel: 'Built-in skins',
  customLabel: 'Custom image skin (sprite strip)',
  importSkinButton: 'Import image skin',
  removeSkinButton: 'Remove custom skin',
  framesLabel: 'Frames',
  framesHint: 'Horizontal sprite strip: frame 1 idle, 2 left paw, 3 right paw, 4 both paws; extra frames cycle.',
  scanButton: 'Scan local Bongo Cat',
  scanning: 'Scanning Steam libraries and Workshop…',
  scanEmpty: 'No image files found here.',
  scanHint: 'Scans Steam libraries for the Bongo Cat install and Workshop content (app 1337970); click a file to import it as a skin.',
  soundLabel: 'Sound',
  soundOnLabel: 'Tap sound',
  volumeLabel: 'Volume',
  importSoundButton: 'Import .wav sound',
  removeSoundButton: 'Remove custom sound',
  positionLabel: 'Anchor corner',
  posBR: 'Bottom right',
  posBL: 'Bottom left',
  posTL: 'Top left',
  posTR: 'Top right',
  offsetLabel: 'Margin',
  sizeLabel: 'Size',
  speedLabel: 'Animation speed',
  presetLabel: 'Mood presets',
  presetFocus: 'Focus',
  presetZen: 'Zen',
  presetParty: 'Party',
  presetNight: 'Night owl',
  presetApplied: 'Applied',
  counterLabel: 'Total taps',
  counterReset: 'Reset counter',
  eggsLabel: 'Easter eggs',
  eggFreak: 'Freak mode: burst typing sends the cat into a drumming frenzy',
  eggSleep: 'Dozing off after a long stretch without taps',
  eggPet: 'Petting: click the cat for a headpat',
  eggNight: 'Late night: the cat gets sleepy after midnight',
  loading: 'Loading settings…',
  unavailable: 'Bongo Cat settings are unavailable.',
  remoteWarning: 'This page is not opened from this machine; importing skins or sounds is unavailable (writes are loopback-only).',
  tooLarge: 'File too large (images ≤ 8 MB, sounds ≤ 2 MB).',
  busy: 'Working…'
}

export const inject = ['slots', 'locale', 'connection']

export function apply(ctx: ClientContext) {
  const connection = ctx.get('connection') as unknown as ConnectionHandle
  const store = new BongoCatStore(connection.rpc)

  ctx.effect(() => ctx.locale.register(BONGO_CAT_NS, { zh, en }), 'bongo-cat: dictionaries')
  const translate = ctx.locale.bind(BONGO_CAT_NS)
  const t = (key: BongoCatKey): string => translate(key)

  void store.load()
  ctx.effect(() => attachBongoCat(ctx, store, connection.rpc, t), 'bongo-cat: overlay')

  const injected = () => ({
    store,
    rpc: connection.rpc,
    isLoopback: connection.isLoopback,
    t
  })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'bongo-cat',
    order: 31,
    label: () => t('nav'),
    inject: injected
  }, BongoCatSection))
}
