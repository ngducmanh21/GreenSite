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
    !["sunny", "cloudy"].includes(String(r.weather)) ||
    !["economic", "solar"].includes(String(r.strategy))
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
