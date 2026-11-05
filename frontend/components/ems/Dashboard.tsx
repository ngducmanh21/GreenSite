"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Bell,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Download,
  FileBarChart2,
  Fuel,
  Gauge,
  LayoutDashboard,
  Leaf,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  UtilityPole,
  X,
  Zap,
} from "lucide-react";
import {
  defaultConfig,
  FACTORS,
  formatMoney as money,
  formatNumber as n,
  parseConfig,
  reportCSV,
  simulate,
  SITES,
  type Config,
  type Simulation,
} from "@/lib/ems";
import { Assistant } from "./Assistant";
import { BrandArt, BrandMark } from "./Brand";
import { EnergyChart, EnergyFlow, SourceMix } from "./Charts";
type View =
  "overview" | "scenarios" | "equipment" | "alerts" | "reports" | "assistant";
const navigation = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "scenarios", label: "Kịch bản năng lượng", icon: SlidersHorizontal },
  { id: "equipment", label: "Nguồn & thiết bị", icon: UtilityPole },
  { id: "alerts", label: "Cảnh báo", icon: Bell },
  { id: "reports", label: "Báo cáo & phát thải", icon: FileBarChart2 },
  { id: "assistant", label: "Trợ lý AI", icon: Sparkles },
] as const;
const viewTitles: Record<View, [string, string]> = {
  overview: [
    "Một góc nhìn. Toàn bộ năng lượng.",
    "Theo dõi nguồn điện, hiệu quả vận hành và dấu chân carbon của công trường.",
  ],
  scenarios: [
    "Thử phương án trước khi vận hành.",
    "Điều chỉnh nguồn và chính sách để so sánh trên cùng nhu cầu năng lượng.",
  ],
  equipment: [
    "Hiểu từng nguồn năng lượng.",
    "Cấu hình thiết bị trong mô hình và yêu cầu kết nối cho giai đoạn pilot.",
  ],
  alerts: [
    "Nhận diện sớm. Xử lý đúng chỗ.",
    "Các sự kiện được tính từ kịch bản 24 giờ, không phải cảnh báo thiết bị thực.",
  ],
  reports: [
    "Hiệu quả có số liệu đi cùng.",
    "Theo dõi năng lượng, chi phí và phát thải với giả định minh bạch.",
  ],
  assistant: [
    "Có thêm một góc nhìn từ dữ liệu.",
    "Trao đổi với trợ lý về kết quả và các phương án năng lượng của bạn.",
  ],
};
function Panel({
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
function download(sim: Simulation) {
  const url = URL.createObjectURL(
    new Blob([reportCSV(sim)], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `GreenSite-${sim.site.id}-${sim.date}-simulation.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Toggle({
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
function Slider({
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
export default function Dashboard() {
  const [siteId, setSiteId] = useState(SITES[0].id);
  const site = SITES.find((s) => s.id === siteId)!;
  const [config, setConfig] = useState<Config>(defaultConfig(SITES[0]));
  const [view, setView] = useState<View>("overview");
  const [index, setIndex] = useState(52);
  const [playing, setPlaying] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const sim = useMemo(() => simulate(site, config), [site, config]);
  const t = sim.optimized.totals,
    point = sim.optimized.points[index];
  const activeAlerts = sim.alerts.filter(
    (a) => a.severity !== "info" && !acknowledged.includes(a.id),
  );
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`greensite:v1:${SITES[0].id}`);
      if (stored) {
        setConfig(parseConfig(JSON.parse(stored)));
        setSaved(true);
      }
    } catch {
      setToast("Không đọc được cấu hình đã lưu. Đang dùng cấu hình mẫu.");
    }
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setIndex((i) => {
          if (i >= 95) return 0;
          return i + 1;
        }),
      700,
    );
    return () => clearInterval(timer);
  }, [playing]);
  function selectSite(id: string) {
    const next = SITES.find((s) => s.id === id)!;
    let nextConfig = defaultConfig(next),
      wasSaved = false;
    try {
      const stored = localStorage.getItem(`greensite:v1:${id}`);
      if (stored) {
        nextConfig = parseConfig(JSON.parse(stored));
        wasSaved = true;
      }
    } catch {
      setToast("Không đọc được cấu hình đã lưu. Đang dùng cấu hình mẫu.");
    }
    setSiteId(id);
    setConfig(nextConfig);
    setSaved(wasSaved);
    setAcknowledged([]);
    setPlaying(false);
  }
  function change<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
    setSaved(false);
    setAcknowledged([]);
  }
  function navigate(next: View) {
    setView(next);
    setMobileMenu(false);
  }
  function save() {
    try {
      localStorage.setItem(`greensite:v1:${siteId}`, JSON.stringify(config));
      setSaved(true);
      setToast("Đã lưu kịch bản trên trình duyệt này.");
    } catch {
      setToast(
        "Trình duyệt không cho phép lưu cấu hình. Bạn vẫn có thể xuất CSV.",
      );
    }
  }
  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        id="primary-sidebar"
        className={`sidebar ${mobileMenu ? "open" : ""}`}
      >
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <BrandMark />
          <span>
            GreenSite<span className="brand-suffix">EMS</span>
          </span>
        </a>
        <div className="workspace-label">KHÔNG GIAN LÀM VIỆC</div>
        <div className="workspace-card">
          <span className="workspace-avatar">
            <BrandMark />
          </span>
          <div>
            <strong>Green Construction</strong>
            <small>Không gian mô phỏng</small>
          </div>
          <span className="demo-dot" />
        </div>
        <div className="nav-label">ĐIỀU HÀNH CÔNG TRƯỜNG</div>
        <nav aria-label="Điều hướng chính">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "selected" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "alerts" && activeAlerts.length > 0 && (
                <b className="nav-count">{activeAlerts.length}</b>
              )}
              {id === "assistant" && <span className="ai-tag">AI</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="edge-card">
            <span className="edge-icon">
              <Activity size={18} />
            </span>
            <strong>Thiết kế cho công trường.</strong>
            <p>
              Mô phỏng trên cloud.
              <br />
              Điều khiển tại edge trong giai đoạn pilot.
            </p>
            <button onClick={() => navigate("equipment")}>
              Xem kiến trúc kết nối <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="sidebar-foot">
            <span className="user-avatar">GS</span>
            <div>
              <b>Chế độ trải nghiệm</b>
              <small>Không kết nối phần cứng</small>
            </div>
            <CircleHelp size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Mở menu"
              aria-expanded={mobileMenu}
              aria-controls="primary-sidebar"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Không gian làm việc</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{navigation.find((v) => v.id === view)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="simulation-pill">
              <span />
              Dữ liệu mô phỏng
            </span>
            <button
              className="notification-button"
              aria-label={`Mở cảnh báo, ${activeAlerts.length} chưa xác nhận`}
              onClick={() => navigate("alerts")}
            >
              <Bell size={19} />
              {activeAlerts.length > 0 && <i />}
            </button>
            <span className="top-avatar">
              <BrandMark />
            </span>
          </div>
        </header>
        <main className="main-content">
          <div className="page-intro">
            <div>
              <span className="eyebrow">GREENSITE ENERGY MANAGEMENT</span>
              <h1>{viewTitles[view][0]}</h1>
              <p>{viewTitles[view][1]}</p>
            </div>
            <button
              className="button secondary export-top"
              onClick={() => {
                download(sim);
                setToast("Đã xuất báo cáo CSV kèm cấu hình và hệ số mô phỏng.");
              }}
            >
              <Download size={16} />
              Xuất báo cáo
            </button>
          </div>
          <div className="site-toolbar">
            <div className="site-select-wrap">
              <Building2 size={18} />
              <label className="sr-only" htmlFor="site-select">
                Chọn công trường
              </label>
              <select
                id="site-select"
                value={siteId}
                onChange={(e) => selectSite(e.target.value)}
              >
                {SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
              <span className="site-location">{site.location}</span>
            </div>
            <div className="period-label">
              <span className="calendar-icon">05</span>05 tháng 11, 2026
              <span className="period-divider" />
              24 giờ · bước 15 phút
            </div>
          </div>
          {view === "overview" && (
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
                        aria-label={
                          playing ? "Tạm dừng mô phỏng" : "Phát lại mô phỏng"
                        }
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
                    <button
                      className="text-button"
                      onClick={() => navigate("alerts")}
                    >
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
                    Hiểu cách sử dụng pin, lý do hạn chế PV và cơ hội tối ưu chi
                    phí.
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
                      {SITES.map((s) => (
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
                            <span className="status-chip neutral">
                              Mô phỏng
                            </span>
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
                ¹ Theo dõi nguồn PV sạc vào pin; không tính điện sạc từ lưới là
                tái tạo. Mọi số liệu trên trang là kết quả mô phỏng, không phải
                dữ liệu vận hành thực.
              </p>
            </>
          )}
          {view === "scenarios" && (
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
                          change(
                            "strategy",
                            e.target.value as Config["strategy"],
                          )
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
                      Thấp điểm 22–06h; cao điểm 09:30–11:30 và 17–20h. Chỉ là
                      lịch mẫu, không phải biểu giá điện hiện hành.
                    </p>
                  </details>
                  <div className="control-actions">
                    <button className="button primary" onClick={save}>
                      {saved ? <Check size={16} /> : <Save size={16} />}
                      {saved ? "Đã lưu trên máy" : "Lưu kịch bản"}
                    </button>
                    <button
                      className="button secondary icon-only"
                      aria-label="Khôi phục cấu hình mẫu"
                      onClick={() => {
                        setConfig(defaultConfig(site));
                        setSaved(false);
                        setAcknowledged([]);
                        setToast(
                          "Đã khôi phục cấu hình mẫu. Bấm Lưu nếu muốn ghi đè bản đã lưu.",
                        );
                      }}
                    >
                      <RotateCcw size={17} />
                    </button>
                  </div>
                </div>
              </section>
              <div className="scenario-results">
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
                      Tối ưu theo quy tắc, chưa bảo đảm nghiệm tối ưu toàn cục.
                      Baseline có cùng PV và tổng nhu cầu, không điều phối
                      pin/dịch tải. Hai phương án bắt đầu ở SOC dự phòng; tồn
                      pin cuối ngày không được quy đổi thành khoản tiết kiệm.
                      Chưa tính CAPEX, phí công suất hay quá độ thiết bị.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {view === "equipment" && (
            <>
              <div className="connection-banner">
                <span className="icon-box green">
                  <Activity size={22} />
                </span>
                <div>
                  <h2>Chế độ mô phỏng độc lập</h2>
                  <p>
                    Chưa có gateway kết nối. Các thông số dưới đây lấy từ kịch
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
                      <BrandArt
                        asset={d.asset}
                        className="device-illustration"
                      />
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
          )}
          {view === "alerts" && (
            <>
              <div className="alert-mascot-banner">
                <BrandArt asset="mascot-alert" className="alert-mascot-art" />
                <div>
                  <span className="eyebrow">CÙNG GREENSITE THEO DÕI</span>
                  <h2>Kiểm tra một chút. An tâm thêm nhiều.</h2>
                  <p>
                    Cùng xem các điểm cần chú ý trong kịch bản. Xác nhận đã đọc
                    để theo dõi công việc; mọi số liệu vẫn là mô phỏng.
                  </p>
                </div>
              </div>
              <Panel
                title="Nhật ký kịch bản"
                subtitle="Xác nhận chỉ đánh dấu đã đọc trong phiên này, không thay đổi mô phỏng"
                action={
                  <span className="tag">{activeAlerts.length} cần xem</span>
                }
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
                        onClick={() =>
                          setAcknowledged((aIds) => [...aIds, a.id])
                        }
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
          )}
          {view === "reports" && (
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
                    onClick={() => window.print()}
                  >
                    <FileBarChart2 size={16} />
                    In / Lưu PDF
                  </button>
                  <button
                    className="button primary"
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
                    Chênh lệch với baseline mô phỏng không phải tín chỉ carbon,
                    không phải chứng nhận ESG. Pin không được coi là nguồn phát
                    điện mới.
                  </p>
                </Panel>
                <Panel
                  title="Giả định & khả năng truy xuất"
                  subtitle="Thông tin được đính kèm khi xuất CSV"
                >
                  <div className="assumptions-list">
                    <p>
                      <b>Điện lưới:</b> {FACTORS.grid} kg CO₂e/kWh (giả định
                      demo).
                    </p>
                    <p>
                      <b>Diesel:</b> {FACTORS.diesel} kg CO₂e/lít; tiêu hao{" "}
                      {FACTORS.dieselLitersPerKWh} lít/kWh (giả định demo).
                    </p>
                    <p>
                      <b>Hao mòn pin:</b> {FACTORS.batteryWear} ₫/kWh xả; hiệu
                      suất mỗi chiều 95%.
                    </p>
                    <p>
                      <b>Dữ liệu:</b> 100% giả lập, không có số đo hiện trường.
                    </p>
                    <p>
                      <b>Chưa tính:</b> CAPEX, thuế, phí công suất, quá độ và
                      thời gian khởi động diesel.
                    </p>
                    <p>
                      <b>Tồn pin:</b> {n(t.initialStored, 1)} →{" "}
                      {n(t.finalStored, 1)} kWh; không ghi có giá trị tồn cuối
                      ngày.
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
                    Thời tiết{" "}
                    <b>{config.weather === "sunny" ? "Nắng" : "Nhiều mây"}</b>
                  </span>
                  <span>
                    Chiến lược{" "}
                    <b>
                      {config.strategy === "economic"
                        ? "Biểu giá"
                        : "Tự dùng PV"}
                    </b>
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
                      {config.offPeakRate} / {config.normalRate} /{" "}
                      {config.peakRate} ₫/kWh
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
                  Cần thay thế hệ số demo bằng nguồn phù hợp năm, địa lý và ranh
                  giới kiểm kê trước khi sử dụng trong hồ sơ thực tế. Báo cáo
                  hiện tại phục vụ đánh giá mô hình.
                </p>
              </div>
            </>
          )}
          {view === "assistant" && (
            <Assistant key={`${siteId}-${JSON.stringify(config)}`} sim={sim} />
          )}
          <footer className="app-footer">
            <span>
              GreenSite EMS <span>·</span> Năng lượng cho một tương lai xanh.
            </span>
            <span>
              Local MVP <span>·</span> Mô phỏng 1.0
            </span>
          </footer>
        </main>
      </div>
      {view !== "assistant" && !mobileMenu && (
        <button
          className="assistant-launcher"
          onClick={() => navigate("assistant")}
          aria-label="Mở trợ lý GreenSite"
        >
          <span className="mascot-avatar">
            <BrandArt asset="mascot-face" />
          </span>
          <span>
            <strong>Trợ lý GreenSite</strong>
            <small>Cùng bạn hiểu nguồn năng lượng</small>
          </span>
          <ArrowUpRight size={17} className="assistant-launcher-arrow" />
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <BrandArt asset="mascot-celebrate" className="toast-mascot" />
          {toast}
          <button aria-label="Đóng thông báo" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Metric({
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
function Comparison({ sim }: { sim: Simulation }) {
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
      title="So sánh hai phương án"
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
