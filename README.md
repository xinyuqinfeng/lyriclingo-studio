# LyricLingo Studio

粘贴英/日/韩歌词，用你自备的 OpenAI 兼容 LLM 生成自然中文翻译与逐词学习卡片
（含日语汉字振假名注音），导出「一句一页」的 PPTX 学习资料，并通过生词本
与 SM-2 间隔重复复习辅助背词。

- **形态**：Windows 桌面应用（Tauri 2）
- **模型**：用户自备 OpenAI 兼容 Base URL + API Key；支持配置多个供应商，应用读取 /models 列表后自由选模型
- **隐私**：歌词与学习数据默认仅存本机；API Key 存系统凭据库，不进数据库/日志/导出文件
- **硬盘**：不部署本地 LLM

## 下载与运行（Windows 用户）

在 [Releases](https://github.com/xinyuqinfeng/LyricLingo-Studio/releases) 下载，二选一：

- **安装版** `LyricLingo-Studio_<版本>_x64-setup.exe`：双击安装，开始菜单出现应用。安装时若系统缺少 WebView2 Runtime 会自动补装（推荐）。
- **免安装版** `LyricLingo-Studio-免安装版.zip`：解压后双击 `LyricLingo Studio.exe` 直接运行。

**系统要求**：Windows 10 / 11（64 位）。需已安装 **Microsoft Edge WebView2 Runtime**（Windows 11 自带、Windows 10 通常随 Edge 更新自动安装；安装版会帮你自动补装）。

## 功能

- 网易云等混合格式歌词自动识别（原文行 + 中文翻译行配对），中文翻译作为参考传给模型
- 逐句自然中文翻译 + 逐词卡片（词性 / 原型 / 释义 / 活用 / 读音）
- 日语汉字整词平假名注音（工作台、PPTX 导出均可）
- 学习工作台：逐句浏览（方向键翻页）、悬停单词卡高亮歌词对应词、收藏生词
- 生词本 / SM-2 每日复习（按日 / 英 / 韩语言筛选）
- 一句一页 PPTX 导出（可上传背景图、调节透明度）
- 本地备份 / 数据清理 / 密钥脱敏

## 构建环境

- Node.js 22+
- Rust（stable）
- Windows：WebView2（Windows 10/11 一般自带）

标准 MSVC 工具链（Windows 上 `rustup default stable` 默认即 MSVC）即可构建：

```powershell
npm install
npm run tauri dev        # 开发
npm run tauri build      # 打包（NSIS 安装包）
```

> 已在 GitHub Actions 中验证 Windows（MSVC）构建，见 `.github/workflows/`.

### Windows GNU 工具链（可选）

本项目的开发机器使用 GNU 工具链 + MSYS2 MinGW（未装 MSVC Build Tools）。若你也用 GNU 工具链，需要处理两个已知问题：

1. MSYS2 gcc 生成的临时汇编文件用反斜杠路径，mingw64 的 `as.exe` 无法解析。项目通过 `.cargo/config.toml` 注入一个 `as.exe` 路径转换包装（见 `scripts/`），需按本机路径调整。
2. 构建后运行 `scripts/prep-native-dlls.ps1` 复制 `WebView2Loader.dll` 到产物目录，测试/运行才可加载 webview2。

## 使用

1. 启动应用 → 首次弹出「配置模型」。
2. 在「模型设置」添加供应商：填写名称、Base URL、API Key，点「测试连接并获取模型」，选择模型后保存。可添加多个供应商下拉切换。
3. 「歌曲库」→ 导入歌曲：粘贴歌词（支持纯原文或网易云等原文+翻译混合格式）。
4. 导入后自动分析 → 逐句翻译与词卡。
5. 「学习工作台」查看逐句翻译 / 注音 / 单词卡，收藏生词。
6. 「生词本」与「复习」按语言筛选学习。
7. 「导出学习页」→ 导出 PPTX（一句一页，可加背景图）。

## 测试

```powershell
npm test                    # 前端单元测试（Vitest）
cargo test -p lyriclingo-core  # 核心逻辑测试（不依赖 Tauri）
```

## 隐私与安全

- 歌词会发送至**你自己配置**的模型供应商（Base URL）进行翻译与分析。
- API Key 只保存在本机系统凭据库（Windows Credential Manager），不写入数据库、日志、备份或导出文件；错误信息经过脱敏处理。
- 应用不运营歌词库，不托管任何人的 API Key；歌曲与学习数据默认仅保存在本机。

## 目录

```
src/                React 界面
src-tauri/          Rust 后端（SQLite、Provider、分析队列、导出）
src-tauri/core/     纯逻辑 crate（领域模型、数据库、分析，可独立测试）
docs/               设计文档
packages/           contracts / export 独立模块
tests/              契约、导出冒烟、端到端测试
```
