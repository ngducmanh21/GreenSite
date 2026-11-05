"use client";
import { useScenarioComparison } from "@/hooks/useScenarioComparison";
import { useWorkspace } from "@/hooks/useWorkspace";
import { api } from "@/lib/api";
import type { Simulation } from "@greensite/contracts";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Assistant } from "./Assistant";
import { BrandMark } from "./Brand";
import { AppShell } from "./layout/AppShell";
import type { View } from "./navigation";
import { AlertsView } from "./views/AlertsView";
import { EquipmentView } from "./views/EquipmentView";
import { OverviewView } from "./views/OverviewView";
import { ReportsView } from "./views/ReportsView";
import { ScenariosView } from "./views/ScenariosView";

/** Coordinates view/UI state only. All domain data comes from the API gateway. */
export default function Dashboard() {
  const [view, setView] = useState<View>("overview");
  const [toast, setToast] = useState("");
  const notify = useCallback((message: string) => setToast(message), []);
  const workspace = useWorkspace(notify);
  const comparison = useScenarioComparison(workspace.siteId, workspace.config);
  const [index, setIndex] = useState(52),
    [playing, setPlaying] = useState(false),
    [exporting, setExporting] = useState(false);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  useEffect(() => {
    setAcknowledged([]);
    setPlaying(false);
  }, [workspace.siteId, workspace.config]);
  useEffect(() => {
    if (view !== "overview") setPlaying(false);
  }, [view]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % 96), 700);
    return () => clearInterval(timer);
  }, [playing]);
  const { sim, record, config } = workspace;
  const busy = workspace.pending || !!workspace.simulationError;
  async function download(result: Simulation) {
    if (busy || exporting) return;
    setExporting(true);
    try {
      await api.download(result);
      notify("Đã xuất báo cáo CSV từ máy chủ, kèm cấu hình và hệ số mô phỏng.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Không xuất được báo cáo.",
      );
    } finally {
      setExporting(false);
    }
  }
  if (workspace.error)
    return <WorkspaceState error={workspace.error} retry={workspace.retry} />;
  if (!record || !config || !sim)
    return (
      <WorkspaceState
        error={workspace.simulationError}
        retry={
          workspace.simulationError
            ? workspace.retrySimulation
            : workspace.retry
        }
      />
    );
  const site = record.site;
  const activeAlerts = sim.alerts.filter(
    (a) => a.severity !== "info" && !acknowledged.includes(a.id),
  );
  return (
    <AppShell
      view={view}
      onNavigate={setView}
      sites={workspace.sites}
      site={site}
      siteId={workspace.siteId}
      selectSite={workspace.selectSite}
      activeAlertCount={activeAlerts.length}
      toast={toast}
      setToast={setToast}
      busy={busy || exporting}
      simulationDate={sim.date}
      onExport={() => download(sim)}
    >
      {record.persistence === "demo" && (
        <div className="service-status" role="status">
          <span>
            <strong>Bản demo trực tuyến</strong> · Chưa kết nối database. Bạn có
            thể thử kịch bản, xuất báo cáo và hỏi trợ lý. Dùng Nhập/Xuất cấu
            hình trong tab Kịch bản để giữ phương án bằng tệp; dữ liệu chưa lưu
            lên máy chủ.
          </span>
        </div>
      )}
      {(busy || workspace.simulationError) && (
        <div
          className={`service-status ${workspace.simulationError ? "failed" : ""}`}
          role={workspace.simulationError ? "alert" : "status"}
        >
          {workspace.simulationError ? (
            <>
              <span>
                {workspace.simulationError} Kết quả bên dưới là lần tính trước.
              </span>
              <button
                className="button secondary"
                onClick={workspace.retrySimulation}
              >
                <RefreshCw size={15} />
                Thử lại
              </button>
            </>
          ) : (
            <>
              <Loader2 size={16} className="spin" />
              <span>
                Đang tính lại kịch bản… Kết quả sẽ cập nhật khi máy chủ phản
                hồi.
              </span>
            </>
          )}
        </div>
      )}
      {view === "overview" && (
        <OverviewView
          sim={sim}
          site={site}
          sites={workspace.sites}
          siteId={workspace.siteId}
          index={index}
          setIndex={setIndex}
          playing={playing}
          setPlaying={setPlaying}
          navigate={setView}
          selectSite={workspace.selectSite}
          setToast={setToast}
        />
      )}
      {view === "scenarios" && (
        <ScenariosView
          sim={sim}
          config={config}
          index={index}
          setIndex={setIndex}
          change={workspace.change}
          presets={record.presets}
          applyConfig={workspace.replaceConfig}
          notify={notify}
          comparison={comparison}
          saved={workspace.saved}
          saving={workspace.saving}
          canSave={record.persistence !== "demo"}
          save={workspace.save}
          resetConfig={workspace.reset}
          reloadConfig={workspace.retry}
          busy={busy}
        />
      )}
      {view === "equipment" && (
        <EquipmentView config={config} site={site} navigate={setView} />
      )}
      {view === "alerts" && (
        <AlertsView
          sim={sim}
          site={site}
          acknowledged={acknowledged}
          setAcknowledged={setAcknowledged}
          activeAlerts={activeAlerts}
        />
      )}
      {view === "reports" && (
        <ReportsView
          sim={sim}
          config={sim.config}
          site={site}
          download={download}
          busy={busy || exporting}
        />
      )}
      {view === "assistant" &&
        (busy ? (
          <div className="note-box">
            Đợi kết quả kịch bản mới trước khi hỏi trợ lý.
          </div>
        ) : (
          <Assistant
            key={`${site.id}-${JSON.stringify(sim.config)}`}
            sim={sim}
          />
        ))}
    </AppShell>
  );
}
function WorkspaceState({
  error,
  retry,
}: {
  error?: string;
  retry: () => void;
}) {
  return (
    <main className="workspace-state">
      <BrandMark />
      <h1>GreenSite EMS</h1>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <button className="button primary" onClick={retry}>
            <RefreshCw size={16} />
            Kết nối lại
          </button>
        </>
      ) : (
        <>
          <Loader2 size={22} className="spin" />
          <p>Đang tải công trường và kịch bản từ máy chủ…</p>
        </>
      )}
    </main>
  );
}
