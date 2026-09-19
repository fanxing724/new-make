// Cloudflare Workers 入口
// deno_index.ts 的 handler 是纯 Web Fetch API，这里只做密钥注入后直接复用

import { setGitHubToken } from "./cards/github.ts";
import { handler } from "./deno_index.ts";

interface Env {
  GITHUB_TOKEN?: string;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    setGitHubToken(env.GITHUB_TOKEN);
    return handler(request);
  },
};
