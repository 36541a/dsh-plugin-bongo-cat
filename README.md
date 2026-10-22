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
- **桌面组件**：时钟 / 敲击统计 / 专注计时三种小组件，与猫咪互相独立、可任意搭配、拖动摆放
- **点一下猫就能进设置**：单击打开「设置 → 邦哥猫」，带悬停提示与按压反馈；拖动与双击换角落互不干扰
- **装扮系统**：帽子 / 表情 / 配饰 / 毛色四类、26 件贴纸 + 10 档毛色，敲击掉落收集，点格子即穿即脱
- **两级守卫 + CI**：构建新鲜度、契约对账、CSS 模块键名核对、清单/模块表核对、双端 157 项断言，push/PR 自动跑

## 桌面组件

除了那只猫，插件还能挂一组**独立的小组件**。组件与猫完全解耦——关掉猫，组件照样在；反过来也一样。

| 组件 | 能做什么 | 可调项 |
|---|---|---|
| **时钟** | 本地时间与日期 | 12/24 小时制、是否显示秒、是否显示日期 |
| **敲击统计** | 累计敲击数（读宿主持久化值）或本次会话 | 数据来源 |
| **专注计时** | 1–120 分钟倒计时，开始/暂停/重置，到点响两声 | 时长、结束提示音 |

**怎么组合**：同一类型可以放好几个（`clock`、`clock-2`…），最多 12 个；每个组件有自己的位置、尺寸（小/中）和不透明度；绘制层级等于列表顺序。在设置里点「+ 时钟」这类按钮添加，按住卡片标题栏拖动摆放，窗口变小时会自动收回可视区。

**怎么配置**：设置 → 邦哥猫 → 桌面组件，每个实例都有独立开关与配置；布局与配置存进同一份设置文档，重启后原样恢复。

**边界**：组件的写入类接口沿用 loopback 白名单（跨机页面只能读）；组件类型在版本间可能退役，host 读取设置时会丢弃本版本不认识的实例，不会留下渲染不出内容的空卡片。

## 装扮

猫可以穿东西。四类道具、共 26 件贴纸加 10 档毛色，全部挂在猫的 `stage` 里，跟着拖动、缩放、换角一起走。

| 页签 | 内容 | 说明 |
|---|---|---|
| **帽子** | 毛线帽、棒球帽、派对帽、蝴蝶结、礼帽、圣诞帽、花、耳机、皇冠、恶魔角 | 贴在头顶，`y≈2–8%` |
| **表情** | 腮红、圆框眼镜、墨镜、星星眼、爱心眼、冷汗、怒气、音符 | 贴在脸部 |
| **配饰** | 围巾、领结、铃铛、徽章、项链、挎包、奖牌、翅膀 | 围巾这类在身前；翅膀标记 `layer: 'back'`，画在透明 PNG 底下，只露出轮廓外的部分 |
| **毛色** | 原色、奶油、橘、可可、灰、夜、玫瑰、天蓝、薄荷、丁香 | CSS 滤镜作用在美术上，不影响贴纸和计数徽章 |

**怎么收集**：每 120 次敲击掉落一件，稀有度加权（★:8 / ★★:4 / ★★★:1），重复的累加成数量角标；首次安装送三件基础款。掉落在猫上方弹一条带贴纸缩略图的提示。

**怎么穿**：设置 → 邦哥猫 → 装扮。点格子穿上，再点一次脱下；同一槽位只能穿一件，但三类可以叠起来。工具条依次是 **筛选**（全部 / 已拥有 / 已装备）、**随机搭配**（只从已拥有的里挑）、**领取掉落**（把敲击账本上已攒够的掉落一次结算）、**全部卸下**。

**一致性**：面板和猫的掉落都通过同一个串行写回队列改 `wardrobe`（整字段写入），所以“点格子装备”和“这一下敲击刚好掉落”不会互相覆盖；掉落按第 N 次掉落播种，重放同一份配置结果一致。

**校验**：`wardrobe` 是嵌套对象，host 校验**结构**（非对象直接 `bad-request`），内容**前向兼容**（未知道具 id 丢弃、没拥有的不能穿、未知毛色回原色、未知筛选回全部、数量 clamp 到 999）——新版本写的衣柜在老版本里仍可读。

## 安装

需要 **DeepSeek Harness 的 web profile**（Node.js ≥ 22）。实测通过的内核：`0.2.0-rc.2`（主目标）与 `0.1.1-rc.2`（同样能正常挂载）；`0.1.0` 线与 `0.2.1-rc` 未验证，`0.3.x` 尚未发布。

从 GitHub 安装（仓库自带 `lib/` 构建产物，装完即用，无需构建）：

```sh
dsh plugin --profile web add github:36541a/dsh-plugin-bongo-cat
```

这条命令做三件事，**都不需要你手工配置**：

