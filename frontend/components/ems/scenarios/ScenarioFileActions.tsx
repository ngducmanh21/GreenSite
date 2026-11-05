"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import {
  parseConfig,
  parseScenarioFile,
  SCENARIO_FILE_MAX_BYTES,
  type Config,
  type ScenarioFile,
} from "@greensite/contracts";
export function ScenarioFileActions({
  siteId,
  config,
  onImport,
  notify,
}: {
  siteId: string;
  config: Config;
  onImport: (config: Config) => void;
  notify: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    mounted = useRef(true);
  const [error, setError] = useState(""),
    [reading, setReading] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function exportFile() {
    try {
      const file: ScenarioFile = {
        format: "greensite-scenario",
        version: 1,
        siteId,
        exportedAt: new Date().toISOString(),
        config: parseConfig(config),
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `GreenSite-${siteId}.greensite.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError("");
      notify("Đã xuất cấu hình JSON để lưu trên máy của bạn.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xuất được cấu hình.");
    }
  }
  async function importFile(file: File) {
    setError("");
    setReading(true);
    try {
      if (file.size > SCENARIO_FILE_MAX_BYTES)
        throw new Error("Tệp cấu hình tối đa 20 KB.");
      const text = await file.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text.replace(/^\uFEFF/, ""));
      } catch {
        throw new Error("Tệp không phải JSON hợp lệ.");
      }
      const value = parseScenarioFile(raw);
      if (value.siteId !== siteId)
        throw new Error(
          `Tệp thuộc công trường “${value.siteId}”. Hãy chọn đúng công trường trước khi nhập.`,
        );
      if (!mounted.current) return;
      onImport(value.config);
      notify(
        "Đã nhập cấu hình từ tệp. Kết quả đang được tính lại; cấu hình chưa lưu lên máy chủ.",
      );
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Không đọc được cấu hình.");
    } finally {
      if (mounted.current) setReading(false);
    }
  }
  return (
    <div className="scenario-files">
      <div className="file-actions">
        <button type="button" className="button secondary" onClick={exportFile}>
          <Download size={15} />
          Xuất cấu hình
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={reading}
          onClick={() => input.current?.click()}
        >
          <Upload size={15} />
          {reading ? "Đang đọc…" : "Nhập cấu hình"}
        </button>
      </div>
      <input
        ref={input}
        aria-label="Chọn tệp cấu hình GreenSite"
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importFile(file);
        }}
      />
      <p>
        Giữ phương án bằng tệp JSON trên máy, dùng lại cả khi chưa có database.
      </p>
      {error && (
        <div className="file-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
