# GreenBIM Agent — System Architecture

**Phiên bản:** 0.1 (Draft)
**Ngày:** 25/08/2026
**Loại tài liệu:** Technical Architecture — Agentic AI System

---

## 1. Tổng Quan Kiến Trúc Agent

### 1.0 Tech Stack Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPENDENCIES OVERVIEW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Frontend: React/Next.js]                                     │
│           │                                                     │
│           ▼                                                     │
│  [API Gateway: FastAPI] ──── Auth Layer (JWT + OTP)            │
│           │                                                     │
│           ▼                                                     │
│  [GreenBIM Agent Controller]                                     │
│           │                                                     │
│     ┌─────┼─────┐                                              │
│     ▼     ▼     ▼                                              │
│  Redis  Postgres  S3                                           │
│ (Cache) (Data) (Files)                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Component | Technology | Purpose |
|---|---|---|
| API Gateway | FastAPI | REST API, authentication, request routing |
| Agent Controller | LangChain / Custom | ReAct loop, tool orchestration |
| Session Cache | Redis | KV cache, session state persistence |
| Database | PostgreSQL | Users, projects, emission factors, benchmarks |
| File Storage | S3-compatible | Uploaded Excel files, generated reports |
| LLM | Claude/GPT-4 | Reasoning, decision making |

### 1.1 Mô hình tương tác người dùng

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                            │
│                                                                   │
│  "Phân tích carbon cho công trình A"                             │
│  "So sánh xi măng Hà Tiên với xi măng xanh Holcim"               │
│  "Tổng phát thải theo từng tầng"                                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                       GreenBIM Agent                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Agent Controller (Orchestrator)                │  │
│  │                                                             │  │
│  │    ┌─────────┐    ┌─────────┐    ┌─────────┐              │  │
│  │    │ Reason  │───▶│   Act   │───▶│ Observe │              │  │
│  │    │  (LLM)  │◀───│ (Tools) │◀───│ (Result)│              │  │
│  │    └─────────┘    └─────────┘    └─────────┘              │  │
│  │         ▲                                               │  │
│  │         │                                               │  │
│  │    ┌────┴────┐                                         │  │
│  │    │ Session │  ← KV Cache (context preservation)       │  │
│  │    └─────────┘                                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Tools / Databases                           │
│  ┌───────────┐  ┌───────────────┐  ┌────────────────────────┐   │
│  │BIM Parser  │  │Carbon Calculator│  │Material Database     │   │
│  │  (Excel/   │  │                │  │                        │   │
│  │  Revit)    │  │  • Emission    │  │  • Emission factors   │   │
│  │            │  │  • Grouping    │  │  • Alternatives       │   │
│  │            │  │  • Benchmark   │  │  • Regional data      │   │
│  └───────────┘  └───────────────┘  └────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Agent Loop — Reason → Tool → Observe

Agent hoạt động theo mô hình **ReAct** (Reasoning + Acting):

```
┌────────────────────────────────────────────────────────────────┐
│                      AGENT EXECUTION LOOP                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐      ┌──────────┐      ┌─────────┐               │
│  │  INPUT  │ ───▶ │  REASON  │ ───▶ │  ACT    │               │
│  │(Query + │      │          │      │(Select  │               │
│  │Context) │      │ LLM decides │   │ Tool)   │               │
│  └─────────┘      └──────────┘      └────┬────┘               │
│       ▲                                     │                   │
│       │                                     ▼                   │
│       │                              ┌──────────┐               │
│       │                              │  TOOL    │               │
│       │                              │EXECUTION │               │
│       │                              └────┬─────┘               │
│       │                                   │                      │
│       │                                   ▼                      │
│       │                              ┌──────────┐               │
│       │                              │ OBSERVE  │               │
│       │                              │(Result + │               │
│       │                              │ Feedback)│               │
│       │                              └────┬─────┘               │
│       │                                   │                      │
│       └───────────────────────────────────┘                      │
│                          │                                       │
│                          ▼                                       │
│                    ┌──────────┐                                  │
│                    │FINISH?   │──No──┐                          │
│                    │ Enough?  │      │                          │
│                    └────┬─────┘      │                          │
│                         │Yes         │                          │
│                         ▼            │                          │
│                   ┌──────────┐       │                          │
│                   │ RESPONSE │◀──────┘                          │
│                   │  (Final) │  (loop back if needed)           │
│                   └──────────┘                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Agent Controller — Chi Tiết Kỹ Thuật

### 2.1 Session State Management

```typescript
interface AgentSession {
  session_id: string;
  user_id: string;
  project_id?: string;                    // Active project context
  kv_cache: ConversationKVCache;         // Persistent context
  execution_history: ToolCall[];          // Trace of actions
  partial_results: Map<string, any>;     // Intermediate states
}

