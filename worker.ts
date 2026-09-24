// Cloudflare Workers 入口：只做密钥注入 + 调用形状转换，业务逻辑全在 deno_index.ts

import { handler } from "./deno_index.ts";

interface Env {
  GITHUB_TOKEN?: string;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handler(request, env);
  },
};
