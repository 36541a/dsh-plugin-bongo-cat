# dsh-plugin-bongo-cat

把 **Steam 上那只原版邦哥猫**（Bongo Cat，app 1337970）请进 **DeepSeek Harness** 的 Web 界面：你打字，它敲爪；你点鼠标，它也跟着敲——每次只拍一只爪，左右交替，和游戏里一模一样。

画面用的就是游戏本体的原始美术资源——插件从你**本机已安装的游戏**里提取精灵、按游戏自己的图层原位合成，逐帧播放，不是重画的仿制品。资源不随插件分发，也不离开你的电脑。

插件参考了社区壁纸插件（`JerryPhoenixCKY/dsh-plugin-wallpaper`）的双端 bundle 架构，完全遵循 DSH 官方客户端插件协议；v0.2.0 起的工程体系（设置单一真源、两级守卫、产物纪律）借鉴了 `elysia395/dsh-wallpaper-engine`。

## 功能

- **原版美术**：从本机 Steam 安装的 Bongo Cat 中提取原始精灵（身体 / 右爪 / 左右手鼓），按游戏图层与画布坐标合成 idle、左击、右击三帧，画面与原版一致
- **敲击互动**：键盘敲击与鼠标点击共用一条左右交替序列，每次只拍一只爪（游戏只有 `CatHitLeft` / `CatHitRight` 两个动作）；键盘灯随敲击亮起
- **Steam 皮肤选择器**：把游戏里全部 243 套皮肤做成图标网格，点一下就换装（提取自你本机安装，含节日/联动皮肤）
- **Steam 皮肤导入**：扫描本机 Bongo Cat 安装目录与创意工坊（app 1337970），把图片导入为自定义皮肤
- **自定义精灵图皮肤**：导入横向精灵图 PNG（帧数 2–12 可调）
- **合成音效**：内置 WebAudio 合成的"tok"敲击声，零音频文件；也可导入自己的 `.wav`
- **敲击计数器**：实时计数，总数在 host 侧持久化（重启不丢）
- **心情预置**：专注 / 禅域 / 派对 / 夜猫 四个一键快照，整套配置单个请求原子落盘
- **省电暂停**：页面隐藏时冻结全部动画并挂起音频，切回即恢复
- **悬浮桌宠**：默认停在右下角，按住可拖到任意位置，双击循环切换四个角；大小、速度、边距均可调
- **设置单一真源**：host 与 browser 的设置 schema 从同一份契约派生，杜绝"改了不生效"
- **两级守卫 + CI**：构建新鲜度、契约对账、CSS 模块键名核对、双端 88 项断言，push/PR 自动跑

## 安装

需要 DeepSeek Harness 的 **web profile**（Node.js ≥ 22）。

从 GitHub 安装（仓库自带 `lib/` 构建产物，装完即用，无需构建）：

```sh
dsh plugin --profile web add github:36541a/dsh-plugin-bongo-cat
```

本地开发（link 模式，改完代码重新 build 再重启即可）：

```sh
cd dsh-plugin-bongo-cat
pnpm install
pnpm build
dsh plugin --profile web add link:./dsh-plugin-bongo-cat
```

安装后重启 `dsh web`（插件在启动时加载），刷新页面，打开 **Settings（设置）→ 邦哥猫**。

> **为什么不用跑安装脚本**：`lib/index.js` 与 `lib/client.js` 随仓库一起发布，`github:` 直装不执行任何 install 脚本，因此 pnpm 10+ 的 `allowBuilds` 闸不会拦你。开发时改完源码记得 `pnpm build` 再提交（`pnpm verify` 会检查产物是否比源码新）。

卸载：

```sh
dsh plugin --profile web remove dsh-plugin-bongo-cat
```

## 使用

1. Settings → 邦哥猫，勾选**启用邦哥猫**
2. 在皮肤画廊里挑一只猫；想用 Steam 里的猫？点**扫描本机 Bongo Cat**，在扫描结果里点任意图片即可导入
3. 赶稿/派对/深夜不想一项项调？点顶部的**心情预置**一键切换
4. 拖动滑块调整大小、动画速度、音效量和边距；点四个角按钮切换停靠位置
5. 回到工作区尽情打字——听，猫在敲键盘

> 导入皮肤 / 音效只能在本机页面（localhost）操作，这是 DSH 的写入通道安全限制。

## 原版资源（Steam）