interface ConversationKVCache {
  // Key-value pairs that persist across turns
  project_metadata: {
    name: string;
    building_type: string;
    floor_area_m2: number;
    province: string;
  };
  loaded_boq: {
    total_rows: number;
    material_groups: string[];
    summary_stats: any;
  };
  calculation_context: {
    last_calculation_version?: string;
    applied_alternatives: Alternative[];
  };
  // LLM context optimization: what to keep in 128k context window
}
```

### 2.2 Orchestrator Prompt Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM PROMPT (per session)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ## ROLE                                                       │
│  Bạn là GreenBIM Agent — chuyên gia phân tích carbon xây       │
│  dựng cho thị trường Việt Nam.                                  │
│                                                                 │
│  ## CAPABILITIES                                                │
│  - Phân tích BOQ từ file Excel                                 │
│  - Tính toán phát thải CO₂e theo emission factors VN           │
│  - Gợi ý vật liệu thay thế phát thải thấp                      │
│  - Xuất báo cáo PDF/Excel                                       │
│                                                                 │
│  ## AVAILABLE TOOLS                                             │
│  [TOOL_DEFINITIONS injected here]                              │
│                                                                 │
│  ## CONTEXT FROM PREVIOUS TURNS                                 │
│  [KV_CACHE content — summarized key facts]                      │
│                                                                 │
│  ## CURRENT PROJECT                                             │
│  [project_metadata from session]                               │
│                                                                 │
│  ## RULES                                                      │
│  1. Luôn trích dẫn nguồn emission factor khi đề cập số liệu  │
│  2. Thêm disclaimer: "Kết quả mang tính tham khảo, không thay  │
│     thế chứng chỉ carbon chính thức"                            │
│  3. Nếu thiếu emission factor → thông báo và gợi ý manual      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Multi-Turn Reasoning Strategy

```python
# Pseudo-code: Agent decision logic
def decide_next_action(state: AgentState) -> Action:
    query = state.user_query
    context = state.kv_cache
    history = state.execution_history

    # Pattern matching: simple queries → single tool
    if is_simple_lookup(query):
        return ToolAction("calculate_emission", {...})

    # Pattern: complex analysis → multi-step
    if requires_multi_step(query):
        steps = decompose(query)
        return PlanAction(steps)  # Agent plans sub-tasks

    # Pattern: clarification needed
    if ambiguous(query, context):
        return ClarifyAction(questions)

    # Pattern: follow-up on previous work
    if is_follow_up(query, history):
        return ToolAction(history[-1].tool, state.partial_results)

    # Pattern: full analysis from scratch
    if is_new_analysis(query):
        return PlanAction([
            "load_project",
            "parse_boq",
            "calculate_emissions",
            "generate_insights",
            "format_response"
        ])
