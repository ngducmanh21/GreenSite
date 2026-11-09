"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Site = {
  id: string;
  name: string;
  location: string;
  grid_limit_kw: number;
  tariff: { offPeak: number; normal: number; peak: number };
};
type Workspace = {
  organization: { id: string; name: string };
  identity: { role: string; label: string };
  sites: Site[];
  keys?: {
    id: string;
    role: string;
    label: string;
    created_at: string;
    revoked_at: string | null;
  }[];
  controlMode: string;
};
type Reading = {
  id: string;
  measured_at: string;
  imported_kwh: number;
  exported_kwh: number;
  pv_kwh: number;
  diesel_kwh: number;
  quality: string;
  source: string;
};
type Invoice = {
  id: string;
  period_start: string;
  period_end: string;
  billed_kwh: number;
  amount_vnd: number;
  reference: string;
  supplier: string;
};
type Load = {
  id: string;
  name: string;
  category: string;
  rated_kw: number;
  earliest_hour: number;
  latest_hour: number;
  required_hours: number;
};
type Report = {
  dataStatus: string;
  totals: {
    measured_imported_kwh: number;
    measured_pv_kwh: number;
    measured_diesel_kwh: number;
    measured_intervals: number;
    simulated_intervals: number;
  };
  reconciliation: {
    invoiceId: string;
    reference: string;
    periodStart: string;
    periodEnd: string;
    billedKwh: number;
    amountVnd: number;
    measuredKwh: number;
    gapKwh: number;
    comparable: boolean;
  }[];
  estimatedGridCarbonKg: number;
  estimatedDieselCarbonKg: number;
  emissionFactor: {
    grid: number;
    diesel: number;
    source: string;
    validFrom: string;
  };
  note: string;
};
type Plan = {
  id: string;
  mode: string;
  day: string;
  zeroExportRequested: boolean;
  approved: boolean;
  dispatched: boolean;
  assignments: {
    id: string;
    name: string;
    category: string;
    startHour: number;
    endHour: number;
    ratedKw: number;
  }[];
  warnings: string[];
  inputSource: string;
  peakScheduledKw: number;
  assumptions: string;
};
const fmt = (value: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
async function request<T>(
  path: string,
  token: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/pilot${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data as T;
}
const sampleDate = () => new Date().toISOString().slice(0, 10);
function saveCSV(filename: string, rows: (string | number)[][]) {
  const cell = (value: string | number) => {
    let text = String(value);
    if (typeof value === "string" && /^[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv =
    "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PilotPage() {
  const [token, setToken] = useState("");
  const [rootToken, setRootToken] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [siteId, setSiteId] = useState("");
  const [readings, setReadings] = useState<Reading[]>([]),
    [invoices, setInvoices] = useState<Invoice[]>([]),
    [loads, setLoads] = useState<Load[]>([]);
  const [report, setReport] = useState<Report | null>(null),
    [plan, setPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [issuedKey, setIssuedKey] = useState("");
  const [orgName, setOrgName] = useState(""),
    [siteName, setSiteName] = useState(""),
    [location, setLocation] = useState("");
  const [factorSource, setFactorSource] = useState(
    "Hệ số pilot do người dùng khai báo",
  );
  const [gridFactor, setGridFactor] = useState(0.6592),
    [dieselFactor, setDieselFactor] = useState(0.7504);
  const [gridLimit, setGridLimit] = useState(500),
    [offPeak, setOffPeak] = useState(1800),
    [normal, setNormal] = useState(2900),
    [peak, setPeak] = useState(5100),
    [offPeakHours, setOffPeakHours] = useState(""),
    [peakHours, setPeakHours] = useState("");
  const [invoiceStart, setInvoiceStart] = useState(sampleDate()),
    [invoiceEnd, setInvoiceEnd] = useState(sampleDate());
  const [invoiceKwh, setInvoiceKwh] = useState(0),
    [invoiceAmount, setInvoiceAmount] = useState(0),
    [supplier, setSupplier] = useState(""),
    [invoiceRef, setInvoiceRef] = useState("");
  const [loadName, setLoadName] = useState(""),
    [loadCategory, setLoadCategory] = useState("shiftable"),
    [loadKw, setLoadKw] = useState(10),
    [loadEarliest, setLoadEarliest] = useState(7),
    [loadLatest, setLoadLatest] = useState(18),
    [loadRequired, setLoadRequired] = useState(4);
  const [planDate, setPlanDate] = useState(sampleDate()),
    [zeroExport, setZeroExport] = useState(true);
  const [keyLabel, setKeyLabel] = useState(""),
    [keyRole, setKeyRole] = useState("viewer");
  const site = workspace?.sites.find((item) => item.id === siteId);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await task();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  };
  const loadWorkspace = useCallback(async (access: string) => {
    const data = await request<Workspace>("/workspace", access);
    setWorkspace(data);
    setSiteId((old) =>
      data.sites.some((s) => s.id === old) ? old : (data.sites[0]?.id ?? ""),
    );
  }, []);
  const refreshSite = useCallback(async (access: string, id: string) => {
    const [r, i, l, p] = await Promise.all([
      request<{ items: Reading[] }>(`/sites/${id}/readings`, access),
      request<{ items: Invoice[] }>(`/sites/${id}/invoices`, access),
      request<{ items: Load[] }>(`/sites/${id}/loads`, access),
      request<Report>(`/sites/${id}/report`, access),
    ]);
    setReadings(r.items);
    setInvoices(i.items);
    setLoads(l.items);
    setReport(p);
  }, []);
  useEffect(() => {
    if (token && siteId)
      refreshSite(token, siteId).catch((e) => setMessage(e.message));
  }, [token, siteId, refreshSite]);
  async function addSynthetic() {
    if (!siteId) return;
    const result = await request<{ accepted: number; commandsSent: number }>(
      `/sites/${siteId}/adapter/run`,
      token,
      "POST",
      { day: planDate },
    );
    await refreshSite(token, siteId);
    setMessage(
      `Adapter giả lập tạo ${result.accepted} số đo; ${result.commandsSent} lệnh thiết bị được gửi.`,
    );
  }
  async function importCSV(file: File) {
    if (!siteId) return;
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    const headers =
      lines
        .shift()
        ?.split(",")
        .map((s) => s.trim()) ?? [];
    const needed = [
      "measuredAt",
      "importedKwh",
      "exportedKwh",
      "pvKwh",
      "dieselKwh",
      "bessChargeKwh",
      "bessDischargeKwh",
      "socPct",
    ];
    if (!needed.every((name) => headers.includes(name)))
      throw new Error(`CSV cần các cột: ${needed.join(", ")}`);
    const rows = lines.filter(Boolean).map((line) => {
      const cells = line.split(","),
        r = Object.fromEntries(headers.map((h, i) => [h, cells[i]?.trim()]));
      const numeric = (name: string) => {
        const value = r[name];
        if (value === undefined || value === "")
          throw new Error(`CSV thiếu ${name}.`);
        const result = Number(value);
        if (!Number.isFinite(result))
          throw new Error(`CSV có ${name} không hợp lệ.`);
        return result;
      };
      return {
        measuredAt: r.measuredAt,
        importedKwh: numeric("importedKwh"),
        exportedKwh: numeric("exportedKwh"),
        pvKwh: numeric("pvKwh"),
        dieselKwh: numeric("dieselKwh"),
        bessChargeKwh: numeric("bessChargeKwh"),
        bessDischargeKwh: numeric("bessDischargeKwh"),
        socPct: r.socPct ? numeric("socPct") : null,
        quality: r.quality || "estimated",
        source: "import",
      };
    });
    if (!rows.length) throw new Error("CSV không có dòng dữ liệu.");
    for (let i = 0; i < rows.length; i += 40)
      await request(`/sites/${siteId}/readings`, token, "POST", {
        readings: rows.slice(i, i + 40),
      });
    await refreshSite(token, siteId);
    setMessage(`Đã nhập ${rows.length} số đo từ CSV.`);
  }
  function exportReport() {
    if (!report || !site || !workspace) return;
    saveCSV(`GreenSite-${site.id}-pilot-report.csv`, [
      ["GreenSite EMS pilot report", "simulation control mode"],
      ["Organization", workspace.organization.name],
      ["Site", site.name],
      ["Data status", report.dataStatus],
      ["Measured grid import kWh", report.totals.measured_imported_kwh],
      ["Measured PV kWh", report.totals.measured_pv_kwh],
      ["Measured diesel kWh", report.totals.measured_diesel_kwh],
      ["Estimated grid CO2 kg", report.estimatedGridCarbonKg],
      ["Estimated diesel CO2 kg", report.estimatedDieselCarbonKg],
      ["Grid factor kg/kWh", report.emissionFactor.grid],
      ["Diesel factor kg/kWh", report.emissionFactor.diesel],
      ["Factor source", report.emissionFactor.source],
      ["Factor valid from", report.emissionFactor.validFrom],
      [],
      [
        "Invoice",
        "Period start",
        "Period end",
        "Billed kWh",
        "Measured kWh",
        "Gap kWh",
        "Amount VND",
        "Comparable",
      ],
      ...report.reconciliation.map((r) => [
        r.reference,
        r.periodStart,
        r.periodEnd,
        r.billedKwh,
        r.measuredKwh,
        r.gapKwh,
        r.amountVnd,
        r.comparable ? "yes" : "no",
      ]),
      [],
      ["Note", report.note],
    ]);
  }
  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900";
  const button =
    "rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50";
  const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              GreenSite EMS · Pilot
            </p>
            <h1 className="text-3xl font-bold">
              Dữ liệu và điều phối công trường
            </h1>
            <p className="text-slate-600">
              Adapter giả lập · Không gửi lệnh đến thiết bị điện
            </p>
          </div>
          <Link className="text-emerald-700 underline" href="/demo">
            Về mô phỏng
          </Link>
        </header>
        {!workspace ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className={card}>
              <h2 className="text-xl font-semibold">Vào không gian pilot</h2>
              <p className="my-2 text-sm text-slate-600">
                Mã truy cập chỉ giữ trong phiên trang này.
              </p>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => loadWorkspace(token));
                }}
              >
                <input
                  className={`${input} min-w-0 flex-1`}
                  type="password"
                  aria-label="Mã truy cập pilot"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Mã truy cập tổ chức"
                />
                <button className={button} disabled={busy}>
                  Mở
                </button>
              </form>
            </section>
            <section className={card}>
              <h2 className="text-xl font-semibold">Tạo tổ chức đầu tiên</h2>
              <p className="my-2 text-sm text-slate-600">
                Cần cấu hình PILOT_ROOT_TOKEN trên Site service.
              </p>
              <form
                className="grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const data = await request<{ access: { token: string } }>(
                      "/admin/organizations",
                      rootToken,
                      "POST",
                      { name: orgName, adminLabel: "Quản trị pilot" },
                    );
                    setIssuedKey(data.access.token);
                    setToken(data.access.token);
                    await loadWorkspace(data.access.token);
                  });
                }}
              >
                <input
                  className={input}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Tên tổ chức"
                />
                <input
                  className={input}
                  type="password"
                  value={rootToken}
                  onChange={(e) => setRootToken(e.target.value)}
                  placeholder="PILOT_ROOT_TOKEN"
                />
                <button className={button} disabled={busy}>
                  Tạo tổ chức
                </button>
              </form>
            </section>
          </div>
        ) : (
          <>
            <section
              className={`${card} flex flex-wrap items-center justify-between gap-3`}
            >
              <div>
                <strong>{workspace.organization.name}</strong>
                <p className="text-sm text-slate-600">
                  {workspace.identity.label} · {workspace.identity.role} · chế
                  độ {workspace.controlMode}
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  className={input}
                  value={siteId}
                  onChange={(e) => {
                    setSiteId(e.target.value);
                    setPlan(null);
                  }}
                >
                  <option value="">Chọn công trường</option>
                  {workspace.sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-lg border px-3"
                  onClick={() => {
                    setWorkspace(null);
                    setToken("");
                    setIssuedKey("");
                  }}
                >
                  Thoát
                </button>
              </div>
            </section>
            {workspace.identity.role === "admin" && (
              <section className={card}>
                <h2 className="mb-3 text-xl font-semibold">
                  Tài khoản và công trường
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <form
                    className="grid gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(async () => {
                        await request("/sites", token, "POST", {
                          name: siteName,
                          location,
                          gridLimitKw: gridLimit,
                          emissionFactor: gridFactor,
                          dieselFactor,
                          factorSource,
                          tariff: {
                            offPeak,
                            normal,
                            peak,
                            offPeakHours: offPeakHours.trim()
                              ? offPeakHours
                                  .split(",")
                                  .map((h) => Number(h.trim()))
                              : [],
                            peakHours: peakHours.trim()
                              ? peakHours
                                  .split(",")
                                  .map((h) => Number(h.trim()))
                              : [],
                          },
                        });
                        await loadWorkspace(token);
                        setSiteName("");
                        setMessage(
                          "Đã tạo công trường. Giá và hệ số là giá trị khởi tạo, cần kiểm tra trước khi dùng.",
                        );
                      });
                    }}
                  >
                    <strong>Thêm công trường</strong>
                    <input
                      className={input}
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="Tên công trường"
                    />
                    <input
                      className={input}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Địa điểm"
                    />
                    <input
                      className={input}
                      value={factorSource}
                      onChange={(e) => setFactorSource(e.target.value)}
                      placeholder="Nguồn hệ số phát thải"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        Giới hạn lưới kW
                        <input
                          className={`${input} w-full`}
                          type="number"
                          min="1"
                          value={gridLimit}
                          onChange={(e) => setGridLimit(Number(e.target.value))}
                        />
                      </label>
                      <label>
                        CO₂ lưới kg/kWh
                        <input
                          className={`${input} w-full`}
                          type="number"
                          step="0.0001"
                          min="0"
                          value={gridFactor}
                          onChange={(e) =>
                            setGridFactor(Number(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        CO₂ diesel kg/kWh
                        <input
                          className={`${input} w-full`}
                          type="number"
                          step="0.0001"
                          min="0"
                          value={dieselFactor}
                          onChange={(e) =>
                            setDieselFactor(Number(e.target.value))
                          }
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label>
                        Giá thấp
                        <input
                          className={`${input} w-full`}
                          type="number"
                          min="0"
                          value={offPeak}
                          onChange={(e) => setOffPeak(Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Giá thường
                        <input
                          className={`${input} w-full`}
                          type="number"
                          min="0"
                          value={normal}
                          onChange={(e) => setNormal(Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Giá cao
                        <input
                          className={`${input} w-full`}
                          type="number"
                          min="0"
                          value={peak}
                          onChange={(e) => setPeak(Number(e.target.value))}
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        Giờ thấp điểm (0–23, cách nhau bằng dấu phẩy)
                        <input
                          className={`${input} w-full`}
                          value={offPeakHours}
                          onChange={(e) => setOffPeakHours(e.target.value)}
                          placeholder="0,1,2,3,4,5"
                        />
                      </label>
                      <label>
                        Giờ cao điểm
                        <input
                          className={`${input} w-full`}
                          value={peakHours}
                          onChange={(e) => setPeakHours(e.target.value)}
                          placeholder="17,18,19"
                        />
                      </label>
                    </div>
                    <button className={button} disabled={busy}>
                      Thêm công trường
                    </button>
                  </form>
                  <form
                    className="grid gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(async () => {
                        const key = await request<{ token: string }>(
                          "/keys",
                          token,
                          "POST",
                          { label: keyLabel, role: keyRole },
                        );
                        setIssuedKey(key.token);
                        setKeyLabel("");
                        await loadWorkspace(token);
                      });
                    }}
                  >
                    <strong>Cấp mã theo vai trò</strong>
                    <input
                      className={input}
                      value={keyLabel}
                      onChange={(e) => setKeyLabel(e.target.value)}
                      placeholder="Tên người dùng"
                    />
                    <select
                      className={input}
                      value={keyRole}
                      onChange={(e) => setKeyRole(e.target.value)}
                    >
                      <option value="viewer">Chỉ xem</option>
                      <option value="engineer">Kỹ sư</option>
                      <option value="admin">Quản trị</option>
                    </select>
                    <button className={button} disabled={busy}>
                      Cấp mã
                    </button>
                  </form>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th>Người dùng</th>
                        <th>Vai trò</th>
                        <th>Trạng thái</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspace.keys?.map((key) => (
                        <tr className="border-t" key={key.id}>
                          <td>{key.label}</td>
                          <td>{key.role}</td>
                          <td>{key.revoked_at ? "Đã thu hồi" : "Đang dùng"}</td>
                          <td>
                            {!key.revoked_at && (
                              <button
                                className="text-red-700 underline"
                                disabled={busy}
                                onClick={() =>
                                  run(async () => {
                                    await request(
                                      `/keys/${key.id}`,
                                      token,
                                      "DELETE",
                                    );
                                    await loadWorkspace(token);
                                  })
                                }
                              >
                                Thu hồi
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {site && (
              <>
                <div className="grid gap-5 lg:grid-cols-2">
                  <section className={card}>
                    <h2 className="text-xl font-semibold">
                      1 · Số đo và hóa đơn
                    </h2>
                    <p className="my-2 text-sm text-slate-600">
                      {readings.length} số đo đang hiển thị · {invoices.length}{" "}
                      hóa đơn
                    </p>
                    <button
                      className={button}
                      disabled={busy || workspace.identity.role === "viewer"}
                      onClick={() => run(addSynthetic)}
                    >
                      Tạo 96 số đo giả lập
                    </button>
                    <label className="mt-3 block text-sm">
                      Nhập CSV số đo
                      <input
                        className="mt-1 block w-full"
                        type="file"
                        accept=".csv,text/csv"
                        disabled={busy || workspace.identity.role === "viewer"}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) run(() => importCSV(file));
                        }}
                      />
                    </label>
                    <button
                      className="mt-2 text-sm text-emerald-700 underline"
                      onClick={() =>
                        saveCSV("greensite-readings-template.csv", [
                          [
                            "measuredAt",
                            "importedKwh",
                            "exportedKwh",
                            "pvKwh",
                            "dieselKwh",
                            "bessChargeKwh",
                            "bessDischargeKwh",
                            "socPct",
                            "quality",
                          ],
                          [
                            "2026-11-01T00:00:00Z",
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            50,
                            "measured",
                          ],
                        ])
                      }
                    >
                      Tải mẫu CSV
                    </button>
                    <p className="mt-2 text-xs text-slate-500">
                      CSV đơn giản không có dấu phẩy trong ô. Cột
                      quality=measured là xác nhận của người nhập; chưa phải xác
                      minh thiết bị. Cột: measuredAt, importedKwh, exportedKwh,
                      pvKwh, dieselKwh, bessChargeKwh, bessDischargeKwh, socPct;
                      tùy chọn quality.
                    </p>
                    <form
                      className="mt-4 grid grid-cols-2 gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async () => {
                          await request(
                            `/sites/${siteId}/invoices`,
                            token,
                            "POST",
                            {
                              periodStart: invoiceStart,
                              periodEnd: invoiceEnd,
                              billedKwh: invoiceKwh,
                              amountVnd: invoiceAmount,
                              supplier,
                              reference: invoiceRef,
                            },
                          );
                          await refreshSite(token, siteId);
                          setMessage("Đã thêm hóa đơn.");
                        });
                      }}
                    >
                      <input
                        className={input}
                        type="date"
                        value={invoiceStart}
                        onChange={(e) => setInvoiceStart(e.target.value)}
                      />
                      <input
                        className={input}
                        type="date"
                        value={invoiceEnd}
                        onChange={(e) => setInvoiceEnd(e.target.value)}
                      />
                      <input
                        className={input}
                        type="number"
                        min="0"
                        value={invoiceKwh}
                        onChange={(e) => setInvoiceKwh(Number(e.target.value))}
                        placeholder="kWh hóa đơn"
                      />
                      <input
                        className={input}
                        type="number"
                        min="0"
                        value={invoiceAmount}
                        onChange={(e) =>
                          setInvoiceAmount(Number(e.target.value))
                        }
                        placeholder="Tiền VND"
                      />
                      <input
                        className={input}
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        placeholder="Nhà cung cấp điện"
                      />
                      <input
                        className={input}
                        value={invoiceRef}
                        onChange={(e) => setInvoiceRef(e.target.value)}
                        placeholder="Mã hóa đơn"
                      />
                      <button
                        className={`${button} col-span-2`}
                        disabled={busy || workspace.identity.role === "viewer"}
                      >
                        Lưu hóa đơn
                      </button>
                    </form>
                  </section>
                  <section className={card}>
                    <h2 className="text-xl font-semibold">
                      2 · Nhóm tải và kế hoạch
                    </h2>
                    <p className="my-2 text-sm text-slate-600">
                      Kế hoạch chỉ là đề xuất mô phỏng, chưa phê duyệt hay gửi
                      lệnh.
                    </p>
                    <form
                      className="grid grid-cols-2 gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async () => {
                          await request(
                            `/sites/${siteId}/loads`,
                            token,
                            "POST",
                            {
                              name: loadName,
                              category: loadCategory,
                              ratedKw: loadKw,
                              earliestHour: loadEarliest,
                              latestHour: loadLatest,
                              requiredHours: loadRequired,
                            },
                          );
                          await refreshSite(token, siteId);
                          setLoadName("");
                        });
                      }}
                    >
                      <input
                        className={`${input} col-span-2`}
                        value={loadName}
                        onChange={(e) => setLoadName(e.target.value)}
                        placeholder="Nhóm tải"
                      />
                      <select
                        className={input}
                        value={loadCategory}
                        onChange={(e) => setLoadCategory(e.target.value)}
                      >
                        <option value="essential">Thiết yếu</option>
                        <option value="shiftable">Dời lịch được</option>
                        <option value="curtailable">Giảm được</option>
                      </select>
                      <input
                        className={input}
                        type="number"
                        min="0"
                        value={loadKw}
                        onChange={(e) => setLoadKw(Number(e.target.value))}
                        placeholder="Công suất kW"
                      />
                      <label>
                        Giờ sớm nhất
                        <input
                          className={`${input} w-full`}
                          type="number"
                          min="0"
                          max="23"
                          value={loadEarliest}
                          onChange={(e) =>
                            setLoadEarliest(Number(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        Giờ muộn nhất
                        <input
                          className={`${input} w-full`}
                          type="number"
                          min="1"
                          max="24"
                          value={loadLatest}
                          onChange={(e) =>
                            setLoadLatest(Number(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        Số giờ cần chạy
                        <input
                          className={`${input} w-full`}
                          type="number"
                          min="1"
                          max="24"
                          value={loadRequired}
                          onChange={(e) =>
                            setLoadRequired(Number(e.target.value))
                          }
                        />
                      </label>
                      <button
                        className={`${button} col-span-2`}
                        disabled={busy || workspace.identity.role === "viewer"}
                      >
                        Thêm nhóm tải
                      </button>
                    </form>
                    <ul className="my-3 text-sm">
                      {loads.map((load) => (
                        <li key={load.id} className="border-b py-1">
                          {load.name} · {load.category} · {fmt(load.rated_kw)}{" "}
                          kW · {load.earliest_hour}–{load.latest_hour}h · chạy{" "}
                          {load.required_hours}h
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        className={input}
                        type="date"
                        value={planDate}
                        onChange={(e) => setPlanDate(e.target.value)}
                      />
                      <label className="text-sm">
                        <input
                          type="checkbox"
                          checked={zeroExport}
                          onChange={(e) => setZeroExport(e.target.checked)}
                        />{" "}
                        Yêu cầu Zero-Export
                      </label>
                      <button
                        className={button}
                        disabled={busy || workspace.identity.role === "viewer"}
                        onClick={() =>
                          run(async () => {
                            setPlan(
                              await request<Plan>(
                                `/sites/${siteId}/plans`,
                                token,
                                "POST",
                                { day: planDate, zeroExport },
                              ),
                            );
                          })
                        }
                      >
                        Tạo kế hoạch mô phỏng
                      </button>
                    </div>
                    {plan && (
                      <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
                        <strong>
                          {plan.day} · {plan.mode}
                        </strong>
                        <p>Chưa phê duyệt · chưa gửi lệnh</p>
                        <p className="text-slate-600">{plan.assumptions}</p>
                        {plan.warnings.map((w) => (
                          <p key={w} className="text-amber-800">
                            {w}
                          </p>
                        ))}
                        {plan.assignments.map((a) => (
                          <p key={a.id}>
                            {a.name}: {a.startHour}–{a.endHour}h
                          </p>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
                <section className={card}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <h2 className="text-xl font-semibold">
                      3 · Báo cáo và đối soát
                    </h2>
                    <button className={button} onClick={exportReport}>
                      Tải CSV báo cáo
                    </button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Trạng thái:{" "}
                    {report?.dataStatus === "simulation_only"
                      ? "Chỉ có giả lập"
                      : "Có số đo do người dùng khai báo"}
                    . Giá trị giả lập không được cộng vào số liệu thực.
                  </p>
                  <div className="my-4 grid gap-3 sm:grid-cols-4">
                    <Stat
                      label="Điện lưới đo"
                      value={`${fmt(report?.totals.measured_imported_kwh ?? 0)} kWh`}
                    />
                    <Stat
                      label="PV đo"
                      value={`${fmt(report?.totals.measured_pv_kwh ?? 0)} kWh`}
                    />
                    <Stat
                      label="Diesel đo"
                      value={`${fmt(report?.totals.measured_diesel_kwh ?? 0)} kWh`}
                    />
                    <Stat
                      label="CO₂ vận hành ước tính"
                      value={`${fmt((report?.estimatedGridCarbonKg ?? 0) + (report?.estimatedDieselCarbonKg ?? 0))} kg`}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Hệ số lưới/diesel: {report?.emissionFactor.grid} /{" "}
                    {report?.emissionFactor.diesel} kg/kWh ·{" "}
                    {report?.emissionFactor.source} · từ{" "}
                    {report?.emissionFactor.validFrom}
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th>Hóa đơn</th>
                          <th>Kỳ</th>
                          <th>kWh hóa đơn</th>
                          <th>kWh đo</th>
                          <th>Chênh lệch</th>
                          <th>Tiền thực trả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report?.reconciliation.map((r) => (
                          <tr key={r.invoiceId} className="border-b">
                            <td>{r.reference}</td>
                            <td>
                              {r.periodStart} – {r.periodEnd}
                            </td>
                            <td>{fmt(r.billedKwh)}</td>
                            <td>
                              {r.comparable ? fmt(r.measuredKwh) : "Chưa có"}
                            </td>
                            <td>{r.comparable ? fmt(r.gapKwh) : "—"}</td>
                            <td>{fmt(r.amountVnd)} ₫</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{report?.note}</p>
                </section>
              </>
            )}
          </>
        )}
        {issuedKey && (
          <div
            className="rounded-xl border border-amber-300 bg-amber-50 p-4"
            role="status"
          >
            <strong>
              Mã truy cập mới — sao chép ngay, hệ thống không hiển thị lại:
            </strong>
            <code className="mt-2 block break-all">{issuedKey}</code>
            <button className="mt-2 underline" onClick={() => setIssuedKey("")}>
              Đã lưu
            </button>
          </div>
        )}
        {message && (
          <p className="rounded-xl bg-slate-800 p-3 text-white" role="status">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-emerald-50 p-3">
      <span className="block text-xs text-slate-600">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
