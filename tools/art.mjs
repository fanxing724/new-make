// 把一张本地图转成 cards/art.ts(带背景插画的主题用)。
//
//   node tools/art.mjs <图片路径> [导出名]
//
// 为什么走"生成文件"而不是运行时读盘:SVG 被 <img> 当图片文档加载时,外链资源一律
// 被禁 —— 图床、CDN、相对路径都不行,插画必须 base64 内联进卡片本身。
// 内联字符串放代码里而不是让 build 去读图,是为了让 cards/ 保持"自己就能跑"。
//
// 换图 = 重跑这条命令,别手改 cards/art.ts。

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const [, , srcArg, nameArg] = process.argv;
if (!srcArg) {
  console.error("用法: node tools/art.mjs <图片路径> [导出名]");
  process.exit(1);
}

const src = resolve(srcArg);
const MIME = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const mime = MIME[extname(src).toLowerCase()];
if (!mime) {
  // 只放浏览器认的三种。GIF 能内联但会引入"README 里到底动没动"这种说不清的行为
  console.error(`不支持的格式 ${extname(src)};可用: ${Object.keys(MIME).join(" ")}`);
  process.exit(1);
}

const bytes = readFileSync(src);
const dataUri = `data:${mime};base64,${bytes.toString("base64")}`;
const name = nameArg || basename(src, extname(src)).replace(/[^A-Za-z0-9]+/g, "_").toUpperCase();
const key = name.toLowerCase();
const out = resolve(ROOT, "cards/art.ts");

// 一次只产出一张图、一套压暗。想加浅色档先读 README「插画只在暗色模式出现」那节:
// 夜景图压白雾到能读字,图也就看不见了,别默认往这个方向做。
writeFileSync(
  out,
  `// 生成物:node tools/art.mjs ${srcArg.replace(ROOT + "/", "")} ${nameArg || ""}`.trimEnd() +
    `
// 源文件 ${bytes.length} 字节;base64 后 ${dataUri.length} 字节(约 +33%)。
// 别手改,换图就重跑那条命令。

interface Art {
  /** data URI,会被原样塞进 SVG 的 <image href>。外链在 <img> 语境里是禁的 */
  src: string;
  /** 平铺遮罩浓度:压低插画对比度,让前景文字站得住 */
  dim: number;
  /** 左端额外压暗(标题和数值都在左边),向右渐隐到 dim */
  dimLeft: number;
}

export type { Art };

export const ARTS: Record<string, Art> = {
  ${key}: {
    src: "${dataUri}",
    dim: 0.55,
    dimLeft: 0.92,
  },
};

export const ART_NAMES: string[] = Object.keys(ARTS);
`,
);

console.log(`${srcArg} → cards/art.ts  (导出 ${key}, ${dataUri.length} 字节 data URI)`);
