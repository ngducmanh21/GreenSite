"use client";
import type { Alert, Simulation, Site } from "@greensite/contracts";
import { Activity, Bell, Check, CheckCheck } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { BrandArt } from "../Brand";
import { Panel } from "../ui";
type Props = {
  sim: Simulation;
  site: Site;
  acknowledged: string[];
  setAcknowledged: Dispatch<SetStateAction<string[]>>;
  activeAlerts: Alert[];
};
export function AlertsView({
  sim,
  site,
  acknowledged,
  setAcknowledged,
  activeAlerts,
}: Props) {
  return (
    <>
      <div className="alert-mascot-banner">
        <BrandArt asset="mascot-alert" className="alert-mascot-art" />
        <div>
          <span className="eyebrow">CÙNG GREENSITE THEO DÕI</span>
          <h2>Kiểm tra một chút. An tâm thêm nhiều.</h2>
          <p>
            Cùng xem các điểm cần chú ý trong kịch bản. Xác nhận đã đọc để theo
            dõi công việc; mọi số liệu vẫn là mô phỏng.
          </p>
        </div>
      </div>
      <Panel
        title="Nhật ký kịch bản"
        subtitle="Xác nhận chỉ đánh dấu đã đọc trong phiên này, không thay đổi mô phỏng"
        action={<span className="tag">{activeAlerts.length} cần xem</span>}
      >
        <div className="alerts-list">
          {sim.alerts.map((a) => (
            <div
              key={a.id}
              className={`alert-row ${acknowledged.includes(a.id) ? "acknowledged" : ""}`}
            >
              <span className={`alert-symbol ${a.severity}`}>
                {a.severity === "info" ? (
                  <Activity size={18} />
                ) : (
                  <Bell size={18} />
                )}
              </span>
              <div>
                <div className="alert-title">
                  <h3>{a.title}</h3>
                  <span className={`severity-badge ${a.severity}`}>
                    {a.severity === "critical"
                      ? "Cần xử lý"
                      : a.severity === "warning"
                        ? "Cần theo dõi"
                        : "Thông tin"}
                  </span>
                </div>
                <p>{a.detail}</p>
                <small>
                  {a.time} · {site.name} · Mô phỏng
                </small>
              </div>
              <button
                className="button secondary"
                disabled={acknowledged.includes(a.id)}
                onClick={() => setAcknowledged((aIds) => [...aIds, a.id])}
              >
                {acknowledged.includes(a.id) ? (
                  <CheckCheck size={16} />
                ) : (
                  <Check size={16} />
                )}
                {acknowledged.includes(a.id) ? "Đã xem" : "Xác nhận"}
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
