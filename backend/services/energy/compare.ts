import type { Site, Config, ScenarioComparison } from "@greensite/contracts";
import { simulate } from "./engine.js";
export function compareScenarios(
  site: Site,
  reference: Config,
  candidate: Config,
): ScenarioComparison {
  const a = simulate(site, reference),
    b = simulate(site, candidate);
  const first = a.optimized.totals,
    second = b.optimized.totals;
  const reasons: string[] = [];
  if (Math.abs(first.demand - second.demand) > 0.000001)
    reasons.push("Nhu cầu phụ tải của hai phương án khác nhau.");
  if (a.config.weather !== b.config.weather)
    reasons.push("Hai phương án sử dụng điều kiện thời tiết khác nhau.");
  if (a.config.outage !== b.config.outage)
    reasons.push("Điều kiện mất điện lưới khác nhau.");
  if (
    (["offPeakRate", "normalRate", "peakRate", "dieselPrice"] as const).some(
      (key) => a.config[key] !== b.config[key],
    )
  )
    reasons.push("Biểu giá điện hoặc giá diesel khác nhau.");
  if (first.unserved > 0.01 || second.unserved > 0.01)
    reasons.push("Ít nhất một phương án chưa phục vụ đủ nhu cầu tải.");
  const comparable = reasons.length === 0;
  return {
    siteId: site.id,
    modelVersion: b.modelVersion,
    date: b.date,
    reference: { config: a.config, totals: first },
    candidate: { config: b.config, totals: second },
    comparable,
    reasons,
    costChange: second.cost - first.cost,
    carbonChange: second.carbon - first.carbon,
    savingsPct:
      comparable && first.cost > 0
        ? ((first.cost - second.cost) / first.cost) * 100
        : null,
  };
}
