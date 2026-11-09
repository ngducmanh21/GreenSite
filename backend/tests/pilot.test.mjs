import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSitesService } from "../dist/services/sites/app.js";
import { createGateway } from "../dist/services/gateway/app.js";

const internal = "internal-token-for-pilot-tests-1234567890";
const root = "root-token-for-pilot-tests-123456789012";
test("pilot isolates organizations and reconciles measured data without simulated rows", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "greensite-pilot-"));
  const service = createSitesService({
    token: internal,
    dbPath: join(dir, "pilot.sqlite"),
    pilotRootToken: root,
    log: false,
  });
  await new Promise((resolve) =>
    service.server.listen(0, "127.0.0.1", resolve),
  );
  const base = `http://127.0.0.1:${service.server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => service.server.close(resolve));
    service.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const call = async (path, token, method = "GET", body) => {
    const response = await fetch(base + "/v1/pilot" + path, {
      method,
      headers: {
        "X-Service-Token": internal,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await call("/workspace")).status, 401);
  assert.equal(
    (
      await call(
        "/admin/organizations",
        "wrong-token-that-is-long-enough-123456",
        "POST",
        { name: "Bad" },
      )
    ).status,
    401,
  );
  const first = await call("/admin/organizations", root, "POST", {
    name: "Tổng thầu A",
  });
  const second = await call("/admin/organizations", root, "POST", {
    name: "Tổng thầu B",
  });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  const admin = first.data.access.token,
    other = second.data.access.token;
  const gateway = createGateway({
    token: internal,
    sitesURL: base,
    energyURL: base,
    assistantURL: base,
    log: false,
  });
  await new Promise((resolve) => gateway.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => gateway.close(resolve)));
  const gatewayBase = `http://127.0.0.1:${gateway.address().port}`;
  const throughGateway = await fetch(gatewayBase + "/api/pilot/workspace", {
    headers: { Authorization: `Bearer ${admin}` },
  });
  assert.equal(throughGateway.status, 200);
  assert.equal((await throughGateway.json()).identity.role, "admin");
  const created = await call("/sites", admin, "POST", {
    name: "Công trường 1",
    location: "Hà Nội",
    gridLimitKw: 500,
    emissionFactor: 0.6,
    dieselFactor: 0.75,
    factorSource: "Pilot test factor",
    tariff: {
      offPeak: 1000,
      normal: 2000,
      peak: 3000,
      offPeakHours: [1, 2],
      peakHours: [17, 18],
    },
  });
  assert.equal(created.status, 200);
  const id = created.data.id;
  assert.equal((await call("/workspace", other)).data.sites.length, 0);
  assert.equal((await call(`/sites/${id}/report`, other)).status, 404);
  const viewerKey = (
    await call("/keys", admin, "POST", { label: "Giám sát", role: "viewer" })
  ).data;
  const viewer = viewerKey.token;
  assert.equal(
    (
      await call(`/sites/${id}/loads`, viewer, "POST", {
        name: "Máy bơm",
        category: "essential",
        ratedKw: 10,
        earliestHour: 7,
        latestHour: 18,
        requiredHours: 4,
      })
    ).status,
    403,
  );
  const revoke = await fetch(gatewayBase + `/api/pilot/keys/${viewerKey.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${admin}` },
  });
  assert.equal(revoke.status, 200);
  assert.equal((await call("/workspace", viewer)).status, 401);
  assert.equal(
    (
      await call(`/sites/${id}/loads`, admin, "POST", {
        name: "Máy bơm",
        category: "essential",
        ratedKw: 10,
        earliestHour: 7,
        latestHour: 18,
        requiredHours: 4,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(`/sites/${id}/loads`, admin, "POST", {
        name: "Sạc xe",
        category: "shiftable",
        ratedKw: 8,
        earliestHour: 0,
        latestHour: 4,
        requiredHours: 2,
      })
    ).status,
    200,
  );
  const reading = (measuredAt, source, quality, importedKwh) => ({
    measuredAt,
    source,
    quality,
    importedKwh,
    exportedKwh: 0,
    pvKwh: 2,
    dieselKwh: 0,
    bessChargeKwh: 0,
    bessDischargeKwh: 0,
    socPct: 50,
  });
  const imported = await call(`/sites/${id}/readings`, admin, "POST", {
    readings: [
      reading("2026-11-01T00:00:00Z", "import", "measured", 10),
      reading("2026-11-01T00:15:00Z", "adapter-simulated", "estimated", 100),
    ],
  });
  assert.equal(imported.status, 200);
  assert.equal(
    (
      await call(`/sites/${id}/invoices`, admin, "POST", {
        periodStart: "2026-11-01",
        periodEnd: "2026-11-02",
        billedKwh: 12,
        amountVnd: 24000,
        supplier: "Điện lực",
        reference: "INV-001",
      })
    ).status,
    200,
  );
  const adapter = await call(`/sites/${id}/adapter/run`, admin, "POST", {
    day: "2026-11-03",
  });
  assert.equal(adapter.status, 200);
  assert.equal(adapter.data.accepted, 96);
  assert.equal(adapter.data.commandsSent, 0);
  const report = (await call(`/sites/${id}/report`, admin)).data;
  assert.equal(report.totals.measured_imported_kwh, 10);
  assert.equal(report.totals.simulated_intervals, 97);
  assert.equal(report.reconciliation[0].measuredKwh, 10);
  assert.equal(report.reconciliation[0].gapKwh, 2);
  assert.equal(report.estimatedGridCarbonKg, 6);
  const plan = (
    await call(`/sites/${id}/plans`, admin, "POST", {
      day: "2026-11-01",
      zeroExport: true,
    })
  ).data;
  assert.equal(plan.mode, "simulation");
  assert.equal(plan.approved, false);
  assert.equal(plan.dispatched, false);
  assert.equal(plan.assignments.find((a) => a.name === "Sạc xe").startHour, 1);
  assert.ok((await call(`/sites/${id}/audit`, admin)).data.events.length >= 4);
});
