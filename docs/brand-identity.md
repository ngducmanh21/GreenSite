# GreenSite — Brand Identity / Concept 01

Bộ nhận diện áp dụng từ ảnh người dùng cung cấp. Không thay đổi dữ liệu mô phỏng, thuật toán hay hành vi của trợ lý.

## Bảng màu

| Vai trò | Màu |
|---|---|
| Forest: logo chữ, sidebar, tiêu đề | `#123C2C` |
| Green: hành động chính, nguồn lưới, trạng thái | `#2F9E44` |
| Lime: mục được chọn, điểm nhấn, BESS | `#B8E65C` |
| Ivory: nền ứng dụng | `#F5F7F2` |
| Amber: điện mặt trời, thông tin cần chú ý | `#F2B544` |

Các sắc độ phụ chỉ dùng cho nền nhẹ, đường viền và chữ nhỏ. Không dùng lime trên nền trắng cho chữ nội dung. Biểu đồ có nhãn và số liệu tại thời điểm được chọn để không phụ thuộc riêng vào màu.

## Logo & chữ

`frontend/public/brand/mark.svg` là bản dựng vector lá–tia sét theo ảnh tham chiếu, dùng cho logo và favicon. Wordmark GreenSite dùng chữ đậm hình học với Trebuchet MS / Arial Rounded / Arial dự phòng vì ảnh không xác định tên font hoặc kèm file font. Chưa có font thương hiệu gốc để nhúng.

## Artwork gốc

`frontend/public/brand/greensite-identity.png` là bản sao nguyên vẹn ảnh người dùng gửi (1536 × 1024). Component `BrandArt` hiển thị các vùng ảnh bằng CSS viewport, không tái tạo mascot bằng AI và không thay đổi ảnh gốc. `frontend/lib/brand.ts` lưu tọa độ từng artwork; browser chỉ tải một ảnh dùng chung. Lớp hiển thị dùng nền sáng, hiệu chỉnh độ sáng/tương phản nhẹ, mix-blend-mode multiply và clip-path loại phần chú thích ngoài mascot để artwork hòa với thẻ; đây không phải các PNG trong suốt được tách nền.

- Cáo cầm tablet: banner tổng quan và màn hình chào của trợ lý.
- Cáo vẫy tay: thẻ giới thiệu trợ lý.
- Cáo đọc tablet: ngữ cảnh của trợ lý.
- Cáo cảnh báo: trang cảnh báo.
- Cáo ăn mừng: thông báo thao tác.
- Icon PV, BESS, lưới, diesel: dòng năng lượng và thẻ thiết bị.
- Icon công trường: phụ tải.
- Icon phân tích: tiêu đề báo cáo.

Artwork trang trí được ẩn khỏi trình đọc màn hình; số liệu, trạng thái và nút đều có nhãn văn bản. Mascot mở trợ lý không có quyền gửi lệnh đến thiết bị. Khi có bộ asset vector/PNG trong suốt gốc, có thể thay lớp `BrandArt` mà không sửa các màn hình.

## Tổ chức code

- `frontend/app/brand.css`: token, theme và responsive thương hiệu; nạp sau CSS bố cục.
- `frontend/components/ems/Brand.tsx`: logo và các vùng artwork dùng lại.
- `frontend/lib/brand.ts`: palette dùng cho biểu đồ và danh mục artwork.
- `frontend/tailwind.config.ts`: palette đồng bộ cho component Tailwind.
