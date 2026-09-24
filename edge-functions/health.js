// 生成物,勿手改。真源是仓库根的 cards/ + deno_index.ts,改完跑 node tools/build.mjs

// ==== 源: cards/common.ts ====
// 卡片公共工具：SVG 骨架、文本转义/截断、语言色板、错误卡片

                                        

const FONT =
  "'Segoe UI', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";

const FALLBACK_COLOR = "#6e7681";

// 语言色板，取自 GitHub 界面的语言圆点配色
const LANG_COLORS                         = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Lua: "#000080",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Scala: "#c22d40",
  Perl: "#0298c3",
  Haskell: "#5e5086",
  R: "#198CE7",
  Matlab: "#e16737",
  Markdown: "#083fa1",
  Dockerfile: "#384d54",
  Makefile: "#427819",
};

function langColor(lang               )         {
  return (lang && LANG_COLORS[lang]) || FALLBACK_COLOR;
}

const ENTITIES                         = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

// 用户名、仓库名、description 都会原样进入 SVG，GitHub 渲染 README 里的 SVG 时
// 允许脚本，未转义就等于把注入点开放给任意被查询用户的仓库描述。
function escapeXml(value        )         {
  return value.replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

function displayWidth(value        )         {
  let units = 0;
  for (const ch of value) {
    units += ch.codePointAt(0)  > 0x2e80 ? 2 : 1;
  }
  return units;
}

function truncate(value        , maxUnits        )         {
  if (displayWidth(value) <= maxUnits) return value;
  let units = 0;
  let out = "";
  for (const ch of value) {
    const w = ch.codePointAt(0)  > 0x2e80 ? 2 : 1;
    if (units + w > maxUnits - 1) break;
    units += w;
    out += ch;
  }
  return out + "…";
}

                       
                
                
                           
                                      
 

function textEl(
  x        ,
  y        ,
  content        ,
  opts              = {},
)         {
  const { size = 12, fill, weight, anchor } = opts;
  const extra = `${weight ? ` font-weight="${weight}"` : ""}${
    anchor ? ` text-anchor="${anchor}"` : ""
  }`;
  return `  <text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"${extra} fill="${fill}">${
    escapeXml(content)
  }</text>`;
}

function startCard(
  theme       ,
  width        ,
  height        ,
  title        ,
  subtitle        ,
  gradientId        ,
)           {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${
      escapeXml(title)
    }">`,
    `  <defs>`,
    `    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `      <stop offset="0" stop-color="${theme.accent}" stop-opacity="0.14"/>`,
    `      <stop offset="1" stop-color="${theme.purple}" stop-opacity="0.05"/>`,
    `    </linearGradient>`,
    `  </defs>`,
    `  <rect width="${width}" height="${height}" rx="12" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>`,
    `  <rect width="${width}" height="${height}" rx="12" fill="url(#${gradientId})"/>`,
    `  <rect x="20" y="19" width="4" height="17" rx="2" fill="${theme.accent}"/>`,
    textEl(32, 33, title, { size: 16, weight: 700, fill: theme.title }),
    textEl(32, 51, subtitle, { size: 12, fill: theme.text }),
  ];
}

function finishCard(lines          )         {
  lines.push("</svg>");
  return lines.join("\n");
}

/**
 * 渲染失败时的兜底卡片。走正常 200 响应返回，README 里仍能看到提示；
 * 缓存策略由调用方负责（错误卡片不缓存）。
 */
function renderErrorCard(
  message        ,
  theme       ,
  hint = "请检查用户名是否正确",
)         {
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100" role="img" aria-label="${
      escapeXml(message)
    }">`,
    `<rect width="400" height="100" rx="12" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>`,
    textEl(20, 45, `⚠️ ${message}`, { size: 14, fill: theme.red }),
    textEl(20, 70, hint, { size: 12, fill: theme.text }),
    "</svg>",
  ];
  return lines.join("\n");
}

/**
 * 卡片渲染失败的统一异常。`kind` 决定错误卡片文案与是否短缓存，
 * retryable 表示稍后重试可能成功（限流/上游故障），由 kind 推导。
 */
                                                                                

const RETRYABLE_KINDS                  = ["rate_limited", "upstream"];

class CardError extends Error {
  hint        ;
  kind               ;
  retryable         ;

  constructor(
    message        ,
    opts                                          = {},
  ) {
    super(message);
    this.name = "CardError";
    this.kind = opts.kind ?? "empty";
    this.hint = opts.hint ?? "";
    this.retryable = RETRYABLE_KINDS.includes(this.kind);
  }
}

