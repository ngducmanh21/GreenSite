import type { Config, ScenarioPreset } from "@greensite/contracts";
export function scenarioPresets(defaults: Config): ScenarioPreset[] {
  return [
    {
      id: "solar",
      title: "Tận dụng điện mặt trời",
      description: "Ưu tiên tự dùng PV, dịch tải sang buổi trưa.",
      config: {
        ...defaults,
        strategy: "solar",
        shiftLoad: true,
        zeroExport: true,
      },
    },
    {
      id: "outage",
      title: "Mất lưới giờ cao điểm",
      description: "Mất lưới 17–19h, SOC dự phòng tối thiểu 35%.",
      config: { ...defaults, outage: true, reservePct: 35 },
    },
    {
      id: "cloudy-peak",
      title: "Ít nắng, tải cao",
      description: "Nhiều mây và nhu cầu bằng 130% tải mẫu.",
      config: { ...defaults, weather: "cloudy", loadPct: 130 },
    },
  ];
}
