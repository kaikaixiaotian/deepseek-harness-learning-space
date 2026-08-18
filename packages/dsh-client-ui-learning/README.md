# dsh-client-ui-learning — 「学习空间 UI」客户端插件

学习空间的浏览器界面，与宿主包 [dsh-learning](../dsh-learning/) 配套：

1. **专属打开卡片**：每轮模型回复后，检查本轮成功写出的文件（复用 deliverables 的产物数据），按路径分类渲染「打开章节」「打开测验」卡片；没有对应产物就不显示对应卡片，两种都没有则完全不显示。
2. **全屏学习空间**（shell.overlay 覆盖层）：点卡片在 DSH 内打开三栏——左栏目录树（基线/章节/测验，可展开）、中栏章节/测验查看器（HTML 用 iframe srcDoc 渲染，保留交互演示与测验表单）、右栏富文本笔记（contenteditable + execCommand，800ms 防抖自动保存到工作区 notes/ 目录，每章一个笔记文件）。

## 包契约

- 双 manifest：`dsh.bundle.patch`（包内 [cordis.patch.yml](../dsh-client-ui-learning/cordis.patch.yml)）+ `dsh.client`（inject 为所依赖的官方 client 包，platform: web）；浏览器 bundle 是 closure-factory 产物（`window.__ModuleLoader__.load`），tsdown 配置已按 harness 共享预设复制。
- 宿主 Remote 贡献手写在 [src/client/remote.ts](src/client/remote.ts)：`learning` namespace 五个方法（describe/listDir/readFile/readNote/writeNote），apply 时 `ctx.remote.$mount(learningContribution)`。
- 与 ui-deliverables 的协作：只做类型级 merge 读取其 `deliverables` 轮次数据（不跨插件值导入，通过 bundle 纯净门）。该插件为**可选**软依赖——web-app bundle 默认自带；缺失时打开卡片静默不显示，学习空间本身不受影响。

## 开发

```sh
pnpm install
pnpm test       # classify/chapterKey 纯逻辑单测
pnpm bundle     # tsdown → lib/index.js + lib/client.js；tsc → lib/types
```

## 安装（与宿主包一起）

官方 bundle 机制（详见[仓库 README](../../README.md)）：

```powershell
dsh plugin --profile web add <本包绝对路径>
dsh plugin --profile web add <dsh-learning 绝对路径>
# 重启 dsh web 生效；卸载用 dsh plugin --profile web remove <包名>
```

## Known Limitations

- 测验表单在 iframe 内提交仍走浏览器下载 answers.json（技能既有上传流程不变）；内嵌回传属于「模板重构」任务。
- 笔记为最后写入者胜出（多标签页同章笔记不锁写）。
- 富文本 v1 用 execCommand（浏览器仍支持，标记为 deprecated），后续可换 TipTap。
