import fs from "node:fs/promises";
import assert from "node:assert/strict";
const tabs = await (await fetch("http://127.0.0.1:9225/json")).json();
const ws = new WebSocket(
  tabs.find((t) => t.type === "page").webSocketDebuggerUrl,
);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let next = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (event) => {
  const m = JSON.parse(event.data);
  if (m.id) {
    const p = pending.get(m.id);
    if (p) {
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
    }
  } else if (m.method === "Runtime.exceptionThrown")
    errors.push(m.params.exceptionDetails.text);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++next;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const wait = async (expression) => {
  for (let i = 0; i < 80; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Timeout: " + expression);
};
const click = async (text) => {
  const ok = await evaluate(
    `(()=>{const b=[...document.querySelectorAll('button')].find(b=>(b.textContent.trim()===${JSON.stringify(text)} || (b.matches('.nav-item') && b.querySelector('span')?.textContent===${JSON.stringify(text)})));if(!b)return false;b.click();return true})()`,
  );
  assert.ok(ok, "button " + text);
};
await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1050,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://127.0.0.1:3000" });
await wait(
  'document.querySelector(".kpi-grid") && document.readyState === "complete"',
);
await new Promise((r) => setTimeout(r, 400));
// Browser tests use a dedicated Chromium profile; preserve backend configuration values.
const originals = new Map();
const ownedRevisions = new Map();
const endpoint = "http://127.0.0.1:3000/api/sites/";
for (const id of ["riverside", "logistics"]) {
  const original = await (await fetch(`${endpoint}${id}/scenario`)).json();
  originals.set(id, original);
  const result = await fetch(`${endpoint}${id}/scenario`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: { ...original.config, outage: false },
      expectedRevision: original.revision,
    }),
  });
  assert.equal(result.status, 200);
  ownedRevisions.set(id, (await result.json()).revision);
}
try {
  await evaluate("localStorage.clear()");
  await send("Page.reload");
  await wait(
    'document.querySelector(".kpi-grid") && document.readyState === "complete"',
  );
  await new Promise((r) => setTimeout(r, 300));
  await fs.writeFile(
    "/tmp/greensite-desktop.png",
    Buffer.from(
      (
        await send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        })
      ).data,
      "base64",
    ),
  );
  assert.equal(
    await evaluate("document.documentElement.scrollWidth > window.innerWidth"),
    false,
    "desktop overflow",
  );
  await click("Kịch bản năng lượng");
  await wait('document.querySelector(".control-body")');
  await evaluate(
    `(()=>{const input=[...document.querySelectorAll('.toggle-row')].find(l=>l.textContent.includes('Giả lập mất điện lưới')).querySelector('input');input.click()})()`,
  );
  await wait(
    `document.querySelector('.toggle-row input') && [...document.querySelectorAll('.toggle-row')].find(l=>l.textContent.includes('Giả lập mất điện lưới')).querySelector('input').checked`,
  );
  await click("Lưu kịch bản");
  await wait(
    `document.querySelector('.control-actions').innerText.includes('Đã lưu trên máy chủ')`,
  );
  ownedRevisions.set("riverside", ownedRevisions.get("riverside") + 1);
  const serverRecord = await (
    await fetch(`${endpoint}riverside/scenario`)
  ).json();
  assert.equal(serverRecord.config.outage, true);
  assert.equal(serverRecord.revision, ownedRevisions.get("riverside"));
  await send("Page.reload");
  await wait(
    `document.querySelector('.kpi-grid') && document.body.innerText.includes('Kịch bản mất lưới')`,
  );
  await evaluate(
    `(()=>{const s=document.getElementById('site-select');s.value='logistics';s.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  );
  await wait(
    `document.getElementById('site-select')?.value==='logistics' && document.querySelector('.insight-list') && !document.querySelector('.insight-list').innerText.includes('Kịch bản mất lưới')`,
  );
  await click("Nguồn & thiết bị");
  await wait(`document.querySelectorAll('.device-card').length===4`);
  await click("Báo cáo & phát thải");
  await wait(
    `document.querySelector('.report-cover').innerText.includes('Long An Logistics')`,
  );
  await send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: "/tmp/greensite-downloads",
  });
  await click("Tải CSV chi tiết");
  await click("Trợ lý AI");
  await wait(`document.getElementById('assistant-mode')`);
  await click("Zero-Export có đang hoạt động?");
  await wait(`document.querySelector('.chat-message.assistant')`);
  assert.ok(
    await evaluate(
      `document.querySelector('.chat-message.assistant').textContent.includes('Phân tích theo quy tắc')`,
    ),
  );
  assert.ok(
    await evaluate(
      `document.querySelector('.chat-message.assistant').textContent.includes('Long An Logistics')`,
    ),
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await evaluate("window.scrollTo(0,0)");
  assert.equal(
    await evaluate("document.documentElement.scrollWidth > window.innerWidth"),
    false,
    "mobile chat overflow",
  );
  await evaluate(`document.querySelector('[aria-label="Mở menu"]').click()`);
  await wait(`document.querySelector('.sidebar.open')`);
  await click("Tổng quan");
  await wait(`document.querySelector('.kpi-grid')`);
  await evaluate("window.scrollTo(0,0)");
  assert.equal(
    await evaluate("document.documentElement.scrollWidth > window.innerWidth"),
    false,
    "mobile overview overflow",
  );
  await new Promise((r) => setTimeout(r, 400));
  await fs.writeFile(
    "/tmp/greensite-mobile.png",
    Buffer.from(
      (
        await send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        })
      ).data,
      "base64",
    ),
  );
  assert.deepEqual(errors, [], "browser runtime errors");
  console.log(
    JSON.stringify({
      passed: [
        "desktop dashboard",
        "scenario controls",
        "server persistence across reload",
        "site isolation",
        "equipment",
        "report",
        "CSV download trigger",
        "local assistant API",
        "mobile menu",
        "no horizontal overflow",
        "no JS exceptions",
      ],
      screenshots: ["/tmp/greensite-desktop.png", "/tmp/greensite-mobile.png"],
    }),
  );
} finally {
  for (const [id, original] of originals) {
    const current = await (await fetch(`${endpoint}${id}/scenario`)).json();
    if (current.revision === ownedRevisions.get(id)) {
      const response = await fetch(`${endpoint}${id}/scenario`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: original.config,
          expectedRevision: current.revision,
        }),
      });
      assert.equal(response.status, 200, "restore browser-test configuration");
    }
  }
  ws.close();
}
