// 仓库卡片 - 显示用户的精选仓库

export async function renderReposCard(
  username: string,
  theme: Record<string, string>,
  options: { count?: number; sort?: "updated" | "created" | "stars"; pinned?: string[] }
): Promise<string> {
  const { count = 6, sort = "updated", pinned } = options;
  const { card, border, title, text, accent, green } = theme;

  interface Repo {
    name: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    fork: boolean;
    updated_at: string;
    created_at: string;
    html_url: string;
  }

  let repos: Repo[] = [];
  try {
    let url = `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`;
    if (sort === "created") url += "&sort=created&direction=desc";
    else if (sort === "stars") url += "&sort=updated&direction=desc";

    const res = await fetch(url);
    const allRepos = await res.json() as Repo[];

    // 如果是 pinned 模式，按指定名称筛选
    if (pinned && pinned.length > 0) {
      repos = allRepos.filter(r => pinned.includes(r.name));
    } else {
      repos = allRepos.filter(r => !r.fork);

      // 按 star 数排序取前 N 个
      if (sort === "stars") {
        repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
      }
      repos = repos.slice(0, count);
    }
  } catch {
    return renderError(`无法获取用户 "${username}" 的仓库信息`, theme);
  }

  if (repos.length === 0) {
    return renderError("没有找到仓库", theme);
  }

  const cardW = 380;
  const cardH = 110;
  const cols = 2;
  const rows = Math.ceil(repos.length / cols);
  const WIDTH = cols * cardW + 20;
  const HEIGHT = 70 + rows * (cardH + 10);
  const gapX = 10;
  const gapY = 10;

  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="10" fill="${card}" stroke="${border}" stroke-width="1.5" />
  <text x="20" y="32" font-family="Segoe UI, sans-serif" font-size="18" font-weight="700" fill="${title}">📦 精选仓库</text>
  <text x="20" y="52" font-family="Segoe UI, sans-serif" font-size="13" fill="${text}">@${username}</text>`];

  repos.forEach((repo, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 10 + col * (cardW + gapX);
    const y = 65 + row * (cardH + gapY);

    const desc = repo.description
      ? repo.description.length > 50
        ? repo.description.slice(0, 50) + "..."
        : repo.description
      : "暂无描述";
    const lang = repo.language || "未知";
    const stars = repo.stargazers_count;
    const forks = repo.forks_count;

    lines.push(`  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="8" fill="transparent" stroke="${border}" stroke-width="1" />`);
    lines.push(`  <text x="${x + 15}" y="${y + 25}" font-family="Segoe UI, sans-serif" font-size="14" font-weight="600" fill="${accent}">${repo.name}</text>`);
    lines.push(`  <text x="${x + 15}" y="${y + 48}" font-family="Segoe UI, sans-serif" font-size="12" fill="${text}">${desc}</text>`);

    // 语言标签
    const langColor = getLangDotColor(lang);
    lines.push(`  <circle cx="${x + 15}" cy="${y + 75}" r="6" fill="${langColor}" />`);
    lines.push(`  <text x="${x + 27}" y="${y + 79}" font-family="Segoe UI, sans-serif" font-size="11" fill="${text}">${lang}</text>`);

    // Star 数
    lines.push(`  <text x="${x + 100}" y="${y + 79}" font-family="Segoe UI, sans-serif" font-size="11" fill="${text}">⭐ ${stars}</text>`);

    // Fork 数
    lines.push(`  <text x="${x + 150}" y="${y + 79}" font-family="Segoe UI, sans-serif" font-size="11" fill="${text}">⑂ ${forks}</text>`);
  });

  lines.push(`</svg>`);
  return lines.join("\n");
}

function getLangDotColor(lang: string): string {
  const colors: Record<string, string> = {
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
    HTML: "#e34c26",
    CSS: "#563d7c",
    Shell: "#89e051",
    Vue: "#41b883",
    Dart: "#00B4AB",
    Lua: "#000080",
  };
  return colors[lang] || "#6e7681";
}

function renderError(msg: string, theme: Record<string, string>): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
  <rect x="0" y="0" width="400" height="100" rx="10" fill="${theme.card}" stroke="${theme.border}" stroke-width="1.5" />
  <text x="20" y="45" font-family="Segoe UI, sans-serif" font-size="14" fill="${theme.red}">⚠️ ${msg}</text>
  <text x="20" y="70" font-family="Segoe UI, sans-serif" font-size="12" fill="${theme.text}">请检查用户名是否正确</text>
</svg>`;
}