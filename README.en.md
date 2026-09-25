# GitHub Cards 🃏

English | [简体中文](./README.md)

A dynamic SVG card generator for your GitHub Profile README.

Bring your GitHub profile README to life! Deploy the service, reference the image URLs in your README, and the cards update themselves.

Two shapes, one data layer:

| Shape | Who runs it | Best for |
|-------|-------------|----------|
| **Pre-rendered** (recommended) | A scheduled GitHub Actions job producing static `.svg` files | Public personal use — visitors never touch your rate limit |
| **On-demand service** | A long-running / edge function computing per request | Serving cards for arbitrary usernames |

## ✨ Features

- 📊 **Stats card** — repos, stars, commits in the last 90 days, forks, followers, and more
- 🔤 **Languages card** — visualize your code language distribution (donut / bar)
- ⚡ **Activity card** — recent event stats + the 3 latest events
- 📦 **Repos card** — your repository list in a two-column grid
- 🎨 **7 themes** — default, light, dracula, nord, monokai, catppuccin, plus an illustrated-background theme `starlight`

## 🥇 Main route: GitHub Actions pre-rendering

Replace "hit the GitHub API every time someone views your profile" with "hit it once per hour and publish the output as static files".

```
render.config.json  who to render, and card parameters
tools/render.mjs    calls handler() to produce SVGs → dist-cards/
render.yml          hourly render → Pages publish
```

The URL becomes a static file:

```markdown
![GitHub stats](https://<username>.github.io/<repo>/<username>/stats.svg)
```

The four cards are `stats.svg` / `languages.svg` / `activity.svg` / `repos.svg`.

To follow GitHub's light/dark mode (equivalent to the `theme` parameter in the on-demand service), add a variant suffix to the card keys in `cards`:

```json
"stats":       { "theme": "catppuccin", "show_icons": "true" },
"stats.light": { "theme": "light",      "show_icons": "true" }
```

The part before the dot picks the route; the part after only names the file — producing `stats.svg` and `stats.light.svg`. In your README, use `<picture>` to pick one:

```html
<picture>
  <source media="(prefers-color-scheme: light)" srcset="…/fanxing724/stats.light.svg">
  <img alt="GitHub stats" src="…/fanxing724/stats.svg" width="400">
</picture>
```

All variants in one run share the 5-minute in-process cache, so the second copy costs almost no extra API calls.

### Why not an on-demand service

Caching cannot save an on-demand service's rate limit. `username` is only validated for **format**, not existence — appending random characters to `?username=` forces an origin fetch every time. **The cache key is chosen by the requester**, and no `s-maxage` can stop that. Profile images are fetched through `camo.githubusercontent.com`, so all visitors share a handful of egress IPs in GitHub's eyes — IP-based rate limiting breaks just as easily. The previous Deno-hosted version was drained exactly this way.

Pre-rendering fully decouples "visitor count" from "API call count": a thousand profile views cause zero additional GitHub API calls.

### Going live (three steps — skipping step 2 will definitely break)

1. Fork this repo and change `usernames` in `render.config.json` to your own.
2. In the repo, **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
   The default is "Deploy from a branch"; `actions/deploy-pages` fails outright without this change.
   This is the only console step, and no secrets are required.
3. Manually run **Actions → render-cards → Run workflow** once and confirm it goes green. Afterwards it re-renders automatically every hour.

The token is the Actions-provided `secrets.GITHUB_TOKEN`: issued per run, auto-revoked afterwards, with a quota separate from the anonymous 60/hour. **No long-lived secret exists** in the repo or your account — one more reason this route is more robust than a hosted function.

### Two rules you must not break

- **Never delete `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`** — without it you fall back to the anonymous 60 requests/hour, and a single languages card makes one request per repo; two or three accounts on the list can burn through the quota.
- **One failure, no publish** — when the render script recognizes an error card (rate limited, user not found… their HTTP status is also 200; only the `⚠️` marker gives them away) it exits 1, so Actions never reaches the publish step and the last good version stays online. Better to show a three-hour-old card than a `⚠️ Rate limited` one — once a red card enters the CDN it stays until the next successful render.

Corollary: **one misspelled username stops card updates for everyone on the list** (Actions goes red, never silent). That's deliberate — a half-mixed output is harder to debug than a stale one. After adding someone, run `node tools/render.mjs` locally or check that Actions is green before merging.

