import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSitesService } from "../dist/services/sites/app.js";
import { createEnergyService } from "../dist/services/energy/app.js";
import { createAssistantService } from "../dist/services/assistant/app.js";
import { createGateway } from "../dist/services/gateway/app.js";
const token = "service-test-".repeat(4);
async function listen(server, port = 0) {
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) {
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}
function input(value) {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  };
}

test("microservices integrate over HTTP, own persistence, enforce contracts and surface outages", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "greensite-services-"));
  const dbPath = join(dir, "sites.sqlite");
  let sites = createSitesService({ token, dbPath, log: false });
  const sitesURL = await listen(sites.server);
  const sitesPort = sites.server.address().port;
  const energy = createEnergyService({ token, sitesURL, log: false });
  const energyURL = await listen(energy);
  let providerCalls = 0;
  let providerMode = "success";
  let lastProviderRequest;
  const assistant = createAssistantService({
    token,
    energyURL,
    log: false,
    aiAccessToken: "test-ai-token",
    aiQuota: 2,
    openAI: {
      apiKey: "test-provider-key",
      model: "test-model",
      fetcher: async (url, options) => {
        providerCalls++;
        assert.equal(url, "https://api.openai.com/v1/responses");
        assert.equal(options.headers.Authorization, "Bearer test-provider-key");
        assert.equal(options.headers["X-Service-Token"], undefined);
        lastProviderRequest = JSON.parse(options.body);
        return Response.json(
          providerMode === "success"
            ? {
                status: "completed",
                output: [
                  { type: "reasoning" },
                  {
                    type: "message",
                    content: [
                      {
                        type: "output_text",
                        text: "Phân tích thử nghiệm từ dữ liệu máy chủ.",
                      },
                    ],
                  },
                ],
              }
            : { status: "incomplete", output: [] },
        );
      },
    },
  });
  const assistantURL = await listen(assistant);
  const gateway = createGateway({
    token,
    sitesURL,
    energyURL,
    assistantURL,
    log: false,
  });
  const gatewayURL = await listen(gateway);
  t.after(async () => {
    await close(gateway);
    await close(assistant);
    await close(energy);
    await close(sites.server);
    sites.close();
    await rm(dir, { recursive: true, force: true });
  });
  const call = (path, options) => fetch(gatewayURL + path, options);
  const internal = (path, options = {}) =>
    fetch(sitesURL + path, {
      ...options,
      headers: { ...options.headers, "x-service-token": token },
    });
  let record;
  await t.test(
    "gateway readiness checks all dependencies; private APIs reject callers without service token",
    async () => {
      assert.equal((await call("/health/ready")).status, 200);
      assert.equal((await fetch(sitesURL + "/v1/sites")).status, 401);
      assert.equal(
        (await fetch(energyURL + "/v1/simulate", input({}))).status,
        401,
      );
      const response = await call("/api/sites");
      assert.equal(response.status, 200);
      assert.equal((await response.json()).sites.length, 3);
      assert.match(response.headers.get("x-request-id"), /^[0-9a-f-]{36}$/);
      const invalid = await call("/api/sites/not-found");
      assert.equal(invalid.status, 404);
      assert.equal(
        (await invalid.json()).requestId,
        invalid.headers.get("x-request-id"),
      );
    },
  );
  await t.test(
    "scenario saves are atomic, versioned, isolated by site, and reject stale revisions",
    async () => {
      record = await (await call("/api/sites/riverside/scenario")).json();
      assert.equal(record.revision, 0);
      assert.equal(record.saved, false);
      const response = await call("/api/sites/riverside/scenario", {
        ...input({
          config: { ...record.config, outage: true },
          expectedRevision: 0,
        }),
        method: "PUT",
      });
      assert.equal(response.status, 200);
      record = await response.json();
      assert.equal(record.revision, 1);
      assert.equal(record.config.outage, true);
      const stale = await call("/api/sites/riverside/scenario", {
        ...input({ config: record.config, expectedRevision: 0 }),
        method: "PUT",
      });
      assert.equal(stale.status, 409);
      assert.equal((await stale.json()).code, "REVISION_CONFLICT");
      const other = await (await call("/api/sites/logistics/scenario")).json();
      assert.equal(other.config.outage, false);
      assert.equal(other.revision, 0);
      const revisions = await (
        await call("/api/sites/riverside/history")
      ).json();
      assert.equal(revisions.revisions.length, 1);
      assert.equal(revisions.revisions[0].config.outage, true);
      const invalid = await call("/api/sites/riverside/scenario", {
        ...input({
          config: { ...record.config, reservePct: 99 },
          expectedRevision: 1,
        }),
        method: "PUT",
      });
      assert.equal(invalid.status, 400);
    },
  );
  await t.test(
    "scenario survives a full site-service restart using its own database",
    async () => {
      await close(sites.server);
      sites.close();
      sites = createSitesService({ token, dbPath, log: false });
      await listen(sites.server, sitesPort);
      const stored = await (await call("/api/sites/riverside/scenario")).json();
      assert.equal(stored.config.outage, true);
      assert.equal(stored.revision, 1);
    },
  );
  await t.test(
    "simulation and CSV run on energy service with canonical site data",
    async () => {
      const response = await call(
        "/api/simulate",
        input({
          siteId: "riverside",
          config: record.config,
          totals: { cost: 1 },
          site: { baseLoad: 0 },
        }),
      );
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.optimized.points.length, 96);
      assert.ok(result.optimized.totals.cost > 1);
      assert.ok(result.factors.grid > 0);
      const csv = await call(
        "/api/reports/export",
        input({ siteId: "riverside", config: record.config }),
      );
      assert.equal(csv.status, 200);
      assert.match(csv.headers.get("content-type"), /text\/csv/);
      assert.match(csv.headers.get("content-disposition"), /riverside/);
      const text = await csv.text();
      assert.equal(
        text.split("\r\n").filter((line) => /^"\d\d:\d\d"/.test(line)).length,
        96,
      );
      assert.ok(text.includes("Hệ số demo"));
      assert.equal(
        (
          await call(
            "/api/simulate",
            input({ siteId: "missing", config: record.config }),
          )
        ).status,
        404,
      );
    },
  );
  await t.test(
    "assistant calls energy service, keeps secrets private and gates paid requests",
    async () => {
      const local = await call(
        "/api/assistant",
        input({
          siteId: "riverside",
          config: record.config,
          question: "BESS",
          mode: "local",
        }),
      );
      assert.equal(local.status, 200);
      const result = await local.json();
      assert.equal(result.mode, "local");
      assert.ok(result.answer.includes("Riverside Tower"));
      assert.equal(providerCalls, 0);
      const body = {
        siteId: "riverside",
        config: record.config,
        question: "Giải thích chi phí",
        mode: "openai",
        totals: { cost: 1 },
      };
      assert.equal((await call("/api/assistant", input(body))).status, 401);
      const paid = () =>
        call("/api/assistant", {
          ...input(body),
          headers: {
            "content-type": "application/json",
            authorization: "Bearer test-ai-token",
          },
        });
      let response = await paid();
      assert.equal(response.status, 200);
      assert.equal((await response.json()).mode, "openai");
      assert.equal(lastProviderRequest.store, false);
      assert.equal(lastProviderRequest.model, "test-model");
      assert.ok(
        lastProviderRequest.instructions.includes("DỮ LIỆU TỪ MÁY CHỦ"),
      );
      assert.ok(
        !lastProviderRequest.instructions.includes("test-provider-key"),
      );
      providerMode = "incomplete";
      response = await paid();
      assert.equal(response.status, 502);
      assert.equal((await response.json()).code, "AI_INCOMPLETE");
      assert.equal((await paid()).status, 429);
      const status = await (await call("/api/assistant")).json();
      assert.deepEqual(status, { available: true, localAvailable: true });
    },
  );
  await t.test(
    "gateway rejects malformed, oversized and unsupported requests",
    async () => {
      assert.equal(
        (
          await call("/api/simulate", {
            method: "POST",
            body: "x",
            headers: { "content-type": "application/json" },
          })
        ).status,
        400,
      );
      assert.equal(
        (await call("/api/simulate", { method: "POST", body: "{}" })).status,
        415,
      );
      assert.equal(
        (await call("/api/simulate", input({ data: "x".repeat(21000) })))
          .status,
        413,
      );
      assert.equal(
        (await call("/api/sites", { method: "DELETE" })).status,
        405,
      );
      assert.equal((await call("/api/anything")).status, 404);
      assert.equal((await call("/api/assistant", input(null))).status, 400);
      assert.equal(
        (
          await call(
            "/api/assistant",
            input({
              siteId: "riverside",
              config: record.config,
              question: "",
              mode: "local",
            }),
          )
        ).status,
        400,
      );
    },
  );
  await t.test(
    "dependency outage produces 503 rather than fake results or a healthy readiness probe",
    async () => {
      await close(sites.server);
      sites.close();
      const result = await call(
        "/api/simulate",
        input({ siteId: "riverside", config: record.config }),
      );
      assert.equal(result.status, 503);
      assert.equal((await result.json()).code, "DEPENDENCY_UNAVAILABLE");
      assert.equal((await call("/health/ready")).status, 503);
      assert.equal((await call("/health/live")).status, 200);
      sites = createSitesService({ token, dbPath, log: false });
      await listen(sites.server, sitesPort);
      assert.equal((await call("/health/ready")).status, 200);
    },
  );
});

test("internal services refuse to start without a strong shared credential", () => {
  assert.throws(
    () => createEnergyService({ token: "short", sitesURL: "http://localhost" }),
    /32/,
  );
});
