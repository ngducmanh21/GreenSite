"use client";
import { formatNumber as n } from "@/lib/format";
import type { Simulation, Site } from "@greensite/contracts";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Gauge,
  Leaf,
  Pause,
  Play,
  Sun,
  Zap,
} from "lucide-react";
import { BrandArt, BrandMark } from "../Brand";
import { EnergyChart, EnergyFlow, SourceMix } from "../Charts";
import type { View } from "../navigation";
import { Metric, Panel } from "../ui";
type Props = {
  sim: Simulation;
  site: Site;
  sites: Site[];
  siteId: string;
  index: number;
  setIndex: (value: number) => void;
  playing: boolean;
  setPlaying: (value: boolean) => void;
  navigate: (view: View) => void;
  selectSite: (id: string) => void;
  setToast: (message: string) => void;
};
export function OverviewView({
  sim,
  site,
  sites,
  siteId,
  index,
  setIndex,
  playing,
  setPlaying,
  navigate,
  selectSite,
  setToast,
}: Props) {
  const t = sim.optimized.totals;
  const point = sim.optimized.points[index];
  return (
    <>
      <div className="overview-banner">
        <div className="banner-icon">
          <BrandMark />
        </div>
        <div>
          <strong>Năng lượng thông minh. Công trường bền vững.</strong>
          <p>
            {sim.savingsPct === null
              ? "Kiểm tra khả năng cấp tải trước khi đánh giá hiệu quả chi phí."
              : `Kịch bản hiện tại ${sim.savings >= 0 ? "giảm" : "tăng"} ${n(Math.abs(sim.savingsPct), 1)}% chi phí so với baseline cùng công trường.`}
          </p>
        </div>
        <button onClick={() => navigate("scenarios")}>
          Khám phá kịch bản <ArrowRight size={16} />
        </button>
        <BrandArt asset="mascot-tablet" className="banner-mascot" />
      </div>
      <div className="kpi-grid">
        <Metric
          icon={<Zap size={19} />}
          label="Năng lượng tiêu thụ"
          value={n(t.served)}
          unit="kWh"
          detail={`${n(t.demand)} kWh nhu cầu trong ngày`}
        />
        <Metric
          icon={<Sun size={19} />}
          label="Tỷ lệ điện tái tạo¹"
          value={n(t.renewablePct, 1)}
          unit="%"
          detail="PV cấp tải trực tiếp và qua pin"
          color="amber"
        />
        <Metric
          icon={<Gauge size={19} />}
          label="Chi phí vận hành"
          value={n(t.cost / 1000000, 2)}
          unit="triệu ₫"
          detail={
            sim.savingsPct === null
              ? "Chưa đủ điều kiện so sánh"
              : `${sim.savings >= 0 ? "↓" : "↑"} ${n(Math.abs(sim.savingsPct), 1)}% so với baseline`
          }
          color="blue"
        />
        <Metric
          icon={<Leaf size={19} />}
          label="Phát thải ước tính"
          value={n(t.carbon / 1000, 2)}
          unit="t CO₂e"
          detail="Hệ số giả định · chưa xác minh"
          color="sage"
        />
      </div>
      <div className="overview-primary">
        <Panel
          title="Dòng năng lượng"
          subtitle="Trạng thái tại thời điểm đang xem"
          action={
            <div className="replay-control">
              <button
                aria-label={playing ? "Tạm dừng mô phỏng" : "Phát lại mô phỏng"}
                onClick={() => setPlaying(!playing)}
              >
                {playing ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <span>{point.time}</span>
              <small>MÔ PHỎNG</small>
            </div>
          }
        >
          <EnergyFlow point={point} sim={sim} />
        </Panel>
        <Panel
          title="Công suất trong ngày"
          subtitle="Cân bằng nguồn và nhu cầu theo thời gian"
          action={<span className="tag">24 giờ</span>}
        >
          <EnergyChart
            sim={sim}
            index={index}
            onIndex={(i) => {
              setIndex(i);
              setPlaying(false);
            }}
          />
        </Panel>
      </div>
      <div className="overview-secondary">
        <Panel
          title="Cơ cấu nguồn năng lượng"
          subtitle="Tổng năng lượng đầu vào trong ngày"
        >
          <SourceMix sim={sim} />
        </Panel>
        <Panel
          title="Điểm cần chú ý"
          subtitle={`${sim.alerts.filter((a) => a.severity !== "info").length} sự kiện từ kịch bản hiện tại`}
          action={
            <button className="text-button" onClick={() => navigate("alerts")}>
              Xem tất cả <ArrowUpRight size={14} />
            </button>
          }
        >
          <div className="insight-list">
            {sim.alerts.slice(0, 3).map((a) => (
              <div key={a.id} className="insight">
                <span className={`alert-symbol ${a.severity}`}>
                  {a.severity === "info" ? (
                    <Activity size={16} />
                  ) : (
                    <Bell size={16} />
                  )}
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <section className="assistant-teaser">
          <div className="assistant-teaser-intro">
            <div>
              <span className="eyebrow">GREENSITE ASSISTANT</span>
              <h2>
                Đồng đội xanh
                <br />
                của công trường.
              </h2>
            </div>
            <BrandArt asset="mascot-wave" className="teaser-mascot" />
          </div>
          <p>
            Hiểu cách sử dụng pin, lý do hạn chế PV và cơ hội tối ưu chi phí.
          </p>
          <button onClick={() => navigate("assistant")}>
            Trao đổi với trợ lý <ArrowRight size={16} />
          </button>
          <small>Phân tích cục bộ + tích hợp OpenAI tùy chọn</small>
        </section>
      </div>
      <Panel
        title="Danh mục công trường mẫu"
        subtitle="Các cấu hình mẫu; chọn một công trường để khám phá"
        action={<span className="tag">3 công trường</span>}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Công trường</th>
                <th>Điện mặt trời</th>
                <th>Lưu trữ BESS</th>
                <th>Giới hạn lưới</th>
                <th>Nguồn dữ liệu</th>
                <th>
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="table-site">
                      <span className="table-site-icon">
                        <Building2 size={17} />
                      </span>
                      <div>
                        <b>{s.name}</b>
                        <small>{s.location} · cấu hình gốc</small>
                      </div>
                    </div>
                  </td>
                  <td>{n(s.pvKW)} kWp</td>
                  <td>{n(s.batteryKWh)} kWh</td>
                  <td>{n(s.gridLimitKW)} kW</td>
                  <td>
                    <span className="status-chip neutral">Mô phỏng</span>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        selectSite(s.id);
                        setToast(`Đang xem ${s.name}.`);
                      }}
                    >
                      {siteId === s.id ? "Đang xem" : "Mở"}
                      <ArrowUpRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="footnote page-footnote">
        ¹ Theo dõi nguồn PV sạc vào pin; không tính điện sạc từ lưới là tái tạo.
        Mọi số liệu trên trang là kết quả mô phỏng, không phải dữ liệu vận hành
        thực.
      </p>
    </>
  );
}
