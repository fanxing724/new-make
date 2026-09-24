// GitHub REST API 访问层：进程内缓存 + 相同请求合并 + 限流/404 识别
//
// 未认证调用 GitHub 只有 60 次/小时额度，而 /languages 一张卡就要打几十个
// /languages 子接口，所以缓存与请求合并是必需项而不是优化项。

import { CardError } from "./common.ts";
import { readEnv } from "./env.ts";
import type { EnvBag } from "./env.ts";
import type { GitHubEvent, GitHubRepo, GitHubUser } from "./types.ts";

const API_BASE = "https://api.github.com";
const PER_PAGE = 100;
const MAX_REPO_PAGES = 3;
const DEFAULT_TTL_MS = 5 * 60_000;
const LANG_TTL_MS = 10 * 60_000;
// 不存在的用户也会被反复请求，用很短的负缓存挡住重复打靶
const FAILURE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 512;

interface CacheEntry {
  expiresAt: number;
  value?: unknown;
  error?: CardError;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

// 模块作用域的密钥只是"本实例当前请求"的快照，不代表进程级配置：
// 隔离型运行时（Workers / EdgeOne）实例会跨请求复用，所以 handler 每个请求都会重设一次。
let token = "";

/**
 * 入口层每个请求调用一次。env 是该平台的变量袋：
 * Cloudflare Workers 的 env、EdgeOne 的 context.env；Deno/Node 传 undefined 即可，
 * readEnv 会自己退到 Deno.env / process.env。
 */
export function setGitHubToken(env?: EnvBag): void {
  token = readEnv(env, "GITHUB_TOKEN");
}

// GitHub 登录名规则：字母数字，连字符不首不尾也不连续，最长 39
const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export function assertUsername(raw: string): string {
  if (!USERNAME_RE.test(raw)) {
    throw new CardError(`用户名 "${raw}" 不合法`, {
      kind: "not_found",
      hint: "GitHub 用户名只能包含字母、数字和单个连字符",
    });
  }
  return raw;
}

function cacheSet(path: string, entry: CacheEntry): void {
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

function remember(path: string, error: CardError): CardError {
  cacheSet(path, { expiresAt: Date.now() + FAILURE_TTL_MS, error });
  return error;
}

async function send<T>(path: string, ttlMs: number): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-cards",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
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
    return null as T;
  }

  let value: T;
  try {
    value = await res.json() as T;
  } catch {
    throw new CardError("GitHub API 返回了非 JSON 内容", { kind: "upstream" });
  }
  cacheSet(path, { expiresAt: Date.now() + ttlMs, value });
  return value;
}

export function ghJson<T>(path: string, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.error ? Promise.reject(hit.error) : Promise.resolve(hit.value as T);
  }
  const pending = inflight.get(path);
  if (pending) return pending as Promise<T>;

  const request = send<T>(path, ttlMs).finally(() => inflight.delete(path));
  inflight.set(path, request);
  return request;
}

export function fetchUser(username: string): Promise<GitHubUser> {
  return ghJson<GitHubUser>(`/users/${encodeURIComponent(username)}`);
}

/**
 * 用户名下的非 fork 仓库。分页拉取，避免仓库数 >100 时 star/fork 统计漏算。
 */
export async function fetchOwnRepos(username: string): Promise<GitHubRepo[]> {
  const name = encodeURIComponent(username);
  const repos: GitHubRepo[] = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const batch = await ghJson<GitHubRepo[]>(
      `/users/${name}/repos?per_page=${PER_PAGE}&page=${page}&sort=updated&direction=desc`,
    ) ?? [];
    for (const repo of batch) {
      if (!repo.fork) repos.push(repo);
    }
    if (batch.length < PER_PAGE) break;
  }
  return repos;
}

export async function fetchEvents(username: string): Promise<GitHubEvent[]> {
  const name = encodeURIComponent(username);
  const events = await ghJson<GitHubEvent[]>(
    `/users/${name}/events?per_page=${PER_PAGE}`,
  );
  return Array.isArray(events) ? events : [];
}

/** 按 owner/repo 精确取仓库，供 pinned 使用；不存在时返回 null。 */
export function fetchRepo(
  username: string,
  repoName: string,
): Promise<GitHubRepo | null> {
  const path =
    `/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}`;
  return ghJson<GitHubRepo>(path).catch((err: unknown) => {
    if (err instanceof CardError && err.kind === "not_found") return null;
    throw err;
  });
}

function languagePath(languagesUrl: string): string {
  if (languagesUrl.startsWith(API_BASE)) {
    return languagesUrl.slice(API_BASE.length);
  }
  return languagesUrl.startsWith("/") ? languagesUrl : "";
}

/**
 * 汇总各仓库的字节数。逐仓库串行请求会放大延迟，这里做有限并发；
 * 单个仓库缺数据不影响整张卡，但限流必须冒泡到入口层。
 */
export async function sumLanguageBytes(
  repos: GitHubRepo[],
  opts: { limit?: number; concurrency?: number } = {},
): Promise<Record<string, number>> {
  const queue = repos.slice(0, opts.limit ?? 40);
  const workerCount = Math.min(opts.concurrency ?? 8, queue.length);
  const totals: Record<string, number> = {};
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < queue.length) {
      const repo = queue[cursor++];
      const path = languagePath(repo.languages_url);
      if (!path) continue;
      let langs: Record<string, number> | null;
      try {
        langs = await ghJson<Record<string, number>>(path, LANG_TTL_MS);
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