1. 把包装进 profile 的 `dependencies`；
2. 因为包里声明了 `dsh.bundle.patch`，`dsh` 会自动把 `dsh-plugin-bongo-cat` 追加进 `dsh.profile.bundles`（也就是“插件层”，无需自己改 `cordis.patch.yml`）；
3. 因为 `package.json` 声明了 `dsh.client`，重启后浏览器端会自动进入 0.2.0 的模块引导图，不需要往任何清单里加路径。

本地开发（link 模式，改完代码重新 build 再重启即可）：

```sh
cd dsh-plugin-bongo-cat
pnpm install
pnpm build
dsh plugin --profile web add link:./dsh-plugin-bongo-cat
```

安装后重启 `dsh web`（插件在启动时加载），刷新页面，打开 **Settings（设置）→ 邦哥猫**。

### 装完怎么确认它真的活了

`dsh web` 启动时会打印一个带 token 的地址，直接拿它跑仓库里的自检脚本：

```sh
dsh web --no-open                  # 复制打印出来的 http://127.0.0.1:<port>/?token=…
node tools/verify-install.mjs "http://127.0.0.1:9000/?token=…"
```

全绿（12 项）说明这样几件事：

```
ok  token exchange accepted — HTTP 303
ok  dsh-plugin-bongo-cat is rostered in the client graph   ← 浏览器端进了 0.2.0 引导图
ok  row belongs to an initial-load batch — application
ok  combo bundle served — HTTP 200, 10459199 bytes          ← 组合脚本带上了浏览器半
ok  /bongo-cat/config/get returns resolved settings         ← host 端 RPC 通道可用
ok  /plugins/bongo-cat/skin route is mounted — HTTP 404     ← 路由已挂载（未导入皮肤时 404 正常）
```

然后在浏览器里应当看到：右下角出现提示块「请先在设置里导入原版资源」（还没导入 Steam 资源时的正常形态），打开设置能在左侧导航里看到**邦哥猫**，里面有启用开关、皮肤选择、心情预置、大小/速度/边距、敲击总数与音效。随便敲几下键盘，徽章数字会增长。

> **为什么不用跑安装脚本**：`lib/index.js` 与 `lib/client.js` 随仓库一起发布，`github:` 直装不执行任何 install 脚本，因此 pnpm 10+ 的 `allowBuilds` 闸不会拦你。开发时改完源码记得 `pnpm build` 再提交（`pnpm verify` 会检查产物是否比源码新）。

卸载：

```sh
dsh plugin --profile web remove dsh-plugin-bongo-cat
```

> 卸载时 `dsh` 会把它从 `dsh.profile.bundles` 里一并摘掉；`$DSH_HOME/storages/bongo-cat/` 里的设置与已提取素材会保留，想彻底清干净手动删掉这个目录即可。

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
│       ├── BongoCatSection.tsx   #   设置面板（含组件管理）
│       ├── BongoCatSection.module.css
│       ├── widgets/              #   桌面组件
│       │   ├── registry.ts       #     WidgetDefinition + 注册表（扩展点）
│       │   ├── dock.ts           #     组件层：实例增删、拖动、持久化
│       │   ├── clock.ts          #     时钟
│       │   ├── counter.ts        #     敲击统计
│       │   ├── focus.ts          #     专注计时
│       │   ├── chime.ts          #     共用提示音
│       │   └── widgets.css       #     组件样式（全局，支持深浅色）
│       └── cosmetics/            #   装扮
│           ├── WardrobePanel.tsx #     衣橱面板（页签/网格/色板/工具条）
│           ├── wardrobe.module.css
│           ├── render.ts         #     贴纸层与毛色滤镜
│           ├── writer.ts         #     串行化 wardrobe 写回
│           └── cosmetics.css     #     贴纸层样式
├── scripts/
│   ├── build.mjs                 # esbuild：双端构建 + CSS Modules + ModuleLoader 包裹
│   └── verify.mjs                # 两级守卫运行器（硬/软档）
├── tools/
│   ├── extract-native.py         # 本机提取器：从 Steam 安装导出并合成原版帧
│   └── verify-install.mjs        # 装完自检：对着 dsh web 的地址验证插件真的活了
├── .verify/                      # 冒烟测试（manifest/host/browser/契约探针）
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
pnpm verify      # 硬档守卫：新鲜度 + 契约 + CSS 键名 + manifest 20 项 + host 74 项 + browser 63 项断言
pnpm verify:soft # 软档守卫：发布面 / i18n / CHANGELOG（不挡人）
pnpm lint        # plain-JS 工具面（scripts/ 与 .verify/）
```

## 隐私与安全

- 仅在**本机（loopback）**接受皮肤 / 音效导入，导入的文件会先经过路径与类型校验
- 扫描 Bongo Cat 目录是**只读**的，永远不会改动游戏安装或创意工坊文件
- 不采集、不上传任何会话或用户数据；敲击计数只存在本机 `$DSH_HOME`

## 许可

MIT。Bongo Cat 游戏本体与美术资源归其作者所有；本插件不包含任何游戏图像，画面由你本机安装的游戏现场提取。
