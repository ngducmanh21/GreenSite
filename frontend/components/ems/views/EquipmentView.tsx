"use client";
import type { Config, Site } from "@greensite/contracts";
import {
  Activity,
  BatteryCharging,
  Fuel,
  Settings2,
  Sun,
  UtilityPole,
} from "lucide-react";
import { BrandArt } from "../Brand";
import type { View } from "../navigation";
import { Panel } from "../ui";
type Props = {
  config: Config;
  site: Site;
  navigate: (view: View) => void;
};
export function EquipmentView({ config, site, navigate }: Props) {
  return (
    <>
      <div className="connection-banner">
        <span className="icon-box green">
          <Activity size={22} />
        </span>
        <div>
          <h2>Chế độ mô phỏng độc lập</h2>
          <p>
            Chưa có gateway thiết bị kết nối. Các thông số dưới đây lấy từ kịch
            bản hiện tại.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => navigate("scenarios")}
        >
          <Settings2 size={16} />
          Chỉnh cấu hình
        </button>
      </div>
      <div className="device-grid">
        {[
          {
            icon: UtilityPole,
            name: "Điện lưới & đồng hồ PCC",
            asset: "grid" as const,
            value: `${config.gridLimitKW} kW`,
            label: "Giới hạn nhập điện",
            detail:
              "Đo công suất hai chiều, điện năng nhập/xuất riêng. Dương = nhập; âm = xuất.",
          },
          {
            icon: Sun,
            name: "Hệ thống điện mặt trời",
            asset: "solar" as const,
            value: `${config.pvKW} kWp`,
            label: "Công suất lắp đặt mô phỏng",
            detail:
              "Inverter cần hỗ trợ giới hạn công suất theo lệnh của bộ điều khiển cục bộ.",
          },
          {
            icon: BatteryCharging,
            name: "Hệ thống lưu trữ BESS",
            asset: "battery" as const,
            value: `${config.batteryKWh} kWh`,
            label: `Sạc/xả tối đa ${site.batteryKW} kW`,
            detail: `SOC ${config.reservePct}–95%. Hiệu suất mỗi chiều 95%. BMS quyết định giới hạn an toàn thực tế.`,
          },
          {
            icon: Fuel,
            name: "Máy phát diesel",
            asset: "diesel" as const,
            value: `${site.generatorKW} kW`,
            label: "Chỉ dùng dự phòng mất lưới",
            detail:
              "Mô hình giả định tải tối thiểu 30%; phần dư vào tải giả. Chưa mô phỏng khởi động hay hòa đồng bộ.",
          },
        ].map(({ icon: Icon, ...d }) => (
          <section key={d.name} className="panel device-card">
            <div>
              <span className="icon-box green">
                <Icon size={23} />
              </span>
              <span className="tag">Mô phỏng</span>
            </div>
            <div className="device-art-frame">
              <BrandArt asset={d.asset} className="device-illustration" />
            </div>
            <h2>{d.name}</h2>
            <strong className="device-capacity">{d.value}</strong>
            <span className="muted">{d.label}</span>
            <p>{d.detail}</p>
          </section>
        ))}
      </div>
      <Panel
        title="Từ mô phỏng đến kết nối hiện trường"
        subtitle="Các giai đoạn triển khai; chỉ giai đoạn 01 đã có trong MVP"
      >
        <div className="architecture-steps">
          {[
            {
              no: "01",
              title: "Mô phỏng",
              text: "Kiểm tra nguồn/tải và so sánh kịch bản bằng dữ liệu giả lập.",
              current: true,
            },
            {
              no: "02",
              title: "Gateway chỉ đọc",
              text: "Tích hợp đồng hồ, xác minh dữ liệu và đo baseline tại công trường.",
            },
            {
              no: "03",
              title: "Điều khiển cục bộ",
              text: "Thử nghiệm có giám sát, nghiệm thu liên động và chế độ khi mất mạng.",
            },
            {
              no: "04",
              title: "Vận hành đa công trường",
              text: "Phân quyền, lưu trữ trung tâm, cảnh báo và quy trình vận hành.",
            },
          ].map((s) => (
            <div className={s.current ? "current" : ""} key={s.no}>
              <span>{s.no}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
