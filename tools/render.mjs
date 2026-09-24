// 定时预渲染:handler() → 静态 SVG,交给 GitHub Pages 分发。
//
//   node tools/render.mjs [--config render.config.json]
//
// 为什么要预渲染而不是实时代理:卡片的缓存 key 是 ?username=,由来访者控制 ——
// 换个人就必然回源一次,边缘缓存拦不住枚举。预渲染把"访客数"和"GitHub API 调用数"
// 彻底解耦:一万人刷主页也是零次出网,而且这条路径上不存在任何长期密钥。
//
// 两条不协商的规则:
// 1. 错误卡片绝不进产物。限流时 handler 返回的同样是 200 + <svg> + ⚠️,光看状态码
//    发现不了;红卡一旦进了 CDN,会一直挂到下次成功渲染 —— 比不更新糟糕得多。
// 2. 全部成功才整体替换输出目录。半套产物会留新旧混杂,事后没人说得清哪张是新出的。

import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { handler } from "../deno_index.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// 与 test/all.mjs 同源:错误卡片由 common.ts 统一加这个前缀
const ERR_MARK = "⚠️";

function fail(msg) {
  console.error(`render 失败: ${msg}`);
  process.exit(1);
}

const configPath = (() => {
  const i = process.argv.indexOf("--config");
  if (i > -1 && process.argv[i + 1]) return resolve(ROOT, process.argv[i + 1]);
  return join(ROOT, "render.config.json");
})();

const cfg = JSON.parse(readFileSync(configPath, "utf8"));
if (!Array.isArray(cfg.usernames) || cfg.usernames.length === 0) {
  fail(`${configPath}: usernames 不能为空`);
}
if (!cfg.cards || Object.keys(cfg.cards).length === 0) {
  fail(`${configPath}: cards 不能为空`);
}

const OUT = resolve(ROOT, cfg.output || "dist-cards");
// 成功渲染后这个目录会被整目录删掉重建 —— 所以它必须是仓库里的一个子目录。
// 少了这道检查, 一份写错 output 的配置(比如 "." 或 "../shared")就会把仓库根当产物清掉。
if (OUT === ROOT || !OUT.startsWith(ROOT + "/")) {
  fail(`${configPath}: output 必须是仓库根下的子目录, 当前解析到 ${OUT}`);
}
const STAGE = OUT + ".staging";
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });

// 只报布尔,永不回显值 —— 与 /health 探针同一套纪律
console.log(
  `API 令牌: ${process.env.GITHUB_TOKEN ? "已配置" : "未配置(退匿名 60 次/小时)"}`,
);

const items = [];
const failures = [];
const started = Date.now();

for (const username of cfg.usernames) {
  for (const [card, rawParams] of Object.entries(cfg.cards)) {
    const params = new URLSearchParams({ username });
    for (const [k, v] of Object.entries(rawParams || {})) {
      params.set(k, String(v));
    }
    const url = `https://render.local/${card}?${params}`;
    const dest = join(username, `${card}.svg`);

    let res;
    try {
      res = await handler(new Request(url), process.env);
    } catch (e) {
      failures.push(`${dest}: 抛错 ${e.message}`);
      continue;
    }
    const body = await res.text();
    const type = res.headers.get("content-type") || "";

    if (res.status !== 200) {
      failures.push(`${dest}: status=${res.status}(路由或参数不认识)`);
      continue;
    }
    if (!type.includes("svg")) {
      failures.push(`${dest}: content-type=${type}`);
      continue;
    }
    if (body.includes(ERR_MARK)) {
      const hint = body.match(/⚠️[^<]{0,60}/)?.[0]?.trim() || "无提示文本";
      failures.push(`${dest}: 是错误卡片 → ${hint}`);
      continue;
    }
    if (!body.includes("</svg>")) {
      failures.push(`${dest}: SVG 不完整`);
      continue;
    }

    mkdirSync(resolve(STAGE, username), { recursive: true });
    writeFileSync(resolve(STAGE, dest), body);
    items.push({
      path: dest,
      bytes: statSync(resolve(STAGE, dest)).size,
      cacheControl: res.headers.get("cache-control"),
    });
    console.log(`  ok   ${dest}  ${(statSync(resolve(STAGE, dest)).size / 1024).toFixed(1)} KB`);
  }
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);

if (failures.length) {
  console.error(`\n${failures.length} 项失败,产物不替换:`);
  console.error(failures.map((f) => `  - ${f}`).join("\n"));
  rmSync(STAGE, { recursive: true, force: true });
  process.exit(1);
}

const generatedAt = new Date().toISOString();
writeFileSync(
  resolve(STAGE, "status.json"),
  JSON.stringify({ generatedAt, seconds: Number(seconds), items }, null, 2) +
    "\n",
);
// 自检页:一个 URL 看全所有卡 + 上次成功渲染时间,判断"到底有没有在更新"
writeFileSync(
  resolve(STAGE, "index.html"),
  `<!doctype html>
<meta charset="utf-8">
<title>GitHub 卡片 · 预渲染产物</title>
<style>body{background:#0d1117;color:#8b949e;font:14px/1.6 system-ui,sans-serif;margin:2rem;max-width:52rem}
h1{color:#f0f6fc;font-size:1.1rem}code{background:#161b22;padding:.15rem .4rem;border-radius:4px;color:#58a6ff}
figure{margin:1.5rem 0}figcaption{font-size:.85rem;margin-top:.4rem}</style>
<h1>GitHub 卡片 · 预渲染产物</h1>
<p>上次成功渲染 <code>${generatedAt}</code> · ${items.length} 张 · 耗时 ${seconds}s</p>
<p>刷新这个页面不会重新出网 —— 图是 Actions 定时渲染后作为 Pages 产物发布的,要新的就等下次 cron 或手动跑一次 workflow。</p>
${items
  .map(
    (i) =>
      `<figure><img src="${i.path}" width="400" alt="${i.path}"><figcaption><code>/${i.path}</code> · ${(i.bytes / 1024).toFixed(1)} KB</figcaption></figure>`,
  )
  .join("\n")}
`,
);

rmSync(OUT, { recursive: true, force: true });
renameSync(STAGE, OUT);
console.log(
  `\n${items.length} 张 → ${cfg.output || "dist-cards"}/ (耗时 ${seconds}s)`,
);
