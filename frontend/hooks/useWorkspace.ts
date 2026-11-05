"use client";
import { api, ApiError } from "@/lib/api";
import type {
  Config,
  ScenarioRecord,
  Simulation,
  Site,
} from "@greensite/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
export function useWorkspace(notify: (message: string) => void) {
  const [sites, setSites] = useState<Site[]>([]),
    [siteId, setSiteId] = useState("");
  const [record, setRecord] = useState<ScenarioRecord | null>(null),
    [config, setConfig] = useState<Config | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null),
    [loading, setLoading] = useState(true),
    [calculating, setCalculating] = useState(false),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(""),
    [simulationError, setSimulationError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [simAttempt, setSimAttempt] = useState(0);
  const savingLock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    api
      .sites(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setSites(data.sites);
        setSiteId((id) => id || data.sites[0]?.id || "");
        if (!data.sites.length) {
          setError("Chưa có công trường trên máy chủ.");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (!siteId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSimulationError("");
    setRecord(null);
    setConfig(null);
    setSim(null);
    api
      .scenario(siteId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRecord(data);
          setConfig(data.config);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [siteId, attempt]);
  useEffect(() => {
    if (!config || !record?.site.id) return;
    const controller = new AbortController();
    setCalculating(true);
    setSimulationError("");
    const timer = setTimeout(() => {
      api
        .simulate({ siteId: record.site.id, config }, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setSim(result);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setSimulationError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setCalculating(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [config, record?.site.id, simAttempt]);
  function change<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((current) => (current ? { ...current, [key]: value } : current));
  }
  function reset() {
    if (record) {
      setConfig({ ...record.defaults });
      notify("Đã khôi phục cấu hình mẫu. Bấm Lưu để ghi vào máy chủ.");
    }
  }
  async function save() {
    if (!record || !config || savingLock.current) return;
    if (record.persistence === "demo") {
      notify("Bản demo chưa kết nối database; chưa lưu được kịch bản.");
      return;
    }
    savingLock.current = true;
    setSaving(true);
    try {
      const data = await api.saveScenario(
        record.site.id,
        config,
        record.revision,
      );
      setRecord((current) =>
        current?.site.id === data.site.id ? data : current,
      );
      notify(`Đã lưu kịch bản ${data.site.name} · phiên bản ${data.revision}.`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "REVISION_CONFLICT")
        notify(
          "Có phiên khác vừa lưu kịch bản. Bấm Tải lại từ máy chủ trước khi tiếp tục.",
        );
      else notify(e instanceof Error ? e.message : "Không lưu được kịch bản.");
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const retrySimulation = useCallback(() => setSimAttempt((n) => n + 1), []);
  const pending =
    calculating ||
    !sim ||
    sim.site.id !== siteId ||
    !sameConfig(sim.config, config);
  const saved = !!record?.saved && sameConfig(record.config, config);
  return {
    sites,
    siteId,
    selectSite: setSiteId,
    record,
    config,
    sim,
    loading,
    error,
    simulationError,
    pending,
    saved,
    saving,
    change,
    reset,
    save,
    retry,
    retrySimulation,
  };
}

function sameConfig(a: Config | null, b: Config | null) {
  return (
    !!a &&
    !!b &&
    Object.entries(a).every(([key, value]) => b[key as keyof Config] === value)
  );
}
