import { resolve } from "node:path";
import { createSitesService } from "./app.js";
import { launch, requiredToken } from "../../common/runtime.js";
const demo = process.env.GREENSITE_DEMO_MODE === "1";
if (process.env.GREENSITE_DEPLOYMENT === "vercel" && !demo)
  throw new Error(
    "Vercel requires a hosted database adapter or explicit GREENSITE_DEMO_MODE=1.",
  );
const service = createSitesService({
  demo,
  token: requiredToken(),
  dbPath: process.env.DATABASE_PATH ?? resolve("data/greensite.sqlite"),
  pilotRootToken: process.env.PILOT_ROOT_TOKEN,
});
launch(service.server, 4001, service.close);
