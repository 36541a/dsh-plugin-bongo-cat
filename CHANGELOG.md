# Changelog

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
