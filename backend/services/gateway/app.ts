import {
  createService,
  notFound,
  methodNotAllowed,
  serviceFetch,
  serviceJSON,
} from "../../common/http.js";
export function createGateway(options: {
  token: string;
  sitesURL: string;
  energyURL: string;
  assistantURL: string;
  log?: boolean;
}) {
  return createService(
    "gateway",
    async (ctx) => {
      if (ctx.path === "/health/ready" && ctx.method === "GET") {
        await Promise.all(
          [options.sitesURL, options.energyURL, options.assistantURL].map(
            (url) => serviceJSON(url, "/health/ready", options.token, ctx),
          ),
        );
        return {
          body: {
            service: "gateway",
            status: "ok",
            dependencies: ["sites", "energy", "assistant"],
          },
        };
      }
      let base: string, path: string, methods: string[];
      if (
        /^\/api\/sites(?:\/[a-z0-9-]{1,80}(?:\/(scenario|history))?)?$/.test(
          ctx.path,
        )
      ) {
        base = options.sitesURL;
        path = ctx.path.replace("/api/", "/v1/");
        methods = ctx.path.endsWith("/scenario") ? ["GET", "PUT"] : ["GET"];
      } else if (
        ctx.path === "/api/compare" ||
        ctx.path === "/api/simulate" ||
        ctx.path === "/api/reports/export"
      ) {
        base = options.energyURL;
        path = ctx.path.replace("/api/", "/v1/");
        methods = ["POST"];
      } else if (ctx.path === "/api/assistant") {
        base = options.assistantURL;
        path = "/v1/assistant";
        methods = ["GET", "POST"];
      } else notFound();
      if (!methods.includes(ctx.method)) methodNotAllowed();
      const body = ctx.method === "GET" ? undefined : await ctx.json();
      const response = await serviceFetch(base, path, options.token, ctx, {
        method: ctx.method,
        body,
        authorization: ctx.request.headers.authorization,
        timeout: ctx.path === "/api/assistant" ? 60000 : 10000,
      });
      const text = await response.text();
      const headers: Record<string, string> = {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      };
      const disposition = response.headers.get("content-disposition");
      if (disposition) headers["Content-Disposition"] = disposition;
      return { status: response.status, body: text, headers };
    },
    { internal: false, log: options.log },
  );
}
