// github-cards - GitHub Profile 动态卡片生成器
// 部署到 Deno Deploy，为 GitHub 主页生成动态 SVG 卡片
// 使用方式：https://你的域名.deno.dev/stats?username=fanxing724

import { renderActivityCard } from "./cards/activity.ts";
import { renderBadgeCard } from "./cards/badge.ts";
import { CardError, renderErrorCard } from "./cards/common.ts";
import { assertUsername, setGitHubToken } from "./cards/github.ts";
import { renderLanguagesCard } from "./cards/languages.ts";
import { renderReposCard } from "./cards/repos.ts";
import { renderStatsCard } from "./cards/stats.ts";
import { renderStreakCard } from "./cards/streak.ts";
import { getTheme, THEMES, THEME_NAMES, type Theme } from "./cards/theme.ts";
import type { EnvBag } from "./cards/env.ts";

const DEFAULT_USERNAME = "fanxing724";
const OK_CACHE =
  "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";
// 错误卡片绝不能长缓存，否则一次限流会在 README 里挂一个小时
const ERROR_CACHE = "no-store";

type CardRenderer = (
  username: string,
  theme: Theme,
  params: URLSearchParams,
) => Promise<string>;

const ROUTES = new Map<string, CardRenderer>([
  [
    "/stats",
    (username, theme, params) =>
      renderStatsCard(username, theme, {
        hideRank: flag(params, "hide_rank"),
        showIcons: flag(params, "show_icons"),
        title: params.get("title") ?? undefined,
      }),
  ],
  [
    "/languages",
    (username, theme, params) =>
      renderLanguagesCard(username, theme, {
        hide: listParam(params, "hide"),
        layout: params.get("layout") === "bar" ? "bar" : "pie",
        repo: params.get("repo") ?? undefined,
        title: params.get("title") ?? undefined,
      }),
  ],
  [
    "/activity",
    (username, theme, params) =>
      renderActivityCard(username, theme, {
        title: params.get("title") ?? undefined,
      }),
  ],
  [
    "/repos",
    (username, theme, params) =>
      renderReposCard(username, theme, {
        count: intParam(params, "count", { def: 6, min: 1, max: 12 }),
        sort: sortParam(params),
        pinned: listParam(params, "pinned"),
        title: params.get("title") ?? undefined,
      }),
  ],
  [
    "/streak",
    (username, theme, params) =>
      renderStreakCard(username, theme, {
        title: params.get("title") ?? undefined,
      }),
  ],
  [
    "/badge",
    (username, theme, params) =>
      renderBadgeCard(username, theme, {
        metrics: listParam(params, "metrics"),
        direction: params.get("direction") === "column" ? "column" : "row",
      }),
  ],
]);

