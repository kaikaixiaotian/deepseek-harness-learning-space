# 学习模式 preset —— DSH「学习模式」agent 预设（learning-loop）

把一个「学习某个技能/领域」变成**可衡量、可追踪、会自适应**的闭环学习系统的 DSH agent 预设。
这是 [learning-loop](https://github.com/kaikaixiaotian/learning-loop) 的 DSH 迁移版：用户侧、不改 DSH 源码；生成的学习项目**目录名与文件名按你的语言自适应**。

本目录是 [dsh-learning-space](../README.md) 仓库的三个组成之一（preset + 宿主服务包 + 客户端 UI 包），随仓库一起分发。

## 这是什么

- **每个章节都有通过/不通过的硬门槛**（合并正确率 ≥80%）。
- **不会就重构教材**（不是重看，而是换个讲法重讲），最多 v3。
- **每章学完写 wiki**，记录你哪里稳、哪里虚，指导下一章怎么讲。
- **中断可恢复**——靠工作区的 `meta.json` 状态机自动续学。
- **六题型强制齐全**（选择+填空 ≤50%），评分 rubric 写回文件，超纲题不计分。
- **目录/文件名语言自适应**：中文用户生成 `00-基线测评`、`计划`、`章节`、`测验`、`知识库`；英文用户生成 `00-baseline`、`plan`、`chapters`、`quizzes`、`wiki`。

## 安装

preset 采用 DSH 官方的用户预设目录约定：`<DSH_HOME>/.agent-presets/<id>`（`DSH_HOME` 未设置时默认 `~/.dsh`）。把本目录（`preset/`）的内容拷贝为 `learning/`：

**Windows (PowerShell)**
```powershell
git clone https://github.com/<OWNER>/dsh-learning-space "$env:USERPROFILE\dsh-learning-space"
New-Item -ItemType Directory -Force "$HOME\.dsh\.agent-presets\learning" | Out-Null
Copy-Item "$env:USERPROFILE\dsh-learning-space\preset\*" "$HOME\.dsh\.agent-presets\learning" -Recurse -Force
```

**macOS / Linux**
```sh
git clone https://github.com/<OWNER>/dsh-learning-space ~/dsh-learning-space
mkdir -p ~/.dsh/.agent-presets/learning
cp -R ~/dsh-learning-space/preset/. ~/.dsh/.agent-presets/learning/
```

> Windows 一键安装（含两个 npm 插件包的构建与 `dsh plugin add`）：运行仓库根目录的 `install.ps1`，详见[仓库 README](../README.md)。

目录名 `learning` 即预设 id（须匹配 `[a-z0-9][a-z0-9-]*`）。preset 发现是每次读取、无缓存：装好后**下一次新建会话**就会在模式选择器出现「学习模式」（已运行的会话保持原预设，需要新开会话）。

> 本预设内嵌了迁移后的 learning-loop 技能，因此会**自动遮蔽**旧的 `~/.agents/skills/learning-loop`（custom 优先级高于 user-agents）。若你之前装过 ZCode 版，可删除该目录避免混淆（不删也不影响）。

## 使用

1. 新建会话，模式选择「学习模式」。
2. 用自然语言或斜杠命令开始：
   - `/learning-loop` —— 自动判断：当前目录有学习工作区→续学；没有→问你学什么。
   - `/learning-loop React` —— 跳过主题提问，直接以 React 初始化（仍会问目标水平）。
   - `/learning-loop status` —— 只读列出当前目录所有学习工作区的进度，不改文件、不进入学习。
   - `/learning-loop upgrade` —— 升级：拉取最新插件 + 迁移旧工作区（见下）。
   - 或直接说「我想学 X」「带我搞懂 X」。
3. 学习材料（`<主题>-<suffix>/` 工作区）始终建在**当前工作目录**，不污染主目录。

## 目录/文件名语言自适应

初始化时探测你的语言并写入工作区 `meta.json` 的 `locale` 字段（`zh`/`en`），此后所有目录与文件名由 `references/naming.md` 唯一映射推导：

| 逻辑名（en） | 中文（zh） |
|---|---|
| `-learning`（工作区后缀） | `-学习` |
| `00-baseline` | `00-基线测评` |
| `plan` / `chapters` / `quizzes` / `wiki` / `viz` | `计划` / `章节` / `测验` / `知识库` / `演示` |
| `master-plan.html` | `总目录.html` |
| `stage1-ch01-<slug>.html` | `阶段1-章01-<slug>.html` |
| `stage1-ch01-quiz.html` | `阶段1-章01-测验.html` |

铁律：`meta.json` 恒为 `meta.json`（续学锚点）；主题 slug 恒为 ASCII（`react`、`intro`）；`_vN` 版本号与数字不本地化。详见 `skills/learning-loop/references/naming.md`。

## 升级

preset 目录是拷贝安装（非 git 目录），升级 = 更新仓库克隆后重新拷贝，或直接重跑 `install.ps1`（幂等）：

```sh
git -C ~/dsh-learning-space pull --ff-only
cp -R ~/dsh-learning-space/preset/. ~/.dsh/.agent-presets/learning/
```

升级后新开一个会话以加载最新技能。也可以在新会话里输入 `/learning-loop upgrade`（会给旧工作区打 `schema_version` 标记，不改任何已有文件）。

## 目录结构（本目录 = 一个 DSH preset）

```
.
├── preset.yml                  # 模式名/描述（展示元数据，官方 schema 仅这两个字段）
├── agent.cordis.yml            # 组合：导师 persona + 工具 + 技能发现（官方 AGENT-PLANE 语法）
└── skills/
    └── learning-loop/
        ├── SKILL.md            # 主工作流（DSH 适配版）
        └── references/         # 模板/题型/评分/子代理/网络研究/命名表等 11 份
```

## 说明

- 本预设以 shipped 的 `standard` 为蓝本**精简**：不含 plan-mode、compaction、goal、workflow。需要时从 `standard` 的 `agent.cordis.yml` 复制对应行加入本文件即可。
- `tool-web` 的 `fetch: true` 是对 `standard`（`false`）的**有意放宽**：课程研究与阶段总测验需抓取官方文档页。
- 核心学习闭环与评分逻辑来自 learning-loop 原技能，迁移时已把 ZCode 专属物（`/learning-loop` 命令文件、`~/.zcode/commands/`、「Agent tool」、`git pull` 自升级路径、「新开 ZCode 会话」）替换为 DSH 等价物（`/learning-loop` 由技能自动派生、`subagent`/`subagent_fork`、`web_search`、DSH 会话）。
