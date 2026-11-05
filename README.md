# GreenSite EMS

MVP Web cho mô phỏng năng lượng lai tại công trường: điện lưới, PV, BESS và diesel dự phòng. Giao diện tiếng Việt, có trợ lý phân tích cục bộ và tích hợp OpenAI tùy chọn.

**Trạng thái:** ứng dụng chạy cục bộ với dữ liệu mô phỏng. Chưa phải hệ EMS điều khiển phần cứng hoặc SaaS đa khách hàng sẵn sàng triển khai công khai.

## Chạy ứng dụng

Cần Node.js 22+ và npm.

```bash
cd /home/manhnd/GreenSite_EMS/frontend
npm ci
npm run dev
```

Mở http://127.0.0.1:3000. Không cần API key để chạy dashboard, mô phỏng, báo cáo và phân tích theo quy tắc. Server mặc định chỉ lắng nghe loopback.

```bash
npm run typecheck
npm test
npm run build
npm start
```

## Công nghệ

Next.js 16.4.5 (App Router), React 19, TypeScript, Tailwind CSS 3 và biểu đồ SVG. API nằm trong cùng ứng dụng Next.js.

## Đã có trong MVP

- Dashboard ba công trường mẫu, dòng năng lượng theo từng bước và phát lại một ngày.
- Mô phỏng 96 bước × 15 phút; điều chỉnh PV, BESS, dự phòng SOC, nhu cầu, giới hạn nhập lưới, thời tiết và giá năng lượng.
- Hai chính sách theo quy tắc: theo biểu giá hoặc ưu tiên tự dùng PV.
- Dịch tải giữ nguyên tổng điện năng, mất lưới 17–19h và diesel khẩn cấp, Zero-Export trong mô hình tĩnh.
- So sánh baseline cùng PV/tổng nhu cầu nhưng không điều phối BESS và không dịch tải.
- Cảnh báo tải thiếu, PV hạn chế, xuất ngược và mất lưới; xác nhận đã xem trong phiên.
- Lưu cấu hình theo công trường bằng localStorage; không có cơ sở dữ liệu tài khoản.
- Xuất CSV UTF-8 có BOM (mở bằng Excel), cấu hình, hệ số, baseline và 96 dòng kết quả. In/lưu PDF qua trình duyệt ở tab Báo cáo.
- Trợ lý đọc cấu hình hiện tại; backend tự tính lại dữ liệu thay vì tin tổng số client gửi.

## Bật AI OpenAI

```bash
cp .env.example .env.local
```

Điền các biến **chỉ trên máy chủ**:

```dotenv
OPENAI_API_KEY=<API key của bạn>
OPENAI_MODEL=<model ID khả dụng trong OpenAI project của bạn>
AI_ACCESS_TOKEN=<chuỗi ngẫu nhiên dài để bảo vệ endpoint demo>
```

Có thể tạo mã truy cập bằng `openssl rand -hex 32`. Khởi động lại server, vào **Trợ lý AI**, chọn OpenAI và nhập **AI_ACCESS_TOKEN**. Không nhập OpenAI API key trong trình duyệt. Token của demo chỉ giữ trong bộ nhớ trang, không lưu localStorage.

Khi bạn gửi câu hỏi ở chế độ OpenAI, ứng dụng gửi câu hỏi, tối đa 6 lượt gần nhất và dữ liệu mô phỏng hiện tại tới OpenAI Responses API, với `store: false`. AI chỉ tư vấn, không có tool điều khiển thiết bị. Phân tích cục bộ dùng quy tắc và được ghi rõ không phải mô hình AI. Hội thoại làm mới khi đổi công trường/cấu hình.

Endpoint AI yêu cầu access token và giới hạn 20 yêu cầu/giờ trong một tiến trình. Đây là bảo vệ cho demo local, **không thay thế đăng nhập, phân quyền tenant, quota phân tán hoặc quản lý dữ liệu production**. Chưa kiểm chứng lệnh gọi OpenAI thật nếu chưa có thông tin xác thực; test dùng transport giả lập.

Tài liệu API: https://developers.openai.com/api/docs/guides/text

## Cách mô hình tính

