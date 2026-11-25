# koji

Windows 专注计时应用，使用 **Tauri 2 + Vue 3 + Vite + JavaScript**。前端采用 Composition API 和 `<script setup>`，由 Vue 单文件组件组织界面。

## 先认识项目用到的技术

可以把 koji 理解为“网页界面 + Windows 桌面窗口”。

| 技术 / 工具        | 在本项目中的作用                                                                     |
| ------------------ | ------------------------------------------------------------------------------------ |
| Vue 3 + JavaScript | 使用单文件组件、Composition API 和 `<script setup>` 管理界面、状态与事件             |
| Vite               | 前端开发服务器与构建工具，负责开发时刷新页面、构建时生成 `dist/`                     |
| Tauri 2            | 把前端界面放进桌面窗口，并提供置顶、调整尺寸、移动窗口等系统能力                     |
| WebView2           | Windows 上用于显示前端页面的系统 WebView 运行时                                      |
| Rust               | Tauri 桌面程序所用的编译型语言；当前 Rust 代码主要负责启动 Tauri，尚无自定义业务命令 |
| Cargo              | Rust 的依赖管理与构建工具，类似前端的 npm；Tauri CLI 会调用它编译桌面程序            |
| rustup             | 安装和管理 Rust 工具链，包括 `rustc` 编译器与 Cargo                                  |

前端不使用 Router、Pinia 或组件库。应用只有一个页面，由根组件创建共享状态，子组件通过 props 接收数据、通过事件通知操作。

当前调用关系：

```text
index.html → src/main.js（挂载 Vue）→ src/App.vue（共享状态与组件编排）
  ├─ components/（标题栏、计时面板、记录列表、弹窗）
  ├─ composables/useTimer.js → timer.js（计时状态机）
  ├─ composables/usePersistence.js → storage.js → localStorage
  └─ composables/useWindow.js → @tauri-apps/api/window（窗口操作）
       ↓ Tauri IPC：前端与原生程序之间的通信
     Tauri / Rust 原生层
       ↓
     Windows 窗口
```

修改页面时，先看 `.vue` 文件：`<script setup>` 中编写 JavaScript 状态和事件方法，`<template>` 中用 Vue 模板绑定数据与交互。`composables/` 存放组合式函数，将计时、持久化和窗口操作从界面中拆出；`timer.js` 保持为不依赖 Vue 的计时核心。只有需要新增前端 API 无法直接完成的原生能力时，再学习 Rust，并考虑增加 Tauri command。

## 目录结构

```text
koji/
├─ README.md                       # 项目说明与本指南
├─ index.html                      # 前端 HTML 入口，加载 src/main.js
├─ package.json                    # npm 依赖与开发命令
├─ package-lock.json               # npm 依赖锁文件，安装时使用 npm ci
├─ .gitignore                      # 排除依赖、构建产物等文件
├─ vite.config.js                  # Vue 单文件组件插件与开发服务器配置
├─ eslint.config.js                # Vue 脚本解析与函数 / 类成员空行规则
├─ .prettierrc.json                 # Prettier 格式规则
├─ .prettierignore                  # 不参与格式化的文件
├─ .vscode/                        # 保存自动格式化配置与推荐扩展
├─ src/                            # 前端源代码
│  ├─ main.js                      # 导入全局样式并挂载 Vue 根组件
│  ├─ App.vue                      # 创建共享状态、协调组件事件和弹窗流程
│  ├─ components/
│  │  ├─ TitleBar.vue              # 标题栏、置顶、视图切换与窗口操作按钮
│  │  ├─ TimerPanel.vue            # 倒计时、时长输入与开始 / 暂停 / 中止操作
│  │  ├─ RecordList.vue            # 记录排序分组、详情和删除入口
│  │  └─ AppDialog.vue             # 填写记录、详情、删除确认和设置弹窗
│  ├─ composables/
│  │  ├─ useTimer.js               # 连接计时核心与 Vue 响应式状态，管理刷新周期
│  │  ├─ usePersistence.js         # 管理记录和设置，写入成功后更新响应式数据
│  │  └─ useWindow.js              # 原生窗口初始化、尺寸、位置、置顶和拖动
│  ├─ style.css                    # 正常视图、小视图及弹窗样式
│  ├─ format.js                    # 记录时间、持续时长和元信息格式化
│  ├─ storage.js                   # 旧数据读取、默认设置、写入与记录保护规则
│  ├─ storage.test.js              # 持久化成功 / 失败、数据兼容与记录边界测试
│  ├─ timer.js                     # 计时状态机、有效专注时间与时间格式化
│  └─ timer.test.js                # 使用 Node.js 内置测试工具验证计时逻辑
├─ src-tauri/                      # Rust / Tauri 桌面端工程
│  ├─ Cargo.toml                   # Rust 包信息与依赖声明
│  ├─ Cargo.lock                   # Rust 依赖锁文件
│  ├─ build.rs                     # 编译时执行的 Tauri 构建脚本
│  ├─ tauri.conf.json              # 窗口、前端地址、构建命令与安全策略配置
│  ├─ src/main.rs                  # Rust 程序入口，创建并运行 Tauri 应用
│  ├─ capabilities/default.json    # 允许主窗口使用哪些原生 API
│  ├─ icons/icon.ico               # Windows 应用图标
│  ├─ gen/schemas/                 # Tauri 自动生成的配置 / 权限 schema
│  └─ target/                      # Rust 编译产物与缓存，自动生成
├─ scripts/
│  ├─ tauri.mjs                    # 启动 Tauri，自动补充本次运行需要的 Cargo 路径
│  └─ create-icon.mjs              # 生成当前 Windows 图标的脚本
├─ docs/
│  ├─ 需求详细文档.md              # 功能需求与阶段划分
│  ├─ koji原型图.html              # 界面原型，可直接用浏览器打开
│  └─ 实施验证记录.md              # 各阶段电脑实测结果与未测边界
├─ node_modules/                   # npm 安装的依赖，自动生成
└─ dist/                           # 前端生产构建产物，自动生成
```

