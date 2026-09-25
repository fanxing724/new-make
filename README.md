# GitHub Cards 🃏

[English](./README.en.md) | 简体中文

GitHub Profile 动态 SVG 卡片生成器。

让你的 GitHub 主页 README 动起来！部署后只需在 README 里引用图片链接，卡片内容会自动更新。

两种形态，同一个数据层：

| 形态 | 谁在跑 | 适合 |
|------|--------|------|
| **预渲染**（推荐） | GitHub Actions 定时跑，产物是静态 `.svg` | 公开自用，任何人访问都不消耗你的额度 |
| **按需服务** | 一个常驻/边缘函数，请求来了现算 | 要给任意用户名出图 |

## ✨ 功能

- 📊 **统计卡片** — 仓库数、Star 数、近 90 天提交数、Fork 数、关注者等
- 🔤 **编程语言卡片** — 可视化你的代码语言分布（圆环图/条形图）
- ⚡ **活跃度卡片** — 最近事件统计 + 最近 3 条动态
- 📦 **精选仓库卡片** — 双列展示你的仓库列表
- 🎨 **7 种主题** — default、light、dracula、nord、monokai、catppuccin，外加一个插画背景主题 `starlight`

## 🥇 主路线：GitHub Actions 预渲染

把"每次有人看主页就打一次 GitHub API"换成"每小时打一次，成品摊成静态文件"。

```
render.config.json  要渲染谁、每张卡什么参数
tools/render.mjs    调 handler() 出 SVG → dist-cards/
render.yml          每小时渲染 → Pages 发布
```

引用地址变成静态文件：

```markdown
![GitHub 统计](https://<你的用户名>.github.io/<仓库名>/<用户名>/stats.svg)
```

四张卡分别是 `stats.svg` / `languages.svg` / `activity.svg` / `repos.svg`。

想跟着 GitHub 的深浅色模式换主题（按需服务里就是换 `theme` 参数），在 `cards` 的
键名上加个变体后缀：

```json
"stats":       { "theme": "catppuccin", "show_icons": "true" },
"stats.light": { "theme": "light",      "show_icons": "true" }
```

点号前决定打哪条路由，点号后只决定文件名，产出 `stats.svg` 和 `stats.light.svg`。
README 里用 `<picture>` 挑其中一张：

```html
<picture>
  <source media="(prefers-color-scheme: light)" srcset="…/fanxing724/stats.light.svg">
  <img alt="GitHub 统计" src="…/fanxing724/stats.svg" width="400">
</picture>
```

同一批变体在一次运行里出完，共享那个 5 分钟进程内缓存，所以第二份几乎不再出网。

### 为什么不走按需服务

按需服务的缓存救不了额度。`username` 只校验**格式**不校验存在性，于是
`?username=` 后面跟一串随机字符就是每次都回源 —— **缓存键是请求方说了算的**，
`s-maxage` 再长也挡不住。而个人主页的图是经由 `camo.githubusercontent.com`
来抓的，全场访客在 GitHub 眼里共用那么几个出口 IP，按 IP 限流也是一戳就破。
上一版挂在 Deno 上就是这么被刷空的。

预渲染直接把"访客数"和"API 调用数"解耦：一千人看主页，GitHub API 一次都不多打。

### 上线（三步，第二步不做必挂）

1. Fork 本仓库，`render.config.json` 里的 `usernames` 改成你自己的。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
   默认是 "Deploy from a branch"，不改的话 `actions/deploy-pages` 会直接失败。
   这是唯一一步控制台操作，没有密钥要配。
3. 手动跑一次 **Actions → render-cards → Run workflow** 确认绿灯。之后每逢整点自动重渲。

令牌用的是 Actions 自带的 `secrets.GITHUB_TOKEN`：临时签发、用完自动作废、
额度独立于匿名 60 次/小时。**仓库里、你的账号下都不存在长期密钥**，这也是这条
路线比托管函数更稳妥的原因之一。

### 两条不能动的规则

- **别删 `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`** —— 删了就退化成匿名 60 次/小时，
  而一张语言卡要按仓库逐个请求，名单里两三个账号就能把额度吃穿。
