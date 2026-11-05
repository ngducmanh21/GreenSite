"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Loader2, LockKeyhole } from "lucide-react";
import type { Simulation } from "@/lib/ems";
import { BrandArt, BrandMark } from "./Brand";
type Message = { role: "user" | "assistant"; content: string; mode?: string };
export function Assistant({ sim }: { sim: Simulation }) {
  const [available, setAvailable] = useState(false),
    [mode, setMode] = useState<"local" | "openai">("local"),
    [token, setToken] = useState(""),
    [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null),
    end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/assistant", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => setAvailable(d.available === true))
      .catch(() => {});
    return () => {
      ac.abort();
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (messages.length)
      end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);
  async function ask(text: string) {
    if (!text.trim() || busy) return;
    const previous = messages;
    setMessages((old) => [...old, { role: "user", content: text.trim() }]);
    setQuestion("");
    setBusy(true);
    setError("");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(mode === "openai" ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          siteId: sim.site.id,
          config: sim.config,
          question: text.trim(),
          mode,
          history: previous
            .slice(-6)
            .map(({ role, content }) => ({ role, content })),
        }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Không thể nhận phản hồi.");
      setMessages((old) => [
        ...old,
        { role: "assistant", content: data.answer, mode: data.mode },
      ]);
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(e instanceof Error ? e.message : "Lỗi kết nối.");
        setQuestion(text);
        setMessages(previous);
      }
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="assistant-layout">
      <section className="panel assistant-main">
        <div className="panel-heading">
          <div className="heading-with-icon">
            <span className="mascot-avatar">
              <BrandArt asset="mascot-face" />
            </span>
            <div>
              <h2>Trợ lý năng lượng</h2>
              <p>Đọc dữ liệu. Hiểu nguyên nhân. Thử phương án.</p>
            </div>
          </div>
          <span className="tag">Chỉ tư vấn</span>
        </div>
        <div className="assistant-toolbar">
          <label htmlFor="assistant-mode">Chế độ</label>
          <select
            id="assistant-mode"
            value={mode}
            disabled={busy}
            onChange={(e) => {
              setMode(e.target.value as typeof mode);
              setMessages([]);
              setError("");
            }}
          >
            <option value="local">Phân tích cục bộ · không cần API key</option>
            <option value="openai" disabled={!available}>
              OpenAI {available ? "· đã cấu hình" : "· chưa cấu hình máy chủ"}
            </option>
          </select>
        </div>
        {mode === "openai" && (
          <div className="ai-credentials">
            <label htmlFor="ai-token">
              <LockKeyhole size={14} /> Mã truy cập AI của bản demo
            </label>
            <input
              id="ai-token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="AI_ACCESS_TOKEN (không phải OpenAI API key)"
            />
            <small>
              Câu hỏi, lịch sử gần nhất và số liệu mô phỏng sẽ được gửi đến
              OpenAI khi bạn gửi câu hỏi.
            </small>
          </div>
        )}
        <div className="chat-messages" aria-live="polite">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <BrandArt
                asset="mascot-tablet"
                className="assistant-welcome-art"
              />
              <h3>Cùng tìm một phương án tốt hơn.</h3>
              <p>
                Mình có dữ liệu của <b>{sim.site.name}</b> và kịch bản hiện tại.
                Bạn muốn tìm hiểu điều gì?
              </p>
              <div className="prompt-grid">
                {[
                  "Chi phí đang được tối ưu như thế nào?",
                  "Zero-Export có đang hoạt động?",
                  "BESS đang được sử dụng ra sao?",
                  "Giải thích báo cáo phát thải carbon",
                ].map((q) => (
                  <button
                    key={q}
                    disabled={busy || (mode === "openai" && !token)}
                    onClick={() => ask(q)}
                  >
                    {q}
                    <ArrowUp size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div className={`chat-message ${m.role}`} key={i}>
              {m.role === "assistant" && (
                <div className="message-label">
                  <BrandMark />
                  {m.mode === "openai"
                    ? "OpenAI · dữ liệu mô phỏng"
                    : "Phân tích theo quy tắc"}
                </div>
              )}
              <p>{m.content}</p>
            </div>
          ))}
          {busy && (
            <div className="chat-working">
              <Loader2 className="spin" size={16} /> Đang phân tích kịch bản…
            </div>
          )}
          <div ref={end} />
        </div>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <label className="sr-only" htmlFor="assistant-question">
            Câu hỏi về năng lượng
          </label>
          <textarea
            id="assistant-question"
            value={question}
            maxLength={2000}
            rows={2}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Hỏi về chi phí, pin lưu trữ, Zero-Export…"
          />
          <button
            type="submit"
            className="send-button"
            aria-label="Gửi câu hỏi"
            disabled={busy || !question.trim() || (mode === "openai" && !token)}
          >
            {busy ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <ArrowUp size={20} />
            )}
          </button>
        </form>
        <p className="chat-disclaimer">
          {mode === "local"
            ? "Phản hồi theo quy tắc cục bộ, không phải AI sinh văn bản."
            : "AI có thể sai. Đối chiếu các con số với báo cáo mô phỏng."}{" "}
          Không có quyền điều khiển thiết bị.
        </p>
      </section>
      <aside className="assistant-context panel">
        <BrandArt asset="mascot-reading" className="context-mascot" />
        <span className="eyebrow">NGỮ CẢNH HIỆN TẠI</span>
        <h3>{sim.site.name}</h3>
        <p>
          {sim.site.location} · {sim.date}
        </p>
        <div className="context-item">
          <span>Nguồn dữ liệu</span>
          <b>Mô phỏng 24 giờ</b>
        </div>
        <div className="context-item">
          <span>Điện mặt trời</span>
          <b>{sim.config.pvKW} kWp</b>
        </div>
        <div className="context-item">
          <span>Pin lưu trữ</span>
          <b>{sim.config.batteryKWh} kWh</b>
        </div>
        <div className="context-item">
          <span>Zero-Export</span>
          <b>{sim.config.zeroExport ? "Đang bật" : "Đang tắt"}</b>
        </div>
        <hr />
        <h4>Trợ lý có thể giúp</h4>
        {[
          "Giải thích kết quả tính toán",
          "Nhận diện phần năng lượng lãng phí",
          "Đề xuất kịch bản để bạn so sánh",
        ].map((t) => (
          <p className="check-line" key={t}>
            <Check size={15} />
            {t}
          </p>
        ))}
        <div className="note-box">
          Hội thoại làm mới khi bạn đổi công trường hoặc cấu hình để tránh dùng
          nhầm số liệu.
        </div>
        {!available && (
          <p className="footnote">
            Bật AI bằng OPENAI_API_KEY, OPENAI_MODEL và AI_ACCESS_TOKEN trong
            .env.local. Xem README của dự án.
          </p>
        )}
      </aside>
    </div>
  );
}