/** 裸传 ?show_icons 视为 true；显式传值时只有真值字面量算开启 */
function flag(params: URLSearchParams, name: string): boolean {
  const value = params.get(name);
  if (value === null) return false;
  if (value === "") return true;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

function intParam(
  params: URLSearchParams,
  name: string,
  opts: { def: number; min: number; max: number },
): number {
  const raw = params.get(name);
  if (raw === null) return opts.def;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return opts.def;
  return Math.min(opts.max, Math.max(opts.min, parsed));
}

function listParam(params: URLSearchParams, name: string): string[] {
  return params.get(name)?.split(",").map((s) => s.trim()).filter(Boolean) ??
    [];
}

function sortParam(
  params: URLSearchParams,
): "updated" | "created" | "stars" {
  const value = params.get("sort");
  return value === "created" || value === "stars" ? value : "updated";
}

function svgResponse(svg: string, cacheControl: string): Response {
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": cacheControl,
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export function indexPage(base: string): string {
  const themeSwatches = THEME_NAMES.map((name) => {
    const t = THEMES[name];
    return `<span class="swatch"><i style="background:${t.accent};box-shadow:0 0 0 3px ${t.card},0 0 0 4px ${t.border}"></i>${name}</span>`;
  }).join("");

  const card = (
    icon: string,
    title: string,
    url: string,
    params: string[],
  ) => `
  <section class="card">
    <h2>${icon} ${title}</h2>
    <div class="code-row"><code class="url">![${title}](${base}${url})</code><button class="copy">复制</button></div>
    <p class="params">${params.map((p) => `<span class="badge">${p}</span>`).join(" ")}</p>
  </section>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Cards - 动态卡片生成器</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      max-width: 960px; margin: 0 auto; padding: 48px 24px 64px;
      background:
        radial-gradient(900px 420px at 85% -10%, rgba(88, 166, 255, 0.16), transparent 70%),
        radial-gradient(700px 380px at -10% 20%, rgba(188, 140, 255, 0.12), transparent 70%),
        #0d1117;
      color: #c9d1d9; line-height: 1.6;
    }
    h1 {
      font-size: 40px; margin: 0 0 8px; letter-spacing: -0.5px;
      background: linear-gradient(100deg, #58a6ff 10%, #bc8cff 60%, #f778ba 95%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .lead { color: #8b949e; font-size: 16px; margin: 0 0 28px; }
    h2 { color: #f0f6fc; font-size: 16px; margin: 0 0 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .card {
      background: rgba(22, 27, 34, 0.8); border: 1px solid #30363d; border-radius: 14px;
      padding: 18px 18px 14px; backdrop-filter: blur(8px);
      transition: border-color .15s ease, transform .15s ease;
    }
    .card:hover { border-color: #58a6ff66; transform: translateY(-2px); }
    .code-row { display: flex; gap: 8px; align-items: stretch; }
    code.url {
      flex: 1; min-width: 0; display: block; background: #0d1117; border: 1px solid #30363d;
      padding: 9px 12px; border-radius: 8px; overflow-x: auto; white-space: nowrap;
      font-size: 12.5px; color: #7ee787; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    button.copy {
      border: 1px solid #30363d; background: #21262d; color: #c9d1d9; border-radius: 8px;
      padding: 0 14px; font-size: 12.5px; cursor: pointer;
    }
    button.copy:hover { border-color: #58a6ff; color: #58a6ff; }
    .params { margin: 10px 0 4px; }
    .badge {
      display: inline-block; background: #21262d; padding: 3px 10px; border-radius: 20px;
      font-size: 12px; margin: 2px; border: 1px solid #30363d; color: #8b949e;
    }
    .note {
      border: 1px solid #d2992255; border-left: 3px solid #d29922; padding: 12px 16px;
      background: rgba(210, 153, 34, 0.08); border-radius: 0 10px 10px 0; margin: 0 0 28px;
      font-size: 14px;
    }
    .note code { background: #21262d; padding: 2px 7px; border-radius: 5px; font-size: 13px; color: #e3b341; }
    .swatches { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0 32px; }
    .swatch {
      display: inline-flex; align-items: center; gap: 8px; background: #161b22;
      border: 1px solid #30363d; border-radius: 20px; padding: 5px 14px 5px 6px; font-size: 13px;
    }
    .swatch i { width: 14px; height: 14px; border-radius: 50%; display: inline-block; }
    pre {
      background: #0d1117; padding: 16px; border-radius: 10px; overflow-x: auto;
      border: 1px solid #30363d; font-size: 13px; line-height: 1.7;
    }
    footer { margin-top: 40px; color: #6e7681; font-size: 13px; }
  </style>
</head>
<body>
  <h1>✨ GitHub Cards</h1>
  <p class="lead">为你的 GitHub Profile README 生成好看的动态 SVG 卡片，内容随仓库自动更新。</p>

  <div class="note">
    建议为服务配置 <code>GITHUB_TOKEN</code> 环境变量（只读 public 权限即可）。
    匿名调用 GitHub API 只有 60 次/小时额度，语言卡片单次渲染就可能消耗几十次请求。
  </div>

  <div class="grid">
    ${
    card("📊", "统计卡片", "/stats?username=fanxing724&theme=default", [
      "username",
      "theme",
      "hide_rank",
      "show_icons=true/false",
    ])
  }
    ${
    card("🔤", "编程语言统计", "/languages?username=fanxing724&theme=default", [
      "username",
      "theme",
      "hide=html,css（忽略大小写）",
      "layout=pie/bar",
    ])
  }
    ${card("⚡", "最近活跃度", "/activity?username=fanxing724&theme=default", ["username", "theme"])}
    ${
    card("📦", "精选仓库", "/repos?username=fanxing724&theme=default", [
      "username",
      "theme",
      "count=1~12",
      "sort=updated/created/stars",
      "pinned=repo1,repo2",
    ])
  }
  </div>

  <h2 style="margin-top:36px">🎨 可用主题</h2>
  <div class="swatches">${themeSwatches}</div>

  <h2>📝 在 README 中使用</h2>
  <pre>![GitHub 统计](${base}/stats?username=fanxing724&theme=catppuccin&show_icons=true)

![编程语言](${base}/languages?username=fanxing724&theme=catppuccin&layout=pie)

![最近活跃](${base}/activity?username=fanxing724&theme=catppuccin)

![精选仓库](${base}/repos?username=fanxing724&theme=catppuccin&count=4)</pre>

  <footer>GitHub Cards · Deno Deploy · 数据来自 GitHub REST API</footer>

  <script>
    document.querySelectorAll(".copy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.parentElement.querySelector("code");
        if (navigator.clipboard && code) navigator.clipboard.writeText(code.textContent);
        btn.textContent = "已复制";
        setTimeout(() => (btn.textContent = "复制"), 1200);
      });
    });
  </script>
</body>
</html>`;
}

/**
 * 平台差异只有两处：env 袋（Workers/EdgeOne 传 context.env，Deno/Node 省略）
 * 和 basePath（服务被挂在子路径下时，首页示例链接要带上前缀）。
 */
export async function handler(
  req: Request,
  env?: EnvBag,
  basePath = "",
): Promise<Response> {
  // 每请求重设：隔离型运行时的实例会跨请求复用，模块作用域不是"进程级配置"
  setGitHubToken(env);

  const url = new URL(req.url);
  const { pathname, searchParams } = url;

  if (pathname === "/" || pathname === "/index.html") {
    return new Response(indexPage(url.origin + basePath), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 网关可能改写路径前缀（Qoder Sites 会把函数名段换成上游名），故按最后一段兜底匹配
  const render = ROUTES.get(pathname) ??
    ROUTES.get(pathname.slice(pathname.lastIndexOf("/")));
  if (!render) {
    return new Response("Not Found", { status: 404 });
  }

  const theme = getTheme(searchParams.get("theme"));
  try {
    const username = assertUsername(
      searchParams.get("username")?.trim() || DEFAULT_USERNAME,
    );
    const svg = await render(username, theme, searchParams);
    return svgResponse(svg, OK_CACHE);
  } catch (err) {
    if (err instanceof CardError) {
      return svgResponse(
        renderErrorCard(err.message, theme, err.hint || undefined),
        ERROR_CACHE,
      );
    }
    console.error("unexpected render failure:", err);
    return svgResponse(
      renderErrorCard("卡片渲染失败", theme, "服务内部错误，请稍后重试"),
      ERROR_CACHE,
    );
  }
}

if (import.meta.main) {
  const port = Number(Deno.env.get("PORT") ?? 8000) || 8000;
  // 包一层箭头函数：Deno.serve 会把 ServeHandlerInfo 当第二个参数传进来，
  // 而 handler 的第二参是 env 袋，不能接错。
  Deno.serve({ hostname: "0.0.0.0", port }, (req) => handler(req));
}