- **一次失败，整批不发布** —— 渲染脚本认出限流、用户不存在等错误卡片（它们的 HTTP
  状态码同样是 200，只有 `⚠️` 标记能认出）时 `exit 1`，Actions 走不到发布那一步，
  线上保持上一版好图。宁可在主页上挂一张三小时前的旧卡片，也不要挂一张
  `⚠️ 已触发 GitHub 限流` —— 红卡进了 CDN 会一直挂到下次成功。

推论：**名单里打错一个用户名，所有人的卡片都会停止更新**（Actions 会红，不会静默）。
这是有意的 —— 半套新旧混杂的产物比一套旧的更难查。加完人先本地跑一次
`node tools/render.mjs`，或看 Actions 是否绿，再合进去。

不想等定时任务就能验证这条：`node test/all.mjs` 里"限流时退出码非 0 / 限流时不产出
任何文件 / 报错点名具体卡片"三条检查，用的是一个假上游。

### 加一个人 = 一行

`render.config.json` 的 `usernames` 数组里加个名字，提个 PR。merge 后自动重渲，
之后每小时跟着更新。参数（主题、语言条还是环、仓库展示几个）也在这个文件里，
不用碰代码。

代价说清楚：**只能渲染这个名单里的用户名**。这正是它便宜的原因 —— 别人不能拿你的
流水线去给他自己出图。要开放给任意用户名，看下面的按需路线。

## 🚀 备选：Deno Deploy

> [!WARNING]
> 这条路已经被验证过会被刷穿额度（见上一节）。只有当你确实需要"给任意用户名出图"、
> 并且愿意为此配一个带额度的 token 时才走。


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

## ☁️ 备选：Cloudflare Workers

> 和 Deno Deploy 一样是按需出图，因此同样受"缓存键由请求方决定"的约束。
> 换平台不解决问题：稀缺的是 **GitHub API 额度**，不是托管方的请求数 ——
> Workers 白送 10 万次/天，可匿名打 GitHub 只有 60 次/小时，多出来的算力没东西可算。


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

| 形态 | 平台 | 入口 | GITHUB_TOKEN 怎么给 |
|------|------|------|--------------------|
| **预渲染** | GitHub Pages | `tools/render.mjs` + `render.yml` | Actions 自带的临时 `secrets.GITHUB_TOKEN`，不用配 |
| 按需 | Deno Deploy | `deno_index.ts`（末尾自带本地启动块） | 项目环境变量 |
| 按需 | Cloudflare Workers / Pages | `worker.ts` | `wrangler secret put` |
| 按需 | Node（本机长挂） | `node_server.mjs` | 进程环境变量 |
| 按需 | EdgeOne Makers | `edge-functions/`（**生成物**） | 控制台变量 |

按需那一排里，`handler` 一份、四个壳；预渲染那一行复用同一个 `handler`，只是把
"请求驱动"换成"定时驱动"。所以五条路出的图字节级一致。

EdgeOne 产物是内联生成的：函数目录能否 import 目录外的文件这个行为还没在线上证实，所以生成的每个路由文件自带全部逻辑、一个 import 都不剩，不依赖那个未知项。

```bash
node tools/build.mjs   # cards/ + deno_index.ts → edge-functions/*.js
node test/all.mjs      # 核心层 + 每条函数路由 + 配置探针，一把过
```

`edge-functions/` 是生成物但**故意入库**：EdgeOne 关联 GitHub 后按"仓库根 = 站点根"找函数目录，放子目录就只能手动传 ZIP。改完源码重跑 `build`，别手改里面的文件；真忘了也没关系，CI 会以"产物过期"红掉。

目录名从 `functions/` 换过来的是实测：`edgeone makers generate-routes` 的构建器认 `["functions","node-functions","edge-functions","cloud-functions"]` 四个根级目录，官方示例却清一色写 `edge-functions/`，`functions` 只剩旧 Pages 的兼容位。顺手甩掉一个包袱——`functions/` 和 Cloudflare Pages 的同名目录撞车（本项目走 CF 用的是 `worker.ts` 的 Workers 模式，本来也不受影响）。

### edgeone.json

仓库根的项目描述文件，只有一条：

```json
{ "outputDirectory": "." }
```

