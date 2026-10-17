# Changelog

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
