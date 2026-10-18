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
  hint: '画面来自你本机安装的 Steam 版 Bongo Cat。打字、点鼠标它会敲起来；按住可拖动，双击换角落。',
  hintToast: '邦哥猫上线啦！打字、点鼠标，它就会敲起来～',
  enabledLabel: '启用邦哥猫',
  steamSkinsLabel: 'Steam 皮肤',
  skinImporting: '正在提取皮肤：',
  nativeLabel: '原版资源（Steam）',
  nativeHint: '直接从你本机的 Bongo Cat 安装里读取原始美术，点任意皮肤即可换装。首次导入会自动准备环境（下载 UnityPy 约 50 MB，需联网，1 分钟左右），之后每种皮肤约 3 秒。',
  nativeMissing: '尚未导入：先点「从 Steam 导入原版资源」',
  nativeMissingShort: '请先在设置里导入原版资源',
  nativeReady: '已就绪',
  nativeImport: '从 Steam 导入原版资源',
  nativeReimport: '重新提取当前皮肤',
  nativeRemove: '移除原版资源',
  nativeBusy: '正在准备环境并提取（首次需下载 UnityPy，约 1 分钟）…',
  nativeFailed: '导入失败',
  customLabel: '自定义图片皮肤（可选）',
  importSkinButton: '导入图片皮肤',
  removeSkinButton: '移除自定义皮肤',
  framesLabel: '帧数',
  framesHint: '横向精灵图：第 1 帧待机、第 2 帧左爪、第 3 帧右爪、第 4 帧双爪，其余帧依次循环。',
  scanButton: '扫描本机 Bongo Cat',
  scanning: '正在扫描 Steam 库与创意工坊…',
  scanEmpty: '这里没有找到图片文件。',
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
  speedLabel: '敲击速度',
  presetLabel: '心情预置',
  presetFocus: '专注',
  presetZen: '禅域',
  presetParty: '派对',
  presetNight: '夜猫',
  presetApplied: '已套用',
  counterLabel: '敲击总数',
  counterReset: '重置计数',
  loading: '正在读取设置…',
  unavailable: '无法读取邦哥猫设置。',
  remoteWarning: '当前页面并非本机访问，无法导入皮肤或音效（仅本机可写入）。',
  tooLarge: '文件过大（图片 ≤ 8 MB，音效 ≤ 2 MB）。',
  busy: '处理中…'
}

const en: Record<BongoCatKey, string> = {
  nav: 'Bongo Cat',
  hint: 'The artwork comes from your installed Steam Bongo Cat. Type or click and it drums; drag to move, double-click to cycle corners.',
  hintToast: 'Bongo Cat is online! Type or click and it starts drumming~',
  enabledLabel: 'Enable Bongo Cat',
  steamSkinsLabel: 'Steam skins',
  skinImporting: 'Extracting skin:',
  nativeLabel: 'Original assets (Steam)',
  nativeHint: 'Reads the original artwork straight from your installed Bongo Cat — click any skin to switch. The first import bootstraps its own environment (downloads UnityPy, ~50 MB, needs network, about a minute); each skin takes ~3s afterwards.',
  nativeMissing: 'Not imported yet — click "Import original assets from Steam"',
  nativeMissingShort: 'Import the original assets in Settings first',
  nativeReady: 'Ready',
  nativeImport: 'Import original assets from Steam',
  nativeReimport: 'Re-extract current skin',
  nativeRemove: 'Remove original assets',
  nativeBusy: 'Preparing the environment and extracting (first run downloads UnityPy, ~1 min)…',
  nativeFailed: 'Import failed',
  customLabel: 'Custom image skin (optional)',
  importSkinButton: 'Import image skin',
  removeSkinButton: 'Remove custom skin',
  framesLabel: 'Frames',
  framesHint: 'Horizontal sprite strip: frame 1 idle, 2 left paw, 3 right paw, 4 both paws; extra frames cycle.',
  scanButton: 'Scan local Bongo Cat',
  scanning: 'Scanning Steam libraries and Workshop…',
  scanEmpty: 'No image files found here.',
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
  speedLabel: 'Tap speed',
  presetLabel: 'Mood presets',
  presetFocus: 'Focus',
  presetZen: 'Zen',
  presetParty: 'Party',
  presetNight: 'Night owl',
  presetApplied: 'Applied',
  counterLabel: 'Total taps',
  counterReset: 'Reset counter',
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
