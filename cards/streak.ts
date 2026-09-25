// 连续活跃卡片 - streak 统计 + 90 天事件热力图
//
// 口径与 stats 卡一致:数据来自 Events 接口,只有最近 90 天(预渲染名单里渲染一次,
// 自然就是"渲染时刻往前 90 天")。活跃日的定义是"当天至少有 1 条公开事件" ——
// Events 接口覆盖不到私有仓库,这不是 bug,卡片副标题里如实标注了。

import { CardError, finishCard, startCard, textEl } from "./common.ts";
import { fetchEvents } from "./github.ts";
import type { Theme } from "./theme.ts";
import type { GitHubEvent } from "./types.ts";

const STREAK_WIDTH = 400;
const WEEKS = 13;
const CELL = 10;
const CELL_GAP = 3;
const GRID_X = 20;
const GRID_Y = 118;

interface StreakOptions {
  title?: string;
}

/** UTC 天粒度的 key。GitHub 卡片的读者遍布时区,选哪个都不完美,UTC 是最不自作聪明的 */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function activeDays(events: GitHubEvent[]): Map<string, number> {
  const days = new Map<string, number>();
  for (const e of events) {
    const key = dayKey(e.created_at);
    days.set(key, (days.get(key) ?? 0) + 1);
  }
  return days;
}

/** 从 anchor 往前数连续活跃天。anchor 本身不活跃时返回 0(当前 streak 允许"昨天为止") */
function streakBack(days: Set<string>, anchor: Date): number {
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

function longestStreak(days: Set<string>): number {
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

export async function renderStreakCard(
  username: string,
  theme: Theme,
  options: StreakOptions = {},
): Promise<string> {
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
  const level = (count: number): number => {
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
