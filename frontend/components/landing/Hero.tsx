import { ArrowUpRight, FileText, Check } from "lucide-react";
import ScribbleUnderline from "./ScribbleUnderline";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/60 to-white">
      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-gradient-radial from-brand-200/60 via-brand-100/30 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-brand-300/40 blur-3xl animate-blob-1" />
      <div className="pointer-events-none absolute top-80 -right-40 w-[500px] h-[500px] rounded-full bg-brand-400/30 blur-3xl animate-blob-2" />

      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24">
        {/* Badge */}
        <div className="flex justify-center animate-fade-up">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-brand-200 text-xs font-medium text-brand-700 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            <span className="text-slate-500">CARBON XÂY DỰNG</span>
            <span className="text-slate-300">·</span>
            Nghị định 209/2026 · Thuế carbon 2027
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-8 text-center text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05] animate-fade-up">
          Hỏi như hỏi đồng nghiệp.
          <br />
          Chắc như{" "}
          <span className="relative inline-block font-serif-italic text-brand-700">
            văn bản gốc
            <ScribbleUnderline />
          </span>
        </h1>

        <p className="mt-8 max-w-2xl mx-auto text-center text-slate-600 leading-relaxed animate-fade-up">
          GreenSite trả lời câu hỏi kỹ thuật xây dựng theo đúng bản còn hiệu lực,
          mọi ý đều mở được về tài liệu khoan gốc. Khi có thông tư mới, GreenSite
          tự quét và chỉ ra quy định nội bộ nào cần sửa.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap justify-center items-center gap-3 animate-fade-up">
          <a
            href="#cta"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-full shadow-lg shadow-brand-500/30 transition-all hover:scale-[1.02]"
          >
            Thử bản demo
            <ArrowUpRight className="w-4 h-4" />
          </a>
          <a
            href="#cách-hoạt-động"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-brand-50 text-slate-700 font-medium rounded-full border border-slate-200 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Xem cách hoạt động
          </a>
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">
          Đăng ký bằng tài khoản được cấp để dùng thử hệ thống.
        </p>

        {/* Bullet check row */}
        <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-700 animate-fade-up">
          {[
            "Dữ liệu emission factor Việt Nam",
            "Luôn đính kèm nguồn gốc",
            "Tính toán cụ thể — từ chối, không đoán",
            "Gợi ý vật liệu xanh thay thế",
            "Luật đổi — báo ngay chỗ phải sửa",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center">
                <Check className="w-3 h-3 text-brand-600" strokeWidth={3} />
              </span>
              {t}
            </li>
          ))}
        </ul>

        {/* Floating mockups 2 bên — chỉ hiện trên lg+ */}
        <FloatingMockupLeft />
        <FloatingMockupRight />

        {/* Chat preview block */}
        <ChatPreview />
      </div>
    </section>
  );
}

function FloatingMockupLeft() {
  return (
    <div className="hidden lg:block absolute top-40 -left-6 rotate-[-6deg] w-[280px] animate-fade-up">
      <div className="bg-white rounded-xl shadow-2xl shadow-brand-500/15 border border-slate-200 overflow-hidden">
        <div className="h-7 bg-slate-100 flex items-center gap-1.5 px-3">
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="ml-2 text-[10px] text-slate-500 font-medium">
            BOQ_VanPhongABC.xlsx
          </span>
        </div>
        <div className="p-3 text-[10px] font-mono text-slate-700">
          <div className="grid grid-cols-3 gap-1 pb-1 mb-1 border-b border-slate-200 text-slate-400 font-semibold">
            <span>Vật liệu</span>
            <span className="text-right">KL</span>
            <span className="text-right">ĐV</span>
          </div>
          {[
            ["Xi măng PCB40", "1.250", "tấn"],
            ["Thép D10", "8.4", "tấn"],
            ["Bê tông tươi", "320", "m³"],
            ["Gạch không nung", "12.000", "viên"],
          ].map(([name, q, u], i) => (
            <div
              key={i}
              className={`grid grid-cols-3 gap-1 py-0.5 ${
                i === 0
                  ? "bg-brand-50 text-brand-700 font-semibold rounded"
                  : ""
              }`}
            >
              <span className="truncate">{name}</span>
              <span className="text-right">{q}</span>
              <span className="text-right">{u}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FloatingMockupRight() {
  return (
    <div className="hidden lg:block absolute top-52 -right-6 rotate-[5deg] w-[260px] animate-fade-up">
      <div className="bg-white rounded-xl shadow-2xl shadow-brand-500/15 border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-700 mb-1">
          Phát thải theo nhóm
        </div>
        <div className="text-[10px] text-slate-500 mb-3">
          Tổng: 142,500 kg CO₂e
        </div>
        <div className="space-y-2">
          {[
            { c: "Bê tông", v: 38, color: "bg-brand-500" },
            { c: "Thép", v: 32, color: "bg-brand-400" },
            { c: "Gạch", v: 18, color: "bg-brand-300" },
            { c: "Hoàn thiện", v: 12, color: "bg-brand-200" },
          ].map((row) => (
            <div key={row.c}>
              <div className="flex justify-between text-[10px] text-slate-600 mb-0.5">
                <span>{row.c}</span>
                <span>{row.v}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full ${row.color}`}
                  style={{ width: `${row.v}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="mt-20 max-w-3xl mx-auto animate-fade-up">
      <div className="bg-white rounded-2xl shadow-2xl shadow-brand-500/20 border border-brand-100 overflow-hidden">
        {/* Title bar */}
        <div className="px-5 py-3 bg-gradient-to-r from-brand-50 to-white border-b border-brand-100 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          <span className="font-semibold text-slate-800 text-sm">
            GreenSite EMS
          </span>
          <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-brand-100 text-brand-700 rounded-full">
            AI Agent
          </span>
        </div>

        {/* Messages */}
        <div className="p-6 space-y-4">
          <div className="flex justify-end">
            <div className="max-w-md bg-slate-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-slate-800">
              Tổng phát thải CO₂e của dự án Văn phòng ABC là bao nhiêu?
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">G</span>
            </div>
            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
                Gọi tool: <code className="font-mono text-brand-700">calculate_emissions</code>
              </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-800 leading-relaxed">
                Dự án <b>Văn phòng ABC</b> có tổng phát thải{" "}
                <b className="text-brand-700">142.500 kg CO₂e</b>{" "}
                (tương đương <b>142,5 tấn</b>), mật độ{" "}
                <b>57 kg CO₂e/m² sàn</b> — nằm trong ngưỡng benchmark dân dụng VN
                (ước tính tham khảo). Nhóm đóng góp lớn nhất:{" "}
                <b>bê tông 38%</b> và <b>thép 32%</b>. Bạn có muốn tôi gợi ý vật
                liệu xanh thay thế cho 2 nhóm này không?
                <div className="mt-3 pt-3 border-t border-brand-200/50 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-600">Nguồn:</span>{" "}
                  ICE Database 2024 · EPD Hà Tiên, Hoa Sen · hiệu chỉnh hệ số VN
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-sm text-slate-400 flex-1">
              Hỏi GreenSite về carbon vật liệu, BOQ, vật liệu thay thế…
            </span>
            <button className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}