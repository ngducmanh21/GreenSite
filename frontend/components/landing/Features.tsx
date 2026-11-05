import {
  FileSpreadsheet,
  Wand2,
  Calculator,
  Leaf,
  BarChart3,
  FileDown,
} from "lucide-react";

const features = [
  {
    icon: FileSpreadsheet,
    title: "Import Excel BOQ",
    desc: "Tải .xlsx/.xls tối đa 5.000 dòng. Tự động phát hiện cột, hỗ trợ map thủ công khi cần.",
  },
  {
    icon: Wand2,
    title: "Mapping vật liệu thông minh",
    desc: "Fuzzy matching + từ đồng nghĩa xây dựng. Hệ thống học từ lựa chọn của bạn cho lần sau.",
  },
  {
    icon: Calculator,
    title: "Tính phát thải CO₂e",
    desc: "Công thức rõ ràng: KL × hệ số sản xuất + KL × cự ly × hệ số vận chuyển.",
  },
  {
    icon: Leaf,
    title: "Gợi ý vật liệu xanh",
    desc: "1-3 vật liệu cùng công năng, phát thải thấp hơn, có sẵn tại địa phương dự án.",
  },
  {
    icon: BarChart3,
    title: "Benchmark ngành",
    desc: "So sánh với ngưỡng kg CO₂e/m² tham chiếu (có ghi nguồn và disclaimer rõ ràng).",
  },
  {
    icon: FileDown,
    title: "Xuất báo cáo PDF/Excel",
    desc: "PDF đẹp cho hồ sơ thầu, Excel chi tiết từng dòng để kiểm tra nội bộ.",
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-4">
            TÍNH NĂNG MVP
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            Đủ để ra hồ sơ thầu,{" "}
            <span className="font-serif-italic text-brand-700">không thừa thứ gì</span>
          </h2>
          <p className="mt-5 text-slate-600 leading-relaxed">
            Sáu tính năng trọng tâm. Mỗi cái đều ra số liệu dùng được ngay,
            không phải demo cho đẹp.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group relative p-6 rounded-2xl border border-slate-200 hover:border-brand-400 hover:shadow-lg hover:shadow-brand-500/10 transition-all bg-white"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-500 transition-colors">
                <Icon className="w-5 h-5 text-brand-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">
                {title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}