# GreenBIM Analytics — Đặc Tả Sản Phẩm (Product Specification)

**Phiên bản:** 0.1 (Draft)
**Ngày:** 25/08/2026
**Loại tài liệu:** Product & Technical Specification cho MVP

---

## 1. Tổng Quan Sản Phẩm

### 1.1 Vấn đề cần giải quyết
Từ 2026, các nhà thầu xây dựng tại Việt Nam chịu áp lực pháp lý ngày càng tăng liên quan đến phát thải carbon trong vật liệu xây dựng (Nghị định 209/2026/NĐ-CP về ưu tiên vật liệu xanh, lộ trình thuế carbon áp dụng cho ngành sản xuất xi măng/gạch/bê tông). Tuy nhiên:

- Nhà thầu nhỏ và vừa (SME) **không có đội ngũ ESG/chuyên gia LCA** (Life Cycle Assessment).
- Các công cụ tính carbon hiện có (One Click LCA, EC3...) **đắt, bằng tiếng Anh, không có dữ liệu vật liệu nội địa Việt Nam**.
- Quy trình bóc tách khối lượng (BOQ) đã có sẵn ở dạng Excel — đây là tài sản dữ liệu chưa được khai thác.

### 1.2 Tầm nhìn sản phẩm
Một công cụ SaaS **tự phục vụ (self-service)**, giá rẻ, cho phép kỹ sư dự toán/QS tải file Excel bóc tách khối lượng lên và trong vài phút nhận được:
1. Tổng lượng phát thải CO₂e của công trình (theo hạng mục vật liệu).
2. So sánh với ngưỡng/benchmark tham chiếu.
3. Danh sách vật liệu thay thế phát thải thấp hơn, có sẵn tại địa phương, kèm mức giảm CO₂e và chênh lệch chi phí ước tính.
4. Báo cáo xuất ra (PDF/Excel) để đính kèm hồ sơ thầu hoặc trình chủ đầu tư.

### 1.3 Đối tượng người dùng (Personas)

| Persona | Mô tả | Nhu cầu chính |
|---|---|---|
| **Kỹ sư dự toán / QS** tại nhà thầu nhỏ (5-50 nhân sự) | Người trực tiếp lập bảng bóc tách khối lượng, không chuyên về môi trường | Công cụ nhanh, không cần học, ra kết quả dùng được ngay trong hồ sơ thầu |
| **Chủ nhà thầu / Giám đốc dự án** | Ra quyết định vật liệu, quan tâm chi phí và uy tín thầu | Báo cáo dễ trình bày, số liệu đáng tin cậy, ROI rõ ràng (thắng thầu, tránh phạt) |
| **Tư vấn giám sát / Chủ đầu tư** (người dùng thứ cấp, giai đoạn sau) | Yêu cầu báo cáo carbon từ nhà thầu | Xác minh số liệu, chuẩn hóa định dạng báo cáo |

### 1.4 Ngoài phạm vi (Out of scope cho MVP)
- Đọc trực tiếp file Revit (.rvt) — để giai đoạn 2.
- Tính phát thải vận hành công trình (Scope 1/2 giai đoạn sử dụng) — chỉ tính **embodied carbon** (vật liệu + vận chuyển đến công trường).
- Tích hợp mua bán tín chỉ carbon.
- Đa ngôn ngữ (chỉ tiếng Việt ở MVP).

---

## 2. User Flow Chính

```
1. Đăng ký/Đăng nhập
        ↓
2. Tạo dự án mới (tên, loại công trình, địa điểm, diện tích sàn)
        ↓
3. Tải file Excel BOQ lên
        ↓
4. Hệ thống parse & mapping vật liệu (tự động + xác nhận thủ công nếu không khớp)
        ↓
5. Tính toán phát thải → Hiển thị Dashboard kết quả
        ↓
6. Xem gợi ý vật liệu thay thế (theo từng dòng vật liệu phát thải cao)
        ↓
7. Chọn phương án thay thế (nếu muốn) → Xem lại tổng phát thải sau thay thế
        ↓
8. Xuất báo cáo PDF/Excel
```

