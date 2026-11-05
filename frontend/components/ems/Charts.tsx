"use client";
import { BRAND_COLORS, type BrandAsset } from "@/lib/brand";
import { formatNumber as n } from "@/lib/format";
import type { Point, Simulation } from "@greensite/contracts";
import { BatteryCharging, Fuel, Sun, UtilityPole } from "lucide-react";
import { BrandArt } from "./Brand";
const series = [
  { key: "load", name: "Phụ tải", color: BRAND_COLORS.forest },
  { key: "pvUsed", name: "Điện mặt trời", color: BRAND_COLORS.amber },
  { key: "grid", name: "Điện lưới", color: BRAND_COLORS.green },
  { key: "discharge", name: "BESS xả", color: BRAND_COLORS.lime },
] as const;
export function EnergyChart({
  sim,
  index,
  onIndex,
}: {
  sim: Simulation;
  index: number;
  onIndex: (i: number) => void;
}) {
  const points = sim.optimized.points;
  const max =
    Math.ceil(
      Math.max(
        ...points.flatMap((p) => [p.load, p.pvUsed, p.grid, p.discharge]),
        50,
      ) / 100,
    ) * 100;
  const x = (i: number) => 48 + (i / 95) * 730,
    y = (v: number) => 182 - (v / max) * 170;
  const selected = points[index];
  return (
    <div className="energy-chart">
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
        <span className="chart-unit">kW</span>
      </div>
      <svg
        viewBox="0 0 800 220"
        role="img"
        aria-label="Biểu đồ công suất mô phỏng trong 24 giờ"
      >
        <defs>
          <linearGradient id="solar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={BRAND_COLORS.amber}
              stopOpacity="0.25"
            />
            <stop
              offset="100%"
              stopColor={BRAND_COLORS.amber}
              stopOpacity="0.01"
            />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1={48}
              y1={y((max * i) / 4)}
              x2={778}
              y2={y((max * i) / 4)}
              stroke="#e8ede9"
              strokeDasharray="3 4"
            />
            <text x={36} y={y((max * i) / 4) + 4} textAnchor="end">
              {n((max * i) / 4)}
            </text>
          </g>
        ))}
        <polygon
          points={`48,182 ${points.map((p, i) => `${x(i)},${y(p.pvUsed)}`).join(" ")} 778,182`}
          fill="url(#solar-fill)"
        />
        {sim.config.outage && (
          <rect
            x={x(68)}
            y={12}
            width={x(76) - x(68)}
            height={170}
            fill="#df785c"
            opacity="0.1"
          />
        )}
        {series.map((s) => (
          <polyline
            key={s.key}
            points={points.map((p, i) => `${x(i)},${y(p[s.key])}`).join(" ")}
            stroke={s.color}
            strokeWidth={s.key === "load" ? 2.5 : 2}
            fill="none"
            strokeDasharray={s.key === "load" ? "5 4" : undefined}
            strokeLinejoin="round"
          />
        ))}
        <line
          x1={x(index)}
          y1={12}
          x2={x(index)}
          y2={182}
          stroke="#a7b5ad"
          strokeDasharray="3 3"
        />
        {series.map((s) => (
          <circle
            key={s.key}
            cx={x(index)}
            cy={y(selected[s.key])}
            r={3.5}
            fill={s.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}
        {[0, 16, 32, 48, 64, 80, 95].map((i) => (
          <text key={i} x={x(i)} y={208} textAnchor="middle">
            {points[i].time}
          </text>
        ))}
      </svg>
      <div className="chart-readout">
        <b>{selected.time}</b>
        {series.map((s) => (
          <span key={s.key}>
            {s.name} <strong>{n(selected[s.key], 1)}</strong>
          </span>
        ))}
      </div>
      <label className="sr-only" htmlFor="chart-time">
        Chọn thời điểm trên biểu đồ
      </label>
      <input
        id="chart-time"
        className="time-slider"
        type="range"
        min="0"
        max="95"
        value={index}
        onChange={(e) => onIndex(Number(e.target.value))}
      />
    </div>
  );
}
export function EnergyFlow({ point, sim }: { point: Point; sim: Simulation }) {
  const sources = [
    {
      icon: UtilityPole,
      name: "Điện lưới",
      value: point.grid,
      sub: point.outage
        ? "Mất kết nối lưới"
        : `${n(sim.config.gridLimitKW)} kW giới hạn`,
      cls: "grid",
    },
    {
      icon: Sun,
      name: "Điện mặt trời",
      value: point.pvUsed,
      sub: `${n(point.curtailed, 1)} kW hạn chế`,
      cls: "solar",
    },
    {
      icon: BatteryCharging,
      name: "Pin lưu trữ",
      value: point.discharge - point.charge,
      sub: `SOC ${n(point.soc, 1)}% · ${point.charge > 0 ? "Đang sạc" : point.discharge > 0 ? "Đang xả" : "Sẵn sàng"}`,
      cls: "battery",
    },
    {
      icon: Fuel,
      name: "Diesel dự phòng",
      value: point.diesel,
      sub: point.diesel > 0 ? "Đang cấp điện" : "Chế độ chờ",
      cls: "diesel",
    },
  ];
  return (
    <div className="flow-content">
      <div className="source-grid">
        {sources.map(({ icon: Icon, ...s }) => (
          <div className={`source-card ${s.cls}`} key={s.name}>
            <BrandArt
              asset={s.cls as BrandAsset}
              className="source-illustration"
            />
            <div className="source-label">
              <Icon size={17} />
              <span>{s.name}</span>
              <span
                className={`status-dot ${Math.abs(s.value) > 0.01 ? "active" : ""}`}
              />
            </div>
            <div className="source-value">
              {n(Math.abs(s.value), 1)} <small>kW</small>
            </div>
            <div className="source-sub">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="flow-connector">
        <span />
        <div>
          <span className="pulse-dot" /> ENERGY BUS
        </div>
        <span />
      </div>
      <div className="load-card">
        <div className="load-icon">
          <BrandArt asset="construction" />
        </div>
        <div>
          <span>Phụ tải công trường</span>
          <p>
            {point.unserved > 0.01
              ? `Thiếu ${n(point.unserved, 1)} kW`
              : "Đủ nguồn cấp trong bước mô phỏng"}
          </p>
        </div>
        <strong>
          {n(point.load, 1)} <small>kW</small>
        </strong>
      </div>
      <div className="flow-footer">
        <span
          className={`status-dot ${point.exported < 0.01 ? "active" : "danger"}`}
        />
        <span>
          PCC xuất: <b>{n(point.exported, 1)} kW</b>
        </span>
        <span className="ml-auto">
          {sim.config.zeroExport ? "Zero-Export bật" : "Zero-Export tắt"}
        </span>
      </div>
    </div>
  );
}
export function SourceMix({ sim }: { sim: Simulation }) {
  const t = sim.optimized.totals;
  const values = [
    { label: "Điện lưới", value: t.grid, color: BRAND_COLORS.green },
    {
      label: "PV sử dụng¹",
      value: t.pvUsed - t.exported,
      color: BRAND_COLORS.amber,
    },
    { label: "Diesel", value: t.diesel, color: BRAND_COLORS.forest },
  ];
  const total = values.reduce((s, a) => s + a.value, 0);
  let cursor = 0;
  const gradient = values
    .map((a) => {
      const start = cursor;
      cursor += total ? (a.value / total) * 100 : 0;
      return `${a.color} ${start}% ${cursor}%`;
    })
    .join(",");
  return (
    <div className="mix-content">
      <div
        className="donut"
        style={{
          background: total ? `conic-gradient(${gradient})` : "#e2e8e3",
        }}
      >
        <div>
          <span>{n(total)}</span>
          <small>kWh đầu vào</small>
        </div>
      </div>
      <div className="mix-legend">
        {values.map((a) => (
          <div key={a.label}>
            <span>
              <i style={{ background: a.color }} />
              {a.label}
            </span>
            <b>{n(total ? (a.value / total) * 100 : 0, 1)}%</b>
          </div>
        ))}
      </div>
      <p className="footnote">
        ¹ Bao gồm sạc pin; chưa trừ tổn hao. BESS không tính thêm vào tổng
        nguồn.
      </p>
    </div>
  );
}
