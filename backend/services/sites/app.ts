import { parseConfig } from "@greensite/contracts";
import {
  createService,
  HttpError,
  parse,
  notFound,
  methodNotAllowed,
} from "../../common/http.js";
import { openDatabase } from "./database.js";
export function createSitesService(options: {
  token: string;
  dbPath: string;
  log?: boolean;
}) {
  const database = openDatabase(options.dbPath);
  const server = createService(
    "sites",
    async (ctx) => {
      if (ctx.path === "/health/ready" && ctx.method === "GET") {
        database.ready();
        return { body: { service: "sites", status: "ok" } };
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
  return { server, close: database.close };
}
