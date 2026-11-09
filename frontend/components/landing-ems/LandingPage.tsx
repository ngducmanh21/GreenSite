"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  Cpu,
  FileChartColumnIncreasing,
  Fuel,
  Gauge,
  Leaf,
  Menu,
  Play,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UtilityPole,
  X,
  Zap,
} from "lucide-react";
import { BrandArt, BrandMark } from "@/components/ems/Brand";
import "@/app/landing.css";

type Mode = "sun" | "peak" | "outage";
const modes: Record<
  Mode,
  {
    label: string;
    caption: string;
    grid: string;
    pv: string;
    battery: string;
    diesel: string;
    className: string;
  }
> = {
  sun: {
    label: "Ngày nắng",
    caption: "PV ưu tiên cấp tải.",
    grid: "Hỗ trợ tải",
    pv: "Ưu tiên cấp tải",
    battery: "Sạc từ PV dư",
    diesel: "Dự phòng",
    className: "sun",
  },
  peak: {
    label: "Giờ cao điểm",
    caption: "Dịch tải, hỗ trợ từ pin.",
    grid: "Giảm nhập",
    pv: "Theo bức xạ",
    battery: "Hỗ trợ tải",
    diesel: "Dự phòng",
    className: "peak",
  },
  outage: {
    label: "Mất lưới",
    caption: "Ưu tiên tải thiết yếu.",
    grid: "Gián đoạn",
    pv: "Theo bức xạ",
    battery: "Cấp tải",
    diesel: "Khẩn cấp",
    className: "outage",
  },
};
const navItems = [
  { href: "#goc-nhin", label: "Tổng quan" },
  { href: "#kien-truc", label: "Kiến trúc" },
  { href: "#quy-trinh", label: "Quy trình" },
  { href: "#bao-cao", label: "Báo cáo" },
  { href: "#faq", label: "FAQ" },
];

