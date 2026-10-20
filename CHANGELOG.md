# Changelog

## 0.7.1 — 2026-10-20

**修掉隔离环境验收里挖出的五个真问题**（详见 `dsh-plugin-bongo-cat-0.7.0-验证报告.md`）：

- **P0 致命：一个坏资产能打挂整个 dsh**。四条资产路由都是 `createReadStream(file).pipe(res)`，没有 `error` 监听；路径被目录占位、ACL 拒绝、共享盘断连时，`EISDIR` 成为进程级未捕获异常，`dsh web` 直接退出。现在统一走 `pipeFile()`（挂 `error`，未发头则 500、已发头则收尾），并在 `statSync` 处用 `assetSize()` 校验 `isFile()`，不可读路径一律 404
- **P1：导入失败会吃掉上一张皮肤**。`importAsset` 原先「写元数据 → rename」，rename 一失败元数据就指向不存在的文件，旧皮肤永久 404。现在改为「写 tmp → rename 到位 → 再原子写元数据」，元数据失败时回滚刚落的文件
- **P1：README 承诺的“仅本机可写”没有服务端实现**。`/bongo-cat` 的 6 个文件系统端点（`skins/*`、`sounds/*`、`native/import|remove`）增加 loopback 校验，非本机请求返回 `forbidden`；`config/*`、`stats/*` 保持原样（悬浮猫自己要用）
- **P2：解释器坏掉时返回 500 纯文本**。`spawn` 对非法 PE 会**同步抛出**，原先直接穿透到 `serveRpc` 的兜底 500，破坏 RPC 信封；现在 `runCommand` 捕获并归一为 `{status:-1}`。同时 `resolvePython` 不再只 `existsSync(venvPython)` 就返回——先探测 `import UnityPy`，坏了就删掉重建（进程内缓存探测结果）
- **P3：并发 `native/import` 静默丢结果**。加互斥，第二个请求返回 `bad-request: extraction already running`，不再让两次提取互相覆盖帧
- **P3：超大请求体改为 413**。25 MB 包原先直接 `req.destroy()`，客户端只看到 `ECONNRESET`；现在回 `413 request body is too large` 再关闭，并停止继续累积分片
- 文档：`engines.dsh` 放宽为 `>=0.1.1-rc.2 <0.3.0`，README 不再声称“0.1.x 不支持”——实测 `0.1.1-rc.2` 装完悬浮层正常挂载

回归：`pnpm typecheck` 绿，硬档 20 + 54 + 39 = 113 项断言仍全绿；隔离环境 44 项 host 断言通过，故障注入里 P0 由“进程退出”变为“404 + 服务存活”。

## 0.7.0 — 2026-10-20

**适配 DSH 0.2.0**（行为不变，只换内核契约）。0.2.0 把客户端插件系统换了一整套：`dsh-client-runtime` 被并进 `@deepseek-ai/cordis`，模块表改由 `dsh-client-modules` 组装，RPC handler 多了一个 `peer` 参数。逐条对齐如下：

- **清单**：新增 `dsh.manifestVersion: 1` 与 `engines.dsh: ">=0.2.0-rc.1 <0.3.0"`；`dsh.client.inject` 去掉已不存在的 `@deepseek-ai/dsh-client-runtime`（0.2.0 里没有任何包提供它，留着就是一条指向空气的图边）；`exports["./client"]` 保持，0.2.0 的 client-modules 正是靠它定位浏览器半
- **依赖**：devDependencies 全部对齐 `0.2.0-rc.2`；删掉 0.2.0 已不再发布的 `dsh-client-runtime` / `dsh-client-web-react` / `dsh-host-apiproxy`，新增 `dsh-client-ui-renderer`（`ctx.slots` 的类型增强在这个包里）；删除 `peerDependencies`——两端产物都不在运行时 import `@deepseek-ai/cordis`，留着只会让 profile 的 pnpm 每次报 "missing peer"
- **客户端上下文**：`ClientContext` 从 `@deepseek-ai/dsh-client-runtime/client` 改为 `@deepseek-ai/cordis` 的 `Context`；`ctx.slots` / `ctx.locale` 改为通过 `dsh-client-ui-renderer/client`、`dsh-client-locale/client` 的类型增强获得
- **host 端 RPC 契约**：0.2.0 的 `ConnectionRpcHandler` 多了一个尾部 `peer: PeerScope`。插件自带 `/bongo-cat` 前缀路由，不经过 `ctx.connection.rpc.handle()`，因此改用本地的三参 `RpcDispatch`，并留一条编译期断言（`Assignable<RpcDispatch, ConnectionRpcHandler>`）——将来内核再改签名，`pnpm typecheck` 会先红，而不是用户先撞上
- **构建**：`PLATFORM_MODULES` 换成 0.2.0 web shell 真实播种的那张表（`react*`、`cordis`、`client-store`、`ui-slots`、`ui-primitives`、`ui-dockkit`），删掉 0.2.0 已无的 `dsh-client-web-react` / `ui-attachment` / `schema-form`
- **新增守卫** `.verify/manifest-smoke.mjs`（硬档）：校验 bundle 层/客户端导出/inject 边是否都指向真实存在的包、产物 `require()` 是否只落在 0.2.0 模块表内、`engines.dsh` 是否只声明 0.2 线
- **新增工具** `tools/verify-install.mjs`：装完对着 `dsh web` 打印的地址跑一遍，直接确认「引导图里有这一行 + 组合脚本真的带上了浏览器半 + `/bongo-cat` RPC 正常应答」
- 顺带修掉三处被新类型暴露出来的旧问题：设置页「读取失败」态判断写成了不存在的 `'error'`（应为 `'unavailable'`）、`event.target` 的 Node 收窄改为跨 realm 安全的断言（`instanceof` 在 jsdom/iframe 里会反过来）、`readdirSync` 的 `Dirent` 标注跟随 `@types/node` 24

