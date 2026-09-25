// 假上游:把 api.github.com 的响应换成本地固定数据,让 tools/render.mjs 的成功路径
// 能离线、确定性地跑一遍。匿名额度 60 次/小时,拿真实调用当 CI 回归是烧不起的。
//
// 用 `node --import` 预加载,所以被测脚本和 cards/ 都不需要为测试改任何代码。
// 未覆盖的主机直接抛错 —— 哪天卡片层多引了一个外部域名,这里会立刻炸给你看,
// 而不是静默地把请求发到网上去。

const LOGIN = "fanxing724";

const USER = {
  login: LOGIN,
  public_repos: 2,
  followers: 7,
  following: 5,
};

const REPOS = [
  {
    name: "new-make",
    description: "GitHub 统计卡片生成器",
    stargazers_count: 12,
    forks_count: 1,
    language: "TypeScript",
    fork: false,
    languages_url: `https://api.github.com/repos/${LOGIN}/new-make/languages`,
    created_at: "2026-01-04T10:00:00Z",
  },
  {
    name: "notes",
    description: null,
    stargazers_count: 3,
    forks_count: 0,
    language: "Shell",
    fork: false,
    languages_url: `https://api.github.com/repos/${LOGIN}/notes/languages`,
    created_at: "2026-02-11T10:00:00Z",
  },
  {
    name: "upstream-fork",
    description: "fork 掉的仓库,不该计入统计",
    stargazers_count: 999,
    forks_count: 999,
    language: "C++",
    fork: true,
    languages_url: `https://api.github.com/repos/${LOGIN}/upstream-fork/languages`,
    created_at: "2026-03-01T10:00:00Z",
  },
];

const EVENTS = [
  {
    id: "1",
    type: "PushEvent",
    repo: { name: `${LOGIN}/new-make` },
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    payload: { size: 5, commits: [{ sha: "aaaaaaa" }, { sha: "bbbbbbb" }] },
  },
  {
    id: "2",
    type: "WatchEvent",
    repo: { name: "someone/other" },
    created_at: new Date(Date.now() - 7_200_000).toISOString(),
    payload: {},
  },
  {
    id: "3",
    type: "IssuesEvent",
    repo: { name: `${LOGIN}/notes` },
    created_at: new Date(Date.now() - 10_800_000).toISOString(),
    payload: { action: "opened" },
  },
];

const LANGUAGES = { TypeScript: 42_000, Shell: 3_000 };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// FAKE_MODE=ratelimit 用来验"限流时绝不产出红卡"那条分支
const RATELIMIT = process.env.FAKE_MODE === "ratelimit";

globalThis.fetch = async (input) => {
  const url = typeof input === "string" ? input : input.url;
  const u = new URL(url);
  if (u.hostname !== "api.github.com") {
    throw new Error(
      `假上游只覆盖 api.github.com,却被请求了 ${u.origin}${u.pathname}`,
    );
  }
  if (RATELIMIT) {
    return new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
      status: 403,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
      },
    });
  }
  const p = u.pathname;
  if (p === `/users/${LOGIN}`) return json(USER);
  if (p === `/users/${LOGIN}/repos`) return json(REPOS);
  if (p === `/users/${LOGIN}/events`) return json(EVENTS);
  if (/^\/users\/[^/]+\/repos$/.test(p)) return json([]);
  // 名单里打错一个用户名是 CI 里最容易撞上的事故, 让它走真实的 404 → "用户不存在"分支,
  // 而不是退化成"连不上"—— 两者在卡片上的提示不一样, 混了就等于没测。
  if (/^\/users\/[^/]+$/.test(p)) {
    return new Response('{"message":"Not Found"}', {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  if (/^\/repos\/[^/]+\/[^/]+\/languages$/.test(p)) return json(LANGUAGES);
  if (/^\/repos\/[^/]+\/[^/]+$/.test(p)) {
    const name = p.split("/")[3];
    const hit = REPOS.find((r) => r.name === name);
    return hit ? json(hit) : new Response("{}", { status: 404 });
  }
  throw new Error(`假上游没有为 ${p} 准备数据`);
};