type WireName = "grid" | "solar" | "battery" | "diesel";
type Wire = {
  id: WireName;
  d: string;
  start: [number, number];
  end: [number, number];
};
const wirePins: Record<WireName, [number, number]> = {
  grid: [143, 326],
  solar: [451, 180],
  battery: [642, 309],
  diesel: [380, 458],
};
const wireColors: Record<WireName, string> = {
  grid: "#8ce5a0",
  solar: "#f2b544",
  battery: "#b8e65c",
  diesel: "#81c8b6",
};
function Stage({ mode }: { mode: Mode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRefs = useRef<Record<WireName, HTMLDivElement | null>>({
    grid: null,
    solar: null,
    battery: null,
    diesel: null,
  });
  const [wireLayout, setWireLayout] = useState<{
    width: number;
    height: number;
    wires: Wire[];
  }>({ width: 840, height: 650, wires: [] });
  useEffect(() => {
    const stage = stageRef.current,
      svg = svgRef.current;
    if (!stage || !svg) return;
    const update = () => {
      const stageBox = stage.getBoundingClientRect();
      const svgBox = svg.getBoundingClientRect();
      const scale = Math.min(svgBox.width / 840, svgBox.height / 650);
      const offsetX =
        svgBox.left - stageBox.left + (svgBox.width - 840 * scale) / 2;
      const offsetY =
        svgBox.top - stageBox.top + (svgBox.height - 650 * scale) / 2;
      const next: Wire[] = [];
      for (const id of ["grid", "solar", "battery", "diesel"] as WireName[]) {
        const card = cardRefs.current[id];
        if (!card) continue;
        const box = card.getBoundingClientRect();
        const end: [number, number] = [
          offsetX + wirePins[id][0] * scale,
          offsetY + wirePins[id][1] * scale,
        ];
        const start: [number, number] =
          id === "grid"
            ? [
                box.right - stageBox.left,
                box.top + box.height / 2 - stageBox.top,
              ]
            : id === "solar"
              ? [
                  box.left + box.width / 2 - stageBox.left,
                  box.bottom - stageBox.top,
                ]
              : id === "battery"
                ? [
                    box.left + box.width / 2 - stageBox.left,
                    box.top - stageBox.top,
                  ]
                : [
                    box.left + box.width / 2 - stageBox.left,
                    box.top - stageBox.top,
                  ];
        const [x1, y1] = start,
          [x2, y2] = end;
        const d =
          id === "grid"
            ? `M ${x1} ${y1} C ${x1 + 48} ${y1}, ${x2 - 48} ${y2}, ${x2} ${y2}`
            : id === "solar"
              ? `M ${x1} ${y1} C ${x1} ${y1 + 48}, ${x2} ${y2 - 48}, ${x2} ${y2}`
              : id === "battery"
                ? `M ${x1} ${y1} C ${x1} ${y1 - 55}, ${x2 + 45} ${y2 + 55}, ${x2} ${y2}`
                : `M ${x1} ${y1} C ${x1} ${y1 - 52}, ${x2 - 48} ${y2 + 48}, ${x2} ${y2}`;
        next.push({ id, d, start, end });
      }
      setWireLayout({
        width: stageBox.width,
        height: stageBox.height,
        wires: next,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    observer.observe(svg);
    for (const card of Object.values(cardRefs.current))
      if (card) observer.observe(card);
    window.addEventListener("resize", update);
    const frame = requestAnimationFrame(update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div
      ref={stageRef}
      className={`gs-stage gs-stage--${modes[mode].className}`}
      aria-label="Minh họa nguồn điện lưới, điện mặt trời, pin và diesel kết nối tới công trường"
    >
      <div className="gs-stage-halo" />
      <svg
        ref={svgRef}
        className="gs-stage-svg"
        viewBox="0 0 840 650"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="stageTop"
            x1="166"
            y1="115"
            x2="728"
            y2="550"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#1c3e37" />
            <stop offset=".53" stopColor="#102925" />
            <stop offset="1" stopColor="#0c201e" />
          </linearGradient>
          <linearGradient
            id="stageEdge"
            x1="400"
            y1="480"
            x2="400"
            y2="590"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#264c40" />
            <stop offset="1" stopColor="#071512" />
          </linearGradient>
          <linearGradient
            id="energyLine"
            x1="110"
            y1="250"
            x2="710"
            y2="530"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#82d98b" />
            <stop offset=".5" stopColor="#b8e65c" />
            <stop offset="1" stopColor="#f2b544" />
          </linearGradient>
          <radialGradient id="siteGlow">
            <stop stopColor="#9be7ac" stopOpacity=".35" />
            <stop offset="1" stopColor="#9be7ac" stopOpacity="0" />
          </radialGradient>
          <pattern
            id="isoGrid"
            width="52"
            height="32"
            patternUnits="userSpaceOnUse"
            patternTransform="matrix(1 .42 -1 .42 300 0)"
          >
            <path
              d="M52 0H0V32"
              stroke="#b3ffd0"
              strokeOpacity=".12"
              strokeWidth="1"
            />
          </pattern>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="pinGlow">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <g
          className="gs-circuit-bg"
          stroke="#79c99b"
          strokeOpacity=".22"
          strokeWidth="1.2"
        >
          <path d="M38 146h112l35 26h96M602 116h86l28-23h80M61 486h147l30 32h115M578 542h87l38-36h112" />
          <path
            d="M58 257h76l28 24h72M630 255h109l32 28h47"
            strokeDasharray="3 7"
          />
          <circle cx="150" cy="146" r="3" fill="#8bd48f" />
          <circle cx="688" cy="116" r="3" fill="#8bd48f" />
          <circle cx="208" cy="486" r="3" fill="#8bd48f" />
          <circle cx="739" cy="255" r="3" fill="#8bd48f" />
        </g>
        <ellipse
          cx="436"
          cy="445"
          rx="310"
          ry="145"
          fill="#5ad983"
          opacity=".12"
          filter="url(#softGlow)"
        />
        <path
          d="M111 376 424 206 738 376 424 555Z"
          fill="#061512"
          stroke="#345b49"
          strokeOpacity=".75"
          strokeWidth="2"
        />
        <path
          d="M111 346 424 176 738 346 424 525Z"
          fill="url(#stageEdge)"
          stroke="#477664"
          strokeOpacity=".65"
          strokeWidth="1.5"
        />
        <path
          d="M111 324 424 154 738 324 424 503Z"
          fill="url(#stageTop)"
          stroke="#78b68a"
          strokeOpacity=".8"
          strokeWidth="2"
        />
        <path
          d="M111 324 424 154 738 324 424 503Z"
          fill="url(#isoGrid)"
          opacity=".7"
        />
        <path
          d="M111 324 424 503M738 324 424 503"
          stroke="#9eeabc"
          strokeOpacity=".16"
        />
        <path d="M424 154v349" stroke="#9eeabc" strokeOpacity=".08" />
        <ellipse
          cx="424"
          cy="330"
          rx="175"
          ry="86"
          stroke="#a0e7b2"
          strokeOpacity=".18"
          strokeDasharray="4 7"
        />
        <ellipse
          cx="424"
          cy="330"
          rx="117"
          ry="58"
          stroke="#a0e7b2"
          strokeOpacity=".15"
        />
        <path
          className="gs-flow gs-flow-grid"
          d="M146 325 289 249 410 317"
          stroke="url(#energyLine)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="8 14"
        />
        <path
          className="gs-flow gs-flow-solar"
          d="M450 179 505 217 435 304"
          stroke="#f2b544"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="8 14"
        />
        <path
          className="gs-flow gs-flow-battery"
          d="M645 307 546 358 442 325"
          stroke="#b8e65c"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="8 14"
        />
        <path
          className="gs-flow gs-flow-diesel"
          d="M380 461 355 408 408 344"
          stroke="#73bcae"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="8 14"
        />
        <ellipse cx="424" cy="321" rx="157" ry="94" fill="url(#siteGlow)" />
        <g className="gs-plant" strokeLinejoin="round">
          <path
            d="M326 317 396 280 458 316 390 354Z"
            fill="#275041"
            stroke="#8bd8a2"
            strokeWidth="1.5"
          />
          <path d="M390 354v36l-64-37v-36" fill="#14372d" stroke="#5a9b76" />
          <path
            d="M390 354 458 316v37l-68 37"
            fill="#1d4938"
            stroke="#6cb389"
          />
          <path
            d="M353 310v-63l36-19 37 21v62l-37 20Z"
            fill="#2e6550"
            stroke="#b6efbc"
            strokeWidth="1.5"
          />
          <path
            d="M353 247 389 228 426 249 389 269Z"
            fill="#75b98b"
            stroke="#d7ffca"
          />
          <path d="M389 269v62M353 247v63M426 249v62" stroke="#a5e2ae" />
          <path
            d="M370 280v15m17-25v15m18-23v15"
            stroke="#b9ecc1"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path d="M446 285v-84l16-8v91" stroke="#95dca0" strokeWidth="4" />
          <path
            d="M418 202h61M452 210l-30 25M452 210l25 25"
            stroke="#95dca0"
            strokeWidth="3"
          />
          <path
            d="M462 193v-15m-14 20-10-12"
            stroke="#95dca0"
            strokeWidth="2"
          />
          <path
            d="M483 331 533 304l47 25-50 27Z"
            fill="#315e4b"
            stroke="#9ce4a6"
          />
          <path
            d="M530 356v24l-47-27v-22m47 25 50-27v24l-50 27"
            fill="#1c4237"
            stroke="#79be91"
          />
          <path
            d="M498 324l46 24m-31-32 45 24"
            stroke="#e5bd6d"
            strokeWidth="3"
          />
          <path
            d="M289 356 335 332l42 23-45 25Z"
            fill="#3a6753"
            stroke="#a2d9a8"
          />
          <path
            d="M332 380v26l-43-25v-25m43 24 45-25v25l-45 26"
            fill="#1c4033"
            stroke="#8fcca0"
          />
        </g>
        <g className="gs-stage-pins" fill="#c5f4ad">
          <circle cx="143" cy="326" r="5" />
          <circle cx="451" cy="180" r="5" />
          <circle cx="642" cy="309" r="5" />
          <circle cx="380" cy="458" r="5" />
        </g>
        <g className="gs-stage-pin-glow" fill="#b8e65c" filter="url(#pinGlow)">
          <circle cx="143" cy="326" r="10" />
          <circle cx="451" cy="180" r="10" />
          <circle cx="642" cy="309" r="10" />
          <circle cx="380" cy="458" r="10" />
        </g>
      </svg>
      <svg
        className="gs-card-connectors"
        viewBox={`0 0 ${wireLayout.width} ${wireLayout.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {wireLayout.wires.map((wire) => (
          <g key={wire.id}>
            <path
              d={wire.d}
              stroke={wireColors[wire.id]}
              strokeOpacity=".31"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              className={`gs-wire-line gs-wire-line--${wire.id}`}
              d={wire.d}
              stroke={wireColors[wire.id]}
              strokeWidth="3"
              fill="none"
              strokeDasharray="7 12"
              strokeLinecap="round"
            />
            <circle
              cx={wire.start[0]}
              cy={wire.start[1]}
              r="3"
              fill={wireColors[wire.id]}
            />
            <circle
              cx={wire.end[0]}
              cy={wire.end[1]}
              r="3"
              fill={wireColors[wire.id]}
            />
          </g>
        ))}
      </svg>
      <div className="gs-fox-spotlight">
        <div className="gs-fox-glow" />
        <BrandArt
          asset="mascot-tablet"
          className="gs-fox-art"
          label="Cáo GreenSite cầm máy tính bảng"
        />
      </div>
      <div
        ref={(node) => {
          cardRefs.current.grid = node;
        }}
        className="gs-stage-card gs-stage-card--grid"
      >
        <span className="gs-stage-card-icon">
          <UtilityPole size={17} />
        </span>
        <span>
          <strong>ĐIỆN LƯỚI</strong>
        </span>
      </div>
      <div
        ref={(node) => {
          cardRefs.current.solar = node;
        }}
        className="gs-stage-card gs-stage-card--solar"
      >
        <span className="gs-stage-card-icon amber">
          <Sun size={18} />
        </span>
        <span>
          <strong>ĐIỆN MẶT TRỜI</strong>
        </span>
      </div>
      <div
        ref={(node) => {
          cardRefs.current.battery = node;
        }}
        className="gs-stage-card gs-stage-card--battery"
      >
        <span className="gs-stage-card-icon lime">
          <BatteryCharging size={18} />
        </span>
        <span>
          <strong>BESS</strong>
        </span>
      </div>
      <div
        ref={(node) => {
          cardRefs.current.diesel = node;
        }}
        className="gs-stage-card gs-stage-card--diesel"
      >
        <span className="gs-stage-card-icon teal">
          <Fuel size={17} />
        </span>
        <span>
          <strong>DIESEL</strong>
        </span>
      </div>
      <div className="gs-stage-chip">
        <ShieldCheck size={15} /> ZERO-EXPORT · MÔ PHỎNG
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: React.ReactNode;
  text: string;
}) {
  return (
    <div className="gs-section-heading">
      <span className="gs-eyebrow">
        <span /> {eyebrow}
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export default function LandingPage() {
  const [mode, setMode] = useState<Mode>("sun");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("gs-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    document
      .querySelectorAll(".gs-reveal")
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return (
    <div className="gs-landing">
      <div className="gs-ambient gs-ambient-one" />
      <div className="gs-ambient gs-ambient-two" />
      <header className="gs-header">
        <div className="gs-nav-shell">
          <Link
            className="gs-logo"
            href="/"
            aria-label="GreenSite EMS, trang chủ"
          >
            <span className="gs-logo-mark">
              <BrandMark />
            </span>
            <span>
              GreenSite <em>EMS</em>
            </span>
          </Link>
          <nav
            className={menuOpen ? "gs-nav gs-nav-open" : "gs-nav"}
            aria-label="Điều hướng landing page"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="gs-header-actions">
            <Link className="gs-header-cta" href="/demo">
              Mở bản mô phỏng <ArrowUpRight size={16} />
            </Link>
            <button
              className="gs-menu-toggle"
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>
      <main>
        <section className="gs-hero" id="dau-trang">
          <div className="gs-hero-grid" />
          <div className="gs-hero-inner">
            <div className="gs-hero-copy">
              <span className="gs-kicker">
                <span className="gs-pulse" /> NĂNG LƯỢNG CHO CÔNG TRƯỜNG XANH
              </span>
              <h1>
                Điều phối điện cho
                <br />
                <span>công trường xanh.</span>
              </h1>
              <p className="gs-hero-lead">
                Thử kết hợp điện lưới, mặt trời, pin và diesel trước khi vận
                hành.
              </p>
              <div className="gs-hero-actions">
                <Link href="/demo" className="gs-button gs-button-primary">
                  Xem demo <ArrowRight size={18} />
                </Link>
                <a href="#kien-truc" className="gs-button gs-button-ghost">
                  Tìm hiểu thêm <ArrowDownRight size={18} />
                </a>
              </div>
              <div className="gs-mobile-fox">
                <BrandArt
                  asset="mascot-face"
                  className="gs-mobile-fox-art"
                  label="Cáo GreenSite"
                />
              </div>
            </div>
            <div className="gs-hero-visual">
              <Stage mode={mode} />
            </div>
          </div>
          <div className="gs-mode-switch" aria-label="Chọn trạng thái minh họa">
            <div className="gs-mode-buttons">
              {(Object.keys(modes) as Mode[]).map((key) => (
                <button
                  key={key}
                  className={mode === key ? "active" : ""}
                  aria-pressed={mode === key}
                  onClick={() => setMode(key)}
                >
                  {key === "sun" ? (
                    <Sun size={15} />
                  ) : key === "peak" ? (
                    <Zap size={15} />
                  ) : (
                    <UtilityPole size={15} />
                  )}{" "}
                  {modes[key].label}
                </button>
              ))}
            </div>
            <p>
              <span>ĐANG XEM</span> {modes[mode].caption}
            </p>
          </div>
          <a className="gs-scroll-cue" href="#goc-nhin">
            CUỘN ĐỂ KHÁM PHÁ <ChevronDown size={15} />
          </a>
        </section>
        <section className="gs-proof" id="goc-nhin">
          <div className="gs-container">
            <div className="gs-proof-top gs-reveal">
              <span className="gs-eyebrow">
                <span /> TỪ DỮ LIỆU ĐẾN QUYẾT ĐỊNH
              </span>
              <p>
                Không chỉ xem tổng tiền điện. GreenSite đặt từng nguồn, từng
                giới hạn và từng kịch bản trên cùng một trục thời gian.
              </p>
            </div>
            <div className="gs-proof-grid">
              <div className="gs-proof-item gs-reveal">
                <strong>04</strong>
                <span>Nguồn năng lượng trong mô hình</span>
                <small>Lưới · PV · BESS · diesel</small>
              </div>
              <div className="gs-proof-item gs-reveal">
                <strong>
                  15<span>phút</span>
                </strong>
                <span>Độ dài một bước mô phỏng</span>
                <small>Quan sát biến động trong 24 giờ</small>
              </div>
              <div className="gs-proof-item gs-reveal">
                <strong>01</strong>
                <span>Báo cáo có nguồn giả định</span>
                <small>Chi phí · điện năng · CO₂e</small>
              </div>
            </div>
          </div>
        </section>
        <section className="gs-section gs-solution" id="san-pham">
          <div className="gs-container">
            <SectionHeading
              eyebrow="MỘT KHÔNG GIAN LÀM VIỆC"
              title={
                <>
                  Khi mọi nguồn điện <span>nói cùng một ngôn ngữ.</span>
                </>
              }
              text="Từ những câu hỏi vận hành thường ngày đến một phương án có thể kiểm tra lại."
            />
            <div className="gs-feature-grid">
              <article className="gs-feature-card gs-feature-large gs-reveal">
                <div className="gs-feature-icon">
                  <Gauge size={25} />
                </div>
                <span className="gs-card-index">01 / QUAN SÁT</span>
                <h3>Nhìn trọn dòng năng lượng</h3>
                <p>
                  Xem nhu cầu tải, điện mua, PV, mức pin và diesel trên cùng
                  biểu đồ 24 giờ. Mỗi thay đổi đều có ngữ cảnh về thời gian.
                </p>
                <div className="gs-mini-chart" aria-hidden="true">
                  <div className="gs-mini-chart-grid" />
                  <svg viewBox="0 0 600 160" preserveAspectRatio="none">
                    <path
                      d="M0 140C60 132 80 98 130 108s78-73 137-51 96 12 138-31 110 21 195-15"
                      fill="none"
                      stroke="#b8e65c"
                      strokeWidth="3"
                    />
                    <path
                      d="M0 145C70 140 100 120 153 125s80-53 131-40 90 34 137-4 105 16 179 18"
                      fill="none"
                      stroke="#61c8a0"
                      strokeOpacity=".55"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </article>
              <article className="gs-feature-card gs-reveal">
                <div className="gs-feature-icon amber">
                  <SlidersHorizontal size={24} />
                </div>
                <span className="gs-card-index">02 / THỬ NGHIỆM</span>
                <h3>So phương án trên cùng điều kiện</h3>
                <p>
                  Điều chỉnh PV, BESS, biểu giá, tải và sự cố lưới. Kết quả so
                  sánh không gọi phần tải chưa được phục vụ là “tiết kiệm”.
                </p>
                <div className="gs-card-bottom">
                  <span>Baseline</span>
                  <ArrowRight size={16} />
                  <b>Phương án</b>
                </div>
              </article>
              <article className="gs-feature-card gs-reveal">
                <div className="gs-feature-icon lime">
                  <ShieldCheck size={24} />
                </div>
                <span className="gs-card-index">03 / KIỂM SOÁT</span>
                <h3>Giới hạn xuất ngược rõ ràng</h3>
                <p>
                  Mô hình cho thấy khi nào PV phải hạn chế vì tải và pin không
                  thể hấp thụ. Điều khiển thực tế cần bộ điều khiển tại công
                  trường.
                </p>
                <div className="gs-card-bottom">
                  <span className="gs-status-dot" /> Zero-Export trong mô phỏng
                </div>
              </article>
            </div>
          </div>
        </section>
        <section className="gs-section gs-architecture" id="kien-truc">
          <div className="gs-container gs-arch-layout">
            <div className="gs-arch-copy gs-reveal">
              <SectionHeading
                eyebrow="KIẾN TRÚC HỆ THỐNG"
                title={
                  <>
                    Tính trên cloud.
                    <br />
                    <span>Kiểm soát tại edge.</span>
                  </>
                }
                text="Web giúp kỹ sư nhìn, phân tích và duyệt phương án. Với hệ thống thật, điều khiển cục bộ và bảo vệ điện phải ở gần thiết bị."
              />
              <Link href="/demo" className="gs-text-link">
                Khám phá dashboard <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="gs-arch-diagram gs-reveal">
              <div className="gs-arch-row">
                <span className="gs-arch-node">
                  <Radio size={22} />
                  <b>Thiết bị hiện trường</b>
                  <small>PCC · PV · BESS · máy phát</small>
                </span>
                <span className="gs-arch-connector" />
                <span className="gs-arch-node">
                  <Cpu size={22} />
                  <b>Edge controller</b>
                  <small>Liên động · an toàn · mất mạng</small>
                </span>
              </div>
              <div className="gs-arch-vertical">
                <span />
                <span />
                <span />
              </div>
              <div className="gs-arch-cloud">
                <div className="gs-cloud-icon">
                  <ChartNoAxesCombined size={25} />
                </div>
                <div>
                  <b>GreenSite EMS</b>
                  <small>
                    Mô phỏng · kế hoạch tải · báo cáo · quyền truy cập
                  </small>
                </div>
                <span className="gs-cloud-badge">WEB + API</span>
              </div>
              <p className="gs-arch-note">
                <CircleHelp size={16} /> Bản hiện tại dùng adapter giả lập. Chưa
                gửi lệnh điều khiển ra thiết bị.
              </p>
            </div>
          </div>
        </section>
        <section className="gs-section gs-workflow" id="quy-trinh">
          <div className="gs-container">
            <SectionHeading
              eyebrow="CÁCH LÀM VIỆC"
              title={
                <>
                  Một quy trình <span>đi từ đo đến chứng minh.</span>
                </>
              }
              text="Các bước phần mềm có thể thử ngay trong pilot local; kết nối thiết bị sẽ được nghiệm thu riêng."
            />
            <div className="gs-steps">
              <article className="gs-step gs-reveal">
                <div className="gs-step-number">01</div>
                <div className="gs-step-line" />
                <div className="gs-step-icon">
                  <Radio size={27} />
                </div>
                <h3>Đưa dữ liệu vào</h3>
                <p>
                  Nhập số đo theo khoảng thời gian và hóa đơn theo kỳ. Dữ liệu
                  giả lập được đánh dấu riêng để không lẫn với số đo nhập.
                </p>
              </article>
              <article className="gs-step gs-reveal">
                <div className="gs-step-number">02</div>
                <div className="gs-step-line" />
                <div className="gs-step-icon">
                  <SlidersHorizontal size={27} />
                </div>
                <h3>Lập phương án</h3>
                <p>
                  Phân nhóm tải thiết yếu và tải có thể dời lịch. Thử biểu giá,
                  PV và giới hạn lưới trước khi ra quyết định.
                </p>
              </article>
              <article className="gs-step gs-reveal">
                <div className="gs-step-number">03</div>
                <div className="gs-step-icon">
                  <FileChartColumnIncreasing size={27} />
                </div>
                <h3>Đối soát & báo cáo</h3>
                <p>
                  So kWh đo với hóa đơn cùng kỳ, ghi rõ nguồn hệ số phát thải và
                  tải CSV để kỹ sư kiểm tra tiếp.
                </p>
              </article>
            </div>
          </div>
        </section>
        <section className="gs-section gs-report" id="bao-cao">
          <div className="gs-container gs-report-layout">
            <div className="gs-report-copy gs-reveal">
              <SectionHeading
                eyebrow="BÁO CÁO CÓ THỂ KIỂM TRA"
                title={
                  <>
                    Số liệu đi kèm <span>nguồn gốc.</span>
                  </>
                }
                text="Một báo cáo có ích phải phân biệt điều đã đo, điều đã tính và điều mới chỉ là giả định."
              />
              <div className="gs-report-points">
                <p>
                  <Check size={17} /> Điện lưới nhập, PV, diesel và trạng thái
                  dữ liệu
                </p>
                <p>
                  <Check size={17} /> Chênh lệch giữa công tơ và hóa đơn cùng kỳ
                </p>
                <p>
                  <Check size={17} /> Hệ số phát thải, nguồn và thời điểm áp
                  dụng
                </p>
              </div>
              <Link href="/pilot" className="gs-text-link">
                Xem không gian pilot local <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="gs-report-preview gs-reveal">
              <div className="gs-report-toolbar">
                <span className="gs-report-logo">
                  <Leaf size={17} /> GREENSITE
                </span>
                <span>BÁO CÁO PILOT</span>
                <span className="gs-report-menu">•••</span>
              </div>
              <div className="gs-report-body">
                <div className="gs-report-title">
                  <span>Kỳ đối soát minh họa</span>
                  <b>Điện năng & chi phí</b>
                </div>
                <div className="gs-report-metrics">
                  <div>
                    <small>ĐIỆN NĂNG</small>
                    <strong>kWh</strong>
                    <span>theo số đo nhập</span>
                  </div>
                  <div>
                    <small>HÓA ĐƠN</small>
                    <strong>VNĐ</strong>
                    <span>theo chứng từ</span>
                  </div>
                  <div>
                    <small>PHÁT THẢI</small>
                    <strong>CO₂e</strong>
                    <span>theo hệ số khai báo</span>
                  </div>
                </div>
                <div className="gs-report-bars">
                  <div>
                    <span>Công tơ</span>
                    <i style={{ width: "74%" }} />
                  </div>
                  <div>
                    <span>Hóa đơn</span>
                    <i style={{ width: "69%" }} />
                  </div>
                  <div>
                    <span>Chênh lệch</span>
                    <i style={{ width: "16%" }} />
                  </div>
                </div>
                <div className="gs-report-footer">
                  <span className="gs-report-sim-dot" /> Giao diện minh họa ·
                  không phải số liệu công trường
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="gs-section gs-faq" id="faq">
          <div className="gs-container gs-faq-layout">
            <div className="gs-reveal">
              <SectionHeading
                eyebrow="HỎI NHANH"
                title={
                  <>
                    Trước khi đưa vào <span>công trường thật.</span>
                  </>
                }
                text="Ba điểm cần rõ ràng để dùng mô phỏng đúng mục đích."
              />
            </div>
            <div className="gs-faq-items gs-reveal">
              <details>
                <summary>
                  GreenSite đã điều khiển thiết bị thật chưa?
                  <ChevronDown size={19} />
                </summary>
                <p>
                  Chưa. Bản hiện tại mô phỏng 24 giờ và pilot local dùng adapter
                  giả lập. Điều khiển tại công trường cần giao thức thiết bị, sơ
                  đồ điện, liên động và nghiệm thu riêng.
                </p>
              </details>
              <details>
                <summary>
                  Zero-Export trên web có bảo đảm không phát ngược?
                  <ChevronDown size={19} />
                </summary>
                <p>
                  Không. Web có thể mô phỏng giới hạn và hiển thị kế hoạch. Bảo
                  đảm kỹ thuật cần đo tại PCC, bộ điều khiển cục bộ và kiểm tra
                  thời gian đáp ứng của hệ thiết bị.
                </p>
              </details>
              <details>
                <summary>
                  Báo cáo có chứng minh tiết kiệm 30% không?
                  <ChevronDown size={19} />
                </summary>
                <p>
                  Không có cam kết 30% khi chưa đo pilot. Báo cáo mô phỏng nêu
                  rõ giả định; báo cáo pilot đối soát số đo do người dùng nhập
                  với hóa đơn và cần kiểm tra chất lượng dữ liệu.
                </p>
              </details>
            </div>
          </div>
        </section>
        <section className="gs-final">
          <div className="gs-container gs-final-inner">
            <div className="gs-final-orbit" aria-hidden="true" />
            <span className="gs-eyebrow">
              <span /> BẮT ĐẦU TỪ MỘT KỊCH BẢN
            </span>
            <h2>
              Cho công trường một <span>góc nhìn năng lượng mới.</span>
            </h2>
            <p>
              Khám phá dòng năng lượng, thay đổi cấu hình và xem báo cáo mẫu
              ngay trên bản mô phỏng.
            </p>
            <div className="gs-final-actions">
              <Link href="/demo" className="gs-button gs-button-primary">
                Mở bản mô phỏng <ArrowRight size={19} />
              </Link>
              <Link href="/pilot" className="gs-button gs-button-ghost">
                Không gian pilot <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="gs-footer">
        <div className="gs-container gs-footer-inner">
          <Link className="gs-logo" href="/">
            <span className="gs-logo-mark">
              <BrandMark />
            </span>
            <span>
              GreenSite <em>EMS</em>
            </span>
          </Link>
          <p>Điều phối điện cho công trường.</p>
          <div>
            <a href="#dau-trang">Lên đầu trang ↑</a>
            <Link href="/demo">Bản mô phỏng</Link>
            <Link href="/pilot">Pilot</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
