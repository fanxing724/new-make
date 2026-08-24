# GitHub Cards 🃏

基于 Deno Deploy 的 GitHub Profile 动态 SVG 卡片生成器。

让你的 GitHub 主页 README 动起来！部署后只需在 README 里引用图片链接，卡片内容会自动更新。

## ✨ 功能

- 📊 **统计卡片** — 显示仓库数、Star 数、提交数、关注者等
- 🔤 **编程语言卡片** — 可视化你的代码语言分布（饼图/条形图）
- ⚡ **活跃度卡片** — 显示最近 GitHub 活动统计
- 📦 **精选仓库卡片** — 展示你的仓库列表
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
| `show_icons` | 显示图标 | 不传则显示文字 |

### 编程语言卡片

```markdown
![编程语言](https://你的域名.deno.dev/languages?username=你的用户名&theme=catppuccin&layout=pie)
```

参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `username` | GitHub 用户名 | fanxing724 |
| `theme` | 主题 | default |
| `hide` | 隐藏的语言，逗号分隔 | 空 |
| `layout` | 布局：`pie` 或 `bar` | pie |

### 活跃度卡片

```markdown
![最近活跃](https://你的域名.deno.dev/activity?username=你的用户名&theme=catppuccin)
```

### 精选仓库卡片

```markdown
![精选仓库](https://你的域名.deno.dev/repos?username=你的用户名&theme=catppuccin&count=4)
```

参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `username` | GitHub 用户名 | fanxing724 |
| `theme` | 主题 | default |
| `count` | 显示仓库数 | 6 |
| `sort` | 排序：`updated`/`created`/`stars` | updated |
| `pinned` | 指定仓库名，逗号分隔 | 不传则自动选择 |

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

## 🔧 本地开发

```bash
deno run --allow-net --allow-env deno_index.ts
# 访问 http://localhost:8000/
```