### 2.1 Luồng chi tiết: Bước 4 — Mapping vật liệu
Đây là bước rủi ro cao nhất về UX vì tên vật liệu trong file Excel của từng công ty không chuẩn hóa (VD: "Xi măng PCB40", "XM PCB 40 Hà Tiên", "Xi mang PC40" đều là cùng 1 loại).

- Hệ thống dùng **fuzzy matching + từ khóa (keyword-based NLP đơn giản)** để tự động gợi ý mapping với cơ sở dữ liệu emission factor.
- Với dòng không khớp được (confidence < ngưỡng), hiển thị dropdown để người dùng chọn thủ công từ danh mục vật liệu chuẩn.
- Lưu lại lựa chọn ánh xạ của người dùng để lần tải file sau tự nhận diện nhanh hơn (learning theo từng tài khoản).

---

## 3. Yêu Cầu Chức Năng (Functional Requirements)

### 3.1 Quản lý tài khoản & dự án
- FR-1: Người dùng đăng ký bằng email/số điện thoại, xác thực OTP.
- FR-2: Người dùng tạo/xóa/lưu trữ nhiều dự án, mỗi dự án có metadata: tên, loại công trình (dân dụng/công nghiệp/hạ tầng), diện tích sàn xây dựng, địa điểm (tỉnh/thành — phục vụ tính hệ số vận chuyển).
- FR-3: Phân quyền cơ bản trong 1 tài khoản công ty: Admin, Thành viên (giai đoạn 2, không bắt buộc MVP).

### 3.2 Nhập liệu (Import)
- FR-4: Tải lên file `.xlsx`/`.xls`, giới hạn 10MB, tối đa 5.000 dòng.
- FR-5: Hệ thống cho phép người dùng **ánh xạ cột** (column mapping) thủ công nếu file không theo template chuẩn: chọn cột nào là Tên vật liệu, Đơn vị, Khối lượng.
- FR-6: Cung cấp **file template mẫu** để tải về, khuyến khích người dùng dùng đúng cấu trúc (tăng độ chính xác auto-mapping).
- FR-7: Validate dữ liệu: cảnh báo dòng thiếu đơn vị, khối lượng âm/không hợp lệ, đơn vị không quy đổi được.

### 3.3 Cơ sở dữ liệu hệ số phát thải (Emission Factor Database)
- FR-8: CSDL nội bộ lưu hệ số phát thải (kg CO₂e / đơn vị) cho tối thiểu ~150-200 loại vật liệu xây dựng phổ biến tại VN ở MVP (xi măng, thép, gạch, cát, đá, bê tông tươi, gỗ, kính, sơn...).
- FR-9: Mỗi vật liệu có: mã vật liệu chuẩn, tên hiển thị, đơn vị tính, hệ số phát thải nguồn gốc (production/cradle-to-gate), nguồn tham chiếu dữ liệu (bắt buộc ghi rõ nguồn: ICE Database, EPD nội địa, hoặc ước tính), vùng áp dụng.
- FR-10: Hỗ trợ hệ số vận chuyển ước tính theo khoảng cách từ nhà máy/mỏ đến công trường (dựa trên tỉnh/thành đã nhập ở FR-2), dùng bảng khoảng cách trung bình mặc định theo vùng — không yêu cầu người dùng nhập tọa độ chính xác ở MVP.

### 3.4 Tính toán
- FR-11: Công thức tính cơ bản mỗi dòng:
  `Phát thải (kg CO₂e) = Khối lượng × Hệ số phát thải vật liệu (production) + Khối lượng × Khoảng cách vận chuyển × Hệ số phát thải vận chuyển`
- FR-12: Tổng hợp phát thải theo: (a) toàn công trình, (b) theo nhóm vật liệu (bê tông/thép/gạch/hoàn thiện...), (c) phát thải/m² sàn (để so sánh benchmark).
- FR-13: Hiển thị mức so sánh với benchmark tham chiếu ngành (VD: X kg CO₂e/m² — nguồn benchmark cần công bố minh bạch, có thể lấy từ dữ liệu công khai quốc tế điều chỉnh hệ số VN, gắn nhãn rõ "ước tính tham khảo", không cam kết là chuẩn pháp lý).