```

---

## 3. Tool Definitions

### 3.1 Tool Registry

```typescript
const TOOL_REGISTRY = {
  // === AUTHENTICATION ===
  // Note: Auth handled at API Gateway layer. Agent receives pre-authenticated user_id via session.
  // Below tools are for user management operations (admin only).

  "register_user": {
    description: "Đăng ký tài khoản mới",
    parameters: {
      email: "string (required)",
      phone: "string (optional, either email or phone required)",
      password_hash: "string (optional if OTP-only)",
      full_name: "string"
    },
    returns: "UserRegistrationResult"
  },

  "send_otp": {
    description: "Gửi mã OTP qua email/sms",
    parameters: {
      user_id: "string",
      channel: "enum(email|sms)",
      purpose: "enum(register|login|change_password)"
    },
    returns: "OTPStatus"
  },

  "verify_otp": {
    description: "Xác thực mã OTP",
    parameters: {
      user_id: "string",
      otp_code: "string",
      purpose: "enum(register|login|change_password)"
    },
    returns: "VerificationResult"
  },

  "get_user_profile": {
    description: "Lấy thông tin profile user hiện tại",
    parameters: { /* none — derived from session */ },
    returns: "UserProfile"
  },

  "update_user_profile": {
    description: "Cập nhật thông tin user",
    parameters: {
      full_name: "string (optional)",
      company_name: "string (optional)",
      notification_preferences: "object (optional)"
    },
    returns: "UserProfile"
  },

  // === PROJECT MANAGEMENT ===
  "list_projects": {
    description: "Liệt kê tất cả dự án của user",
    parameters: { /* none */ },
    returns: "ProjectSummary[]"
  },

  "get_project": {
    description: "Lấy chi tiết một dự án",
    parameters: {
      project_id: "string (required)"
    },
    returns: "ProjectDetails"
  },

  "create_project": {
    description: "Tạo dự án mới",
    parameters: {
      name: "string",
      building_type: "enum(dan_dung|cong_nghiep|ha_tang)",
      floor_area_m2: "number",
      province: "string"
    },
    returns: "ProjectDetails"
  },

  // === DATA IMPORT ===
  "parse_boq_excel": {
    description: "Parse file Excel BOQ, trả về structured data",
    parameters: {
      file_path: "string",
      column_mapping: {
        material_name_col: "string",
        quantity_col: "string",
        unit_col: "string"
      }
    },
    returns: "BOQParseResult"
  },

  "map_materials": {
    description: "Ánh xạ tên vật liệu sang emission factor database",
    parameters: {
      raw_materials: "MaterialName[]",
      confidence_threshold: "number (0.0-1.0, default 0.7)"
    },
    returns: "MaterialMappingResult[]"
  },

  // === CALCULATIONS ===
  "calculate_emissions": {
    description: "Tính phát thải CO₂e cho toàn bộ BOQ",
    parameters: {
      project_id: "string",
      include_transport: "boolean (default true)",
      transport_distance_km: "number (optional, auto from province)"
    },
    returns: "EmissionResult"
  },

  "calculate_grouped_emissions": {
    description: "Tính phát thải theo nhóm vật liệu",
    parameters: {
      project_id: "string",
      group_by: "enum(category|supplier|location)"
    },
    returns: "GroupedEmissionResult"
  },

  "compare_with_benchmark": {
    description: "So sánh với benchmark ngành",
    parameters: {
      project_id: "string",
      benchmark_type: "enum(vn_average|international|user_defined)"
    },
    returns: "BenchmarkComparison"
  },

  "get_benchmark_details": {
    description: "Lấy chi tiết nguồn dữ liệu benchmark",
    parameters: {
      benchmark_id: "string (optional — if not provided, returns for project building_type)"
    },
    returns: "BenchmarkDetails"
  },

  // === ALTERNATIVES ===
  "get_alternatives": {
    description: "Lấy gợi ý vật liệu thay thế cho một vật liệu cụ thể",
    parameters: {
      material_id: "string",
      max_alternatives: "number (default 3)",
      region: "string (optional, default from project)"
    },
    returns: "Alternative[]"
  },

  "apply_alternative": {
    description: "Áp dụng thử một phương án thay thế vào dự án",
    parameters: {
      project_id: "string",
      boq_item_id: "string",
      alternative_id: "string"
    },
    returns: "WhatIfResult"
  },

  "revert_alternatives": {
    description: "Hoàn tác tất cả thay thế đang áp dụng thử",
    parameters: {
      project_id: "string"
    },
    returns: "void"
  },

  // === MATERIAL DATABASE ===
  "search_materials": {
    description: "Tìm kiếm vật liệu trong database",
    parameters: {
      query: "string",
      category: "string (optional)",
      limit: "number (default 20)"
    },
    returns: "Material[]"
  },

  "get_emission_factor": {
    description: "Lấy chi tiết emission factor của một vật liệu",
    parameters: {
      material_id: "string"
    },
    returns: "EmissionFactorDetails"
  },

  // === REPORTS ===
  "generate_report": {
    description: "Tạo báo cáo PDF",
    parameters: {
      project_id: "string",
      include_charts: "boolean",
      include_alternatives: "boolean",
      locale: "string (default 'vi')"
    },
    returns: "ReportDownloadUrl"
  },

  "export_excel": {
    description: "Xuất file Excel chi tiết",
    parameters: {
      project_id: "string"
    },
    returns: "ExcelDownloadUrl"
  },

  // === CALCULATION VERSIONS ===
  "list_calculation_versions": {
    description: "Liệt kê các phiên bản tính toán của dự án",
    parameters: {
      project_id: "string",
      limit: "number (default 20)"
    },
    returns: "CalculationVersionSummary[]"
  },

  "get_calculation_version": {
    description: "Lấy chi tiết một phiên bản tính toán",
    parameters: {
      version_id: "string"
    },
    returns: "CalculationVersionDetail"
  },

  "compare_versions": {
    description: "So sánh 2 phiên bản tính toán",
    parameters: {
      project_id: "string",
      version_a_id: "string",
      version_b_id: "string"
    },
    returns: "VersionComparisonResult"
  },

  // === LEARNED MAPPINGS ===
  "get_learned_mappings": {
    description: "Lấy các ánh xạ đã học từ lần sử dụng trước",
    parameters: { /* none — derived from session user_id */ },
    returns: "LearnedMapping[]"
  },

  "save_mapping": {
    description: "Lưu một ánh xạ do user xác nhận thủ công",
    parameters: {
      raw_material_name: "string",
      emission_factor_id: "string",
      confidence_score: "number (0.0-1.0)"
    },
    returns: "SaveMappingResult"
  },

  "clear_learned_mappings": {
    description: "Xóa tất cả ánh xạ đã học của user hiện tại",
    parameters: { /* none */ },
    returns: "void"
  },

  // === FILE MANAGEMENT ===
  "get_upload_url": {
    description: "Lấy pre-signed URL để upload file Excel BOQ lên S3",
    parameters: {
      project_id: "string",
      file_name: "string",
      file_size_bytes: "number",
      content_type: "string"
    },
    returns: "UploadUrlResult"
  },

  "confirm_upload": {
    description: "Xác nhận upload hoàn tất, trigger parse",
    parameters: {
      project_id: "string",
      file_path: "string (S3 key)"
    },
    returns: "UploadConfirmation"
  }
}
```

### 3.2 File Upload Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    FILE UPLOAD SEQUENCE                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User chọn file Excel trên frontend                         │
│              │                                                  │
│              ▼                                                  │
│  2. Frontend gọi get_upload_url(file_name, size)              │
│              │                                                  │
│              ▼                                                  │
│  3. Backend tạo pre-signed S3 URL (expires: 15 min)           │
│              │                                                  │
│              ▼                                                  │
│  4. Frontend upload trực tiếp lên S3 (multipart nếu > 5MB)   │
│              │                                                  │
│              ▼                                                  │
│  5. Frontend gọi confirm_upload(s3_key)                       │
│              │                                                  │
│              ▼                                                  │
│  6. Backend:                                                   │
│     - Validate file extension/size                              │
│     - Enqueue parse job (async)                                │
│     - Trả về job_id cho frontend polling                        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

Storage Structure (S3):
  s3://greenbim-uploads/
    └── {user_id}/
        └── {project_id}/
            └── {timestamp}_{original_filename}
```

