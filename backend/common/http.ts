import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "BAD_REQUEST",
  ) {
    super(message);
  }
}
export type Context = {
  request: IncomingMessage;
  path: string;
  method: string;
  requestId: string;
  signal: AbortSignal;
  json: () => Promise<unknown>;
};
export type Result = {
  status?: number;
  body: unknown;
  headers?: Record<string, string>;
};
export type ServiceOptions = {
  token?: string;
  internal?: boolean;
  log?: boolean;
};
export function validToken(actual: string | undefined, expected: string) {
  const a = Buffer.from(actual ?? ""),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function readBody(req: IncomingMessage) {
  if (
    !req.headers["content-type"]?.toLowerCase().startsWith("application/json")
  )
    throw new HttpError(415, "Cần gửi JSON.", "UNSUPPORTED_MEDIA_TYPE");
  let size = 0;
  const chunks: Buffer[] = [];
  // Event-based reading avoids destroying the socket before returning HTTP 413.
  const bytes = await new Promise<Buffer>((resolve, reject) => {
    const fail = (error: Error) => {
      cleanup();
      req.resume();
      reject(error);
    };
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > 20000)
        fail(new HttpError(413, "Yêu cầu quá lớn.", "BODY_TOO_LARGE"));
      else chunks.push(chunk);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks));
    };
    const onError = () =>
      fail(new HttpError(400, "Nội dung yêu cầu bị gián đoạn."));
    const cleanup = () => {
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("aborted", onError);
      req.off("error", onError);
    };
    req.on("data", onData);
    req.on("end", onEnd);
    req.on("aborted", onError);
    req.on("error", onError);
  });
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON không hợp lệ.", "INVALID_JSON");
  }
}
export function createService(
  name: string,
  handler: (ctx: Context) => Promise<Result>,
  options: ServiceOptions = {},
) {
  if (
    options.internal !== false &&
    (!options.token || options.token.length < 32)
  )
    throw new Error(`${name}: INTERNAL_SERVICE_TOKEN cần ít nhất 32 ký tự.`);
  const server = createServer(async (req, res) => {
    const started = Date.now();
    const incomingId = req.headers["x-request-id"];
    const requestId =
      options.internal !== false &&
      typeof incomingId === "string" &&
      /^[0-9a-f-]{36}$/.test(incomingId)
        ? incomingId
        : randomUUID();
    const abort = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) abort.abort();
    });
    const path = new URL(req.url ?? "/", "http://service.local").pathname;
    let bodyPromise: Promise<unknown> | undefined;
    try {
      let result: Result;
      if (path === "/health/live" && req.method === "GET")
        result = { body: { service: name, status: "ok" } };
      else {
        if (
          options.internal !== false &&
          !validToken(
            typeof req.headers["x-service-token"] === "string"
              ? req.headers["x-service-token"]
              : undefined,
            options.token!,
          )
        )
          throw new HttpError(
            401,
            "Không có quyền truy cập service.",
            "UNAUTHORIZED",
          );
        result = await handler({
          request: req,
          path,
          method: req.method ?? "GET",
          requestId,
          signal: abort.signal,
          json: () => (bodyPromise ??= readBody(req)),
        });
      }
      respond(res, result, requestId);
    } catch (error) {
      const known = error instanceof HttpError;
      respond(
        res,
        {
          status: known ? error.status : 500,
          body: {
            error: known ? error.message : "Service gặp lỗi nội bộ.",
            code: known ? error.code : "INTERNAL_ERROR",
            requestId,
          },
        },
        requestId,
      );
      if (!known && options.log !== false)
        console.error(
          JSON.stringify({ service: name, requestId, event: "internal_error" }),
        );
    } finally {
      if (options.log !== false)
        console.log(
          JSON.stringify({
            service: name,
            requestId,
            method: req.method,
            path: path.slice(0, 150),
            status: res.statusCode,
            durationMs: Date.now() - started,
          }),
        );
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}
function respond(res: ServerResponse, result: Result, requestId: string) {
  if (res.destroyed || res.writableEnded) return;
  const text = typeof result.body === "string";
  res.writeHead(result.status ?? 200, {
    "Content-Type": text
      ? "text/plain; charset=utf-8"
      : "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...result.headers,
    "X-Request-Id": requestId,
  });
  res.end(text ? result.body : JSON.stringify(result.body));
}
export function parse<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw new HttpError(
      400,
      error instanceof Error ? error.message : "Dữ liệu không hợp lệ.",
      "VALIDATION_ERROR",
    );
  }
}
export function notFound(): never {
  throw new HttpError(404, "Không tìm thấy tài nguyên.", "NOT_FOUND");
}
export function methodNotAllowed(): never {
  throw new HttpError(
    405,
    "Phương thức không được hỗ trợ.",
    "METHOD_NOT_ALLOWED",
  );
}
export async function serviceFetch(
  base: string,
  path: string,
  token: string,
  ctx: Pick<Context, "requestId" | "signal">,
  options: {
    method?: string;
    body?: unknown;
    authorization?: string;
    timeout?: number;
  } = {},
) {
  try {
    return await fetch(new URL(path, base), {
      method: options.method ?? "GET",
      headers: {
        "X-Service-Token": token,
        "X-Request-Id": ctx.requestId,
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.authorization
          ? { Authorization: options.authorization }
          : {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.any([
        ctx.signal,
        AbortSignal.timeout(options.timeout ?? 5000),
      ]),
    });
  } catch {
    throw new HttpError(
      503,
      "Một service phụ thuộc chưa sẵn sàng. Vui lòng thử lại.",
      "DEPENDENCY_UNAVAILABLE",
    );
  }
}
export async function serviceJSON<T>(
  base: string,
  path: string,
  token: string,
  ctx: Pick<Context, "requestId" | "signal">,
  options: Parameters<typeof serviceFetch>[4] = {},
): Promise<T> {
  const response = await serviceFetch(base, path, token, ctx, options);
  try {
    const data = await response.json();
    if (!response.ok)
      throw new HttpError(
        response.status,
        data.error ?? "Service từ chối yêu cầu.",
        data.code ?? "DEPENDENCY_ERROR",
      );
    return data as T;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "Phản hồi service không hợp lệ.", "BAD_GATEWAY");
  }
}
