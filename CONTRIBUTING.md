# 协同开发强规则

## 0. 禁止不读

任何人或 AI agent 在修改本项目代码、文档、数据库、部署配置之前，禁止跳过本文件。

禁止在没有阅读本文件的情况下：

- 直接修改代码。
- 直接 commit。
- 直接 push。
- 直接 merge。
- 修改数据库 migration。
- 修改 `.env.example`、部署配置、GitHub Actions、Vercel、Supabase 相关配置。
- 处理真实截图、真实客户数据、API key、数据库连接串。

如果你是大模型或自动化 agent，开始工作前必须先在回复或执行记录里明确写出：

```text
我已阅读 CONTRIBUTING.md，并会遵守本项目协同规则。
```

没有这句话，就视为没有进入本项目协作流程。

## 1. 当前协作状态

截至 2026-06-10，当前 `main` 已经包含另一位协作者提交到远端的 18 个 commit。

这 18 个 commit 已经进入 `main`，不是待合并状态，不需要再 merge 一次。

这些 commit 的主题大致是：

- Mac mini 自托管部署文档、备份脚本、Docker/env 配置。
- 截图录入后的自动 AI 提取。
- Review 页面自动刷新和错误提示。
- 全应用 UI redesign mockup 和反馈文档。
- Review 页面 decision cards 和移动端 focus mode。
- App shell、手机底部导航、首页 today list。
- 客户列表、客户详情、任务页、周报页的移动端优化。
- Weekly 页面横向滚动修复。

当前推荐状态是：

```text
main 是唯一可信主线。
所有新开发从最新 main 拉分支。
所有功能通过 PR 合并回 main。
```

## 2. PR 是什么

PR 是 Pull Request。

在本项目里，PR 的意思是：

```text
把一个分支上的改动申请合并到 main。
```

PR 不是“多余流程”。

PR 是本项目的安全检查点，用来确认：

- 改了哪些文件。
- 为什么改。
- 有没有测试。
- 有没有泄露 secret。
- 有没有改产品边界。
- 有没有破坏现有功能。
- Chao 是否接受这次改动。

## 3. main 分支规则

`main` 是稳定主线。

禁止直接 push 到 `main`。

禁止直接在 `main` 上开发新功能。

禁止 force push 到 `main`。

禁止 reset 远端 `main`。

禁止为了“整理历史”改写已经 push 的公共提交。

如果已经不小心直接 commit 到 `main`，不要继续 push。先停下来，执行：

```bash
git status -sb
git log --oneline -5
```

然后把结果发给 Chao 或当前项目负责人。

## 4. 管理员绕过规则

GitHub 当前分支保护允许 Administrator 绕过部分限制。

这是一条应急通道，不是日常开发方式。

本项目规则是：

```text
Chao 作为 Administrator 技术上可以绕过 PR。
普通协作者不能绕过 PR。
其他 AI agent 不能绕过 PR。
日常开发默认不绕过 PR。
```

允许 Chao 绕过的典型场景：

- 修正文档错别字或链接，且不影响代码。
- 紧急修复明显阻断开发的小配置。
- 需要先救回仓库状态，再补 PR 说明。

不建议 Chao 绕过的场景：

- 新功能。
- 数据库 migration。
- 登录、权限、客户数据、AI 提取、任务生成等业务规则。
- 部署配置、GitHub Actions、Vercel、Supabase、Cloudflare 配置。
- 任何涉及 secret 或真实数据的改动。

如果 Chao 使用管理员权限绕过 PR，事后必须补一句说明：

```text
这次由 Administrator 直接合入，原因是：<具体原因>。
验证结果是：<命令和结果>。
```

禁止普通协作者或 AI agent 说“因为 Chao 可以绕过，所以我也可以绕过”。

## 5. Git 基础术语

这些词必须按本节理解，避免协作时各说各话。

`repository / repo`：

```text
整个 Git 项目仓库。
```

本项目远端 repo 是：

```text
https://github.com/Palebluedot-ai/apexpulse-crm
```

`working tree / worktree`：

```text
你电脑上当前看到和正在编辑的项目文件夹。
```

在本项目里，当前 working tree 通常是你的本机项目文件夹，例如：

```text
/Users/chao/Projects/apexpulse-crm
```

注意：

```text
本机文件夹名可以和 GitHub repo 名不同。
这不会影响 GitHub repo。
```

Git 里还有一个高级命令叫 `git worktree`，可以让同一个 repo 同时开多个本地文件夹并行开发。

本项目第一阶段不要求使用 `git worktree`。

如果没有明确说“创建额外 worktree”，这里的 `working tree` 只表示当前项目文件夹。

`branch`：

```text
一条独立开发线。
```

`main` 是稳定主线。

新功能应该开自己的 branch，例如：

```text
codex/review-card-polish
codex/mobile-capture-upload
```

`checkout / switch`：

```text
切换到另一个 branch，或者创建并切换到新 branch。
```

旧写法：

```bash
git checkout main
git checkout -b codex/short-task-name
```

