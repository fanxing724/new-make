// 活跃度卡片 - 显示用户的最近 GitHub 活动

export async function renderActivityCard(
  username: string,
  theme: Record<string, string>
): Promise<string> {
  const { card, border, title, text, accent, green, orange } = theme;

  interface GitHubEvent {
    type: string;
    repo: { name: string };
    created_at: string;
    payload: Record<string, unknown>;
  }

  let events: GitHubEvent[] = [];
  try {
    const res = await fetch(
      `https://api.github.com/users/${username}/events?per_page=10`
    );
    events = await res.json() as GitHubEvent[];
  } catch {
    // 降级处理
  }

  if (!events.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120">
  <rect x="0" y="0" width="400" height="120" rx="10" fill="${card}" stroke="${border}" stroke-width="1.5" />
  <text x="20" y="32" font-family="Segoe UI, sans-serif" font-size="18" font-weight="700" fill="${title}">⚡ 最近活跃</text>
  <text x="20" y="52" font-family="Segoe UI, sans-serif" font-size="13" fill="${text}">@${username}</text>
  <text x="20" y="85" font-family="Segoe UI, sans-serif" font-size="13" fill="${text}">暂无最近活动记录</text>
</svg>`;
  }

  // 计算活动统计
  const typeCount: Record<string, number> = {};
  let recentPushCount = 0;
  let recentPRCount = 0;
  let recentIssueCount = 0;
  let recentStarCount = 0;

  events.forEach(e => {
    typeCount[e.type] = (typeCount[e.type] || 0) + 1;
    if (e.type === "PushEvent") recentPushCount++;
    if (e.type === "PullRequestEvent") recentPRCount++;
    if (e.type === "IssuesEvent") recentIssueCount++;
    if (e.type === "WatchEvent") recentStarCount++;
  });

  // 获取最近事件时间
  const latestEvent = events[0];
  const timeAgo = getTimeAgo(latestEvent.created_at);

  const WIDTH = 400;
  const HEIGHT = 200;

  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="10" fill="${card}" stroke="${border}" stroke-width="1.5" />
  <text x="20" y="32" font-family="Segoe UI, sans-serif" font-size="18" font-weight="700" fill="${title}">⚡ 最近活跃</text>
  <text x="20" y="52" font-family="Segoe UI, sans-serif" font-size="13" fill="${text}">@${username}</text>`];

  // 统计项
  const stats = [
    { label: "推送", value: recentPushCount, icon: "📤", color: green },
    { label: "PR", value: recentPRCount, icon: "🔄", color: accent },
    { label: "Issue", value: recentIssueCount, icon: "🐛", color: orange },
    { label: "Star", value: recentStarCount, icon: "⭐", color: "#e3b341" },
  ];

  // 活动统计 - 横排
  const statWidth = 90;
  stats.forEach((s, i) => {
    const x = 25 + i * statWidth;
    lines.push(`  <text x="${x + 20}" y="82" font-family="Segoe UI, sans-serif" font-size="22" font-weight="700" fill="${s.color}" text-anchor="middle">${s.value}</text>`);
    lines.push(`  <text x="${x + 20}" y="100" font-family="Segoe UI, sans-serif" font-size="12" fill="${text}" text-anchor="middle">${s.icon} ${s.label}</text>`);
  });

  // 分隔线
  lines.push(`  <line x1="20" y1="115" x2="${WIDTH - 20}" y2="115" stroke="${border}" stroke-width="1" />`);

  // 最近活动
  if (events.length > 0) {
    const e = events[0];
    const emoji = getEventEmoji(e.type);
    const repoName = e.repo.name.replace(`${username}/`, "");
    lines.push(`  <text x="20" y="140" font-family="Segoe UI, sans-serif" font-size="13" fill="${text}">${emoji} 最近: ${getEventDesc(e.type)}</text>`);
    lines.push(`  <text x="20" y="160" font-family="Segoe UI, sans-serif" font-size="13" fill="${accent}">📁 ${repoName}</text>`);
    lines.push(`  <text x="20" y="180" font-family="Segoe UI, sans-serif" font-size="11" fill="${text}">⏱ ${timeAgo}</text>`);
  }

  lines.push(`</svg>`);
  return lines.join("\n");
}

function getEventEmoji(type: string): string {
  const map: Record<string, string> = {
    PushEvent: "📤",
    PullRequestEvent: "🔄",
    IssuesEvent: "🐛",
    WatchEvent: "⭐",
    ForkEvent: "🍴",
    CreateEvent: "📝",
    DeleteEvent: "🗑️",
    IssueCommentEvent: "💬",
    ReleaseEvent: "🎉",
    PublicEvent: "🌍",
  };
  return map[type] || "📌";
}

function getEventDesc(type: string): string {
  const map: Record<string, string> = {
    PushEvent: "推送了代码",
    PullRequestEvent: "提交了 PR",
    IssuesEvent: "操作了 Issue",
    WatchEvent: "收藏了仓库",
    ForkEvent: "Fork 了仓库",
    CreateEvent: "创建了分支/标签",
    DeleteEvent: "删除了分支/标签",
    IssueCommentEvent: "评论了 Issue",
    ReleaseEvent: "发布了版本",
    PublicEvent: "开源了项目",
  };
  return map[type] || "进行了操作";
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  return `${Math.floor(diff / 2592000)} 个月前`;
}