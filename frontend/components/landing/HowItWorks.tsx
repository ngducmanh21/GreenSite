const steps = [
  { n: "01", title: "Tạo dự án", desc: "Tên, loại công trình, tỉnh thành" },
  { n: "02", title: "Tải Excel BOQ", desc: "Tối đa 5.000 dòng · 10MB" },
  { n: "03", title: "Tự động mapping", desc: "Fuzzy match tên vật liệu → emission factor" },
  { n: "04", title: "Tính phát thải", desc: "CO₂e theo nhóm + vận chuyển" },
  { n: "05", title: "So sánh benchmark", desc: "Đối chiếu ngưỡng kg CO₂e/m² ngành" },
  { n: "06", title: "Gợi ý thay thế", desc: "1-3 vật liệu xanh mỗi dòng hot" },
  { n: "07", title: "What-if kịch bản", desc: "Áp dụng thử, xem tác động ngay" },
  { n: "08", title: "Xuất báo cáo", desc: "PDF / Excel kèm nguồn trích dẫn" },
];

export default function HowItWorks() {
  return (
    <section id="cách-hoạt-động" className="py-24 bg-brand-50/40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold mb-4">
            CÁCH HOẠT ĐỘNG
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            Từ Excel BOQ đến báo cáo carbon{" "}
            <span className="font-serif-italic text-brand-700">trong vài phút</span>
          </h2>
          <p className="mt-5 text-slate-600 leading-relaxed">
            Không cần học phần mềm. Không cần nhập lại dữ liệu. Upload file đang
            có — nhận phân tích.
          </p>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(({ n, title, desc }) => (
            <div
              key={n}
              className="relative p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 transition-colors"
            >
              <div className="text-xs font-mono text-brand-600 font-semibold mb-3">
                {n}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
              <p className="text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}