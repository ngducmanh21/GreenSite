import type { Simulation } from "@greensite/contracts";
export function reportCSV(sim: Simulation): string {
  const t = sim.optimized.totals;
  const rows: (string | number)[][] = [
    ["GreenSite EMS", "BÁO CÁO MÔ PHỎNG — KHÔNG PHẢI KIỂM KÊ ĐƯỢC XÁC MINH"],
    ["Công trường", sim.site.name],
    ["Ngày mô phỏng", sim.date],
    ["Phiên bản", sim.modelVersion],
    ["Bước thời gian (phút)", 15],
    ["Cấu hình", JSON.stringify(sim.config)],
    ["Hệ số demo", JSON.stringify(sim.factors)],
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
