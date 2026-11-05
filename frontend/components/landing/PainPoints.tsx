import { Users, Globe, FileSpreadsheet } from "lucide-react";

const pains = [
  {
    icon: Users,
    title: "Không có chuyên gia ESG/LCA",
    desc: "Nhà thầu SME không đội ngũ đánh giá vòng đời. Mỗi lần thầu đều phải thuê ngoài hoặc bỏ qua yêu cầu carbon.",
  },
  {
    icon: Globe,
    title: "Tool quốc tế đắt và xa lạ",
    desc: "One Click LCA, EC3 đều tiếng Anh, phí hàng nghìn USD, không có emission factor nội địa Việt Nam.",
  },
  {
    icon: FileSpreadsheet,
    title: "BOQ đã có sẵn — chưa được khai thác",
    desc: "Bảng bóc tách khối lượng Excel đang nằm yên. Bạn đã có dữ liệu, chỉ thiếu công cụ chuyển thành phân tích carbon.",
  },
];

export default function PainPoints() {
  return (
    <section id="vấn-đề" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-4">
            VẤN ĐỀ
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            Từ 2026, carbon không còn là{" "}
            <span className="font-serif-italic text-brand-700">chuyện bên lề</span>
          </h2>
          <p className="mt-5 text-slate-600 leading-relaxed">
            Nghị định 209/2026 ưu tiên vật liệu xanh. Lộ trình thuế carbon áp
            dụng cho xi măng, gạch, bê tông từ 2027. Nhà thầu nào chưa chuẩn
            bị — sẽ bị loại ngay từ khâu hồ sơ thầu.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {pains.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/10 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-5 group-hover:bg-brand-500 transition-colors">
                <Icon className="w-6 h-6 text-brand-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">
                {title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              <div className="mt-4 text-xs font-mono text-slate-400">
                0{i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}