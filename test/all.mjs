// 统一本地检查:一条命令覆盖核心层 + 每个平台的产物。
//
//   node test/all.mjs
//
// 不需要 Deno、不需要构建。真实出网只打一次 /stats(验证 happy path),
// 其余断言都走不依赖网络的分支 —— 匿名 GitHub 额度只有 60 次/小时,别浪费。

import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setGitHubToken } from "../cards/github.ts";
import { handler, indexPage } from "../deno_index.ts";

// 必须解码:URL.pathname 会把中文目录写成 %E4%B8%8B…,拼出来的路径 spawn 出去找不到
const ROOT = fileURLToPath(new URL("..", import.meta.url));

let pass = 0;
let skipped = 0;
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

// 出网那条断言依赖匿名 GitHub 额度,共享出口 IP(CI runner)经常一上来就是 0。
// 额度耗尽不是代码坏了,所以判 skip 而不是 fail —— 但绝不放行成 ok,
// 因为"错误卡片也是 200 + <svg",静默降级成错误卡片正是这套检查要抓的东西。
function skip(name, why) {
  skipped++;
  console.log(`  skip ${name} (${why})`);
}

const ERR_MARK = "⚠️";

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
  const body = await svg.text();
  if (body.includes(ERR_MARK) && body.includes("限流")) {
    // 额度问题不是代码问题:判 skip。但必须喊出来,否则绿色会被读成"真实出网验证过"
    skip("/stats 出图", "匿名 GitHub 额度耗尽,真实链路未验证");
    skip("成功卡片带 CDN 缓存头", "同上");
    console.log("  ⚠️  本轮没有验证过任何真实 GitHub 出网路径");
  } else {
    check(
      "/stats happy path 200 且非错误卡片",
      svg.status === 200 && body.includes("<svg") && !body.includes(ERR_MARK),
      `status=${svg.status} 前 80 字=${body.slice(0, 80)}`,
    );
    check(
      "成功卡片带 CDN 缓存头",
      (svg.headers.get("cache-control") || "").includes("s-maxage=3600"),
    );
  }
  await expectCard(
    "非法用户名 → 错误卡片",
    await handler(get(BAD_USER)),
    ERR_TEXT,
  );
  const err = await handler(get(BAD_USER));
  check("错误卡片 no-store", err.headers.get("cache-control") === "no-store");
  check("未知路径 404", (await handler(get("/nope"))).status === 404);
  // 新增路由:非法用户名走同一道闸,不合法也在出网前拦下
  for (const route of ["/streak", "/badge"]) {
    await expectCard(
      `${route} 非法用户名 → 错误卡片`,
      await handler(get(`${route}?username=not_a_user`)),
      ERR_TEXT,
    );
  }
  const home = await handler(get("/"));
  check("首页 HTML", (home.headers.get("content-type") || "").includes("text/html"));
  check("indexPage 带前缀", indexPage("https://x.test/sub").includes("https://x.test/sub/stats"));
  check(
    "子路径兜底匹配(Sites 网关会改写前缀)",
    (await handler(get("/api/v1/cards/languages?username=not_a_user"))).status === 200,
  );
}