You can verify this without waiting for the schedule: the three checks in `node test/all.mjs` ("non-zero exit on rate limit / no files produced on rate limit / error names the specific card") run against a fake upstream.

### Adding a person = one line

Add a name to the `usernames` array in `render.config.json` and open a PR. It re-renders on merge and updates hourly afterwards. Parameters (theme, bar vs donut, repo count) live in the same file — no code changes needed.

The trade-off, stated plainly: **only usernames on the list can be rendered**. That's exactly why it's cheap — nobody can use your pipeline to render their own cards. To serve arbitrary usernames, see the on-demand routes below.

## 🚀 Alternative: Deno Deploy

> [!WARNING]
> This route has been verified to get its quota drained (see the previous section). Only use it if you truly need "cards for arbitrary usernames" and are willing to configure a token with its own quota.


### 1. Fork this project

### 2. Sign in to Deno Deploy

Visit [Deno Deploy](https://dash.deno.com/) and log in with GitHub.

### 3. Create a project

- **New Project** → **Deploy from GitHub repository**
- Select your fork
- Choose `deno_index.ts` as the **Entrypoint**
- Your service URL will be `https://<project-name>.deno.dev`

### 4. (Strongly recommended) Configure GITHUB_TOKEN

Add the environment variable `GITHUB_TOKEN` in project settings (public read-only scope is enough).

Anonymous GitHub API calls get only **60 requests/hour**, and a single languages card hits the languages endpoint for every repo — rate limiting is easy to trigger. With a token the quota rises to 5,000/hour.

## ☁️ Alternative: Cloudflare Workers

> Same on-demand model as Deno Deploy, so the same "requester-controlled cache key" constraint applies. Switching platforms doesn't solve it: the scarce resource is the **GitHub API quota**, not the host's request count — Workers gives 100k requests/day for free, but anonymous GitHub calls still cap at 60/hour; the surplus compute has nothing to compute.


`handler` is pure Web Fetch API; the Workers entry is `worker.ts` (shape conversion only).

```bash
npm install -g wrangler
wrangler login
wrangler secret put GITHUB_TOKEN   # optional but strongly recommended
wrangler deploy                    # deploy, get https://new-make.<subdomain>.workers.dev
```

Configuration lives in `wrangler.toml`. The Workers free tier (100k requests/day) is more generous than Deno Deploy.

You can also bind this repo in the Cloudflare Dashboard via **Workers & Pages → Import from GitHub**: it reads `wrangler.toml` and auto-deploys on every push; add `GITHUB_TOKEN` under **Settings → Variables and Secrets** as a Secret.

## 🧩 One codebase, multiple platforms

`cards/` + `deno_index.ts` is the single source of truth; platform differences are confined to thin entry points (secret injection and call-shape conversion only, no business logic):

| Shape | Platform | Entry | How GITHUB_TOKEN is provided |
|-------|----------|-------|------------------------------|
| **Pre-rendered** | GitHub Pages | `tools/render.mjs` + `render.yml` | Actions' ephemeral `secrets.GITHUB_TOKEN`, nothing to configure |
| On-demand | Deno Deploy | `deno_index.ts` (local startup block at the bottom) | Project environment variable |
| On-demand | Cloudflare Workers / Pages | `worker.ts` | `wrangler secret put` |
| On-demand | Node (local long-running) | `node_server.mjs` | Process environment variable |
| On-demand | EdgeOne Makers | `edge-functions/` (**generated**) | Console variable |

In the on-demand rows, `handler` is one copy with four shells; the pre-rendered row reuses the same `handler`, swapping "request-driven" for "schedule-driven". All five paths produce byte-identical images.

The EdgeOne artifacts are generated inline: whether a functions directory can import files outside it is unverified in production, so each generated route file carries all logic with zero imports — nothing depends on that unknown.

```bash
node tools/build.mjs   # cards/ + deno_index.ts → edge-functions/*.js
node test/all.mjs      # core layer + every function route + config probe, all in one
```

`edge-functions/` is generated but **intentionally committed**: after linking GitHub, EdgeOne looks for the functions directory with "repo root = site root"; putting it in a subdirectory would force manual ZIP uploads. Re-run `build` after changing sources; never hand-edit the files. If you forget, CI goes red with "artifacts stale".

The directory rename from `functions/` came from testing: `edgeone makers generate-routes` recognizes four root-level directories `["functions","node-functions","edge-functions","cloud-functions"]`, yet the official examples all use `edge-functions/`; `functions` remains only as legacy Pages compatibility. Dropping it also avoids the name collision with Cloudflare Pages' same-named directory (this project uses `worker.ts` in Workers mode, so it was never affected anyway).

### edgeone.json

The project descriptor at the repo root, just one line:

```json
{ "outputDirectory": "." }
```

`outputDirectory: "."` pins "site root = repo root", leaving the platform no chance to guess a framework (the repo contains `deno.json`; being detected as a Deno project and sent to a build would be trouble). The validator accepts it and passes it through verbatim into `routes.json`'s `conf`.

**`cloudFunctions.mainlandRegions` was an earlier mistake, now removed.** The CLI's exact words:

```
[DEPRECATED] Detected cloudFunctions.mainlandRegions, please migrate to cloudFunctions.regions.mainland.
```

Two problems stacked: the field name is deprecated, and its semantics are **mainland-China SCF deployment regions** (per the CLI's zod schema), which only apply to the Cloud Functions tier. This project runs edge functions (V8) with no SCF at all — keeping it would be "configuring a field that affects nothing". The sneakiest part of such fields is that they don't error — you think mainland access is being rescued by it, when nothing is happening.

The other fields are deliberately left blank; don't add them casually:

- `headers` — wait until it's verified whether the edge respects the function's own `Cache-Control`. Adding one preemptively would override the function's more appropriate header.
- `buildCommand` / `installCommand` / `nodeVersion` — the artifacts are already in the repo; the platform has nothing to build.
- `redirects` / `rewrites` — routing is decided directly by filenames in `edge-functions/`; no mapping layer needed.

### Going live

Console → EdgeOne Makers → new project → link this repo (config read from `edgeone.json`), then add `GITHUB_TOKEN` in project variables — without it you fall back to anonymous 60/hour, and a single languages card can burn through the quota. Two acceptance checks:

```bash
curl https://your-domain/health                       # functions dir recognized + secret read
curl -sI "https://your-domain/stats?username=octocat"  # edge cache headers
```

If `/health` returns HTML or 404 → `edge-functions/` wasn't recognized; if it returns JSON but `config.GITHUB_TOKEN:false` → the variable didn't take effect, redeploy once after fixing. This route is a probe returning only booleans and variable names — no secret values leak.

How to judge whether the edge cache is actually working: request the same URL twice; if `age` grows or a HIT-type header appears, the edge is absorbing; if `age` is always 0, every refresh hits GitHub — then add a `headers` entry to `edgeone.json`.

You can also validate the config locally with the CLI (no login needed for the validation verdict):

```bash
edgeone makers generate-routes   # validates edgeone.json + generates the route table, no deploy
```

## 📁 Directory structure

```
new-make/
├─ README.md               Chinese docs (README.en.md is the English version)
├─ deno_index.ts          source of truth · route table + handler(req, env?, basePath?) + index page
├─ cards/                 source of truth · GitHub data layer, 7 themes, SVG assembly for 4 cards
│  ├─ art.ts              [generated] illustration base64; run tools/art.mjs to swap, don't hand-edit
│  └─ env.ts              the only entry for cross-platform config reads; nothing else may touch Deno.env / process.env
├─ render.config.json     pre-render list: who to render, card parameters
├─ tools/render.mjs       source → dist-cards/ (calls handler, no separate rendering logic)
├─ tools/art.mjs          image → cards/art.ts (base64 inline, see "Illustrated background theme")
├─ dist-cards/            [generated, not committed] published via Pages artifact by Actions
├─ .github/workflows/
│  ├─ render.yml          hourly render + publish to GitHub Pages
│  └─ ci.yml              re-runs build; goes red on stale artifacts or failed checks
├─ edge-functions/        [generated] EdgeOne edge functions, each file self-contained, zero imports
├─ worker.ts              Cloudflare Workers entry
├─ wrangler.toml          Cloudflare config
├─ node_server.mjs        Node entry (local preview / long-running)
├─ deno.json              Deno tasks and fmt config
├─ edgeone.json           EdgeOne Makers project descriptor
├─ tools/build.mjs        source → edge-functions/
└─ test/all.mjs           core layer + every function route + probe + env priority + render script
```

Rule of thumb: **only `cards/` and `deno_index.ts` need hands-on work** — the rest are entries, artifacts, and safety nets. `tools/render.mjs` goes through the same `handler()`, so pre-rendered and on-demand images always match.

## 📝 Using in your README

**Pre-rendered route** (recommended): the URLs are static files; parameters live in the `cards` object of `render.config.json`, not in the URL.

```markdown
![GitHub stats](https://<username>.github.io/<repo>/<username>/stats.svg)
```

**On-demand route**: the URL depends on where you deploy; below it's written as `<your-service-url>`. Parameters are the query string after each card URL, mapping one-to-one to fields in `render.config.json` (minus `username`, which on that side comes from the `usernames` list).

### Stats card

```markdown
![GitHub stats](<your-service-url>/stats?username=<username>)
```

Parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `username` | GitHub username | fanxing724 |
| `theme` | theme | default |
| `hide_rank` | hide the rank | shown if omitted |
| `show_icons` | show icons, `true`/`false` | false |

Data caveats: commit counts come from the GitHub Events API and only cover the **last 90 days**, as labeled on the card; the rank is an estimated percentile from followers / stars / repo count ("top N% globally"), for entertainment only.

### Languages card

```markdown
![Languages](<your-service-url>/languages?username=<username>&theme=catppuccin&layout=pie)
```

Parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `username` | GitHub username | fanxing724 |
| `theme` | theme | default |
| `hide` | languages to hide, comma-separated, case-insensitive | empty |
| `layout` | layout: `pie` or `bar` | pie |

Languages outside the top 8 are grouped into "Other", keeping the total at 100%.

### Activity card

```markdown
![Recent activity](<your-service-url>/activity?username=<username>&theme=catppuccin)
```

Based on the latest 300 public events (the GitHub Events API keeps at most 90 days).

### Repos card

```markdown
![Featured repos](<your-service-url>/repos?username=<username>&theme=catppuccin&count=4)
```

Parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `username` | GitHub username | fanxing724 |
| `theme` | theme | default |
| `count` | number of repos to show (1~12) | 6 |
| `sort` | sort order: `updated`/`created`/`stars` | updated |
| `pinned` | specific repo names, comma-separated, shown in the given order | auto-selected if omitted |

## 🎨 Themes

| Theme | Preview |
|-------|---------|
| `default` | GitHub dark style |
| `light` | light style |
| `dracula` | Dracula purple |
| `nord` | Nordic blue |
| `monokai` | high contrast |
| `catppuccin` | warm catppuccin palette |
| `starlight` | illustrated background, see next section |

## 🌌 Illustrated background theme

`starlight` is the only theme with an image: the card background yields to an illustration, with two dimming layers on top so the foreground text stays readable.

Swap the image with one command:

```bash
node tools/art.mjs /path/to/image.webp starlight   # regenerates cards/art.ts
```

`cards/art.ts` is **generated** — don't hand-edit it; a theme in `cards/theme.ts` claims an image with `art: ARTS.starlight`. Note this command **rewrites the whole file** and produces one image at a time — for a second illustrated theme, first consider whether it's worth those 36 KB, then manually add an `ARTS` entry.

Three hard constraints, all learned the hard way:

- **Base64 inline is mandatory.** The card ends up as an `<img>` in someone's README; SVG in that context is an "image document" and the browser forbids loading any external resource — writing `href="https://…"` yields a blank rectangle. The cost is size: base64 is 33% larger than the original, and the four dark cards grow from 24 KB to 164 KB.
- **Crop, never stretch.** Using `preserveAspectRatio="xMidYMid slice"`: the image is scaled by **one** factor to cover the card, then center-cropped — both axes share the factor, so it never distorts. Stretching would require `"none"`, which is a bug.

  Card dimensions grow with data (language rows, event rows, repo rows all change the height), so **which edge gets cropped changes**:

  | Card | Size range | Scale | Cropped |
  |------|-----------|-------|---------|
  | `stats` | 450×210 (fixed) | 0.750× | 28 px top & bottom |
  | `languages` (donut) | 400×220 ~ 289 | 0.667 ~ 0.858× | 4 px top & bottom → 67 px left & right |
  | `activity` | 400×182 ~ 226 | 0.667 ~ 0.671× | 32 px top & bottom → 2 px left & right |
  | `repos` (6 = 3 rows) | 630×422 | 1.252× | 48 px left & right |

  More languages or repos flips cropping from "top/bottom" to "left/right". So pick images for the **safe zone that holds for all four cards under any data**: per the table's extremes, that's the 466×273 block at `x∈[67,533] y∈[32,305]` of the original (600×337), 63% of the area (today's config gives 503×280 / 70%, but data grows — don't bet). The subject's center of gravity and face must stay inside that block; anything near an edge will be cropped by some card. To change the composition, edit `xMidYMid` before `slice` in `common.ts` (`YMin`/`YMax` keeps top/bottom).
- **Don't count on animation.** An `<img>` in a README doesn't run SVG animation; a GIF inside `<image>` shows only the first frame.

Dimming is tuned via `ARTS`'s `dim` (full-cover) / `dimLeft` (extra dimming on the left, since titles and values live there); re-run `node tools/render.mjs` to see the result.

### Why no illustration in light mode

Because this image is a **nightscape**, and light-mode text is dark — dark text on a dark image is unreadable. Measured (at `stats` size, worst pixel, WCAG AA small-text requirement 4.5:1):

| Fog density `dim` | Min text contrast | Verdict |
|---|---|---|
| 0.93 | 4.88:1 | pass, but the image is a faint tint — effectively no image |
| 0.85 | 4.16:1 | fail |
| 0.78 | 3.50:1 | fail |
| 0.70 | 2.85:1 | fail |

In other words: **if the image is visible, the text is unreadable; if the text is readable, the image is gone.** Trying darker text (`#1f3350`) buys some headroom, but the accent colors (cyan/green/orange/red) must also reach 4.5:1, forcing muddy grays like `#16484f` and `#5c3b14` — the card instantly looks bad.

Brightening the image itself into "daylight pastel" was also tried: after `gain 1.6 / lift 0.42 / sat 0.45`, the darkest night sky still has 0.164 luminance and the minimum text contrast only reaches 2.60:1 — the dark parts of a nightscape can't be lifted; any more and the whole picture turns to mush.

So the light variant sticks with the `light` theme. **Only a swap to an inherently light-toned image makes this path work.**

## 🖼️ Composition example

Combine your favorite cards in a README:

```markdown
<div align="center">
  <img src="<your-service-url>/stats?username=<username>&theme=catppuccin&show_icons=true" />
  <img src="<your-service-url>/languages?username=<username>&theme=catppuccin&layout=pie" />
  <br/>
  <img src="<your-service-url>/activity?username=<username>&theme=catppuccin" />
  <br/>
  <img src="<your-service-url>/repos?username=<username>&theme=catppuccin&count=4" />
</div>
```

## Caching behavior

The **pre-rendered route** has no concept of "caching", only "how often it updates": the images are static files on GitHub Pages' own CDN — a million views cause zero GitHub origin fetches. Freshness is judged via the self-check page at `https://<username>.github.io/<repo>/` — all four cards on one page with "last successful render <time>" at the top. If it lags far behind, the scheduled job is failing. (The cards themselves carry no timestamp; only the self-check page and `status.json` do.)

**On-demand route** cache headers:

- Successful cards: `Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400`
- The service additionally keeps a 5-minute in-process cache of GitHub API responses; identical requests are merged and don't consume quota twice
- The previous point only holds in long-running processes (Deno Deploy / Node): Workers and EdgeOne recycle instances at will, so in-process cache hits are luck, not a guarantee. What actually defends the quota is the `s-maxage`, secondarily the platform's own edge cache
- Error cards (user not found, rate limited, …): `no-store`, self-healing immediately on recovery — never stuck in a README for an hour
- But `s-maxage` cannot stop deliberately cache-busting requests, because the `username` in the cache key is chosen by the requester. The real ceiling on this route is GitHub's token quota (5,000/hour authenticated), not the cache duration

## 🔧 Local development

With Deno:

```bash
deno task start          # equivalent to deno run --allow-net --allow-env deno_index.ts
# visit http://localhost:8000/

deno task check          # type check
deno task lint           # lint
deno task fmt            # format
```

Without Deno, use Node (24 runs `.ts` directly; 22.6~23.5 needs `--experimental-strip-types`):

```bash
GITHUB_TOKEN=xxx node node_server.mjs   # → http://127.0.0.1:8787/
node tools/build.mjs                    # generate EdgeOne artifacts
node tools/render.mjs                   # pre-render to dist-cards/, open dist-cards/index.html to view
node test/all.mjs                       # core layer + artifacts + probe + render script
```
