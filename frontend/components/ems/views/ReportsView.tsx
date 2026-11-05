"use client";
import { formatNumber as n } from "@/lib/format";
import type { Config, Simulation, Site } from "@greensite/contracts";
import { CircleHelp, Download, FileBarChart2 } from "lucide-react";
import { BrandArt, BrandMark } from "../Brand";
import { Comparison, Panel } from "../ui";
type Props = {
  sim: Simulation;
  config: Config;
  site: Site;
  download: (sim: Simulation) => void;
  busy: boolean;
};
export function ReportsView({ sim, config, site, download, busy }: Props) {
  const t = sim.optimized.totals;
  return (
    <>
      <div className="report-cover">
        <div>
          <div className="report-identity">
            <BrandMark />
            <span>
              GreenSite <small>EMS</small>
            </span>
          </div>
          <span className="eyebrow">
            BÁO CÁO NĂNG LƯỢNG · {sim.modelVersion}
          </span>
          <h2>{site.name}</h2>
          <p>
            {site.location} · Ngày mô phỏng {sim.date} · 96 bước tính
          </p>
        </div>
        <BrandArt asset="analytics" className="report-analytics-art" />
        <div className="report-buttons">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => window.print()}
          >
            <FileBarChart2 size={16} />
            In / Lưu PDF
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => download(sim)}
          >
            <Download size={16} />
            Tải CSV chi tiết
          </button>
        </div>
      </div>
      <Comparison sim={sim} />
      <div className="report-grid">
        <Panel
          title="Phát thải vận hành ước tính"
          subtitle="Ranh giới minh họa: công trường kiểm soát máy phát và mua điện"
        >
          <div className="carbon-total">
            {n(t.carbon / 1000, 3)} <span>t CO₂e</span>
          </div>
          <div className="report-line">
            <span>Điện mua · Scope 2 minh họa</span>
            <b>{n(t.gridCarbon, 1)} kg</b>
          </div>
          <div className="report-line">
            <span>Diesel · Scope 1 minh họa</span>
            <b>{n(t.dieselCarbon, 1)} kg</b>
          </div>
          <div className="report-line">
            <span>Chênh lệch giảm so baseline</span>
            <b>{n(sim.carbonReduction, 1)} kg</b>
          </div>
          <p className="footnote report-note">
            Chênh lệch với baseline mô phỏng không phải tín chỉ carbon, không
            phải chứng nhận ESG. Pin không được coi là nguồn phát điện mới.
          </p>
        </Panel>
        <Panel
          title="Giả định & khả năng truy xuất"
          subtitle="Thông tin được đính kèm khi xuất CSV"
        >
          <div className="assumptions-list">
            <p>
              <b>Điện lưới:</b> {sim.factors.grid} kg CO₂e/kWh (giả định demo).
            </p>
            <p>
              <b>Diesel:</b> {sim.factors.diesel} kg CO₂e/lít; tiêu hao{" "}
              {sim.factors.dieselLitersPerKWh} lít/kWh (giả định demo).
            </p>
            <p>
              <b>Hao mòn pin:</b> {sim.factors.batteryWear} ₫/kWh xả; hiệu suất
              mỗi chiều 95%.
            </p>
            <p>
              <b>Dữ liệu:</b> 100% giả lập, không có số đo hiện trường.
            </p>
            <p>
              <b>Chưa tính:</b> CAPEX, thuế, phí công suất, quá độ và thời gian
              khởi động diesel.
            </p>
            <p>
              <b>Tồn pin:</b> {n(t.initialStored, 1)} → {n(t.finalStored, 1)}{" "}
              kWh; không ghi có giá trị tồn cuối ngày.
            </p>
          </div>
        </Panel>
      </div>
      <Panel
        title="Cấu hình của báo cáo"
        subtitle="Để tái lập kết quả mô phỏng"
      >
        <div className="report-config">
          <span>
            PV <b>{config.pvKW} kWp</b>
          </span>
          <span>
            BESS <b>{config.batteryKWh} kWh</b>
          </span>
          <span>
            SOC tối thiểu <b>{config.reservePct}%</b>
          </span>
          <span>
            Nhu cầu <b>{config.loadPct}%</b>
          </span>
          <span>
            Giới hạn lưới <b>{config.gridLimitKW} kW</b>
          </span>
          <span>
            Thời tiết <b>{config.weather === "sunny" ? "Nắng" : "Nhiều mây"}</b>
          </span>
          <span>
            Chiến lược{" "}
            <b>{config.strategy === "economic" ? "Biểu giá" : "Tự dùng PV"}</b>
          </span>
          <span>
            Zero-Export <b>{config.zeroExport ? "Bật" : "Tắt"}</b>
          </span>
          <span>
            Dịch tải <b>{config.shiftLoad ? "Bật" : "Tắt"}</b>
          </span>
          <span>
            Mất lưới 17–19h <b>{config.outage ? "Có" : "Không"}</b>
          </span>
          <span>
            Giá thấp / thường / cao{" "}
            <b>
              {config.offPeakRate} / {config.normalRate} / {config.peakRate}{" "}
              ₫/kWh
            </b>
          </span>
          <span>
            Giá diesel <b>{n(config.dieselPrice)} ₫/lít</b>
          </span>
        </div>
      </Panel>
      <div className="note-box">
        <CircleHelp size={20} />
        <p>
          Cần thay thế hệ số demo bằng nguồn phù hợp năm, địa lý và ranh giới
          kiểm kê trước khi sử dụng trong hồ sơ thực tế. Báo cáo hiện tại phục
          vụ đánh giá mô hình.
        </p>
      </div>
    </>
  );
}
