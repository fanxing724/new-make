// 单独生成项目封面，也由 tools/render.mjs 在同一个 staging 中调用。
// 不写入目标仓库；只产出 SVG、文案草稿和可复制的 README 引用。
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { escapeXml } from "../cards/common.ts";
import { assertUsername, fetchOwnRepos, setGitHubToken } from "../cards/github.ts";
import { assertProjectName, PROJECT_MOTIFS, renderProjectCover } from "../cards/project.ts";
import { projectStylePage } from "./styleguide.mjs";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function readProjectConfig(path = join(PROJECT_ROOT, "projects.config.json")) {
  const config = JSON.parse(readFileSync(path, "utf8"));
  const url = new URL(config.baseUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("项目 baseUrl 必须是无凭据、查询参数或片段的 HTTPS 地址");
  }
  config.baseUrl = url.href.replace(/\/$/, "");
  if (!config.owners || typeof config.owners !== "object" || Array.isArray(config.owners)) {
    throw new Error("项目配置缺少 owners 对象");
  }
  for (const [username, owner] of Object.entries(config.owners)) {
    assertUsername(username);
    if (!owner || typeof owner !== "object" || Array.isArray(owner)) throw new Error(`非法 owner: ${username}`);
    if (owner.author !== undefined && (typeof owner.author !== "string" || !owner.author.trim())) throw new Error(`作者不能为空: ${username}`);
    if (owner.portrait !== undefined && typeof owner.portrait !== "boolean") throw new Error(`portrait 必须是布尔值: ${username}`);
    for (const [name, identity] of Object.entries(owner.projects || {})) {
      assertProjectName(name);
      if (!identity || typeof identity !== "object" || Array.isArray(identity)) throw new Error(`非法项目配置: ${name}`);
      for (const field of ["title", "tagline", "story", "category", "accent", "motif"]) {
        if (identity[field] !== undefined && (typeof identity[field] !== "string" || !identity[field].trim())) {
          throw new Error(`${username}/${name}: ${field} 必须是非空文本`);
        }
      }
      if (identity.accent && !/^#[0-9a-f]{6}$/i.test(identity.accent)) throw new Error(`非法项目颜色: ${name}`);
      if (identity.motif && !PROJECT_MOTIFS.includes(identity.motif)) throw new Error(`未知项目图形: ${name}`);
      if (identity.portrait !== undefined && typeof identity.portrait !== "boolean") throw new Error(`portrait 必须是布尔值: ${name}`);
    }
  }
  return config;
}

export function projectEmbed(baseUrl, username, name, title) {
  const base = `${baseUrl}/${encodeURIComponent(username)}/projects/${encodeURIComponent(name)}`;
  return `<picture>\n  <source media="(prefers-color-scheme: light)" srcset="${escapeXml(base)}/cover.light.svg">\n  <img alt="${escapeXml(title)}" src="${escapeXml(base)}/cover.svg" width="100%">\n</picture>`;
}

function projectGallery(projects, generatedAt) {
  const e = escapeXml;
  return `<!doctype html>
<html lang="zh-CN" data-mode="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>番星 · 项目制卡室</title><style>
*{box-sizing:border-box}html{color-scheme:dark;--bg:#101820;--panel:#17222c;--ink:#eeeae3;--muted:#b2bec8;--line:#34424e;--accent:#edba87}html[data-mode=light]{color-scheme:light;--bg:#f7f4ed;--panel:#fffdf8;--ink:#26323d;--muted:#5b6772;--line:#dbd7cf;--accent:#965a30}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 system-ui,'Noto Sans CJK SC',sans-serif}main{max-width:1080px;margin:auto;padding:64px 28px 80px}a{color:var(--accent)}header{border-bottom:1px solid var(--line);padding-bottom:32px;margin-bottom:32px}.eyebrow{letter-spacing:3px;font-size:12px;color:var(--accent)}h1{font-size:clamp(28px,5vw,48px);line-height:1.2;margin:16px 0}header p{max-width:680px;color:var(--muted)}.toolbar{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}input,button{font:inherit;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--ink);padding:10px 14px}input{flex:1;min-width:180px}button{cursor:pointer}button:hover{border-color:var(--accent)}article{margin:28px 0 44px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--panel)}article[hidden]{display:none}img{display:block;width:100%;height:auto}.body{padding:22px 26px}h2{font-size:20px;margin:0 0 8px}.meta{font-size:12px;color:var(--muted)}.story{max-width:820px;margin:14px 0 20px}details{border-top:1px solid var(--line);padding-top:16px}summary{cursor:pointer;color:var(--accent)}textarea{display:block;width:100%;min-height:155px;resize:vertical;padding:14px;margin:12px 0;font:12px/1.6 ui-monospace,monospace;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:8px}.links{display:flex;gap:18px;flex-wrap:wrap;font-size:13px}footer{color:var(--muted);font-size:12px}.empty{color:var(--muted)}@media(max-width:520px){main{padding:32px 14px}.body{padding:18px}article{border-radius:12px}}
</style></head><body><main><header><div class="eyebrow">FANXING / PROJECT FIELD NOTES</div><h1>每个想法，都有自己的出场方式。</h1><p>同一份番星署名，各自的故事、配色与图形。选择喜欢的明暗效果，展开项目下方的引用代码，就能放进 README。</p>${[...new Set(projects.filter(p => p.portrait).map(p => p.username))].map(u => `<p><a href="../${e(u)}/projects/style.html">${e(u)} · 星轨手记风格样板 →</a></p>`).join("")}<div class="meta">${projects.length} 个公开非 Fork 项目 · 生成于 ${e(generatedAt)} · 文案为可编辑草稿</div><div class="toolbar"><input id="search" type="search" placeholder="找一个项目…" aria-label="搜索项目"><button id="mode" type="button">切换明暗</button></div></header>
${projects.map(p => {
    const dir = `../${p.path}`;
    return `<article data-search="${e(`${p.name} ${p.title} ${p.category}`.toLowerCase())}"><img src="${e(dir)}/cover.svg" data-dark="${e(dir)}/cover.svg" data-light="${e(dir)}/cover.light.svg" alt="${e(p.title)} 项目封面" width="1200" height="400" loading="lazy"><div class="body"><div class="meta">${e(p.username)}/${e(p.name)} · ${e(p.category)}</div><h2>${e(p.title)}</h2><p class="story">${e(p.story)}</p><div class="links"><a href="https://github.com/${e(p.username)}/${e(p.name)}">项目源码 ↗</a><a href="${e(dir)}/intro.md">介绍草稿</a><a href="${e(dir)}/cover.svg">深色 SVG</a><a href="${e(dir)}/cover.light.svg">浅色 SVG</a></div><details><summary>README 引用代码</summary><textarea readonly aria-label="${e(p.name)} 的引用代码">${e(p.embed)}</textarea><button type="button" class="copy">复制引用</button><span role="status" class="meta"></span></details></div></article>`;
  }).join("\n")}
<p id="empty" class="empty" hidden>没有找到这个项目。</p><footer>new-make · SVG 为主题插画，文案不代表功能验收状态。图片由 Pages 静态分发，阅读 README 不会额外调用 GitHub API。</footer></main>
<script>
const root=document.documentElement;function mode(light){root.dataset.mode=light?'light':'dark';document.querySelectorAll('img[data-dark]').forEach(img=>img.src=light?img.dataset.light:img.dataset.dark);document.querySelector('#mode').textContent=light?'查看深色封面':'查看浅色封面'}mode(matchMedia('(prefers-color-scheme: light)').matches);document.querySelector('#mode').addEventListener('click',()=>mode(root.dataset.mode!=='light'));
document.querySelector('#search').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();let visible=0;document.querySelectorAll('article').forEach(a=>{a.hidden=!a.dataset.search.includes(q);if(!a.hidden)visible++});document.querySelector('#empty').hidden=visible>0});
document.querySelectorAll('.copy').forEach(b=>b.addEventListener('click',async()=>{const t=b.parentElement.querySelector('textarea'),s=b.nextElementSibling;try{await navigator.clipboard.writeText(t.value);s.textContent=' 已复制'}catch{t.focus();t.select();s.textContent=' 已选中，请手动复制'}}));
</script></body></html>`;
}

export async function generateProjectAssets({ outDir, usernames, config }) {
  const items = [];
  const projects = [];
  function save(relative, text, kind) {
    const file = join(outDir, relative);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    items.push({ path: relative, bytes: statSync(file).size, kind });
  }
  for (const username of usernames) {
    assertUsername(username);
    const owner = config.owners[username] || {};
    const author = owner.author || username;
    const repos = await fetchOwnRepos(username);
    for (const repo of repos.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      // 即使未来数据层扩大查询范围，也不允许私有项目被发布到公开 Pages。
      if (repo.private || repo.visibility === "private") continue;
      assertProjectName(repo.name);
      const identity = owner.projects?.[repo.name] || {};
      const portrait = identity.portrait ?? owner.portrait ?? false;
      const title = identity.title || repo.name;
      const tagline = identity.tagline || repo.description || "一个从日常想法开始的开源项目。";
      const story = identity.story || repo.description || "项目介绍尚待补充，当前实现请以仓库说明为准。";
      const category = identity.category || "日常造物";
      const path = `${username}/projects/${repo.name}`;
      for (const mode of ["dark", "light"]) {
        const svg = renderProjectCover({ ...identity, portrait, username, author, repo, mode });
        save(`${path}/cover${mode === "light" ? ".light" : ""}.svg`, svg, "project-cover");
      }
      const embed = projectEmbed(config.baseUrl, username, repo.name, title);
      save(`${path}/embed.md`, embed + "\n", "project-embed");
      // 作者/项目名来自可编辑的配置，放进 HTML 时统一转义。
      const intro = `${embed}\n\n<h1>${escapeXml(title)}</h1>\n\n<p><strong>${escapeXml(tagline)}</strong></p>\n\n<p>${escapeXml(story)}</p>\n\n<p>${escapeXml(author)} · <a href="https://github.com/${username}/${repo.name}">项目源码</a></p>\n`;
      save(`${path}/intro.md`, intro, "project-intro");
      projects.push({ username, name: repo.name, title, tagline, story, category, path, embed, portrait, customized: !!owner.projects?.[repo.name] });
    }
  }
  const generatedAt = new Date().toISOString();
  for (const username of usernames) {
    if (config.owners[username]?.portrait) {
      save(`${username}/projects/style.html`, projectStylePage(projects.filter(p => p.username === username), config.owners[username]), "project-styleguide");
    }
  }
  save("projects/index.html", projectGallery(projects, generatedAt), "project-gallery");
  save("projects/manifest.json", JSON.stringify({ generatedAt, projects }, null, 2) + "\n", "project-manifest");
  return { items, projects };
}

// 独立预览只请求仓库列表，不拉个人统计或逐仓库语言明细。
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
  const out = resolve(PROJECT_ROOT, arg("--output") || "dist-projects");
  if (out === PROJECT_ROOT || !out.startsWith(PROJECT_ROOT + "/")) throw new Error("output 必须是仓库根下的子目录");
  if (existsSync(out) && !existsSync(join(out, ".new-make-projects"))) throw new Error("output 已存在且不是独立项目生成器的产物，不覆盖");
  const config = readProjectConfig(resolve(PROJECT_ROOT, arg("--config") || "projects.config.json"));
  const usernames = arg("--username") ? [arg("--username")] : Object.keys(config.owners);
  mkdirSync(dirname(out), { recursive: true });
  const stage = mkdtempSync(out + ".staging-");
  setGitHubToken(process.env);
  try {
    const result = await generateProjectAssets({ outDir: stage, usernames, config });
    writeFileSync(join(stage, ".new-make-projects"), "Generated by new-make/tools/projects.mjs\n");
    rmSync(out, { recursive: true, force: true });
    renameSync(stage, out);
    console.log(`${result.projects.length} 个项目 / ${result.items.filter(i=>i.kind === "project-cover").length} 张封面 → ${out}/projects/index.html`);
  } catch (error) {
    rmSync(stage, { recursive: true, force: true });
    console.error(`项目生成失败，保留上一版产物: ${error.message}`);
    process.exitCode = 1;
  }
}