新写法：

```bash
git switch main
git switch -c codex/short-task-name
```

本项目更推荐 `git switch`，因为它语义更清楚。

`commit`：

```text
把当前改动保存成一个 Git 版本点。
```

一个 commit 应该只做一件事。

`push`：

```text
把本地 commit 上传到 GitHub。
```

`pull`：

```text
从 GitHub 拉取别人已经上传的最新改动。
```

`merge`：

```text
把一个 branch 的改动合并到另一个 branch。
```

本项目默认通过 GitHub PR merge 到 `main`。

`rebase`：

```text
把自己的 commit 重新放到最新 main 后面。
```

`rebase` 可以让历史更干净，但如果你不确定，不要自己乱用。

遇到 rebase 冲突时先停下来。

`PR / Pull Request`：

```text
把一个 branch 申请合并进 main 的审阅单。
```

PR 是本项目默认合并方式。

## 6. Branch 和 review 边界

一个 feature branch 内部不需要每个 commit 都 review。

本项目真正需要 review 的边界是：

```text
从 feature branch merge 到 main。
```

允许在同一个 feature branch 内部做：

- 多次 commit。
- 多次 push。
- 修测试。
- 改文案。
- 按 review 意见继续补 commit。
- 用 AI agent 连续推进同一个明确任务。

不允许把 feature branch 当成长期垃圾桶。

如果一个 branch 已经混入多个无关目标，必须拆开。

判断一个 branch 是否合理，用这个标准：

```text
这个 branch 合并后，main 是否获得一个可以解释、可以验证、可以回滚的完整变化？
```

如果答案是 yes，这个 branch 大概率合理。

如果答案是 no，说明 branch 太碎、太乱，或者范围太大。

## 7. 产品功能如何拆 branch

产品功能 branch 不是按“我改了哪个文件”来拆。

产品功能 branch 应该按“一个可验收的用户价值闭环”来拆。

推荐拆法：

```text
一条 branch = 一个明确目标 + 一个可验证结果。
```

好的 branch 例子：

```text
codex/capture-image-upload
codex/review-customer-binding
codex/customer-latest-card
codex/tasks-urgency-groups
codex/weekly-report-summary
codex/login-session-hardening
```

这些 branch 都有清楚边界：

- `capture-image-upload`：只解决图片上传和保存。
- `review-customer-binding`：只解决待确认记录绑定客户。
- `customer-latest-card`：只解决客户详情第一屏最新沟通卡片。
- `tasks-urgency-groups`：只解决任务分组和展示。
- `weekly-report-summary`：只解决周报统计和摘要。
- `login-session-hardening`：只解决登录 session 更稳。

不好的 branch 例子：

```text
codex/fix-everything
codex/m1-work
codex/ui-and-backend-and-auth
codex/random-polish
codex/chao-feedback
```

这些名字的问题是：

- 看不出完成标准。
- review 时不知道重点。
- 出问题时不好 revert。
- 容易把多个产品目标混在一起。

如果一个功能很大，先拆成多个连续 branch。

例如“真实手机端端到端使用”不要一个 branch 做完，可以拆成：

```text
codex/mobile-upload-stability
codex/vision-result-review-fields
codex/customer-detail-mobile-first-screen
codex/task-complete-mobile-flow
codex/weekly-report-mobile-readability
```

每个 branch 都应该能单独回答：

```text
这次用户能多做什么？
怎么验证它真的能做？
如果出问题，能不能单独 revert？
```

## 8. 标准开发流程

每次开始工作前，先确认本地干净，并拉最新代码：

```bash
git status -sb
git pull --ff-only
```

如果 `git pull --ff-only` 失败，禁止手动乱 merge，禁止 reset，禁止 force push。

失败时先停下来，把完整输出贴出来。

新任务必须从最新 `main` 开分支：

```bash
git switch main
git pull --ff-only
git switch -c codex/short-task-name
```

分支命名用简短英文：

```text
codex/review-card-polish
codex/mobile-capture-upload
codex/weekly-report-fix
codex/supabase-storage-vision
```

改完后本地验证：

```bash
pnpm check
```

如果改到部署、Next.js route、server/client 边界、环境变量、数据库连接，还要运行：

```bash
pnpm build
```

验证通过后提交：

```bash
git add <changed-files>
git commit -m "feat: short description"
git push -u origin codex/short-task-name
```

然后在 GitHub 创建 PR。

## 9. PR 合并规则

每个 PR 必须说明：

- 这次解决什么问题。
- 改了哪些核心文件。
- 怎么验证。
- 有没有产品边界变化。
- 有没有数据库、部署、secret、真实数据风险。

推荐 PR 描述模板：

```text
## 目的

## 改动

## 验证

## 风险

## 是否涉及产品边界

## 是否涉及真实数据或 secret
```

合并前必须至少满足：

- `pnpm check` 通过。
- 如果涉及部署或 Next.js 边界，`pnpm build` 通过。
- 没有 `.env.local`、真实截图、真实客户数据、API key、数据库连接串。
- 没有未经确认的产品边界变化。
- Chao 或指定 reviewer 看过。

