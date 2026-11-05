import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createSitesService } from "../dist/services/sites/app.js";
import { serviceFetch, serviceURLForPath } from "../dist/common/http.js";
const token = "test-service-token-".repeat(3);
const listen = async (server) => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return `http://127.0.0.1:${server.address().port}`;
};
const close = async (server) =>
  new Promise((r) => {
    server.close(r);
    server.closeAllConnections();
  });
test("Vercel demo serves data but rejects persistence explicitly", async (t) => {
  const app = createSitesService({
    token,
    demo: true,
    dbPath: "/must-not-create-a-database/greensite.sqlite",
    log: false,
  });
  const base = await listen(app.server);
  t.after(async () => {
    await close(app.server);
    app.close();
  });
  const get = async (path) =>
    fetch(base + path, { headers: { "X-Service-Token": token } });
  const initial = await (await get("/v1/sites/riverside/scenario")).json();
  assert.equal(initial.persistence, "demo");
  assert.equal(initial.saved, false);
  assert.equal(initial.revision, 0);
  const put = await fetch(base + "/v1/sites/riverside/scenario", {
    method: "PUT",
    headers: { "X-Service-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({
      config: { ...initial.config, outage: true },
      expectedRevision: 0,
    }),
  });
  assert.equal(put.status, 503);
  assert.equal((await put.json()).code, "PERSISTENCE_NOT_CONFIGURED");
  const after = await (await get("/v1/sites/riverside/scenario")).json();
  assert.equal(after.config.outage, false);
  assert.equal(after.revision, 0);
  assert.deepEqual(
    (await (await get("/v1/sites/riverside/history")).json()).revisions,
    [],
  );
  assert.equal((await get("/v1/sites/unknown")).status, 404);
});
test("service calls preserve binding path prefixes and application authentication", async (t) => {
  assert.equal(
    serviceURLForPath("https://internal.example/deployment/sites", "/v1/sites")
      .href,
    "https://internal.example/deployment/sites/v1/sites",
  );
  assert.equal(
    serviceURLForPath("https://internal.example/", "/v1/sites").href,
    "https://internal.example/v1/sites",
  );
  const server = createServer((req, res) => {
    assert.equal(req.headers["x-service-token"], token);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ path: req.url }));
  });
  const base = await listen(server);
  t.after(() => close(server));
  const response = await serviceFetch(
    base + "/deployment/sites/",
    "/v1/sites",
    token,
    { requestId: "test", signal: new AbortController().signal },
  );
  assert.equal((await response.json()).path, "/deployment/sites/v1/sites");
});
