# GreenSite EMS — Kiến trúc microservices hiện hành

## Các process độc lập

Frontend Next.js :3000 → Gateway HTTP :4000 → Sites :4001 / Energy :4002 / Assistant :4003. Assistant gọi Energy qua HTTP; Energy đọc site từ Sites qua HTTP. Site service sở hữu SQLite; không có service khác truy cập database này.

Mỗi service có `app.ts` (khởi tạo và dependency injection) và `main.ts` (entrypoint/lifecycle). Container build targets tách riêng trong `backend/Dockerfile`. `packages/contracts` chỉ chứa DTO và validation, không chứa engine hoặc seed dữ liệu. Frontend không import module backend.

## Trách nhiệm

- Gateway: allowlist route/method, bounded JSON, chuyển tiếp, timeout, correlation ID. Không tính năng lượng.
- Sites: metadata seed trong DB, cấu hình hiện tại, lịch sử và optimistic concurrency. Ghi config + history cùng transaction. Schema migration v1 bằng SQLite `user_version`.
- Energy: dispatch model 15 phút, baseline, chi phí, carbon, cảnh báo và xuất CSV. Dữ liệu site được lấy từ service chủ sở hữu; không tin metadata/tổng số do client gửi.
- Assistant: phân tích theo quy tắc hoặc gọi OpenAI. Nhận simulation từ Energy; không import engine. Key chỉ nằm trong process/container này.
- Frontend: layout, các view theo tính năng, shared UI, API client và hook quản lý request bất đồng bộ. Hủy request cũ, debounce, hiển thị kết quả cũ có nhãn khi chờ/lỗi; không dùng mock data để che backend lỗi.

## Tính bền vững và lỗi

- `GET /health/live` cho liveness, `/health/ready` kiểm tra DB/dependency. Docker dùng readiness.
- Body giới hạn 20 KB; external OpenAI timeout 45s, gateway timeout tối đa 60s, Next proxy timeout 65s.
- API nội bộ yêu cầu shared token từ environment; token và body không ghi vào log.
- `X-Request-Id` xuyên suốt các hop; lỗi có `error`, `code`, `requestId`.
- Service xử lý SIGTERM và đóng connection; Sites đóng SQLite sau khi drain.
- Kịch bản dùng expectedRevision, trả 409 nếu có người lưu trước; không tự ghi đè.
- Quota AI hiện ở bộ nhớ một process. SQLite hiện một replica. Hai giới hạn này cần thay đổi khi scale HA.

## Triển khai

`npm run dev` / `npm start` khởi chạy năm process local. Docker Compose khởi chạy năm container trong network riêng, chỉ publish UI/gateway trên loopback; SQLite volume chỉ mount vào Sites. Cả hai cách đều dùng chung API contract. Database npm và Docker là hai store riêng.

## Những phần chưa triển khai

API gateway khác gateway thiết bị/PLC. Chưa có telemetry thực, quyền điều khiển hoặc vòng Zero-Export thời gian thực. Chưa có auth đa người dùng, tenant/RBAC, queue, phân tán quota, PostgreSQL HA hoặc lịch sử kiểm kê đạt chuẩn. Kiến trúc hiện tại phục vụ ứng dụng mô phỏng với persistence phía server.

Khi triển khai edge, bảo vệ điện và liên động vẫn ở thiết bị chuyên dụng; cloud chỉ đề xuất lịch/chính sách. Mất cloud phải có chính sách cục bộ đã nghiệm thu, không dựa vào LLM hay dữ liệu PCC cũ để điều khiển.
