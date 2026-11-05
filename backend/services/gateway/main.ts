import { createGateway } from "./app.js";
import { launch, requiredToken, serviceURL } from "../../common/runtime.js";
launch(
  createGateway({
    token: requiredToken(),
    sitesURL: serviceURL("SITES_URL", "http://127.0.0.1:4001"),
    energyURL: serviceURL("ENERGY_URL", "http://127.0.0.1:4002"),
    assistantURL: serviceURL("ASSISTANT_URL", "http://127.0.0.1:4003"),
  }),
  4000,
);
