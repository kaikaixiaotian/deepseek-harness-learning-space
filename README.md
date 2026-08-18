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

需要先装好三样：**Node.js ≥ 20**、**pnpm**、**git**（dsh CLI 会随仓库脚本自动用到，未安装时按提示装一下即可）。

> 仓库地址里的 `<OWNER>` 请替换成你自己的 GitHub 用户名（仓库建好后）。

### 方式一：克隆 + 一键安装（推荐）

```powershell
git clone https://github.com/<OWNER>/dsh-learning-space "$env:USERPROFILE\dsh-learning-space"
cd "$env:USERPROFILE\dsh-learning-space"
powershell -ExecutionPolicy Bypass -File install.ps1
```

脚本会完成全部三步：安装学习模式、构建两个插件包、注册到你的 DSH 配置里。**重复运行不会重复安装**，以后升级也直接重跑它。

装完**重启 dsh web**，新开会话就能在模式选择器看到「学习模式」。

### 方式二：免克隆，直接装

不想克隆整个仓库？两条命令直接装插件：

```powershell
dsh plugin --profile web add "github:<OWNER>/dsh-learning-space#path:packages/dsh-learning"
dsh plugin --profile web add "github:<OWNER>/dsh-learning-space#path:packages/dsh-client-ui-learning"
```

第一次装的时候 pnpm 会要求你确认允许这两个包在安装时执行构建脚本——把下面两行加到 `%USERPROFILE%\.dsh\profiles\web\pnpm-workspace.yaml`（没有就新建）后重试即可：

```yaml
allowBuilds:
  dsh-learning: true
  dsh-client-ui-learning: true
```

学习模式不随这条命令安装，需要手动拷贝（一条命令）：

```powershell
Copy-Item "$env:USERPROFILE\dsh-learning-space\preset\*" "$HOME\.dsh\.agent-presets\learning" -Recurse -Force
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

```powershell
# 升级：更新代码后重跑安装脚本
git -C "$env:USERPROFILE\dsh-learning-space" pull --ff-only
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\dsh-learning-space\install.ps1"

# 卸载：两条命令 + 删掉学习模式目录
dsh plugin --profile web remove dsh-learning
dsh plugin --profile web remove dsh-client-ui-learning
Remove-Item -Recurse -Force "$HOME\.dsh\.agent-presets\learning"
```

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
