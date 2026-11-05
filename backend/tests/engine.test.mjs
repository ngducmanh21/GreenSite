import test from "node:test";
import assert from "node:assert/strict";
import * as engine from "../dist/services/energy/engine.js";
import * as contracts from "@greensite/contracts";
import * as seed from "../dist/services/sites/seed.js";
import { reportCSV as exportCSV } from "../dist/services/energy/report.js";
import { localAnalysis as analyzeLocal } from "../dist/services/assistant/analysis.js";
const ems = {
  ...engine,
  ...contracts,
  ...seed,
  reportCSV: exportCSV,
  localAnalysis: analyzeLocal,
};
const {
  simulate,
  SITES,
  defaultConfig,
  parseConfig,
  parseSimulationRequest,
  STEP_HOURS: dt,
  FACTORS: f,
  reportCSV,
  localAnalysis,
} = ems;
const close = (a, b, tolerance = 1e-6) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
test("energy, SOC and power constraints hold across 144 boundary scenarios", () => {
  let count = 0;
  for (const site of SITES)
    for (const batteryKWh of [0, 400, 2500])
      for (const weather of ["sunny", "cloudy"])
        for (const outage of [false, true])
          for (const zeroExport of [false, true])
            for (const strategy of ["economic", "solar"]) {
              const c = {
                ...defaultConfig(site),
                batteryKWh,
                weather,
                outage,
                zeroExport,
                strategy,
                pvKW: count % 2 ? 1500 : 0,
                loadPct: count % 2 ? 40 : 180,
                gridLimitKW: count % 3 ? 50 : 1000,
                reservePct: count % 2 ? 80 : 10,
              };
              const s = simulate(site, c);
              count++;
              close(s.baseline.totals.demand, s.optimized.totals.demand);
              for (const r of [s.optimized, s.baseline]) {
                assert.equal(r.points.length, 96);
                let previous = (c.batteryKWh * c.reservePct) / 100;
                for (const p of r.points) {
                  close(
                    p.pvUsed + p.grid + p.diesel + p.discharge,
                    p.served + p.charge + p.exported + p.dumped,
                  );
                  close(p.load, p.served + p.unserved);
                  close(p.pv, p.pvUsed + p.curtailed);
                  close(
                    p.storedKWh,
                    previous +
                      p.charge * dt * f.efficiency -
                      (p.discharge * dt) / f.efficiency,
                  );
                  assert.ok(p.grid <= c.gridLimitKW + 1e-7);
                  assert.ok(
                    p.charge <= site.batteryKW + 1e-7 &&
                      p.discharge <= site.batteryKW + 1e-7,
                  );
                  assert.ok(
                    p.storedKWh >= (c.batteryKWh * c.reservePct) / 100 - 1e-7 &&
                      p.storedKWh <= c.batteryKWh * 0.95 + 1e-7,
                  );
                  assert.ok(p.charge * p.discharge < 1e-7);
                  assert.ok(p.diesel <= site.generatorKW + 1e-7);
                  if (!p.outage) close(p.diesel, 0);
                  if (p.outage) close(p.grid, 0);
                  if (c.zeroExport || p.outage) close(p.exported, 0);
                  for (const v of Object.values(p))
                    if (typeof v === "number")
                      assert.ok(Number.isFinite(v) && v >= -1e-7);
                  close(
                    p.cost,
                    p.grid * dt * p.tariff +
                      p.diesel * dt * f.dieselLitersPerKWh * c.dieselPrice +
                      p.discharge * dt * f.batteryWear,
                  );
                  previous = p.storedKWh;
                }
                assert.ok(
                  r.totals.renewablePct >= 0 &&
                    r.totals.renewablePct <= 100.00001,
                );
                close(
                  r.totals.carbon,
                  r.totals.gridCarbon + r.totals.dieselCarbon,
                );
              }
              if (!s.comparable) assert.equal(s.savingsPct, null);
            }
  assert.equal(count, 144);
});
test("default scenario has sufficient load, zero export and deterministic results", () => {
  const s = simulate(SITES[0], defaultConfig(SITES[0]));
  assert.equal(s.optimized.totals.unserved, 0);
  assert.equal(s.optimized.totals.exported, 0);
  assert.ok(s.savingsPct > 0);
  assert.deepEqual(s, simulate(SITES[0], defaultConfig(SITES[0])));
});
test("no battery or shifting reproduces baseline exactly", () => {
  const s = simulate(SITES[0], {
    ...defaultConfig(SITES[0]),
    batteryKWh: 0,
    shiftLoad: false,
    outage: true,
  });
  assert.deepEqual(s.baseline, s.optimized);
  close(s.savings, 0);
});
test("PV surplus either curtails or exports, never disappears", () => {
  const c = {
    ...defaultConfig(SITES[0]),
    batteryKWh: 0,
    pvKW: 1500,
    loadPct: 40,
  };
  const limited = simulate(SITES[0], c),
    exported = simulate(SITES[0], { ...c, zeroExport: false });
  assert.ok(limited.optimized.totals.curtailed > 0);
  assert.equal(limited.optimized.totals.exported, 0);
  close(limited.optimized.totals.curtailed, exported.optimized.totals.exported);
  assert.ok(exported.alerts.some((a) => a.id === "export"));
});
test("unserved demand prevents savings claims", () => {
  const s = simulate(SITES[0], {
    ...defaultConfig(SITES[0]),
    pvKW: 0,
    batteryKWh: 0,
    gridLimitKW: 50,
    loadPct: 180,
  });
  assert.ok(s.optimized.totals.unserved > 0);
  assert.equal(s.comparable, false);
  assert.equal(s.savingsPct, null);
  assert.ok(s.alerts.some((a) => a.id === "capacity"));
});
test("empty-price baseline cannot divide by zero", () => {
  const s = simulate(SITES[0], {
    ...defaultConfig(SITES[0]),
    batteryKWh: 0,
    offPeakRate: 0,
    normalRate: 0,
    peakRate: 0,
    dieselPrice: 0,
  });
  assert.equal(s.savingsPct, null);
});
test("invalid input is rejected and unknown fields removed", () => {
  const c = defaultConfig(SITES[0]);
  for (const v of [
    null,
    [],
    {},
    { ...c, pvKW: NaN },
    { ...c, pvKW: Infinity },
    { ...c, reservePct: 99 },
    { ...c, zeroExport: "true" },
    { ...c, weather: "storm" },
  ])
    assert.throws(() => parseConfig(v));
  assert.equal(parseConfig({ ...c, injected: "ignored" }).injected, undefined);
  assert.throws(() => parseSimulationRequest({ siteId: "bad id", config: c }));
});
test("report includes provenance, baseline and 96 data rows; analysis is explicitly local", () => {
  const s = simulate(SITES[0], defaultConfig(SITES[0])),
    csv = reportCSV(s);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes(s.modelVersion));
  assert.ok(csv.includes("Baseline"));
  assert.ok(csv.includes("00:00"));
  assert.ok(csv.includes("23:45"));
  assert.equal(
    csv.split("\r\n").filter((r) => /^"\d\d:\d\d"/.test(r)).length,
    96,
  );
  assert.ok(
    localAnalysis(s, "BESS").includes("không phải phản hồi từ mô hình AI"),
  );
});