### 3.3 Tool Call Flow Examples

**Example 1: Simple emission query**

```
User: "Tổng phát thải của dự án Văn phòng ABC là bao nhiêu?"

Agent Reasoning:
1. "User hỏi về tổng phát thải của một dự án cụ thể"
2. "Cần xác định project_id trước"
3. "Có thể dùng project name để lookup hoặc hỏi user"

Tool Calls:
1. search_projects(query="Văn phòng ABC")
2. calculate_emissions(project_id="xxx") [if found]

Response: "Dự án Văn phòng ABC có tổng phát thải: X kg CO₂e (tương đương Y tấn CO₂e)..."
```

**Example 2: Complex analysis with alternatives**

```
User: "Phân tích chi tiết BOQ và gợi ý cách giảm 20% phát thải"

Agent Reasoning:
1. "Đây là phân tích phức tạp, cần nhiều bước"
2. "Bước 1: Parse BOQ nếu chưa có"
3. "Bước 2: Tính emissions và xác định top contributors"
4. "Bước 3: Với mỗi top contributor, tìm alternatives"
5. "Bước 4: Tính impact của alternatives"

Tool Calls (planned):
1. parse_boq_excel(file_path="...")
2. calculate_emissions(project_id="...")
3. get_top_emitters(project_id="...", top_n=10)
4. parallel: [get_alternatives(mat_id) for each top emitter]
5. calculate_whatif_scenarios(project_id, alternatives[])
6. format_response(summary, chart_data, recommendations)
```

**Example 3: Clarification flow**

```
User: "Giảm phát thải cho công trình này"

Agent Reasoning:
1. "Query không rõ: công trình nào?"
2. "Có thể user đang refer đến session trước, nhưng không có context"
3. "Cần hỏi clarification"

Response:
"Hmm, tôi chưa biết bạn đang nói đến dự án nào. Bạn có thể:
• Nêu tên dự án (VD: 'dự án ABC')
• Hoặc tôi sẽ liệt kê các dự án của bạn:

[Tool: list_projects]"
```

---

## 4. KV Cache Strategy

### 4.1 Cache Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT OPTIMIZATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Semantic Cache (short-term, in-memory)               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Conversation turns (last 5-10 messages)              │    │
│  │ • Active tool call results                             │    │
│  │ • LLM token budget management                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  Layer 2: Session Cache (persistent, per-session)              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • KV pairs: project_metadata, boq_summary              │    │
│  │ • Calculation state (version, applied alternatives)     │    │
│  │ • Tool execution history                                │    │
│  │ • User preferences (units, language)                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  Layer 3: Long-term Cache (user-level, across sessions)         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • User's material mappings (learned synonyms)          │    │
│  │ • Favorite/saved projects                              │    │
│  │ • Report templates used                                 │    │
│  │ • Company default settings                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 KV Cache Implementation