实测（Windows 11 / Node 22 / dsh 0.2.0-rc.2，全新 `$DSH_HOME`）：`dsh plugin --profile web add` 后 profile 自动把包加进 `dsh.profile.bundles`，重启 `dsh web` 即出现「设置 → 邦哥猫」与右下角猫咪，无需任何手工配置；无 peer 警告、无控制台报错。回归：`pnpm typecheck` 绿，硬档 20 + 49 + 39 = 108 项断言全绿。

## 0.6.2 — 2026-10-19

**右拍改为"原地往下拍"**（按游戏本体计数条上的实测姿态校准）：

- 0.6.1 的右爪绕腕甩 50° 会甩到身体右侧之外，读起来像"挥出去"；游戏本体的实际动作是**爪子贴着脸颊原地往下压**，只有轻微旋转
- 现在：右爪旋转 30° + 整体下压 14px（腕部仍留在身体重叠区，不脱节），冲击短线放在爪子右侧、肉垫高度——与游戏计数条上看到的姿态一致
- 枢轴仍按爪精灵尺寸比例取值，243 套皮肤通用（Cat / Black 逐帧核对）
- `--with-drums` 保持游戏原版构图不变

## 0.6.1 — 2026-10-19

**右拍补上"爪子拍下去"的动作**：

- 查证：`<Skin>RightPunch` 其实**不是爪子姿态**，只是冲击特效（弧线 + 三根短线）——游戏里右击是在运行时旋转右爪节点，静态精灵里不存在"右爪拍下"的画。所以 0.6.0 的右拍只能整体下移 12px，看起来没有拍击动作
- 现在提取器自己还原这个动作：**右爪绕腕部（爪精灵左下 45%,92%）顺时针摆 50°**，腕部钉在原位保持与身体相连，掌心向外拍下，原版三根冲击短线落在爪尖右下方——与左拍（身体前倾 + 左爪拍出 + 冲击线）对称
- 旋转用显式仿射映射实现（不依赖 PIL 的 expand 偏移约定），枢轴/爪尖按爪精灵尺寸的比例取值，243 套皮肤通用
- `--with-drums` 保持游戏原版构图不变（爪子压鼓 + 原版打击帧）
- 测试：host 49 + browser 39 项断言不变，提取器产物人工逐帧核对

## 0.6.0 — 2026-10-19

**右爪回到原版对称姿态，拍击改回原版单爪左右交替**：

- **右爪位置**：改用与身体相同的 256 画布原点，两爪同高、左右对称——即游戏 `CatIcon`（皮肤选择器里那张图）的姿态，不再借用"搭在鼓上"的偏下坐标
- **拍击交替**：打字与鼠标点击共用一个左右交替序列，每输入一次只拍**一只**爪子，与游戏 `CatHitLeft` / `CatHitRight` 一致；删掉"双爪同拍"帧与 `bc-tap-both` 对应的 CSS
- **右爪打击帧**：整只爪下压 12px，叠上原版三根短划冲击线（原版需要鼓才读得懂的弧线仍不带）
- 自定义图片皮肤提示改为 3 帧（第 1 帧待机、2 左爪、3 右爪），去掉已废弃的第 4 帧
- 旧版本的 `skin` 值（`classic` 等内置美术 id）在读取时按皮肤目录回退到 `Cat`，避免"重新提取当前皮肤"直接报 sprites missing
- 测试：host 49 + browser 39 = 88 项断言，新增左右交替与旧 skin 迁移断言