推荐合并方式：

```text
Squash and merge
```

原因是第一次协作阶段，squash 可以让 `main` 历史更干净，一个 PR 对应一个主线 commit。

如果 PR 里每个 commit 都很干净，也可以使用普通 merge commit。

禁止为了好看历史而 force push `main`。

## 10. 如何一个一个看 commit

看最近提交：

```bash
git log --oneline -24
```

看某个 commit 改了哪些文件：

```bash
git show --stat <commit-sha>
```

只看文件名：

```bash
git show --name-only <commit-sha>
```

看完整 diff：

```bash
git show <commit-sha>
```

看两个点之间的所有提交：

```bash
git log --oneline --reverse <old-sha>..<new-sha>
```

如果 commit message 里有 `(#16)`，一般表示它来自 GitHub PR #16。

可以在 GitHub 打开：

```text
https://github.com/Palebluedot-ai/apexpulse-crm/pull/16
```

## 11. 如果发现已合并的代码有问题

禁止使用：

```bash
git reset --hard
git push --force
```

正确做法是：

- 小问题：新开一个 fix 分支，提交修复 PR。
- 大问题：revert 对应 commit 或 PR。
- 不确定：先开 issue 或在聊天中贴出 commit SHA 和问题。

revert 示例：

```bash
git checkout main
git pull --ff-only
git switch -c codex/revert-bad-change
git revert <commit-sha>
pnpm check
git push -u origin codex/revert-bad-change
```

然后创建 PR。

## 12. 禁止提交的内容

禁止提交：

- `.env`
- `.env.local`
- `.env.*.local`
- `data/`
- `data/attachments/`
- 真实微信截图
- 真实客户数据
- API key
- Supabase service role key
- Supabase anon key
- Vercel token
- Cloudflare token
- Postgres connection string
- 任何包含真实 secret 的日志

如果需要新增环境变量，只能改：

```text
.env.example
```

`.env.example` 只能写变量名和示例占位值，不能写真值。

## 13. 数据库和 migration 规则

禁止未经 Chao 确认就做：

- drop table。
- truncate table。
- 删除真实数据。
- 删除 migration。
- 重写已有 migration。
- reset 远端数据库。
- 重建生产或 staging 数据库。

新增 schema 时，优先新增 migration，不要改历史 migration。

如果需要做不可逆数据操作，必须先写清楚：

- 为什么必须做。
- 会影响哪些表。
- 如何备份。
- 如何回滚。
- 是否涉及真实客户数据。

## 14. 产品边界规则

当前产品方向是：

```text
PWA-first personal CRM for Chao's OTC sales follow-up workflow.
```

当前第一用户是 Chao。

当前核心闭环是：

```text
截图或文字录入 -> AI 提取 -> 人工 review -> 客户详情 -> 跟进任务 -> 周报回顾
```

禁止未经 Chao 确认就改成：

- 公司内部合规系统优先。
- 多租户 SaaS 优先。
- 团队权限优先。
- Discord 优先。
- 自动入库优先。
- 公司服务器优先。
- Mac mini 自托管优先。
- 纯后台系统优先。

可以做技术准备，但不能偷偷改变产品主线。

## 15. 测试规则

业务规则必须先写测试。

属于业务规则的例子：

- follow-up status 怎么更新。
- review item 怎么 confirm、edit、skip。
- task 怎么生成、完成、保留。
- AI extraction 结果怎么 normalize。
- 客户 latest summary 怎么刷新。
- 周报统计怎么算。

配置、样式、文案、纯布局不要求机械 TDD，但仍然要跑验证命令。

最低验证：

```bash
pnpm check
```

涉及部署或构建边界：

```bash
pnpm build
```

## 16. 给 AI agent 的硬规则

AI agent 禁止做以下事情：

- 禁止没读本文件就改代码。
- 禁止直接 push 到 `main`。
- 禁止绕过 PR。
- 禁止为了“帮用户省事”改产品边界。
- 禁止把真实 secret 写进回复、日志、commit、文档。
- 禁止用 `git reset --hard`、`git clean -fdx`、`git push --force` 解决协作问题。
- 禁止说“完成”但没有运行验证命令。
- 禁止把失败的验证包装成成功。

AI agent 每次交付时必须说明：

- 改了什么。
- 验证了什么。
- 还有什么风险。
- 是否需要 Chao 决策。

## 17. 管理员建议

Chao 作为管理员，建议在 GitHub 设置：

- 保护 `main` 分支。
- 要求通过 PR 才能合并。
- 禁止 force push。
- 禁止删除 `main`。
- 要求至少 1 个 reviewer。
- 要求 status checks 通过后才能合并。

如果暂时没有 CI，就先人工要求：

```text
PR 合并前必须贴出 pnpm check 结果。
涉及部署的 PR 必须贴出 pnpm build 结果。
```

等项目稳定后，再把这些检查接入 GitHub Actions。
