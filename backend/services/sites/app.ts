import { parseConfig } from "@greensite/contracts";
import {
  createService,
  HttpError,
  parse,
  notFound,
  methodNotAllowed,
} from "../../common/http.js";
import { openDatabase } from "./database.js";
import { openDemoDatabase } from "./demo-database.js";
import { openPilotStore } from "./pilot.js";
export function createSitesService(options: {
  token: string;
  dbPath: string;
  demo?: boolean;
  log?: boolean;
  pilotRootToken?: string;
}) {
  const database = options.demo
    ? openDemoDatabase()
    : openDatabase(options.dbPath);
  const pilot = options.demo
    ? null
    : openPilotStore(options.dbPath, options.pilotRootToken);
  const server = createService(
    "sites",
    async (ctx) => {
      if (ctx.path === "/health/ready" && ctx.method === "GET") {
        database.ready();
        return { body: { service: "sites", status: "ok" } };
      }
      if (ctx.path.startsWith("/v1/pilot")) {
        if (!pilot)
          throw new HttpError(
            503,
            "Pilot không có trên bản demo chỉ đọc.",
            "PILOT_NOT_CONFIGURED",
          );
        const auth =
          typeof ctx.request.headers.authorization === "string"
            ? ctx.request.headers.authorization
            : undefined;
        if (ctx.path === "/v1/pilot/admin/organizations") {
          if (ctx.method !== "POST") methodNotAllowed();
          return { body: pilot.bootstrap(auth, await ctx.json()) };
        }
        const identity = pilot.authenticate(auth);
        if (ctx.path === "/v1/pilot/workspace") {
          if (ctx.method !== "GET") methodNotAllowed();
          return { body: pilot.workspace(identity) };
        }
        if (ctx.path === "/v1/pilot/keys") {
          if (ctx.method !== "POST") methodNotAllowed();
          return { body: pilot.issueKey(identity, await ctx.json()) };
        }
        const keyMatch = /^\/v1\/pilot\/keys\/([a-f0-9]{64})$/.exec(ctx.path);
        if (keyMatch) {
          if (ctx.method !== "DELETE") methodNotAllowed();
          return { body: pilot.revokeKey(identity, keyMatch[1]) };
        }
        if (ctx.path === "/v1/pilot/sites") {
          if (ctx.method !== "POST") methodNotAllowed();
          return { body: pilot.createSite(identity, await ctx.json()) };
        }
        const adapterMatch =
          /^\/v1\/pilot\/sites\/([a-z0-9-]{1,80})\/adapter\/run$/.exec(
            ctx.path,
          );
        if (adapterMatch) {
          if (ctx.method !== "POST") methodNotAllowed();
          return {
            body: pilot.simulateAdapter(
              identity,
              adapterMatch[1],
              await ctx.json(),
            ),
          };
        }
        const pilotMatch =
          /^\/v1\/pilot\/sites\/([a-z0-9-]{1,80})\/(readings|invoices|loads|plans|report|audit)$/.exec(
            ctx.path,
          );
        if (!pilotMatch) notFound();
        const [, pilotSiteId, resource] = pilotMatch;
        if (resource === "report" || resource === "audit") {
          if (ctx.method !== "GET") methodNotAllowed();
          return {
            body:
              resource === "report"
                ? pilot.report(identity, pilotSiteId)
                : { events: pilot.audit(identity, pilotSiteId) },
          };
        }
        if (resource === "plans") {
          if (ctx.method !== "POST") methodNotAllowed();
          return { body: pilot.plan(identity, pilotSiteId, await ctx.json()) };
        }
        if (ctx.method === "GET")
          return {
            body: {
              items:
                resource === "readings"
                  ? pilot.readings(identity, pilotSiteId)
                  : resource === "invoices"
                    ? pilot.invoices(identity, pilotSiteId)
                    : pilot.loads(identity, pilotSiteId),
            },
          };
        if (ctx.method !== "POST") methodNotAllowed();
        const input = await ctx.json();
        return {
          body:
            resource === "readings"
              ? pilot.addReadings(identity, pilotSiteId, input)
              : resource === "invoices"
                ? pilot.addInvoice(identity, pilotSiteId, input)
                : pilot.addLoad(identity, pilotSiteId, input),
        };
      }
      if (ctx.path === "/v1/sites") {
        if (ctx.method !== "GET") methodNotAllowed();
        return { body: { sites: database.sites() } };
      }
      const match =
        /^\/v1\/sites\/([a-z0-9-]{1,80})(?:\/(scenario|history))?$/.exec(
          ctx.path,
        );
      if (!match) notFound();
      const [, id, resource] = match;
      if (!resource) {
        if (ctx.method !== "GET") methodNotAllowed();
        return { body: { site: database.site(id) } };
      }
      if (resource === "history") {
        if (ctx.method !== "GET") methodNotAllowed();
        return { body: { revisions: database.history(id) } };
      }
      if (ctx.method === "GET") return { body: database.scenario(id) };
      if (ctx.method !== "PUT") methodNotAllowed();
      const raw = await ctx.json();
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new HttpError(400, "Yêu cầu không hợp lệ.");
      const body = raw as Record<string, unknown>;
      const config = parse(() => parseConfig(body.config));
      if (
        !Number.isSafeInteger(body.expectedRevision) ||
        Number(body.expectedRevision) < 0
      )
        throw new HttpError(
          400,
          "Cần expectedRevision hợp lệ.",
          "VALIDATION_ERROR",
        );
      return { body: database.save(id, config, Number(body.expectedRevision)) };
    },
    { token: options.token, log: options.log },
  );
  return {
    server,
    close: () => {
      pilot?.close();
      database.close();
    },
  };
}
