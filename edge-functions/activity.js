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
  const defs = [
    `    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `      <stop offset="0" stop-color="${theme.accent}" stop-opacity="0.14"/>`,
    `      <stop offset="1" stop-color="${theme.purple}" stop-opacity="0.05"/>`,
    `    </linearGradient>`,
  ];
  const body = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${
      escapeXml(title)
    }">`,
    `  <defs>`,
    ...defs,
  ];

  if (theme.art) {
    const { src, dim, dimLeft } = theme.art;
    body.push(
      `    <clipPath id="art-${gradientId}"><rect width="${width}" height="${height}" rx="12"/></clipPath>`,
      `    <linearGradient id="scrim-${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">`,
      `      <stop offset="0" stop-color="${theme.bg}" stop-opacity="${dimLeft}"/>`,
      `      <stop offset="0.55" stop-color="${theme.bg}" stop-opacity="${dim}"/>`,
      `      <stop offset="1" stop-color="${theme.bg}" stop-opacity="${(dim * 0.75).toFixed(2)}"/>`,
      `    </linearGradient>`,
      `  </defs>`,
      // slice = 等比缩放到铺满再裁掉溢出,绝不拉伸变形(那需要 preserveAspectRatio="none")
      `  <image href="${src}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#art-${gradientId})"/>`,
      `  <rect width="${width}" height="${height}" rx="12" fill="${theme.bg}" fill-opacity="${dim}"/>`,
      `  <rect width="${width}" height="${height}" rx="12" fill="url(#scrim-${gradientId})"/>`,
      // 卡片底色让位给插画,只留描边定形;圆角靠描边自己走,不靠遮罩
      `  <rect width="${width}" height="${height}" rx="12" fill="none" stroke="${theme.border}" stroke-width="1"/>`,
    );
  } else {
    body.push(
      `  </defs>`,
      `  <rect width="${width}" height="${height}" rx="12" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>`,
    );
  }

  body.push(
    `  <rect width="${width}" height="${height}" rx="12" fill="url(#${gradientId})"/>`,
    `  <rect x="20" y="19" width="4" height="17" rx="2" fill="${theme.accent}"/>`,
    textEl(32, 33, title, { size: 16, weight: 700, fill: theme.title }),
    textEl(32, 51, subtitle, { size: 12, fill: theme.text }),
  );
  return body;
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

// ==== 源: cards/art.ts ====
// 生成物:node tools/art.mjs /home/fanxing/下载/heng_584fcbef.webp starlight
// 源文件 26556 字节;base64 后 35431 字节(约 +33%)。
// 别手改,换图就重跑那条命令。

               
                                                            
              
                                
              
                                    
                  
 

                    

const ARTS                      = {
  starlight: {
    src: "data:image/webp;base64,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",
    dim: 0.55,
    dimLeft: 0.92,
  },
};

const ART_NAMES           = Object.keys(ARTS);

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
  // 带插画背景的一档。色板取的是画面自身的夜色与青绿,不是随便挑的对比色 ——
  // 遮罩用的就是 bg,所以卡片边缘和插画不会看出两层。
  starlight: {
    bg: "#0b1a33",
    card: "#132743",
    border: "#2b4a72",
    title: "#eaf3ff",
    text: "#a9c2e0",
    accent: "#7ce0e8",
    green: "#8ee6a8",
    orange: "#f0b06a",
    red: "#ff8f9c",
    purple: "#b9a6ff",
    art: ARTS.starlight,
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

// ==== 路由入口 ====
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "access-control-allow-methods": "GET, OPTIONS" },
    });
  }
  if (request.method !== "GET") return new Response("Not Allowed", { status: 405 });
  return handler(request, env);
}

export default onRequest;