原版模式依赖本机安装的 Bongo Cat（Steam 免费游戏，app 1337970）：

1. Settings → 邦哥猫 → **猫咪来源** 选「自动（优先原版）」
2. 点 **从 Steam 导入原版资源**
3. 首次会自动准备运行环境：在 `storages/bongo-cat/pyenv` 建一个插件私有 venv 并安装 UnityPy（约 50 MB，需要联网，1 分钟左右），不会动你系统里的 Python
4. 完成后立即生效：`$DSH_HOME/storages/bongo-cat/native/` 下生成 `idle.png` / `tap-left.png` / `tap-right.png`（1020×750）

提取器做的事：定位 Steam 库 → 读取 `BongoCat_Data/sharedassets0.assets` → 取出 `<Skin>Left / Right / LeftPunch / RightPunch` → 按精灵 `textureRect` 与原版图层坐标合成 → 输出三帧。**默认只画猫（不含手鼓）**，右爪从身体下缘露出；想要原版"双鼓"构图可加 `--with-drums`。换皮肤：`python tools/extract-native.py --list` 可列出全部 244 个皮肤，`--skin Black` 这类参数可提取指定皮肤。

**版权说明**：美术资源版权归 Bongo Cat 作者所有。插件仓库、npm 包与 zip **都不包含任何游戏图像**；提取只在你的机器上运行，产物只写入本机 DSH 数据目录，用于个人显示。

## 目录结构

```
dsh-plugin-bongo-cat/
├── src/
│   ├── index.ts                  # host 端：settings 命名空间 + RPC 通道 + 资产路由
│   ├── shared/
│   │   └── settings-contract.ts  # ★ 设置单一真源：两端派生
│   └── client/                   # browser 端
│       ├── index.tsx             #   入口：注册 settings.section + locale + 挂载猫咪
│       ├── cat.ts                #   猫咪控制器：输入监听、动画状态、拖拽、计数、暂停
│       ├── cat.module.css          #   动画与装饰开关（CSS Modules）
│       ├── presets.ts            #   心情预置（完整补丁快照）
│       ├── sound.ts              #   WebAudio 合成音效
│       ├── store.ts              #   /bongo-cat RPC 配置存储（合写）
│       ├── settings.ts           #   线上类型与字典键（设置类型从契约再导出）
│       ├── BongoCatSection.tsx   #   设置面板
│       └── BongoCatSection.module.css
├── scripts/
│   ├── build.mjs                 # esbuild：双端构建 + CSS Modules + ModuleLoader 包裹
│   └── verify.mjs                # 两级守卫运行器（硬/软档）
├── tools/
│   └── extract-native.py         # 本机提取器：从 Steam 安装导出并合成原版帧
├── .verify/                      # 冒烟测试（host/browser/契约探针）
├── cordis.patch.yml              # host 端插件注册
└── docs/
    ├── DEVELOPMENT.md            # 开发者文档
    └── ANALYSIS-dsh-wallpaper-engine.md  # 参考项目架构分析
```

## 开发者

完整架构、RPC 协议、皮肤规范与扩展指南见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)；对参考项目 `elysia395/dsh-wallpaper-engine` 的架构分析与借鉴取舍见 [docs/ANALYSIS-dsh-wallpaper-engine.md](docs/ANALYSIS-dsh-wallpaper-engine.md)。

```sh
pnpm install
pnpm typecheck   # 需要 DSH 仓库的 @deepseek-ai/* 依赖（见文档）
pnpm build       # esbuild → lib/index.js + lib/client.js
pnpm verify      # 硬档守卫：新鲜度 + 契约 + CSS 键名 + host 47 项 + browser 36 项断言
pnpm verify:soft # 软档守卫：发布面 / i18n / CHANGELOG（不挡人）
pnpm lint        # plain-JS 工具面（scripts/ 与 .verify/）
```

## 隐私与安全

- 仅在**本机（loopback）**接受皮肤 / 音效导入，导入的文件会先经过路径与类型校验
- 扫描 Bongo Cat 目录是**只读**的，永远不会改动游戏安装或创意工坊文件
- 不采集、不上传任何会话或用户数据；敲击计数只存在本机 `$DSH_HOME`

## 许可

MIT。Bongo Cat 游戏本体与美术资源归其作者所有；本插件不包含任何游戏图像，画面由你本机安装的游戏现场提取。
