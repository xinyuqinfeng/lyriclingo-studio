# LyricLingo Studio

粘贴英/日/韩歌词，用你自备的 OpenAI 兼容 LLM 生成自然中文翻译与逐词学习卡片
（含日语汉字振假名注音），导出「一句一页」的 PPTX/PDF 学习资料，并通过生词本
与 SM-2 间隔重复复习辅助背词。

- **形态**：Windows 桌面应用（Tauri 2）
- **模型**：用户自备 OpenAI 兼容 Base URL + API Key，应用读取 /models 列表后自由选模型
- **隐私**：歌词与学习数据默认仅存本机；API Key 存系统凭据库，不进数据库/日志/导出文件
- **硬盘**：不部署本地 LLM；仅内置 kuromoji 词典（复习用，约 20MB gzip）

## 环境前置

- Node.js 22+
- Rust（本机使用 GNU 工具链 + MSYS2 MinGW，见下）
- WebView2（Windows 10/11 一般自带）

### Rust 工具链

本机未安装 MSVC Build Tools，使用 rustup 安装的 GNU 工具链：

- RUSTUP_HOME = `D:\Rust\rustup`
- CARGO_HOME = `D:\Rust\cargo`
- MSYS2 MinGW（提供 dlltool）位于 `D:\MSYS2\mingw64`

每次运行 Tauri 命令前执行：

```powershell
. .\scripts\env.ps1
```

> **GNU 工具链注意**：MSYS2 gcc 生成临时汇编文件时使用反斜杠路径，而 mingw64 的
> `as.exe` 无法解析该路径（会报 `can't open ... for reading`）。项目通过
> `.cargo/config.toml` 中的 `CFLAGS=-BD:\Rust\mingw-wrap` 注入一个 `as.exe`
> 路径转换包装脚本（`scripts\env.ps1` 会自动创建）。若换机或换 MSYS2 目录，
> 请同步更新该 wrapper 与 `.cargo/config.toml`。

## 开发

```powershell
. .\scripts\env.ps1
npm install
npm run tauri dev
```

## 构建

```powershell
. .\scripts\env.ps1
npm run tauri build
```

安装包输出到 `src-tauri\target\release\bundle\nsis\LyricLingo Studio_<version>_x64-setup.exe`
（NSIS 安装程序）。可执行文件为 `src-tauri\target\release\lyriclingo-studio.exe`。

## 安装后验收清单

1. 首次启动：主窗口打开，显示「歌曲库」页。
2. 「模型设置」：填写 Base URL / API Key，点击「测试连接并获取模型」，模型下拉出现列表。
3. 导入一首日/英/韩歌词 → 打开详情页 → 运行分析 → 得到逐句翻译与词卡。
4. 「学习工作台」：按词性查看词卡；收藏单词 → 生词本出现该词。
5. 「复习」：收藏的词进入今日队列，可完成一次复习。
6. 「导出学习页」：可预览每句一页排版；可导出 PPTX / 打印为 PDF。
7. 「数据与隐私」：可创建备份、查看统计；数据仅存本机。
8. 关闭并重开应用：歌曲与分析结果仍在（本地持久化）。
9. API Key 不出现在任何导出文件、日志或错误信息中（已脱敏）。

## 测试

```powershell
npm test                     # 前端单元测试（Vitest）
cargo test -p lyriclingo-core # 核心逻辑测试（不依赖 Tauri，可正常链接运行）
```

注意：本机使用 GNU 工具链，Tauri 壳层（webview2）的测试/运行需要先把
`WebView2Loader.dll` 复制到产物目录：

```powershell
. .\scripts\prep-native-dlls.ps1
```

## 隐私与安全

- 歌词会发送至**你自己配置**的模型供应商（Base URL）进行翻译与分析。
- API Key 只保存在本机系统凭据库（Windows Credential Manager），不写入数据库、
  日志、备份或导出文件；所有错误信息经过脱敏处理。
- 应用不运营歌词库，不托管任何人的 API Key；歌曲与学习数据默认仅保存在本机。
- 可在「数据与隐私」页创建本地备份、打开数据目录或清空全部学习数据。

## 目录

```
src/                React 界面
src-tauri/          Rust 后端（SQLite、Provider、分析队列、导出）
docs/               设计文档与实现计划
packages/           contracts / export / review 独立模块
tests/              契约、导出冒烟、端到端测试
```
