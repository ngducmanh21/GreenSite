import { formatMoney as money, formatNumber as n } from "@/lib/format";
import type { Simulation } from "@greensite/contracts";
import type { ReactNode } from "react";
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Toggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  );
}
export function Slider({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="control-slider">
      <span>
        {label}
        <strong>
          {n(value)} <small>{unit}</small>
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="range-bounds">
        <small>
          {n(min)} {unit}
        </small>
        <small>
          {n(max)} {unit}
        </small>
      </span>
    </label>
  );
}
export function Metric({
  icon,
  label,
  value,
  unit,
  detail,
  color = "green",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  detail: string;
  color?: string;
}) {
  return (
    <section className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`icon-box ${color}`}>{icon}</span>
      </div>
      <div className="metric-value">
        {value}
        <small>{unit}</small>
      </div>
      <p>{detail}</p>
    </section>
  );
}
export function Comparison({ sim }: { sim: Simulation }) {
  const b = sim.baseline.totals,
    t = sim.optimized.totals;
  const rows = [
    { label: "Chi phí vận hành", before: money(b.cost), after: money(t.cost) },
    {
      label: "Điện lưới nhập",
      before: `${n(b.grid, 1)} kWh`,
      after: `${n(t.grid, 1)} kWh`,
    },
    {
      label: "Nhiên liệu diesel",
      before: `${n(b.dieselLiters, 1)} lít`,
      after: `${n(t.dieselLiters, 1)} lít`,
    },
    {
      label: "PV bị hạn chế",
      before: `${n(b.curtailed, 1)} kWh`,
      after: `${n(t.curtailed, 1)} kWh`,
    },
    {
      label: "Điện xuất ngược",
      before: `${n(b.exported, 1)} kWh`,
      after: `${n(t.exported, 1)} kWh`,
    },
    {
      label: "Tải chưa được phục vụ",
      before: `${n(b.unserved, 1)} kWh`,
      after: `${n(t.unserved, 1)} kWh`,
    },
    {
      label: "Phát thải ước tính",
      before: `${n(b.carbon, 1)} kg CO₂e`,
      after: `${n(t.carbon, 1)} kg CO₂e`,
    },
  ];
  return (
    <Panel
      title="So sánh với baseline"
      subtitle="Cùng PV và tổng nhu cầu; baseline không điều phối pin/dịch tải"
    >
      <div className="table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Chỉ số / ngày</th>
              <th>Baseline</th>
              <th>Phương án hiện tại</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td>{r.before}</td>
                <td>{r.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
