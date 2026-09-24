// 活跃度卡片 - 最近 GitHub 事件摘要

import { finishCard, startCard, textEl, timeAgo, truncate } from "./common.ts";
import { fetchEvents } from "./github.ts";
import type { Theme } from "./theme.ts";

const ACTIVITY_WIDTH = 400;
const MAX_EVENTS_SHOWN = 3;

const EVENT_META: Record<string, { emoji: string; desc: string }> = {
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

export async function renderActivityCard(
  username: string,
  theme: Theme,
): Promise<string> {
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
