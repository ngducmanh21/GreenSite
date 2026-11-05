import { createGateway } from "./app.js";
import { launch, requiredToken } from "../../common/runtime.js";
launch(
  createGateway({
    token: requiredToken(),
    sitesURL: process.env.SITES_URL ?? "http://127.0.0.1:4001",
    energyURL: process.env.ENERGY_URL ?? "http://127.0.0.1:4002",
    assistantURL: process.env.ASSISTANT_URL ?? "http://127.0.0.1:4003",
  }),
  4000,
);