```python
class KVCachManager:
    """Manages context preservation across agent turns"""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.semantic_cache = LRUCache(max_tokens=16000)  # ~16k tokens
        self.session_store = RedisSessionStore(session_id)
        self.longterm_store = PostgresUserStore()

    def get_context_for_llm(self) -> str:
        """Builds optimized context string for next LLM call"""
        parts = []

        # 1. KV pairs (always included, compressed)
        kv = self.session_store.get("kv_pairs", {})
        parts.append(self._compress_kv_pairs(kv))

        # 2. Recent conversation (last N turns)
        recent = self.semantic_cache.get_recent(n=5)
        parts.append(self._summarize_conversation(recent))

        # 3. Relevant tool results (from execution history)
        relevant = self._get_relevant_tool_results()
        parts.append(relevant)

        # 4. Truncate if exceeds token budget
        combined = "\n\n".join(parts)
        return self._truncate_to_budget(combined)

    def set_kv(self, key: str, value: Any):
        """Store a key-value pair in session cache"""
        self.session_store.set(f"kv:{key}", value)

    def get_kv(self, key: str) -> Optional[Any]:
        """Retrieve a key-value pair"""
        return self.session_store.get(f"kv:{key}")

    def _compress_kv_pairs(self, kv: dict) -> str:
        """Compress KV pairs to minimal representation"""
        lines = []
        for key, value in kv.items():
            if isinstance(value, dict):
                # Summarize nested objects
                summary = f"{key}: {self._summarize(value)}"
                lines.append(summary)
            else:
                lines.append(f"{key}: {value}")
        return "[PROJECT CONTEXT]\n" + "\n".join(lines)
```

### 4.3 Example KV Cache Usage

```python
# When user loads a project
agent.set_kv("project", {
    "id": "proj_123",
    "name": "Văn phòng ABC",
    "building_type": "dân dụng",
    "floor_area_m2": 2500,
    "province": "TP.HCM"
})

# When BOQ is parsed
agent.set_kv("boq_summary", {
    "total_rows": 150,
    "total_quantity_m3": 4500,
    "material_categories": ["bê tông", "thép", "gạch", "cát đá", "hoàn thiện"],
    "total_co2e_kg": 125000
})

# When alternatives applied
agent.set_kv("whatif_state", {
    "applied_alternatives": [
        {"boq_id": "row_45", "original": "XM PCB40", "alternative": "XM xanh Hà Tiên"}
    ],
    "co2e_before_kg": 125000,
    "co2e_after_kg": 118000
})

# Next turn: user asks "giảm được bao nhiêu?"
# Agent reads kv:whatif_state → responds immediately without recalculating
```

---

## 5. Tool Implementation Specifications

### 5.1 BIM Parser Tool

```python
class BIMParserTool:
    """Handles BOQ parsing from various formats"""

    async def parse_excel(
        self,
        file_path: str,
        column_mapping: Optional[ColumnMapping] = None
    ) -> BOQParseResult:
        """
        Parse Excel BOQ file.

        1. Read file with pandas
        2. Auto-detect columns if mapping not provided
        3. Validate data quality
        4. Return structured data
        """
        df = await self._read_excel(file_path)

        if not column_mapping:
            column_mapping = await self._auto_detect_columns(df)

        # Extract structured data
        items = []
        for idx, row in df.iterrows():
            item = self._parse_row(row, column_mapping)
            if item:
                items.append(item)

        # Quality validation
        validation = self._validate(items)

        return BOQParseResult(
            items=items,
            total_rows=len(items),
            column_mapping_used=column_mapping,
            validation_warnings=validation.warnings
        )

    async def _auto_detect_columns(self, df: pd.DataFrame) -> ColumnMapping:
        """
        Heuristic column detection:
        - Look for headers containing keywords
        - Use fuzzy matching on header names
        """
        headers = df.columns.tolist()

        material_col = self._find_column(
            headers,
            ["vật liệu", "tên", "mặt hàng", "hạng mục", "description", "material"]
        )

        quantity_col = self._find_column(
            headers,
            ["khối lượng", "số lượng", "qty", "quantity", "kl"]
        )

        unit_col = self._find_column(
            headers,
            ["đơn vị", "unit", "dv"]
        )

        return ColumnMapping(
            material_name_col=material_col,
            quantity_col=quantity_col,
            unit_col=unit_col
        )
```

### 5.2 Carbon Calculator Tool

