// github-cards - GitHub Profile 动态卡片生成器
// 部署到 Deno Deploy，为主人 GitHub 主页生成好看的 SVG 卡片
// 使用方式：https://你的域名.deno.dev/stats?username=fanxing724

import { renderStatsCard } from "./cards/stats.ts";
import { renderLanguagesCard } from "./cards/languages.ts";
import { renderActivityCard } from "./cards/activity.ts";
import { renderReposCard } from "./cards/repos.ts";

// ─── 主题色板 ────────────────────────────────────────────
const THEMES: Record<string, Record<string, string>> = {
  default: {
    bg: "#0d1117",
    card: "#161b22",
    border: "#30363d",
    title: "#f0f6fc",
    text: "#8b949e",
    accent: "#58a6ff",
    green: "#3fb950",
    orange: "#d29922",
    red: "#f85149",
    purple: "#bc8cff",
  },
  light: {
    bg: "#ffffff",
    card: "#f6f8fa",
    border: "#d0d7de",
    title: "#1f2328",
    text: "#656d76",
    accent: "#0969da",
    green: "#1a7f37",
    orange: "#9a6700",
    red: "#cf222e",
    purple: "#8250df",
  },
  dracula: {
    bg: "#282a36",
    card: "#44475a",
    border: "#6272a4",
    title: "#f8f8f2",
    text: "#bd93f9",
    accent: "#ff79c6",
    green: "#50fa7b",
    orange: "#ffb86c",
    red: "#ff5555",
    purple: "#bd93f9",
  },
  nord: {
    bg: "#2e3440",
    card: "#3b4252",
    border: "#4c566a",
    title: "#eceff4",
    text: "#81a1c1",
    accent: "#88c0d0",
    green: "#a3be8c",
    orange: "#d08770",
    red: "#bf616a",
    purple: "#b48ead",
  },
  monokai: {
    bg: "#272822",
    card: "#383830",
    border: "#49483e",
    title: "#f8f8f2",
    text: "#a6e22e",
    accent: "#f92672",
    green: "#a6e22e",
    orange: "#fd971f",
    red: "#f92672",
    purple: "#ae81ff",
  },
  catppuccin: {
    bg: "#1e1e2e",
    card: "#313244",
    border: "#45475a",
    title: "#cdd6f4",
    text: "#a6adc8",
    accent: "#89b4fa",
    green: "#a6e3a1",
    orange: "#fab387",
    red: "#f38ba8",
    purple: "#cba6f7",
  },
};

function getTheme(name: string): Record<string, string> {
  return THEMES[name] || THEMES.default;
}

// ─── 请求处理 ────────────────────────────────────────────
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const params = url.searchParams;

  // 根路径 - 使用说明
  if (path === "/" || path === "/index.html") {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Cards - 动态卡片生成器</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #0d1117; color: #c9d1d9; }
    h1 { color: #58a6ff; }
    h2 { color: #f0f6fc; margin-top: 30px; }
    code { background: #161b22; padding: 2px 8px; border-radius: 4px; font-size: 14px; }
    pre { background: #161b22; padding: 16px; border-radius: 8px; overflow-x: auto; border: 1px solid #30363d; }
    a { color: #58a6ff; }
    .card { border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin: 16px 0; background: #161b22; }
    .badge { display: inline-block; background: #21262d; padding: 4px 12px; border-radius: 20px; font-size: 13px; margin: 2px; border: 1px solid #30363d; }
  </style>
</head>
<body>
  <h1>✨ GitHub Cards</h1>
  <p>为你的 GitHub Profile README 生成好看的动态 SVG 卡片</p>

  <div class="card">
    <h2>📊 统计卡片</h2>
    <p><code>![stats](${url.origin}/stats?username=fanxing724&theme=default)</code></p>
    <p>参数: <span class="badge">username</span> <span class="badge">theme (default/dracula/nord/light/catppuccin/monokai)</span> <span class="badge">hide_rank</span> <span class="badge">show_icons</span></p>
  </div>

  <div class="card">
    <h2>🔤 编程语言统计</h2>
    <p><code>![languages](${url.origin}/languages?username=fanxing724&theme=default)</code></p>
    <p>参数: <span class="badge">username</span> <span class="badge">theme</span> <span class="badge">hide=html,css</span> <span class="badge">layout (pie/bar)</span></p>
  </div>

  <div class="card">
    <h2>⚡ 最近活跃度</h2>
    <p><code>![activity](${url.origin}/activity?username=fanxing724&theme=default)</code></p>
    <p>参数: <span class="badge">username</span> <span class="badge">theme</span></p>
  </div>

  <div class="card">
    <h2>📦 精选仓库</h2>
    <p><code>![repos](${url.origin}/repos?username=fanxing724&theme=default)</code></p>
    <p>参数: <span class="badge">username</span> <span class="badge">theme</span> <span class="badge">count=6</span> <span class="badge">sort=updated/created/stars</span></p>
  </div>

  <h2>🎨 可用主题</h2>
  <p>${Object.keys(THEMES).map(t => '<span class="badge">' + t + '</span>').join(" ")}</p>

  <h2>📝 在 README 中使用</h2>
  <pre>![番星的 GitHub 统计](https://你的域名.deno.dev/stats?username=fanxing724&theme=catppuccin&show_icons=true)

![编程语言](https://你的域名.deno.dev/languages?username=fanxing724&theme=catppuccin&layout=pie)

![最近活跃](https://你的域名.deno.dev/activity?username=fanxing724&theme=catppuccin)

![精选仓库](https://你的域名.deno.dev/repos?username=fanxing724&theme=catppuccin&count=4)</pre>
</body>
</html>`;
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 统计卡片
  if (path === "/stats") {
    const username = params.get("username") || "fanxing724";
    const theme = getTheme(params.get("theme") || "default");
    const hideRank = params.has("hide_rank");
    const showIcons = params.has("show_icons");

    const svg = await renderStatsCard(username, theme, { hideRank, showIcons });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=1800",
      },
    });
  }

  // 编程语言卡片
  if (path === "/languages") {
    const username = params.get("username") || "fanxing724";
    const theme = getTheme(params.get("theme") || "default");
    const hide = params.get("hide")?.split(",").map(s => s.trim()).filter(Boolean) || [];
    const layout = (params.get("layout") || "pie") as "pie" | "bar";

    const svg = await renderLanguagesCard(username, theme, { hide, layout });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=1800",
      },
    });
  }

  // 最近活跃度卡片
  if (path === "/activity") {
    const username = params.get("username") || "fanxing724";
    const theme = getTheme(params.get("theme") || "default");

    const svg = await renderActivityCard(username, theme);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=1800",
      },
    });
  }

  // 精选仓库卡片
  if (path === "/repos") {
    const username = params.get("username") || "fanxing724";
    const theme = getTheme(params.get("theme") || "default");
    const count = parseInt(params.get("count") || "6");
    const sort = (params.get("sort") || "updated") as "updated" | "created" | "stars";
    const pinned = params.get("pinned")?.split(",").map(s => s.trim()).filter(Boolean);

    const svg = await renderReposCard(username, theme, { count, sort, pinned });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=1800",
      },
    });
  }

  return new Response("Not Found", { status: 404 });
}

const port = Number(Deno.env.get("PORT") ?? 8000) || 8000;
Deno.serve({ hostname: "0.0.0.0", port }, handler);