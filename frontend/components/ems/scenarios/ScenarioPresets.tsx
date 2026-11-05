"use client";
import type { Config, ScenarioPreset } from "@greensite/contracts";
import { ArrowUpRight, CloudSun, Sun, ZapOff } from "lucide-react";
const icons = { solar: Sun, outage: ZapOff, "cloudy-peak": CloudSun };
export function ScenarioPresets({
  presets,
  config,
  onApply,
}: {
  presets: ScenarioPreset[];
  config: Config;
  onApply: (config: Config) => void;
}) {
  if (!presets?.length) return null;
  return (
    <section className="scenario-presets" aria-label="Kịch bản mẫu">
      <div className="preset-heading">
        <h2>Thử nhanh một tình huống</h2>
        <p>
          Mỗi lựa chọn thay toàn bộ tham số bằng cấu hình mẫu của công trường.
        </p>
      </div>
      <div className="preset-grid">
        {presets.map((preset) => {
          const Icon = icons[preset.id as keyof typeof icons] ?? Sun;
          return (
            <button
              className="preset-card"
              type="button"
              key={preset.id}
              aria-pressed={Object.entries(preset.config).every(
                ([key, value]) => config[key as keyof Config] === value,
              )}
              onClick={() => onApply(preset.config)}
            >
              <span className="icon-box green">
                <Icon size={19} />
              </span>
              <span>
                <strong>{preset.title}</strong>
                <small>{preset.description}</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
