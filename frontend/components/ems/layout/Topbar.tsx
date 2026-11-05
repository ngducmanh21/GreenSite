import { Bell, Menu } from "lucide-react";
import { BrandMark } from "../Brand";
import { navigation, type View } from "../navigation";
export function Topbar({
  mobileMenu,
  setMobileMenu,
  view,
  navigate,
  activeAlertCount,
}: {
  mobileMenu: boolean;
  setMobileMenu: (value: boolean) => void;
  view: View;
  navigate: (view: View) => void;
  activeAlertCount: number;
}) {
  return (
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
          aria-label={`Mở cảnh báo, ${activeAlertCount} chưa xác nhận`}
          onClick={() => navigate("alerts")}
        >
          <Bell size={19} />
          {activeAlertCount > 0 && <i />}
        </button>
        <span className="top-avatar">
          <BrandMark />
        </span>
      </div>
    </header>
  );
}
