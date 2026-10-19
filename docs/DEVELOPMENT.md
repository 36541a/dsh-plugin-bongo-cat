# dsh-plugin-bongo-cat 开发者文档

本文档面向想理解、修改或扩展本插件的开发者。内容涵盖 DSH 双端插件协议、本插件的完整架构、RPC 线上协议、皮肤规范、构建系统与扩展指南。

> 阅读本文不需要先读源码；所有关键代码都有引用路径。
> v0.2.0 起，本插件借鉴了 `elysia395/dsh-wallpaper-engine`（1440★ 的 DSH 壁纸插件）的工程体系，取舍分析见 [ANALYSIS-dsh-wallpaper-engine.md](ANALYSIS-dsh-wallpaper-engine.md)。

---

## 1. 这是什么

`dsh-plugin-bongo-cat` 是一个 DeepSeek Harness（DSH）Web 插件，把 Steam 免费游戏 **Bongo Cat**（app 1337970）的桌宠体验搬进 DSH 的 Web 界面：

- 用户敲键盘 / 点鼠标时，屏幕上悬浮的**原版**猫咪会举起左右爪交替敲击；
- 猫咪可拖拽、可四角停靠，位置与设置在 `$DSH_HOME/storages/bongo-cat/settings.json` 持久化；
- 猫咪画面来自本机 Steam 安装的 Bongo Cat：插件自带提取器，把 243 套皮肤的原始精灵导出并按游戏图层合成为三帧；
- 敲击音效由 WebAudio 实时合成（默认零音频资产），也支持导入 `.wav`；
- 敲击计数在 host 侧持久化。

架构上完全复刻并扩展了社区参考实现 `JerryPhoenixCKY/dsh-plugin-wallpaper` 的**双端 bundle** 模式：一个 npm 包同时提供 host 端（Node）与 browser 端（Web shell）两半。

---

## 2. 快速开始

### 2.1 环境要求

| 组件 | 版本 |
|---|---|
| DeepSeek Harness | 0.1.0-rc.6+（web profile） |
| Node.js | ≥ 22 |
| pnpm | ≥ 9（≥10 时见下方注意） |
| 操作系统 | Windows 10/11（Steam 扫描为 Windows 专属，其他平台自动降级） |

> **pnpm ≥ 10 注意**：pnpm 10 起默认拒绝未声明 `allowBuilds` 的安装脚本。若安装时被拒，把安装输出里的 package key 复制到 profile 的 `pnpm-workspace.yaml` 的 `allowBuilds` 块，再重跑安装命令（与 `dsh-ui-wallpaper` 插件同款问题）。

### 2.2 本地开发（link 模式）

```sh
git clone <your-fork> dsh-plugin-bongo-cat
cd dsh-plugin-bongo-cat
pnpm install
pnpm build          # 产出 lib/index.js + lib/client.js
dsh plugin --profile web add link:/absolute/path/to/dsh-plugin-bongo-cat
dsh web             # 重启后刷新页面
```

改代码后的迭代循环：`pnpm build` → 重启 `dsh web` → 刷新页面。browser 半在启动时被快照，不重启不生效。

### 2.3 从 GitHub 安装 / 卸载

```sh
dsh plugin --profile web add github:36541a/dsh-plugin-bongo-cat      # 可加 #sha 钉版本
dsh plugin --profile web remove dsh-plugin-bongo-cat
```

`lib/` 产物**随仓库发布**（`prepack` 在打包时重建），GitHub 安装无需预先构建；开发时改完源码要 `pnpm build` 并在同一提交里带上产物——硬档守卫会检查产物是否比源码新。

---

## 3. 架构总览

### 3.1 双端 bundle

DSH 构建在 Cordis 插件内核之上（Koishi 系）。一个"双端插件"是一个普通 npm 包，通过 `package.json` 里的 `dsh` 清单同时向两个世界注册自己：

```
                    ┌────────────────────────────────────────────┐
                    │            dsh-plugin-bongo-cat            │
                    │                                            │
  package.json ─────┤  dsh.bundle.patch → cordis.patch.yml       │
  (dsh 清单)         │  dsh.client → { platform: web, … }        │
                    └───────┬───────────────────────┬────────────┘
                            │                       │
                     host 半（Node）           browser 半（Web shell）
                     src/index.ts             src/client/index.tsx
                     lib/index.js             lib/client.js
                            │                       │
                            │   /bongo-cat RPC 通道  │
                            │◄─────────────────────►│
                            │   (Connection 信封)   │
```

- **host 半**（`main: lib/index.js`）：Cordis 插件，`export const name / apply(ctx) / inject`。注册 settings 命名空间、webServer 路由与 RPC 通道。
- **browser 半**（`lib/client.js`）：由 Web shell 的模块加载器以 `window.__ModuleLoader__.load({ id, factory })` 协议加载，注册 `settings.section` 槽位（设置面板）并挂载猫咪 DOM。

