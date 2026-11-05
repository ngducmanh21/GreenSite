import type {
  AssistantReply,
  AssistantRequest,
  AssistantStatus,
  Config,
  CompareRequest,
  ScenarioComparison,
  ScenarioRecord,
  Simulation,
  SimulationRequest,
  Site,
} from "@greensite/contracts";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
async function request(path: string, options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      cache: "no-store",
      signal: AbortSignal.any([
        AbortSignal.timeout(path === "/assistant" ? 65000 : 30000),
        ...(options.signal ? [options.signal] : []),
      ]),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (error instanceof Error && error.name === "TimeoutError")
      throw new ApiError(
        "Máy chủ phản hồi quá lâu. Vui lòng thử lại.",
        504,
        "REQUEST_TIMEOUT",
      );
    throw new ApiError(
      "Không kết nối được máy chủ. Kiểm tra dịch vụ backend rồi thử lại.",
      503,
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      data?.error ?? "Máy chủ chưa sẵn sàng. Vui lòng thử lại.",
      response.status,
      data?.code,
    );
  }
  return response;
}
async function json<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await (await request(path, options)).json();
  } catch (error) {
    if (error instanceof ApiError || options?.signal?.aborted) throw error;
    throw new ApiError(
      "Không đọc được phản hồi máy chủ. Vui lòng thử lại.",
      502,
      "INVALID_RESPONSE",
    );
  }
}
function body(value: unknown, signal?: AbortSignal): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
    signal,
  };
}
export const api = {
  sites: (signal?: AbortSignal) =>
    json<{ sites: Site[] }>("/sites", { signal }),
  scenario: (id: string, signal?: AbortSignal) =>
    json<ScenarioRecord>(`/sites/${encodeURIComponent(id)}/scenario`, {
      signal,
    }),
  saveScenario: (id: string, config: Config, expectedRevision: number) =>
    json<ScenarioRecord>(`/sites/${encodeURIComponent(id)}/scenario`, {
      ...body({ config, expectedRevision }),
      method: "PUT",
    }),
  compare: (input: CompareRequest, signal?: AbortSignal) =>
    json<ScenarioComparison>("/compare", body(input, signal)),
  simulate: (input: SimulationRequest, signal?: AbortSignal) =>
    json<Simulation>("/simulate", body(input, signal)),
  assistantStatus: (signal?: AbortSignal) =>
    json<AssistantStatus>("/assistant", { signal }),
  ask: (input: AssistantRequest, token: string, signal?: AbortSignal) =>
    json<AssistantReply>("/assistant", {
      ...body(input, signal),
      headers: {
        "Content-Type": "application/json",
        ...(input.mode === "openai"
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    }),
  async download(simulation: Simulation) {
    const response = await request(
      "/reports/export",
      body({ siteId: simulation.site.id, config: simulation.config }),
    );
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `GreenSite-${simulation.site.id}-${simulation.date}-simulation.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