### 3.5 Gợi ý vật liệu thay thế
- FR-14: Với mỗi dòng vật liệu đóng góp lớn vào tổng phát thải (VD: top 20% theo tỷ trọng CO₂e), hệ thống gợi ý 1-3 vật liệu thay thế cùng công năng, có hệ số phát thải thấp hơn.
- FR-15: Mỗi gợi ý hiển thị: % giảm phát thải, chênh lệch giá tham khảo (từ cột `estimated_price_vnd`, hiển thị "Chưa có dữ liệu giá" nếu null), tính khả dụng tại địa phương (từ trường `region` của vật liệu thay thế).
- FR-16: Người dùng có thể "áp dụng thử" một gợi ý để xem tổng phát thải công trình thay đổi ra sao (kịch bản what-if), không bắt buộc lưu vào dự án chính.

### 3.6 Báo cáo & Xuất dữ liệu
- FR-17: Xuất báo cáo PDF gồm: thông tin dự án, tổng phát thải, biểu đồ phân bổ theo nhóm vật liệu, danh sách vật liệu thay thế đã chọn, ghi chú nguồn dữ liệu/phương pháp tính (disclaimer).
- FR-18: Xuất file Excel chi tiết từng dòng (để nhà thầu tự kiểm tra/dùng nội bộ).
- FR-19: Lưu lịch sử các phiên bản tính toán của một dự án (khi BOQ thay đổi qua các lần đấu thầu/thi công).

### 3.7 Dashboard
- FR-20: Trang tổng quan hiển thị: tổng CO₂e, biểu đồ tròn theo nhóm vật liệu, biểu đồ so sánh trước/sau khi áp dụng gợi ý thay thế, bảng chi tiết có thể sort/filter.

---

## 4. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

| Hạng mục | Yêu cầu |
|---|---|
| Hiệu năng | Xử lý file 5.000 dòng và trả kết quả trong < 15 giây |
| Độ chính xác dữ liệu | Mọi hệ số phát thải phải có nguồn trích dẫn công khai trong hệ thống, tránh rủi ro pháp lý khi khách hàng dùng số liệu để báo cáo chính thức |
| Bảo mật | Dữ liệu BOQ của khách hàng là thông tin nhạy cảm (giá thầu) — mã hóa lưu trữ (S3 SSE), không chia sẻ chéo giữa các tài khoản |
| Khả năng mở rộng | Kiến trúc cho phép thêm vật liệu/hệ số mới mà không cần deploy lại code (CSDL tách biệt logic) |
| Ngôn ngữ | Giao diện tiếng Việt, thuật ngữ kỹ thuật có chú thích |
| Tương thích | Chạy tốt trên Chrome/Edge, responsive cho tablet (kỹ sư hiện trường) |
| Pháp lý | Có disclaimer rõ ràng: công cụ hỗ trợ tham khảo, không thay thế chứng chỉ/kiểm toán carbon chính thức |
| Availability | Redis cho session cache: uptime ≥ 99.5%, PostgreSQL: uptime ≥ 99.9% |
| Data isolation | Mỗi user chỉ truy cập được projects/files thuộc về họ (RLS - Row Level Security trên PostgreSQL) |

---

## 5. Kiến Trúc Kỹ Thuật (Đề xuất)

### 5.1 Sơ đồ tổng quan

```
[Frontend: React/Next.js]
        │  REST/GraphQL API
        ▼
[Backend API: Node.js hoặc Python (FastAPI)]
        │
        ├── [Module Parse Excel] → dùng thư viện (openpyxl/pandas hoặc xlsx.js)
        ├── [Module Mapping/Matching] → fuzzy matching (rapidfuzz) + bảng đồng nghĩa vật liệu
        ├── [Module Tính toán Emission] → business logic thuần
        ├── [Module Gợi ý thay thế] → rule-based ban đầu, có thể nâng cấp ML sau
        └── [Module Xuất báo cáo] → PDF generation (WeasyPrint/Puppeteer), Excel export
        │
        ▼
[Database: PostgreSQL]
   ├── users, projects, boq_items, calculation_results
   └── emission_factors (bảng tra cứu — cập nhật độc lập, có versioning)
        │
        ▼
[File Storage: S3-compatible] — lưu file Excel gốc & báo cáo PDF
```

