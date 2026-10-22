/**
 * dsh-plugin-bongo-cat — browser half.
 *
 * Registers the Bongo Cat settings section, the zh/en dictionaries, and
 * attaches the reactive cat overlay. Cross-plugin collaboration goes
 * through cordis services only: slots, locale and connection are
 * injected; no value imports from other plugin packages.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'

// Type-only imports activate the Context service augmentations:
//   ctx.slots (runtime) and the settings.section SlotMap contract
//   (ui-settings). The connection wire handle is fetched through
//   ctx.get('connection') — the official client-plugin pattern — because a
//   client plugin reaches sibling services through the runtime registry, not
//   through a package import.
//
// DSH 0.2.0 note: the client context IS the cordis Context. The 0.1.x
// helper package `@deepseek-ai/dsh-client-runtime` was folded into
// `@deepseek-ai/cordis`, so importing the type from there is the 0.2.0
// spelling of the same thing.
//
// Each service's `Context` augmentation lives in the package that provides
// it, so the type-only imports below are what make `ctx.slots` (ui-renderer),
// `ctx.locale` (locale) and the `settings.section` SlotMap contract
// (ui-settings) visible to tsc. They are erased at build time.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

import { BongoCatSection } from './BongoCatSection'
import { attachBongoCat } from './cat'
import { attachWidgetDock } from './widgets/dock'
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
  openSettings: '设置',
  openSettingsHint: '点击打开设置 · 双击换角落 · 拖动移动',
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
  framesHint: '横向精灵图：第 1 帧待机、第 2 帧左爪、第 3 帧右爪，其余帧依次循环。',
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
  busy: '处理中…',
  widgetSection: '桌面组件',
  widgetHint: '组件与猫咪互相独立：可以只开组件不开猫，也可以同一类型放好几个。按住组件标题栏拖动摆放，窗口变小时会自动收回可视区。',
  widgetAdd: '添加组件',
  widgetRemove: '移除',
  widgetEmpty: '还没有组件。从下面挑一个加上吧。',
  widgetSize: '尺寸',
  widgetSizeSm: '小',
  widgetSizeMd: '中',
  widgetOpacity: '不透明度',
  widgetClock: '时钟',
  widgetClockDesc: '本地时间与日期，可关秒数、切换 12/24 小时。',
  widgetHour12: '12 小时制',
  widgetSeconds: '显示秒',
  widgetShowDate: '显示日期',
  widgetCounter: '敲击统计',
  widgetCounterDesc: '读宿主持久化的总敲击数，或只统计本次会话。',
  widgetCounterTotal: '累计敲击',
  widgetCounterSession: '本次会话',
  widgetSource: '数据来源',
  widgetFocus: '专注计时',
  widgetFocusDesc: '一个倒计时番茄钟，到点响两声。',
  widgetFocusStart: '开始',
  widgetFocusPause: '暂停',
  widgetFocusReset: '重置',
  widgetMinutes: '分钟',
  widgetChime: '结束提示音',
  wardrobeSection: '装扮',
  wardrobeHint: '装扮直接来自你本机 Steam 版 Bongo Cat 的物品库（帽子 / 表情 / 翅膀 / 配饰共数百件）。每敲击 1000 次自动获得一件，并自动扣除 1000 次计数；重复的会累计成数量，点格子穿上或摘下，毛色在单独的页签里。',
  wardrobeHat: '帽子',
  wardrobeFace: '表情',
  wardrobeBack: '翅膀',
  wardrobeAccessory: '配饰',
  wardrobeFur: '毛色',
  wardrobeFilter: '筛选',
  wardrobeFilterAll: '全部',
  wardrobeFilterOwned: '已拥有',
  wardrobeFilterEquipped: '已装备',
  wardrobeRandom: '随机搭配',
  wardrobeExchange: '兑换',
  wardrobeUnequip: '全部卸下',
  wardrobeEmpty: '这个筛选下没有内容。',
  wardrobeLocked: '未解锁',
  wardrobeCollected: '已收集',
  wardrobeNextDrop: '距下一件',
  wardrobeReady: '可兑换',
  wardrobeExchanged: '本次兑换',
  wardrobeNewOnes: '其中新解锁',
  wardrobeNoDrop: '还没有可兑换的装扮，再敲几下吧。',
  wardrobeDrop: '获得新装扮',
  wardrobeNoAssets: '还没有原版资源：先在上面点「从 Steam 导入原版资源」，导入后这里会列出游戏里的全部装扮。'
}

const en: Record<BongoCatKey, string> = {
  nav: 'Bongo Cat',
  hint: 'The artwork comes from your installed Steam Bongo Cat. Type or click and it drums; drag to move, double-click to cycle corners.',
  hintToast: 'Bongo Cat is online! Type or click and it starts drumming~',
  openSettings: 'Settings',
  openSettingsHint: 'Click for settings · double-click to change corners · drag to move',
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
  framesHint: 'Horizontal sprite strip: frame 1 idle, 2 left paw, 3 right paw; extra frames cycle.',
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
  busy: 'Working…',
  widgetSection: 'Desktop widgets',
  widgetHint: 'Widgets are independent of the cat: run them with the cat off, or place several of the same type. Drag a widget by its header; it is pulled back into view when the window shrinks.',
  widgetAdd: 'Add widget',
  widgetRemove: 'Remove',
  widgetEmpty: 'No widgets yet. Pick one below.',
  widgetSize: 'Size',
  widgetSizeSm: 'Small',
  widgetSizeMd: 'Medium',
  widgetOpacity: 'Opacity',
  widgetClock: 'Clock',
  widgetClockDesc: 'Local time and date, with optional seconds and 12/24h.',
  widgetHour12: '12-hour clock',
  widgetSeconds: 'Show seconds',
  widgetShowDate: 'Show date',
  widgetCounter: 'Tap counter',
  widgetCounterDesc: 'The persisted lifetime total, or just this session.',
  widgetCounterTotal: 'Lifetime taps',
  widgetCounterSession: 'This session',
  widgetSource: 'Source',
  widgetFocus: 'Focus timer',
  widgetFocusDesc: 'A countdown pomodoro that chimes when it ends.',
  widgetFocusStart: 'Start',
  widgetFocusPause: 'Pause',
  widgetFocusReset: 'Reset',
  widgetMinutes: 'Minutes',
  widgetChime: 'Chime at the end',
  wardrobeSection: 'Dress-up',
  wardrobeHint: 'The items come straight from your installed Steam Bongo Cat (hundreds of hats / faces / wings / extras). Every 1000 taps automatically grants one and debits those 1000 taps. Duplicates stack; click a tile to wear or take it off, colours have their own tab.',
  wardrobeHat: 'Hats',
  wardrobeFace: 'Face',
  wardrobeBack: 'Wings',
  wardrobeAccessory: 'Extras',
  wardrobeFur: 'Fur',
  wardrobeFilter: 'Filter',
  wardrobeFilterAll: 'All',
  wardrobeFilterOwned: 'Owned',
  wardrobeFilterEquipped: 'Worn',
  wardrobeRandom: 'Random outfit',
  wardrobeExchange: 'Exchange',
  wardrobeUnequip: 'Take everything off',
  wardrobeEmpty: 'Nothing under this filter.',
  wardrobeLocked: 'Locked',
  wardrobeCollected: 'Collected',
  wardrobeNextDrop: 'Next drop in',
  wardrobeReady: 'Ready to exchange',
  wardrobeExchanged: 'Exchanged',
  wardrobeNewOnes: 'new',
  wardrobeNoDrop: 'Nothing to exchange yet — keep tapping.',
  wardrobeDrop: 'New cosmetic',
  wardrobeNoAssets: `No original assets yet — click "Import original assets from Steam" above; the game's full dress-up catalogue appears here afterwards.`
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
  // Widgets are a sibling of the cat, not a child: they render even when the
  // cat is disabled, and the cat has no reference to the dock.
  ctx.effect(() => attachWidgetDock(store, connection.rpc, t, connection.isLoopback), 'bongo-cat: widgets')

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
