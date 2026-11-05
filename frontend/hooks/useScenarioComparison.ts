"use client";
import { useEffect, useState } from "react";
import type { Config, ScenarioComparison } from "@greensite/contracts";
import { api } from "@/lib/api";

export function useScenarioComparison(siteId: string, config: Config | null) {
  const [reference, setReference] = useState<{
    siteId: string;
    config: Config;
  } | null>(null);
  const [resolved, setResolved] = useState<{
    key: string;
    data: ScenarioComparison;
  } | null>(null);
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const active = reference?.siteId === siteId && config !== null;
  const key = active
    ? JSON.stringify([siteId, reference.config, config, attempt])
    : "";
  useEffect(() => {
    setReference(null);
    setResolved(null);
    setFailure(null);
  }, [siteId]);
  useEffect(() => {
    if (!active || !reference || !config) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .compare(
          { siteId, reference: reference.config, candidate: config },
          controller.signal,
        )
        .then((data) => {
          if (!controller.signal.aborted) {
            setResolved({ key, data });
            setFailure(null);
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setFailure({
              key,
              message:
                error instanceof Error
                  ? error.message
                  : "Không thể so sánh phương án.",
            });
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, active, siteId, reference, config]);
  return {
    reference: active ? reference.config : null,
    result: resolved?.key === key ? resolved.data : null,
    error: failure?.key === key ? failure.message : "",
    pending: !!active && resolved?.key !== key && failure?.key !== key,
    pin(value: Config) {
      setReference({ siteId, config: { ...value } });
      setResolved(null);
      setFailure(null);
    },
    clear() {
      setReference(null);
      setResolved(null);
      setFailure(null);
    },
    retry() {
      setAttempt((n) => n + 1);
    },
  };
}
export type ScenarioComparisonState = ReturnType<typeof useScenarioComparison>;