function timeAgo(dateStr        , now = Date.now())         {
  const diff = Math.floor((now - new Date(dateStr).getTime()) / 1000);
  if (!Number.isFinite(diff) || diff < 0) return "时间未知";
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} 个月前`;
  return `${Math.floor(diff / 31536000)} 年前`;
}

// ==== 源: cards/env.ts ====
// 跨平台配置读取。真源只认这一个入口, 不要在别处直接摸 Deno.env / process.env。
//
// 优先级: 调用方传入的 env 袋(EdgeOne context.env、Workers env 绑定)
//         > Deno.env(Qoder Sites / Deno 宿主)
//         > process.env(Node)
// 全程用 globalThis + 可选链 + try/catch, 因此在没有任何这些全局量的 isolate
// 运行时里加载也不会抛 ReferenceError。

                                                         

/** 读取字符串配置; 缺失返回空串, 绝不回退到硬编码默认值。 */
function readEnv(env        , name        )         {
  const fromBag = env ? env[name] : undefined;
  if (typeof fromBag === "string" && fromBag.trim()) return fromBag.trim();
  if (typeof fromBag === "number" || typeof fromBag === "boolean") {
    return String(fromBag);
  }

  const g = globalThis     
                                                                 
                                                           
   ;

  try {
    const d = g.Deno?.env?.get?.(name);
    if (d && d.trim()) return d.trim();
  } catch {
    // 未授予 --allow-env 时 Deno.env.get 会抛, 降级继续
  }

  try {
    const p = g.process?.env?.[name];
    if (p && p.trim()) return p.trim();
  } catch {
    // 无 process 的运行时
  }

  return "";
}

function requireEnv(env        , name        )         {
  const value = readEnv(env, name);
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

/** 逗号/分号/换行分隔的列表型配置。 */
function readEnvList(env        , name        )           {
  return readEnv(env, name)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 布尔开关; 未配置返回 false, 只有显式真值字面量算开启。 */
function readEnvFlag(env        , name        )          {
  return ["true", "1", "yes", "on"].includes(readEnv(env, name).toLowerCase());
}

// ==== 源: cards/github.ts ====
// GitHub REST API 访问层：进程内缓存 + 相同请求合并 + 限流/404 识别
//
// 未认证调用 GitHub 只有 60 次/小时额度，而 /languages 一张卡就要打几十个
// /languages 子接口，所以缓存与请求合并是必需项而不是优化项。

                                       
                                                                      

const API_BASE = "https://api.github.com";
const PER_PAGE = 100;
const MAX_REPO_PAGES = 3;
const DEFAULT_TTL_MS = 5 * 60_000;
const LANG_TTL_MS = 10 * 60_000;
// 不存在的用户也会被反复请求，用很短的负缓存挡住重复打靶
const FAILURE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 512;

                      
                    
                  
                    
 

const cache = new Map                    ();
const inflight = new Map                          ();

// 模块作用域的密钥只是"本实例当前请求"的快照，不代表进程级配置：
// 隔离型运行时（Workers / EdgeOne）实例会跨请求复用，所以 handler 每个请求都会重设一次。
let token = "";

/**
 * 入口层每个请求调用一次。env 是该平台的变量袋：
 * Cloudflare Workers 的 env、EdgeOne 的 context.env；Deno/Node 传 undefined 即可，
 * readEnv 会自己退到 Deno.env / process.env。
 */
function setGitHubToken(env         )       {
  token = readEnv(env, "GITHUB_TOKEN");
}

// GitHub 登录名规则：字母数字，连字符不首不尾也不连续，最长 39
const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

function assertUsername(raw        )         {
  if (!USERNAME_RE.test(raw)) {
    throw new CardError(`用户名 "${raw}" 不合法`, {
      kind: "not_found",
      hint: "GitHub 用户名只能包含字母、数字和单个连字符",
    });
  }
  return raw;
}

function cacheSet(path        , entry            )       {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [key, value] of cache) {
      if (value.expiresAt <= now) cache.delete(key);
    }
    while (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }
  cache.set(path, entry);
}

function remember(path        , error           )            {
  cacheSet(path, { expiresAt: Date.now() + FAILURE_TTL_MS, error });
  return error;
}

async function send   (path        , ttlMs        )             {
  const headers                         = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-cards",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res          ;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers });
  } catch {
    throw new CardError("无法连接 GitHub API", {
      kind: "upstream",
      hint: "网络抖动，稍后重试即可",
    });
  }

  if (res.status === 404) {
    throw remember(path, new CardError("GitHub 用户或仓库不存在", {
      kind: "not_found",
      hint: "请检查用户名是否正确",
    }));
  }
  if (res.status === 403 || res.status === 429) {
    if (res.headers.get("x-ratelimit-remaining") === "0") {
      const resetMs = Number(res.headers.get("x-ratelimit-reset") ?? 0) * 1000;
      const mins = resetMs
        ? Math.max(1, Math.round((resetMs - Date.now()) / 60_000))
        : 0;
      throw remember(path, new CardError("已触发 GitHub 限流", {
        kind: "rate_limited",
        hint: mins
          ? `约 ${mins} 分钟后恢复，建议为服务配置 GITHUB_TOKEN`
          : "稍后重试，建议为服务配置 GITHUB_TOKEN",
      }));
    }
    throw remember(path, new CardError("GitHub API 拒绝了这次请求", {
      kind: "upstream",
      hint: "可能是二级限流，稍后重试",
    }));
  }
  if (!res.ok) {
    throw remember(path, new CardError(`GitHub API 返回 ${res.status}`, {
      kind: "upstream",
      hint: "稍后重试",
    }));
  }
  // 204：仓库没有任何语言数据
  if (res.status === 204) {
    cacheSet(path, { expiresAt: Date.now() + ttlMs, value: null });
    return null     ;
  }

  let value   ;
  try {
    value = await res.json()     ;
  } catch {
    throw new CardError("GitHub API 返回了非 JSON 内容", { kind: "upstream" });
  }
  cacheSet(path, { expiresAt: Date.now() + ttlMs, value });
  return value;
}

function ghJson   (path        , ttlMs = DEFAULT_TTL_MS)             {
  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.error ? Promise.reject(hit.error) : Promise.resolve(hit.value     );
  }
  const pending = inflight.get(path);
  if (pending) return pending              ;

  const request = send   (path, ttlMs).finally(() => inflight.delete(path));
  inflight.set(path, request);
  return request;
}

function fetchUser(username        )                      {
  return ghJson            (`/users/${encodeURIComponent(username)}`);
}

/**
 * 用户名下的非 fork 仓库。分页拉取，避免仓库数 >100 时 star/fork 统计漏算。
 */
async function fetchOwnRepos(username        )                        {
  const name = encodeURIComponent(username);
  const repos               = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const batch = await ghJson              (
      `/users/${name}/repos?per_page=${PER_PAGE}&page=${page}&sort=updated&direction=desc`,
    ) ?? [];
    for (const repo of batch) {
      if (!repo.fork) repos.push(repo);
    }
    if (batch.length < PER_PAGE) break;
  }
  return repos;
}

async function fetchEvents(username        )                         {
  const name = encodeURIComponent(username);
  const events = await ghJson               (
    `/users/${name}/events?per_page=${PER_PAGE}`,
  );
  return Array.isArray(events) ? events : [];
}

/** 按 owner/repo 精确取仓库，供 pinned 使用；不存在时返回 null。 */
function fetchRepo(
  username        ,
  repoName        ,
)                             {
  const path =
    `/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}`;
  return ghJson            (path).catch((err         ) => {
    if (err instanceof CardError && err.kind === "not_found") return null;
    throw err;
  });
}

function languagePath(languagesUrl        )         {
  if (languagesUrl.startsWith(API_BASE)) {
    return languagesUrl.slice(API_BASE.length);
  }
  return languagesUrl.startsWith("/") ? languagesUrl : "";
}

/**
 * 汇总各仓库的字节数。逐仓库串行请求会放大延迟，这里做有限并发；
 * 单个仓库缺数据不影响整张卡，但限流必须冒泡到入口层。
 */
async function sumLanguageBytes(
  repos              ,
  opts                                           = {},
)                                  {
  const queue = repos.slice(0, opts.limit ?? 40);
  const workerCount = Math.min(opts.concurrency ?? 8, queue.length);
  const totals                         = {};
  let cursor = 0;

  async function worker()                {
    while (cursor < queue.length) {
      const repo = queue[cursor++];
      const path = languagePath(repo.languages_url);
      if (!path) continue;
      let langs                               ;
      try {
        langs = await ghJson                        (path, LANG_TTL_MS);
      } catch (err) {
        if (err instanceof CardError && err.kind === "rate_limited") throw err;
        continue;
      }
      if (!langs) continue;
      for (const [lang, bytes] of Object.entries(langs)) {
        if (typeof bytes === "number") {
          totals[lang] = (totals[lang] ?? 0) + bytes;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return totals;
}

// ==== 源: cards/activity.ts ====
// 活跃度卡片 - 最近 GitHub 事件摘要

                                        

const ACTIVITY_WIDTH = 400;
const MAX_EVENTS_SHOWN = 3;

const EVENT_META                                                  = {
  PushEvent: { emoji: "📤", desc: "推送了代码" },
  PullRequestEvent: { emoji: "🔄", desc: "提交了 PR" },
  PullRequestReviewEvent: { emoji: "🔍", desc: "审查了 PR" },
  IssuesEvent: { emoji: "🐛", desc: "操作了 Issue" },
  IssueCommentEvent: { emoji: "💬", desc: "评论了 Issue" },
  WatchEvent: { emoji: "⭐", desc: "收藏了仓库" },
  ForkEvent: { emoji: "🍴", desc: "Fork 了仓库" },
  CreateEvent: { emoji: "📝", desc: "创建了分支/标签" },
  DeleteEvent: { emoji: "🗑️", desc: "删除了分支/标签" },
  ReleaseEvent: { emoji: "🎉", desc: "发布了版本" },
  PublicEvent: { emoji: "🌍", desc: "开源了项目" },
};

const DEFAULT_META = { emoji: "📌", desc: "进行了操作" };

async function renderActivityCard(
  username        ,
  theme       ,
)                  {
  const events = await fetchEvents(username);

  if (events.length === 0) {
    const lines = startCard(theme, ACTIVITY_WIDTH, 120, "⚡ 最近活跃", `@${username}`, "gc-act");
    lines.push(
      textEl(20, 90, "暂无最近活动记录", { size: 13, fill: theme.text }),
    );
    return finishCard(lines);
  }

  const counts = { push: 0, pr: 0, issue: 0, star: 0 };
  for (const e of events) {
    if (e.type === "PushEvent") counts.push++;
    else if (e.type === "PullRequestEvent" || e.type === "PullRequestReviewEvent") counts.pr++;
    else if (e.type === "IssuesEvent" || e.type === "IssueCommentEvent") counts.issue++;
    else if (e.type === "WatchEvent") counts.star++;
  }

  const shown = events.slice(0, MAX_EVENTS_SHOWN);
  const height = 148 + shown.length * 22 + 12;

  const lines = startCard(
    theme,
    ACTIVITY_WIDTH,
    height,
    "⚡ 最近活跃",
    `@${username} · 基于最近 ${events.length} 条事件`,
    "gc-act",
  );

  const stats = [
    { label: "📤 推送", value: counts.push, color: theme.green },
    { label: "🔄 PR", value: counts.pr, color: theme.accent },
    { label: "🐛 Issue", value: counts.issue, color: theme.orange },
    { label: "⭐ Star", value: counts.star, color: "#e3b341" },
  ];
  const tileW = 86;
  const tileGap = 8;
  stats.forEach((stat, i) => {
    const x = 16 + i * (tileW + tileGap);
    lines.push(
      `  <rect x="${x}" y="64" width="${tileW}" height="54" rx="9" fill="${theme.bg}" fill-opacity="0.55" stroke="${theme.border}" stroke-opacity="0.6"/>`,
    );
    lines.push(
      textEl(x + tileW / 2, 90, String(stat.value), {
        size: 20,
        weight: 700,
        anchor: "middle",
        fill: stat.color,
      }),
    );
    lines.push(
      textEl(x + tileW / 2, 107, stat.label, {
        size: 11,
        anchor: "middle",
        fill: theme.text,
      }),
    );
  });

  lines.push(
    `  <line x1="16" y1="130" x2="${ACTIVITY_WIDTH - 16}" y2="130" stroke="${theme.border}" stroke-width="1"/>`,
  );

  shown.forEach((event, i) => {
    const y = 140 + i * 22;
    const meta = EVENT_META[event.type] ?? DEFAULT_META;
    const fullName = event.repo?.name ?? "";
    // repo.name 形如 owner/repo，只展示仓库名部分
    const repo = fullName.includes("/")
      ? fullName.slice(fullName.indexOf("/") + 1)
      : fullName || "未知仓库";
    lines.push(
      `  <rect x="16" y="${y}" width="${ACTIVITY_WIDTH - 32}" height="20" rx="6" fill="${theme.accent}" fill-opacity="0.06"/>`,
    );
    lines.push(
      textEl(24, y + 14, `${meta.emoji} ${meta.desc}`, {
        size: 12,
        fill: theme.text,
      }),
    );
    lines.push(
      textEl(215, y + 14, truncate(repo, 20), {
        size: 12,
        fill: theme.accent,
      }),
    );
    lines.push(
      textEl(ACTIVITY_WIDTH - 24, y + 14, timeAgo(event.created_at), {
        size: 11,
        anchor: "end",
        fill: theme.text,
      }),
    );
  });

  return finishCard(lines);
}

// ==== 源: cards/languages.ts ====
// 编程语言统计卡片 - 圆环图 / 条形图展示仓库语言分布

                                        

const LANGUAGES_WIDTH = 400;
const TOP_N = 8;

                 
               
              
                
 

                           
                  
                         
 

async function renderLanguagesCard(
  username        ,
  theme       ,
  options                 ,
)                  {
  const { hide = [], layout = "pie" } = options;

  const repos = await fetchOwnRepos(username);
  const bytesByLang = await sumLanguageBytes(repos);

  // README 文档写的是 hide=html,css，GitHub 返回的是 HTML/CSS，必须忽略大小写
  const hidden = new Set(hide.map((h) => h.toLowerCase()));
  const visible = Object.entries(bytesByLang).filter(
    ([lang]) => !hidden.has(lang.toLowerCase()),
  );
  const total = visible.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total === 0) {
    throw new CardError("没有找到编程语言数据", {
      hint: "该用户可能还没有包含代码的公开仓库",
    });
  }

  const sorted = visible.sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);

  // Top N 之外归入“其他”，保证百分比闭合到 100%，圆环不留缺口
  const slices          = top.map(([name, bytes]) => ({
    name,
    pct: bytes / total,
    color: langColor(name),
  }));
  if (rest.length > 0) {
    const restBytes = rest.reduce((sum, [, bytes]) => sum + bytes, 0);
    slices.push({
      name: `其他 (${rest.length})`,
      pct: restBytes / total,
      color: FALLBACK_COLOR,
    });
  }

  return layout === "bar"
    ? renderBar(slices, username, theme)
    : renderPie(slices, sorted.length, username, theme);
}

function renderPie(
  slices         ,
  langCount        ,
  username        ,
  theme       ,
)         {
  const cx = 100;
  const cy = 130;
  const r = 60;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * r;

  const legendX = 190;
  const legendY0 = 75;
  const legendRow = 22;
  // 高度随图例行数增长，超出画布的图例不再被静默裁掉
  const height = Math.max(220, legendY0 + slices.length * legendRow + 16);

  const lines = startCard(theme, LANGUAGES_WIDTH, height, "🔤 编程语言", `@${username}`, "gc-lang");

  // 底轨：让圆环在数据稀疏时也有完整的轮廓
  lines.push(
    `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.border}" stroke-opacity="0.35" stroke-width="${strokeWidth}"/>`,
  );

  let offset = 0;
  for (const slice of slices) {
    const dash = slice.pct * circumference;
    lines.push(
      `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${slice.color}" stroke-width="${strokeWidth}" stroke-dasharray="${round(dash)} ${
        round(circumference - dash)
      }" stroke-dashoffset="${round(-offset)}" transform="rotate(-90 ${cx} ${cy})" opacity="0.9"/>`,
    );
    offset += dash;
  }

  lines.push(
    textEl(cx, cy - 5, String(langCount), {
      size: 14,
      weight: 700,
      anchor: "middle",
      fill: theme.title,
    }),
  );
  lines.push(
    textEl(cx, cy + 12, "种语言", {
      size: 11,
      anchor: "middle",
      fill: theme.text,
    }),
  );

  slices.forEach((slice, i) => {
    const y = legendY0 + i * legendRow;
    lines.push(
      `  <rect x="${legendX}" y="${y - 8}" width="12" height="12" rx="3" fill="${slice.color}"/>`,
    );
    lines.push(
      textEl(legendX + 18, y + 2, truncate(slice.name, 24), {
        size: 12,
        fill: theme.text,
      }),
    );
    lines.push(
      textEl(LANGUAGES_WIDTH - 20, y + 2, pct(slice.pct), {
        size: 12,
        anchor: "end",
        fill: theme.accent,
      }),
    );
  });

  return finishCard(lines);
}

