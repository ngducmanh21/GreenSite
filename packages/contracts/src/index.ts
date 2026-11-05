export type Site = {
  id: string;
  name: string;
  location: string;
  code: string;
  baseLoad: number;
  generatorKW: number;
  batteryKW: number;
  pvKW: number;
  batteryKWh: number;
  gridLimitKW: number;
};
export type Config = {
  pvKW: number;
  batteryKWh: number;
  reservePct: number;
  loadPct: number;
  gridLimitKW: number;
  weather: "sunny" | "cloudy";
  strategy: "economic" | "solar";
  zeroExport: boolean;
  shiftLoad: boolean;
  outage: boolean;
  offPeakRate: number;
  normalRate: number;
  peakRate: number;
  dieselPrice: number;
};
const bounds = {
  pvKW: [0, 1500],
  batteryKWh: [0, 2500],
  reservePct: [10, 80],
  loadPct: [40, 180],
  gridLimitKW: [50, 1000],
  offPeakRate: [0, 20000],
  normalRate: [0, 20000],
  peakRate: [0, 20000],
  dieselPrice: [0, 100000],
} as const;
export function parseConfig(raw: unknown): Config {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Cấu hình không hợp lệ.");
  const r = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, [min, max]] of Object.entries(bounds)) {
    if (
      typeof r[key] !== "number" ||
      !Number.isFinite(r[key]) ||
      r[key] < min ||
      r[key] > max
    )
      throw new Error(`${key}: giá trị phải từ ${min} đến ${max}.`);
    result[key] = r[key];
  }
  for (const key of ["zeroExport", "shiftLoad", "outage"]) {
    if (typeof r[key] !== "boolean")
      throw new Error(`${key}: cần giá trị bật/tắt.`);
    result[key] = r[key];
  }
  if (
    typeof r.weather !== "string" ||
    !["sunny", "cloudy"].includes(r.weather) ||
    typeof r.strategy !== "string" ||
    !["economic", "solar"].includes(r.strategy)
  )
    throw new Error("Chế độ mô phỏng không hợp lệ.");
  return { ...result, weather: r.weather, strategy: r.strategy } as Config;
}
export type Point = {
  time: string;
  hour: number;
  load: number;
  served: number;
  pv: number;
  pvUsed: number;
  grid: number;
  diesel: number;
  charge: number;
  discharge: number;
  soc: number;
  storedKWh: number;
  exported: number;
  curtailed: number;
  dumped: number;
  unserved: number;
  tariff: number;
  outage: boolean;
  cost: number;
  carbon: number;
};
export type Totals = {
  demand: number;
  served: number;
  pv: number;
  pvUsed: number;
  grid: number;
  diesel: number;
  charge: number;
  discharge: number;
  exported: number;
  curtailed: number;
  dumped: number;
  unserved: number;
  dieselLiters: number;
  cost: number;
  carbon: number;
  gridCarbon: number;
  dieselCarbon: number;
  peakGrid: number;
  finalStored: number;
  initialStored: number;
  renewablePct: number;
  exportHours: number;
  generatorHours: number;
  batteryLoss: number;
};
export type Run = { points: Point[]; totals: Totals };
export type Alert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  time: string;
};
export type Simulation = {
  site: Site;
  config: Config;
  baseline: Run;
  optimized: Run;
  savings: number;
  savingsPct: number | null;
  carbonReduction: number;
  comparable: boolean;
  alerts: Alert[];
  modelVersion: string;
  date: string;
  factors: EmissionFactors;
};

export type EmissionFactors = {
  grid: number;
  diesel: number;
  dieselLitersPerKWh: number;
  batteryWear: number;
  efficiency: number;
};
export type ScenarioRecord = {
  presets: ScenarioPreset[];
  persistence: "sqlite" | "demo";
  site: Site;
  config: Config;
  defaults: Config;
  revision: number;
  saved: boolean;
  updatedAt: string | null;
};
export type SimulationRequest = { siteId: string; config: Config };
export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantRequest = SimulationRequest & {
  question: string;
  mode: "local" | "openai";
  history?: AssistantMessage[];
};
export type AssistantStatus = { available: boolean; localAvailable: boolean };
export type AssistantReply = { mode: "local" | "openai"; answer: string };
export type ApiError = { error: string; code: string; requestId: string };
export function parseSimulationRequest(raw: unknown): SimulationRequest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Yêu cầu không hợp lệ.");
  const r = raw as Record<string, unknown>;
  if (typeof r.siteId !== "string" || !/^[a-z0-9-]{1,80}$/.test(r.siteId))
    throw new Error("Mã công trường không hợp lệ.");
  return { siteId: r.siteId, config: parseConfig(r.config) };
}

export type ScenarioPreset = {
  id: string;
  title: string;
  description: string;
  config: Config;
};
export type CompareRequest = {
  siteId: string;
  reference: Config;
  candidate: Config;
};
export type ScenarioComparison = {
  siteId: string;
  modelVersion: string;
  date: string;
  reference: { config: Config; totals: Totals };
  candidate: { config: Config; totals: Totals };
  comparable: boolean;
  reasons: string[];
  costChange: number;
  carbonChange: number;
  savingsPct: number | null;
};
export function parseCompareRequest(raw: unknown): CompareRequest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Yêu cầu so sánh không hợp lệ.");
  const r = raw as Record<string, unknown>;
  const reference = parseSimulationRequest({
    siteId: r.siteId,
    config: r.reference,
  });
  return {
    siteId: reference.siteId,
    reference: reference.config,
    candidate: parseConfig(r.candidate),
  };
}
export const SCENARIO_FILE_MAX_BYTES = 20000;
export type ScenarioFile = {
  format: "greensite-scenario";
  version: 1;
  siteId: string;
  exportedAt: string;
  config: Config;
};
export function parseScenarioFile(raw: unknown): ScenarioFile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Tệp cấu hình không hợp lệ.");
  const r = raw as Record<string, unknown>;
  if (r.format !== "greensite-scenario" || r.version !== 1)
    throw new Error(
      "Tệp không đúng định dạng GreenSite hoặc phiên bản chưa được hỗ trợ.",
    );
  if (
    typeof r.exportedAt !== "string" ||
    r.exportedAt.length > 40 ||
    !Number.isFinite(Date.parse(r.exportedAt))
  )
    throw new Error("Thời gian xuất tệp không hợp lệ.");
  const request = parseSimulationRequest(r);
  return {
    format: "greensite-scenario",
    version: 1,
    siteId: request.siteId,
    exportedAt: r.exportedAt,
    config: request.config,
  };
}
