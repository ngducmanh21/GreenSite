"use client";
import { Loader2, Pin, RefreshCw, X } from "lucide-react";
import type { Config } from "@greensite/contracts";
import type { ScenarioComparisonState } from "@/hooks/useScenarioComparison";
import { formatNumber as n, formatMoney as money } from "@/lib/format";
import { Panel } from "../ui";
const labels: Record<keyof Config, string> = {
  pvKW: "PV (kWp)",
  batteryKWh: "BESS (kWh)",
  reservePct: "SOC dự phòng (%)",
  loadPct: "Nhu cầu tải (%)",
  gridLimitKW: "Giới hạn lưới (kW)",
  weather: "Thời tiết",
  strategy: "Chiến lược",
  zeroExport: "Zero-Export",
  shiftLoad: "Dịch tải",
  outage: "Mất lưới",
  offPeakRate: "Giá thấp điểm (₫/kWh)",
  normalRate: "Giá bình thường (₫/kWh)",
  peakRate: "Giá cao điểm (₫/kWh)",
  dieselPrice: "Giá diesel (₫/lít)",
};
function display(value: Config[keyof Config]) {
  if (typeof value === "boolean") return value ? "Bật" : "Tắt";
  if (typeof value === "number") return n(value);
  return (
    (
      {
        sunny: "Nắng",
        cloudy: "Nhiều mây",
        economic: "Theo biểu giá",
        solar: "Tự dùng PV",
      } as Record<string, string>
    )[value] ?? value
  );
}
function signed(value: number, unit: string) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${n(Math.abs(value), unit === "₫" ? 0 : 1)} ${unit}`;
}
export function ScenarioReference({
  state,
  config,
  busy,
}: {
  state: ScenarioComparisonState;
  config: Config;
  busy: boolean;
}) {
  const r = state.result;
  const difference = r
    ? (Object.keys(labels) as (keyof Config)[]).filter(
        (key) => r.reference.config[key] !== r.candidate.config[key],
      )
    : [];
  return (
    <Panel
      title="So sánh với phương án đã ghim"
      subtitle="Mốc giữ trong phiên hiện tại; đổi công trường hoặc tải lại trang sẽ xóa mốc."
      action={
        state.reference ? (
          <button type="button" className="text-button" onClick={state.clear}>
            <X size={14} />
            Bỏ mốc
          </button>
        ) : undefined
      }
    >
      {!state.reference ? (
        <div className="reference-empty">
          <span className="icon-box green">
            <Pin size={19} />
          </span>
          <p>
            Ghim phương án hiện tại, rồi chỉnh tham số để xem chi phí và phát
            thải thay đổi bao nhiêu.
          </p>
          <button
            className="button primary"
            type="button"
            disabled={busy}
            onClick={() => state.pin(config)}
          >
            <Pin size={15} />
            Ghim làm mốc
          </button>
        </div>
      ) : (
        <>
          <div className="reference-heading">
            <span>
              Mốc: <b>{n(state.reference.pvKW)} kWp PV</b> ·{" "}
              <b>{n(state.reference.batteryKWh)} kWh BESS</b> · tải{" "}
              <b>{n(state.reference.loadPct)}%</b>
            </span>
            <button
              type="button"
              className="text-button"
              disabled={busy || state.pending}
              onClick={() => state.pin(config)}
            >
              <RefreshCw size={13} />
              Đặt lại mốc
            </button>
          </div>
          {(state.pending || busy) && (
            <div className="reference-loading" role="status">
              <Loader2 size={16} className="spin" />
              Đang so sánh hai phương án…
            </div>
          )}
          {state.error && (
            <div className="file-error" role="alert">
              {state.error}
              <button
                type="button"
                className="text-button"
                onClick={state.retry}
              >
                Thử lại
              </button>
            </div>
          )}
          {r && !busy && !state.pending && (
            <>
              <div
                className={`reference-verdict ${r.comparable ? "eligible" : "ineligible"}`}
              >
                {!r.comparable ? (
                  <>
                    <strong>Chưa đủ điều kiện kết luận tiết kiệm</strong>
                    <ul>
                      {r.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <p>
                      Bảng dưới chỉ thể hiện chênh lệch giữa hai tình huống.
                    </p>
                  </>
                ) : (
                  <>
                    <strong>
                      {r.savingsPct === null
                        ? "Mốc có chi phí bằng 0; không tính tỷ lệ."
                        : r.savingsPct === 0
                          ? "Chi phí vận hành không đổi."
                          : `${r.savingsPct > 0 ? "Giảm" : "Tăng"} ${n(Math.abs(r.savingsPct), 1)}% chi phí vận hành so với mốc.`}
                    </strong>
                    <p>
                      Cùng nhu cầu, thời tiết, điều kiện lưới và biểu giá; cả
                      hai phương án phục vụ đủ tải.
                    </p>
                  </>
                )}
              </div>
              <div className="table-scroll">
                <table className="reference-table">
                  <thead>
                    <tr>
                      <th>Chỉ số / ngày</th>
                      <th>Mốc đã ghim</th>
                      <th>Hiện tại</th>
                      <th>Chênh lệch</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Chi phí vận hành</td>
                      <td>{money(r.reference.totals.cost)}</td>
                      <td>{money(r.candidate.totals.cost)}</td>
                      <td
                        className={
                          r.comparable
                            ? r.costChange < 0
                              ? "decrease"
                              : r.costChange > 0
                                ? "increase"
                                : ""
                            : ""
                        }
                      >
                        {signed(r.costChange, "₫")}
                      </td>
                    </tr>
                    <tr>
                      <td>Phát thải ước tính</td>
                      <td>{n(r.reference.totals.carbon, 1)} kg CO₂e</td>
                      <td>{n(r.candidate.totals.carbon, 1)} kg CO₂e</td>
                      <td>{signed(r.carbonChange, "kg CO₂e")}</td>
                    </tr>
                    <tr>
                      <td>Tải chưa phục vụ</td>
                      <td>{n(r.reference.totals.unserved, 1)} kWh</td>
                      <td>{n(r.candidate.totals.unserved, 1)} kWh</td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <details className="reference-details">
                <summary>
                  {difference.length
                    ? `${difference.length} tham số khác nhau`
                    : "Hai phương án đang có cùng tham số"}
                </summary>
                {difference.length > 0 && (
                  <dl>
                    {difference.map((key) => (
                      <div key={key}>
                        <dt>{labels[key]}</dt>
                        <dd>
                          {display(r.reference.config[key])} →{" "}
                          {display(r.candidate.config[key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </details>
              <p className="reference-note">
                So sánh chi phí vận hành mô phỏng, chưa tính vốn đầu tư thiết
                bị. Năng lượng còn trong pin cuối ngày không được quy đổi thành
                khoản tiết kiệm.
              </p>
            </>
          )}
        </>
      )}
    </Panel>
  );
}