## 0.5.0 — 2026-10-19

**只保留原版猫，并支持导入你拥有的全部皮肤**：

- **删除自绘 SVG 猫与 8 款内置皮肤**（`cat-svg.ts` / `skins.ts`），未导入原版资源时显示"请先导入"的提示块，而不是一只假猫
- 新增 **Steam 皮肤选择器**：提取器 `--catalog` 导出 243 套皮肤的图标与 `skins.json`，设置面板以图标网格呈现，点任意皮肤即现场提取换装（约 3 秒）
- 新增 `native/catalog` endpoint 与 `/plugins/bongo-cat/native/icons/<Name>.png` 图标路由；导入完成后把所选皮肤写入 `skin`
- `skin` 字段语义改为 **Steam 皮肤名**（如 `Cat`、`Black`），默认 `Cat`
- 移除"猫咪来源"选择器与四个彩蛋（狂暴/瞌睡/摸头/深夜）——三帧原生美术无法表达，且 Steam 版没有这些行为
- 保留自定义图片皮肤作为可选覆盖；心情预置改为只调大小/速度/音量/计数
- 测试：host 47 + browser 36 = 83 项断言

## 0.4.4 — 2026-10-19

- 修复干净检出下 `pnpm verify` 必红：硬档改为先构建契约探针（`.verify/lib/` 被 gitignore，CI 上没有缓存）
- 补充 `pnpm lint` 在 CI 上通过所需的运行顺序（verify 绿后才会执行）

## 0.4.3 — 2026-10-19

- 修复 CI：`setup-node` 的 `cache: pnpm` 在无 lockfile 时直接失败，已移除；补 `jsdom` 开发依赖（browser 冒烟测试需要）
- 仅工程面改动，插件行为与 0.4.2 一致

## 0.4.2 — 2026-10-19

- 修正右爪落点：改回**原版作者坐标**（游戏里搭在鼓上的位置），去掉鼓后它正好落在身体右下沿，与左爪形成自然的一高一低；上一版把它下沉 36px 藏在身体后面，看起来像悬空
- 右爪重新画在身体**前面**（与游戏图层一致），肉垫完整可见
- 打击帧改为右爪下压 8px，不再叠会被误读为断爪的弧线

## 0.4.1 — 2026-10-19

- **去掉手鼓，只留猫**（默认）：合成不再画 `DefaultBongo*` 两只鼓，画面裁切收紧到猫本体
- 没有鼓之后右爪会与身体白叠白，改为**画在身体之下、下缘下沉 36px**，露出半只带肉垫的爪子，像趴在边缘垂下来
- 右爪打击帧改为**下压 8px**（原来依赖鼓挡住爪子的打击弧线在无鼓时读起来像断爪，已移除线条）
- `tools/extract-native.py` 新增 `--with-drums`，需要原版双鼓构图时可显式开启；`native.json` 记录 `drums` 字段
- 帧尺寸 777×588（原 1020×750），透明边距更少

## 0.4.0 — 2026-10-19

**兼容 DSH 0.2.x**（0.2.0-rc.2 移除了 `ctx.settings.register`，旧版插件 `apply()` 抛异常 → 后端不加载 → 设置页卡在「正在读取设置…」，只能靠脚本给构建产物打补丁）：

- 设置改为**插件自带 JSON 存储**（`$DSH_HOME/storages/bongo-cat/settings.json`）：默认值与校验仍来自共享契约，`inject` 只声明 `webServer`，0.1.x / 0.2.x 走同一条代码路径
- 移除 `@deepseek-ai/schemastery`、`@deepseek-ai/dsh-settings` 依赖
- **原版资源导入自动准备环境**：首次点击会创建插件私有 venv（`storages/bongo-cat/pyenv`）并在其中安装 UnityPy，然后调用提取器；不再要求用户手动 `pip install UnityPy`，也不再因"Python 有但没装包"而失败
- 导入提示与错误文案更新；新增手动 E2E 脚本 `.verify/e2e-native-import.mjs`（真实建 venv + 提取，不进 CI）
- 测试：host 45 + browser 40 = 85 项断言

