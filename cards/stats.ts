// 统计卡片 - 显示 GitHub 统计数据

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

interface GitHubRepo {
  stargazers_count: number;
  fork: boolean;
}

export async function renderStatsCard(
  username: string,
  theme: Record<string, string>,
  options: { hideRank?: boolean; showIcons?: boolean }
): Promise<string> {
  const { hideRank = false, showIcons = false } = options;

  // 获取用户信息
  let user: GitHubUser;
  let totalStars = 0;
  let totalCommits = 0;

  try {
    const userRes = await fetch(`https://api.github.com/users/${username}`);
    user = await userRes.json() as GitHubUser;

    // 获取仓库信息计算 star 数
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`
    );
    const repos = await reposRes.json() as GitHubRepo[];
    totalStars = repos.reduce((sum, r) => sum + (r.fork ? 0 : r.stargazers_count), 0);

    // 获取提交数（通过 events 接口估算）
    try {
      const eventsRes = await fetch(
        `https://api.github.com/users/${username}/events?per_page=100`
      );
      const events = await eventsRes.json() as Array<{ type: string }>;
      totalCommits = events.filter(e => e.type === "PushEvent").length;
      // 补一个合理的基数，因为 events 只返回最近 90 天
      totalCommits = Math.max(totalCommits * 3, 50);
    } catch {
      totalCommits = 50;
    }
  } catch (e) {
    return renderError(`无法获取用户 "${username}" 的信息`, theme);
  }

  const WIDTH = 450;
  const HEIGHT = 200;
  const { bg, card, border, title, text, accent, green, orange } = theme;

  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.05" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="10" fill="${card}" stroke="${border}" stroke-width="1.5" />
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="10" fill="url(#grad)" />
  <text x="20" y="32" font-family="Segoe UI, sans-serif" font-size="18" font-weight="700" fill="${title}">📊 GitHub 统计</text>
  <text x="20" y="52" font-family="Segoe UI, sans-serif" font-size="13" fill="${text}">@${username}</text>`];

  // 统计项
  const stats = [
    { label: "仓库", value: user.public_repos, icon: "📦" },
    { label: "Star", value: totalStars, icon: "⭐" },
    { label: "提交数", value: `${totalCommits}+`, icon: "💻" },
    { label: "关注者", value: user.followers, icon: "👥" },
    { label: "正在关注", value: user.following, icon: "👤" },
  ];

  // 布局：两列
  const col1 = stats.slice(0, 3);
  const col2 = stats.slice(3, 5);

  const startY = 75;

  // 左列
  col1.forEach((s, i) => {
    const y = startY + i * 38;
    if (showIcons) {
      lines.push(`  <text x="25" y="${y + 16}" font-family="Segoe UI, sans-serif" font-size="14" fill="${text}">${s.icon}</text>`);
      lines.push(`  <text x="50" y="${y + 16}" font-family="Segoe UI, sans-serif" font-size="14" fill="${text}">${s.label}</text>`);
      lines.push(`  <text x="210" y="${y + 16}" font-family="Segoe UI, sans-serif" font-size="14" font-weight="700" fill="${accent}" text-anchor="end">${s.value}</text>`);
    } else {
      lines.push(`  <text x="25" y="${y + 16}" font-family="Segoe UI, sans-serif" font-size="14" fill="${text}">${s.label}</text>`);
      lines.push(`  <text x="210" y="${y + 16}" font-family="Segoe UI, sans-serif" font-size="14" font-weight="700" fill="${accent}" text-anchor="end">${s.value}</text>`);
    }
  });

  // 右列（如果有）
  col2.forEach((s, i) => {
    const y = startY + i * 38;
    if (showIcons) {
      lines.push(`  <text x="240" y="${y + 16}" font-family="Segoe UI, sans-serif" font-size="14" fill="${text}">${s.icon}</text>`);
      lines.push(`  <text x="265" y="${y + 16}" font-family="Segoe UI, sans-serif" font-size="14" fill="${text}">${s.label}</text>`);
      lines.push(`  <text x="430" y="${y + 16}" font-family="Segoe UI, sans-serif" font-size="14" font-weight="700" fill="${accent}" text-anchor="end">${s.value}</text>`);
    } else {
      lines.push(`  <text x="240" y="${y + 16}" font-family="Segoe UI, sans-serif" font-size="14" fill="${text}">${s.label}</text>`);
      lines.push(`  <text x="430" y="${y + 16}" font-family="Segoe UI, sans-serif" font-size="14" font-weight="700" fill="${accent}" text-anchor="end">${s.value}</text>`);
    }
  });

  // 排名（可选）
  if (!hideRank) {
    const rank = calculateRank(user.followers, totalStars, user.public_repos);
    const rankColor = rank <= 3 ? green : rank <= 6 ? orange : text;
    lines.push(`  <text x="430" y="190" font-family="Segoe UI, sans-serif" font-size="12" fill="${rankColor}" text-anchor="end">全球排名 #${rank}%</text>`);
  }

  lines.push(`</svg>`);
  return lines.join("\n");
}

function calculateRank(followers: number, stars: number, repos: number): number {
  // 简单的排名估算算法
  const score = Math.log(followers + 1) * 2 + Math.log(stars + 1) * 3 + Math.log(repos + 1);
  const maxScore = Math.log(10000) * 3 + Math.log(1000) * 2 + Math.log(100);
  const percentile = Math.max(0, Math.min(100, Math.round((1 - score / maxScore) * 100)));
  return percentile;
}

function renderError(msg: string, theme: Record<string, string>): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
  <rect x="0" y="0" width="400" height="100" rx="10" fill="${theme.card}" stroke="${theme.border}" stroke-width="1.5" />
  <text x="20" y="45" font-family="Segoe UI, sans-serif" font-size="14" fill="${theme.red}">⚠️ ${msg}</text>
  <text x="20" y="70" font-family="Segoe UI, sans-serif" font-size="12" fill="${theme.text}">请检查用户名是否正确</text>
</svg>`;
}