// 项目封面用 SVG 排版；可内联作者指定的原有角色素材，不加载外部资源。
import { displayWidth, escapeXml, textEl, truncate } from "./common.ts";
import type { GitHubRepo } from "./types.ts";
import { ARTS } from "./art.ts";

export const PROJECT_MOTIFS = ["orbit", "network", "pulse", "terminal", "journal", "archive", "studio", "bridge"] as const;
export type ProjectMotif = typeof PROJECT_MOTIFS[number];

export interface ProjectIdentity {
  title?: string;
  tagline?: string;
  story?: string;
  category?: string;
  accent?: string;
  motif?: ProjectMotif;
  portrait?: boolean;
}

export interface ProjectCoverOptions extends ProjectIdentity {
  username: string;
  author: string;
  mode: "dark" | "light";
  repo: GitHubRepo;
}

export function projectSeed(value: string): number {
  let hash = 2166136261;
  for (const ch of value) hash = Math.imul(hash ^ ch.codePointAt(0)!, 16777619);
  return hash >>> 0;
}

export function assertProjectName(name: string): string {
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name) || name === "." || name === "..") {
    throw new Error(`非法仓库名: ${name}`);
  }
  return name;
}

/** 避免长中文或无空格英文把封面文字挤到右侧插画。 */
export function projectLines(value: string, maxUnits = 52, maxLines = 2): string[] {
  const chars = [...value.replace(/\s+/g, " ").trim()];
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (displayWidth(line + ch) > maxUnits && line) {
      lines.push(line.trim());
      line = "";
      if (lines.length === maxLines - 1) {
        lines.push(truncate(chars.slice(i).join(""), maxUnits));
        return lines;
      }
    }
    line += ch;
  }
  if (line) lines.push(line.trim());
  return lines;
}

