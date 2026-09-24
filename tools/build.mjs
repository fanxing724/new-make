// 多平台产物生成:单一真源 cards/ + deno_index.ts → platforms/<目标>/
//
// 只用 Node 内置(module.stripTypeScriptTypes),不引打包器 —— 理由见 README「多平台」。
// 生成物一律不手改:改了会被下次 build 覆盖,要改请改源文件。
//
//   node tools/build.mjs

import { stripTypeScriptTypes } from "node:module";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "deno_index.ts";

// 边缘函数目录名。CLI 认 ["functions","node-functions","edge-functions","cloud-functions"]
// 四个根级目录,但 `functions` 是旧 Pages 时代的名字(官方文档里只剩一处 pathPatterns
// 兼容),现行示例一律写 `edge-functions`。顺带避开 Cloudflare Pages 的同名目录。
const EO_DIR = "edge-functions";

// 相对 import(含跨行的多行写法),捕获组给依赖图用
const IMPORT_RE = /^[ \t]*import[\s\S]*?from[ \t]*"(\.[^"]+)";?[ \t]*$/gm;
const EXPORT_DECL_RE = /^export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/gm;
const MAIN_BLOCK_RE = /\nif \(import\.meta\.main\) \{/;
const TOP_DECL_RE =
  /^(?:export\s+)?(?:async function|function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;

function fail(msg) {
  console.error(`build 失败: ${msg}`);
  process.exit(1);
}

function normalize(p) {
  return p.replace(/^\.\//, "");
}

function strip(relPath) {
  const src = readFileSync(join(ROOT, relPath), "utf8");
  const js = stripTypeScriptTypes(src);
  const deps = [];
  for (const m of js.matchAll(IMPORT_RE)) {
    deps.push(normalize(join(dirname(relPath), m[1])));
  }
  return { relPath, js, deps };
}

/** 依赖在前、入口在后。这个项目无环,重复模块只收一次。 */
function collectGraph() {
  const seen = new Set();
  const order = [];
  const visit = (relPath) => {
    if (seen.has(relPath)) return;
    seen.add(relPath);
    const mod = strip(relPath);
    for (const dep of mod.deps) visit(dep);
    order.push(mod);
  };
  visit(ENTRY);
  return order;
}

/**
 * 内联 = 把整张模块图拼成一个自包含作用域,产物里一个 import 都不剩。
 * 这么做是因为边缘函数目录能否 import 目录外文件尚未在线上证实;
 * 零 import 就绕开了这个未知项,不必等探针结论。代价是同一段逻辑按路由文件数复制。
 */
function inlineCore() {
  const chunks = [];
  const declared = new Map();
  for (const { relPath, js } of collectGraph()) {
    let body = js;

    const cut = MAIN_BLOCK_RE.exec(body);
    if (cut) {
      // 本地 dev 启动块必须一直到文件末尾:整段切掉,只允许它后面没有别的代码
      if (!/\}\s*$/.test(body.slice(cut.index))) {
        fail(`${relPath} 的 import.meta.main 块后面还有代码,不敢切`);
      }
      body = body.slice(0, cut.index);
    }

    if (/^export\s+default\b/m.test(body)) {
      fail(`${relPath} 有 export default,不能内联`);
    }
    body = body.replace(IMPORT_RE, "\n").replace(EXPORT_DECL_RE, "");
    body = body.replace(/\n{3,}/g, "\n\n").trim();

    // 拼进同一个作用域,顶层标识符必须全局唯一 —— 撞名会静默互相覆盖,所以当场报错
    for (const m of body.matchAll(TOP_DECL_RE)) {
      const owner = declared.get(m[1]);
      if (owner && owner !== relPath) {
        fail(`顶层标识符 ${m[1]} 在 ${owner} 和 ${relPath} 里重复,内联会互相覆盖`);
      }
      declared.set(m[1], relPath);
    }
    chunks.push({ relPath, body });
  }

  const merged = chunks.map((c) => `// ==== 源: ${c.relPath} ====\n${c.body}`).join("\n\n");
  // 校验用不带 g 的字面量:test() 会推进 lastIndex,复用带 g 的正则迟早误判
  if (/^[ \t]*import[\s\S]*?from[ \t]*"\.[^"]+";?[ \t]*$/m.test(merged)) {
    fail("内联结果仍残留相对 import");
  }
  if (/^export\s+default\b/m.test(merged)) fail("内联结果仍残留 export default");
  return merged;
}

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return relative(ROOT, path);
}

const BANNER =
  "// 生成物,勿手改。真源是仓库根的 cards/ + deno_index.ts,改完跑 node tools/build.mjs\n";

// 一个文件一条路由,五个文件名同一份核心,靠 URL 路径分流
const EDGEONE_ROUTES = ["index", "stats", "languages", "activity", "repos"];

function buildEdgeOne(core) {
  const dir = join(ROOT, EO_DIR);
  rmSync(dir, { recursive: true, force: true });

  const route = `${BANNER}
${core}

// ==== 路由入口 ====
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "access-control-allow-methods": "GET, OPTIONS" },
    });
  }
  if (request.method !== "GET") return new Response("Not Allowed", { status: 405 });
  return handler(request, env);
}

export default onRequest;
`;

  const files = EDGEONE_ROUTES.map((name) =>
    writeFile(join(dir, `${name}.js`), route)
  );

  // EdgeOne 拿不到 stdout,免鉴权探针是线上唯一的排障入口;只回布尔,永不回显变量值
  files.push(
    writeFile(join(dir, "health.js"), `${BANNER}
${core}

export function onRequest(context) {
  const { env, request } = context;
  return new Response(
    JSON.stringify({
      ok: true,
      version: new Date().toISOString().slice(0, 10),
      config: { GITHUB_TOKEN: !!readEnv(env, "GITHUB_TOKEN") },
      envType: typeof env,
      globals: {
        caches: typeof caches,
        Deno: typeof Deno,
        process: typeof process,
      },
      receivedPathname: new URL(request.url).pathname,
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export default onRequest;
`),
  );
  return files;
}

const files = [...buildEdgeOne(inlineCore())];
console.log(files.map((f) => "  " + f).join("\n"));
console.log(`共 ${files.length} 个文件 → ${EO_DIR}/ (EdgeOne Makers 边缘函数目录)`);
