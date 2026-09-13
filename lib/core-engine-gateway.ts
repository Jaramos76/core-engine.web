import "server-only";

const gateway =
  process.env.CORE_ENGINE_GATEWAY_URL ?? "http://172.16.1.1:8765";

function token(): string {
  const value = process.env.CORE_ENGINE_WEB_TOKEN;
  if (!value) {
    throw new Error("Core Engine gateway token is not configured");
  }
  return value;
}

export async function coreEngineGateway(
  path: string,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token()}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return await fetch(`${gateway}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function gatewayJson(
  path: string,
  init: RequestInit = {},
  timeoutMs = 20_000,
) {
  const response = await coreEngineGateway(path, init, timeoutMs);
  const data = await response.json().catch(() => ({
    error: "invalid Core Engine gateway response",
  }));
  return { response, data };
}
