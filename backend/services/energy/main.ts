import { createEnergyService } from "./app.js";
import { launch, requiredToken } from "../../common/runtime.js";
launch(
  createEnergyService({
    token: requiredToken(),
    sitesURL: process.env.SITES_URL ?? "http://127.0.0.1:4001",
  }),
  4002,
);