`outputDirectory: "."` 是把"站点根 = 仓库根"钉死，不给平台猜框架的机会（仓库里有 `deno.json`，被识别成 Deno 项目去跑构建就麻烦了）。校验器接受它，且原样透传进 `routes.json` 的 `conf`。

**`cloudFunctions.mainlandRegions` 是上一版的错误，已删。** CLI 的原话：

```
[DEPRECATED] Detected cloudFunctions.mainlandRegions, please migrate to cloudFunctions.regions.mainland.
```

两个问题叠在一起：字段名已废弃，而且它的语义是**国内 SCF 部署地域**（CLI 的 zod schema 里写的是 `国内 SCF 部署地域`），只管 Cloud Functions 档。本项目跑的是边缘函数（V8），根本没有 SCF，留着就是一次"配了个不影响任何东西的字段"。这类字段最阴的地方在于它不报错——你以为中国大陆的访问被它救了，其实什么都没有。

其余字段刻意留白，别顺手加：

- `headers` —— 等实测确认边缘不遵守函数自己的 `Cache-Control` 再用。提前压一条，会把函数那条更合适的头覆盖掉。
- `buildCommand` / `installCommand` / `nodeVersion` —— 产物已经在仓库里，平台什么都不用构建。
- `redirects` / `rewrites` —— 路由由 `edge-functions/` 里的文件名直接决定，不需要映射层。

### 上线

控制台 → EdgeOne Makers → 新建项目 → 关联本仓库（配置读 `edgeone.json`），然后在项目变量里加 `GITHUB_TOKEN` —— 不给就退回匿名 60 次/小时，一张语言卡就能把额度吃穿。验收两条：

```bash
curl https://你的域名/health                       # 函数目录认了没 + 密钥读到没
curl -sI "https://你的域名/stats?username=octocat"  # 边缘缓存头
```

`/health` 返回 HTML 或 404 → `edge-functions/` 没被识别；返回 JSON 但 `config.GITHUB_TOKEN:false` → 变量没生效，改完要重新部署一次。这条路由是探针，只回布尔和变量名，不泄密钥。

边缘缓存判生死的方法：同一个链接连查两次，`age` 在涨或出现 HIT 类头 = 边缘在挡；永远 `age: 0` = 每次刷新都回源打 GitHub，这时再给 `edgeone.json` 补一条 `headers`。

也可以用 CLI 本地验配置（不用登录就能拿到校验结论）：

```bash
edgeone makers generate-routes   # 只校验 edgeone.json + 生成路由表，不部署
```

## 📁 目录结构

```
new-make/
├─ README.md               中文文档（README.en.md 为英文版）
├─ deno_index.ts          真源 · 路由表 + handler(req, env?, basePath?) + 首页
├─ cards/                 真源 · GitHub 数据层、7 套主题、4 张卡的 SVG 拼装
│  ├─ art.ts              【生成物】插画 base64，换图跑 tools/art.mjs，别手改
│  └─ env.ts              跨平台配置读取的唯一入口，别处不许摸 Deno.env / process.env
├─ render.config.json     预渲染名单：渲染谁、每张卡什么参数
├─ tools/render.mjs       真源 → dist-cards/（调 handler，不另写一套出图逻辑）
├─ tools/art.mjs          图片 → cards/art.ts（base64 内联，见「插画背景主题」）
├─ dist-cards/            【生成物·不入库】Actions 经 Pages artifact 发布，别提交
├─ .github/workflows/
│  ├─ render.yml          每小时渲染 + 发布到 GitHub Pages
│  └─ ci.yml              重新 build，产物过期或检查失败就红
├─ edge-functions/        【生成物】EdgeOne 边缘函数，每个文件自带全部逻辑、零 import
├─ worker.ts              Cloudflare Workers 入口
├─ wrangler.toml          Cloudflare 配置
├─ node_server.mjs        Node 入口（本机预览 / 长挂）
├─ deno.json              Deno task 与 fmt 配置
├─ edgeone.json           EdgeOne Makers 项目描述
├─ tools/build.mjs        真源 → edge-functions/
└─ test/all.mjs           核心层 + 每条函数路由 + 探针 + env 优先级 + 渲染脚本
```

记法：**只有 `cards/` 和 `deno_index.ts` 需要动手**，其余是入口、产物和保险带。
`tools/render.mjs` 走的是同一条 `handler()`，所以预渲染和按需服务出的图永远一致。

