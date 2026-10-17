# dsh-plugin-bongo-cat 开发者文档

本文档面向想理解、修改或扩展本插件的开发者。内容涵盖 DSH 双端插件协议、本插件的完整架构、RPC 线上协议、皮肤规范、构建系统与扩展指南。

> 阅读本文不需要先读源码；所有关键代码都有引用路径。
> v0.2.0 起，本插件借鉴了 `elysia395/dsh-wallpaper-engine`（1440★ 的 DSH 壁纸插件）的工程体系，取舍分析见 [ANALYSIS-dsh-wallpaper-engine.md](ANALYSIS-dsh-wallpaper-engine.md)。

---

## 1. 这是什么

`dsh-plugin-bongo-cat` 是一个 DeepSeek Harness（DSH）Web 插件，把 Steam 免费游戏 **Bongo Cat**（app 1337970）的桌宠体验搬进 DSH 的 Web 界面：

- 用户敲键盘 / 点鼠标时，屏幕上悬浮的 SVG 猫咪会举起左右爪交替敲击身下的键盘条；
- 猫咪可拖拽、可四角停靠，位置与外观设置在 `$DSH_HOME/settings.yaml` 持久化；
- 插件会扫描本机 Steam 库里的 Bongo Cat 安装目录与创意工坊，让用户把本地图片一键导入为猫咪皮肤；
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

`prepare` 脚本会在安装时自动执行 `node scripts/build.mjs`，因此 GitHub 安装无需预先构建。

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
│       ├── cat.ts                # 猫咪 overlay 控制器（输入/动画/拖拽/计数/暂停/提示）
│       ├── cat-svg.ts            # SVG 猫模板、皮肤 CSS 变量、画廊预览
│       ├── cat.module.css        # 动画关键帧与装饰/状态开关
│       ├── skins.ts              # 内置皮肤定义（调色板 + 装饰标志）
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

### 4.2 settings 命名空间

```ts
const scope = ctx.settings.register(NS, BongoCatSchema, { applies: 'live' })
```

- `NS = 'bongo-cat'`：命名空间强制小写 kebab-case；
- `applies: 'live'`：配置变更立即生效（browser 半通过 RPC 观察）；
- 解析后的值是深冻结快照，`scope.get()` 读取，`scope.update(patch)` 写入。

