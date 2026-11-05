# GreenBIM Analytics

**Công cụ phân tích carbon xây dựng cho thị trường Việt Nam**

![Version](https://img.shields.io/badge/version-0.1--draft-orange)
![Status](https://img.shields.io/badge/status-MVP%20Development-blue)

---

## 📋 Mục Lục

- [Tổng Quan](#tổng-quan)
- [Tính Năng Chính](#tính-năng-chính)
- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Tech Stack](#tech-stack)
- [Bắt Đầu Nhanh](#bắt-đầu-nhanh)
- [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Phát Triển Tiếp](#phát-triển-tiếp)

---

## Tổng Quan

**GreenBIM Analytics** là công cụ SaaS tự phục vụ (self-service), giá rẻ, giúp kỹ sư dự toán/QS và nhà thầu xây dựng tại Việt Nam tính toán phát thải carbon trong vật liệu xây dựng một cách nhanh chóng.

### Vấn Đề Đang Giải Quyết

Từ 2026, các nhà thầu xây dựng Việt Nam chịu áp lực pháp lý ngày càng tăng liên quan đến phát thải carbon (Nghị định 209/2026/NĐ-CP, lộ trình thuế carbon). Tuy nhiên:

- Nhà thầu nhỏ và vừa (SME) **không có đội ngũ ESG/chuyên gia LCA**
- Các công cụ hiện tại (One Click LCA, EC3...) **đắt, bằng tiếng Anh, không có dữ liệu nội địa**
- Quy trình bóc tách khối lượng (BOQ) đã có sẵn ở dạng Excel — tài sản dữ liệu chưa được khai thác

### Giải Pháp

Tải file Excel BOQ lên → nhận phân tích carbon trong vài phút: tổng phát thải CO₂e, so sánh benchmark, gợi ý vật liệu thay thế phát thải thấp hơn, xuất báo cáo PDF/Excel.

---

## Tính Năng Chính

### ✅ MVP Features

| Tính năng | Mô tả |
|---|---|
| **Import Excel BOQ** | Tải file `.xlsx`/`.xls` (tối đa 5.000 dòng, 10MB), tự động parse và mapping cột |
| **Mapping vật liệu thông minh** | Fuzzy matching + từ khóa để ánh xạ tên vật liệu → emission factor, với xác nhận thủ công nếu confidence thấp |
| **Tính toán phát thải** | CO₂e = Khối lượng × Hệ số phát thải + Vận chuyển, theo nhóm vật liệu |
| **Gợi ý vật liệu thay thế** | 1-3 vật liệu cùng công năng, phát thải thấp hơn, có sẵn tại địa phương |
| **What-if Scenario** | Áp dụng thử thay thế để xem tổng phát thải thay đổi ra sao |
| **Benchmark ngành** | So sánh với ngưỡng CO₂e/m² tham chiếu |
| **Xuất báo cáo** | PDF (có biểu đồ, ghi chú nguồn) và Excel chi tiết |
| **Learned Mappings** | Hệ thống "học" ánh xạ từ lần sử dụng trước để tăng tốc lần sau |
| **Versioning** | Lưu lịch sử các phiên bản tính toán khi BOQ thay đổi |

### 🎯 User Personas

| Persona | Nhu cầu chính |
|---|---|
| **Kỹ sư dự toán / QS** | Công cụ nhanh, không cần học, ra kết quả dùng được ngay trong hồ sơ thầu |
| **Chủ nhà thầu / Giám đốc dự án** | Báo cáo dễ trình bày, số liệu đáng tin cậy, ROI rõ ràng |
| **Tư vấn giám sát / Chủ đầu tư** | Xác minh số liệu, chuẩn hóa định dạng báo cáo |

---

## Kiến Trúc Hệ Thống

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                            │
│   "Tổng phát thải công trình này là bao nhiêu?"                 │
│   "Gợi ý cách giảm 20% carbon"                                   │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    GreenBIM Agent (ReAct Loop)                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Agent Controller (Orchestrator)                │  │
│  │    ┌─────────┐    ┌─────────┐    ┌─────────┐              │  │
│  │    │ Reason  │───▶│   Act   │───▶│ Observe │              │  │
│  │    │  (LLM)  │◀───│ (Tools) │◀───│ (Result)│              │  │
│  │    └─────────┘    └─────────┘    └─────────┘              │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        ┌───────────┐    ┌───────────────┐  ┌────────────────┐
        │BIM Parser │    │Carbon Calc    │  │Material DB     │
        │ (Excel)   │    │               │  │                │
        └───────────┘    └───────────────┘  └────────────────┘
```

### Agent Loop — Reason → Tool → Observe

1. **Input**: User query + session context
2. **Reason**: LLM quyết định hành động tiếp theo
3. **Act**: Gọi tool phù hợp (parse BOQ, calculate emissions, get alternatives...)
4. **Observe**: Nhận kết quả, quay lại Reason nếu chưa xong
5. **Response**: Trả lời user với kết quả đã xử lý

### Data Flow

```
User uploads Excel BOQ
        │
        ▼
┌─────────────────┐    ┌─────────────────┐
│  S3 Storage     │───▶│  Parse Excel    │
│  (raw files)    │    │  (pandas)       │
└─────────────────┘    └────────┬────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Fuzzy Match   │
                        │  Material Map   │
                        └────────┬────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌───────────┐    ┌───────────────┐  ┌────────────┐
       │ Emission  │    │  Alternatives │  │  Benchmark │
       │ Calculator│    │  Engine       │  │  Compare   │
       └─────┬─────┘    └───────────────┘  └────────────┘
             │
             ▼
       ┌───────────┐    ┌─────────────────┐
       │ Results   │───▶│  PDF/Excel      │
       │ Dashboard │    │  Report Gen     │
       └───────────┘    └─────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js + TailwindCSS | User interface, responsive for tablet |
| **API Gateway** | FastAPI (Python) | REST API, authentication, request routing |
| **Agent Controller** | LangChain / Custom | ReAct loop, tool orchestration |
| **LLM** | Claude/GPT-4 | Reasoning, decision making |
| **Session Cache** | Redis | KV cache, session state persistence |
| **Database** | PostgreSQL | Users, projects, emission factors, benchmarks |
| **File Storage** | S3-compatible | Uploaded Excel files, generated reports |
| **Queue** | Celery + Redis | Async jobs (parse BOQ, generate reports) |

### Key Libraries

| Purpose | Library |
|---|---|
| Excel parsing | `pandas`, `openpyxl` |
| Fuzzy matching | `rapidfuzz` |
| PDF generation | `WeasyPrint` or `Puppeteer` |
| Auth | JWT + OTP |

---

## Bắt Đầu Nhanh

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 1. Clone & Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

```bash
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/greenbim
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=greenbim-uploads
JWT_SECRET=your-secret-key
```

### 3. Database Setup

```bash
cd backend
alembic upgrade head
# Seed emission factors
python -m app.seed_emission_factors
```

### 4. Run

```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

Truy cập `http://localhost:3000`

---

## Cấu Trúc Dự Án

```
greenbim/
├── docs/
│   ├── greenbim-analytics-specs.md      # Product specification
│   └── greenbim-agent-architecture.md   # Technical architecture
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── projects.py
│   │   │       ├── boq.py
│   │   │       └── reports.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/                      # SQLAlchemy models
│   │   ├── schemas/                     # Pydantic schemas
│   │   ├── services/
│   │   │   ├── emission_calculator.py
│   │   │   ├── material_matcher.py
│   │   │   ├── boq_parser.py
│   │   │   └── report_generator.py
│   │   └── agent/
│   │       ├── controller.py
│   │       ├── tools.py
│   │       └── kv_cache.py
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   └── package.json
└── data/
    └── emission_factors.csv             # Seed data
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký tài khoản mới |
| POST | `/api/auth/send-otp` | Gửi mã OTP qua email/SMS |
| POST | `/api/auth/verify-otp` | Xác thực mã OTP |
| GET | `/api/auth/profile` | Lấy thông tin user |
| PATCH | `/api/auth/profile` | Cập nhật thông tin user |

### Projects

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | Liệt kê dự án của user |
| POST | `/api/projects` | Tạo dự án mới |
| GET | `/api/projects/{id}` | Lấy chi tiết dự án |
| DELETE | `/api/projects/{id}` | Xóa dự án |

### BOQ & Materials

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/boq/upload-url` | Lấy pre-signed URL để upload |
| POST | `/api/boq/confirm-upload` | Xác nhận upload hoàn tất |
| POST | `/api/boq/parse` | Parse và mapping BOQ |
| GET | `/api/materials/search` | Tìm kiếm vật liệu |
| GET | `/api/materials/{id}/alternatives` | Lấy gợi ý thay thế |

### Calculations

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/calculate/emissions` | Tính phát thải CO₂e |
| GET | `/api/calculate/versions` | Liệt kê phiên bản tính toán |
| POST | `/api/calculate/compare-versions` | So sánh 2 phiên bản |
| POST | `/api/calculate/whatif` | Áp dụng what-if scenario |

### Reports

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reports/generate` | Tạo báo cáo PDF |
| GET | `/api/reports/{id}/download` | Tải báo cáo |

---

## Database Schema

### Core Tables

```
┌─────────────────┐     ┌─────────────────┐
│     users       │     │    projects     │
├─────────────────┤     ├─────────────────┤
│ id (UUID)       │────▶│ id (UUID)       │
│ email           │     │ user_id (FK)   │
│ phone           │     │ name           │
│ full_name       │     │ building_type   │
│ company_name    │     │ floor_area_m2  │
└─────────────────┘     │ province       │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │    boq_items    │
                         ├─────────────────┤
                         │ id (UUID)       │
                         │ project_id (FK) │
                         │ raw_material   │
                         │ matched_ef_id  │
                         │ quantity       │
                         │ calculated_co2e│
                         └─────────────────┘

┌─────────────────────────┐
│    emission_factors     │
├─────────────────────────┤
│ id (UUID)               │
│ material_code           │
│ material_name_vi        │
│ category                │
│ unit                    │
│ emission_factor_prod    │
│ emission_factor_trans   │
│ source                  │
│ is_low_carbon_alt       │
│ alternative_to          │
└─────────────────────────┘
```

### Emission Factor Database

Bao gồm ~150-200 loại vật liệu xây dựng phổ biến tại VN:

| Category | Examples |
|---|---|
| Bê tông | Bê tông tươi các mác, bê tông đúc sẵn |
| Thép | Thép thanh, thép hình, thép tấm |
| Gạch | Gạch nung, gạch không nung, gạch block |
| Cát & Đá | Cát xây dựng, đá 1x2, đá 0.5x1 |
| Xi măng | PCB30, PCB40, PCB50 |
| Hoàn thiện | Sơn, gạch lát, kính, nhôm |
| Khác | Gỗ, nhựa, vật liệu cách nhiệt |

---

## Agent Tools

### Available Tools

| Tool | Purpose |
|---|---|
| `register_user` | Đăng ký tài khoản mới |
| `send_otp` / `verify_otp` | Xác thực OTP |
| `list_projects` / `get_project` | Quản lý dự án |
| `parse_boq_excel` | Parse file Excel BOQ |
| `map_materials` | Ánh xạ vật liệu → emission factor |
| `calculate_emissions` | Tính phát thải CO₂e |
| `calculate_grouped_emissions` | Tính theo nhóm vật liệu |
| `compare_with_benchmark` | So sánh với benchmark ngành |
| `get_alternatives` | Lấy gợi ý vật liệu thay thế |
| `apply_alternative` | Áp dụng what-if scenario |
| `generate_report` | Tạo báo cáo PDF |
| `export_excel` | Xuất Excel chi tiết |
| `list_calculation_versions` | Xem lịch sử tính toán |
| `compare_versions` | So sánh phiên bản |
| `get_learned_mappings` | Xem ánh xạ đã học |
| `save_mapping` | Lưu ánh xạ mới |

---

## Pricing Model (MVP)

| Tier | Target | Features |
|---|---|---|
| **Free/Trial** | Nhà thầu thử nghiệm | 1 dự án, 200 dòng BOQ, watermark trên PDF |
| **Basic** (subscription) | Nhà thầu nhỏ | Không giới hạn dự án, xuất báo cáo không watermark |
| **Pay-per-report** | SME ít dự án/năm | Trả theo lượt xuất báo cáo |

---

## Roadmap

### Phase 1 (MVP) — Current

- [x] Import Excel BOQ + column mapping
- [x] Emission factor database ~100-150 vật liệu
- [x] Tính tổng phát thải + breakdown theo nhóm
- [x] Gợi ý vật liệu thay thế (rule-based)
- [x] Xuất báo cáo PDF cơ bản

### Phase 2

- [ ] What-if scenario tương tác
- [ ] Benchmark so sánh ngành
- [ ] Auto-mapping nâng cao (fuzzy matching)
- [ ] Multi-modal input (OCR từ ảnh BOQ)
- [ ] RAG với tài liệu pháp lý carbon VN

### Phase 3

- [ ] Đọc file Revit (.rvt)
- [ ] Fine-tuned model cho tiếng Việt construction
- [ ] Integration với EPD registry quốc tế
- [ ] Predictive pricing / thuế carbon

---

## ⚠️ Disclaimer

**Kết quả tính toán của GreenBIM mang tính chất tham khảo.**

Công cụ này sử dụng emission factors từ các nguồn công khai (ICE Database, EPD nhà sản xuất) đã được hiệu chỉnh cho thị trường Việt Nam. Mọi con số đều gắn nguồn trích dẫn có thể xác minh.

Tuy nhiên, GreenBIM **không thay thế** chứng chỉ hoặc kiểm toán carbon chính thức. Khi cần báo cáo pháp lý, vui lòng tham khảo chuyên gia LCA được chứng nhận.

---

## Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/ten-tinh-nang`)
3. Commit changes (`git commit -am 'Add ten-tinh-nang'`)
4. Push branch (`git push origin feature/ten-tinh-nang`)
5. Tạo Pull Request

---

## License

Proprietary — All rights reserved

---

**Document Version:** 0.2 (Draft)
**Last Updated:** 25/08/2026
**Specifications:** [docs/greenbim-analytics-specs.md](docs/greenbim-analytics-specs.md)
**Architecture:** [docs/greenbim-agent-architecture.md](docs/greenbim-agent-architecture.md)
