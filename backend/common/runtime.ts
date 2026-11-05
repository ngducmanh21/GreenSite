import type { Server } from "node:http";
export function requiredToken() {
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  if (!token || token.length < 32)
    throw new Error("INTERNAL_SERVICE_TOKEN cần ít nhất 32 ký tự.");
  return token;
}
export function launch(
  server: Server,
  defaultPort: number,
  cleanup?: () => void,
) {
  const port = Number(process.env.PORT ?? defaultPort),
    host = process.env.HOST ?? "127.0.0.1";
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT không hợp lệ.");
  server.listen(port, host, () =>
    console.log(JSON.stringify({ event: "listening", host, port })),
  );
  let stopping = false;
  function stop() {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => {
      server.closeAllConnections();
      cleanup?.();
      process.exit(1);
    }, 8000).unref();
    server.close(() => {
      clearTimeout(timeout);
      cleanup?.();
      process.exit(0);
    });
  }
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

export function serviceURL(
  name: "SITES_URL" | "ENERGY_URL" | "ASSISTANT_URL",
  local: string,
) {
  const url = process.env[name];
  if (!url && process.env.GREENSITE_DEPLOYMENT === "vercel")
    throw new Error(`Missing Vercel service binding: ${name}`);
  return url ?? local;
}
