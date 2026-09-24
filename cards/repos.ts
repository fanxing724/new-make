// 仓库卡片 - 双列展示精选仓库

import {
  CardError,
  fitUnits,
  finishCard,
  langColor,
  startCard,
  textEl,
  truncate,
} from "./common.ts";
import { fetchOwnRepos, fetchRepo } from "./github.ts";
import type { Theme } from "./theme.ts";
import type { GitHubRepo } from "./types.ts";

const PAD = 10;
const CARD_W = 300;
const CARD_H = 110;
const GAP_X = 10;
const GAP_Y = 10;
const COLS = 2;
const MAX_CELLS = 12;
const CELL_Y0 = 62;

interface ReposOptions {
  count?: number;
  sort?: "updated" | "created" | "stars";
  pinned?: string[];
}

export async function renderReposCard(
  username: string,
  theme: Theme,
  options: ReposOptions,
): Promise<string> {
  const { count = 6, sort = "updated", pinned } = options;

  let repos: GitHubRepo[];
  if (pinned && pinned.length > 0) {
    // 按名字逐个精确拉取：不再受列表接口分页顺序和 fork 过滤的影响，
    // 也保证展示顺序与 pinned 参数一致
    const found = await Promise.all(
      pinned.slice(0, MAX_CELLS).map((name) => fetchRepo(username, name)),
    );
    repos = found.filter((r): r is GitHubRepo => r !== null);
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
