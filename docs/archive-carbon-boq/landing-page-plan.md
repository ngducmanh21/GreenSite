# Plan: Landing Page cho GreenBIM Analytics

## Context

User muốn xây landing page marketing cho **GreenBIM Analytics** (SaaS phân tích carbon xây dựng tại VN — đã mô tả chi tiết trong `docs/greenbim-analytics-specs.md` và `docs/greenbim-agent-architecture.md`). Lấy cảm hứng **phong cách** từ landing page của `silaw.vn` (trợ lý AI cho ngân hàng): gradient ở hero, badge pill ở đầu, headline lớn với một từ in nghiêng/serif được gạch chân, hình minh họa 2 bên, hàng bullet có icon check, khối chat/preview ở dưới. **Nội dung copy lấy 100% từ docs của GreenBIM**, không dùng copy của Silaw.

Theme màu: **xanh teal** (theo user chọn), thay cho cam của Silaw. Stack: **Next.js + Tailwind**.

Folder `frontend/` hiện đang trống → scaffold mới tại đây.

---

## Approach

### 1. Khởi tạo Next.js app tại `frontend/`

Dùng Next.js 14 App Router + TypeScript + TailwindCSS. Vì folder rỗng, scaffold thủ công (không cần `create-next-app` để tránh kéo noise):

- `frontend/package.json` — deps: `next@14`, `react@18`, `react-dom@18`, `typescript`, `@types/*`, `tailwindcss`, `postcss`, `autoprefixer`, `lucide-react` (cho icon check)
- `frontend/next.config.mjs` — minimal
- `frontend/tsconfig.json` — Next.js defaults
- `frontend/tailwind.config.ts` — extend theme với teal palette
- `frontend/postcss.config.mjs`
- `frontend/app/layout.tsx` — root layout, font Inter (sans) + Lora (serif cho từ được gạch chân)
- `frontend/app/globals.css` — Tailwind base + custom utilities cho gradient background teal, underline scribble effect

### 2. Cấu trúc components

Tách thành các component trong `frontend/components/landing/`, mỗi cái một file để dễ chỉnh:

- **`<Header />`** — Logo "GreenBIM" + icon lá, nav: *Vấn đề / Cách hoạt động / Vì sao khác / Bảng giá*, language switcher `VI | EN`, nút `Đăng nhập` (outline teal).
- **`<Hero />`** — Badge pill "Carbon xây dựng · Nghị định 209/2026", headline lớn (2 dòng, dòng 2 có 1 từ serif gạch chân bằng SVG scribble giống Silaw), sub-headline (lấy từ §1.2 Product Vision), 2 CTA (`Dùng thử miễn phí` filled teal + `Xem demo` ghost), 5 bullet icons check.
- **`<PainPoints />`** — Section đối chiếu "Vấn đề" từ §1.1: 3 pain cards (ESG gap, tool đắt/tiếng Anh, BOQ chưa khai thác).
- **`<HowItWorks />`** — Section mô tả flow 8 bước từ §2 docs (visual horizontal steps).
- **`<Features />`** — Grid 6 features từ README §Tính Năng Chính: Import Excel, Mapping thông minh, Tính phát thải, Gợi ý thay thế, Benchmark, Xuất báo cáo.
- **`<AgentSection />`** — Section highlight AI Agent (ReAct loop) — minh họa bằng diagram đơn giản 3 khối: Reason → Act → Observe (lấy từ §1.1 architecture doc).
- **`<Pricing />`** — 3 gói từ §7 docs: Free/Trial, Gói cơ bản, Pay-per-report.
- **`<FAQ />`** — 4-6 câu hỏi từ §9 Risk + Persona nhu cầu.
- **`<CTAFinale />`** — Lặp lại CTA chính.
- **`<Footer />`** — Minimal: logo, links, disclaimer "công cụ hỗ trợ tham khảo, không thay thế chứng chỉ carbon chính thức" (từ NFR §Pháp lý).

### 3. Phong cách "giống Silaw" — checklist style

- Hero background: **gradient teal** (từ `teal-50` ở trên → `teal-100` → trắng), với 2 "blob" gradient teal-300/40 lớn ở dưới — visual tương tự quả cầu gradient cam của Silaw nhưng tông teal.
- Badge pill: border teal-200, bg teal-50, text teal-700, dot teal-500.
- Từ serif gạch chân: dùng font `Lora` (Google Fonts) cho 1 từ/cụm trong headline, vẽ SVG scribble underline bằng path cong (giống hiệu ứng gạch tay của Silaw) — render qua React component `<ScribbleUnderline />`.
- Hình minh họa 2 bên hero: thay "văn bản ngân hàng" của Silaw bằng "Excel BOQ + biểu đồ CO₂e" — dùng SVG/CSS thuần vẽ mockup:
  - Trái: bảng Excel giả lập với highlight dòng xi măng/thép màu teal
  - Phải: biểu đồ tròn CO₂e breakdown theo nhóm vật liệu
- Floating cards có `shadow-xl shadow-teal-500/10`, `rounded-2xl`, nhẹ nghiêng `rotate-[-2deg]` / `[2deg]`.
- Bullet check: icon `Check` từ lucide-react, màu teal-600, wrap trong circle teal-100.
- Chat/preview block ở dưới hero: mockup giao diện chat với user hỏi "Tổng phát thải dự án ABC là bao nhiêu?" → agent trả lời + gọi tool "calculate_emissions".

### 4. Tailwind theme tùy biến (`tailwind.config.ts`)

```ts
theme.extend = {
  colors: {
    brand: {
      50:  '#f0fdfa',  // teal-50
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',  // primary
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    }
  },
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Lora', 'Georgia', 'serif'],
  }
}
```

### 5. File mới tạo

```
frontend/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── .gitignore                    # Next.js defaults
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # Composes all sections
│   └── globals.css
└── components/
    └── landing/
        ├── Header.tsx
        ├── Hero.tsx
        ├── ScribbleUnderline.tsx
        ├── PainPoints.tsx
        ├── HowItWorks.tsx
        ├── Features.tsx
        ├── AgentSection.tsx
        ├── Pricing.tsx
        ├── FAQ.tsx
        ├── CTAFinale.tsx
        └── Footer.tsx
```

---

## Critical files to reference (already exist)

- `docs/greenbim-analytics-specs.md` — copy cho Hero vision, PainPoints, UserFlow, Features, Pricing, FAQ, disclaimer.
- `docs/greenbim-agent-architecture.md` — AgentSection diagram (Reason → Act → Observe), tech stack badges.
- `README.md` — copy rút gọn cho Features grid.

---

## Verification

Sau khi implement:

1. `cd frontend && npm install` — không lỗi.
2. `npm run dev` — server chạy ở `http://localhost:3000`.
3. Mở trang, scroll toàn bộ — kiểm tra:
   - Header sticky, hero gradient teal render đúng, badge pill, scribble underline hiển thị.
   - Tất cả 9 sections hiển thị, responsive trên mobile (hamburger menu cho nav).
   - Chat preview ở cuối hero hiển thị mockup.
4. `npm run build` — production build pass, không TS error.
5. Lighthouse basic check (optional): title, meta description, alt text.

Nếu user muốn deploy, có thể gợi ý `npx vercel` hoặc Cloudflare Pages sau khi build OK.
