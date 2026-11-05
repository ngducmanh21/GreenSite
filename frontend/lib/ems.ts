/** Deterministic educational dispatch model. No field-device commands. */
export const MODEL_VERSION = "ems-sim-1.0";
export const SIMULATION_DATE = "2026-11-05";
export const STEP_HOURS = 0.25;
export const FACTORS = {
  grid: 0.6592,
  diesel: 2.68,
  dieselLitersPerKWh: 0.28,
  batteryWear: 350,
  efficiency: 0.95,
};
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
export const SITES: Site[] = [
  {
    id: "riverside",
    name: "Riverside Tower",
    location: "TP. Hồ Chí Minh",
    code: "HCM · 01",
    baseLoad: 230,
    generatorKW: 400,
    batteryKW: 180,
    pvKW: 420,
    batteryKWh: 600,
    gridLimitKW: 400,
  },
  {
    id: "logistics",
    name: "Long An Logistics",
    location: "Long An",
    code: "LA · 02",
    baseLoad: 310,
    generatorKW: 500,
    batteryKW: 250,
    pvKW: 650,
    batteryKWh: 900,
    gridLimitKW: 500,
  },
  {
    id: "metro",
    name: "Metro Depot",
    location: "Hà Nội",
    code: "HN · 03",
    baseLoad: 185,
    generatorKW: 300,
    batteryKW: 120,
    pvKW: 260,
    batteryKWh: 400,
    gridLimitKW: 320,
  },
];
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
export function defaultConfig(site: Site): Config {
  return {
    pvKW: site.pvKW,
    batteryKWh: site.batteryKWh,
    reservePct: 20,
    loadPct: 100,
    gridLimitKW: site.gridLimitKW,
    weather: "sunny",
    strategy: "economic",
    zeroExport: true,
    shiftLoad: true,
    outage: false,
    offPeakRate: 1800,
    normalRate: 2900,
    peakRate: 5100,
    dieselPrice: 23000,
  };
}
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
export function parseRequest(raw: unknown): { site: Site; config: Config } {
  if (!raw || typeof raw !== "object") throw new Error("Yêu cầu không hợp lệ.");
  const r = raw as Record<string, unknown>;
  const site = SITES.find((s) => s.id === r.siteId);
  if (!site) throw new Error("Không tìm thấy công trường mẫu.");
  return { site, config: parseConfig(r.config) };
}
export function priceAt(hour: number, c: Config) {
  return hour < 6 || hour >= 22
    ? c.offPeakRate
    : (hour >= 9.5 && hour < 11.5) || (hour >= 17 && hour < 20)
      ? c.peakRate
      : c.normalRate;
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
};
function run(site: Site, c: Config, optimized: boolean): Run {
  const points: Point[] = [];
  const minStored = (c.batteryKWh * c.reservePct) / 100;
  const maxStored = c.batteryKWh * 0.95;
  // No usable free initial energy. Both runs start at the same reserve.
  let stored = minStored;
  let renewableStored = 0;
  let solarDelivered = 0;
  for (let i = 0; i < 96; i++) {
    const hour = i / 4;
    const working = hour >= 7 && hour < 18;
    const shape = working
      ? 1.1 + 0.15 * Math.sin((hour - 7) * 0.8)
      : hour >= 18 && hour < 22
        ? 0.55
        : 0.3;
    let load = (site.baseLoad * shape * c.loadPct) / 100;
    // Shift exactly equal energy: 3 peak hours to 3 solar hours.
    if (optimized && c.shiftLoad) {
      const flexible = (site.baseLoad * 0.12 * c.loadPct) / 100;
      if (hour >= 17 && hour < 20) load -= flexible;
      if (hour >= 12 && hour < 15) load += flexible;
    }
    const sun = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const pv =
      c.pvKW *
      sun *
      (c.weather === "sunny" ? 0.84 : 0.38) *
      (hour >= 6 && hour <= 18 ? 1 : 0);
    const outage = c.outage && hour >= 17 && hour < 19;
    const tariff = priceAt(hour, c);
    const directPV = Math.min(pv, load);
    let deficit = load - directPV;
    let surplus = pv - directPV;
    let charge = 0,
      discharge = 0,
      grid = 0,
      diesel = 0,
      dumped = 0;
    const canUseBattery = optimized && c.batteryKWh > 0;
    if (canUseBattery && surplus > 0) {
      charge = Math.max(
        0,
        Math.min(
          surplus,
          site.batteryKW,
          (maxStored - stored) / STEP_HOURS / FACTORS.efficiency,
        ),
      );
      stored += charge * STEP_HOURS * FACTORS.efficiency;
      renewableStored += charge * STEP_HOURS * FACTORS.efficiency;
      surplus -= charge;
    }
    if (canUseBattery && deficit > 0 && charge === 0) {
      const target =
        outage || c.strategy === "solar" || tariff === c.peakRate
          ? deficit
          : Math.max(0, deficit - c.gridLimitKW);
      discharge = Math.max(
        0,
        Math.min(
          target,
          site.batteryKW,
          ((stored - minStored) * FACTORS.efficiency) / STEP_HOURS,
        ),
      );
      const usable = Math.max(0, stored - minStored);
      const solarFraction =
        usable > 1e-9 ? Math.min(1, renewableStored / usable) : 0;
      solarDelivered += discharge * STEP_HOURS * solarFraction;
      renewableStored = Math.max(
        0,
        renewableStored -
          ((discharge * STEP_HOURS) / FACTORS.efficiency) * solarFraction,
      );
      stored -= (discharge * STEP_HOURS) / FACTORS.efficiency;
      deficit -= discharge;
    }
    // Economic mode can refill from grid at night, within connection headroom.
    if (
      canUseBattery &&
      c.strategy === "economic" &&
      hour < 6 &&
      !outage &&
      discharge === 0 &&
      charge === 0
    ) {
      charge = Math.max(
        0,
        Math.min(
          site.batteryKW,
          c.gridLimitKW - deficit,
          (c.batteryKWh * 0.8 - stored) / STEP_HOURS / FACTORS.efficiency,
        ),
      );
      stored += charge * STEP_HOURS * FACTORS.efficiency;
      grid += charge;
    }
    if (!outage) {
      const importForLoad = Math.min(
        deficit,
        Math.max(0, c.gridLimitKW - grid),
      );
      grid += importForLoad;
      deficit -= importForLoad;
    }
    if (outage && deficit > 1e-8) {
      // Emergency-only generator, illustrative 30% minimum stable loading.
      diesel = Math.min(
        site.generatorKW,
        Math.max(deficit, site.generatorKW * 0.3),
      );
      dumped = Math.max(0, diesel - deficit);
      deficit = Math.max(0, deficit - diesel);
    }
    const exported = c.zeroExport || outage ? 0 : surplus;
    const curtailed = c.zeroExport || outage ? surplus : 0;
    const pvUsed = pv - curtailed;
    const fuel = diesel * STEP_HOURS * FACTORS.dieselLitersPerKWh;
    solarDelivered += directPV * STEP_HOURS;
    points.push({
      time: `${String(Math.floor(hour)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`,
      hour,
      load,
      served: load - deficit,
      pv,
      pvUsed,
      grid,
      diesel,
      charge,
      discharge,
      soc: c.batteryKWh ? (stored / c.batteryKWh) * 100 : 0,
      storedKWh: stored,
      exported,
      curtailed,
      dumped,
      unserved: deficit,
      tariff,
      outage,
      cost:
        grid * STEP_HOURS * tariff +
        fuel * c.dieselPrice +
        discharge * STEP_HOURS * FACTORS.batteryWear,
      carbon: grid * STEP_HOURS * FACTORS.grid + fuel * FACTORS.diesel,
    });
  }
  const energy = (key: keyof Point) =>
    points.reduce((sum, p) => sum + Number(p[key]) * STEP_HOURS, 0);
  const grid = energy("grid"),
    diesel = energy("diesel"),
    served = energy("served");
  return {
    points,
    totals: {
      demand: energy("load"),
      served,
      pv: energy("pv"),
      pvUsed: energy("pvUsed"),
      grid,
      diesel,
      charge: energy("charge"),
      discharge: energy("discharge"),
      exported: energy("exported"),
      curtailed: energy("curtailed"),
      dumped: energy("dumped"),
      unserved: energy("unserved"),
      dieselLiters: diesel * FACTORS.dieselLitersPerKWh,
      cost: points.reduce((s, p) => s + p.cost, 0),
      carbon: points.reduce((s, p) => s + p.carbon, 0),
      gridCarbon: grid * FACTORS.grid,
      dieselCarbon: diesel * FACTORS.dieselLitersPerKWh * FACTORS.diesel,
      peakGrid: Math.max(...points.map((p) => p.grid)),
      initialStored: minStored,
      finalStored: stored,
      renewablePct: served > 0 ? (solarDelivered / served) * 100 : 0,
      exportHours: points.filter((p) => p.exported > 0.01).length * STEP_HOURS,
      generatorHours: points.filter((p) => p.diesel > 0.01).length * STEP_HOURS,
      batteryLoss:
        energy("charge") * (1 - FACTORS.efficiency) +
        energy("discharge") * (1 / FACTORS.efficiency - 1),
    },
  };
}
export function simulate(site: Site, config: Config): Simulation {
  const c = parseConfig(config);
  const baseline = run(site, c, false),
    optimized = run(site, c, true);
  const t = optimized.totals,
    b = baseline.totals;
  const comparable = t.unserved < 0.01 && b.unserved < 0.01;
  const savings = b.cost - t.cost;
  const alerts: Alert[] = [];
  if (t.unserved > 0.01)
    alerts.push({
      id: "capacity",
      severity: "critical",
      title: "Nguồn cấp chưa đáp ứng đủ tải",
      detail: `Thiếu ${t.unserved.toFixed(1)} kWh trong ngày. Cần tăng khả năng cấp điện hoặc dịch tải trước khi đánh giá tiết kiệm.`,
      time: optimized.points.find((p) => p.unserved > 0.01)!.time,
    });
  if (t.exported > 0.01)
    alerts.push({
      id: "export",
      severity: "critical",
      title: "Có điện phát ngược tại PCC",
      detail: `${t.exported.toFixed(1)} kWh xuất ngược khi tắt giới hạn. Bật Zero-Export để mô phỏng hạn chế PV dư.`,
      time: optimized.points.find((p) => p.exported > 0.01)!.time,
    });
  if (c.outage)
    alerts.push({
      id: "outage",
      severity: "warning",
      title: "Kịch bản mất lưới 17:00–19:00",
      detail: `Diesel dự phòng chạy ${t.generatorHours.toFixed(2)} giờ; tiêu thụ ${t.dieselLiters.toFixed(1)} lít.`,
      time: "17:00",
    });
  if (t.curtailed > 1)
    alerts.push({
      id: "curtail",
      severity: "warning",
      title: "Có điện mặt trời bị hạn chế",
      detail: `${t.curtailed.toFixed(1)} kWh PV chưa được sử dụng. Thử dịch tải sang buổi trưa hoặc tăng dung lượng lưu trữ.`,
      time: optimized.points.find((p) => p.curtailed > 0.01)!.time,
    });
  if (!comparable)
    alerts.push({
      id: "baseline",
      severity: "warning",
      title: "Chưa thể công bố tỷ lệ tiết kiệm",
      detail:
        "Ít nhất một phương án chưa phục vụ đủ tải. Chênh lệch chi phí không tương đương hiệu quả tiết kiệm.",
      time: "Cả ngày",
    });
  alerts.push({
    id: "simulation",
    severity: "info",
    title: "Dữ liệu mô phỏng, chưa kết nối thiết bị",
    detail:
      "Bước thời gian 15 phút không kiểm chứng được xung xuất ngược hoặc bảo vệ điện thực tế.",
    time: "Cả ngày",
  });
  return {
    site,
    config: c,
    baseline,
    optimized,
    savings,
    savingsPct: comparable && b.cost > 0 ? (savings / b.cost) * 100 : null,
    carbonReduction: b.carbon - t.carbon,
    comparable,
    alerts,
    modelVersion: MODEL_VERSION,
    date: SIMULATION_DATE,
  };
}
export function formatNumber(n: number, digits = 0) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: digits,
  }).format(n);
}
export function formatMoney(n: number) {
  return `${formatNumber(n)} ₫`;
}
export function localAnalysis(sim: Simulation, question: string): string {
  const {
    optimized: { totals: t },
    config: c,
  } = sim;
  const summary = `Công trường ${sim.site.name} · ${sim.date} · mô phỏng 24 giờ.\n\nChi phí: ${formatMoney(t.cost)}. Điện lưới: ${formatNumber(t.grid, 1)} kWh; PV tiềm năng: ${formatNumber(t.pv, 1)} kWh; diesel: ${formatNumber(t.dieselLiters, 1)} lít.\n`;
  const q = question.toLowerCase();
  let detail = "";
  if (/zero|xuất|ngược/.test(q))
    detail = `\nZero-Export đang ${c.zeroExport ? "bật" : "tắt"}. Xuất ngược: ${formatNumber(t.exported, 1)} kWh; PV hạn chế: ${formatNumber(t.curtailed, 1)} kWh. ${c.zeroExport ? "Mô hình giảm PV dư khi tải và pin không thể hấp thụ." : "Thử bật Zero-Export trong tab Kịch bản để so sánh."} Mô hình 15 phút không chứng minh được đáp ứng quá độ tại PCC; cần nghiệm thu bộ điều khiển cục bộ.`;
  else if (/pin|bess|soc/.test(q))
    detail = `\nPin ${c.batteryKWh} kWh, SOC tối thiểu ${c.reservePct}%. Đã sạc ${formatNumber(t.charge, 1)} kWh và xả ${formatNumber(t.discharge, 1)} kWh. Tồn năng lượng cuối ngày: ${formatNumber(t.finalStored, 1)} kWh (đầu ngày ${formatNumber(t.initialStored, 1)} kWh). Pin không tạo ra điện; chi phí có tính hao mòn ${FACTORS.batteryWear} ₫/kWh xả. Thử chế độ ưu tiên PV để so với sạc điện lưới ban đêm.`;
  else if (/carbon|phát thải|co2|co₂|esg/.test(q))
    detail = `\nPhát thải ước tính ${formatNumber(t.carbon, 1)} kg CO₂e: điện mua ${formatNumber(t.gridCarbon, 1)}, diesel ${formatNumber(t.dieselCarbon, 1)}. Chênh lệch giảm so baseline: ${formatNumber(sim.carbonReduction, 1)} kg CO₂e. Hệ số đang dùng là giả định demo (${FACTORS.grid} kg/kWh và ${FACTORS.diesel} kg/lít), không phải hệ số được xác minh cho hồ sơ ESG.`;
  else
    detail = `\n${sim.savingsPct === null ? "Chưa thể kết luận tiết kiệm: kiểm tra tải thiếu và baseline." : `Chênh lệch chi phí so với cùng nguồn PV nhưng không điều phối pin/dịch tải: ${formatMoney(sim.savings)} (${formatNumber(sim.savingsPct, 1)}%).`} ${t.curtailed > 1 ? "Có PV dư: thử tăng lưu trữ hoặc dịch tải sang 12–15 giờ." : "Thử điều chỉnh dung lượng pin và so sánh chi phí để tránh đầu tư quá mức."} ${c.outage ? "Đang giả lập mất lưới: ưu tiên kiểm tra tải thiếu và dự phòng." : "Bạn có thể bật mất lưới để đánh giá nguồn dự phòng."}`;
  return (
    summary +
    detail +
    "\n\nPhân tích theo quy tắc cục bộ, không phải phản hồi từ mô hình AI. Chỉ đề xuất thử kịch bản; không gửi lệnh điều khiển."
  );
}
export function reportCSV(sim: Simulation): string {
  const t = sim.optimized.totals;
  const rows: (string | number)[][] = [
    ["GreenSite EMS", "BÁO CÁO MÔ PHỎNG — KHÔNG PHẢI KIỂM KÊ ĐƯỢC XÁC MINH"],
    ["Công trường", sim.site.name],
    ["Ngày mô phỏng", sim.date],
    ["Phiên bản", sim.modelVersion],
    ["Bước thời gian (phút)", 15],
    ["Cấu hình", JSON.stringify(sim.config)],
    ["Hệ số demo", JSON.stringify(FACTORS)],
    [
      "Baseline",
      "Cùng tải tổng/ngày và PV; không điều phối pin, không dịch tải",
    ],
    ["Chi phí baseline VND", sim.baseline.totals.cost],
    ["Chi phí phương án VND", t.cost],
    ["Tỷ lệ tiết kiệm (%)", sim.savingsPct ?? "Không đủ điều kiện so sánh"],
    ["CO2e baseline kg", sim.baseline.totals.carbon],
    ["CO2e phương án kg", t.carbon],
    ["Tải thiếu baseline kWh", sim.baseline.totals.unserved],
    ["Tải thiếu phương án kWh", t.unserved],
    ["Tồn pin đầu/cuối ngày kWh", `${t.initialStored} / ${t.finalStored}`],
    [
      "Ghi chú",
      "Không ghi nhận doanh thu điện xuất; không ghi có tồn pin cuối ngày; chưa tính CAPEX, thuế, phí công suất, quá độ và thời gian khởi động diesel.",
    ],
    [],
    [
      "Giờ",
      "Tải kW",
      "Phục vụ kW",
      "PV tiềm năng kW",
      "PV dùng kW",
      "Lưới nhập kW",
      "Diesel kW",
      "Sạc kW",
      "Xả kW",
      "SOC %",
      "Xuất kW",
      "Hạn chế PV kW",
      "Xả tải giả diesel kW",
      "Tải thiếu kW",
      "VND/kWh",
      "Chi phí VND",
      "CO2e kg",
    ],
    ...sim.optimized.points.map((p) => [
      p.time,
      p.load,
      p.served,
      p.pv,
      p.pvUsed,
      p.grid,
      p.diesel,
      p.charge,
      p.discharge,
      p.soc,
      p.exported,
      p.curtailed,
      p.dumped,
      p.unserved,
      p.tariff,
      p.cost,
      p.carbon,
    ]),
  ];
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(typeof cell === "number" ? Math.round(cell * 1000) / 1000 : cell).replace(/"/g, '""')}"`,
          )
          .join(","),
      )
      .join("\r\n")
  );
}
