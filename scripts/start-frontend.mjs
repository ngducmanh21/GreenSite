import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const server = fileURLToPath(
  new URL("../frontend/.next/standalone/frontend/server.js", import.meta.url),
);
const child = spawn(process.execPath, [server], {
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: "127.0.0.1",
    PORT: process.env.PORT || "3000",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
