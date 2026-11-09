import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
const root = fileURLToPath(new URL("../", import.meta.url));
const dev = process.argv.includes("--dev");
const token =
  process.env.INTERNAL_SERVICE_TOKEN || randomBytes(32).toString("hex");
if (token.length < 32)
  throw new Error("INTERNAL_SERVICE_TOKEN cần ít nhất 32 ký tự.");
const children = [];
let shuttingDown = false;
function stop(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  const timer = setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
    process.exit(code);
  }, 9000).unref();
  Promise.all(
    children.map((child) =>
      child.exitCode !== null
        ? Promise.resolve()
        : new Promise((r) => child.once("exit", r)),
    ),
  ).then(() => {
    clearTimeout(timer);
    process.exit(code);
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
function start(command, args, env) {
  const child = spawn(command, args, { cwd: root, stdio: "inherit", env });
  children.push(child);
  child.once("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.once("exit", (code) => {
    if (!shuttingDown) {
      console.error(`Một process đã dừng (${code}); dừng các process còn lại.`);
      stop(code || 1);
    }
  });
  return child;
}
const common = {
  ...process.env,
  HOST: "127.0.0.1",
  INTERNAL_SERVICE_TOKEN: token,
  SITES_URL: "http://127.0.0.1:4001",
  ENERGY_URL: "http://127.0.0.1:4002",
  ASSISTANT_URL: "http://127.0.0.1:4003",
};
// Only the assistant receives OpenAI credentials.
const {
  OPENAI_API_KEY,
  OPENAI_MODEL,
  AI_ACCESS_TOKEN,
  PILOT_ROOT_TOKEN,
  ...withoutAI
} = common;
const assistantEnv = {
  ...withoutAI,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  AI_ACCESS_TOKEN,
};
for (const [name, port] of [
  ["sites", 4001],
  ["energy", 4002],
  ["assistant", 4003],
  ["gateway", 4000],
]) {
  start(process.execPath, [`backend/dist/services/${name}/main.js`], {
    ...(name === "assistant" ? assistantEnv : withoutAI),
    PORT: String(port),
    ...(name === "sites"
      ? {
          DATABASE_PATH:
            process.env.DATABASE_PATH || resolve(root, "data/greensite.sqlite"),
          PILOT_ROOT_TOKEN: PILOT_ROOT_TOKEN || "",
        }
      : {}),
  });
}
let ready = false;
for (let i = 0; i < 60; i++) {
  if (shuttingDown) break;
  try {
    const response = await fetch("http://127.0.0.1:4000/health/ready", {
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
if (!ready) {
  console.error("Backend chưa sẵn sàng. Kiểm tra log ở trên.");
  stop(1);
} else {
  const {
    INTERNAL_SERVICE_TOKEN,
    SITES_URL,
    ENERGY_URL,
    ASSISTANT_URL,
    DATABASE_PATH,
    ...uiEnv
  } = withoutAI;
  const require = createRequire(resolve(root, "frontend/package.json"));
  const nextBin = resolve(
    dirname(require.resolve("next/package.json")),
    "dist/bin/next",
  );
  start(
    process.execPath,
    dev
      ? [nextBin, "dev", "frontend", "--hostname", "127.0.0.1"]
      : ["frontend/.next/standalone/frontend/server.js"],
    {
      ...uiEnv,
      HOSTNAME: "127.0.0.1",
      PORT: "3000",
      GATEWAY_URL: "http://127.0.0.1:4000",
    },
  );
  console.log(
    "GreenSite: UI http://127.0.0.1:3000 · gateway :4000 · sites :4001 · energy :4002 · assistant :4003",
  );
}