### 5.2 Lựa chọn công nghệ gợi ý (MVP, ưu tiên tốc độ triển khai)
- **Frontend:** Next.js + TailwindCSS (nhanh, SEO tốt nếu cần landing page marketing).
- **Backend:** Python FastAPI (hệ sinh thái xử lý dữ liệu/Excel/pandas mạnh, phù hợp cho các phép tính và fuzzy matching).
- **Database:** PostgreSQL (quan hệ rõ ràng giữa project → boq_items → emission_factors).
- **Session Cache:** Redis (KV cache cho session state, token budget management, materialized views cache).
- **File Storage:** S3-compatible (MinIO cho local dev, AWS S3 / Cloudflare R2 cho production).
- **Xử lý file Excel:** `pandas` + `openpyxl`.
- **Fuzzy matching tên vật liệu:** `rapidfuzz` (nhanh hơn fuzzywuzzy) kết hợp danh sách từ đồng nghĩa xây dựng do đội ngũ tự xây (glossary).
- **Xuất PDF:** WeasyPrint (HTML → PDF, dễ style báo cáo đẹp) hoặc Puppeteer nếu dùng Node.
- **Queue (async jobs):** Celery + Redis (cho parse BOQ, generate report tasks).

### 5.2.1 Pricing Data Strategy (MVP)
Do dữ liệu giá vật liệu không có sẵn và khó thu thập (thị trường VN biến động), MVP sẽ:

| Approach | Pros | Cons |
|---|---|---|
| User tự nhập giá khi có | Không cần data source, chính xác | Tốn thời gian user |
| Giá tham khảo từ constructor quotes | Đáng tin cậy hơn | Cần nguồn dữ liệu |
| Ước tính theo % premium của low-carbon | Đơn giản | Không chính xác |

**MVP Decision:** Cột `estimated_price_vnd` trong `emission_factors` sẽ nullable. Nếu có thì hiển thị, nếu không thì hiển thị "Chưa có dữ liệu giá". Benchmark giá premium % có thể hardcode từ constructor quotes cơ bản.

**Long-term:** Hợp tác với các nhà cung cấp vật liệu xanh để cung cấp EPD + giá thực tế (đây cũng là kênh doanh thu tiềm năng).

### 5.3 Cấu trúc dữ liệu chính (Data Model — rút gọn)

**Bảng `emission_factors`**
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | UUID | |
| material_code | string | Mã chuẩn nội bộ |
| material_name_vi | string | Tên hiển thị tiếng Việt |
| category | enum | bê tông / thép / gạch / cát đá / hoàn thiện / khác |
| unit | string | kg, m³, m², tấn... |
| unit_weight_kg | float | Trọng lượng riêng (kg/đơn vị) — dùng cho tính transport emission |
| emission_factor_production | float | kg CO₂e / đơn vị |
| emission_factor_transport | float | kg CO₂e / ton-km (default: 0.1 — xe tải thường) |
| source | string | Nguồn dữ liệu (bắt buộc) |
| region | string | Áp dụng toàn quốc / theo vùng |
| estimated_price_vnd | float | Giá tham khảo (nullable — có thể để trống nếu chưa có dữ liệu) |
| price_source | string | Nguồn giá (nullable): "constructor_quotes", "market_survey", "estimated" |
| is_low_carbon_alternative | boolean | Đánh dấu vật liệu tuần hoàn/thay thế |
| alternative_to | UUID (self-ref) | Vật liệu này thay thế cho vật liệu nào |
| updated_at | timestamp | |

**Bảng `projects`**
| Trường | Kiểu |
|---|---|
| id | UUID |
| user_id | UUID |
| name | string |
| building_type | enum |
| floor_area_m2 | float |
| location_province | string |
| created_at | timestamp |

**Bảng `boq_items`** (từng dòng vật liệu sau khi parse từ Excel)
| Trường | Kiểu |
|---|---|
| id | UUID |
| project_id | UUID |
| raw_material_name | string (tên gốc trong file người dùng tải lên) |
| matched_emission_factor_id | UUID (nullable — null nếu chưa mapping) |
| quantity | float |
| unit | string |
| calculated_co2e | float |
| mapping_confidence | float (0-1) |
| mapping_method | enum (auto / manual) |

