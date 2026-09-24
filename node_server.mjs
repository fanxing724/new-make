// Node 入口:证明核心层不绑定任何平台运行时,顺带当本地预览用。
//   GITHUB_TOKEN=xxx node node_server.mjs
//   → http://127.0.0.1:8787/stats?username=fanxing724

import { createServer } from "node:http";
import { handler } from "./deno_index.ts";

const port = Number(process.env.PORT) || 8787;

createServer(async (req, res) => {
  const request = new Request(
    `http://${req.headers.host ?? "127.0.0.1"}${req.url}`,
    { method: req.method },
  );
  const response = await handler(request, process.env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, "127.0.0.1", () => {
  console.log(`github-cards → http://127.0.0.1:${port}/`);
});