// 必须解码:URL.pathname 会把中文目录写成 %E4%B8%8B…,existsSync 就不认识了
const EO = fileURLToPath(new URL("../edge-functions/", import.meta.url));
console.log("EdgeOne 函数 edge-functions/*.js");
if (!existsSync(EO)) {
  console.log("  skip 还没生成,先跑 node tools/build.mjs");
} else {
  for (const name of ["index", "stats", "languages", "activity", "repos", "streak", "badge", "health"]) {
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

// 插画背景:base64 内联后每张卡都带着它,体积和"哪些主题该带图"必须锁住。
// 纯静态断言,不联网。
console.log("插画背景 cards/art.ts");
{
  const { THEMES } = await import("../cards/theme.ts");
  const { ARTS } = await import("../cards/art.ts");
  const { startCard } = await import("../cards/common.ts");

  const skeleton = (name) =>
    startCard(THEMES[name], 450, 210, "T", "S", name).join("\n");

  const art = skeleton("starlight");
  check(
    "starlight 内联插画",
    art.includes('<image href="data:image/webp;base64,'),
    art.slice(0, 200),
  );
  // 用户明确要求:可以裁,但不能拉伸变形。"none" 才会变形,必须挡住。
  check(
    "starlight 等比裁剪而非拉伸",
    art.includes('preserveAspectRatio="xMidYMid slice"') &&
      !art.includes('preserveAspectRatio="none"'),
  );
  check("starlight 插画被圆角裁切", art.includes("<clipPath") && art.includes('clip-path="url(#'));
  check(
    "starlight 无实心底板(露出插画)",
    !art.includes(`fill="${THEMES.starlight.card}" stroke=`),
  );

  for (const name of ["default", "catppuccin", "light"]) {
    check(`${name} 不含 <image>`, !skeleton(name).includes("<image"));
  }

  for (const [name, theme] of Object.entries(THEMES)) {
    if (theme.art) {
      check(
        `${name} 引用的插画存在`,
        Object.values(ARTS).includes(theme.art),
      );
    }
  }

  // 一张 4K png 能轻松把卡片顶到几百 KB,README 里四张图就是几 MB。
  // 上限按当前用量(35 KB)留足三倍余量,超了就是有人塞了大图。
  const bytes = Buffer.byteLength(JSON.stringify(ARTS), "utf8");
  check(
    "插画内联总量在预算内",
    bytes < 150 * 1024,
    `实得 ${(bytes / 1024).toFixed(1)} KB`,
  );
}

// repos 格子只有 300px,但 truncate 的上限一度写成 84"字数" —— 中文按 2 单位算,
// 84 单位 ≈ 504px,描述直接压到隔壁格子上。fitUnits 把字数换算回像素,这条锁住换算本身。
console.log("文字不溢出格子 fitUnits");
{
  const { fitUnits, displayWidth, truncate } = await import("../cards/common.ts");
  const CELL = 300, PAD = 15, SIZE = 12;
  const avail = CELL - PAD * 2;
  const lim = fitUnits(avail, SIZE);
  check("上限换算不超出可用宽度", lim * SIZE * 0.5 <= avail, `${lim} 单位 ≈ ${lim * 6}px > ${avail}px`);
  check("旧的 84 确实会溢出", 84 * SIZE * 0.5 > avail, "若这条失败说明换算系数变了,重新核对");

  const LONG = "基于多平台（github actions edgeone cloudflare）的github统计卡片仓库";
  const cut = truncate(LONG, lim);
  check("长描述被截断", displayWidth(cut) <= lim, `实得 ${displayWidth(cut)} 单位`);
  check("截断带省略号", cut.endsWith("…"));
  check("短描述原样保留", truncate("主页", lim) === "主页");
  // 极端:一个字符都放不下时也不能退化成空串或负数上限
  check("格子极窄时仍有下限", fitUnits(2, 40) >= 4, `实得 ${fitUnits(2, 40)}`);
}

// tools/render.mjs 是 Actions 里真正跑的那条链路,而 CI 打不起真实 GitHub 调用,
// 所以用 test/fake-github.mjs 当假上游,把成功路径和"限流时绝不产出红卡"各验一遍。
console.log("预渲染 tools/render.mjs (假上游)");
{
  const preload = pathToFileURL(join(ROOT, "test/fake-github.mjs")).href;
  const cfgPath = join(ROOT, ".render.test.json");
  const outName = ".test-cards";
  writeFileSync(
    cfgPath,
    JSON.stringify({
      usernames: ["fanxing724"],
      output: outName,
      cards: {
        stats: { theme: "default", show_icons: "true" },
        "stats.light": { theme: "light", show_icons: "true" },
        languages: { theme: "default", layout: "bar" },
        activity: { theme: "default" },
        repos: { theme: "default", count: "6" },
        streak: { theme: "default" },
      },
    }),
  );
  const outDir = join(ROOT, outName);

  const run = (mode, cfg = cfgPath) => {
    try {
      const stdout = execFileSync(
        process.execPath,
        ["--import", preload, join(ROOT, "tools/render.mjs"), "--config", cfg],
        {
          env: { ...process.env, FAKE_MODE: mode, GITHUB_TOKEN: "fake-token" },
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      return { code: 0, stdout };
    } catch (e) {
      // 失败报告走 stderr(脚本故意这么分),断言要合并两路才看得见
      return { code: e.status ?? -1, stdout: `${e.stdout || ""}${e.stderr || ""}` };
    }
  };

  rmSync(outDir, { recursive: true, force: true });
  const ok = run("normal");
  check("成功渲染退出码 0", ok.code === 0, ok.stdout.slice(-200));
  check(
    "产物含 5 张卡",
    ["stats", "languages", "activity", "repos", "streak"].every((c) =>
      existsSync(join(outDir, "fanxing724", `${c}.svg`)),
    ),
  );
  const streakSvg = existsSync(join(outDir, "fanxing724/streak.svg"))
    ? readFileSync(join(outDir, "fanxing724/streak.svg"), "utf8")
    : "";
  // payload.size=5 应体现在提交徽章里;热力图应有约 13*7 个格子
  check(
    "streak 卡含热力图格子",
    (streakSvg.match(/<rect/g) || []).length >= 91,
    `实得 ${(streakSvg.match(/<rect/g) || []).length}`,
  );
  const rendered = existsSync(join(outDir, "fanxing724/stats.svg"))
    ? readFileSync(join(outDir, "fanxing724/stats.svg"), "utf8")
    : "";
  check("渲染出的卡片不含错误标记", rendered.includes("<svg") && !rendered.includes(ERR_MARK));
  check("自检页与 status.json 齐备", existsSync(join(outDir, "index.html")) && existsSync(join(outDir, "status.json")));

  // 变体:深浅两份文件撑起 README 里的 <picture>。只判"文件在"不够 —— 参数没生效时
  // 文件照样在,只是和主文件一模一样,浅色模式下就是一块深色板。
  const lightPath = join(outDir, "fanxing724", "stats.light.svg");
  const light = existsSync(lightPath) ? readFileSync(lightPath, "utf8") : "";
  check("变体文件名带点号后缀", light.includes("<svg"));
  check(
    "变体真按自己的参数渲染(非主文件副本)",
    light !== "" && rendered !== "" && light !== rendered,
  );

  // card 键名要拼进产物路径,白名单挡的是 `../` 这种写到输出目录外的写法
  const badCfg = join(ROOT, ".render.bad.json");
  writeFileSync(
    badCfg,
    JSON.stringify({ usernames: ["fanxing724"], output: outName, cards: { "stats/../../evil": {} } }),
  );
  const bad = run("normal", badCfg);
  check(
    "非法键名被挡下且说人话",
    bad.code !== 0 && bad.stdout.includes("非法"),
    bad.stdout.slice(-160),
  );
  check("非法键名没留下越界产物", !existsSync(join(ROOT, "evil.svg")));
  unlinkSync(badCfg);

  // 这条是整套预渲染的安全带:限流时 handler 返回的仍是 200 + <svg> + ⚠️,
  // 让它进 CDN 就等于把红卡挂到下次成功为止,比不更新糟糕得多。
  rmSync(outDir, { recursive: true, force: true });
  const limited = run("ratelimit");
  check("限流时退出码非 0", limited.code !== 0, `实得 ${limited.code}`);
  check("限流时不产出任何文件", !existsSync(outDir));
  check(
    "限流时报错点名了具体卡片",
    limited.stdout.includes("错误卡片"),
    limited.stdout.slice(-200),
  );

  rmSync(outDir, { recursive: true, force: true });
  rmSync(join(ROOT, `${outName}.staging`), { recursive: true, force: true });
  unlinkSync(cfgPath);
}

console.log(
  `\n${pass} 通过 / ${failed.length} 失败${skipped ? ` / ${skipped} skip` : ""}`,
);
if (failed.length) {
  console.log(failed.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
