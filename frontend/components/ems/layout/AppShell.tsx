"use client";
import type { Site } from "@greensite/contracts";
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  Download,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { BrandArt } from "../Brand";
import { viewTitles, type View } from "../navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
type Props = {
  children: ReactNode;
  view: View;
  onNavigate: (view: View) => void;
  sites: Site[];
  site: Site;
  siteId: string;
  selectSite: (id: string) => void;
  activeAlertCount: number;
  toast: string;
  setToast: (message: string) => void;
  busy: boolean;
  onExport: () => void;
  simulationDate: string;
};
export function AppShell({
  children,
  view,
  onNavigate,
  sites,
  site,
  siteId,
  selectSite,
  activeAlertCount,
  toast,
  setToast,
  busy,
  onExport,
  simulationDate,
}: Props) {
  const [mobileMenu, setMobileMenu] = useState(false);
  function navigate(view: View) {
    onNavigate(view);
    setMobileMenu(false);
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
      <Sidebar
        mobileMenu={mobileMenu}
        view={view}
        navigate={navigate}
        activeAlertCount={activeAlertCount}
      />
      <div className="main-shell">
        <Topbar
          mobileMenu={mobileMenu}
          setMobileMenu={setMobileMenu}
          view={view}
          navigate={navigate}
          activeAlertCount={activeAlertCount}
        />
        <main className="main-content">
          <div className="page-intro">
            <div>
              <span className="eyebrow">GREENSITE ENERGY MANAGEMENT</span>
              <h1>{viewTitles[view][0]}</h1>
              <p>{viewTitles[view][1]}</p>
            </div>
            <button
              className="button secondary export-top"
              disabled={busy}
              onClick={onExport}
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
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
              <span className="site-location">{site.location}</span>
            </div>
            <div className="period-label">
              <span className="calendar-icon">{simulationDate.slice(-2)}</span>
              {new Intl.DateTimeFormat("vi-VN", {
                dateStyle: "long",
                timeZone: "Asia/Ho_Chi_Minh",
              }).format(new Date(`${simulationDate}T00:00:00+07:00`))}
              <span className="period-divider" />
              24 giờ · bước 15 phút
            </div>
          </div>
          {children}{" "}
          <footer className="app-footer">
            <span>
              GreenSite EMS <span>·</span> Năng lượng cho một tương lai xanh.
            </span>
            <span>
              GreenSite EMS <span>·</span> Mô phỏng 1.0
            </span>
          </footer>
        </main>
      </div>{" "}
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
