# dsh-learning-space —— DSH 学习空间

把「学会一个技能」变成一条能走完的路：测评你现在在哪 → 生成教材和测验 → 过关了学下一章，没过就换个讲法重讲 → 每章还能记笔记。整个过程都在 DeepSeek Harness（DSH）里完成，不碰其他任何配置。

<!-- 截图区（待补充）：建议 3 张 —— 1) 学习模式会话 + 回复中的「打开章节」卡片  2) 学习空间全貌（左目录 / 中章节 / 右笔记三栏）  3) 章节正文 + 笔记编辑 -->

<!-- 图 1：学习模式会话 -->

<!-- 图 2：学习空间三栏 -->

<!-- 图 3：章节查看与笔记 -->

## 这是什么

它由三部分组成，装一次全都有：

- **学习模式**：DSH 会话的一种模式。选上它，助手就变成你的专属导师，会一步步带你学完一个主题。
- **学习空间**：一个全屏界面。左边是目录树，中间看章节/测验（交互演示、测验都能直接玩），右边写笔记（自动保存）。
- **打开卡片**：导师每生成一章内容，回复里就会出现「打开章节」「打开测验」的卡片，点一下就进学习空间。

它的学习流程是闭环的：

- **先测评**：让你做一份基线测评，摸清现在的水平；
- **再生成**：总目录 + 章节教材（HTML，带交互演示）+ 六种题型的测验；
- **硬门槛**：合并正确率 ≥80% 才算过关，没过就**换个讲法重讲**（最多重讲 3 版），不是让你重看；
- **记笔记**：每章一个笔记，自动保存到学习工作区，随时翻；
- **断点续学**：学到一半关了？下次回来接着学，不会从头再来；
- **语言自适应**：你说中文，就生成 `章节/测验/知识库` 这样的中文目录；说英文，就是 `chapters/quizzes/wiki`。

## 安装

需要先装好两样：**Node.js ≥ 20**、**git**（pnpm 和 dsh CLI 安装时如果缺，脚本会提示你怎么装）。

### 方式一：一条命令安装（推荐）

```powershell
powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest 'https://github.com/kaikaixiaotian/deepseek-harness-learning-space/raw/main/install.ps1' -OutFile install.ps1; .\install.ps1"
```

想装特定版本？给脚本加参数：

```powershell
.\install.ps1 -Version 'v0.1.0'   # 装某个发布版本
.\install.ps1 -Version 'main'     # 跟开发分支
```

装完**重启 dsh web**，新开会话就能在模式选择器看到「学习模式」。

### 方式二：克隆到本地再装（开发/升级用）

```powershell
git clone https://github.com/kaikaixiaotian/deepseek-harness-learning-space "$env:USERPROFILE\dsh-learning-space"
cd "$env:USERPROFILE\dsh-learning-space"
powershell -ExecutionPolicy Bypass -File install.ps1
```

脚本会认出自己正在仓库里，直接使用本地代码（不会重复下载）。也可以显式指定：`.\install.ps1 -Source "$env:USERPROFILE\dsh-learning-space"`。

### 方式三：免克隆，只装插件

不想装学习模式、只想要学习空间的界面？两条命令：

```powershell
dsh plugin --profile web add "github:kaikaixiaotian/deepseek-harness-learning-space#path:packages/dsh-learning"
dsh plugin --profile web add "github:kaikaixiaotian/deepseek-harness-learning-space#path:packages/dsh-client-ui-learning"
```

第一次装的时候 pnpm 会要求你确认允许这两个包在安装时执行构建脚本——把下面两行加到 `%USERPROFILE%\.dsh\profiles\web\pnpm-workspace.yaml`（没有就新建）后重试即可：

```yaml
allowBuilds:
  dsh-learning: true
  dsh-client-ui-learning: true
```

### 验证装没装上

```powershell
dsh --profile web --dump-config
```

能看到 `learning` 和 `ui-learning` 两行就说明装好了。

## 使用

1. 新开一个会话，模式选择**学习模式**；
2. 直接说「我想学 React」「带我搞懂 X」，或者用命令：
   - `/learning-loop` —— 有学到一半的课程就续学，没有就问你学什么；
   - `/learning-loop React` —— 跳过提问直接开始；
   - `/learning-loop status` —— 看看所有课程的进度；
3. 导师生成章节后，回复里点**「打开章节」**卡片，进入学习空间：
   - **左栏**：目录树，点开章节/测验；
   - **中栏**：正文 + 交互演示，测验可以在这里直接做；
   - **右栏**：笔记，边看边记，自动保存。

学完一章并过关后，导师会自动写一份「知识库」条目，记录你哪里稳、哪里虚，用它来调整下一章的讲法。

## 升级 / 卸载

### 升级

直接重跑安装命令即可，脚本会先更新源码再重新安装，整个过程幂等：

- **方式一用户**：再执行一次那条「一条命令」就行（脚本自动更新下载的源码）；
- **方式二用户**：先更新克隆，再跑脚本：

```powershell
git -C "$env:USERPROFILE\dsh-learning-space" pull --ff-only
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\dsh-learning-space\install.ps1"
```

升级脚本会用干净的方式重装学习模式（连同技能文件），并强制换代。**升级后重启 dsh web、新开会话**，新的技能内容才会可靠加载。

### 卸载

```powershell
# 1. 移除两个插件（组合配置与依赖一并清理）
dsh plugin --profile web remove dsh-learning
dsh plugin --profile web remove dsh-client-ui-learning

# 2. 删除学习模式
Remove-Item -Recurse -Force "$HOME\.dsh\.agent-presets\learning"

# 3. 可选：清理安装脚本留下的源码
Remove-Item -Recurse -Force "$HOME\.dsh\plugins\dsh-learning-space"   # 方式一留下的源码目录
Remove-Item -Recurse -Force "$env:USERPROFILE\dsh-learning-space"     # 方式二留下的克隆
```

卸载后**重启 dsh web** 生效；想重新装，重跑安装命令即可。

## 已知限制

- **测验提交目前是半自动的**：做完测验会下载一个答案文件，把它放回工作区的测验目录，导师就能批改。一键回传正在开发中（见下方路线图）。
- 笔记是「最后保存的赢」：别开两个页面同时写同一章笔记。
- 笔记编辑器用的是浏览器自带能力（已标记弃用但所有浏览器都支持），后续会换更强的编辑器。

## 路线图

- [x] 学习模式 + 学习闭环（测评 → 教材 → 测验 → 过关/重讲 → 知识库）
- [x] 学习空间三栏界面 + 打开卡片 + 笔记自动保存
- [x] 一键安装脚本 + 官方安装机制适配
- [ ] 测验一键回传：做完直接交卷，不再手动放答案文件（含章节内导航与笔记联动）
- [ ] 更强富文本编辑器、笔记导出、目录搜索、学习进度面板
