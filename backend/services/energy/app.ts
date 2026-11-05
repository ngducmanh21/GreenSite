import { compareScenarios } from "./compare.js";
import {
  parseCompareRequest,
  parseSimulationRequest,
  type Site,
} from "@greensite/contracts";
import {
  createService,
  parse,
  serviceJSON,
  methodNotAllowed,
  notFound,
} from "../../common/http.js";
import { simulate } from "./engine.js";
import { reportCSV } from "./report.js";
export function createEnergyService(options: {
  token: string;
  sitesURL: string;
  log?: boolean;
}) {
  return createService(
    "energy",
    async (ctx) => {
      if (ctx.path === "/health/ready" && ctx.method === "GET") {
        await serviceJSON(
          options.sitesURL,
          "/health/ready",
          options.token,
          ctx,
        );
        return { body: { service: "energy", status: "ok" } };
      }
      if (ctx.path === "/v1/compare") {
        if (ctx.method !== "POST") methodNotAllowed();
        const raw = await ctx.json();
        const request = parse(() => parseCompareRequest(raw));
        const { site } = await serviceJSON<{ site: Site }>(
          options.sitesURL,
          `/v1/sites/${request.siteId}`,
          options.token,
          ctx,
        );
        return {
          body: compareScenarios(site, request.reference, request.candidate),
        };
      }
      if (!["/v1/simulate", "/v1/reports/export"].includes(ctx.path))
        notFound();
      if (ctx.method !== "POST") methodNotAllowed();
      const raw = await ctx.json(),
        request = parse(() => parseSimulationRequest(raw));
      const { site } = await serviceJSON<{ site: Site }>(
        options.sitesURL,
        `/v1/sites/${request.siteId}`,
        options.token,
        ctx,
      );
      const result = simulate(site, request.config);
      if (ctx.path === "/v1/simulate") return { body: result };
      return {
        body: reportCSV(result),
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="GreenSite-${site.id}-${result.date}-simulation.csv"`,
        },
      };
    },
    { token: options.token, log: options.log },
  );
}
