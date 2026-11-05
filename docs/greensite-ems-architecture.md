# GreenSite EMS — Kiến trúc đề xuất

Tài liệu hiện hành thay thế thiết kế AI Agent tính carbon BOQ. MVP hiện có Web Next.js, API mô phỏng/trợ lý và bộ tính năng lượng TypeScript. Edge và hạ tầng SaaS nhiều khách hàng chưa triển khai.

## Luồng hệ thống

Đồng hồ PCC / PV / BESS / máy phát / nhóm tải ↔ Gateway & bộ điều khiển cục bộ ↔ API tiếp nhận dữ liệu ↔ Kho chuỗi thời gian & dịch vụ tối ưu ↔ Web-SaaS.

## Trách nhiệm

- Web Next.js: dashboard danh mục công trường, sơ đồ năng lượng, cấu hình, mô phỏng, cảnh báo, báo cáo.
- API MVP nằm trong Next.js (`/api/simulate`, `/api/assistant`). Nếu tách dịch vụ ở giai đoạn sau, Python/FastAPI có thể đảm nhiệm: phân quyền tổ chức/công trường, telemetry, biểu giá, phiên bản chính sách, tối ưu và báo cáo.
- PostgreSQL, có thể bổ sung TimescaleDB: cấu hình, chuỗi thời gian, lịch sử sự kiện. Object storage cho báo cáo và dữ liệu nhập.
- Gateway: adapter giao thức theo thiết bị (ví dụ Modbus); gửi telemetry qua kênh xác thực/mã hóa, buffer khi mất mạng, đồng bộ lại có khử trùng lặp.
- Bộ điều khiển cục bộ: thực thi giới hạn công suất và chính sách đã duyệt; liên động, ATS, bảo vệ điện và giới hạn BMS do hệ thiết bị chuyên dụng đảm trách.
- Trợ lý MVP: phân tích theo quy tắc cục bộ; OpenAI Responses API tùy chọn với key ở máy chủ, token truy cập và giới hạn yêu cầu. Backend tự tính lại dữ liệu từ cấu hình. Không dùng LLM quyết định lệnh vận hành.

## Hợp đồng lệnh khi triển khai giai đoạn sau

Lệnh có ID duy nhất, site/device, phiên bản chính sách, người duyệt, thời gian hết hạn và giới hạn. Edge kiểm tra quyền, độ mới telemetry, liên động và giới hạn trước khi chấp nhận. Phân biệt trạng thái đề xuất, duyệt, gửi, nhận, thực thi, xác minh, lỗi/hết hạn. Không suy luận thành công chỉ từ ACK; xác minh bằng phản hồi thiết bị và đo đạc.

Không phát lại lệnh hết hạn khi nối mạng lại. Lưu audit log cho thay đổi cấu hình, thao tác thủ công và mọi chuyển trạng thái.

## Mất kết nối và trạng thái bất thường

Mất cloud: edge giữ chính sách cục bộ hợp lệ và buffer dữ liệu. Mất đo PCC hoặc tín hiệu quan trọng: chuyển chế độ dự phòng an toàn theo thiết kế điện được duyệt, không tiếp tục tối ưu dựa trên số liệu cũ. Phương án giảm PV/ngừng xả/cô lập nguồn phải được xác định cho từng cấu hình; phần mềm không tự thay thế bảo vệ phần cứng.

## Lộ trình

1. Simulator phát telemetry và dashboard, tối ưu theo quy tắc, báo cáo baseline.
2. Gateway chỉ đọc trên một công trường; đánh giá chất lượng dữ liệu và mô hình.
3. Chế độ đề xuất có người duyệt, thử nghiệm phần cứng trong điều kiện kiểm soát.
4. Vận hành tự động trong phạm vi đã nghiệm thu; mở rộng nhiều công trường.