## 📝 在 README 中使用

**预渲染路线**（推荐）：地址是静态文件，参数不在 URL 里，而在 `render.config.json`
的 `cards` 对象里。

```markdown
![GitHub 统计](https://<你的用户名>.github.io/<仓库名>/<你的用户名>/stats.svg)
```

**按需路线**：地址取决于你部署在哪，下面统一写成 `<你的服务地址>`。参数就是各卡
URL 后面的 query，和 `render.config.json` 里的字段一一对应（少个 `username`，那边
在 `usernames` 名单里）。

### 统计卡片

```markdown
![GitHub 统计](<你的服务地址>/stats?username=你的用户名)
```

参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `username` | GitHub 用户名 | fanxing724 |
| `theme` | 主题 | default |
| `hide_rank` | 隐藏排名 | 不传则显示 |
| `show_icons` | 显示图标，传 `true`/`false` | false |

数据口径：提交数来自 GitHub Events 接口，只覆盖**最近 90 天**，卡片上会如实标注；
排名是按 followers / stars / 仓库数估算的分位（"全球前 N%"），仅供娱乐。

### 编程语言卡片

```markdown
![编程语言](<你的服务地址>/languages?username=你的用户名&theme=catppuccin&layout=pie)
```

参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `username` | GitHub 用户名 | fanxing724 |
| `theme` | 主题 | default |
| `hide` | 隐藏的语言，逗号分隔，忽略大小写 | 空 |
| `layout` | 布局：`pie` 或 `bar` | pie |

Top 8 之外的语言会归入"其他"，保证百分比合计为 100%。

### 活跃度卡片

```markdown
![最近活跃](<你的服务地址>/activity?username=你的用户名&theme=catppuccin)
```

统计基于最近 300 条公开事件（GitHub 事件接口最多保留 90 天）。

### 精选仓库卡片

```markdown
![精选仓库](<你的服务地址>/repos?username=你的用户名&theme=catppuccin&count=4)
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
| `starlight` | 插画背景，见下节 |

## 🌌 插画背景主题

`starlight` 是唯一的"带图"主题：卡片底色让位给一张插画，上面盖两层压暗，前景文字才站得住。

换图只要一条命令：

```bash
node tools/art.mjs /path/to/图.webp starlight   # 重新生成 cards/art.ts
```

`cards/art.ts` 是**生成物**，别手改；`cards/theme.ts` 里的主题用 `art: ARTS.starlight`
认领其中一张。注意这条命令是**整文件重写**，一次只产出一张图 —— 想要第二个插画主题，
先想清楚值不值那 36 KB，再手工往 `ARTS` 里加一条。

三条硬约束，都是踩出来的：

- **必须 base64 内联。** 卡片最终是别人 README 里的一张 `<img>`，SVG 在这种语境下算
  "图像文档"，浏览器禁止它加载任何外部资源 —— 写 `href="https://…"` 只会得到一块空白。
  代价是体积：base64 比原图大 33%，四张暗卡从 24 KB 涨到 164 KB。
- **只裁不拉伸。** 用 `preserveAspectRatio="xMidYMid slice"`：按**同一个**系数把图放大到
  铺满卡片，再居中裁掉溢出 —— 两轴共用一个系数，所以永远不会变形。想让图拉伸得写
  `"none"`，那是 bug。

  卡片尺寸跟着数据长（语言条数、事件条数、仓库行数都会改高度），所以**裁哪一边是会变的**：

  | 卡片 | 尺寸范围 | 缩放 | 裁掉 |
  |------|----------|------|------|
  | `stats` | 450×210（固定） | 0.750× | 上下各 28 px |
  | `languages`（环） | 400×220 ~ 289 | 0.667 ~ 0.858× | 上下各 4 px → 左右各 67 px |
  | `activity` | 400×182 ~ 226 | 0.667 ~ 0.671× | 上下各 32 px → 左右各 2 px |
  | `repos`（6 个 = 3 行） | 630×422 | 1.252× | 左右各 48 px |

  语言一多、仓库一多，就从"裁上下"翻成"裁左右"。所以选图要看**四张卡在任何数据下同时成立
  的安全区**：按上表的极端值算，是原图（600×337）里 `x∈[67,533] y∈[32,305]` 那块 466×273，
  占面积 63%（只按今天这份配置算是 503×280 / 70%，但数据会涨，别赌）。人物重心、脸必须留在
  这块里，贴边必被某张卡裁掉。想改构图就动 `common.ts` 里 `slice` 前面的 `xMidYMid`
  （换成 `YMin`/`YMax` 就是保顶/保底）。
- **别指望动画。** README 的 `<img>` 不执行 SVG 动画，GIF 塞进 `<image>` 也只显示第一帧。

压暗程度在 `ARTS` 的 `dim`（整幅平铺）/ `dimLeft`（左端额外压暗，因为标题和数值都在左边）
里调，改完重跑 `node tools/render.mjs` 直接看效果。

### 为什么浅色模式没有插画

因为这张图是**夜景**，而浅色模式的字是深色的 —— 深色字压在深色图上直接读不了。实测
（`stats` 尺寸，逐像素取最坏点，WCAG AA 小字要求 4.5:1）：

| 白雾浓度 `dim` | 正文最低对比 | 结论 |
|---|---|---|
| 0.93 | 4.88:1 | 及格，但图只剩一层淡色调，等于没图 |
| 0.85 | 4.16:1 | 不及格 |
| 0.78 | 3.50:1 | 不及格 |
| 0.70 | 2.85:1 | 不及格 |

也就是说：**要图看得见，字就读不了；要字读得了，图就看不见。** 试着把字压黑
（`#1f3350`）能换来一些余量，但强调色（青/绿/橙/红）要同时到 4.5:1，只能配出
`#16484f`、`#5c3b14` 这种发灰发脏的颜色，卡片立刻难看。

