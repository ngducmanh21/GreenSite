# GreenSite EMS — Đặc tả sản phẩm

Ngày: 05/11/2026. Trạng thái: đã triển khai phần mô phỏng local; các yêu cầu tổ chức, phân quyền và thiết bị thật thuộc giai đoạn sau. Thay thế đề tài carbon vật liệu/BOQ.

## 1. Bài toán và giá trị

Điều phối điện lưới, PV, BESS và diesel để giảm chi phí năng lượng vận hành công trường trong khi đáp ứng nhu cầu tải, dự phòng và giới hạn đấu nối. Khách hàng trả phí triển khai gateway/tích hợp và thuê bao theo công trường; cung cấp thiết bị và bảo trì là hạng mục hợp đồng riêng.

Người dùng: quản trị tổng thầu quản lý danh mục; chỉ huy công trường theo dõi chi phí; kỹ sư điện cấu hình và duyệt chính sách; người phụ trách ESG xem/xuất báo cáo.

## 2. Phạm vi MVP

1. Quản lý tổ chức, công trường, người dùng và quyền truy cập.
2. Khai báo đồng hồ điểm đấu nối (PCC), PV, BESS, máy phát và nhóm tải.
3. Dashboard công suất kW, điện năng kWh, SOC, trạng thái nguồn, dữ liệu mất/cũ và chi phí tích lũy.
4. Tải phân loại thiết yếu, có thể dịch lịch, có thể giảm; không tự cắt tải thiết yếu hoặc thiết bị đang thực hiện tác vụ nguy hiểm.
5. Mô phỏng chính sách ưu tiên PV, lưu phần dư vào BESS khi cho phép, giảm PV khi không thể hấp thụ; tối ưu sạc/xả theo biểu giá và dự phòng.
6. Máy phát khẩn cấp chỉ phục vụ mất lưới theo mặc định. Không giả định được hòa song song máy phát với lưới hoặc dùng máy phát để kinh doanh chênh lệch giá.
7. Theo dõi Zero-Export: công suất tại PCC, mức vượt và thời gian vượt, cảnh báo và nhật ký xử lý.
8. So sánh kịch bản, xuất báo cáo năng lượng/chi phí/phát thải có nguồn dữ liệu và giả định.

MVP đầu tiên chạy mô phỏng; không gửi lệnh tới phần cứng thật.

## 3. Dữ liệu và mô hình

Các thực thể: Organization, Site, UserRole, Device, Meter, LoadGroup, Telemetry, TariffVersion, PolicyVersion, DispatchPlan, Command, Alarm, EmissionFactorVersion, Baseline, Report.

Telemetry cần thời gian đo và nhận, đơn vị, chất lượng dữ liệu, nguồn thiết bị. Quy ước tại PCC: công suất dương là nhập, âm là xuất. Đo điện năng nhập/xuất riêng, không bù trừ làm mất bằng chứng xuất ngược. Lưu dữ liệu gốc và đánh dấu phần ước tính.

BESS cần SOC tối thiểu/tối đa, dung lượng khả dụng, giới hạn công suất, hiệu suất, dự phòng và giới hạn từ BMS. Máy phát cần chế độ cho phép, giới hạn tải, thời gian chạy/dừng tối thiểu và tiêu hao nhiên liệu có nguồn.

## 4. Tối ưu và giới hạn

Mục tiêu: giảm chi phí điện mua + nhiên liệu + hao mòn pin + chi phí vận hành được khai báo. Ràng buộc ưu tiên hơn mục tiêu kinh tế: cân bằng công suất, đủ tải thiết yếu, giới hạn đấu nối, SOC dự phòng, giới hạn thiết bị và liên động.

Cloud đề xuất lịch; edge kiểm tra và thực thi trong giới hạn. Zero-Export cần vòng điều khiển cục bộ dựa trên đo PCC và thiết bị tương thích. Không hứa không có xung xuất ngược chỉ nhờ phần mềm Web; định nghĩa ngưỡng, thời gian đáp ứng và tiêu chí nghiệm thu theo phương án điện được duyệt.

## 5. Báo cáo và đo hiệu quả

- Điện nhập, PV sản xuất/tự dùng/bị hạn chế, điện sạc/xả và tổn hao, diesel tiêu thụ, giờ máy phát, sự kiện xuất ngược.
- Chi phí baseline và tối ưu phải dùng cùng nhu cầu tải, thời kỳ, biểu giá và điều kiện so sánh; không tính phần tải bị bỏ phục vụ là tiết kiệm.
- Tỷ lệ tiết kiệm = (chi phí baseline − chi phí phương án) / chi phí baseline; không tính tỷ lệ khi baseline bằng 0.
- Theo ranh giới sở hữu/kiểm soát đã chọn, diesel đốt tại nguồn thuộc kiểm soát thường thuộc Scope 1; điện mua thuộc Scope 2. Chọn hệ số theo nguồn, địa lý, năm, đơn vị và phiên bản.
- Điện xả BESS không tự coi là điện xanh; theo dõi nguồn sạc và tránh đếm phát thải hai lần. Phân biệt kiểm kê thực tế và mức giảm so với baseline giả định.
- Hiển thị tỷ lệ bao phủ dữ liệu, phần ước tính, giả định và nguồn hệ số. Báo cáo không thay thế chứng nhận độc lập.

## 6. Kiểm chứng MVP

Mô phỏng ít nhất: tải tăng đột ngột, PV dư khi pin đầy, SOC thấp, mất lưới, mất Internet, mất đồng hồ PCC, dữ liệu trễ/trùng, thiết bị từ chối lệnh. Kiểm tra cân bằng năng lượng, giới hạn pin, không sạc/xả đồng thời trong mô hình và khả năng tái lập báo cáo.

Pilot thực tế cần khảo sát sơ đồ điện, khả năng inverter/BMS/ATS, hiệu chuẩn đồng hồ, đo baseline và tiêu chí nghiệm thu được đội điện phê duyệt. Mức giảm 30% chỉ là giả thuyết thương mại đến khi được đo kiểm.

## 7. Ngoài phạm vi ban đầu

Điều khiển phần cứng thật; tự thiết kế bảo vệ điện/hòa đồng bộ; bảo đảm chứng nhận ESG; mua bán tín chỉ carbon; phân tích BOQ/vật liệu; điều khiển bằng quyết định trực tiếp của LLM.

## 8. Tài liệu tham chiếu

- GHG Protocol Corporate Standard: https://ghgprotocol.org/sites/default/files/standards/ghg-protocol-revised.pdf
- Ví dụ kiến trúc ESS và thiết bị tương thích của hãng, không phải đặc tả áp dụng cho mọi thiết bị: https://www.victronenergy.com/media/pg/Energy_Storage_System/en/system-design.html
- Ví dụ giới hạn/chức năng feed-in theo hệ thiết bị: https://www.victronenergy.com/media/pg/Energy_Storage_System/en/frequently-asked-questions.html

## 9. Phạm vi triển khai hiện tại

Đã có dashboard, ba công trường mẫu, mô phỏng 96 bước/ngày, điều chỉnh cấu hình, cảnh báo, CSV/in PDF và trợ lý (cục bộ + OpenAI tùy chọn). Cấu hình lưu localStorage theo công trường. API dùng Next.js; không cần dịch vụ Python riêng. Chưa có đăng nhập, tenant, cơ sở dữ liệu hoặc telemetry/gateway thật. Chi tiết chạy và kiểm thử nằm trong README.
