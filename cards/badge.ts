// 徽章卡片 - shields.io 风格的单行小徽章
//
// 用途是 README 顶部的签名栏,和大卡互补。尺寸刻意做小(一行高),所以
// 不走 startCard 的骨架 —— 那套是为 400px+ 的大卡设计的。

import { fetchEvents, fetchOwnRepos, fetchUser } from "./github.ts";
import type { Theme } from "./theme.ts";

const H = 20;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

// shields 的等宽估算:大写/数字按 7px,小写按 6.5px,空格 4px —— 粗略但够用,
// 宁可左右留白稍多也不要文字撞边框
function textWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    if (/[A-Z0-9@]/.test(ch)) w += 7;
    else if (ch === " ") w += 4;
    else if (ch.codePointAt(0)! > 0x2e80) w += 11;
    else w += 6.5;
  }
  return Math.round(w);
}

function badge(
  label: string,
  value: string,
  colors: { leftBg: string; rightBg: string; leftText: string; rightText: string },
): { svg: string; width: number } {
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

const METRICS: Record<string, {
  label: string;
  compute: (ctx: {
    user: { followers: number; public_repos: number };
    repos: { stargazers_count: number; forks_count: number }[];
    events: { type: string; payload?: { size?: number; commits?: unknown[] } }[];
  }) => string | number;
}> = {
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

export interface BadgeOptions {
  /** 要哪些指标,逗号分隔;缺省全出 */
  metrics?: string[];
  /** 排列方向 */
  direction?: "row" | "column";
}

/**
 * 一张图里排多个徽章。行内排布时水平拼接,纵向时上下堆叠。
 */
export async function renderBadgeCard(
  username: string,
  theme: Theme,
  options: BadgeOptions = {},
): Promise<string> {
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
