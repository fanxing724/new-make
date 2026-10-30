import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { displayWidth } from "../cards/common.ts";
import { setGitHubToken } from "../cards/github.ts";
import { PROJECT_MOTIFS, projectLines, renderProjectCover } from "../cards/project.ts";
import { generateProjectAssets, readProjectConfig } from "../tools/projects.mjs";
import { copyFrozenProjectAssets } from "../tools/frozen-projects.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const temp = mkdtempSync(join(root, ".project-test-"));
let checks = 0;
function check(label, fn) { fn(); checks++; console.log(`  ok   ${label}`); }
const repo = { name: "test-project", description: "真实仓库描述", language: "TypeScript", fork: false };
const base = { repo, username: "project-tests", author: "测试作者", mode: "dark" };

try {
  check("中文和长英文封面文案按宽度换行", () => {
    for (const value of ["中文".repeat(100), "W".repeat(200)]) {
      const lines = projectLines(value);
      assert.equal(lines.length, 2);
      assert.ok(lines.every(line => displayWidth(line) <= 52));
      assert.ok(lines[1].endsWith("…"));
    }
  });
  check("八种图形均为完整自包含 SVG，明暗画面不同", () => {
    for (const motif of PROJECT_MOTIFS) {
      const dark = renderProjectCover({ ...base, motif });
      const light = renderProjectCover({ ...base, motif, mode: "light" });
      assert.notEqual(dark, light);
      assert.ok(dark.endsWith("</svg>"));
      assert.ok(!/<script|<foreignObject|<image|href="https?:/.test(dark));
      assert.ok(dark.includes("真实仓库描述"));
    }
  });
  check("封面转义署名和标题，拒绝颜色与路径注入", () => {
    const svg = renderProjectCover({ ...base, author: '<script>alert("x")</script>', title: 'A & <B>' });
    assert.ok(!svg.includes("<script>"));
    assert.ok(svg.includes("A &amp; &lt;B&gt;"));
    assert.throws(() => renderProjectCover({ ...base, accent: '#fff"/>' }));
    assert.throws(() => renderProjectCover({ ...base, repo: { ...repo, name: "../escape" } }));
  });
  check("作者可启用角色封面，日光与星空素材独立且等比内联", () => {
    const dark = renderProjectCover({ ...base, portrait: true });
    const light = renderProjectCover({ ...base, portrait: true, mode: "light" });
    assert.ok(dark.includes('<image href="data:image/webp;base64,'));
    assert.ok(dark.includes('preserveAspectRatio="xMidYMid slice"'));
    assert.ok(dark.includes("星轨手记"));
    assert.notEqual(dark.match(/href="([^"]+)"/)?.[1], light.match(/href="([^"]+)"/)?.[1]);
    assert.ok(!dark.includes('href="https://'));
    assert.ok(!renderProjectCover(base).includes("<image"));
  });

  const config = { baseUrl: "https://example.com/cards", owners: { "project-tests": { author: "测试作者", projects: {} } } };
  const originalFetch = globalThis.fetch;
  let requests = 0;
  try {
    setGitHubToken({ GITHUB_TOKEN: "" });
    globalThis.fetch = async () => {
      requests++;
      return Response.json([
        repo,
        { ...repo, name: "future-project", description: '未知项目 <script>alert(1)</script> & 说明' },
        { ...repo, name: "private-project", private: true },
        { ...repo, name: "fork-project", fork: true },
      ]);
    };
    const result = await generateProjectAssets({ outDir: join(temp, "assets"), usernames: ["project-tests"], config });
    check("发现新项目、过滤 Fork 与私有仓库，只需一次仓库列表请求", () => {
      assert.deepEqual(result.projects.map(p=>p.name), ["future-project", "test-project"]);
      assert.equal(requests, 1);
      assert.equal(result.items.filter(i=>i.kind === "project-cover").length, 4);
    });
    check("引用路径、介绍、明暗两份图片和画廊齐备且安全转义", () => {
      const p = result.projects.find(p=>p.name === "future-project");
      assert.ok(p.embed.includes("https://example.com/cards/project-tests/projects/future-project/cover.light.svg"));
      const gallery = readFileSync(join(temp, "assets/projects/index.html"), "utf8");
      assert.ok(gallery.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
      assert.ok(!gallery.includes("<script>alert(1)</script>"));
      assert.ok(gallery.includes("id=\"search\""));
      assert.ok(existsSync(join(temp, "assets", p.path, "intro.md")));
    });
  } finally { globalThis.fetch = originalFetch; }

  const cfg = join(temp, "config.json");
  const out = join(temp, "site");
  writeFileSync(cfg, JSON.stringify({ usernames: ["fanxing724"], output: relative(root, out), cards: { activity: {} }, projects: { config: "projects.config.json" } }));
  const run = mode => execFileSync(process.execPath, ["--import", join(root, "test/fake-github.mjs"), join(root, "tools/render.mjs"), "--config", cfg], { encoding: "utf8", stdio: "pipe", env: { ...process.env, FAKE_MODE: mode, GITHUB_TOKEN: "fake-token" } });
  run("normal");
  const previous = readFileSync(join(out, "status.json"), "utf8");
  check("现有预渲染同时发布统计卡和项目资产", () => {
    const status = JSON.parse(previous);
    assert.equal(status.items.filter(i=>i.kind === "project-cover").length, 4);
    assert.ok(existsSync(join(out, "fanxing724/activity.svg")));
    assert.ok(existsSync(join(out, "projects/index.html")));
    const style = readFileSync(join(out, "fanxing724/projects/style.html"), "utf8");
    assert.ok(style.includes("代码交给 AI"));
    assert.ok(style.includes('id="cover"'));
    assert.ok(style.includes("data:image/webp;base64,"));
    assert.ok(readFileSync(join(out, "index.html"), "utf8").includes('href="projects/"'));
  });
  check("项目 API 失败时整批退出，上一版统计与项目封面原样保留", () => {
    assert.throws(() => run("reposfail"));
    assert.equal(readFileSync(join(out, "status.json"), "utf8"), previous);
    assert.ok(existsSync(join(out, "fanxing724/projects/new-make/cover.svg")));
    assert.ok(!existsSync(out + ".staging"));
  });
  check("拒绝有凭据的发布地址与未知主题，CLI 不覆盖源码目录", () => {
    const invalid = join(temp, "invalid.json");
    writeFileSync(invalid, JSON.stringify({ ...config, baseUrl: "https://user:password@example.com" }));
    assert.throws(() => readProjectConfig(invalid));
    writeFileSync(invalid, JSON.stringify({ ...config, owners: { test: { projects: { repo: { motif: "unknown" } } } } }));
    assert.throws(() => readProjectConfig(invalid));
    assert.throws(() => execFileSync(process.execPath, [join(root, "tools/projects.mjs"), "--output", "cards"], { stdio: "pipe" }));
    assert.ok(existsSync(join(root, "cards/project.ts")));
  });
  check("固定封面离线复制，连续发布保持封面与生成时间不变", () => {
    const sourceDir = join(root, "project-assets");
    const target = join(temp, "frozen");
    const savedFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error("固定封面不应访问网络"); };
    try {
      const first = copyFrozenProjectAssets({ sourceDir, outDir: target });
      const second = copyFrozenProjectAssets({ sourceDir, outDir: target });
      assert.deepEqual(first.items, second.items);
      assert.ok(first.projects.length > 0);
      for (const item of first.items) {
        assert.deepEqual(readFileSync(join(target, item.path)), readFileSync(join(sourceDir, item.path)));
      }
      const broken = join(temp, "broken");
      assert.throws(() => copyFrozenProjectAssets({ sourceDir: broken, outDir: join(temp, "broken-output") }));
      assert.equal(existsSync(join(temp, "broken-output")), false);
    } finally { globalThis.fetch = savedFetch; }
  });
  check("定时链路只复制固定封面，仓库列表 API 失败不再触发重画", () => {
    const config = { usernames: ["fanxing724"], output: relative(root, out), cards: { activity: {} }, projects: { assets: "project-assets" } };
    writeFileSync(cfg, JSON.stringify(config));
    run("reposfail");
    const frozenStatus = readFileSync(join(out, "status.json"), "utf8");
    assert.deepEqual(readFileSync(join(out, "projects/manifest.json")), readFileSync(join(root, "project-assets/projects/manifest.json")));
    writeFileSync(cfg, JSON.stringify({ ...config, projects: { assets: relative(root, join(temp, "missing")) } }));
    assert.throws(() => run("normal"));
    assert.equal(readFileSync(join(out, "status.json"), "utf8"), frozenStatus);
  });
  console.log(`${checks} 项项目封面检查通过（假上游，未调用真实 GitHub）`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

export { checks as projectCheckCount };