日常修改集中在 `src/`。不要直接修改 `node_modules/`、`dist/`、`src-tauri/target/` 和 `src-tauri/gen/schemas/`：重新安装或构建可能覆盖这些内容。两个依赖锁文件应保留，以便其他环境安装相同版本。

## 项目快速入门（Windows）

### 1. 安装开发环境（首次使用）

只预览网页界面需要 Node.js；运行完整桌面应用还需要 Rust 和 Windows 原生构建环境。

1. 安装 [Node.js](https://nodejs.org/)。本项目建议使用 **22.12 或更高版本的 Node.js 22**；当前 Vite 的最低版本要求见其 `package.json` 中的 `engines.node`。
2. 安装 Microsoft Visual Studio Build Tools，在安装器中勾选 **“使用 C++ 的桌面开发”（Desktop development with C++）**，包含 MSVC 编译工具和 Windows SDK。它负责把 Rust 代码链接为 Windows 可执行程序。
3. 按 [Rust 官方安装说明](https://www.rust-lang.org/tools/install/)安装 rustup，选择 stable 工具链和 `x86_64-pc-windows-msvc` 目标。本项目使用 MSVC 工具链。
4. 确认系统安装了 Microsoft Edge WebView2 Runtime；完整说明及下载入口见 [Tauri Windows 开发环境文档](https://v2.tauri.app/start/prerequisites/#windows)。
5. 安装完后重新打开终端，让 PATH 环境变量生效。

本次实现时已在当前电脑补装 Rust，并使用已有的 C++ Build Tools 成功构建。换一台电脑仍需准备上述环境。

在 PowerShell 中检查：

```powershell
node --version
npm --version
rustup show active-toolchain
rustc --version
cargo --version
```

项目的 `npm run tauri ...` 启动脚本会在 PATH 中找不到 Cargo 时，自动查找 `CARGO_HOME/bin`（未设置时使用当前用户的 `.cargo/bin`），并只为本次 Tauri 进程及其子进程补充 PATH。因此，通过 rustup 默认安装 Rust 后，即使旧终端没有更新 PATH，也可以直接运行 `npm run tauri dev`。

若要在终端中直接执行 `cargo` / `rustc`，可先在当前 PowerShell 会话补充 PATH：

```powershell
$env:PATH = "${env:USERPROFILE}/.cargo/bin;$env:PATH"
```

这只影响当前终端及其启动的子进程，不会永久修改系统设置。

如果出现 `cargo metadata ... program not found`，表示 Tauri 启动时无法找到 Cargo，并非应用代码编译错误。请确认已使用本项目最新的 `package.json` 和 `scripts/tauri.mjs`；若 Rust 装在自定义位置，请将 `CARGO_HOME` 设置为包含 `bin` 目录的 Cargo 主目录，或把工具所在的 `bin` 目录加入 PATH。

### 2. 进入目录并安装前端依赖

以下命令均在项目根目录执行。本机示例路径为 `E:\Code\koji`，其他电脑请换成实际路径。

```powershell
Set-Location E:\Code\koji
npm ci
```

`npm ci` 根据 `package-lock.json` 安装前端依赖。Rust 依赖由 Cargo 在首次运行桌面开发或构建命令时自动下载，不需要逐个安装。

### 3. 启动完整桌面应用（推荐）

```powershell
npm run tauri dev
```

这条命令会依次启动 Vite 开发服务器、编译 Rust 程序并打开 koji 桌面窗口。首次执行需要下载依赖和编译，耗时通常比后续启动长。终端持续运行是正常现象，按 `Ctrl+C` 结束开发进程。

开发配置位于 `src-tauri/tauri.conf.json`：`beforeDevCommand` 自动执行 `npm run dev`，`devUrl` 指向 `http://127.0.0.1:5173`。运行此命令前，请先停止单独启动的 Vite，避免端口被占用。

`vite.config.js` 使用 `@vitejs/plugin-vue` 编译 `.vue` 文件，并启用 `strictPort`：端口被占用时直接报错，不会自动换端口导致 Tauri 连接到错误的开发服务。

### 4. 只看界面时，使用浏览器预览

```powershell
npm run dev
```

打开终端显示的地址（默认 `http://127.0.0.1:5173/`）。可以调试计时、记录、设置和页面布局；置顶、拖动原生窗口、窗口尺寸及位置恢复需要在 Tauri 桌面程序中验证。浏览器模式下置顶按钮禁用，原生关闭和最小化按钮隐藏。

### 5. 做一次小修改，了解开发流程

1. 打开 `src/style.css`，修改按钮颜色或间距，保存后观察页面更新。
2. 打开 `src/components/TimerPanel.vue`，查找“准备好，开始专注”，修改模板中的提示文案并保存。
3. 学习计时逻辑时，先读 `src/timer.js`，再看 `src/timer.test.js` 中暂停、继续和完成的例子。
4. 涉及窗口操作的修改，用 `npm run tauri dev` 实测；切换视图后检查剩余时间、暂停状态、窗口尺寸和置顶是否正确。

前端修改由 Vite 和 Vue 插件进行热更新；修改模板可能保留状态，但修改组件脚本、组合式函数或完整刷新页面可能重新创建计时状态，因此请勿依赖开发热更新保留正在运行的会话。记录与设置会从本地存储恢复。计时组合式函数在卸载时清理刷新定时器，窗口组合式函数清理窗口位置订阅及拖动状态。修改 Rust 源码通常会触发 Tauri 重新编译和重启。

### 6. 运行检查

```powershell
# 计时与持久化单元测试
npm test

# 检查前端是否能构建
npm run build

# 检查 ESLint 空行规则和 Prettier 格式
npm run format:check
```

`npm test` 当前覆盖 7 项测试：3 项计时核心测试，4 项旧数据兼容、写入失败回退、记录生成边界及损坏数据保护测试。`npm run lint` 可单独检查 ESLint 规则，`npm run format` 可自动修复空行并格式化代码。构建和单元测试不能替代真实窗口操作；原 M1～M3 的电脑验收记录见 [实施验证记录](docs/实施验证记录.md)。

### 7. 生成可执行文件

```powershell
# 调试版桌面程序，适合开发验证
npm run tauri build -- --debug --no-bundle

# 发布版桌面程序，适合后续性能和交付验证
npm run tauri build -- --no-bundle
```

| 命令                                         | 产物                                |
| -------------------------------------------- | ----------------------------------- |
| `npm run build`                              | `dist/`，只有前端网页资源           |
| `npm run tauri build -- --debug --no-bundle` | `src-tauri/target/debug/koji.exe`   |
| `npm run tauri build -- --no-bundle`         | `src-tauri/target/release/koji.exe` |

Tauri 构建会自动先执行 `npm run build`，再把前端资源编入桌面程序。构建前请关闭已运行的 `koji.exe`，否则 Windows 可能因文件被占用而报“拒绝访问”。调试版可能伴随控制台窗口；当前 Rust 入口为发布版配置了隐藏控制台。

原 JavaScript 版本已验证 **debug 构建**；Vue 重构版已通过前端构建，最终 Tauri 构建与完整桌面回归验收仍待完成。`bundle.active` 为 `false`，本阶段不生成 MSI / NSIS 安装包；安装包属于 M4。

## 按需求找到修改位置

| 想修改的内容                          | 优先查看                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| 计时规则、暂停时长计算、时间格式      | `src/timer.js`、`src/composables/useTimer.js`，并更新 `src/timer.test.js`    |
| 记录生成、500 字限制、弹窗流程        | `src/App.vue`、`src/components/AppDialog.vue`、`src/storage.js`              |
| 页面颜色、布局、迷你视图和弹窗        | `src/style.css` 及 `src/components/` 中对应组件的模板                        |
| 记录排序分组和详情入口                | `src/components/RecordList.vue`、`src/format.js`                             |
| 设置与记录的本地持久化                | `src/composables/usePersistence.js`、`src/storage.js`、`src/storage.test.js` |
| Vue 挂载、组件编排、开发服务器配置    | `src/main.js`、`src/App.vue`、`vite.config.js`                               |
| 双视图切换、置顶、位置记忆、指针拖动  | `src/composables/useWindow.js`、`src/components/TitleBar.vue`                |
| 默认窗口配置、开发地址、构建命令、CSP | `src-tauri/tauri.conf.json`                                                  |
| 原生 API 权限                         | `src-tauri/capabilities/default.json`                                        |
| Rust 依赖 / 应用启动                  | `src-tauri/Cargo.toml` / `src-tauri/src/main.rs`                             |

注意：`tauri.conf.json` 的窗口尺寸是创建窗口时的初始配置；应用启动和视图切换时，`useWindow.js` 还会设置实际尺寸。调整大小时需要同时检查这两处。增加原生窗口操作时，也要检查 capability 是否允许对应 API。

## 常见问题

| 现象                               | 排查方法                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 找不到 `cargo`                     | 确认 rustup 已安装，重开终端或按上文补充当前会话 PATH                                                             |
| 找不到链接器、MSVC 或 Windows SDK  | 检查 Build Tools 的“使用 C++ 的桌面开发”及 SDK 组件                                                               |
| 首次启动长时间停在下载或编译       | 查看终端日志，确认依赖下载网络可用；后续编译可复用 `target/` 缓存                                                 |
| 5173 端口已占用 / 桌面页面连接异常 | 停止之前启动的开发服务器，再运行 `npm run tauri dev`；若更换端口，需要同步调整 Tauri 的 `devUrl` 和 Vite 启动参数 |
| 网页正常，但窗口 API 不可用        | 确认运行的是 Tauri 桌面程序，并检查 capability 权限与界面提示                                                     |
| 改了源代码，直接打开 exe 却没变化  | exe 使用上次构建时的资源，需要重新构建，或改用开发模式                                                            |
| 重新打开后计时回到初始值           | 当前只持久化记录、设置及窗口偏好；退出进程后不会恢复未完成会话                                                    |
| 浏览器里有记录，桌面程序里没有     | 两者使用独立存储空间；不要把网页预览的数据当成桌面数据                                                            |

## VS Code 保存时自动格式化

项目已提供 `.vscode/settings.json`、Prettier 和 ESLint 配置。用 VS Code 打开项目根目录后，在扩展面板安装推荐扩展：

- **Vue - Official**（`Vue.volar`）：Vue 3 单文件组件支持。
- **Prettier - Code formatter**（`esbenp.prettier-vscode`）：统一缩进、引号、换行等格式。
- **ESLint**（`dbaeumer.vscode-eslint`）：自动补齐函数声明、类方法之间的空行，支持 `.js`、`.mjs` 和 `.vue` 的脚本部分。

先运行 `npm ci` 安装项目依赖，然后编辑文件并按 **Ctrl+S**。保存时会执行 ESLint 自动修复和 Prettier 格式化。扩展推荐本身不会自动安装扩展；如果保存没有效果，请确认上述扩展已安装且在当前工作区启用，并查看 VS Code 的“输出 → ESLint / Prettier”日志。

Prettier 通常保留已有空行，但不会主动在每个函数之间插入空行，因此这里额外使用 `@stylistic` 的 ESLint 规则。规则要求函数声明前后、导出声明之间以及类成员之间至少有一个空行；Prettier 会把多余的连续空行收敛为一行。箭头函数变量和对象字面量方法不在这组空行规则的覆盖范围内。

也可以在终端执行：

```powershell
# 自动修复空行并统一格式
npm run format

# 只检查，不修改文件
npm run format:check
```

这些命令覆盖前端代码、项目脚本及相关配置，不会格式化 Rust 编译产物和原型 HTML。

## 阶段状态

已实现 M1 计时、M2 记录与设置、M3 双视图窗口代码。逐阶段电脑验证结果见 `docs/实施验证记录.md`。

前端已迁移为 Vue 3 组件和组合式函数。重构期间已实测计时流程、记录保存 / 放弃 / 详情 / 授权删除、设置与刷新保留、原生视图切换、正常窗口拖动和小窗完成填写框。置顶实际遮挡、重启恢复及生产构建旧数据兼容尚未完成本轮复测，原阶段记录不代表 Vue 重构版已全部验收。

计时核心按单调时钟的实际差值计算，不以 interval 次数累计；单元测试覆盖暂停排除、完成优先、时间格式边界。记录与设置保存在当前用户 WebView 的 `localStorage` 中，沿用键名 `koji` 和 `{ settings, records }` 结构，Vue 迁移无需手动转换数据。写入失败时保留原有记录、设置和弹窗输入，并提示重试。浏览器预览、Tauri 开发模式和生产程序可能使用不同的存储来源；置顶、拖动和位置恢复仅在 Tauri 中生效。

正常视图和小视图使用同一个 WebView，通过调整窗口尺寸切换，共享内存中的计时状态；两种形态分别记忆置顶设置与物理屏幕坐标。小视图填写记录时临时扩大窗口，关闭弹窗后恢复。

M4 的系统托盘、单实例、提示音和安装包不在当前交付范围。关闭窗口会退出应用。