### 3.2 目录结构

```
dsh-plugin-bongo-cat/
├── src/
│   ├── index.ts                  # host 端入口（schema 从契约构建 + RPC + 路由 + 扫描）
│   ├── shared/
│   │   └── settings-contract.ts  # ★ 设置单一真源：两端派生（ADR-0002）
│   └── client/
│       ├── index.tsx             # browser 端入口（apply + inject）
│       ├── cat.ts                # 猫咪 overlay 控制器（输入/帧切换/拖拽/计数/暂停/提示）
│       ├── cat.module.css        # 图层与状态开关
│       ├── presets.ts            # 心情预置（完整补丁快照）
│       ├── sound.ts              # WebAudio 合成音效
│       ├── store.ts              # /bongo-cat RPC 配置存储（合写）
│       ├── settings.ts           # 线上类型与字典键（设置类型从契约再导出）
│       ├── BongoCatSection.tsx   # 设置面板（React）
│       └── BongoCatSection.module.css
├── scripts/
│   ├── build.mjs                 # esbuild 构建（双端 + CSS Modules）
│   └── verify.mjs                # 两级守卫运行器（硬/软档）
├── .verify/                      # 冒烟测试（host/browser/契约探针）
├── .github/workflows/verify.yml  # CI：build + verify + lint
├── cordis.patch.yml              # host 插件注册行
├── docs/DEVELOPMENT.md
└── package.json                  # dsh 清单 + 依赖
```

### 3.3 数据流

```
 浏览器 DOM 事件                host
 ┌──────────┐   config/set    ┌──────────────┐
 │ 猫咪 overlay ├─────────────►│ settings 命名空间 │◄─── settings.yaml（持久化）
 │ (cat.ts)   │◄─────────────┤  'bongo-cat'      │
 └──────────┘   config/get    └──────────────┘
      │  stats/bump ▲ 计数器
      │  skins/scan ▼ Steam 扫描结果（只读）
      │  skins/import ▼ 导入 → storages/bongo-cat/skins/
      ▼
 GET /plugins/bongo-cat/skin?v=<revision>   （资产路由，不可变缓存）
```

一次典型的"拖动猫"请求序列：`pointerup` → 计算最近角落与边距 → `store.set({position, offsetX, offsetY})` → RPC `config/set` → host `scope.update()` 写入 settings.yaml → 返回全量配置 → overlay 重新定位。

---

## 4. Host 端详解（`src/index.ts`）

### 4.1 插件协议三件套

```ts
export const name = 'bongo-cat'          // cordis.yml 里的插件 id
export function apply(ctx: Context) { … } // 注册能力
export const inject = ['settings', 'webServer'] // 依赖的服务提供方
```

`inject` 声明依赖，保证 `ctx.settings` / `ctx.webServer` 在 `apply` 运行前就绪。插件行由 `cordis.patch.yml` 插入：

```yaml
- insert:
    - id: bongo-cat
      name: 'dsh-plugin-bongo-cat'
```

### 4.2 设置存储（自带 JSON，兼容 DSH 0.1.x / 0.2.x）

```ts
const scope = {
  get: () => loadSettings(),                 // 契约默认值 + settings.json
  update: async (patch) => persist({ ...scope.get(), ...patch })
}
```

- 路径：`$DSH_HOME/storages/bongo-cat/settings.json`（原子写：`.tmp` + rename，单条写队列防丢更新）；
- **不用 `ctx.settings`**：DSH 0.2.0-rc.2 移除了 `ctx.settings.register`，旧版插件会在 `apply()` 抛异常导致后端不加载（设置页永远「正在读取设置…」）。自带存储在 0.1.x 与 0.2.x 上是同一条路径，`inject` 只声明 `webServer`；
- 文件损坏 / 缺字段时按契约默认值合并（类型不符的键被丢弃），不会被一个坏值拖垮整个配置。

