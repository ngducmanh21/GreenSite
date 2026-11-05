"use client";
import { formatMoney as money, formatNumber as n } from "@/lib/format";
import type { Config, Simulation } from "@greensite/contracts";
import { Check, RotateCcw, Save, Settings2, ShieldCheck } from "lucide-react";
import { EnergyChart } from "../Charts";
import { Comparison, Panel, Slider, Toggle } from "../ui";
type Props = {
  sim: Simulation;
  config: Config;
  index: number;
  setIndex: (value: number) => void;
  change: <K extends keyof Config>(key: K, value: Config[K]) => void;
  saved: boolean;
  saving: boolean;
  save: () => void;
  resetConfig: () => void;
  reloadConfig: () => void;
  busy: boolean;
};
export function ScenariosView({
  sim,
  config,
  index,
  setIndex,
  change,
  saved,
  saving,
  save,
  resetConfig,
  reloadConfig,
  busy,
}: Props) {
  const t = sim.optimized.totals;
  return (
    <div className="scenario-layout">
      <section className="panel controls-panel">
        <div className="panel-heading">
          <div>
            <h2>Thiết lập kịch bản</h2>
            <p>Cập nhật kết quả ngay khi điều chỉnh</p>
          </div>
          <Settings2 size={19} />
        </div>
        <div className="control-body">
          <h3>NGUỒN & NHU CẦU</h3>
          <Slider
            label="Công suất điện mặt trời"
            value={config.pvKW}
            unit="kWp"
            min={0}
            max={1500}
            step={10}
            onChange={(v) => change("pvKW", v)}
          />
          <Slider
            label="Dung lượng pin BESS"
            value={config.batteryKWh}
            unit="kWh"
            min={0}
            max={2500}
            step={50}
            onChange={(v) => change("batteryKWh", v)}
          />
          <Slider
            label="SOC dự phòng tối thiểu"
            value={config.reservePct}
            unit="%"
            min={10}
            max={80}
            onChange={(v) => change("reservePct", v)}
          />
          <Slider
            label="Nhu cầu so với tải mẫu"
            value={config.loadPct}
            unit="%"
            min={40}
            max={180}
            step={5}
            onChange={(v) => change("loadPct", v)}
          />
          <Slider
            label="Giới hạn nhập điện lưới"
            value={config.gridLimitKW}
            unit="kW"
            min={50}
            max={1000}
            step={10}
            onChange={(v) => change("gridLimitKW", v)}
          />
          <div className="two-controls">
            <label>
              Thời tiết
              <select
                value={config.weather}
                onChange={(e) =>
                  change("weather", e.target.value as Config["weather"])
                }
              >
                <option value="sunny">Trời nắng</option>
                <option value="cloudy">Nhiều mây</option>
              </select>
            </label>
            <label>
              Chiến lược
              <select
                value={config.strategy}
                onChange={(e) =>
                  change("strategy", e.target.value as Config["strategy"])
                }
              >
                <option value="economic">Theo biểu giá</option>
                <option value="solar">Ưu tiên tự dùng PV</option>
              </select>
            </label>
          </div>
          <h3>CHÍNH SÁCH MÔ PHỎNG</h3>
          <Toggle
            title="Zero-Export"
            description="Hạn chế PV dư, không xuất ngược lưới"
            checked={config.zeroExport}
            onChange={(v) => change("zeroExport", v)}
          />
          <Toggle
            title="Dịch tải linh hoạt"
            description="Chuyển một phần tải 17–20h sang 12–15h"
            checked={config.shiftLoad}
            onChange={(v) => change("shiftLoad", v)}
          />
          <Toggle
            title="Giả lập mất điện lưới"
            description="Mất lưới 17–19h, kích hoạt dự phòng"
            checked={config.outage}
            onChange={(v) => change("outage", v)}
          />
          <details className="tariff-settings">
            <summary>Biểu giá giả định & nhiên liệu</summary>
            {(
              [
                { key: "offPeakRate", label: "Thấp điểm (₫/kWh)" },
                { key: "normalRate", label: "Bình thường (₫/kWh)" },
                { key: "peakRate", label: "Cao điểm (₫/kWh)" },
                { key: "dieselPrice", label: "Diesel (₫/lít)" },
              ] as const
            ).map(({ key, label }) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min="0"
                  max={key === "dieselPrice" ? 100000 : 20000}
                  step="100"
                  value={config[key]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (
                      Number.isFinite(v) &&
                      v >= 0 &&
                      v <= (key === "dieselPrice" ? 100000 : 20000)
                    )
                      change(key, v);
                  }}
                />
              </label>
            ))}
            <p className="footnote">
              Thấp điểm 22–06h; cao điểm 09:30–11:30 và 17–20h. Chỉ là lịch mẫu,
              không phải biểu giá điện hiện hành.
            </p>
          </details>
          <button
            className="text-button"
            onClick={reloadConfig}
            disabled={saving}
          >
            Tải lại từ máy chủ
          </button>
          <div className="control-actions">
            <button
              className="button primary"
              onClick={save}
              disabled={saving || saved}
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved
                ? "Đã lưu trên máy chủ"
                : saving
                  ? "Đang lưu…"
                  : "Lưu kịch bản"}
            </button>
            <button
              className="button secondary icon-only"
              aria-label="Khôi phục cấu hình mẫu"
              onClick={resetConfig}
            >
              <RotateCcw size={17} />
            </button>
          </div>
        </div>
      </section>
      <div
        className={`scenario-results ${busy ? "results-pending" : ""}`}
        aria-busy={busy}
      >
        <div className="scenario-summary">
          <span className="eyebrow">KẾT QUẢ SO VỚI BASELINE</span>
          <div>
            <strong>
              {sim.savingsPct === null
                ? "—"
                : `${sim.savings >= 0 ? "−" : "+"}${n(Math.abs(sim.savingsPct), 1)}%`}
            </strong>
            <span>chi phí vận hành trong ngày</span>
          </div>
          <p>
            {sim.comparable
              ? `${money(sim.baseline.totals.cost)} → ${money(t.cost)}`
              : "Có tải chưa được phục vụ. Chưa đủ điều kiện kết luận tiết kiệm."}
          </p>
        </div>
        <Comparison sim={sim} />
        <Panel
          title="Đường công suất của phương án"
          subtitle="Kéo thanh thời gian để xem từng bước"
        >
          <EnergyChart sim={sim} index={index} onIndex={setIndex} />
        </Panel>
        <div className="note-box">
          <ShieldCheck size={19} />
          <div>
            <strong>Giới hạn mô hình</strong>
            <p>
              Tối ưu theo quy tắc, chưa bảo đảm nghiệm tối ưu toàn cục. Baseline
              có cùng PV và tổng nhu cầu, không điều phối pin/dịch tải. Hai
              phương án bắt đầu ở SOC dự phòng; tồn pin cuối ngày không được quy
              đổi thành khoản tiết kiệm. Chưa tính CAPEX, phí công suất hay quá
              độ thiết bị.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
