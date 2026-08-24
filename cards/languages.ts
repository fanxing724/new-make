// 编程语言统计卡片 - 显示用户的编程语言分布

// 语言颜色映射（从 GitHub 配色方案提取）
const LANG_COLORS: Record<string, string> = {
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
  React: "#61dafb",
  Scala: "#c22d40",
  Perl: "#0298c3",
  Haskell: "#5e5086",
  R: "#198CE7",
  Matlab: "#e16737",
  Markdown: "#083fa1",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  Deno: "#70FFAF",
  Default: "#6e7681",
};

function getLangColor(lang: string): string {
  return LANG_COLORS[lang] || LANG_COLORS.Default;
}

export async function renderLanguagesCard(
  username: string,
  theme: Record<string, string>,
  options: { hide?: string[]; layout?: "pie" | "bar" }
): Promise<string> {
  const { hide = [], layout = "pie" } = options;

  // 获取所有仓库的语言信息
  let langData: Record<string, number> = {};

  try {
    // 先获取仓库列表
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`
    );
    const repos = await reposRes.json() as Array<{ name: string; fork: boolean; languages_url: string }>;

    // 取非 fork 的仓库，获取语言数据
    const ownRepos = repos.filter(r => !r.fork).slice(0, 30);

    for (const repo of ownRepos) {
      try {
        const langRes = await fetch(repo.languages_url);
        const langs = await langRes.json() as Record<string, number>;
        for (const [lang, bytes] of Object.entries(langs)) {
          langData[lang] = (langData[lang] || 0) + bytes;
        }
      } catch {
        // 单个仓库失败跳过
      }
    }
  } catch (e) {
    return renderError(`无法获取用户 "${username}" 的语言信息`, theme);
  }

  // 过滤掉要隐藏的语言
  for (const h of hide) {
    delete langData[h];
  }

  const totalBytes = Object.values(langData).reduce((a, b) => a + b, 0);
  if (totalBytes === 0) {
    return renderError("没有找到编程语言数据", theme);
  }

  // 排序并取前 8 个
  const sorted = Object.entries(langData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const WIDTH = 400;
  const HEIGHT = 220;

  if (layout === "bar") {
    return renderBarLayout(sorted, totalBytes, username, theme, WIDTH, HEIGHT);
  }
  return renderPieLayout(sorted, totalBytes, username, theme, WIDTH, HEIGHT);
}

function renderPieLayout(
  langs: [string, number][],
  total: number,
  username: string,
  theme: Record<string, string>,
  W: number,
  H: number
): string {
  const { card, border, title, text, accent } = theme;

  // 生成饼图 - 使用 SVG stroke-dasharray 实现
  const cx = 100;
  const cy = 130;
  const r = 60;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = langs.map(([name, bytes]) => {
    const pct = bytes / total;
    const dash = pct * circumference;
    const slice = { name, pct, dash, offset, color: getLangColor(name) };
    offset += dash;
    return slice;
  });

  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="${card}" stroke="${border}" stroke-width="1.5" />
  <text x="20" y="32" font-family="Segoe UI, sans-serif" font-size="18" font-weight="700" fill="${title}">🔤 编程语言</text>
  <text x="20" y="52" font-family="Segoe UI, sans-serif" font-size="13" fill="${text}">@${username}</text>`];

  // 饼图（使用圆环图）
  let dashOffset = 0;
  slices.forEach((s, i) => {
    lines.push(`  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="20" 
      stroke-dasharray="${s.dash} ${circumference - s.dash}" stroke-dashoffset="${-dashOffset}" 
      transform="rotate(-90 ${cx} ${cy})" opacity="0.9" />`);
    dashOffset += s.dash;
  });

  // 中心文字
  lines.push(`  <text x="${cx}" y="${cy - 5}" font-family="Segoe UI, sans-serif" font-size="14" font-weight="700" fill="${title}" text-anchor="middle">${langs.length}</text>`);
  lines.push(`  <text x="${cx}" y="${cy + 12}" font-family="Segoe UI, sans-serif" font-size="11" fill="${text}" text-anchor="middle">种语言</text>`);

  // 图例
  const legendX = 190;
  slices.forEach((s, i) => {
    const y = 75 + i * 22;
    if (y > 210) return;
    lines.push(`  <rect x="${legendX}" y="${y - 8}" width="12" height="12" rx="3" fill="${s.color}" />`);
    const pct = (s.pct * 100).toFixed(1);
    lines.push(`  <text x="${legendX + 18}" y="${y + 2}" font-family="Segoe UI, sans-serif" font-size="12" fill="${text}">${s.name}</text>`);
    lines.push(`  <text x="${W - 20}" y="${y + 2}" font-family="Segoe UI, sans-serif" font-size="12" fill="${accent}" text-anchor="end">${pct}%</text>`);
  });

  lines.push(`</svg>`);
  return lines.join("\n");
}

function renderBarLayout(
  langs: [string, number][],
  total: number,
  username: string,
  theme: Record<string, string>,
  W: number,
  H: number
): string {
  const { card, border, title, text, bg } = theme;

  const barH = 20;
  const gap = 8;
  const totalH = 60 + (langs.length * (barH + gap)) + 20;
  const height = Math.max(H, totalH);

  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
  <rect x="0" y="0" width="${W}" height="${height}" rx="10" fill="${card}" stroke="${border}" stroke-width="1.5" />
  <text x="20" y="32" font-family="Segoe UI, sans-serif" font-size="18" font-weight="700" fill="${title}">🔤 编程语言</text>
  <text x="20" y="52" font-family="Segoe UI, sans-serif" font-size="13" fill="${text}">@${username}</text>`];

  langs.forEach(([name, bytes], i) => {
    const pct = bytes / total;
    const y = 65 + i * (barH + gap);
    const barWidth = (W - 40) * pct;
    const pctStr = (pct * 100).toFixed(1);

    lines.push(`  <text x="20" y="${y + 15}" font-family="Segoe UI, sans-serif" font-size="12" fill="${text}">${name}</text>`);
    lines.push(`  <rect x="120" y="${y}" width="${barWidth}" height="${barH}" rx="5" fill="${getLangColor(name)}" opacity="0.85" />`);
    lines.push(`  <text x="${W - 20}" y="${y + 15}" font-family="Segoe UI, sans-serif" font-size="12" fill="${text}" text-anchor="end">${pctStr}%</text>`);
  });

  lines.push(`</svg>`);
  return lines.join("\n");
}

function renderError(msg: string, theme: Record<string, string>): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
  <rect x="0" y="0" width="400" height="100" rx="10" fill="${theme.card}" stroke="${theme.border}" stroke-width="1.5" />
  <text x="20" y="45" font-family="Segoe UI, sans-serif" font-size="14" fill="${theme.red}">⚠️ ${msg}</text>
  <text x="20" y="70" font-family="Segoe UI, sans-serif" font-size="12" fill="${theme.text}">请检查用户名是否正确</text>
</svg>`;
}