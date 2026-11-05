import { Leaf } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg">
                GREEN<span className="text-brand-600">SITE</span>
                <span className="text-slate-400 font-normal"> EMS</span>
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md">
              Công cụ SaaS phân tích carbon xây dựng cho thị trường Việt Nam.
              Giúp nhà thầu nhỏ ra hồ sơ thầu có phần carbon trong vài phút.
            </p>
            <p className="mt-4 text-xs text-slate-400 italic max-w-md">
              Disclaimer: GreenSite là công cụ hỗ trợ tham khảo, không thay thế
              chứng chỉ/kiểm toán carbon chính thức.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-slate-900 mb-3">
              Sản phẩm
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <a href="#cách-hoạt-động" className="hover:text-brand-700">
                  Cách hoạt động
                </a>
              </li>
              <li>
                <a href="#bảng-giá" className="hover:text-brand-700">
                  Bảng giá
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-700">
                  Tài liệu API
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-slate-900 mb-3">
              Công ty
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <a href="#" className="hover:text-brand-700">
                  Về chúng tôi
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-700">
                  Liên hệ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-700">
                  Điều khoản
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <span>© 2026 GreenSite EMS · MVP Development</span>
          <span>Made in Vietnam 🇻🇳</span>
        </div>
      </div>
    </footer>
  );
}