**Bảng `calculation_results`** (snapshot tổng hợp mỗi lần tính, phục vụ versioning)
| Trường | Kiểu |
|---|---|
| id | UUID |
| project_id | UUID |
| total_co2e | float |
| co2e_per_m2 | float |
| breakdown_by_category | JSONB |
| version_number | int |
| created_at | timestamp |

**Bảng `benchmarks`** (dữ liệu tham chiếu ngành)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | UUID | |
| building_type | enum | dân dụng / công nghiệp / hạ tầng |
| region | string | vn_north / vn_central / vn_south / international |
| co2e_per_m2 | float | kg CO₂e / m² sàn |
| sample_size | int | Số công trình trong dataset (để đánh giá độ tin cậy) |
| source | string | Nguồn dữ liệu (VD: "ICE Database 2024", "VN Construction Ministry Report 2025") |
| confidence_level | enum | low / medium / high |
| disclaimer | string | Text hiển thị kèm benchmark |
| valid_from | date | Ngày benchmark có hiệu lực |
| valid_until | date | Ngày hết hiệu lực (nullable = chưa có) |
| created_at | timestamp | |

**Bảng `user_learned_mappings`** (ánh xạ đã học từ user — tăng tốc lần sau)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | UUID | |
| user_id | UUID | |
| raw_material_name | string | Tên gốc trong file user (lowercase, normalized) |
| matched_emission_factor_id | UUID | ID đã mapping thành công |
| confidence_score | float | Điểm confidence khi user xác nhận |
| use_count | int | Số lần user dùng mapping này |
| last_used_at | timestamp | |
| created_at | timestamp | |

---

## 6. Chiến Lược Cơ Sở Dữ Liệu Emission Factor (Phần rủi ro cao nhất)

Đây là "moat" thật sự của sản phẩm và cần kế hoạch riêng:

1. **Giai đoạn khởi tạo (MVP):** Lấy hệ số phát thải từ các nguồn quốc tế công khai và uy tín (VD: ICE Database - Inventory of Carbon & Energy của University of Bath, các EPD — Environmental Product Declaration công khai của nhà sản xuất xi măng/thép lớn), sau đó hiệu chỉnh sơ bộ theo đặc thù sản xuất tại VN (nếu có dữ liệu công khai từ Bộ Xây dựng/viện nghiên cứu vật liệu).
2. **Minh bạch nguồn:** Mọi con số phải gắn nguồn trích dẫn hiển thị được cho người dùng — tránh rủi ro "bịa số liệu" ảnh hưởng uy tín và pháp lý.
3. **Giai đoạn mở rộng:** Hợp tác với nhà sản xuất vật liệu xanh nội địa (xi măng xanh, gạch không nung) để lấy EPD thực tế của họ — đồng thời đây là kênh để các nhà sản xuất này "tài trợ" xuất hiện trong danh sách gợi ý (mô hình kinh doanh tiềm năng, cần đảm bảo minh bạch không thiên vị).
4. **Cập nhật định kỳ:** Cơ chế review hệ số phát thải mỗi 6-12 tháng, có changelog.

---

## 7. Mô Hình Kinh Doanh (Gợi ý, cần kiểm chứng thêm với thị trường)

| Gói | Đối tượng | Tính năng |
|---|---|---|
| Free/Trial | Nhà thầu thử nghiệm | 1 dự án, giới hạn 200 dòng BOQ, có watermark trên PDF |
| Gói cơ bản (subscription tháng/năm) | Nhà thầu nhỏ | Không giới hạn dự án, xuất báo cáo không watermark |
| Gói theo dự án (pay-per-report) | Nhà thầu làm ít dự án/năm | Trả theo lượt xuất báo cáo — phù hợp SME chưa quen trả phí subscription |

*Lưu ý: cần phỏng vấn khách hàng thực tế để xác nhận mô hình giá phù hợp — nhà thầu nhỏ VN thường nhạy cảm với subscription, có thể pay-per-use phù hợp hơn ở giai đoạn đầu.*