```python
class CarbonCalculatorTool:
    """Core emission calculation engine"""

    def calculate_emissions(
        self,
        boq_items: List[BOQItem],
        transport_distance_km: Optional[float] = None
    ) -> EmissionResult:
        """
        Calculate CO₂e for each BOQ item.

        Formula per item (aligned with Specs FR-11):
        CO₂e = quantity × emission_factor_production
             + quantity × transport_distance_km × emission_factor_transport

        Where emission_factor_transport is stored per material (kg CO₂e / ton-km).
        """
        results = []

        for item in boq_items:
            ef = self._get_emission_factor(item.matched_material_id)

            # Production emissions
            production_co2e = item.quantity * ef.emission_factor_production

            # Transport emissions (if distance provided)
            # emission_factor_transport is in kg CO₂e / ton-km
            # quantity is in unit (may not be weight), need unit_weight_kg to convert
            if transport_distance_km and ef.unit_weight_kg:
                transport_co2e = (
                    item.quantity * ef.unit_weight_kg  # convert to kg
                    * transport_distance_km
                    * ef.emission_factor_transport  # kg CO₂e / ton-km
                ) / 1000  # convert to same unit as production_co2e
            else:
                transport_co2e = 0

            item_co2e = production_co2e + transport_co2e

            results.append(EmissionItemResult(
                item_id=item.id,
                production_co2e=production_co2e,
                transport_co2e=transport_co2e,
                total_co2e=item_co2e,
                emission_factor_used=ef,
                confidence=item.mapping_confidence
            ))

        # Aggregate
        total = sum(r.total_co2e for r in results)
        by_category = self._group_by_category(results)

        return EmissionResult(
            items=results,
            total_co2e_kg=total,
            total_co2e_ton=total / 1000,
            breakdown_by_category=by_category
        )

    def _group_by_category(
        self,
        results: List[EmissionItemResult]
    ) -> Dict[str, CategoryBreakdown]:
        """Aggregate emissions by material category"""
        groups = defaultdict(lambda: {"co2e": 0, "count": 0, "items": []})

        for r in results:
            cat = r.emission_factor_used.category
            groups[cat]["co2e"] += r.total_co2e
            groups[cat]["count"] += 1
            groups[cat]["items"].append(r)

        return {
            cat: CategoryBreakdown(
                total_co2e_kg=data["co2e"],
                percentage=data["co2e"] / total * 100,
                item_count=data["count"],
                top_items=sorted(data["items"], key=lambda x: -x.total_co2e)[:5]
            )
            for cat, data in groups.items()
        }
```

### 5.3 Material Database Tool

```python
class MaterialDatabaseTool:
    """Emission factor database access"""

    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool

    async def search_materials(
        self,
        query: str,
        category: Optional[str] = None,
        limit: int = 20
    ) -> List[Material]:
        """
        Search materials using:
        1. Full-text search on name
        2. Fuzzy matching (rapidfuzz)
        3. Synonym matching (construction glossary)
        """
        # Get base results from DB
        base_query = """
            SELECT * FROM emission_factors
            WHERE ($1::text IS NULL OR name_vi % $1)
            AND ($2::text IS NULL OR category = $2)
            LIMIT $3
        """
        base_results = await self.db.fetch(base_query, query, category, limit)

        # Enhance with fuzzy scoring
        scored = []
        for mat in base_results:
            # rapidfuzz score
            fuzz_score = rapidfuzz.fuzz.partial_ratio(query.lower(), mat["name_vi"].lower())

            # Synonym expansion
            synonyms = self._get_synonyms(mat["name_vi"])
            synonym_score = max(
                [rapidfuzz.fuzz.ratio(query.lower(), syn.lower()) for syn in synonyms] or [0]
            )

            final_score = max(fuzz_score, synonym_score * 0.9)
            scored.append((final_score, mat))

        # Sort and return
        scored.sort(key=lambda x: -x[0])
        return [mat for _, mat in scored]

    async def get_alternatives(
        self,
        material_id: str,
        max_results: int = 3,
        region: Optional[str] = None
    ) -> List[Alternative]:
        """
        Find low-carbon alternatives for a material.
        1. Query materials marked as is_low_carbon_alternative
        2. Filter by same category and compatible unit
        3. Sort by emission reduction potential
        """
        query = """
            SELECT * FROM emission_factors
            WHERE is_low_carbon_alternative = true
            AND category = (SELECT category FROM emission_factors WHERE id = $1)
            AND ($2::text IS NULL OR region = $2 OR region = 'toàn quốc')
            ORDER BY emission_factor_production ASC
            LIMIT $3
        """

        results = await self.db.fetch(query, material_id, region, max_results)

        # Calculate improvement metrics
        original = await self.db.fetchrow(
            "SELECT * FROM emission_factors WHERE id = $1",
            material_id
        )

        return [
            Alternative(
                material=mat,
                emission_reduction_pct=(
                    (original["emission_factor_production"] - mat["emission_factor_production"])
                    / original["emission_factor_production"] * 100
                ),
                estimated_price_diff=self._estimate_price_diff(original, mat),
                availability=mat["region"],
                source=mat["source"]
            )
            for mat in results
        ]
```

---

## 6. Error Handling & Fallbacks

### 6.1 Tool Error Recovery

