// 编程语言统计卡片 - 圆环图 / 条形图展示仓库语言分布

import {
  CardError,
  FALLBACK_COLOR,
  finishCard,
  langColor,
  startCard,
  textEl,
  truncate,
} from "./common.ts";
import { fetchOwnRepos, sumLanguageBytes } from "./github.ts";
import type { Theme } from "./theme.ts";

const WIDTH = 400;
const TOP_N = 8;

interface Slice {
  name: string;
  pct: number;
  color: string;
}

interface LanguageOptions {
  hide?: string[];
  layout?: "pie" | "bar";
}

export async function renderLanguagesCard(
  username: string,
  theme: Theme,
  options: LanguageOptions,
): Promise<string> {
  const { hide = [], layout = "pie" } = options;

  const repos = await fetchOwnRepos(username);
  const bytesByLang = await sumLanguageBytes(repos);

  // README 文档写的是 hide=html,css，GitHub 返回的是 HTML/CSS，必须忽略大小写
  const hidden = new Set(hide.map((h) => h.toLowerCase()));
  const visible = Object.entries(bytesByLang).filter(
    ([lang]) => !hidden.has(lang.toLowerCase()),
  );
  const total = visible.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total === 0) {
    throw new CardError("没有找到编程语言数据", {
      hint: "该用户可能还没有包含代码的公开仓库",
    });
  }

  const sorted = visible.sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);

  // Top N 之外归入“其他”，保证百分比闭合到 100%，圆环不留缺口
  const slices: Slice[] = top.map(([name, bytes]) => ({
    name,
    pct: bytes / total,
    color: langColor(name),
  }));
  if (rest.length > 0) {
    const restBytes = rest.reduce((sum, [, bytes]) => sum + bytes, 0);
    slices.push({
      name: `其他 (${rest.length})`,
      pct: restBytes / total,
      color: FALLBACK_COLOR,
    });
  }

  return layout === "bar"
    ? renderBar(slices, username, theme)
    : renderPie(slices, sorted.length, username, theme);
}

function renderPie(
  slices: Slice[],
  langCount: number,
  username: string,
  theme: Theme,
): string {
  const cx = 100;
  const cy = 130;
  const r = 60;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * r;

  const legendX = 190;
  const legendY0 = 75;
  const legendRow = 22;
  // 高度随图例行数增长，超出画布的图例不再被静默裁掉
  const height = Math.max(220, legendY0 + slices.length * legendRow + 16);

  const lines = startCard(theme, WIDTH, height, "🔤 编程语言", `@${username}`, "gc-lang");

  // 底轨：让圆环在数据稀疏时也有完整的轮廓
  lines.push(
    `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.border}" stroke-opacity="0.35" stroke-width="${strokeWidth}"/>`,
  );

  let offset = 0;
  for (const slice of slices) {
    const dash = slice.pct * circumference;
    lines.push(
      `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${slice.color}" stroke-width="${strokeWidth}" stroke-dasharray="${round(dash)} ${
        round(circumference - dash)
      }" stroke-dashoffset="${round(-offset)}" transform="rotate(-90 ${cx} ${cy})" opacity="0.9"/>`,
    );
    offset += dash;
  }

  lines.push(
    textEl(cx, cy - 5, String(langCount), {
      size: 14,
      weight: 700,
      anchor: "middle",
      fill: theme.title,
    }),
  );
  lines.push(
    textEl(cx, cy + 12, "种语言", {
      size: 11,
      anchor: "middle",
      fill: theme.text,
    }),
  );

  slices.forEach((slice, i) => {
    const y = legendY0 + i * legendRow;
    lines.push(
      `  <rect x="${legendX}" y="${y - 8}" width="12" height="12" rx="3" fill="${slice.color}"/>`,
    );
    lines.push(
      textEl(legendX + 18, y + 2, truncate(slice.name, 24), {
        size: 12,
        fill: theme.text,
      }),
    );
    lines.push(
      textEl(WIDTH - 20, y + 2, pct(slice.pct), {
        size: 12,
        anchor: "end",
        fill: theme.accent,
      }),
    );
  });

  return finishCard(lines);
}

function renderBar(slices: Slice[], username: string, theme: Theme): string {
  const barH = 20;
  const gap = 8;
  const barX = 130;
  // 条形区域右侧要留出百分比文字的位置，否则占比高的语言会画出卡片外
  const barMaxW = WIDTH - barX - 70;
  const height = 60 + slices.length * (barH + gap) + 20;

  const lines = startCard(theme, WIDTH, height, "🔤 编程语言", `@${username}`, "gc-lang");

  slices.forEach((slice, i) => {
    const y = 65 + i * (barH + gap);
    lines.push(
      textEl(20, y + 15, truncate(slice.name, 18), {
        size: 12,
        fill: theme.text,
      }),
    );
    lines.push(
      `  <rect x="${barX}" y="${y}" width="${barMaxW}" height="${barH}" rx="5" fill="${theme.border}" fill-opacity="0.3"/>`,
    );
    lines.push(
      `  <rect x="${barX}" y="${y}" width="${
        round(Math.max(2, barMaxW * slice.pct))
      }" height="${barH}" rx="5" fill="${slice.color}" opacity="0.85"/>`,
    );
    lines.push(
      textEl(WIDTH - 20, y + 15, pct(slice.pct), {
        size: 12,
        anchor: "end",
        fill: theme.text,
      }),
    );
  });

  return finishCard(lines);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
