// 跨平台配置读取。真源只认这一个入口, 不要在别处直接摸 Deno.env / process.env。
//
// 优先级: 调用方传入的 env 袋(EdgeOne context.env、Workers env 绑定)
//         > Deno.env(Qoder Sites / Deno 宿主)
//         > process.env(Node)
// 全程用 globalThis + 可选链 + try/catch, 因此在没有任何这些全局量的 isolate
// 运行时里加载也不会抛 ReferenceError。

export type EnvBag = Record<string, unknown> | undefined;

/** 读取字符串配置; 缺失返回空串, 绝不回退到硬编码默认值。 */
export function readEnv(env: EnvBag, name: string): string {
  const fromBag = env ? env[name] : undefined;
  if (typeof fromBag === "string" && fromBag.trim()) return fromBag.trim();
  if (typeof fromBag === "number" || typeof fromBag === "boolean") {
    return String(fromBag);
  }

  const g = globalThis as {
    Deno?: { env?: { get?: (k: string) => string | undefined } };
    process?: { env?: Record<string, string | undefined> };
  };

  try {
    const d = g.Deno?.env?.get?.(name);
    if (d && d.trim()) return d.trim();
  } catch {
    // 未授予 --allow-env 时 Deno.env.get 会抛, 降级继续
  }

  try {
    const p = g.process?.env?.[name];
    if (p && p.trim()) return p.trim();
  } catch {
    // 无 process 的运行时
  }

  return "";
}

export function requireEnv(env: EnvBag, name: string): string {
  const value = readEnv(env, name);
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

/** 逗号/分号/换行分隔的列表型配置。 */
export function readEnvList(env: EnvBag, name: string): string[] {
  return readEnv(env, name)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 布尔开关; 未配置返回 false, 只有显式真值字面量算开启。 */
export function readEnvFlag(env: EnvBag, name: string): boolean {
  return ["true", "1", "yes", "on"].includes(readEnv(env, name).toLowerCase());
}
