// Reuse the reviewed project assets without contacting GitHub or rendering.
import { copyFileSync, lstatSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertUsername } from "../cards/github.ts";
import { assertProjectName } from "../cards/project.ts";

export function copyFrozenProjectAssets({ sourceDir, outDir }) {
  const manifest = JSON.parse(readFileSync(join(sourceDir, "projects/manifest.json"), "utf8"));
  if (!Array.isArray(manifest.projects)) throw new Error("固定项目资产缺少 projects 清单");
  const files = new Map([
    ["projects/index.html", "project-gallery"],
    ["projects/manifest.json", "project-manifest"],
  ]);
  for (const project of manifest.projects) {
    assertUsername(project.username);
    assertProjectName(project.name);
    const path = `${project.username}/projects/${project.name}`;
    if (project.path !== path) throw new Error("固定项目资产路径与清单不符");
    for (const name of ["cover.svg", "cover.light.svg", "intro.md", "embed.md"]) {
      files.set(`${path}/${name}`, name.endsWith(".svg") ? "project-cover" : name === "intro.md" ? "project-intro" : "project-embed");
    }
    if (project.portrait) files.set(`${project.username}/projects/style.html`, "project-styleguide");
  }
  // Validate the complete source first; missing files must not produce a partial publish.
  for (const relative of files.keys()) {
    const parts = relative.split("/");
    for (let depth = 1; depth <= parts.length; depth++) {
      if (lstatSync(join(sourceDir, ...parts.slice(0, depth))).isSymbolicLink()) throw new Error("固定项目资产不允许符号链接");
    }
    if (!statSync(join(sourceDir, relative)).isFile()) throw new Error("固定项目资产不是文件");
  }
  const items = [];
  for (const [relative, kind] of files) {
    const target = join(outDir, relative);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(sourceDir, relative), target);
    items.push({ path: relative, bytes: statSync(target).size, kind });
  }
  return { items, projects: manifest.projects };
}
