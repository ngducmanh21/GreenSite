import { Check } from "lucide-react";

const plans = [
  {
    name: "Free / Trial",
    desc: "Thử nghiệm, đánh giá nhanh",
    price: "0đ",
    period: "vĩnh viễn",
    highlight: false,
    features: [
      "1 dự án",
      "Tối đa 200 dòng BOQ",
      "Có watermark trên PDF",
      "Đầy đủ tính năng tính toán",
      "Gợi ý vật liệu xanh",
    ],
    cta: "Tạo tài khoản",
  },
  {
    name: "Gói cơ bản",
    desc: "Nhà thầu nhỏ, dùng hàng tháng",
    price: "499K",
    period: "/tháng",
    highlight: true,
    features: [
      "Không giới hạn dự án",
      "BOQ đến 5.000 dòng",
      "PDF không watermark",
      "Learned mappings (học từ bạn)",
      "Lịch sử phiên bản tính",
      "Hỗ trợ email 24h",
    ],
    cta: "Bắt đầu dùng",
  },
  {
    name: "Pay-per-report",
    desc: "Làm ít dự án/năm, không muốn subscription",
    price: "199K",
    period: "/báo cáo",
    highlight: false,
    features: [
      "Trả theo lượt xuất báo cáo",
      "Dùng full tool trước khi trả",
      "PDF + Excel chi tiết",
      "Không giới hạn dự án",
      "Phù hợp nhà thầu 1-3 thầu/năm",
    ],
    cta: "Mua theo lượt",
  },
];

export default function Pricing() {
  return (
    <section id="bảng-giá" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-4">
            BẢNG GIÁ
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            Bắt đầu miễn phí,{" "}
            <span className="font-serif-italic text-brand-700">
              trả khi thấy giá trị
            </span>
          </h2>
          <p className="mt-5 text-slate-600 leading-relaxed">
            Nhà thầu nhỏ Việt Nam thường nhạy cảm với subscription. Vì vậy chúng
            tôi có cả gói trả theo lượt báo cáo.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl p-7 border transition-all ${
                p.highlight
                  ? "border-brand-500 bg-gradient-to-b from-brand-50 to-white shadow-xl shadow-brand-500/20 scale-[1.02]"
                  : "border-slate-200 bg-white hover:border-brand-300"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-500 text-white text-xs font-semibold rounded-full">
                  Phổ biến nhất
                </span>
              )}
              <h3 className="font-bold text-xl text-slate-900">{p.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">
                  {p.price}
                </span>
                <span className="text-sm text-slate-500">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <span className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-brand-600" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#cta"
                className={`mt-7 block text-center px-5 py-3 rounded-full font-semibold transition-colors ${
                  p.highlight
                    ? "bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/30"
                    : "bg-white border border-slate-200 hover:border-brand-400 text-slate-700 hover:text-brand-700"
                }`}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}