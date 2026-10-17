# dsh-plugin-bongo-cat

把 Steam 上那只免费的邦哥猫（Bongo Cat，app 1337970）请进 **DeepSeek Harness** 的 Web 界面：你打字，它敲爪；你点鼠标，它双爪齐下；闲着它会打瞌睡，连击太快它会进入狂暴模式。

插件参考了社区壁纸插件（`JerryPhoenixCKY/dsh-plugin-wallpaper`）的双端 bundle 架构，完全遵循 DSH 官方客户端插件协议；v0.2.0 起的工程体系（设置单一真源、两级守卫、产物纪律）借鉴了 `elysia395/dsh-wallpaper-engine`。

## 功能

- **敲击互动**：键盘敲击 → 猫爪左右交替；鼠标点击 → 双爪齐敲；键盘灯随敲击亮起
- **8 款内置 SVG 皮肤**：经典白猫、午夜黑猫、橘猫条条、云朵灰猫、暹罗公子、礼服猫（领结）、三花泼墨、樱花粉粉
- **Steam 皮肤导入**：自动扫描本机 Steam 库中的 Bongo Cat 安装目录与创意工坊（app 1337970），一键把图片导入为自定义皮肤
- **自定义精灵图皮肤**：导入横向精灵图 PNG（帧数 2–12 可调），完整还原"原版猫"手感
- **合成音效**：内置 WebAudio 合成的"tok"敲击声，零音频文件；也可导入自己的 `.wav`
- **敲击计数器**：实时计数，总数在 host 侧持久化（重启不丢）
- **心情预置**：专注 / 禅域 / 派对 / 夜猫 四个一键快照，整套配置单个请求原子落盘
- **省电暂停**：页面隐藏时冻结全部动画并挂起音频，切回即恢复
- **悬浮桌宠**：默认停在右下角，按住可拖到任意位置，双击循环切换四个角；大小、速度、边距均可调
- **趣味彩蛋**：连续快打触发狂暴模式；90 秒不理它开始打瞌睡；单击猫咪触发摸头杀；深夜自动进入犯困配色
- **设置单一真源**：host 与 browser 的设置 schema 从同一份契约派生，杜绝"改了不生效"
- **两级守卫 + CI**：构建新鲜度、契约对账、双端 65 项断言，push/PR 自动跑

## 安装

需要 DeepSeek Harness 的 **web profile**（Node.js ≥ 22）。

从 GitHub 安装（`prepare` 脚本会在安装时自动构建）：

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

> **pnpm ≥ 10 注意**：pnpm 10 起默认拒绝未声明 `allowBuilds` 的安装脚本，`github:` 直装时 `prepare`（安装期构建）会被拒。把安装输出里的 package key 复制到 profile 的 `pnpm-workspace.yaml` 的 `allowBuilds` 块后重试；或直接用本地 zip / npm 包安装（二者都自带预构建产物，安装期不跑任何脚本）。

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
│       ├── cat-svg.ts            #   SVG 猫模板 + 皮肤预览
│       ├── cat.module.css          #   动画与装饰开关（CSS Modules）
│       ├── skins.ts              #   8 款内置皮肤定义
│       ├── presets.ts            #   心情预置（完整补丁快照）
│       ├── sound.ts              #   WebAudio 合成音效
│       ├── store.ts              #   /bongo-cat RPC 配置存储（合写）
│       ├── settings.ts           #   线上类型与字典键（设置类型从契约再导出）
│       ├── BongoCatSection.tsx   #   设置面板
│       └── BongoCatSection.module.css
├── scripts/
│   ├── build.mjs                 # esbuild：双端构建 + CSS Modules + ModuleLoader 包裹
│   └── verify.mjs                # 两级守卫运行器（硬/软档）
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
pnpm verify      # 硬档守卫：新鲜度 + 契约对账 + host 34 项 + browser 31 项断言
pnpm verify:soft # 软档守卫：发布面 / i18n / CHANGELOG（不挡人）
pnpm lint        # plain-JS 工具面（scripts/ 与 .verify/）
```

## 隐私与安全

- 仅在**本机（loopback）**接受皮肤 / 音效导入，导入的文件会先经过路径与类型校验
- 扫描 Bongo Cat 目录是**只读**的，永远不会改动游戏安装或创意工坊文件
- 不采集、不上传任何会话或用户数据；敲击计数只存在本机 `$DSH_HOME`

## 许可

MIT。Bongo Cat 游戏本体归其作者所有；本插件不包含任何游戏资产，内置猫咪均为原创 SVG 绘制。