---

## 8. Phạm Vi MVP (Đề xuất ưu tiên để launch nhanh)

**Phải có (Must-have):**
- Import Excel + column mapping thủ công (FR-4, FR-5, FR-6)
- CSDL ~100-150 vật liệu phổ biến nhất (FR-8, FR-9)
- Tính tổng phát thải + breakdown theo nhóm (FR-11, FR-12)
- Gợi ý thay thế dạng danh sách tĩnh, rule-based đơn giản (FR-14, FR-15)
- Xuất PDF báo cáo cơ bản (FR-17)

**Nên có nhưng có thể trì hoãn (Should-have):**
- What-if scenario tương tác (FR-16)
- Benchmark so sánh ngành (FR-13)
- Auto-mapping bằng fuzzy matching nâng cao (có thể bắt đầu bằng mapping thủ công 100% ở bản demo đầu tiên)

**Chưa làm ở MVP (Won't-have):**
- Đọc file Revit
- Phân quyền nhiều người dùng/công ty
- Tích hợp giá vật liệu real-time
- Đa ngôn ngữ

---

## 9. Rủi Ro & Câu Hỏi Cần Xác Thực Trước Khi Build

1. **Ai là người trả tiền thật sự** — nhà thầu thi công hay chủ đầu tư/tư vấn thiết kế? Cần phỏng vấn 5-10 khách hàng mục tiêu trước khi hoàn thiện mô hình giá.
2. **Độ tin cậy dữ liệu** — nếu số liệu bị dùng sai trong hồ sơ thầu chính thức và bị chủ đầu tư/cơ quan quản lý bác bỏ, ảnh hưởng đến uy tín sản phẩm. Cần disclaimer pháp lý rõ ràng ngay từ đầu.
3. **Format Excel không đồng nhất** — mỗi công ty có mẫu bóc tách khác nhau; cần test với file thật của nhiều nhà thầu khác nhau trước khi tin vào auto-mapping.
4. **Tốc độ thực thi quy định** — cần theo dõi việc thực thi thực tế của Nghị định 209/2026 và lộ trình thuế carbon để canh thời điểm ra mắt phù hợp với "độ nóng" của nhu cầu thị trường.

---

## 10. Bước Tiếp Theo Đề Xuất

1. Phỏng vấn khách hàng (5-10 kỹ sư dự toán/chủ thầu nhỏ) để xác nhận nhu cầu và mức giá chấp nhận được.
2. Xây dựng bản CSDL emission factor cho ~50 vật liệu phổ biến nhất (đủ để làm prototype).
3. Build prototype không cần auto-mapping (mapping 100% thủ công) để test giá trị cốt lõi (tính toán + gợi ý) trước khi đầu tư vào NLP/fuzzy matching.
4. Test prototype với 3-5 file BOQ thật từ nhà thầu thân quen để đánh giá độ chính xác và mức độ hữu ích của gợi ý thay thế.

---

## 11. Changelog

| Ngày | Phiên bản | Thay đổi |
|---|---|---|
| 25/08/2026 | 0.1 → 0.2 | Thêm `unit_weight_kg` và `emission_factor_transport` vào bảng emission_factors để tính transport emission (align với Architecture) |
| 25/08/2026 | 0.1 → 0.2 | Thêm `estimated_price_vnd` và `price_source` cho so sánh giá alternatives |
| 25/08/2026 | 0.1 → 0.2 | Thêm bảng `benchmarks` để lưu dữ liệu tham chiếu ngành |
| 25/08/2026 | 0.1 → 0.2 | Thêm bảng `user_learned_mappings` để lưu ánh xạ đã học từ user |
| 25/08/2026 | 0.1 → 0.2 | Thêm Redis và Celery vào tech stack |
| 25/08/2026 | 0.1 → 0.2 | Thêm section "Pricing Data Strategy" để handle giá vật liệu trong MVP |
| 25/08/2026 | 0.1 → 0.2 | Cập nhật NFR với availability và data isolation requirements |
| 25/08/2026 | 0.1 → 0.2 | Cập nhật FR-15 với chi tiết về cách hiển thị giá tham khảo |
