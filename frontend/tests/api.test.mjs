import test from "node:test";
import assert from "node:assert/strict";
import { ems, moduleURL } from "./load.mjs";
const simulation = await import(moduleURL("../app/api/simulate/route.ts"));
const assistant = await import(moduleURL("../app/api/assistant/route.ts"));
const { readJSON } = await import(moduleURL("../lib/http.ts"));
const payload = {
  siteId: ems.SITES[0].id,
  config: ems.defaultConfig(ems.SITES[0]),
  mode: "local",
  question: "Giải thích Zero-Export",
};
const request = (body, headers = {}) =>
  new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
test("simulation API validates and returns independently computed output", async () => {
  const r = await simulation.POST(request({ ...payload, totals: { cost: 1 } }));
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.optimized.points.length, 96);
  assert.ok(data.optimized.totals.cost > 1);
  assert.equal(
    (
      await simulation.POST(
        request({ ...payload, config: { ...payload.config, pvKW: -1 } }),
      )
    ).status,
    400,
  );
});
test("body size, missing JSON and malformed JSON are rejected", async () => {
  await assert.rejects(() =>
    readJSON(new Request("http://localhost", { method: "POST", body: "abc" })),
  );
  await assert.rejects(() =>
    readJSON(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "no",
      }),
    ),
  );
  await assert.rejects(() => readJSON(request({ text: "a".repeat(21000) })));
});
test("local assistant works without network and labels its source", async () => {
  const r = await assistant.POST(request(payload));
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.mode, "local");
  assert.match(d.answer, /Zero-Export/);
  assert.equal(
    (await assistant.POST(request({ ...payload, question: "" }))).status,
    400,
  );
  assert.equal((await assistant.POST(request(null))).status, 400);
});
test("OpenAI is gated; secret remains server-side; Responses contract works with mocked transport", async (t) => {
  const keys = ["OPENAI_API_KEY", "OPENAI_MODEL", "AI_ACCESS_TOKEN"];
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  t.after(() => {
    for (const k of keys) {
      if (previous[k] === undefined) delete process.env[k];
      else process.env[k] = previous[k];
    }
  });
  for (const k of keys) delete process.env[k];
  assert.equal((await (await assistant.GET()).json()).available, false);
  assert.equal(
    (await assistant.POST(request({ ...payload, mode: "openai" }))).status,
    503,
  );
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_MODEL = "test-model";
  process.env.AI_ACCESS_TOKEN = "test-access-token";
  assert.equal(
    (await assistant.POST(request({ ...payload, mode: "openai" }))).status,
    401,
  );
  let called = 0;
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    called++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(opts.headers.Authorization, "Bearer test-key");
    const b = JSON.parse(opts.body);
    assert.equal(b.store, false);
    assert.equal(b.model, "test-model");
    assert.ok(b.instructions.includes("DỮ LIỆU TỪ MÁY CHỦ"));
    assert.equal(b.input.at(-1).content, payload.question);
    return Response.json({
      status: "completed",
      output: [
        { type: "reasoning" },
        {
          type: "message",
          content: [
            { type: "output_text", text: "Phân tích mô phỏng thử nghiệm." },
          ],
        },
      ],
    });
  });
  const r = await assistant.POST(
    request(
      { ...payload, mode: "openai" },
      { authorization: "Bearer test-access-token" },
    ),
  );
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.mode, "openai");
  assert.equal(d.answer, "Phân tích mô phỏng thử nghiệm.");
  assert.equal(called, 1);
  assert.ok(!JSON.stringify(d).includes("test-key"));
});
