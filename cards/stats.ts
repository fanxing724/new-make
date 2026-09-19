// 统计卡片 - 仓库数 / Star / 提交 / 关注者

import { CardError, finishCard, startCard, textEl } from "./common.ts";
import { fetchEvents, fetchOwnRepos, fetchUser } from "./github.ts";
import type { Theme } from "./theme.ts";
import type { GitHubEvent, GitHubRepo } from "./types.ts";

const WIDTH = 450;
const HEIGHT = 210;
const TILE_W = 200;
const TILE_H = 38;
const TILE_Y0 = 66;
const TILE_ROW = 46;

interface Stat {
  label: string;
  value: number;
  icon: string;
}

interface StatsOptions {
  hideRank?: boolean;
  showIcons?: boolean;
}

/** events 接口偶发失败不该让整张卡变成错误卡，但限流要冒泡。 */
async function orFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch((err: unknown) => {
    if (err instanceof CardError && err.kind === "rate_limited") throw err;
    return fallback;
  });
}

export async function renderStatsCard(
  username: string,
  theme: Theme,
  options: StatsOptions,
): Promise<string> {
  const { hideRank = false, showIcons = false } = options;

  const [user, repos, events] = await Promise.all([
    fetchUser(username),
    fetchOwnRepos(username),
    orFallback<GitHubEvent[]>(fetchEvents(username), []),
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

  const stats: Stat[] = [
    { label: "仓库", value: user.public_repos, icon: "📦" },
    { label: "Star", value: stars, icon: "⭐" },
    { label: "近90天提交", value: commits, icon: "💻" },
    { label: "Fork", value: forks, icon: "🍴" },
    { label: "关注者", value: user.followers, icon: "👥" },
    { label: "正在关注", value: user.following, icon: "👤" },
  ];

  const lines = startCard(
    theme,
    WIDTH,
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
    const pillX = WIDTH - 16 - pillW;
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

function sum(repos: GitHubRepo[], pick: (repo: GitHubRepo) => number): number {
  return repos.reduce((total, repo) => total + pick(repo), 0);
}

const SCORE_WEIGHTS = { followers: 2, stars: 3, repos: 1 };
// 归一化上限与权重成对定义：改一处必改另一处，否则分位会整体偏移
const SCORE_CEILING = { followers: 10_000, stars: 1_000, repos: 100 };

function estimatePercentile(
  input: { followers: number; stars: number; repos: number },
): number {
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
