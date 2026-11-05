import { Brain, Wrench, Eye } from "lucide-react";

const phases = [
  {
    icon: Brain,
    label: "Reason",
    desc: "LLM đọc câu hỏi + ngữ cảnh dự án trong session",
  },
  {
    icon: Wrench,
    label: "Act",
    desc: "Chọn tool phù hợp: parse BOQ, tính phát thải, tìm thay thế…",
  },
  {
    icon: Eye,
    label: "Observe",
    desc: "Đọc kết quả, quyết định tiếp tục hay trả lời user",
  },
];

const tools = [
  "parse_boq_excel",
  "calculate_emissions",
  "get_alternatives",
  "compare_with_benchmark",
  "generate_report",
  "export_excel",
];

export default function AgentSection() {
  return (
    <section className="py-24 bg-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 -left-32 w-[500px] h-[500px] rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-[600px] h-[600px] rounded-full bg-brand-400/20 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold mb-4 border border-brand-400/30">
            AI AGENT
          </span>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Không chỉ trả lời —{" "}
            <span className="font-serif-italic text-brand-300">
              biết cách tính
            </span>
          </h2>
          <p className="mt-5 text-slate-300 leading-relaxed">
            GreenSite Agent hoạt động theo vòng lặp ReAct: lý luận → gọi tool →
            quan sát kết quả. Mỗi tool có tham chiếu nguồn rõ ràng, không đoán.
          </p>
        </div>

        {/* ReAct loop diagram */}
        <div className="mt-16 grid md:grid-cols-3 gap-5">
          {phases.map(({ icon: Icon, label, desc }, i) => (
            <div
              key={label}
              className="relative p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur"
            >
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </div>
              <Icon className="w-7 h-7 text-brand-300 mb-4" />
              <h3 className="font-bold text-xl mb-2">{label}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Tool pills */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {tools.map((t) => (
            <code
              key={t}
              className="px-3 py-1.5 rounded-full bg-brand-500/15 border border-brand-400/30 text-brand-200 text-xs font-mono"
            >
              {t}
            </code>
          ))}
          <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs">
            + 20 tools khác
          </span>
        </div>

        <p className="mt-10 text-center text-xs text-slate-500 italic">
          Disclaimer: kết quả mang tính tham khảo, không thay thế chứng chỉ
          carbon chính thức.
        </p>
      </div>
    </section>
  );
}