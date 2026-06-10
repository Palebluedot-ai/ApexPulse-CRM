# M1 本地 Dogfood 指南

## 1. 目的

这份文档帮助 Chao 在本地自己跑通 M1。

它不是开发计划，而是一份操作说明。

目标是让 Chao 可以自己验证：

```text
新增录入 -> 待确认 -> 确认入库 -> 客户详情 -> 任务
```

这份文档是自包含的。读这份文档不需要先读其他文档。

## 2. 当前可以验证什么

当前本地 demo 可以验证：

- 打开首页
- 新增文字备注
- 新增图片证据元数据
- 查看待确认队列
- 编辑待确认字段
- 确认入库
- 跳过待确认记录
- 查看客户列表
- 查看客户详情第一屏
- 查看最新沟通卡片
- 查看客户 open tasks
- 创建任务
- 完成任务
- 恢复任务

当前不验证：

- 真实图片上传
- OCR
- Vision API
- 真实客户数据
- 复杂团队权限
- 云部署

## 3. 启动本地数据库

在项目目录运行：

```bash
cd /Users/chao/Projects/apexpulse-crm
docker compose up -d postgres
```

如果容器已经在运行，命令会显示类似：

```text
Container apexpulse-crm-postgres Running
```

这不是错误。

## 4. 启动本地开发服务

在项目目录运行：

```bash
pnpm dev
```

如果成功，会看到类似：

```text
Local: http://localhost:3000
```

打开浏览器访问：

```text
http://localhost:3000
```

## 5. 端口 3000 被占用怎么办

如果看到：

```text
Port 3000 is in use
```

Next.js 可能会尝试使用 `3001`。

如果又看到：

```text
Another next dev server is already running.
```

说明同一个项目已经有 dev server 在跑。

处理方式：

1. 先打开 `http://localhost:3000` 看是否能访问。
2. 如果不能访问，再看终端提示里的 PID。
3. 如果确认那个 PID 是当前项目的旧 dev server，可以停止它。

示例：

```bash
kill 53218
pnpm dev
```

不要随便 kill 不认识的进程。

如果不确定，先问 Codex。

## 6. 第一条推荐验证路径

### 6.1 打开首页

访问：

```text
http://localhost:3000
```

首页应该看到：

- 新增录入
- 待确认
- 客户列表
- 跟进任务

### 6.2 新增一条文字备注

访问：

```text
http://localhost:3000/capture
```

在“文字备注”里输入：

```text
Dogfood 测试：今天认识一位客户，想下周了解 OTC 出入金流程。
```

点击：

```text
保存为待确认
```

成功后会显示新事件 ID。

### 6.3 去待确认页面

访问：

```text
http://localhost:3000/review
```

应该看到刚才新增的记录。

可以先试：

- 保存修改
- 确认入库
- 跳过

如果只是测试，不想影响客户详情，可以点“跳过”。

如果想验证客户详情刷新，可以选择 demo 客户 `刘总 · Demo Capital`，再点击确认。

### 6.4 查看客户列表

访问：

```text
http://localhost:3000/customers
```

可以验证：

- 客户卡片
- 搜索框
- 状态筛选
- 排序
- 客户详情入口

### 6.5 查看客户详情

进入 demo 客户详情页。

页面应该显示：

- 下一步
- 下次跟进
- 未完成任务
- 最新沟通卡片
- 原始备注
- 原始证据
- Open Tasks

这个页面是当前 CRM 的销售行动页。

重点不是字段多，而是打开后立刻知道下一步该做什么。

### 6.6 创建任务

访问：

```text
http://localhost:3000/tasks
```

在“创建任务”表单中填写：

- 客户：可以选择 `刘总 · Demo Capital`
- 任务类型：跟进
- 任务描述：明天发开户材料清单，并确认预计交易体量
- 截止时间：选一个未来时间

点击：

```text
创建任务
```

创建成功后，任务会出现在右侧列表。

可以继续测试：

- 标记完成
- 恢复任务

## 7. 哪些 demo 数据可以随便改

当前本地数据库里是 demo 数据。

可以随便改：

- demo 客户
- demo 任务
- demo 待确认记录
- demo 事件
- demo 附件元数据

不要放入：

- 真实客户姓名
- 真实聊天截图
- 真实 API key
- 真实公司敏感信息

当前阶段只用假数据跑流程。

## 8. 常用验证命令

完整检查：

```bash
pnpm check
```

生产构建：

```bash
pnpm build
```

本地 seed：

```bash
pnpm db:seed:local
```

数据库 migration：

```bash
pnpm db:migrate:local
```

不要在不确定时重做 migration。

不要 drop table。

不要删数据库 volume。

## 9. 当前最应该观察什么

Dogfood 时重点观察：

- 客户列表是否够快定位人
- 客户详情是否能让你知道下一步做什么
- Review 页面是否适合连续处理多条截图和备注
- 任务页是否足够自然
- 哪些文案看起来怪
- 哪些按钮位置不顺手
- 哪些字段不该出现在第一屏

如果感觉“能跑，但不想用”，这就是重要反馈。

这不是失败，而是下一轮产品迭代最有价值的输入。
