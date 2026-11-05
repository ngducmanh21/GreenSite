# Deploy GreenSite thành một Vercel project

## Cấu hình hiện tại

`vercel.json` tại root khai báo frontend Next.js và bốn backend Container Services. Vercel Services và Container Runtime đang beta. Cả năm service cùng build/deploy trong một project; không import riêng `frontend/` và `backend/` thành hai project.

- Root Directory của project: root repository (`.`).
- Frontend có framework `nextjs`, build contracts dùng chung rồi build giao diện.
- Backend dùng `Dockerfile.vercel` tại root để Docker build context chứa toàn monorepo. Mỗi service có command riêng.
- `/api/*` và `/health/*` đi vào gateway; các URL còn lại đi vào frontend.
- Sites, Energy, Assistant không có public rewrite. Gateway/Assistant/Energy gọi nhau bằng bindings do Vercel cấp tại runtime.
- Không đặt SITES_URL, ENERGY_URL hoặc ASSISTANT_URL thủ công trên Vercel.
- Token nội bộ vẫn được kiểm tra ở tầng ứng dụng; binding chỉ cấp khả năng kết nối.

## Demo chưa có database hosted

Theo lựa chọn hiện tại, cloud image bật `GREENSITE_DEMO_MODE=1`. Sites service đọc danh mục/cấu hình mẫu và trả `persistence: "demo"`. Không tạo SQLite file và không giả vờ lưu trong bộ nhớ.

Frontend hiển thị banner demo và khóa nút lưu. API PUT scenario trả `503 PERSISTENCE_NOT_CONFIGURED`; mô phỏng, CSV và phân tích theo quy tắc vẫn dùng được. Khi tải lại trang, tham số trở về cấu hình mẫu. Docker Compose/local vẫn dùng SQLite như trước.

## Biến môi trường

Bắt buộc: `INTERNAL_SERVICE_TOKEN`, chuỗi ngẫu nhiên ít nhất 32 ký tự, lưu kiểu Secret cho Production/Preview.

Tùy chọn để bật AI thật: `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_ACCESS_TOKEN`. Chưa cấu hình thì trợ lý theo quy tắc vẫn hoạt động. Không đưa secrets vào biến `NEXT_PUBLIC_*` hoặc commit vào Git.

Vercel project chia sẻ environment giữa các service; chỉ code Assistant sử dụng OpenAI key. Chỉ deploy demo với dữ liệu mẫu; chưa có lớp user/tenant auth.

## Các bước triển khai

1. Import repo `ngducmanh21/GreenSite`, chọn root repository, hoặc chạy `vercel link --project greensite` từ root.
2. Thêm secret nội bộ ở Environment Variables.
3. Deploy toàn project. Routing Services đọc từ `vercel.json`; không dùng cấu hình build/output chung ở top-level.
4. Kiểm tra `/health/ready`, `/api/sites`, `/api/sites/riverside/scenario`, mô phỏng và tải CSV.
5. Kết nối Git repository với project để các lần push deploy lại cùng project.

Frontend dùng `build:vercel` (không đóng gói standalone) trên Vercel. Các script build/start local và Docker vẫn đóng gói standalone.

## Khi bổ sung database sau

Cần thêm adapter cho database hosted, chuyển Sites service khỏi demo và bật lại lưu cấu hình. Không bật ghi SQLite lên filesystem Vercel; file local không phải lưu trữ bền vững. Việc cấp database hosted đang được hoãn theo yêu cầu.

## Tài liệu nền tảng

- https://vercel.com/docs/services
- https://vercel.com/docs/services/bindings
- https://vercel.com/docs/services/config-reference
- https://vercel.com/docs/functions/runtimes/container
