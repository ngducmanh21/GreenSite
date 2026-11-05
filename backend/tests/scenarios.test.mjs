import test from "node:test";
import assert from "node:assert/strict";
import {
  parseConfig,
  parseCompareRequest,
  parseScenarioFile,
} from "@greensite/contracts";
import { compareScenarios } from "../dist/services/energy/compare.js";
import { defaultConfig, SITES } from "../dist/services/sites/seed.js";
import { scenarioPresets } from "../dist/services/sites/presets.js";
const site = SITES[0],
  config = defaultConfig(site);
test("comparison uses server calculations, gives zero delta for identical configs", () => {
  const result = compareScenarios(site, config, config);
  assert.equal(result.comparable, true);
  assert.equal(result.costChange, 0);
  assert.equal(result.carbonChange, 0);
  assert.equal(result.savingsPct, 0);
  assert.ok(result.reference.totals.cost > 0);
});
test("controlled equipment/policy changes remain comparable with correct delta sign", () => {
  const result = compareScenarios(
    site,
    { ...config, batteryKWh: 0, shiftLoad: false },
    config,
  );
  assert.equal(result.comparable, true);
  assert.equal(
    result.costChange,
    result.candidate.totals.cost - result.reference.totals.cost,
  );
  assert.equal(
    result.carbonChange,
    result.candidate.totals.carbon - result.reference.totals.carbon,
  );
  assert.ok(result.savingsPct > 0);
  assert.ok(result.costChange < 0);
});
test("load, weather, outages and tariff changes cannot be described as savings", () => {
  for (const changes of [
    { loadPct: 130 },
    { weather: "cloudy" },
    { outage: true },
    { peakRate: 9000 },
    { dieselPrice: 1 },
  ]) {
    const result = compareScenarios(site, config, { ...config, ...changes });
    assert.equal(result.comparable, false);
    assert.equal(result.savingsPct, null);
    assert.ok(result.reasons.length > 0);
  }
  const insufficient = {
    ...config,
    pvKW: 0,
    batteryKWh: 0,
    gridLimitKW: 50,
    loadPct: 180,
  };
  assert.equal(
    compareScenarios(site, insufficient, insufficient).comparable,
    false,
  );
});
test("zero-cost reference never divides by zero", () => {
  const free = {
    ...config,
    batteryKWh: 0,
    offPeakRate: 0,
    normalRate: 0,
    peakRate: 0,
    dieselPrice: 0,
  };
  const result = compareScenarios(site, free, free);
  assert.equal(result.comparable, true);
  assert.equal(result.savingsPct, null);
});
test("scenario files round-trip, strip extra data, and reject wrong formats/types", () => {
  const file = {
    format: "greensite-scenario",
    version: 1,
    siteId: site.id,
    exportedAt: "2026-11-05T10:00:00.000Z",
    config,
  };
  const parsed = parseScenarioFile({
    ...JSON.parse(JSON.stringify(file)),
    totals: { cost: 0 },
  });
  assert.equal(parsed.siteId, site.id);
  assert.deepEqual(parsed.config, parseConfig(config));
  assert.equal(parsed.totals, undefined);
  for (const value of [
    null,
    [],
    { ...file, version: 2 },
    { ...file, format: "other" },
    { ...file, siteId: "../admin" },
    { ...file, exportedAt: "invalid" },
    { ...file, config: { ...config, pvKW: -1 } },
    { ...file, config: { ...config, weather: ["sunny"] } },
    { ...file, config: { ...config, strategy: ["solar"] } },
  ])
    assert.throws(() => parseScenarioFile(value));
  assert.throws(() =>
    parseCompareRequest({
      siteId: site.id,
      reference: config,
      candidate: { ...config, weather: ["sunny"] },
    }),
  );
});
test("presets remain valid for each site and do not mutate defaults", () => {
  for (const site of SITES) {
    const defaults = defaultConfig(site),
      before = JSON.stringify(defaults),
      presets = scenarioPresets(defaults);
    assert.equal(presets.length, 3);
    for (const preset of presets)
      assert.doesNotThrow(() => parseConfig(preset.config));
    assert.equal(presets.find((p) => p.id === "outage").config.outage, true);
    assert.equal(
      presets.find((p) => p.id === "cloudy-peak").config.weather,
      "cloudy",
    );
    presets[0].config.pvKW = 0;
    assert.equal(JSON.stringify(defaults), before);
  }
});