完整字段表见 [§8.2](#82-settings-字段表)。

> **历史**：0.1.x 曾把配置注册进 DSH 的 settings 文档，但 rc.6 的 settings **wire** allowlist 不覆盖第三方命名空间，浏览器侧本来就读不到；`/bongo-cat` RPC 的 `config/get` / `config/set` 一直是唯一接口，因此切换存储对前端零影响。

#### 4.2.1 设置单一真源契约（v0.2.0，借鉴 ADR-0002）

`src/shared/settings-contract.ts` 是全仓唯一的设置真源：字段元数据（kind / default / min / max / writable）、`SETTINGS_DEFAULTS`、`sanitizeSettingsPatch`、`WRITABLE_FIELDS`。**两端都从它派生，任何一侧都不再手写平行列表**：

- host：`config/set` 调用契约的 `sanitizeSettingsPatch`——未知字段、宿主权威字段（`counter`，只能走 `stats/*`）、越界值一律**大声拒绝**（`bad-request`），绝不静默丢弃；`config/get` 返回「默认值 + 磁盘值」的合并结果；
- browser：`src/client/settings.ts` 从契约再导出 `BongoCatSettings` 类型（`DefaultOf` 条件映射推导，零手写接口）。

为什么值得单文件管理：白名单式双抄是**静默漂移**——任一侧漏一个键，该键在经过那一侧时被丢弃，用户症状是"改了不生效"，无异常无日志。参考项目（dsh-wallpaper-engine）的 ADR-0002 记录过同款事故。契约对账由守卫强制执行：host 冒烟测试每次运行都断言「默认值逐一深等」（见 §12）。

**硬约束**：契约被 browser 半导入，因此禁止 value import（无 node 内置、无 @deepseek-ai 包、无顶层副作用）。新增字段只改契约一处，类型 / 面板 / 消毒器 / 默认值自动跟随。

### 4.3 webServer 路由

两种路由通过 `ctx.effect(() => ctx.webServer.register({…}))` 注册（effect 保证插件销毁时路由一并回收）：

| kind | path | 用途 |
|---|---|---|
| `prefix` | `/bongo-cat` | RPC 通道（见 4.4） |
| `exact` | `/plugins/bongo-cat/skin` | 导入的皮肤图片，`?v=<revision>` |
| `exact` | `/plugins/bongo-cat/sound` | 导入的音效文件，`?v=<revision>` |

资产路由带 `Cache-Control: private, max-age=31536000, immutable`；revision 不匹配直接 404，保证旧 URL 永远不会看到错配的文件。

### 4.4 RPC 信封协议

通道不经过 `ctx.connection.rpc.handle()`（该注册路径在 rc.6 下会因 shadowed ctx 抛错，与参考插件的发现一致），而是直接实现 connection 的 wire contract：

请求：

```http
POST /bongo-cat/config/get
Content-Type: application/json

{"type": "client-request", "rpcId": "abc-123", "method": "config/get", "payload": {}}
```

响应：

```json
{"type": "server-response", "rpcId": "abc-123",
 "result": {"ok": true, "value": { …settings… }}}
```

失败时 `result` 为 `{ "ok": false, "error": { "code": "bad-request", "message": "…" } }`。`method` 必须与 URL 末段一致，`rpcId` 原样回显。browser 半的 `connection.rpc.call('/bongo-cat', endpoint, payload)` 因此无需任何适配。

endpoint 清单见 [§8.1](#81-rpc-endpoint-表)。

### 4.5 输入消毒（sanitizeSettingsPatch）

`config/set` 的补丁先过契约消毒器：字段白名单（`WRITABLE_FIELDS`，`counter` 只能通过 `stats/*` 修改）、逐字段类型与范围校验，任何不合格整体拒绝（`bad-request`），而不是静默夹取——坏 UI 永远写不进坏配置。实现与逐键语义见 `src/shared/settings-contract.ts`（单一真源，本文不复述数值）。

### 4.6 Steam / Bongo Cat 扫描

扫描是**纯只读**的，按以下顺序定位内容：

1. **Steam 安装根**：读注册表 `HKCU\Software\Valve\Steam\SteamPath`（`reg query`，4s 超时）；失败则回退常见路径（`C:\Program Files (x86)\Steam` 等）。
2. **Steam 库列表**：解析 `<steam>/steamapps/libraryfolders.vdf` 中所有 `"path"` 条目，加上默认库。
3. **候选目录**：
   - `<库>/steamapps/common/BongoCat*`（模糊匹配安装目录名）
   - `<库>/steamapps/workshop/content/1337970`（创意工坊）
   - `%APPDATA%\BongoCat`、`%APPDATA%\BongoCat\skins`
4. **收集图片**：每个目录深度 ≤ 3，扩展名白名单（png/jpg/jpeg/webp/gif/bmp），单文件 ≤ 8 MB，每根目录上限 300 个。

导入时的安全约束：`skins/import` 的 `path` 参数必须位于**本次重新扫描出来的候选目录之内**（`isInsideScannedRoot`），否则拒绝——RPC 通道虽然只信 loopback，但这等于给任意文件读取上了第二道锁。导入动作是"复制进 `$DSH_HOME/storages/bongo-cat/skins/`"，游戏目录一个字节都不会动。

### 4.7 存储布局

```
$DSH_HOME/storages/bongo-cat/
├── skins/
│   ├── skin-<revision>.<ext>   # 导入的皮肤图片
│   └── skin.json               # { revision, name, source, ext, updatedAt }
└── sounds/
    ├── sound-<revision>.<ext>  # 导入的音效
    └── sound.json
```

revision 由 host 侧单调递增、server 权威。原子写入模式：先写 `.tmp`，再写 meta，最后 `rename`——中途崩溃不会留下半张脸。

---

## 5. Browser 端详解（`src/client/`）

### 5.1 模块加载协议

`lib/client.js` 是 CJS 体 + ModuleLoader 包裹：

```js
window.__ModuleLoader__.load({
  id: 'dsh-plugin-bongo-cat',
  factory: (require) => {
    var module = { exports: {} }; var exports = module.exports;
    /* …bundled cjs… */
    return module.exports;
  }
});
```

`require` 由 shell 提供，解析到 `@deepseek-ai/dsh-client-web` 的 `PLATFORM_MODULES` 种子表（react、cordis、slots 等）。因此**浏览器半的所有 `@deepseek-ai/*` 依赖都必须是类型导入**（编译期擦除），运行期只通过 `ctx` 拿服务——这是双端插件最重要的工程纪律。

### 5.2 入口（`index.tsx`）

```ts
export const inject = ['slots', 'locale', 'connection']
export function apply(ctx: ClientContext) {
  const connection = ctx.get('connection') as unknown as ConnectionHandle
  const store = new BongoCatStore(connection.rpc)
  ctx.effect(() => ctx.locale.register('bongo-cat', { zh, en }), '…')
  ctx.effect(() => attachBongoCat(ctx, store, connection.rpc), '…')
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'bongo-cat', order: 31,
    label: () => t('nav'), inject: () => ({ store, rpc, isLoopback, t })
  }, BongoCatSection))
}
```

- `ctx.get('connection')` 是官方 client-plugin 模式（rc.6 的 client Context 类型面未发布，故 `as unknown as ConnectionHandle`）；
- `settings.section` 槽位把设置面板插进 DSH 的 Settings 界面；
- locale 字典通过 `LocaleNamespaceMap` 模块增强获得类型。

### 5.3 配置存储（`store.ts`）

`BongoCatStore` 是 `useSyncExternalStore` 友好的外部存储：`subscribe/getSnapshot` + **合写**（coalescing writer）——滑块连续拖动产生的多个补丁合并，只在途请求返回后重放最新补丁，host 不与自己竞争，UI 不阻塞。

### 5.4 猫咪渲染：原版三帧

画面没有任何自绘素材。`tools/extract-native.py` 从本机游戏导出 `idle / tap-left / tap-right` 三张 PNG，`cat.ts` 把它们预加载成三个叠放的 `<img>`：

- 根节点带 `bc-native-mode` 时显示图片层；`nativeWrap.dataset.active` 在 `idle / tap-left / tap-right` 之间切换，只有一张 `display:block`；
- 敲击时切到对应帧，`TAP_MS`（130ms，按 `speed` 缩放）后回 `idle`；
- 帧的宽高比由图片自身决定（`naturalWidth/Height`），面板里的 `size` 只控制宽度，高度自动；
- 没有原版资源时显示 `bc-empty-mode` 的提示块，而不是假猫；
- 用户导入的自定义精灵图仍是可选覆盖（`bc-sprite-mode`）。

### 5.5 状态类

| 类 / 属性 | 触发 | 效果 |
|---|---|---|
| `bc-tap-left/right/both` | 一次敲击（130ms） | 切换原生帧 + 轻微下沉 |
| `bc-native-mode` | 原版资源就绪且未用自定义图 | 显示三帧图片层 |
| `bc-empty-mode` | 没有原版资源 | 显示"请先导入"提示块 |
| `bc-sprite-mode` | 导入了自定义精灵图 | 隐藏原版层，改用帧条背景 |
| `bc-is-dragging` | 拖拽中 | 光标与投影变化 |
| `bc-paused` | 页面隐藏 | 冻结动画、挂起音频 |

### 5.6 输入监听与节流

- `keydown`（window）：忽略 `repeat` 与 Ctrl/Meta/Alt 组合键与 Shift/CapsLock——组合快捷键不该算作敲击；其余按键左右爪交替；
- `pointerdown`（document，capture）：左键且不点在猫自身上 → 与键盘共用同一条左右交替序列，接着拍下一只爪（游戏本身也只有单爪的 `CatHitLeft` / `CatHitRight`）。点击 UI 也敲，这正是 Bongo Cat 的魅力；
- 音效内置 40ms 节流；精灵图模式下敲击循环第 1/2/3 帧、停顿 700ms 回待机帧。

### 5.7 拖拽与角落吸附

`pointerdown/move/up` + `setPointerCapture` 实现拖拽；移动 < 5px 视为单击（摸头）。松手时按落点计算**最近角落**，把位置换算成 `position + offsetX + offsetY` 一次性 `store.set`——配置与角无关分辨率，窗口缩放后猫还在角落里。双击循环四角。

### 5.8 计数器与 RPC 合写

会话计数在本地累加、 badge 乐观显示；每 20 次或 4s 通过 `stats/bump` 批量上报 host，失败则挂起下一轮重试；`pagehide` 时兜底 flush。多个标签页各有一只猫，计数以 host 累加值为准。

### 5.9 音效合成（`sound.ts`）

默认音效是 WebAudio 实时合成的两级"tok"：三角波 340Hz→150Hz 滑音 + 20ms 带通噪声"clack"，零资产、零下载。`AudioContext` 在首次手势驱动播放时惰性创建（满足自动播放策略）。导入 `.wav` 后切换到 `/plugins/bongo-cat/sound?v=` 播放。

### 5.10 CSS 注入约定

`.module.css` 由构建脚本编译：类名加 `_bc_` 前缀哈希，产出物以 `<style data-plugin-css="dsh-plugin-bongo-cat/<文件路径>">` 注入 `document.head`——与官方 client 包同款约定，shell 的 `claimStyles()` 能正确追踪。cat.ts 直接 `import styles from './cat.module.css'` 使用生成的类名映射。

### 5.11 可见性暂停（v0.2.0，借鉴遮挡暂停）

dsh-wallpaper-engine 的招牌省电特性是"遮挡暂停"，但它对**窗口失焦**的暂停做了精细区分（桌面壳失焦时壁纸仍可见，暂停会定格可见画面，故只在原生浏览器目标下启用）。桌宠迁用的是其中**语义无歧义**的子集——页面可见性：

- `visibilitychange` → 隐藏时：根节点加 `bc-paused`（CSS `animation-play-state: paused` 冻结全部动画）、`BongoSound.suspend()` 挂起 AudioContext、`slap()` 直接忽略输入、休眠计时器停跑；
- 恢复时：解除冻结、`resume()`、**重置空闲计时**（不会在回到页面的瞬间误触发动画切换）。

### 5.12 心情预置（v0.2.0，借鉴预设全快照）

`presets.ts` 的四个预置（专注 / 禅域 / 派对 / 夜猫）是相关设置键的**完整补丁快照**，经**单个** `config/set` 落盘——host 的契约消毒器整块校验，要么全落要么不落，不存在"半应用的心情"。这是 dsh-wallpaper-engine ADR-0011「预设保存整套配置」思想的桌宠尺度简化；用户可存预设（JSON 导入导出）在路线图上（见 ANALYSIS §7）。

### 5.13 原版美术模式（v0.3.0）

**为什么需要提取器**：Steam 版 Bongo Cat 是 Unity 游戏，猫、爪、双鼓都是独立的 UI 精灵，打包在 `BongoCat_Data/sharedassets0.assets` 里；仓库不能分发这些版权素材，所以插件只带"提取器"，在用户本机现场读取。

- 提取（`tools/extract-native.py`）：定位 Steam 库 → UnityPy 打开资源文件 → 按名字取 `<Skin>Left / Right / LeftPunch / RightPunch` → 用每张精灵的 `textureRect` 把它们放回**同一个 256×256 作者画布空间**，再按部件原点（`ORIGIN`，来自 prefab 的 RectTransform 比例与人工校核）合成 → 输出 777×501 的 `idle / tap-left / tap-right`。`--catalog` 另导出每套皮肤的 `<Skin>Icon`（243 张）与 `skins.json`。
- 合成规则（v0.4.2 起默认**不含手鼓**）：身体先画、右爪后画（与游戏图层一致），右爪用**作者原坐标**（与身体同一 256 画布原点，即 `CatIcon` 的对称姿态）。右击帧：`<Skin>RightPunch` 其实只是冲击特效（弧线+短线），游戏是在运行时**旋转右爪节点**，所以提取器自己还原动作——右爪旋转 30° 并**原地往下压 14px**（贴着脸颊拍下去，与游戏计数条上的实测姿态一致；腕部留在身体重叠区不脱节），冲击短线放在爪子右侧肉垫高度；`--with-drums` 时改用游戏原版构图（爪子压在鼓上 + 原版打击帧）。
- 裁切：无鼓模式按三帧内容的并集包围盒裁切（+8px 边距），产物约 777×588。
- 服务（host）：`native/status` 校验 `native.json` + 三张帧是否齐全；`native/import` 先解析解释器——已有 `storages/bongo-cat/pyenv` 就直接用；否则找 `DSH_BC_PYTHON` / `python` / `python3` / `py -3` / `%LOCALAPPDATA%\Programs\Python\Python3*` / `%PROGRAMFILES%\Python3*`，哪个能 `import UnityPy, PIL` 就用哪个；都没有时用任一可用 Python **建插件私有 venv 并 `pip install UnityPy`**（约 26 秒，不改动系统环境），再执行提取器。静态路由 `/plugins/bongo-cat/native/*.png` 只认三个白名单帧名。
- 渲染（client）：`cat.ts` 预创建三张 `<img>` 叠放，根节点 `bc-native-mode` 显示图片层；`data-active` 切帧，敲击 130ms 后回 `idle`。没有原版资源时显示 `bc-empty-mode` 提示；自定义精灵图作为可选覆盖。
- 缓存与刷新：帧 URL 带 `?v=<extractedAt>`；设置面板导入/移除后派发 `bongo-cat:native-changed` 事件，overlay 收到后重新拉 `native/status` 并重绘，无需刷新页面。

---

## 6. 构建系统（`scripts/build.mjs`）

一次 `pnpm build` 产出两个包：

| 产物 | 平台 | 形态 | externals |
|---|---|---|---|
| `lib/index.js` | node / ESM | 直接 bundle | `@deepseek-ai/schemastery`（真实依赖）、`cosmokit` |
| `lib/client.js` | browser / CJS | ModuleLoader 包裹 | `PLATFORM_MODULES` + `dsh.client.inject` 声明包 |

CSS Modules 由 esbuild 插件内联编译（类名哈希 + `data-plugin-css` 注入）。`prepack` = `node scripts/build.mjs`（打包/发布前重建）；`prepare` 已移除——安装期不跑任何脚本，git 直装在 pnpm 10+ 也不会被 `allowBuilds` 拦。

`pnpm typecheck`（`tsc --noEmit`）需要 DSH 的 `@deepseek-ai/*` 包作为 devDependencies——在 DSH 源码检出内或配置了对应 registry 后运行；打包验证只需 `pnpm build`。

---

## 6.5 两级守卫验证与 CI（v0.2.0，借鉴 ADR-0004）

`scripts/verify.mjs` 把判据按**"失败的含义"**分两档（而不是按"感觉重不重要"）：

| 档 | 命令 | 失败意味着 | 退出码 |
|---|---|---|---|
| **硬档** | `pnpm verify` | **用户会撞上**：构建产物过期、契约漂移、交互路径坏了 | 非零，CI 挡 PR |
| **软档** | `pnpm verify:soft` | 仓库内务不准：发布面缺文件、i18n 键缺口、CHANGELOG 缺条目 | 恒为 0，只出声（真实码打印在末尾并写入 `DSH_BC_SOFT_EXIT`） |

硬档内容：① 构建新鲜度（任一 `src/**` 比 `lib/` 新即红，提示 `pnpm build`）；② 契约探针可构建；③ host 冒烟（34 项，含契约对账）；④ browser 冒烟（31 项）。软档内容：发布面 `files[]` 齐全、i18n 三查（声明的键都被用 / 用到的键都声明 / zh+en 覆盖全并集）、CHANGELOG 覆盖当前版本。

分档的理由（参考项目的原话同样适用）：所有判据共用同一种红时，改一行的合规成本被最贵的那条判据决定，贡献者会绕过整条链，真正危险的失败被淹没在无关的红里。

CI（`.github/workflows/verify.yml`）：push/PR 跑 `pnpm install → pnpm build → pnpm verify → pnpm lint`。`pnpm lint` 覆盖 plain-JS 工具面（`scripts/`、`.verify/`），TS 由 `pnpm typecheck` 负责。

---

## 7. 皮肤规范

### 7.1 Steam 皮肤

皮肤不是插件内置素材，而是游戏的精灵命名空间：

- 一套皮肤 = `<Skin>Left / LeftPunch / Right / RightPunch` 四个精灵，外加一张 `<Skin>Icon`（选择器缩略图）；
- `native/catalog` 返回 `skins.json` 里的 243 个名字；图标由 `/plugins/bongo-cat/native/icons/<Name>.png` 提供；
- 点图标 → `native/import { skin }` → 提取器用该皮肤合成三帧并写入 `native/` → 客户端收到 `bongo-cat:native-changed` 后重载；
- `skin` 设置项记录当前皮肤名，重启后从 `native/` 直接加载，不重复提取。

新增/更新皮肤无需改代码：游戏更新后重跑一次 `native/import`（会顺带刷新图标目录）。

### 7.2 自定义精灵图皮肤

导入一张**横向等宽帧条** PNG：

```
┌────┬────┬────┐
│ 1  │ 2  │ 3  │  …（2–12 帧，帧数在设置里调）
└────┴────┴────┘
 待机  左爪  右爪
```

- 每帧正方形（建议 512×512，透明背景 PNG）；
- 第 1 帧待机；第 2/3 帧左/右爪敲击；多余帧在敲击时依次循环；
- 其他键盘 / 鼠标动作复用同一套帧序；
- 导入后 `customSkinFrames` 与条带帧数一致即可，改帧数滑块无需重新导入。

### 7.3 从 Bongo Cat 导入

点设置面板的**扫描本机 Bongo Cat**，插件列出所有候选目录里的图片（安装目录、创意工坊物品、`%APPDATA%\BongoCat`），点击即导入。Bongo Cat 原版皮肤的帧布局与本插件不保证一致——原版皮肤导入后按"条带"解释，通常也能得到有趣的动画；要完美还原请按 7.2 的规范自制或裁剪。

---

## 8. API 参考

### 8.1 RPC endpoint 表

通道：`POST /bongo-cat/<endpoint>`（Connection 信封，仅 loopback 可信写入）。

| endpoint | payload | 返回 | 说明 |
|---|---|---|---|
| `config/get` | `{}` | 全量 settings | 激活时拉取 |
| `config/set` | `{ patch }` | 全量 settings | 白名单 + 范围校验；`counter` 不可写 |
| `stats/bump` | `{ count }`（1–10000） | `{ counter }` | 计数器累加 |
| `stats/reset` | `{}` | `{ counter: 0 }` | 计数归零 |
| `skins/scan` | `{}` | `{ roots: [{label, path, files[]}] }` | 只读扫描 Steam/AppData |
| `skins/import` | `{ path, name }` 或 `{ data, name }` | `{ revision, name, ext }` | path 必须在扫描根内 |
| `skins/remove` | `{}` | `{ removed: true }` | 删除自定义皮肤 |
| `sounds/import` | `{ data, name }`（base64） | `{ revision, name, ext }` | ≤ 2 MB |
| `sounds/remove` | `{}` | `{ removed: true }` | 删除自定义音效 |
| `native/status` | `{}` | `{ available, skin?, size?, extractedAt?, missing? }` | 原版资源是否就绪 |
| `native/import` | `{ skin? }` | `{ available, … }` | 运行 `tools/extract-native.py`（需 Python+UnityPy） |
| `native/remove` | `{}` | `{ removed: true }` | 删除 `storages/bongo-cat/native/` |
| `info` | `{}` | `{ skin, sound, native }` | 资产元信息 |

路由：`GET /plugins/bongo-cat/skin?v=<rev>`、`GET /plugins/bongo-cat/sound?v=<rev>`（不可变缓存，stale 404）、`GET /plugins/bongo-cat/native/<idle|tap-left|tap-right>.png`（帧名白名单，未知帧 404）。

### 8.2 settings 字段表

命名空间 `bongo-cat`，持久化于 `$DSH_HOME/storages/bongo-cat/settings.json`。

| 字段 | 类型 | 默认 | 范围 / 说明 |
|---|---|---|---|
| `enabled` | boolean | `true` | 总开关 |
| `skin` | string | `Cat` | Steam 皮肤名（精灵前缀），`/^[A-Za-z0-9.]{1,64}$/`；不在皮肤目录里的值会回退到默认 |
| `customSkinRevision` | natural | `0` | 自定义皮肤 revision，0 = 无 |
| `customSkinFrames` | natural | `4` | 精灵图帧数 2–12 |
| `size` | number | `1.2` | 缩放 0.5–3 |
| `position` | union | `bottom-right` | 四角之一 |
| `offsetX` / `offsetY` | natural | `28` | 距角落边距 0–4000 |
| `speed` | number | `1` | 动画速度 0.5–2.5 |
| `soundEnabled` | boolean | `true` | 音效开关 |
| `volume` | number | `0.6` | 0–1 |
| `customSoundRevision` | natural | `0` | 自定义音效 revision |
| `showCounter` | boolean | `true` | 计数徽标 |
| `counter` | natural | `0` | 敲击总数（仅 `stats/*` 可改） |
| `hintSeen` | boolean | `false` | 首启提示已展示过（一次性） |
| `eggFreak` / `eggSleep` / `eggPet` / `eggNight` | boolean | `true` | 四个彩蛋开关 |

> 字段表以 `src/shared/settings-contract.ts` 为准（单一真源）；此表仅为导航，新增字段请只改契约。

---

## 9. 调试指南

- **日志**：host 半无控制台输出；browser 半的异常会在 DevTools Console 显示。排查 RPC 问题可直接 `curl -X POST http://127.0.0.1:<port>/bongo-cat/config/get -H 'content-type: application/json' -d '{"type":"client-request","rpcId":"x","method":"config/get","payload":{}}'`（端口见 `dsh web` 启动日志，每次启动随机）。
- **link 模式热迭代**：改 browser 半 → `pnpm build` → 重启 `dsh web` → 硬刷新（Ctrl+F5）。
- **猫不出现**：确认 Settings → 邦哥猫 → 已启用；确认页面是 `http://127.0.0.1`/`localhost`（猫咪本身不要求 loopback，但写入要求）。
- **扫描结果为空**：本机未装 Bongo Cat、或 Steam 装在非常规路径（注册表读取失败时只回退常见路径）。
- **计数不涨**：多个标签页会各自累加后批量上报；host 值是权威。

---

## 10. 扩展指南

| 想做的事 | 改哪里 | 要点 |
|---|---|---|
| 加 Steam 皮肤 | 游戏更新后重跑 `native/import` | 图标目录与 `skins.json` 会自动刷新 |
| 加新 RPC endpoint | `index.ts` dispatch switch + `settings.ts` 类型 + `store.ts` 封装 | 记得同步 §8.1 文档 |
| 换猫咪合成方式 | `tools/extract-native.py` 的 `compose()` | 参数见文件头的 `ORIGIN` / `PAW_SINK` 注释 |
| 支持 Wallpaper Engine 式视频皮肤 | host 加 media 路由（Range 支持） | 参考 `mengzhangj/dsh-wallpaper` 的实现 |
| 接 Bongo Cat 原版计数 | host 读 Steam 云存档 `presets.json` | 只读；注意格式随游戏版本变动 |

---

## 11. 安全与隐私

- **写入仅 loopback**：导入类 RPC 只应来自本机页面；path 类导入额外要求位于扫描根内。
- **游戏目录零写入**：扫描与导入全程只读 Bongo Cat 安装 / 创意工坊目录。
- **无遥测**：不采集、不上传任何会话或用户数据；计数只落在本机 `$DSH_HOME`。
- **注入面**：browser 半只向 `document.body` 追加一个 overlay 与 `<style data-plugin-css>`，不拦截、不改写 DSH 自身 DOM；原生帧与皮肤图标都由 host 从本机游戏资源提取后按 URL 提供。

---

## 12. 附：自动化冒烟测试与守卫

仓库内置两级验证，双端共 83 项断言 + 契约/CSS 守卫，改动双端代码后应保持全绿：

| 测试 | 覆盖内容 |
|---|---|
| `.verify/host-smoke.mjs`（47 项） | settings 自带存储（无 ctx.settings）、四条路由、RPC 信封、**契约对账**、消毒器单元断言、**原版资源**（status / 帧路由 / info / remove）、**皮肤目录与图标路由**、stats、skins/sounds 导入、资产路由 200/404、越权路径拒绝 |
| `.verify/client-smoke.mjs`（36 项） | ModuleLoader 协议、locale/section 注册、overlay 挂载、敲击与修饰键、**原版模式**（挂载、帧 URL、切帧、皮肤选择持久化）、可见性暂停、首启提示、dispose |
| `scripts/verify.mjs` 硬档 | 构建新鲜度、契约探针、**CSS 模块键名核对**（styles.* / cls() 必须在样式表中存在） |
| `scripts/verify.mjs` 软档 | 发布面、i18n 三查、CHANGELOG |

运行（Node ≥ 22，esbuild 与 jsdom 为 devDependencies）：

```sh
pnpm build                                   # 先构建（守卫会检查新鲜度）
node .verify/host-smoke.mjs                  # 34 项断言
node .verify/client-smoke.mjs                # 31 项断言
pnpm verify                                  # 硬档：新鲜度 + 契约 + 双冒烟
pnpm verify:soft                             # 软档：发布面 / i18n / CHANGELOG
```

实现要点：host 测试用 stub 的 `@deepseek-ai/schemastery`（`.verify/node_modules/` 内，仅提供链式 `.default()`）+ 假 Cordis ctx，把注册出来的路由 handler 当真实 HTTP 端点驱动（合成 `IncomingMessage`/`ServerResponse`）；client 测试在 jsdom 里通过 `window.__ModuleLoader__` 加载**真实的 `lib/client.js`**，用假 `connection.rpc` 充当 host，直接派发 `KeyboardEvent`/`MouseEvent` 验证交互。契约探针（`.verify/lib/contract.js`）由 `.verify/build-contract.mjs` 用 esbuild 从 TS 契约构建，两个冒烟测试 import 它即触发构建。

> 开发过程中这些守卫抓到过四个真问题：`config/set` 白名单外字段静默丢字段（改为大声拒绝）、换肤后调色板不重绘、`event.target instanceof Node` 在非浏览器全局域抛错、以及本次软档首跑即抓到 CHANGELOG 缺 0.2.0 条目。保留它们。

## 13. 参考实现

- [`JerryPhoenixCKY/dsh-plugin-wallpaper`](https://github.com/JerryPhoenixCKY/dsh-plugin-wallpaper)——双端 bundle、RPC 信封、revision 资产路由、合写 store 的原型来源
- [`mengzhangj/dsh-wallpaper`](https://github.com/mengzhangj/dsh-wallpaper)——Wallpaper Engine 库扫描（libraryfolders.vdf 解析思路）
- [`lcohvne-tomorin/dsh-background`](https://github.com/lcohvne-tomorin/dsh-background)——SSRF 防护与本地导入的边界处理
- DSH 官方文档：`deepseek-harness.github.io/deepseek-harness/develop/`（Cordis 插件协议）
