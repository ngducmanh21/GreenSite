import { createAssistantService } from "./app.js";
import { launch, requiredToken, serviceURL } from "../../common/runtime.js";
launch(
  createAssistantService({
    token: requiredToken(),
    energyURL: serviceURL("ENERGY_URL", "http://127.0.0.1:4002"),
    aiAccessToken: process.env.AI_ACCESS_TOKEN,
    openAI: {
      apiKey: process.env.OPENAI_API_KEY ?? "",
      model: process.env.OPENAI_MODEL ?? "",
    },
  }),
  4003,
);
