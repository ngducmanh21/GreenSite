import { Activity, ArrowUpRight, CircleHelp } from "lucide-react";
import { BrandMark } from "../Brand";
import { navigation, type View } from "../navigation";
export function Sidebar({
  mobileMenu,
  view,
  navigate,
  activeAlertCount,
}: {
  mobileMenu: boolean;
  view: View;
  navigate: (view: View) => void;
  activeAlertCount: number;
}) {
  return (
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
            {id === "alerts" && activeAlertCount > 0 && (
              <b className="nav-count">{activeAlertCount}</b>
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
  );
}