function renderBar(slices         , username        , theme       )         {
  const barH = 20;
  const gap = 8;
  const barX = 130;
  // 条形区域右侧要留出百分比文字的位置，否则占比高的语言会画出卡片外
  const barMaxW = LANGUAGES_WIDTH - barX - 70;
  const height = 60 + slices.length * (barH + gap) + 20;

  const lines = startCard(theme, LANGUAGES_WIDTH, height, "🔤 编程语言", `@${username}`, "gc-lang");

  slices.forEach((slice, i) => {
    const y = 65 + i * (barH + gap);
    lines.push(
      textEl(20, y + 15, truncate(slice.name, 18), {
        size: 12,
        fill: theme.text,
      }),
    );
    lines.push(
      `  <rect x="${barX}" y="${y}" width="${barMaxW}" height="${barH}" rx="5" fill="${theme.border}" fill-opacity="0.3"/>`,
    );
    lines.push(
      `  <rect x="${barX}" y="${y}" width="${
        round(Math.max(2, barMaxW * slice.pct))
      }" height="${barH}" rx="5" fill="${slice.color}" opacity="0.85"/>`,
    );
    lines.push(
      textEl(LANGUAGES_WIDTH - 20, y + 15, pct(slice.pct), {
        size: 12,
        anchor: "end",
        fill: theme.text,
      }),
    );
  });

  return finishCard(lines);
}

