// 统一本地检查:一条命令覆盖核心层 + 每个平台的产物。
//
//   node test/all.mjs
//
// 不需要 Deno、不需要构建。真实出网只打一次 /stats(验证 happy path),
// 其余断言都走不依赖网络的分支 —— 匿名 GitHub 额度只有 60 次/小时,别浪费。

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setGitHubToken } from "../cards/github.ts";
import { handler, indexPage } from "../deno_index.ts";

let pass = 0;
let failed = [];

function check(name, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    failed.push(name);
    console.log(`  FAIL ${name}${detail ? ` → ${detail}` : ""}`);
  }
}

const get = (path) => new Request(`https://cards.test${path}`);

async function expectCard(label, res, mustInclude = "<svg") {
  const body = await res.text();
  check(
    `${label} ${res.status}`,
    res.status === 200 && body.includes(mustInclude),
    `status=${res.status} body=${body.slice(0, 80)}`,
  );
  return body;
}

// 非法用户名在发请求之前就抛错,所以这条路径离线可复现
const BAD_USER = "/stats?username=not_a_user";
const ERR_TEXT = "不合法";

setGitHubToken(process.env);

console.log("核心层 deno_index.ts");
{
  const svg = await handler(get("/stats?username=octocat"));
  await expectCard("/stats happy path", svg);
  check(
    "成功卡片带 CDN 缓存头",
    (svg.headers.get("cache-control") || "").includes("s-maxage=3600"),
  );
  await expectCard(
    "非法用户名 → 错误卡片",
    await handler(get(BAD_USER)),
    ERR_TEXT,
  );
  const err = await handler(get(BAD_USER));
  check("错误卡片 no-store", err.headers.get("cache-control") === "no-store");
  check("未知路径 404", (await handler(get("/nope"))).status === 404);
  const home = await handler(get("/"));
  check("首页 HTML", (home.headers.get("content-type") || "").includes("text/html"));
  check("indexPage 带前缀", indexPage("https://x.test/sub").includes("https://x.test/sub/stats"));
  check(
    "子路径兜底匹配(Sites 网关会改写前缀)",
    (await handler(get("/functions/v1/app/languages?username=not_a_user"))).status === 200,
  );
}

// 必须解码:URL.pathname 会把中文目录写成 %E4%B8%8B…,existsSync 就不认识了
const EO = fileURLToPath(new URL("../platforms/edgeone/functions/", import.meta.url));
console.log("EdgeOne 产物 platforms/edgeone/functions/*.js");
if (!existsSync(EO)) {
  console.log("  skip 还没生成,先跑 node tools/build.mjs");
} else {
  for (const name of ["index", "stats", "languages", "activity", "repos", "health"]) {
    const mod = await import(`${EO}${name}.js`);
    check(`${name}.js 导出 onRequest`, typeof mod.onRequest === "function");
  }

  const stats = await import(`${EO}stats.js`);
  const ctx = (path, init) => ({
    request: new Request(`https://eo.test${path}`, init),
    env: { GITHUB_TOKEN: "" },
  });
  await expectCard("stats.js /stats", await stats.onRequest(ctx(BAD_USER)), ERR_TEXT);
  check(
    "stats.js 在 /languages 路径下也能出图",
    (await stats.onRequest(ctx("/languages?username=not_a_user"))).status === 200,
  );
  check(
    "OPTIONS 预检 204",
    (await stats.onRequest(ctx("/", { method: "OPTIONS" }))).status === 204,
  );
  check(
    "POST 被入口挡在 405",
    (await stats.onRequest(ctx("/stats", { method: "POST" }))).status === 405,
  );
  check(
    "首页路由出 HTML",
    ((await stats.onRequest(ctx("/"))).headers.get("content-type") || "")
      .includes("text/html"),
  );

  const health = await import(`${EO}health.js`);
  const probe = await health.onRequest({
    request: get("/health"),
    env: { GITHUB_TOKEN: "dummy-not-a-real-token" },
  });
  const body = await probe.json();
  check("探针 200 且 ok", probe.status === 200 && body.ok === true);
  check("探针 no-store", probe.headers.get("cache-control") === "no-store");
  check("探针报出已配置的密钥", body.config.GITHUB_TOKEN === true);
  check(
    "探针不回显密钥值",
    !JSON.stringify(body).includes("dummy-not-a-real-token"),
  );
  check(
    "探针含运行时globals/路径字段",
    !!body.globals && typeof body.receivedPathname === "string",
  );
}

console.log("env 读取层");
{
  const { readEnv } = await import("../cards/env.ts");
  check("env 袋优先", readEnv({ A: "bag" }, "A") === "bag");
  check("袋里没有则退 process.env", readEnv(undefined, "PATH").length > 0);
  check("缺失返回空串而非默认值", readEnv({}, "GITHUB_TOKEN_NOPE") === "");
  check("两端空白被裁掉", readEnv({ A: "  x  " }, "A") === "x");
  let threw = false;
  try {
    (await import("../cards/env.ts")).requireEnv({}, "GITHUB_TOKEN_NOPE");
  } catch {
    threw = true;
  }
  check("requireEnv 缺配置时抛错", threw);
}

console.log(`\n${pass} 通过 / ${failed.length} 失败`);
if (failed.length) {
  console.log(failed.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