function projectArtwork(motif: ProjectMotif, accent: string, muted: string, panel: string): string {
  // 八种图形讲各自的事情：路由、心跳、手记、归档、终端、画板、桥接和星轨。
  const frame = `<circle r="137" fill="${accent}" fill-opacity=".05"/><circle r="166" fill="none" stroke="${accent}" stroke-opacity=".15" stroke-dasharray="2 12"/>`;
  const ink = `fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;
  const motifs: Record<ProjectMotif, string> = {
    orbit: `<g ${ink}><ellipse rx="139" ry="54" transform="rotate(-30)"/><ellipse rx="139" ry="54" transform="rotate(42)" stroke-opacity=".4"/><circle r="65"/><path d="M-19 0H19M0-19V19"/></g><circle cx="113" cy="-66" r="9" fill="${accent}"/><circle cx="-92" cy="-79" r="5" fill="${muted}"/>`,
    network: `<g ${ink}><circle r="67"/><circle r="88" stroke-opacity=".35"/><path d="M-160-78H-111L-65-33M160-78H111L65-33M-160 78H-111L-65 33M160 78H111L65 33M-160 0H-88M88 0H160"/><path d="M-26 10L-7-10L9 5L28-17"/></g>${[[-160,-78],[160,-78],[-160,78],[160,78]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7" fill="${accent}"/>`).join("")}`,
    pulse: `<rect x="-151" y="-94" width="302" height="188" rx="18" fill="${panel}" stroke="${accent}" stroke-opacity=".4"/><g stroke="${muted}" stroke-opacity=".15">${[-50,0,50].map(y=>`<path d="M-131 ${y}H131"/>`).join("")}</g><path d="M-145 12H-86L-59-20L-35 67L-6-66L21 12H62L82-10L102 12H145" ${ink}/><circle cx="-116" cy="-65" r="5" fill="${accent}"/>`,
    terminal: `<rect x="-151" y="-105" width="302" height="210" rx="18" fill="${panel}" stroke="${accent}" stroke-opacity=".5"/><path d="M-151-62H151" stroke="${accent}" stroke-opacity=".2"/><g fill="${accent}"><circle cx="-125" cy="-83" r="4"/><circle cx="-109" cy="-83" r="4" opacity=".5"/><circle cx="-93" cy="-83" r="4" opacity=".25"/></g><path d="M-91-23L-60 0L-91 23M-33 25H13M-90 59H83" ${ink}/><path d="M-3-20H90M37 24H90" stroke="${accent}" stroke-opacity=".2" stroke-width="5"/>`,
    journal: `<g transform="rotate(-8)"><rect x="-106" y="-126" width="212" height="252" rx="15" fill="${panel}" stroke="${accent}" stroke-opacity=".6"/><path d="M-64-125V125M-40-60H70M-40-29H47M-40 63H70M-40 88H22" ${ink} stroke-opacity=".35"/><path d="M-20 5C-20-14 8-14 8 3C8-14 36-14 36 5C36 20 8 34 8 34C8 34-20 20-20 5Z" fill="${accent}" fill-opacity=".65"/></g><path d="M108-88L135-115M122-72L153-79" ${ink}/>`,
    archive: `<g transform="translate(-12 8)"><rect x="-114" y="-112" width="208" height="56" rx="9" fill="${panel}" stroke="${accent}" stroke-opacity=".35"/><rect x="-104" y="-69" width="208" height="56" rx="9" fill="${panel}" stroke="${accent}" stroke-opacity=".55"/><rect x="-94" y="-26" width="208" height="124" rx="12" fill="${panel}" stroke="${accent}"/><path d="M-13 12H33M-22 48L4 73L48 27" ${ink}/></g><circle cx="115" cy="-95" r="26" fill="${accent}" fill-opacity=".12"/>`,
    studio: `<rect x="-145" y="-107" width="290" height="214" rx="16" fill="${panel}" stroke="${accent}" stroke-opacity=".5"/><path d="M-145 51H145M-102 77H-39M-20 77H103" ${ink} stroke-opacity=".35"/><path d="M-24-61L39-24L-24 13Z" fill="${accent}" fill-opacity=".7"/><path d="M84-79V-43M66-61H102M-100-28V-4M-112-16H-88" ${ink}/>`,
    bridge: `<g ${ink}><rect x="-153" y="-64" width="97" height="128" rx="15" fill="${panel}"/><rect x="56" y="-64" width="97" height="128" rx="15" fill="${panel}"/><path d="M-50-23H44L25-41M50 23H-44L-25 41"/><path d="M-125-17L-110 0L-125 17M-95 22H-80M86-19H122M86 0H111M86 19H119" stroke-opacity=".5"/></g>`,
  };
  return `<g transform="translate(953 203)">${frame}${motifs[motif]}</g>`;
}

export function renderProjectCover(options: ProjectCoverOptions): string {
  const { username, author, repo, mode } = options;
  assertProjectName(repo.name);
  const seed = projectSeed(`${username}/${repo.name}`);
  const accents = ["#d88752", "#60bfa4", "#939ce6", "#dc91a8", "#78b6d7"];
  const accent = options.accent ?? accents[seed % accents.length];
  if (!/^#[0-9a-f]{6}$/i.test(accent)) throw new Error("项目 accent 必须是六位十六进制颜色");
  const motif = options.motif ?? PROJECT_MOTIFS[seed % PROJECT_MOTIFS.length];
  if (!PROJECT_MOTIFS.includes(motif)) throw new Error(`未知项目图形: ${motif}`);
  const light = mode === "light";
  const portrait = options.portrait === true;
  const bg = portrait ? (light ? "#f2f6fc" : "#0c1425") : (light ? "#faf7f1" : "#131b23");
  const fg = portrait ? (light ? "#23334d" : "#e2ebf9") : (light ? "#252e38" : "#f1eee8");
  const muted = portrait ? (light ? "#55677f" : "#a5b6ce") : (light ? "#5c6671" : "#acb7c0");
  const panel = portrait ? (light ? "#e7effa" : "#14223a") : (light ? "#f1ede4" : "#1b2832");
  const brand = light ? "#386fba" : "#9bc9ff";
  const art = ARTS[light ? "light" : "starlight"];
  const title = options.title ?? repo.name;
  const titleSize = Math.min(53, Math.max(30, Math.floor(1240 / Math.max(1, displayWidth(title)))));
  const headline = truncate(title, Math.floor(1240 / titleSize));
  const tagline = options.tagline || repo.description || "一个从日常想法开始的开源项目。";
  const lines = projectLines(tagline);
  const txt = (x: number, y: number, value: string, size: number, fill = fg, weight = 400) => textEl(x, y, value, { size, fill, weight });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" role="img" aria-labelledby="project-title project-desc">`,
    `<title id="project-title">${escapeXml(title)} · ${escapeXml(author)}</title>`,
    `<desc id="project-desc">${escapeXml(tagline)} 图形为项目主题插画。</desc>`,
    `<defs><clipPath id="project-clip"><rect x="1" y="1" width="1198" height="398" rx="22"/></clipPath><linearGradient id="project-wash" x2="1" y2="1"><stop stop-color="${accent}" stop-opacity=".08"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient></defs>`,
    `<style>text{font-family:system-ui,-apple-system,'Noto Sans CJK SC','Microsoft YaHei',sans-serif}</style>`,
    `<g clip-path="url(#project-clip)"><rect width="1200" height="400" fill="${bg}"/><rect width="1200" height="400" fill="url(#project-wash)"/>`,
    ...(portrait ? [
      `<defs><linearGradient id="portrait-fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${bg}"/><stop offset=".5" stop-color="${bg}"/><stop offset=".61" stop-color="${bg}" stop-opacity=".94"/><stop offset=".76" stop-color="${bg}" stop-opacity=".15"/><stop offset="1" stop-color="${bg}" stop-opacity=".05"/></linearGradient></defs>`,
      `<image href="${art.src}" x="650" y="0" width="550" height="400" preserveAspectRatio="xMidYMid slice"/>`,
      `<rect width="1200" height="400" fill="url(#portrait-fade)"/>`,
      `<g fill="none" stroke="${brand}" stroke-opacity=".24"><ellipse cx="978" cy="202" rx="210" ry="181" transform="rotate(-28 978 202)"/><ellipse cx="978" cy="202" rx="235" ry="197" transform="rotate(-28 978 202)" stroke-dasharray="2 10"/></g>`,
      `<path d="M1123 39L1128 53L1142 58L1128 63L1123 77L1118 63L1104 58L1118 53Z" fill="${brand}" fill-opacity=".8"/>`,
    ] : [`<path d="M764 28V372" stroke="${muted}" stroke-opacity=".14"/>`]),
    `<path d="M48 51L53 40L58 51L69 56L58 61L53 72L48 61L37 56Z" fill="${portrait ? brand : accent}"/>`,
    txt(82, 61, truncate(`${author} / ${portrait ? "星轨手记" : "项目手记"}`, 42), 17, muted, 500),
    txt(716, 61, "OPEN SOURCE", 11, muted, 500).replace('x="716"', 'x="716" text-anchor="end"'),
    txt(47, 153, headline, titleSize, fg, 700),
    ...lines.map((line, i) => txt(49, 204 + i * 34, line, 23, muted)),
    `<rect x="48" y="279" width="4" height="21" rx="2" fill="${accent}"/>`,
    txt(65, 295, truncate([options.category || "日常造物", repo.language].filter(Boolean).join("  /  "), 63), 15, muted),
    `<path d="M48 329H716" stroke="${muted}" stroke-opacity=".2"/>`,
    txt(49, 363, truncate(`${username}/${repo.name}`, 57), 15, muted),
    txt(716, 363, portrait ? "代码交给 AI，想法留给自己" : "把想法做成能用的东西", 13, muted).replace('x="716"', 'x="716" text-anchor="end"'),
    ...(portrait ? [
      `<g transform="translate(735 226) scale(.38)"><circle cx="953" cy="203" r="184" fill="${panel}" fill-opacity=".94"/>${projectArtwork(motif, accent, muted, panel)}</g>`,
    ] : [projectArtwork(motif, accent, muted, panel)]),
    `</g><rect x="1" y="1" width="1198" height="398" rx="22" fill="none" stroke="${muted}" stroke-opacity=".2"/></svg>`,
  ].join("\n");
}
