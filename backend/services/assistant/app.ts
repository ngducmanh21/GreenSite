import {
  parseSimulationRequest,
  type AssistantMessage,
  type Simulation,
} from "@greensite/contracts";
import {
  createService,
  HttpError,
  methodNotAllowed,
  notFound,
  parse,
  serviceJSON,
  validToken,
} from "../../common/http.js";
import { localAnalysis } from "./analysis.js";
import { analyzeWithOpenAI, type OpenAIOptions } from "./openai.js";
export type AssistantOptions = {
  token: string;
  energyURL: string;
  log?: boolean;
  openAI?: OpenAIOptions;
  aiAccessToken?: string;
  aiQuota?: number;
};
export function createAssistantService(options: AssistantOptions) {
  let windowStart = 0,
    requests = 0;
  const configured = () =>
    !!(options.openAI?.apiKey && options.openAI.model && options.aiAccessToken);
  return createService(
    "assistant",
    async (ctx) => {
      if (ctx.path === "/health/ready" && ctx.method === "GET") {
        await serviceJSON(
          options.energyURL,
          "/health/ready",
          options.token,
          ctx,
        );
        return {
          body: { service: "assistant", status: "ok", openAI: configured() },
        };
      }
      if (ctx.path !== "/v1/assistant") notFound();
      if (ctx.method === "GET")
        return { body: { available: configured(), localAvailable: true } };
      if (ctx.method !== "POST") methodNotAllowed();
      const raw = await ctx.json(),
        request = parse(() => parseSimulationRequest(raw));
      const body = raw as Record<string, unknown>;
      if (
        typeof body.question !== "string" ||
        !body.question.trim() ||
        body.question.length > 2000
      )
        throw new HttpError(
          400,
          "Câu hỏi cần từ 1 đến 2.000 ký tự.",
          "VALIDATION_ERROR",
        );
      if (body.mode !== "local" && body.mode !== "openai")
        throw new HttpError(
          400,
          "Chế độ trợ lý không hợp lệ.",
          "VALIDATION_ERROR",
        );
      if (body.history !== undefined && !Array.isArray(body.history))
        throw new HttpError(
          400,
          "Lịch sử hội thoại không hợp lệ.",
          "VALIDATION_ERROR",
        );
      const history: AssistantMessage[] = (
        Array.isArray(body.history) ? body.history.slice(-6) : []
      ).map((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          !["user", "assistant"].includes(item.role) ||
          typeof item.content !== "string" ||
          item.content.length > 6000
        )
          throw new HttpError(
            400,
            "Lịch sử hội thoại không hợp lệ.",
            "VALIDATION_ERROR",
          );
        return { role: item.role, content: item.content };
      });
      if (body.mode === "openai") {
        if (!configured())
          throw new HttpError(
            503,
            "Chưa cấu hình OpenAI. Bạn có thể dùng phân tích theo quy tắc.",
            "AI_NOT_CONFIGURED",
          );
        if (
          !validToken(
            ctx.request.headers.authorization,
            `Bearer ${options.aiAccessToken}`,
          )
        )
          throw new HttpError(
            401,
            "Mã truy cập AI không đúng.",
            "AI_UNAUTHORIZED",
          );
        if (Date.now() - windowStart > 3600000) {
          windowStart = Date.now();
          requests = 0;
        }
        if (requests >= (options.aiQuota ?? 20))
          throw new HttpError(
            429,
            "Đã đạt giới hạn yêu cầu AI/giờ của service demo.",
            "AI_RATE_LIMIT",
          );
        requests++;
      }
      // Resolve the simulation over HTTP; never trust user-supplied totals or import the energy engine.
      const sim = await serviceJSON<Simulation>(
        options.energyURL,
        "/v1/simulate",
        options.token,
        ctx,
        { method: "POST", body: request, timeout: 8000 },
      );
      const answer =
        body.mode === "local"
          ? localAnalysis(sim, body.question)
          : await analyzeWithOpenAI(
              options.openAI!,
              sim,
              body.question,
              history,
              ctx.signal,
            );
      return { body: { mode: body.mode, answer } };
    },
    { token: options.token, log: options.log },
  );
}