- Công suất kW được tích phân theo 0,25 giờ để ra kWh.
- Ưu tiên PV cấp tải, PV dư sạc BESS trong giới hạn công suất/SOC. Khi không hấp thụ được, Zero-Export giảm PV; nếu tắt thì ghi riêng điện xuất (không có doanh thu).
- BESS khởi đầu ở SOC dự phòng, không có năng lượng khả dụng miễn phí. Giới hạn SOC tối đa 95%, hiệu suất mỗi chiều 95%. Theo dõi nguồn PV sạc pin để không coi điện lưới là điện tái tạo.
- Chế độ biểu giá có thể sạc từ lưới trước 06h tới SOC 80%, xả vào cao điểm hoặc khi vượt giới hạn nhập điện. Đây là quy tắc heuristic, không bảo đảm tối ưu toàn cục.
- Diesel chỉ chạy khi giả lập mất lưới; tải tối thiểu 30%, phần dư tính vào tải giả và vẫn tiêu thụ nhiên liệu. Chưa mô hình hóa thời gian khởi động, thời gian chạy tối thiểu hay bảo vệ điện.
- Chi phí = điện nhập theo từng bước + nhiên liệu + hao mòn theo kWh pin xả. Chưa tính CAPEX, thuế, phí công suất, doanh thu điện xuất. Không ghi có tồn năng lượng pin cuối ngày; báo cáo công bố tồn đầu/cuối.
- Nếu một phương án thiếu tải, không công bố tỷ lệ tiết kiệm; baseline chi phí bằng 0 cũng không tính phần trăm.
- Hệ số minh họa: điện lưới 0,6592 kg CO₂e/kWh; diesel 2,68 kg/lít; tiêu hao diesel 0,28 lít/kWh; hao mòn pin 350 ₫/kWh xả. **Đây là giả định demo, không phải dữ liệu đã xác minh cho địa phương/năm báo cáo.**
- Ngày mô phỏng cố định 05/11/2026, không phải nguồn thời tiết hay biểu giá trực tuyến.

## Kiến trúc và API

```text
frontend/app/               Next.js App Router + API routes
frontend/components/ems/    Dashboard, biểu đồ SVG, chat
frontend/lib/ems.ts         Mô hình thuần dùng chung client/server, báo cáo
frontend/lib/http.ts        Đọc body có giới hạn dung lượng
frontend/tests/             Kiểm tra cân bằng năng lượng, biên, API và AI mock
```

`POST /api/simulate`: `{siteId, config}` → baseline, optimized, alerts, savings.

`GET /api/assistant`: trạng thái sẵn sàng (không trả secrets).

`POST /api/assistant`: `{siteId, config, question, mode: "local" | "openai", history?}` → phản hồi có nhãn nguồn. OpenAI cần `Authorization: Bearer <AI_ACCESS_TOKEN>`.

Trong MVP, API nằm cùng Next.js. `backend/` và `data/` ở root chưa được sử dụng; không cần FastAPI/PostgreSQL/Redis để chạy thử.

## Giới hạn và bước tiếp theo

1. Pilot chỉ đọc: gateway, đồng hồ PCC/inverter/BMS, kho telemetry và kiểm tra chất lượng dữ liệu.
2. SaaS: đăng nhập, tổ chức/công trường thật, phân quyền, cơ sở dữ liệu, audit và quota tập trung.
3. Điều khiển: khảo sát sơ đồ điện, thiết bị tương thích, PLC/edge và nghiệm thu liên động. Mô hình 15 phút không chứng minh Zero-Export quá độ.
4. Đo baseline thực tế; kiểm chứng mục tiêu tiết kiệm thay vì cam kết 30%. Báo cáo không tự cấp chứng chỉ ESG.

Đặc tả: [sản phẩm](docs/greensite-ems-specs.md), [kiến trúc](docs/greensite-ems-architecture.md). Tài liệu BOQ cũ ở `docs/archive-carbon-boq/`, không còn là yêu cầu hiện hành.

## Kiểm thử giao diện tùy chọn

`npm test` chạy 12 kiểm thử lõi/API, bao gồm 144 tổ hợp biên của mô hình. Tích hợp OpenAI được kiểm tra bằng transport giả lập; không phát sinh phí API trong test.

Để chạy smoke test desktop/mobile, chạy ứng dụng ở cổng 3000, khởi động một Chromium riêng có remote debugging rồi chạy test trong terminal khác:

```bash
chromium --headless --disable-gpu --remote-debugging-port=9225 --user-data-dir=/tmp/greensite-browser about:blank
npm run test:browser
```

Test sử dụng hồ sơ trình duyệt riêng, xóa localStorage của ứng dụng trong hồ sơ đó, kiểm tra điều hướng/lưu cấu hình/chat cục bộ/xuất CSV và chụp ảnh vào `/tmp/greensite-desktop.png`, `/tmp/greensite-mobile.png`. Không dùng hồ sơ trình duyệt cá nhân cho test này.

## Bộ nhận diện GreenSite

Đã áp dụng Concept 01 do người dùng cung cấp: logo lá–tia sét, palette forest/green/lime/ivory/amber, mascot cáo công trường và sáu artwork năng lượng. Ảnh gốc được giữ trong `frontend/public/brand/`, logo SVG dùng lại cho sidebar/favicon/báo cáo. Mascot có nút mở trợ lý; các artwork không thay đổi trạng thái hay số liệu mô phỏng. Chi tiết palette, cách dùng và nguồn asset: [Brand identity](docs/brand-identity.md).