## 0.3.1 — 2026-10-18

- **GitHub 直装开箱可用**：`lib/` 构建产物随仓库发布；移除 `prepare`（安装期脚本），`github:` 直装不再受 pnpm 10+ `allowBuilds` 限制
- 保留 `prepack`：npm 打包 / 发布前自动重建；`pnpm verify` 继续检查产物新鲜度
- 文档同步：安装说明、构建系统章节

## 0.3.0 — 2026-10-18

**改为使用 Steam 原版美术资源**（此前是自己画的 SVG 猫，与"跟原版一模一样"的要求不符）：

- 新增「原版模式」：从用户本机安装的 Bongo Cat（Unity）中提取原始精灵（`<Skin>Left/Right/LeftPunch/RightPunch` + 双鼓），按游戏自己的图层与画布坐标原位合成为 idle / 左击 / 右击 三帧，再用插件逐帧播放——画面即原版
- 新增 `tools/extract-native.py`：本机提取器（Python + UnityPy），自动定位 Steam 库、导出并合成 1020×750 帧，写入 `$DSH_HOME/storages/bongo-cat/native/`
- host 新增 `native/status`、`native/import`、`native/remove` 三个 endpoint 与 `/plugins/bongo-cat/native/<frame>.png` 资产路由；`native/import` 会寻找可用的 Python（`DSH_BC_PYTHON` 可指定）并运行提取器
- 设置面板新增「猫咪来源」：自动 / Steam 原版 / 内置 SVG，以及原版资源状态、导入、重新提取、移除
- 资源**不随插件分发**：仓库与 npm 包只含提取器，图像始终留在用户本机
- 修复 CSS Modules 键名错配（`styles.root` vs `.bc-root` 等）——该问题会让动画类全部失效；新增硬档守卫 `css-module keys exist`，防止再犯
- 测试：host 34→44 项、browser 31→40 项（共 84 项断言）

## 0.2.0 — 2026-10-17

借鉴 `elysia395/dsh-wallpaper-engine` 的工程体系做的结构性升级（分析见 `docs/ANALYSIS-dsh-wallpaper-engine.md`）：

- **设置单一真源契约**（ADR-0002）：新增 `src/shared/settings-contract.ts`，键集 / 默认值 / 范围 / 枚举 / 消毒器只定义一次，host schema 与 browser 类型双双派生——"改了不生效"类的双端漂移在结构上被消掉
- **契约对账守卫**：host 冒烟测试每次运行都断言「宿主 schema 默认值 == 契约默认值」+ 消毒器 7 项单元断言
- **可见性暂停**（借鉴遮挡暂停）：页面隐藏时冻结全部动画、挂起 AudioContext、停跑休眠计时；恢复时重置空闲计时
- **心情预置**（借鉴预设全快照，简化版）：专注 / 禅域 / 派对 / 夜猫 四个一键快照，经单个 config/set 原子落盘
- **首启提示**：首次启用时弹出一次性 toast（提示只发一次，状态入设置）
- **两级守卫验证**（ADR-0004）：`pnpm verify` 硬档（构建新鲜度 + 契约 + 双端冒烟，挡 PR）；`pnpm verify:soft` 软档（发布面 / i18n / CHANGELOG，只出声）
- **CI**：`.github/workflows/verify.yml`（push/PR 跑 build + verify + lint）
- 工程件：`.editorconfig`、`eslint.config.mjs`（plain-JS 工具面）、`prepack` 构建钩子
- 测试规模：host 25→34 项，browser 25→31 项断言

## 0.1.0 — 2026-10-17

- 首个版本：DSH Web 界面内的邦哥猫桌宠
- 打字 / 鼠标点击 → 猫爪交替敲击，待机呼吸、眨眼、摇尾
- 8 款内置 SVG 皮肤（经典白、午夜黑、橘猫、云朵灰、暹罗、礼服、三花、樱花）
- 自定义图片皮肤导入（横向精灵图，帧数可配 2–12）
- 自动扫描本机 Bongo Cat Steam 安装目录与创意工坊（app 1337970），一键导入皮肤
- WebAudio 合成敲击音效 + 自定义 .wav 导入
- 敲击计数器（会话计数 + host 持久化总数）
- 可拖拽悬浮定位、四角双击切换、大小 / 速度 / 音量 / 边距可调
- 彩蛋：连续快打狂暴模式、待机打瞌睡、点猫摸头、深夜犯困
- 设置面板接入 DSH Settings，支持中英文
