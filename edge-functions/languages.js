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

/**
 * 给定可用宽度和字号,算 displayWidth 上限。
 *
 * truncate 收的是"字数",但卡片格子是像素宽的 —— 之前直接写 84 这种常数,
 * 结果 300px 的格子里塞进约 500px 的文字,描述串到隔壁格子。这里按字形宽度反推:
 * displayWidth 把 CJK 记 2、拉丁记 1,正好对应"CJK 全角=1em、拉丁约半角=0.5em",
 * 所以 1 个单位 ≈ 0.5em ≈ size/2 像素。取 0.5 而不是更小的系数是故意留余量,
 * 西文粗体和数字偏宽,宁可少一个字也不要溢出。
 */
function fitUnits(px        , size        )         {
  return Math.max(4, Math.floor(px / (size * 0.5)));
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
// events 接口单页 100 条、单用户最多吐 300 条 —— 拉满才能对得起"近 90 天"的口径
const MAX_EVENT_PAGES = 3;
// 拉满 10 页 = 1000 个仓库;再往上的人,统计卡片本身已经不具代表性了
const MAX_REPO_PAGES = 10;
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
  // 404 与认证状态无关，匿名下也可以负缓存挡住重复打靶；
  // 限流/上游错误是认证相关的（匿名 60 次/小时不代表认证请求也会失败），
  // 匿名时落缓存会让随后的认证请求误报，所以只有带 token 才记。
  if (token || error.kind === "not_found") {
    cacheSet(path, { expiresAt: Date.now() + FAILURE_TTL_MS, error });
  }
  return error;
}

