// 卡片公共工具：SVG 骨架、文本转义/截断、语言色板、错误卡片

import type { Theme } from "./theme.ts";

const FONT =
  "'Segoe UI', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";

export const FALLBACK_COLOR = "#6e7681";

// 语言色板，取自 GitHub 界面的语言圆点配色
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
  Scala: "#c22d40",
  Perl: "#0298c3",
  Haskell: "#5e5086",
  R: "#198CE7",
  Matlab: "#e16737",
  Markdown: "#083fa1",
  Dockerfile: "#384d54",
  Makefile: "#427819",
};

export function langColor(lang: string | null): string {
  return (lang && LANG_COLORS[lang]) || FALLBACK_COLOR;
}

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

// 用户名、仓库名、description 都会原样进入 SVG，GitHub 渲染 README 里的 SVG 时
// 允许脚本，未转义就等于把注入点开放给任意被查询用户的仓库描述。
export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

export function displayWidth(value: string): number {
  let units = 0;
  for (const ch of value) {
    units += ch.codePointAt(0)! > 0x2e80 ? 2 : 1;
  }
  return units;
}

export function truncate(value: string, maxUnits: number): string {
  if (displayWidth(value) <= maxUnits) return value;
  let units = 0;
  let out = "";
  for (const ch of value) {
    const w = ch.codePointAt(0)! > 0x2e80 ? 2 : 1;
    if (units + w > maxUnits - 1) break;
    units += w;
    out += ch;
  }
  return out + "…";
}

/**
 * 给定可用宽度和字号,算 displayWidth 上限。
 *
 * truncate 收的是"字数",但卡片格子是像素宽的 —— 之前直接写 84 这种常数,
 * 结果 300px 的格子里塞进约 500px 的文字,描述串到隔壁格子。这里按字形宽度反推:
 * displayWidth 把 CJK 记 2、拉丁记 1,正好对应"CJK 全角=1em、拉丁约半角=0.5em",
 * 所以 1 个单位 ≈ 0.5em ≈ size/2 像素。取 0.5 而不是更小的系数是故意留余量,
 * 西文粗体和数字偏宽,宁可少一个字也不要溢出。
 */
export function fitUnits(px: number, size: number): number {
  return Math.max(4, Math.floor(px / (size * 0.5)));
}

interface TextOptions {
  size?: number;
  fill?: string;
  weight?: number | string;
  anchor?: "start" | "middle" | "end";
}

export function textEl(
  x: number,
  y: number,
  content: string,
  opts: TextOptions = {},
): string {
  const { size = 12, fill, weight, anchor } = opts;
  const extra = `${weight ? ` font-weight="${weight}"` : ""}${
    anchor ? ` text-anchor="${anchor}"` : ""
  }`;
  return `  <text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"${extra} fill="${fill}">${
    escapeXml(content)
  }</text>`;
}

export function startCard(
  theme: Theme,
  width: number,
  height: number,
  title: string,
  subtitle: string,
  gradientId: string,
): string[] {
  const defs = [
    `    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `      <stop offset="0" stop-color="${theme.accent}" stop-opacity="0.14"/>`,
    `      <stop offset="1" stop-color="${theme.purple}" stop-opacity="0.05"/>`,
    `    </linearGradient>`,
  ];
  const body = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${
      escapeXml(title)
    }">`,
    `  <defs>`,
    ...defs,
  ];

  if (theme.art) {
    const { src, dim, dimLeft } = theme.art;
    body.push(
      `    <clipPath id="art-${gradientId}"><rect width="${width}" height="${height}" rx="12"/></clipPath>`,
      `    <linearGradient id="scrim-${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">`,
      `      <stop offset="0" stop-color="${theme.bg}" stop-opacity="${dimLeft}"/>`,
      `      <stop offset="0.55" stop-color="${theme.bg}" stop-opacity="${dim}"/>`,
      `      <stop offset="1" stop-color="${theme.bg}" stop-opacity="${(dim * 0.75).toFixed(2)}"/>`,
      `    </linearGradient>`,
      `  </defs>`,
      // slice = 等比缩放到铺满再裁掉溢出,绝不拉伸变形(那需要 preserveAspectRatio="none")
      `  <image href="${src}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#art-${gradientId})"/>`,
      `  <rect width="${width}" height="${height}" rx="12" fill="${theme.bg}" fill-opacity="${dim}"/>`,
      `  <rect width="${width}" height="${height}" rx="12" fill="url(#scrim-${gradientId})"/>`,
      // 卡片底色让位给插画,只留描边定形;圆角靠描边自己走,不靠遮罩
      `  <rect width="${width}" height="${height}" rx="12" fill="none" stroke="${theme.border}" stroke-width="1"/>`,
    );
  } else {
    body.push(
      `  </defs>`,
      `  <rect width="${width}" height="${height}" rx="12" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>`,
    );
  }

  body.push(
    `  <rect width="${width}" height="${height}" rx="12" fill="url(#${gradientId})"/>`,
    `  <rect x="20" y="19" width="4" height="17" rx="2" fill="${theme.accent}"/>`,
    textEl(32, 33, title, { size: 16, weight: 700, fill: theme.title }),
    textEl(32, 51, subtitle, { size: 12, fill: theme.text }),
  );
  return body;
}

export function finishCard(lines: string[]): string {
  lines.push("</svg>");
  return lines.join("\n");
}

/**
 * 渲染失败时的兜底卡片。走正常 200 响应返回，README 里仍能看到提示；
 * 缓存策略由调用方负责（错误卡片不缓存）。
 */
export function renderErrorCard(
  message: string,
  theme: Theme,
  hint = "请检查用户名是否正确",
): string {
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100" role="img" aria-label="${
      escapeXml(message)
    }">`,
    `<rect width="400" height="100" rx="12" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>`,
    textEl(20, 45, `⚠️ ${message}`, { size: 14, fill: theme.red }),
    textEl(20, 70, hint, { size: 12, fill: theme.text }),
    "</svg>",
  ];
  return lines.join("\n");
}

/**
 * 卡片渲染失败的统一异常。`kind` 决定错误卡片文案与是否短缓存，
 * retryable 表示稍后重试可能成功（限流/上游故障），由 kind 推导。
 */
export type CardErrorKind = "not_found" | "rate_limited" | "upstream" | "empty";

const RETRYABLE_KINDS: CardErrorKind[] = ["rate_limited", "upstream"];

export class CardError extends Error {
  hint: string;
  kind: CardErrorKind;
  retryable: boolean;

  constructor(
    message: string,
    opts: { hint?: string; kind?: CardErrorKind } = {},
  ) {
    super(message);
    this.name = "CardError";
    this.kind = opts.kind ?? "empty";
    this.hint = opts.hint ?? "";
    this.retryable = RETRYABLE_KINDS.includes(this.kind);
  }
}

export function timeAgo(dateStr: string, now = Date.now()): string {
  const diff = Math.floor((now - new Date(dateStr).getTime()) / 1000);
  if (!Number.isFinite(diff) || diff < 0) return "时间未知";
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} 个月前`;
  return `${Math.floor(diff / 31536000)} 年前`;
}
