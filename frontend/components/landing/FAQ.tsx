const faqs = [
  {
    q: "Số liệu emission factor lấy từ đâu?",
    a: "Hệ số phát thải được tổng hợp từ ICE Database (University of Bath), EPD công khai của nhà sản xuất xi măng/thép lớn, và hiệu chỉnh theo đặc thù sản xuất Việt Nam khi có dữ liệu. Mọi con số đều có nguồn trích dẫn hiển thị trên báo cáo.",
  },
  {
    q: "Số liệu có dùng được cho hồ sơ thầu chính thức không?",
    a: "Có disclaimer rõ ràng: GreenSite là công cụ hỗ trợ tham khảo, không thay thế chứng chỉ/kiểm toán carbon chính thức. Tuy nhiên nhiều nhà thầu dùng làm báo cáo nội bộ và đính kèm hồ sơ thầu khi yêu cầu chưa quá nghiêm ngặt.",
  },
  {
    q: "File BOQ của tôi không theo mẫu chuẩn có dùng được không?",
    a: "Có. Hệ thống tự động phát hiện cột (tên vật liệu, khối lượng, đơn vị) và cho phép bạn map thủ công nếu confidence thấp. Có sẵn file template mẫu để tải về dùng cho lần sau.",
  },
  {
    q: "Khi Nghị định 209/2026 thay đổi thì sao?",
    a: "GreenSite tự review emission factor mỗi 6-12 tháng có changelog. Bạn sẽ nhận thông báo khi có cập nhật và xem được phiên bản nào đang dùng cho từng phép tính.",
  },
  {
    q: "Có cần cài đặt gì không?",
    a: "Không. Là SaaS chạy trên trình duyệt (Chrome/Edge khuyến nghị), responsive cho tablet. Dữ liệu lưu trên cloud, mã hóa, có RLS bảo vệ theo tài khoản.",
  },
  {
    q: "Tôi là chủ đầu tư / tư vấn giám sát thì dùng được không?",
    a: "Hiện tại MVP tập trung cho kỹ sư dự toán và chủ thầu. Vai trò chủ đầu tư / tư vấn giám sát sẽ được hỗ trợ ở giai đoạn sau (xác minh số liệu, chuẩn hóa định dạng).",
  },
];

export default function FAQ() {
  return (
    <section id="vì-sao-khác" className="py-24 bg-brand-50/40">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold mb-4">
            CÂU HỎI THƯỜNG GẶP
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            Trước khi bạn{" "}
            <span className="font-serif-italic text-brand-700">đặt câu hỏi</span>
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => (
            <details
              key={i}
              className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 transition-colors"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-semibold text-slate-900">{f.q}</span>
                <span className="w-7 h-7 rounded-full bg-brand-50 group-open:bg-brand-500 flex items-center justify-center transition-colors shrink-0 ml-3">
                  <span className="w-3 h-3 border-r-2 border-b-2 border-brand-600 group-open:border-white rotate-45 -translate-y-0.5 transition-colors" />
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}