也试过把图本身提亮成"日光淡彩"：`gain 1.6 / lift 0.42 / sat 0.45` 之后，夜空最暗处
仍有 0.164 的亮度，正文最低对比只到 2.60:1 —— 夜景的暗部提不动，再提整个画面就糊了。

所以浅色档老老实实用 `light` 主题。**换一张本来就是浅色调的图，这条路才通。**

## 🖼️ 组合示例

把你喜欢的卡片组合到 README 里：

```markdown
<div align="center">
  <img src="<你的服务地址>/stats?username=你的用户名&theme=catppuccin&show_icons=true" />
  <img src="<你的服务地址>/languages?username=你的用户名&theme=catppuccin&layout=pie" />
  <br/>
  <img src="<你的服务地址>/activity?username=你的用户名&theme=catppuccin" />
  <br/>
  <img src="<你的服务地址>/repos?username=你的用户名&theme=catppuccin&count=4" />
</div>
```

##  缓存行为

**预渲染路线**没有"缓存"这个概念，只有"多久更新一次"：图是静态文件，GitHub Pages
自己带 CDN，看一万次也不回源打 GitHub。新鲜度看 `https://<你的用户名>.github.io/<仓库名>/`
这个自检页 —— 四张卡摆一页，顶上写着"上次成功渲染 <时间>"。它落后太多，说明定时任务在失败。
（卡片本身不带时间戳，只有自检页和 `status.json` 带。）

**按需路线**的缓存头：

- 成功渲染的卡片：`Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400`
- 服务内部对 GitHub API 的响应另有 5 分钟进程内缓存，相同请求会合并，不会重复消耗额度
- 上一条只在常驻进程（Deno Deploy / Node）里成立：Workers、EdgeOne 这类隔离运行时的实例随时回收，进程内缓存命中是运气不是保证，真正挡住额度的是那条 `s-maxage`，其次是平台自己的边缘缓存
- 错误卡片（用户不存在、限流等）：`no-store`，恢复后立刻自愈，不会在 README 里挂一小时
- 但 `s-maxage` 挡不住故意绕缓存的请求，因为缓存键里的 `username` 由请求方给定。这条路线上真正的上限是 GitHub 的 token 额度（认证 5000 次/小时），不是缓存时长

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
node tools/render.mjs                   # 预渲染到 dist-cards/，打开 dist-cards/index.html 看
node test/all.mjs                       # 核心层 + 产物 + 探针 + 渲染脚本
```