async function send   (path        , ttlMs        )             {
  const headers                         = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-cards",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const doSend                   = async () => {
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
      return null     ;
    }

    try {
      return await res.json()     ;
    } catch {
      throw new CardError("GitHub API 返回了非 JSON 内容", { kind: "upstream" });
    }
  };

  const value = await doSend();
  // 缓存必须区分认证状态：同一实例里 token 由入口层逐请求重设，
  // 匿名响应若落缓存，认证请求会命中"匿名 60 次/小时"的负缓存误报限流；
  // 反向污染则让匿名请求白嫖认证数据。简单起见：匿名响应一律不落缓存。
  if (token) {
    cacheSet(path, { expiresAt: Date.now() + ttlMs, value });
  }
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
  const events                = [];
  for (let page = 1; page <= MAX_EVENT_PAGES; page++) {
    const batch = await ghJson               (
      `/users/${name}/events?per_page=${PER_PAGE}&page=${page}`,
    ) ?? [];
    if (!Array.isArray(batch)) break;
    events.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  // events 接口同一事件可能重复出现,提交数按它累计会被虚高
  const seen = new Set        ();
  return events.filter((e) => {
    const id = e.id ?? `${e.type}:${e.repo?.name}:${e.created_at}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
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

/** 单仓库的语言字节数;给 languages 卡的 repo 模式用。空对象表示无语言数据。 */
async function fetchRepoLanguages(
  username        ,
  repoName        ,
)                                         {
  const repo = await fetchRepo(username, repoName);
  if (!repo) return null;
  const path = languagePath(repo.languages_url);
  if (!path) return {};
  return ghJson                        (path, LANG_TTL_MS);
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
  options                  = {},
)                  {
  const events = await fetchEvents(username);

  if (events.length === 0) {
    const lines = startCard(theme, ACTIVITY_WIDTH, 120, options.title ?? "⚡ 最近活跃", `@${username}`, "gc-act");
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
    options.title ?? "⚡ 最近活跃",
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

// ==== 源: cards/badge.ts ====
// 徽章卡片 - shields.io 风格的单行小徽章
//
// 用途是 README 顶部的签名栏,和大卡互补。尺寸刻意做小(一行高),所以
// 不走 startCard 的骨架 —— 那套是为 400px+ 的大卡设计的。

                                        

const H = 20;

function esc(s        )         {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ));
}

// shields 的等宽估算:大写/数字按 7px,小写按 6.5px,空格 4px —— 粗略但够用,
// 宁可左右留白稍多也不要文字撞边框
function textWidth(s        )         {
  let w = 0;
  for (const ch of s) {
    if (/[A-Z0-9@]/.test(ch)) w += 7;
    else if (ch === " ") w += 4;
    else if (ch.codePointAt(0)  > 0x2e80) w += 11;
    else w += 6.5;
  }
  return Math.round(w);
}

function badge(
  label        ,
  value        ,
  colors                                                                          ,
)                                 {
  const font =
    "font-family=&quot;Segoe UI&quot;, -apple-system, sans-serif font-size=&quot;11&quot;";
  const lw = textWidth(label) + 16;
  const vw = textWidth(value) + 16;
  const w = lw + vw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(label)}: ${esc(value)}">` +
    `<rect width="${lw}" height="${H}" rx="3" fill="${colors.leftBg}"/>` +
    `<rect x="${lw - 4}" width="${vw + 4}" height="${H}" rx="3" fill="${colors.rightBg}"/>` +
    `<rect x="${lw - 4}" width="4" height="${H}" fill="${colors.rightBg}"/>` +
    `<g ${font} fill="${colors.leftText}"><text x="${lw / 2}" y="14" text-anchor="middle">${esc(label)}</text></g>` +
    `<g ${font} font-weight="600" fill="${colors.rightText}"><text x="${lw + vw / 2}" y="14" text-anchor="middle">${esc(value)}</text></g>` +
    `</svg>`;
  return { svg, width: w };
}

const METRICS                  
                
                  
                                                      
                                                               
                                                                                 
                        
   = {
  stars: {
    label: "stars",
    compute: (c) => c.repos.reduce((t, r) => t + r.stargazers_count, 0),
  },
  forks: {
    label: "forks",
    compute: (c) => c.repos.reduce((t, r) => t + r.forks_count, 0),
  },
  repos: {
    label: "repos",
    compute: (c) => c.user.public_repos,
  },
  followers: {
    label: "followers",
    compute: (c) => c.user.followers,
  },
  commits90d: {
    label: "commits (90d)",
    compute: (c) =>
      c.events.reduce((t, e) => {
        if (e.type !== "PushEvent") return t;
        return t + (e.payload?.size ?? e.payload?.commits?.length ?? 1);
      }, 0),
  },
};

                               
                        
                     
             
                               
 

/**
 * 一张图里排多个徽章。行内排布时水平拼接,纵向时上下堆叠。
 */
async function renderBadgeCard(
  username        ,
  theme       ,
  options               = {},
)                  {
  const wanted = (options.metrics?.length ? options.metrics : Object.keys(METRICS))
    .filter((m) => m in METRICS);
  if (wanted.length === 0) {
    wanted.push("stars", "repos", "followers");
  }

  const [user, repos, events] = await Promise.all([
    fetchUser(username),
    fetchOwnRepos(username),
    fetchEvents(username).catch(() => []),
  ]);

  const colors = {
    leftBg: theme.card,
    rightBg: theme.accent,
    leftText: theme.text,
    rightText: theme.bg,
  };

  const badges = wanted.map((name) => {
    const m = METRICS[name];
    return badge(
      m.label,
      String(m.compute({ user, repos, events })),
      colors,
    );
  });

  if (options.direction === "column") {
    const width = Math.max(...badges.map((b) => b.width));
    const totalH = badges.length * (H + 4);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalH}" viewBox="0 0 ${width} ${totalH}" role="img" aria-label="${esc(username)} badges">` +
      badges.map((b, i) => `<g transform="translate(0 ${i * (H + 4)})">${b.svg.replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`).join("") +
      `</svg>`;
  }

  const totalW = badges.reduce((t, b) => t + b.width + 6, -6);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${H}" viewBox="0 0 ${totalW} ${H}" role="img" aria-label="${esc(username)} badges">` +
    badges.map((b, i) => {
      const x = badges.slice(0, i).reduce((t, bb) => t + bb.width + 6, 0);
      return `<g transform="translate(${x} 0)">${b.svg.replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`;
    }).join("") +
    `</svg>`;
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
  const { hide = [], layout = "pie", repo, title } = options;

  let bytesByLang                        ;
  let subtitle        ;
  if (repo) {
    // 单仓库模式:直接打那个仓库的 languages 接口,不拉列表再聚合
    const langs = await fetchRepoLanguages(username, repo);
    if (langs === null) {
      throw new CardError(`仓库 ${username}/${repo} 不存在`, {
        kind: "not_found",
        hint: "请检查 repo 参数",
      });
    }
    bytesByLang = langs;
    subtitle = `@${username}/${repo}`;
  } else {
    const repos = await fetchOwnRepos(username);
    bytesByLang = await sumLanguageBytes(repos);
    subtitle = `@${username}`;
  }

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

  const heading = title ?? "🔤 编程语言";
  return layout === "bar"
    ? renderBar(slices, subtitle, heading, theme)
    : renderPie(slices, sorted.length, subtitle, heading, theme);
}

function renderPie(
  slices         ,
  langCount        ,
  subtitle        ,
  heading        ,
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

  const lines = startCard(theme, LANGUAGES_WIDTH, height, heading, subtitle, "gc-lang");

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

function renderBar(
  slices         ,
  subtitle        ,
  heading        ,
  theme       ,
)         {
  const barH = 20;
  const gap = 8;
  const barX = 130;
  // 条形区域右侧要留出百分比文字的位置，否则占比高的语言会画出卡片外
  const barMaxW = LANGUAGES_WIDTH - barX - 70;
  const height = 60 + slices.length * (barH + gap) + 20;

  const lines = startCard(theme, LANGUAGES_WIDTH, height, heading, subtitle, "gc-lang");

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
  const { count = 6, sort = "updated", pinned, title } = options;

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

  const lines = startCard(theme, width, height, title ?? "📦 精选仓库", `@${username}`, "gc-repos");

  repos.forEach((repo, i) => {
    const x = PAD + (i % COLS) * (CARD_W + GAP_X);
    const y = CELL_Y0 + Math.floor(i / COLS) * (CARD_H + GAP_Y);

    // 格子内可用宽度:300 减去左右各 15 的留白
    const desc = repo.description?.trim()
      ? truncate(repo.description.trim(), fitUnits(CARD_W - 30, 12))
      : "暂无描述";
    const lang = repo.language ?? "未知";

    lines.push(
      `  <rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="10" fill="${theme.bg}" fill-opacity="0.5" stroke="${theme.border}" stroke-opacity="0.7"/>`,
    );
    lines.push(
      textEl(x + 15, y + 26, truncate(repo.name, fitUnits(CARD_W - 30, 14)), {
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
  const { hideRank = false, showIcons = false, title } = options;

  const [user, repos, events] = await Promise.all([
    fetchUser(username),
    fetchOwnRepos(username),
    orFallback               (fetchEvents(username), []),
  ]);

  const stars = sum(repos, (r) => r.stargazers_count);
  const forks = sum(repos, (r) => r.forks_count);
  // events 只覆盖最近 90 天，就按这个口径标注，不再对外估一个“总提交数”
  // 优先 payload.size：commits 数组被 GitHub 截到最多 20 条，大推送会低估
  const commits = events.reduce(
    (total, e) => {
      if (e.type !== "PushEvent") return total;
      const size = e.payload?.size ?? e.payload?.commits?.length ?? 1;
      return total + size;
    },
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
    title ?? "📊 GitHub 统计",
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

// ==== 源: cards/streak.ts ====
// 连续活跃卡片 - streak 统计 + 90 天事件热力图
//
// 口径与 stats 卡一致:数据来自 Events 接口,只有最近 90 天(预渲染名单里渲染一次,
// 自然就是"渲染时刻往前 90 天")。活跃日的定义是"当天至少有 1 条公开事件" ——
// Events 接口覆盖不到私有仓库,这不是 bug,卡片副标题里如实标注了。

                                        
                                              

const STREAK_WIDTH = 400;
const WEEKS = 13;
const CELL = 10;
const CELL_GAP = 3;
const GRID_X = 20;
const GRID_Y = 118;

                         
                 
 

/** UTC 天粒度的 key。GitHub 卡片的读者遍布时区,选哪个都不完美,UTC 是最不自作聪明的 */
function dayKey(iso        )         {
  return iso.slice(0, 10);
}

function activeDays(events               )                      {
  const days = new Map                ();
  for (const e of events) {
    const key = dayKey(e.created_at);
    days.set(key, (days.get(key) ?? 0) + 1);
  }
  return days;
}

/** 从 anchor 往前数连续活跃天。anchor 本身不活跃时返回 0(当前 streak 允许"昨天为止") */
function streakBack(days             , anchor      )         {
  let n = 0;
  const cursor = new Date(anchor);
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    // 今天还没动不代表 streak 断了:今天刚开始,昨天的链还算数
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    n++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return n;
}

function longestStreak(days             )         {
  if (days.size === 0) return 0;
  let best = 1;
  let run = 1;
  const sorted = [...days].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00Z");
    const curr = new Date(sorted[i] + "T00:00:00Z");
    const diff = (curr.getTime() - prev.getTime()) / 86_400_000;
    run = diff === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

async function renderStreakCard(
  username        ,
  theme       ,
  options                = {},
)                  {
  const events = await fetchEvents(username);
  const days = activeDays(events);
  if (days.size === 0) {
    throw new CardError("没有找到公开活动", {
      kind: "empty",
      hint: "该用户最近 90 天没有公开事件",
    });
  }

  const now = new Date();
  const current = streakBack(days, now);
  const longest = longestStreak(new Set(days.keys()));

  const height = GRID_Y + 7 * (CELL + CELL_GAP) + 38;
  const lines = startCard(
    theme,
    STREAK_WIDTH,
    height,
    options.title ?? "🔥 连续活跃",
    `@${username} · 基于最近 90 天公开事件`,
    "gc-streak",
  );
  const { accent, green, orange, text } = theme;

  const tiles = [
    { label: "当前连续", value: `${current} 天`, color: green },
    { label: "最长连续", value: `${longest} 天`, color: orange },
    { label: "活跃天数", value: `${days.size} 天`, color: accent },
    { label: "事件总数", value: String(events.length), color: text },
  ];
  const tileW = 86;
  tiles.forEach((tile, i) => {
    const x = 16 + i * (tileW + 8);
    lines.push(
      `  <rect x="${x}" y="60" width="${tileW}" height="46" rx="9" fill="${theme.bg}" fill-opacity="0.55" stroke="${theme.border}" stroke-opacity="0.6"/>`,
    );
    lines.push(
      textEl(x + tileW / 2, 82, tile.value, {
        size: 16,
        weight: 700,
        anchor: "middle",
        fill: tile.color,
      }),
    );
    lines.push(
      textEl(x + tileW / 2, 97, tile.label, {
        size: 11,
        anchor: "middle",
        fill: theme.text,
      }),
    );
  });

  // 热力图:13 周 × 7 天,列是周(旧→新),行是周几(周一在上一半,对齐 GitHub 习惯)
  const maxCount = Math.max(1, ...days.values());
  const level = (count        )         => {
    if (count === 0) return 0;
    return Math.min(4, 1 + Math.floor((count / maxCount) * 3));
  };
  const OPACITY = [0.12, 0.45, 0.65, 0.85, 1];

  // 结束在今天;列起点对齐周一,让网格边缘是完整周
  const today = new Date();
  const endOfGrid = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  ));
  // 把网格末端推到本周日:不足的格子里"未来"留空
  const daysFromMonday = (endOfGrid.getUTCDay() + 6) % 7;
  const lastColEnd = new Date(endOfGrid);
  lastColEnd.setUTCDate(lastColEnd.getUTCDate() + (6 - daysFromMonday));
  const start = new Date(lastColEnd);
  start.setUTCDate(start.getUTCDate() - (WEEKS * 7 - 1));

  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + w * 7 + d);
      const future = day.getTime() > endOfGrid.getTime();
      const count = future ? 0 : (days.get(day.toISOString().slice(0, 10)) ?? 0);
      const x = GRID_X + w * (CELL + CELL_GAP);
      const y = GRID_Y + d * (CELL + CELL_GAP);
      const lvl = future ? -1 : level(count);
      lines.push(
        `  <rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${green}" fill-opacity="${
          lvl >= 0 ? OPACITY[lvl] : 0
        }"/>`,
      );
    }
  }

  lines.push(
    textEl(GRID_X, GRID_Y + 7 * (CELL + CELL_GAP) + 14, "少", {
      size: 10,
      fill: theme.text,
    }),
  );
  for (let lvl = 0; lvl < 5; lvl++) {
    const x = GRID_X + 16 + lvl * (CELL + CELL_GAP);
    const y = GRID_Y + 7 * (CELL + CELL_GAP) + 4;
    lines.push(
      `  <rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${green}" fill-opacity="${OPACITY[lvl]}"/>`,
    );
  }
  lines.push(
    textEl(GRID_X + 16 + 5 * (CELL + CELL_GAP) + 4, GRID_Y + 7 * (CELL + CELL_GAP) + 14, "多", {
      size: 10,
      fill: theme.text,
    }),
  );

  return finishCard(lines);
}

// ==== 源: cards/art.ts ====
// Generated by node tools/art.mjs from assets/art/config.json. Do not edit.
                    
const ARTS                      = {
  "starlight": {
    "src": "data:image/webp;base64,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",
    "dim": 0.55,
    "dimLeft": 0.92
  },
  "light": {
    "src": "data:image/webp;base64,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",
    "dim": 0.28,
    "dimLeft": 0.62
  }
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
    art: ARTS.light,
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
