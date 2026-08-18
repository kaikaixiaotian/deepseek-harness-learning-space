# dsh-learning — 学习空间宿主服务

「学习空间」的宿主侧 npm 包：发现学习工作区、列出目录树、读取章节/测验文件内容、读写每章笔记，全部以 Typert Remote 命名空间 `learning` 暴露给浏览器客户端（`dsh-client-ui-learning`）。

## 服务与 Remote 方法

插件注册宿主服务 `ctx.learning`（`LearningService extends TypertRemoteService`，namespace `learning`）。网关以 source-mode 运行时发现 `@Remote` 方法并路由 `/api/learning.<method>`；方法参数名即 wire 字段名（构建产物不可压缩）。

| 方法 | 参数（wire） | 返回 |
|---|---|---|
| `describe` | `sessionId` | `{ workspaces: [{ root, title, locale, dirs }] }`：会话 cwd 下按 naming.md 后缀发现含 meta.json 的工作区 |
| `listDir` | `sessionId, root, path` | `{ path, entries: [{ name, path, kind }] }`：单层目录（目录优先） |
| `readFile` | `sessionId, root, path` | `{ content, truncated }`：UTF-8 文本，2 MB 上限 |
| `readNote` | `sessionId, root, chapterKey` | `{ content }`：不存在返回空串 |
| `writeNote` | `sessionId, root, chapterKey, content` | `{ saved: true }`：懒建 notes 目录 + 原子写 |

## 安全

- 所有文件方法显式接收工作区 `root`，`realpath` 后做前缀包含校验，拒绝 `..` 与符号链接逃逸；
- 笔记路径由白名单 token 组装（目录 token + `chapterKey` 白名单 `[A-Za-z0-9][A-Za-z0-9_-]*`），词法逃逸在构造上不可能；写入前对 notes 目录做 `realpath` 复验，符号链接指向工作区外时拒绝；
- 非活体会话与子代理会话拒绝服务。

## 组合

本包是官方 bundle 包：`package.json` 声明 `dsh.bundle.patch` → 包内 [cordis.patch.yml](../dsh-learning/cordis.patch.yml)：

```yaml
- id: learning
  name: 'dsh-learning'
```

安装/卸载走官方机制（详见[仓库 README](../../README.md)）：

```powershell
dsh plugin --profile web add <本包路径>
dsh plugin --profile web remove dsh-learning
```

## 开发

```sh
pnpm install
pnpm test      # 单测：纯逻辑（发现/分类/包含校验）+ 服务级回归（笔记首存/逃逸拒绝/懒建目录）
pnpm bundle    # tsc → lib/*.js + lib/*.d.ts
```

> 构建用 `tsc` 而非打包器：`@Remote` 是 TC39 标准装饰器，Node 的 V8 无法原生解析，只有 tsc 的发射器会把它降级为 `__esDecorate` 助手（与官方 @deepseek-ai 包产物同形）。`prepare` 脚本自包含，GitHub 源码安装时由 pnpm 自动构建。

## Known Limitations

- 依赖活体会话解析 cwd（冷会话/未挂载会话的 describe 会报错；学习空间 UI 只在活体会话中使用，够用）。
- 不锁写并发：两个标签页同时写同一笔记时最后写入者胜出。