```python
class ToolErrorRecovery:
    """Strategies for handling tool failures"""

    RECOVERY_STRATEGIES = {
        "emission_factor_not_found": [
            "search_similar_materials",
            "ask_user_for_manual_factor",
            "proceed_without_factor_warn_user"
        ],

        "parse_error": [
            "retry_with_different_encoding",
            "offer_manual_column_mapping",
            "show_sample_format_for_user"
        ],

        "calculation_overflow": [
            "check_for_negative_quantities",
            "validate_extreme_values",
            "prompt_user_confirmation"
        ],

        "db_connection_error": [
            "retry_with_backoff",
            "fallback_to_cached_data",
            "queue_for_later_retry"
        ]
    }

    def handle_error(self, tool_name: str, error: Exception) -> RecoveryAction:
        strategy = self.RECOVERY_STRATEGIES.get(error.code, ["ask_user"])

        for recovery in strategy:
            try:
                return self._execute_recovery(tool_name, recovery, error)
            except RecoveryFailed:
                continue

        # All recovery failed → escalate to user
        return EscalateAction(
            message=f"Không thể hoàn thành yêu cầu: {error.message}",
            suggested_fixes=self._get_suggestions(error)
        )
```

### 6.2 Graceful Degradation

```
┌─────────────────────────────────────────────────────────────────┐
│              FEATURE AVAILABILITY MATRIX                         │
├─────────────────────┬───────────┬───────────┬──────────────────┤
│ Feature             │ Full      │ Limited   │ Unavailable       │
├─────────────────────┼───────────┼───────────┼──────────────────┤
│ BOQ Import          │ Excel     │ CSV       │ (manual entry)    │
│ Material Mapping    │ Auto+Manual│ Manual    │ (skip step)      │
│ Emission Calc       │ With EF   │ Estimate  │ Error             │
│ Alternatives        │ With data │ Static list│ N/A              │
│ Transport Calc      │ With dist │ Default   │ Skip              │
│ Benchmark           │ Full      │ Simple    │ Skip              │
│ PDF Report          │ Full      │ Basic     │ Excel only        │
└─────────────────────┴───────────┴───────────┴──────────────────┘
```

---

## 7. Security & Data Privacy

### 7.1 Data Isolation

```python
# Each tool execution enforces project-level access control
class SecureToolExecutor:
    def __init__(self, auth: AuthService):
        self.auth = auth

    async def execute(
        self,
        tool_name: str,
        params: dict,
        session: AgentSession
    ):
        # 1. Verify user owns the project
        if "project_id" in params:
            project = await self.db.get_project(params["project_id"])
            if project.user_id != session.user_id:
                raise UnauthorizedError("Access denied to this project")

        # 2. Check file ownership (for uploaded files)
        if "file_path" in params:
            file = await self.file_store.get_metadata(params["file_path"])
            if file.owner_id != session.user_id:
                raise UnauthorizedError("Access denied to this file")

        # 3. Execute with user context
        return await self._execute_in_user_context(
            tool_name,
            params,
            session.user_id
        )
```

### 7.2 PII & Sensitive Data Handling

```
• BOQ files: encrypted at rest (AES-256), never logged
• Material quantities: considered business-sensitive (competitor info)
• User queries: logged for quality/debugging, no PII attached
• Emission factors: public reference data, no privacy concern
```

---

## 8. Performance Optimization

### 8.1 Tool Execution Batching

```python
class ToolBatcher:
    """Batch multiple tool calls for efficiency"""

    async def execute_batch(
        self,
        tool_calls: List[ToolCall],
        session: AgentSession
    ) -> List[ToolResult]:
        # Group by tool type
        by_tool = defaultdict(list)
        for tc in tool_calls:
            by_tool[tc.tool_name].append(tc)

        # Batch DB queries
        results = []
        for tool_name, calls in by_tool.items():
            if tool_name == "search_materials":
                # Combine multiple searches into one query
                queries = [c.params["query"] for c in calls]
                batch_result = await self._batch_material_search(queries)
                results.extend(batch_result)
            else:
                # Execute individually
                for call in calls:
                    results.append(await self.execute_single(call))

        return results
```

### 8.2 Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CACHE HIT MATRIX                             │
├───────────────────────────┬─────────────────────────────────────┤
│ Tool / Data               │ Cache Duration                       │
├───────────────────────────┼─────────────────────────────────────┤
│ Material search results   │ 1 hour (EF data rarely changes)      │
│ Emission factor lookup    │ 24 hours (versioned)                 │
│ Project metadata          │ Session lifetime                     │
│ BOQ parse results         │ Until file changes                   │
│ Calculation results       │ Until BOQ or factors change          │
│ Alternative suggestions    │ 1 hour                              │
└───────────────────────────┴─────────────────────────────────────┘
```

---

## 9. Observability

### 9.1 Execution Tracing

```python
# Every tool call is traced for debugging and optimization
@dataclass
class ToolCallTrace:
    trace_id: str
    session_id: str
    tool_name: str
    params: dict  # sanitized, no sensitive data
    started_at: datetime
    completed_at: Optional[datetime]
    result_summary: str  # e.g., "found 45 items"
    error: Optional[str]
    llm_reasoning: str  # why this tool was chosen
