import { resolve } from "node:path";
import { createSitesService } from "./app.js";
import { launch, requiredToken } from "../../common/runtime.js";
const service = createSitesService({
  token: requiredToken(),
  dbPath: process.env.DATABASE_PATH ?? resolve("data/greensite.sqlite"),
});
launch(service.server, 4001, service.close);
