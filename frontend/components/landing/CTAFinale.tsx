import { ArrowUpRight } from "lucide-react";

export default function CTAFinale() {
  return (
    <section id="cta" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-12 md:p-16 text-center">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-brand-300/40 blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              Đừng để thầu tiếp theo{" "}
              <span className="font-serif-italic text-brand-100">
                thiếu mục carbon
              </span>
            </h2>
            <p className="mt-5 max-w-xl mx-auto text-brand-50 leading-relaxed">
              Tải 1 file Excel BOQ bất kỳ — nhận phân tích carbon đầy đủ kèm
              nguồn trích dẫn trong vài phút. Miễn phí cho dự án đầu tiên.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-brand-700 font-semibold rounded-full shadow-xl hover:scale-[1.02] transition-all"
              >
                Thử bản demo ngay
                <ArrowUpRight className="w-4 h-4" />
              </a>
              <a
                href="#cách-hoạt-động"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full border border-white/30 backdrop-blur transition-colors"
              >
                Xem tài liệu kỹ thuật
              </a>
            </div>
            <p className="mt-6 text-xs text-brand-100/80 italic">
              Công cụ hỗ trợ tham khảo, không thay thế chứng chỉ carbon chính
              thức.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}