function pct(value        )         {
  return `${(value * 100).toFixed(1)}%`;
}

function round(value        )         {
  return Math.round(value * 100) / 100;
}

// ==== 源: cards/repos.ts ====
// 仓库卡片 - 双列展示精选仓库

                                        
                                             

const PAD = 10;
const CARD_W = 300;
const CARD_H = 110;
const GAP_X = 10;
const GAP_Y = 10;
const COLS = 2;
const MAX_CELLS = 12;
const CELL_Y0 = 62;

                        
                 
                                         
                    
 

async function renderReposCard(
  username        ,
  theme       ,
  options              ,
)                  {
  const { count = 6, sort = "updated", pinned } = options;

  let repos              ;
  if (pinned && pinned.length > 0) {
    // 按名字逐个精确拉取：不再受列表接口分页顺序和 fork 过滤的影响，
    // 也保证展示顺序与 pinned 参数一致
    const found = await Promise.all(
      pinned.slice(0, MAX_CELLS).map((name) => fetchRepo(username, name)),
    );
    repos = found.filter((r)                  => r !== null);
    if (repos.length === 0) {
      throw new CardError("指定的仓库都不存在", {
        hint: "请检查 pinned 参数中的仓库名",
      });
    }
  } else {
    repos = await fetchOwnRepos(username);
    if (sort === "stars") {
      repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
    } else if (sort === "created") {
      repos.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    repos = repos.slice(0, Math.min(count, MAX_CELLS));
    if (repos.length === 0) {
      throw new CardError("没有找到仓库", {
        hint: "该用户还没有公开的非 fork 仓库",
      });
    }
  }

  const rows = Math.ceil(repos.length / COLS);
  // 宽度把两侧留白和列间距都算进去，右列边框不再被画布裁掉
  const width = PAD * 2 + COLS * CARD_W + (COLS - 1) * GAP_X;
  const height = CELL_Y0 + rows * CARD_H + (rows - 1) * GAP_Y + PAD;

  const lines = startCard(theme, width, height, "📦 精选仓库", `@${username}`, "gc-repos");

  repos.forEach((repo, i) => {
    const x = PAD + (i % COLS) * (CARD_W + GAP_X);
    const y = CELL_Y0 + Math.floor(i / COLS) * (CARD_H + GAP_Y);

    const desc = repo.description?.trim()
      ? truncate(repo.description.trim(), 84)
      : "暂无描述";
    const lang = repo.language ?? "未知";

    lines.push(
      `  <rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="10" fill="${theme.bg}" fill-opacity="0.5" stroke="${theme.border}" stroke-opacity="0.7"/>`,
    );
    lines.push(
      textEl(x + 15, y + 26, truncate(repo.name, 66), {
        size: 14,
        weight: 600,
        fill: theme.accent,
      }),
    );
    lines.push(textEl(x + 15, y + 50, desc, { size: 12, fill: theme.text }));
    lines.push(
      `  <circle cx="${x + 20}" cy="${y + 78}" r="5" fill="${langColor(repo.language)}"/>`,
    );
    lines.push(
      textEl(x + 32, y + 82, truncate(lang, 22), { size: 11, fill: theme.text }),
    );
    lines.push(
      textEl(x + CARD_W - 75, y + 82, `⭐ ${repo.stargazers_count}`, {
        size: 11,
        anchor: "end",
        fill: theme.text,
      }),
    );
    lines.push(
      textEl(x + CARD_W - 15, y + 82, `⑂ ${repo.forks_count}`, {
        size: 11,
        anchor: "end",
        fill: theme.text,
      }),
    );
  });

  return finishCard(lines);
}

// ==== 源: cards/stats.ts ====
// 统计卡片 - 仓库数 / Star / 提交 / 关注者

                                        
                                                          

const STATS_WIDTH = 450;
const HEIGHT = 210;
const TILE_W = 200;
const TILE_H = 38;
const TILE_Y0 = 66;
const TILE_ROW = 46;

                
                
                
               
 

                        
                     
                      
 

/** events 接口偶发失败不该让整张卡变成错误卡，但限流要冒泡。 */
async function orFallback   (promise            , fallback   )             {
  return promise.catch((err         ) => {
    if (err instanceof CardError && err.kind === "rate_limited") throw err;
    return fallback;
  });
}

async function renderStatsCard(
  username        ,
  theme       ,
  options              ,
)                  {
  const { hideRank = false, showIcons = false } = options;

  const [user, repos, events] = await Promise.all([
    fetchUser(username),
    fetchOwnRepos(username),
    orFallback               (fetchEvents(username), []),
  ]);

  const stars = sum(repos, (r) => r.stargazers_count);
  const forks = sum(repos, (r) => r.forks_count);
  // events 只覆盖最近 90 天，就按这个口径标注，不再对外估一个“总提交数”
  const commits = events.reduce(
    (total, e) =>
      e.type === "PushEvent"
        ? total + (e.payload?.commits?.length ?? 1)
        : total,
    0,
  );

  const stats         = [
    { label: "仓库", value: user.public_repos, icon: "📦" },
    { label: "Star", value: stars, icon: "⭐" },
    { label: "近90天提交", value: commits, icon: "💻" },
    { label: "Fork", value: forks, icon: "🍴" },
    { label: "关注者", value: user.followers, icon: "👥" },
    { label: "正在关注", value: user.following, icon: "👤" },
  ];

  const lines = startCard(
    theme,
    STATS_WIDTH,
    HEIGHT,
    "📊 GitHub 统计",
    `@${user.login}`,
    "gc-stats",
  );
  const { accent, green, orange, text, bg, border } = theme;

  const columns = [stats.slice(0, 3), stats.slice(3, 6)];
  columns.forEach((column, colIndex) => {
    const x = colIndex === 0 ? 16 : 234;
    column.forEach((stat, rowIndex) => {
      const y = TILE_Y0 + rowIndex * TILE_ROW;
      lines.push(
        `  <rect x="${x}" y="${y}" width="${TILE_W}" height="${TILE_H}" rx="9" fill="${bg}" fill-opacity="0.55" stroke="${border}" stroke-opacity="0.6"/>`,
      );
      if (showIcons) {
        lines.push(textEl(x + 14, y + 24, stat.icon, { size: 13, fill: text }));
      }
      lines.push(
        textEl(showIcons ? x + 36 : x + 14, y + 24, stat.label, {
          size: 12,
          fill: text,
        }),
      );
      lines.push(
        textEl(x + TILE_W - 14, y + 25, String(stat.value), {
          size: 15,
          weight: 700,
          anchor: "end",
          fill: accent,
        }),
      );
    });
  });

  if (!hideRank) {
    const percentile = estimatePercentile({
      followers: user.followers,
      stars,
      repos: user.public_repos,
    });
    const color = percentile <= 3 ? green : percentile <= 6 ? orange : accent;
    const pillW = 92;
    const pillX = STATS_WIDTH - 16 - pillW;
    lines.push(
      `  <rect x="${pillX}" y="17" width="${pillW}" height="24" rx="12" fill="${color}" fill-opacity="0.16" stroke="${color}" stroke-opacity="0.45"/>`,
    );
    lines.push(
      textEl(pillX + pillW / 2, 33, `全球前 ${percentile}%`, {
        size: 11,
        weight: 600,
        anchor: "middle",
        fill: color,
      }),
    );
  }

  return finishCard(lines);
}

function sum(repos              , pick                              )         {
  return repos.reduce((total, repo) => total + pick(repo), 0);
}

const SCORE_WEIGHTS = { followers: 2, stars: 3, repos: 1 };
// 归一化上限与权重成对定义：改一处必改另一处，否则分位会整体偏移
const SCORE_CEILING = { followers: 10_000, stars: 1_000, repos: 100 };

function estimatePercentile(
  input                                                     ,
)         {
  const score = SCORE_WEIGHTS.followers * Math.log1p(input.followers) +
    SCORE_WEIGHTS.stars * Math.log1p(input.stars) +
    SCORE_WEIGHTS.repos * Math.log1p(input.repos);
  const maxScore = SCORE_WEIGHTS.followers *
    Math.log1p(SCORE_CEILING.followers) +
    SCORE_WEIGHTS.stars * Math.log1p(SCORE_CEILING.stars) +
    SCORE_WEIGHTS.repos * Math.log1p(SCORE_CEILING.repos);
  const percentile = Math.round((1 - score / maxScore) * 100);
  return Math.max(1, Math.min(100, percentile));
}

// ==== 源: cards/theme.ts ====
// 主题色板

                        
             
               
                 
                
               
                 
                
                 
              
                 
 

const THEMES                        = {
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

const THEME_NAMES           = Object.keys(THEMES);
const DEFAULT_THEME = "default";

function getTheme(name               )        {
  if (name !== null && name in THEMES) return THEMES[name];
  return THEMES[DEFAULT_THEME];
}

// ==== 源: deno_index.ts ====
// github-cards - GitHub Profile 动态卡片生成器
// 部署到 Deno Deploy，为 GitHub 主页生成动态 SVG 卡片
// 使用方式：https://你的域名.deno.dev/stats?username=fanxing724

                                             

const DEFAULT_USERNAME = "fanxing724";
const OK_CACHE =
  "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";
// 错误卡片绝不能长缓存，否则一次限流会在 README 里挂一个小时
const ERROR_CACHE = "no-store";

                     
                   
               
                          
                     

const ROUTES = new Map                      ([
  [
    "/stats",
    (username, theme, params) =>
      renderStatsCard(username, theme, {
        hideRank: flag(params, "hide_rank"),
        showIcons: flag(params, "show_icons"),
      }),
  ],
  [
    "/languages",
    (username, theme, params) =>
      renderLanguagesCard(username, theme, {
        hide: listParam(params, "hide"),
        layout: params.get("layout") === "bar" ? "bar" : "pie",
      }),
  ],
  ["/activity", (username, theme) => renderActivityCard(username, theme)],
  [
    "/repos",
    (username, theme, params) =>
      renderReposCard(username, theme, {
        count: intParam(params, "count", { def: 6, min: 1, max: 12 }),
        sort: sortParam(params),
        pinned: listParam(params, "pinned"),
      }),
  ],
]);

/** 裸传 ?show_icons 视为 true；显式传值时只有真值字面量算开启 */
function flag(params                 , name        )          {
  const value = params.get(name);
  if (value === null) return false;
  if (value === "") return true;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

function intParam(
  params                 ,
  name        ,
  opts                                           ,
)         {
  const raw = params.get(name);
  if (raw === null) return opts.def;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return opts.def;
  return Math.min(opts.max, Math.max(opts.min, parsed));
}

function listParam(params                 , name        )           {
  return params.get(name)?.split(",").map((s) => s.trim()).filter(Boolean) ??
    [];
}

function sortParam(
  params                 ,
)                                  {
  const value = params.get("sort");
  return value === "created" || value === "stars" ? value : "updated";
}

function svgResponse(svg        , cacheControl        )           {
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": cacheControl,
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function indexPage(base        )         {
  const themeSwatches = THEME_NAMES.map((name) => {
    const t = THEMES[name];
    return `<span class="swatch"><i style="background:${t.accent};box-shadow:0 0 0 3px ${t.card},0 0 0 4px ${t.border}"></i>${name}</span>`;
  }).join("");

  const card = (
    icon        ,
    title        ,
    url        ,
    params          ,
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
async function handler(
  req         ,
  env         ,
  basePath = "",
)                    {
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

export function onRequest(context) {
  const { env, request } = context;
  return new Response(
    JSON.stringify({
      ok: true,
      version: new Date().toISOString().slice(0, 10),
      config: { GITHUB_TOKEN: !!readEnv(env, "GITHUB_TOKEN") },
      envType: typeof env,
      globals: {
        caches: typeof caches,
        Deno: typeof Deno,
        process: typeof process,
      },
      receivedPathname: new URL(request.url).pathname,
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export default onRequest;
