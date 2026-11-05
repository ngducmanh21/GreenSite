# Giao diện GreenSite EMS — MVP đã triển khai

Trang chủ đã thay landing page BOQ bằng ứng dụng vận hành mô phỏng. Các component landing cũ được giữ lại nhưng không được import vào trang hiện hành.

## Sáu màn hình

1. **Tổng quan:** chọn công trường, KPI năng lượng/chi phí/phát thải, dòng nguồn theo thời điểm, biểu đồ 24 giờ và danh mục công trường mẫu.
2. **Kịch bản năng lượng:** tham số PV/BESS/tải/biểu giá, chính sách Zero-Export, dịch tải và mất lưới, bảng so sánh baseline và lưu cấu hình trên server có phiên bản.
3. **Nguồn & thiết bị:** công suất nguồn mô phỏng, giới hạn và lộ trình kết nối thiết bị thật.
4. **Cảnh báo:** sự kiện tính từ kịch bản, xác nhận đã xem trong phiên.
5. **Báo cáo & phát thải:** CSV có metadata, in/lưu PDF qua trình duyệt, hệ số và giới hạn mô hình.
6. **Trợ lý AI:** câu hỏi gợi ý, phân tích theo quy tắc hoặc OpenAI thông qua Assistant service.

## Thiết kế

Sidebar xanh rừng, nền sáng, thẻ số liệu, biểu đồ SVG và điểm nhấn xanh lá/vàng cho nguồn năng lượng. Giao diện tiếng Việt, responsive; menu thu gọn trên điện thoại, nhãn “Dữ liệu mô phỏng” luôn hiển thị.

## Minh bạch dữ liệu

Không ghi trạng thái thiết bị “đã kết nối” khi chưa có gateway. Không hứa tiết kiệm 30%, đạt ESG hoặc bảo đảm Zero-Export thực tế. AI không gửi lệnh đến thiết bị. Thông tin chi phí và phát thải xuất phát từ mô hình dùng chung client/server.

## Cấu trúc frontend hiện hành

`Dashboard.tsx` điều phối UI; `layout/` chứa AppShell/Sidebar/Topbar; `views/` chứa các màn hình Overview/Scenarios/Equipment/Alerts/Reports. `ui.tsx` chứa component dùng lại. `hooks/useWorkspace.ts` gọi API, hủy request cũ và quản lý trạng thái tải/lỗi. Mọi mô phỏng và xuất CSV do backend xử lý.
