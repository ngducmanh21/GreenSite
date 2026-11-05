import { Leaf } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b border-brand-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/30">
            <Leaf className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">
            GREEN<span className="text-brand-600">SITE</span>
            <span className="text-slate-400 font-normal"> EMS</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm border border-slate-200">
          {["Vấn đề", "Cách hoạt động", "Vì sao khác", "Bảng giá"].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/\s/g, "-")}`}
              className="px-4 py-1.5 text-sm text-slate-600 hover:text-brand-700 hover:bg-brand-50 rounded-full transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">
              VI
            </span>
            <span className="px-2 py-0.5 rounded-full text-slate-500">EN</span>
          </div>
          <a
            href="#"
            className="px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 rounded-full transition-colors"
          >
            Đăng nhập
          </a>
          <a
            href="#cta"
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-full shadow-sm shadow-brand-500/30 transition-colors"
          >
            Dùng thử
          </a>
        </div>
      </div>
    </header>
  );
}