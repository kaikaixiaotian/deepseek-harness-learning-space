# dsh-learning-space —— DSH 学习空间（单仓库 · 三个组成）

把「学习某个技能/领域」变成**可衡量、可追踪、会自适应**的闭环学习体验的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）插件集，一个 GitHub 仓库、三个组成：

| 组成 | 层 | 是什么 | 状态 |
|---|---|---|---|
| [preset/](preset/) | 宿主/模式层 | 「学习模式」agent preset：导师 persona + 学习闭环工具 + 内嵌 learning-loop 技能（目录/文件名按语言自适应，初始化创建 notes/ 笔记目录） | ✅ 可用 |
| [packages/dsh-learning/](packages/dsh-learning/) | 宿主服务 | 学习空间宿主服务：工作区发现/目录树/文件读取/笔记读写，以 Typert Remote `learning` namespace 暴露给浏览器 | ✅ 可用 |
| [packages/dsh-client-ui-learning/](packages/dsh-client-ui-learning/) | 客户端/UI 层 | 专属打开卡片（打开章节/打开测验）+ 全屏三栏学习空间（目录树/章节测验查看/富文本笔记自动保存） | ✅ 可用 |

两个 npm 包均为官方 **bundle 包**（`dsh.bundle` manifest + 包内 `cordis.patch.yml`），通过官方 `dsh plugin` 机制安装/卸载；preset 遵循官方用户预设目录约定（`$DSH_HOME/.agent-presets/`）。

## 前置要求

- [Node.js](https://nodejs.org/) ≥ 20 与 pnpm（`npm i -g pnpm`）
- dsh CLI：`npm i -g @deepseek-ai/dsh`（或 `npx @deepseek-ai/dsh`）
- git（方式 A/B 需要）

## 安装

### 方式 A（推荐）：克隆 + install.ps1 一键安装

```powershell
git clone https://github.com/<OWNER>/dsh-learning-space "$env:USERPROFILE\dsh-learning-space"
cd "$env:USERPROFILE\dsh-learning-space"
powershell -ExecutionPolicy Bypass -File install.ps1
```

脚本幂等，可重复运行（升级时重跑即可）。它会：拷贝 preset → 构建两个 npm 包（`pnpm install` + `pnpm bundle`）→ `dsh plugin --profile web add` 官方登记 → 补齐 `allowBuilds` → 清理旧版 junction 安装残留。装好后**重启 dsh web**（插件集合变化需重启生效），新开会话即可在模式选择器看到「学习模式」。

### 方式 B：免克隆，直接从 GitHub 安装（dsh plugin add github:）

```powershell
dsh plugin --profile web add "github:<OWNER>/dsh-learning-space#path:packages/dsh-learning"
dsh plugin --profile web add "github:<OWNER>/dsh-learning-space#path:packages/dsh-client-ui-learning"
```

GitHub 安装拉取的是**源码**：pnpm 会在安装时运行各包自包含的 `prepare` 脚本完成构建。pnpm ≥ 10 需要先授权构建脚本——把下面的键写入 `$env:DSH_HOME\profiles\web\pnpm-workspace.yaml`（或 `$HOME\.dsh\...`，未设 `DSH_HOME` 时）后重试 add：

```yaml
allowBuilds:
  dsh-learning: true
  dsh-client-ui-learning: true
```

> `#path:` 是 pnpm 的仓库子目录安装语法；若你的 dsh CLI 版本转发该语法有问题，改用方式 A。授权意味着允许该包代码在安装时于你的机器上执行——请只对可信仓库授权，可锁定 commit：`#<sha>`。
>
> preset 不随 `dsh plugin add` 安装，仍需手动拷贝（见 [preset/README.md](preset/README.md)）。

### 方式 C：tarball 安装（免构建授权）

在克隆里（或 CI）打好包再交给用户直装，产物已预构建：

```powershell
cd packages\dsh-learning; pnpm pack
cd ..\dsh-client-ui-learning; pnpm pack
dsh plugin --profile web add ..\dsh-learning\dsh-learning-0.1.0.tgz
dsh plugin --profile web add .\dsh-client-ui-learning-0.1.0.tgz
```

### 验证安装

```powershell
dsh --profile web --dump-config   # 应能看到 learning / ui-learning 两行进入组合
```

## 使用

选「学习模式」后：`/learning-loop`、`/learning-loop <主题>`、`/learning-loop status`、`/learning-loop upgrade` 或直接说「我想学 X」。模型生成章节/测验后，回复尾部出现**「打开章节」「打开测验」卡片**（无对应产物不显示；卡片数据依赖 web-app bundle 自带的 deliverables 轮次数据，缺失时卡片静默不显示），点击在 DSH 内打开全屏学习空间：

- 左栏：基线/章节/测验目录树，点击展开；
- 中栏：章节/测验 HTML 内嵌查看（交互演示、测验表单都可操作）；
- 右栏：每章一个富文本笔记，自动保存到工作区 `notes/`（中文 `笔记/`）。

详细说明见 [preset/README.md](preset/README.md)。

## 升级 / 卸载

```powershell
# 升级：更新克隆后重跑 install.ps1（或：git pull 后重新 dsh plugin add 两个包）
git -C "$env:USERPROFILE\dsh-learning-space" pull --ff-only
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\dsh-learning-space\install.ps1"

# 卸载：官方机制同步移除依赖与组合层
dsh plugin --profile web remove dsh-learning
dsh plugin --profile web remove dsh-client-ui-learning
Remove-Item -Recurse -Force "$HOME\.dsh\.agent-presets\learning"   # preset
```

## 已知限制

- 测验提交仍走「浏览器下载 answers.json → 手动放回工作区」旧流程；srcDoc iframe 场景下 restore-on-load 的相对路径恢复不生效（路线图任务 3 待做，详见 [packages/dsh-client-ui-learning/README.md](packages/dsh-client-ui-learning/README.md)）。
- 笔记为「最后写入者胜出」，无多端合并；富文本基于 `document.execCommand`（已弃用但各浏览器仍可用）。
- 两个包按 dsh `0.1.0-rc.7` / cordis `4.0.1` 的 peer 版本开发；dsh 后续版本升级 peer 范围后需同步验证。

## 路线图

- [x] preset「学习模式」+ learning-loop 技能迁移（DSH 适配 + 名称语言自适应 + 笔记目录）
- [x] 宿主学习空间服务（dsh-learning，Typert Remote）
- [x] 学习空间 UI（专属卡片 + 全屏三栏 + 笔记自动保存）
- [x] 一键安装脚本 install.ps1
- [x] **规范化重构（本次）**：官方 bundle 机制（`dsh.bundle` + `dsh plugin add/remove`）、修复笔记首次保存必败的 P0 bug（realpath ENOENT）、构建管线修复（标准装饰器经 tsc 降级，产物可被 Node 加载）、依赖声明/manifest 合规、preset 字段合规、UI 本地化收尾、GitHub 分发三通道文档
- [ ] **任务 3：重构原章节/测验模板以适配学习空间**（构建完学习空间后进行）：
  - 测验表单提交改为学习空间内回传（postMessage / 直写工作区），不再依赖「下载 answers.json → 手动放回」；
  - 测验恢复（restore-on-load）适配 srcDoc iframe 场景；
  - 章节模板增加学习空间导航与笔记锚点（正文位置 ↔ 笔记联动）；
  - 模板与 meta.json/学习空间状态联动（打开进度、阶段徽标）。
- [ ] TipTap 等更强富文本、笔记导出、目录搜索、学习进度面板。