完整字段表见 [§8.2](#82-settings-字段表)。

> **重要**：rc.6 的 settings **wire** allowlist 只覆盖内置命名空间，第三方命名空间无法被浏览器侧的 settings-scope binder 直接触达。因此本插件（与参考壁纸插件一致）自己实现了 `/bongo-cat` RPC 通道，`config/get` / `config/set` 在 host 侧中转读写命名空间。

#### 4.2.1 设置单一真源契约（v0.2.0，借鉴 ADR-0002）

`src/shared/settings-contract.ts` 是全仓唯一的设置真源：字段元数据（kind / default / min / max / writable）、`SETTINGS_DEFAULTS`、`sanitizeSettingsPatch`、`WRITABLE_FIELDS`。**两端都从它派生，任何一侧都不再手写平行列表**：

- host：`src/index.ts` 用契约默认值构建 schemastery schema，`config/set` 直接调用契约的 `sanitizeSettingsPatch`——未知字段、宿主权威字段（`counter`，只能走 `stats/*`）、越界值一律**大声拒绝**（`bad-request`），绝不静默丢弃；
- browser：`src/client/settings.ts` 从契约再导出 `BongoCatSettings` 类型（`DefaultOf` 条件映射推导，零手写接口）。

为什么值得单文件管理：白名单式双抄是**静默漂移**——任一侧漏一个键，该键在经过那一侧时被丢弃，用户症状是"改了不生效"，无异常无日志。参考项目（dsh-wallpaper-engine）的 ADR-0002 记录过同款事故。契约对账由守卫强制执行：host 冒烟测试每次运行都断言「宿主 schema 键集 == 契约键集」且「默认值逐一深等」（见 §12）。

**硬约束**：契约被 browser 半导入，因此禁止 value import（无 node 内置、无 @deepseek-ai 包、无顶层副作用）——schemastery 的 schema 构建函数因此放在 host 侧 `src/index.ts` 而非契约内。新增字段只改契约一处，schema / 类型 / 面板 / 消毒器自动跟随。

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

### 5.4 猫咪渲染：SVG + CSS 变量皮肤系统

`cat-svg.ts` 导出一整只猫的 SVG 模板。设计要点：

- **所有可着色形状都从 CSS 自定义属性取色**（`--bc-fur`、`--bc-eye`、`--bc-accent`……）。换皮肤 = 在 overlay 根节点重写这些属性，零 DOM 重建、零图片请求；
- **装饰组**（条纹 / 暹罗面具 / 三花补丁 / 白胸斑 / 六种饰品）默认 `display:none`，由根节点的 `data-deco` 属性门控；
- **三种眼睛**（睁开 / 闭合 / 狂暴）与全部动画由 CSS 类驱动，JS 只负责在正确时机切换类；
- 动画速度统一乘 `--bc-speed`（`calc(90ms / var(--bc-speed))`），一个滑块全局调速；
- `prefers-reduced-motion` 时全部动画关闭。

### 5.5 动画状态机

状态不是状态机，是**根节点上的一组互不干扰的类**：

| 类 / 属性 | 触发 | 效果 |
|---|---|---|
| `bc-tap-left/right/both` | 一次敲击（130ms） | 对应爪下沉 + 对应键盘键高亮 |
| `bc-is-freak` | 1.5s 内 ≥ 8 击（2.5s） | 双眼变 >_<、双爪高速连打、火花四射、音调升高 |
| `bc-is-sleeping` | 90s（深夜 45s）无输入 | 闭眼、Zzz 飘字、呼吸变慢 |
| `bc-is-petting` | 单击猫体（750ms） | 爱心从头顶飘出 + 上升 blip 音 |
| `data-night` | 23:00–06:00 且开关开 | 饱和度/亮度略降的犯困配色 |
| `bc-sprite-mode` | 导入了自定义皮肤 | 隐藏 SVG，切换为精灵图帧动画 |

### 5.6 输入监听与节流

- `keydown`（window）：忽略 `repeat` 与 Ctrl/Meta/Alt 组合键与 Shift/CapsLock——组合快捷键不该算作敲击；其余按键左右爪交替；
- `pointerdown`（document，capture）：左键且不点在猫自身上 → 双爪齐敲。点击 UI 也敲，这正是 Bongo Cat 的魅力；
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
- 恢复时：解除冻结、`resume()`、**重置空闲计时**（不会在回到页面的瞬间误触发打瞌睡）。

### 5.12 心情预置（v0.2.0，借鉴预设全快照）

`presets.ts` 的四个预置（专注 / 禅域 / 派对 / 夜猫）是相关设置键的**完整补丁快照**，经**单个** `config/set` 落盘——host 的契约消毒器整块校验，要么全落要么不落，不存在"半应用的心情"。这是 dsh-wallpaper-engine ADR-0011「预设保存整套配置」思想的桌宠尺度简化；用户可存预设（JSON 导入导出）在路线图上（见 ANALYSIS §7）。

---

## 6. 构建系统（`scripts/build.mjs`）

一次 `pnpm build` 产出两个包：

| 产物 | 平台 | 形态 | externals |
|---|---|---|---|
| `lib/index.js` | node / ESM | 直接 bundle | `@deepseek-ai/schemastery`（真实依赖）、`cosmokit` |
| `lib/client.js` | browser / CJS | ModuleLoader 包裹 | `PLATFORM_MODULES` + `dsh.client.inject` 声明包 |

CSS Modules 由 esbuild 插件内联编译（类名哈希 + `data-plugin-css` 注入）。`prepare` 脚本 = build，GitHub 安装即装即构建。

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

### 7.1 内置皮肤

一款皮肤 = 一个调色板 + 若干装饰标志（`src/client/skins.ts`）：

```ts
{
  id: 'tabby', name: '橘猫条条',
  palette: { fur: '#ffb35c', stripe: '#e07f22', … },
  stripes: true,
  accessory: 'none'
}
```

`palette` 键与 CSS 变量一一对应（`fur` → `--bc-fur`）。新增一款内置皮肤只需往 `BUILT_IN_SKINS`  push 一项，画廊、data-deco 门控、SVG 取色全部自动生效。

### 7.2 自定义精灵图皮肤

导入一张**横向等宽帧条** PNG：

```
┌────┬────┬────┬────┐
│ 1  │ 2  │ 3  │ 4  │  …（2–12 帧，帧数在设置里调）
└────┴────┴────┴────┘
 待机  左爪  右爪  双爪
```

- 每帧正方形（建议 512×512，透明背景 PNG）；
- 第 1 帧待机；第 2/3 帧左/右爪敲击；第 4 帧双爪；多余帧在敲击时依次循环；
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
| `info` | `{}` | `{ skin, sound }` | 资产元信息 |

路由：`GET /plugins/bongo-cat/skin?v=<rev>`、`GET /plugins/bongo-cat/sound?v=<rev>`（不可变缓存，stale 404）。

### 8.2 settings 字段表

命名空间 `bongo-cat`，持久化于 `$DSH_HOME/settings.yaml`。

| 字段 | 类型 | 默认 | 范围 / 说明 |
|---|---|---|---|
| `enabled` | boolean | `true` | 总开关 |
| `skin` | string | `classic` | 内置皮肤 id，`/^[a-z0-9-]{1,32}$/` |
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
| 加内置皮肤 | `skins.ts` push 一项 | 调色板键名 = CSS 变量名；装饰走 `data-deco` |
| 加新彩蛋 | `cat.ts` 加一个根类 + `cat.module.css` 写动画 | 开关放进 settings schema + `CONFIG_FIELDS` + 面板 + 字典 |
| 加新 RPC endpoint | `index.ts` dispatch switch + `settings.ts` 类型 + `store.ts` 封装 | 记得同步 §8.1 文档 |
| 换猫咪造型 | `cat-svg.ts` 改 SVG 模板 | 新形状的取色一律走 `var(--bc-*)` |
| 支持 Wallpaper Engine 式视频皮肤 | host 加 media 路由（Range 支持） | 参考 `mengzhangj/dsh-wallpaper` 的实现 |
| 接 Bongo Cat 原版计数 | host 读 `%APPDATA%\BongoCat` 存档 | 只读；注意格式随游戏版本变动 |

---

## 11. 安全与隐私

- **写入仅 loopback**：导入类 RPC 只应来自本机页面；path 类导入额外要求位于扫描根内。
- **游戏目录零写入**：扫描与导入全程只读 Bongo Cat 安装 / 创意工坊目录。
- **无遥测**：不采集、不上传任何会话或用户数据；计数只落在本机 `$DSH_HOME`。
- **注入面**：browser 半只向 `document.body` 追加一个 overlay 与 `<style data-plugin-css>`，不拦截、不改写 DSH 自身 DOM；所有 SVG 均为插件内置常量，用户导入的只是图片 URL。

---

## 12. 附：自动化冒烟测试与守卫

仓库内置两级验证，双端共 65 项断言 + 契约对账，改动双端代码后应保持全绿：

| 测试 | 覆盖内容 |
|---|---|
| `.verify/host-smoke.mjs`（34 项） | settings 注册、三条路由、RPC 信封、**契约对账**（宿主 schema 键集/默认值 == 契约）、消毒器 7 项单元断言、config/set 消毒（范围/白名单/大声拒绝）、stats、skins/sounds 导入、资产路由 200/404、stale revision 404、越权路径拒绝、未知 endpoint 拒绝 |
| `.verify/client-smoke.mjs`（31 项） | ModuleLoader 协议加载、locale/section 注册、overlay 挂载、键盘/鼠标敲击、修饰键忽略、**可见性暂停/恢复**、**首启提示 toast**、皮肤切换重绘、开关、dispose 清理 |
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
