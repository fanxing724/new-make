# GitHub Cards 🃏

基于 Deno Deploy 的 GitHub Profile 动态 SVG 卡片生成器。

让你的 GitHub 主页 README 动起来！部署后只需在 README 里引用图片链接，卡片内容会自动更新。

## ✨ 功能

- 📊 **统计卡片** — 仓库数、Star 数、近 90 天提交数、Fork 数、关注者等
- 🔤 **编程语言卡片** — 可视化你的代码语言分布（圆环图/条形图）
- ⚡ **活跃度卡片** — 最近事件统计 + 最近 3 条动态
- 📦 **精选仓库卡片** — 双列展示你的仓库列表
- 🎨 **6 种主题** — default、light、dracula、nord、monokai、catppuccin

## 🚀 部署

### 1. Fork 本项目

### 2. 登录 Deno Deploy

访问 [Deno Deploy](https://dash.deno.com/) 并用 GitHub 登录。

### 3. 创建项目

- **New Project** → **Deploy from GitHub repository**
- 选择你 Fork 的仓库
- **Entrypoint** 选择 `deno_index.ts`
- 部署完成后，你的服务地址就是 `https://<项目名>.deno.dev`

### 4.（强烈建议）配置 GITHUB_TOKEN

在项目设置里添加环境变量 `GITHUB_TOKEN`（只需 public 只读权限）。

匿名调用 GitHub API 只有 **60 次/小时** 额度，而语言卡片单次渲染要请求每个仓库的
语言接口，很容易触发限流。配置 Token 后额度提升到 5000 次/小时。

## ☁️ 部署到 Cloudflare Workers（备选）

`handler` 是纯 Web Fetch API，Workers 入口见 `worker.ts`（只做调用形状转换）。

```bash
npm install -g wrangler
wrangler login
wrangler secret put GITHUB_TOKEN   # 可选但强烈建议
wrangler deploy                    # 部署，得到 https://new-make.<子域>.workers.dev
```

配置在 `wrangler.toml`。Workers 免费额度（10 万次/天）比 Deno Deploy 更宽裕。

也可以在 Cloudflare Dashboard 用 **Workers & Pages → Import from GitHub** 绑定本仓库：
读取 `wrangler.toml` 后每次 push 自动部署；`GITHUB_TOKEN` 在
**Settings → Variables and Secrets** 里以 Secret 类型添加。

## 🧩 一份源码，多平台

`cards/` + `deno_index.ts` 是唯一真源，平台差异全部收在薄入口里（只做密钥注入和调用形状转换，不含业务逻辑）：

| 平台 | 入口 | GITHUB_TOKEN 怎么给 |
|------|------|--------------------|
| Deno Deploy | `deno_index.ts`（末尾自带本地启动块） | 项目环境变量 |
| Cloudflare Workers / Pages | `worker.ts` | `wrangler secret put` |
| Node（本机长挂） | `node_server.mjs` | 进程环境变量 |
| EdgeOne Pages | `functions/`（**生成物**） | 控制台变量 |

EdgeOne 产物是内联生成的：`functions/` 能否 import 目录外的文件这个行为还没在线上证实，所以生成的每个路由文件自带全部逻辑、一个 import 都不剩，不依赖那个未知项。

```bash
node tools/build.mjs   # cards/ + deno_index.ts → functions/*.js
node test/all.mjs      # 核心层 + 每条函数路由 + 配置探针，一把过
```

`functions/` 是生成物但**故意入库**：EdgeOne Pages 关联 GitHub 后按"仓库根 = 站点根"找函数目录，放子目录就只能手动传 ZIP。改完源码重跑 `build`，别手改里面的文件。

> 这个目录名和 Cloudflare Pages 撞车（它也认根 `functions/`）。本项目走 CF 是用 `worker.ts` 的 Workers 模式，不受影响；哪天真改用 CF Pages，先把目录挪走。

上线：控制台 → EdgeOne Pages → 新建项目 → 关联本仓库，框架选纯静态、输出目录留空；变量里加 `GITHUB_TOKEN`。然后：

```bash
curl https://你的域名/health    # 看 config.GITHUB_TOKEN 是不是 true
```

`/health` 返回 HTML 或 404 说明 `functions/` 没被识别；返回 JSON 但 `config.GITHUB_TOKEN:false` 说明变量没读到。这条路由是探针，只回布尔和变量名，不泄密钥。

上线后第一件事是验边缘缓存到底听不听函数的 `Cache-Control` —— 这决定你的 GitHub 额度会不会被烧穿：

```bash
curl -sI https://你的域名/stats?username=你的用户名 | grep -iE 'cache-control|age|x-cache'
sleep 5; curl -sI https://你的域名/stats?username=你的用户名 | grep -iE 'cache-control|age|x-cache'
```

两次都拿到 `age` 在涨、或出现 HIT 类头，说明边缘在挡；一直 `age: 0` 就是每次刷新都回源打 GitHub，这时再用 `edgeone.json` 的 header 规则强压一条 `cache-control`。

仓库根**没有也不需要** `edgeone.json`：函数路由靠 `functions/` 目录约定就生效了。那个文件用来配构建命令、redirect/rewrite、以及给响应强制加 header —— 只有实测发现边缘不遵守函数自己的 `Cache-Control` 时，才需要用它补一条。

## 📝 在 README 中使用

### 统计卡片

```markdown
![GitHub 统计](https://github.xingbox.de5.net/stats?username=你的用户名)
```

参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `username` | GitHub 用户名 | fanxing724 |
| `theme` | 主题 | default |
| `hide_rank` | 隐藏排名 | 不传则显示 |
| `show_icons` | 显示图标，传 `true`/`false` | false |

数据口径：提交数来自 GitHub Events 接口，只覆盖**最近 90 天**，卡片上会如实标注；
排名是按 followers / stars / 仓库数估算的分位（“全球前 N%”），仅供娱乐。

### 编程语言卡片

```markdown
![编程语言](https://github.xingbox.de5.net/languages?username=你的用户名&theme=catppuccin&layout=pie)
```

参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `username` | GitHub 用户名 | fanxing724 |
| `theme` | 主题 | default |
| `hide` | 隐藏的语言，逗号分隔，忽略大小写 | 空 |
| `layout` | 布局：`pie` 或 `bar` | pie |

Top 8 之外的语言会归入“其他”，保证百分比合计为 100%。

### 活跃度卡片

```markdown
![最近活跃](https://github.xingbox.de5.net/activity?username=你的用户名&theme=catppuccin)
```

统计基于最近 100 条公开事件（GitHub 事件接口最多保留 90 天）。

### 精选仓库卡片

```markdown
![精选仓库](https://github.xingbox.de5.net/repos?username=你的用户名&theme=catppuccin&count=4)
```

参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `username` | GitHub 用户名 | fanxing724 |
| `theme` | 主题 | default |
| `count` | 显示仓库数（1~12） | 6 |
| `sort` | 排序：`updated`/`created`/`stars` | updated |
| `pinned` | 指定仓库名，逗号分隔，按给定顺序展示 | 不传则自动选择 |

## 🎨 主题

| 主题名 | 预览 |
|--------|------|
| `default` | GitHub 暗色风格 |
| `light` | 浅色风格 |
| `dracula` | 德古拉紫 |
| `nord` | 北欧蓝 |
| `monokai` | 高对比度 |
| `catppuccin` | 暖色猫猫风格 |

## 🖼️ 组合示例

把你喜欢的卡片组合到 README 里：

```markdown
<div align="center">
  <img src="https://github.xingbox.de5.net/stats?username=你的用户名&theme=catppuccin&show_icons=true" />
  <img src="https://github.xingbox.de5.net/languages?username=你的用户名&theme=catppuccin&layout=pie" />
  <br/>
  <img src="https://github.xingbox.de5.net/activity?username=你的用户名&theme=catppuccin" />
  <br/>
  <img src="https://github.xingbox.de5.net/repos?username=你的用户名&theme=catppuccin&count=4" />
</div>
```

##  缓存行为

- 成功渲染的卡片：`Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400`
- 服务内部对 GitHub API 的响应另有 5 分钟进程内缓存，相同请求会合并，不会重复消耗额度
- 上一条只在常驻进程（Deno Deploy / Node）里成立：Workers、EdgeOne 这类隔离运行时的实例随时回收，进程内缓存命中是运气不是保证，真正挡住额度的是那条 `s-maxage`，其次是平台自己的边缘缓存
- 错误卡片（用户不存在、限流等）：`no-store`，恢复后立刻自愈，不会在 README 里挂一小时

## 🔧 本地开发

装了 Deno：

```bash
deno task start          # 等价于 deno run --allow-net --allow-env deno_index.ts
# 访问 http://localhost:8000/

deno task check          # 类型检查
deno task lint           # lint
deno task fmt            # 格式化
```

没装 Deno，用 Node（24 直接跑 `.ts`；22.6~23.5 需要加 `--experimental-strip-types`）：

```bash
GITHUB_TOKEN=xxx node node_server.mjs   # → http://127.0.0.1:8787/
node tools/build.mjs                    # 生成 EdgeOne 产物
node test/all.mjs                       # 核心层 + 产物 + 探针
```
