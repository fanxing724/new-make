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

`handler` 是纯 Web Fetch API，Workers 入口见 `worker.ts`（只做了密钥注入）。

```bash
npm install -g wrangler
wrangler login
wrangler secret put GITHUB_TOKEN   # 可选但强烈建议
wrangler deploy                    # 部署，得到 https://github-cards.<子域>.workers.dev
```

配置在 `wrangler.toml`。Workers 免费额度（10 万次/天）比 Deno Deploy 更宽裕。

## 📝 在 README 中使用

### 统计卡片

```markdown
![GitHub 统计](https://你的域名.deno.dev/stats?username=你的用户名)
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
![编程语言](https://你的域名.deno.dev/languages?username=你的用户名&theme=catppuccin&layout=pie)
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
![最近活跃](https://你的域名.deno.dev/activity?username=你的用户名&theme=catppuccin)
```

统计基于最近 100 条公开事件（GitHub 事件接口最多保留 90 天）。

### 精选仓库卡片

```markdown
![精选仓库](https://你的域名.deno.dev/repos?username=你的用户名&theme=catppuccin&count=4)
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
  <img src="https://你的域名.deno.dev/stats?username=你的用户名&theme=catppuccin&show_icons=true" />
  <img src="https://你的域名.deno.dev/languages?username=你的用户名&theme=catppuccin&layout=pie" />
  <br/>
  <img src="https://你的域名.deno.dev/activity?username=你的用户名&theme=catppuccin" />
  <br/>
  <img src="https://你的域名.deno.dev/repos?username=你的用户名&theme=catppuccin&count=4" />
</div>
```

##  缓存行为

- 成功渲染的卡片：`Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400`
- 服务内部对 GitHub API 的响应另有 5 分钟进程内缓存，相同请求会合并，不会重复消耗额度
- 错误卡片（用户不存在、限流等）：`no-store`，恢复后立刻自愈，不会在 README 里挂一小时

## 🔧 本地开发

```bash
deno task start          # 等价于 deno run --allow-net --allow-env deno_index.ts
# 访问 http://localhost:8000/

deno task check          # 类型检查
deno task lint           # lint
deno task fmt            # 格式化
```
