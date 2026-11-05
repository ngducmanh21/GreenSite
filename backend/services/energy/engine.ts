import {
  parseConfig,
  type Site,
  type Config,
  type Point,
  type Run,
  type Alert,
  type Simulation,
} from "@greensite/contracts";
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
export function priceAt(hour: number, c: Config) {
  return hour < 6 || hour >= 22
    ? c.offPeakRate
    : (hour >= 9.5 && hour < 11.5) || (hour >= 17 && hour < 20)
      ? c.peakRate
      : c.normalRate;
}
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
    factors: { ...FACTORS },
    modelVersion: MODEL_VERSION,
    date: SIMULATION_DATE,
  };
}