```

### 9.2 Metrics to Track

```
• Tool call frequency per session
• Average turns per query type
• Fallback rate (when primary approach fails)
• Cache hit rate
• Token usage per session
• Error rate by tool
• User satisfaction (thumbs up/down on responses)
```

---

## 10. Integration với Frontend

### 10.1 API Gateway Pattern

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend  │────▶│   API Gateway   │────▶│  GreenBIM Agent │
│  (Next.js)  │◀────│  (REST/WS)      │◀────│   (LangChain)   │
└─────────────┘     └─────────────────┘     └─────────────────┘
                           │                        │
                           ▼                        ▼
                    ┌─────────────┐          ┌─────────────┐
                    │  Analytics  │          │   Tools     │
                    │   Store     │          │  (Backend)  │
                    └─────────────┘          └─────────────┘
```

### 10.2 Frontend Integration SDK

```typescript
// Example: React hook for agent interaction
function useGreenBIMAgent() {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const startSession = async (projectId?: string) => {
    const newSession = await api.createSession({ project_id: projectId });
    setSession(newSession);
  };

  const sendMessage = async (content: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: "user", content }]);

    // Stream response from agent
    const stream = await api.sendMessage(session.id, content);

    // Handle streaming updates
    for await (const chunk of stream) {
      if (chunk.type === "tool_call") {
        // Show tool being called (optional UX element)
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `🔧 Gọi: ${chunk.tool_name}...`,
          isLoading: true
        }]);
      } else if (chunk.type === "text") {
        // Update message with new text
        setMessages(prev => updateLastMessage(prev, chunk.text));
      } else if (chunk.type === "result") {
        // Show result summary
        setMessages(prev => [...prev, {
          role: "assistant",
          content: formatResult(chunk.data)
        }]);
      }
    }
  };

  return { session, messages, startSession, sendMessage };
}
```

---

## 11. Roadmap Mở Rộng

### Phase 2: Enhanced Agent Capabilities

```
• Multi-modal input: Upload ảnh BOQ → OCR → parse
• RAG: Retrieval-Augmented Generation với tài liệu pháp luật carbon VN
• Co-pilot mode: Agent đề xuất action thay vì chờ user prompt
• Collaborative: Nhiều agent chuyên biệt (1 cho BOQ, 1 cho alternatives, 1 cho reports)
```

### Phase 3: Advanced Intelligence

```
• Fine-tuned model cho tiếng Việt construction domain
• Predictive: Dự đoán xu hướng giá carbon / thuế carbon sắp tới
• Integration: Kết nối với EPD registry quốc tế
• Benchmark learning: Thu thập data để tạo benchmark VN độc quyền
```

---

## 12. Summary

Kiến trúc Agent này mang lại:

| Benefit | Description |
|---|---|
| **Flexibility** | Thêm tool mới không cần thay đổi core agent |
| **Contextual** | KV cache giữ ngữ cảnh dự án qua nhiều câu hỏi |
| **Transparent** | User thấy được agent đang suy nghĩ gì / dùng tool gì |
| **Reliable** | Error recovery + graceful degradation |
| **Scalable** | Tool có thể chạy distributed (handle concurrent users) |

---

*Document được viết để align team về kiến trúc Agent. Cần review và approve trước khi implement.*

---

## 13. Changelog

| Ngày | Phiên bản | Thay đổi |
|---|---|---|
| 25/08/2026 | 0.1 → 0.2 | Thêm section 1.0 Tech Stack Dependencies (Redis, S3, Auth) |
| 25/08/2026 | 0.1 → 0.2 | Thêm AUTH TOOL REGISTRY: register_user, send_otp, verify_otp, get_user_profile, update_user_profile |
| 25/08/2026 | 0.1 → 0.2 | Thêm get_benchmark_details tool để query benchmark data source |
| 25/08/2026 | 0.1 → 0.2 | Thêm VERSION TOOLS: list_calculation_versions, get_calculation_version, compare_versions |
| 25/08/2026 | 0.1 → 0.2 | Thêm LEARNED MAPPINGS TOOLS: get_learned_mappings, save_mapping, clear_learned_mappings |
| 25/08/2026 | 0.1 → 0.2 | Thêm FILE MANAGEMENT TOOLS: get_upload_url, confirm_upload |
| 25/08/2026 | 0.1 → 0.2 | Thêm section 3.2 File Upload Flow (S3 pre-signed URL pattern) |
| 25/08/2026 | 0.1 → 0.2 | Fix công thức transport emission — align với Specs, thêm comment giải thích unit_weight_kg |
| 25/08/2026 | 0.1 → 0.2 | Rename section 3.x → 3.3 để nhường chỗ cho File Upload Flow |
