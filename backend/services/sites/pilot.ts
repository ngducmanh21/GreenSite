import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { HttpError } from "../../common/http.js";

type Role = "admin" | "engineer" | "viewer";
type Identity = { organizationId: string; role: Role; label: string };
type Row = Record<string, unknown>;
const idPattern = /^[a-z0-9-]{1,80}$/;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function object(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(400, "Cần đối tượng JSON hợp lệ.", "VALIDATION_ERROR");
  return value as Row;
}
function required(value: unknown, label: string, max = 160): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new HttpError(400, `${label} không hợp lệ.`, "VALIDATION_ERROR");
  return value.trim();
}
function number(value: unknown, label: string, min = 0, max = 1e12): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new HttpError(400, `${label} không hợp lệ.`, "VALIDATION_ERROR");
  return value;
}
function date(value: unknown, label: string): string {
  const text = required(value, label, 40);
  if (
    !/^\d{4}-\d\d-\d\d(?:T\d\d:\d\d:\d\d(?:\.\d+)?Z)?$/.test(text) ||
    Number.isNaN(Date.parse(text))
  )
    throw new HttpError(400, `${label} không hợp lệ.`, "VALIDATION_ERROR");
  return text;
}
function parseJSON(row: Row, field = "data") {
  return JSON.parse(String(row[field]));
}
function tokenFromHeader(authorization: string | undefined) {
  const match = /^Bearer ([A-Za-z0-9_-]{32,})$/.exec(authorization ?? "");
  if (!match)
    throw new HttpError(401, "Cần mã truy cập pilot.", "PILOT_UNAUTHORIZED");
  return match[1];
}

/** Pilot store is isolated from the public simulation workspace. No hardware commands exist here. */
export function openPilotStore(path: string, rootToken?: string) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS pilot_organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pilot_keys (key_hash TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES pilot_organizations(id), role TEXT NOT NULL, label TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT);
    CREATE TABLE IF NOT EXISTS pilot_sites (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES pilot_organizations(id), name TEXT NOT NULL, location TEXT NOT NULL, tariff_json TEXT NOT NULL, grid_limit_kw REAL NOT NULL, emission_factor REAL NOT NULL, factor_source TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pilot_readings (id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES pilot_sites(id), measured_at TEXT NOT NULL, imported_kwh REAL NOT NULL, exported_kwh REAL NOT NULL, pv_kwh REAL NOT NULL, diesel_kwh REAL NOT NULL, bess_charge_kwh REAL NOT NULL, bess_discharge_kwh REAL NOT NULL, soc_pct REAL, quality TEXT NOT NULL, source TEXT NOT NULL, UNIQUE(site_id,measured_at,source));
    CREATE TABLE IF NOT EXISTS pilot_factor_versions (id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES pilot_sites(id), valid_from TEXT NOT NULL, grid_kg_per_kwh REAL NOT NULL, diesel_kg_per_kwh REAL NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pilot_invoices (id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES pilot_sites(id), period_start TEXT NOT NULL, period_end TEXT NOT NULL, billed_kwh REAL NOT NULL, amount_vnd REAL NOT NULL, supplier TEXT NOT NULL, reference TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pilot_load_groups (id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES pilot_sites(id), name TEXT NOT NULL, category TEXT NOT NULL, rated_kw REAL NOT NULL, earliest_hour INTEGER NOT NULL, latest_hour INTEGER NOT NULL, required_hours REAL NOT NULL, enabled INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS pilot_plans (id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES pilot_sites(id), created_at TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pilot_audit (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, site_id TEXT, actor TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS pilot_readings_time ON pilot_readings(site_id,measured_at);
    CREATE INDEX IF NOT EXISTS pilot_invoices_period ON pilot_invoices(site_id,period_start);`);
  function audit(identity: Identity, action: string, siteId?: string) {
    db.prepare("INSERT INTO pilot_audit VALUES (?,?,?,?,?,?)").run(
      randomUUID(),
      identity.organizationId,
      siteId ?? null,
      identity.label,
      action,
      new Date().toISOString(),
    );
  }
  function authenticate(authorization?: string): Identity {
    const token = tokenFromHeader(authorization);
    const row = db
      .prepare(
        "SELECT organization_id,role,label FROM pilot_keys WHERE key_hash=? AND revoked_at IS NULL",
      )
      .get(hash(token));
    if (!row)
      throw new HttpError(
        401,
        "Mã truy cập pilot không hợp lệ.",
        "PILOT_UNAUTHORIZED",
      );
    return {
      organizationId: String(row.organization_id),
      role: row.role as Role,
      label: String(row.label),
    };
  }
  function requireRole(identity: Identity, allowed: Role[]) {
    if (!allowed.includes(identity.role))
      throw new HttpError(
        403,
        "Vai trò này không có quyền thực hiện.",
        "PILOT_FORBIDDEN",
      );
  }
  function site(identity: Identity, siteId: string): Row {
    if (!idPattern.test(siteId))
      throw new HttpError(400, "Mã công trường không hợp lệ.");
    const row = db
      .prepare("SELECT * FROM pilot_sites WHERE id=? AND organization_id=?")
      .get(siteId, identity.organizationId);
    if (!row)
      throw new HttpError(
        404,
        "Không tìm thấy công trường pilot.",
        "SITE_NOT_FOUND",
      );
    return row;
  }
  function issueKey(organizationId: string, role: Role, label: string) {
    const token = randomBytes(32).toString("base64url");
    db.prepare("INSERT INTO pilot_keys VALUES (?,?,?,?,?,NULL)").run(
      hash(token),
      organizationId,
      role,
      label,
      new Date().toISOString(),
    );
    return { id: hash(token), token, role, label };
  }
  return {
    close: () => db.close(),
    authenticate,
    requireRole,
    bootstrap(authorization: string | undefined, raw: unknown) {
      if (!rootToken || rootToken.length < 32)
        throw new HttpError(
          503,
          "PILOT_ROOT_TOKEN chưa được cấu hình.",
          "PILOT_NOT_CONFIGURED",
        );
      const token = tokenFromHeader(authorization);
      const a = Buffer.from(token),
        b = Buffer.from(rootToken);
      if (a.length !== b.length || !timingSafeEqual(a, b))
        throw new HttpError(
          401,
          "Mã quản trị hệ thống không hợp lệ.",
          "PILOT_UNAUTHORIZED",
        );
      const body = object(raw),
        name = required(body.name, "Tên tổ chức"),
        id = randomUUID();
      db.prepare("INSERT INTO pilot_organizations VALUES (?,?,?)").run(
        id,
        name,
        new Date().toISOString(),
      );
      const key = issueKey(
        id,
        "admin",
        required(body.adminLabel ?? "Quản trị", "Tên quản trị"),
      );
      return { organization: { id, name }, access: key };
    },
    issueKey(identity: Identity, raw: unknown) {
      requireRole(identity, ["admin"]);
      const body = object(raw),
        role = body.role;
      if (!(["admin", "engineer", "viewer"] as unknown[]).includes(role))
        throw new HttpError(400, "Vai trò không hợp lệ.");
      const key = issueKey(
        identity.organizationId,
        role as Role,
        required(body.label, "Tên người dùng"),
      );
      audit(identity, "key.created");
      return key;
    },
    revokeKey(identity: Identity, keyId: string) {
      requireRole(identity, ["admin"]);
      if (!/^[a-f0-9]{64}$/.test(keyId))
        throw new HttpError(400, "Mã khóa không hợp lệ.");
      const result = db
        .prepare(
          "UPDATE pilot_keys SET revoked_at=? WHERE key_hash=? AND organization_id=? AND revoked_at IS NULL",
        )
        .run(new Date().toISOString(), keyId, identity.organizationId);
      if (!result.changes)
        throw new HttpError(
          404,
          "Không tìm thấy mã đang hoạt động.",
          "KEY_NOT_FOUND",
        );
      audit(identity, "key.revoked");
      return { revoked: true };
    },
    workspace(identity: Identity) {
      const organization = db
        .prepare("SELECT id,name FROM pilot_organizations WHERE id=?")
        .get(identity.organizationId);
      const sites = db
        .prepare(
          "SELECT id,name,location,grid_limit_kw,emission_factor,factor_source,tariff_json FROM pilot_sites WHERE organization_id=? ORDER BY created_at",
        )
        .all(identity.organizationId)
        .map((r) => ({
          ...r,
          tariff: parseJSON(r, "tariff_json"),
          tariff_json: undefined,
        }));
      const keys =
        identity.role === "admin"
          ? db
              .prepare(
                "SELECT key_hash AS id,role,label,created_at,revoked_at FROM pilot_keys WHERE organization_id=? ORDER BY created_at",
              )
              .all(identity.organizationId)
          : undefined;
      return { organization, identity, sites, keys, controlMode: "simulation" };
    },
    createSite(identity: Identity, raw: unknown) {
      requireRole(identity, ["admin", "engineer"]);
      const body = object(raw),
        id = randomUUID(),
        tariff = object(body.tariff);
      const hours = (value: unknown, label: string): number[] => {
        if (value === undefined) return [];
        if (
          !Array.isArray(value) ||
          value.some((h) => !Number.isInteger(h) || h < 0 || h > 23) ||
          new Set(value).size !== value.length
        )
          throw new HttpError(
            400,
            `${label} cần danh sách giờ 0–23 không trùng.`,
            "VALIDATION_ERROR",
          );
        return value as number[];
      };
      const offPeakHours = hours(tariff.offPeakHours, "Giờ thấp điểm"),
        peakHours = hours(tariff.peakHours, "Giờ cao điểm");
      if (offPeakHours.some((h) => peakHours.includes(h)))
        throw new HttpError(400, "Giờ thấp và cao điểm bị trùng.");
      const rates = {
        offPeak: number(tariff.offPeak, "Giá thấp điểm"),
        normal: number(tariff.normal, "Giá bình thường"),
        peak: number(tariff.peak, "Giá cao điểm"),
        offPeakHours,
        peakHours,
      };
      const name = required(body.name, "Tên công trường"),
        location = required(body.location, "Địa điểm");
      const factorSource = required(
        body.factorSource,
        "Nguồn hệ số phát thải",
        500,
      );
      db.prepare("INSERT INTO pilot_sites VALUES (?,?,?,?,?,?,?,?,?)").run(
        id,
        identity.organizationId,
        name,
        location,
        JSON.stringify(rates),
        number(body.gridLimitKw, "Giới hạn lưới", 1, 1e6),
        number(body.emissionFactor, "Hệ số phát thải", 0, 10),
        factorSource,
        new Date().toISOString(),
      );
      db.prepare(
        "INSERT INTO pilot_factor_versions VALUES (?,?,?,?,?,?,?)",
      ).run(
        randomUUID(),
        id,
        new Date().toISOString().slice(0, 10),
        number(body.emissionFactor, "Hệ số điện lưới", 0, 10),
        number(body.dieselFactor, "Hệ số diesel", 0, 10),
        factorSource,
        new Date().toISOString(),
      );
      audit(identity, "site.created", id);
      return { id, name, location, tariff: rates };
    },
    readings(identity: Identity, siteId: string) {
      site(identity, siteId);
      return db
        .prepare(
          "SELECT * FROM pilot_readings WHERE site_id=? ORDER BY measured_at DESC LIMIT 1000",
        )
        .all(siteId);
    },
    addReadings(identity: Identity, siteId: string, raw: unknown) {
      requireRole(identity, ["admin", "engineer"]);
      site(identity, siteId);
      const values = object(raw).readings;
      if (!Array.isArray(values) || !values.length || values.length > 48)
        throw new HttpError(400, "Cần 1–48 số đo mỗi lần gửi.");
      const rows = values.map((value) => {
        const r = object(value);
        const quality = r.quality ?? "measured",
          source = r.source ?? "import";
        if (
          !["measured", "estimated", "missing"].includes(String(quality)) ||
          !["import", "adapter-simulated"].includes(String(source))
        )
          throw new HttpError(
            400,
            "Chất lượng hoặc nguồn dữ liệu không hợp lệ.",
          );
        const soc = r.socPct == null ? null : number(r.socPct, "SOC", 0, 100);
        return {
          id: randomUUID(),
          siteId,
          measuredAt: date(r.measuredAt, "Thời gian đo"),
          importedKwh: number(r.importedKwh, "Điện nhập"),
          exportedKwh: number(r.exportedKwh, "Điện xuất"),
          pvKwh: number(r.pvKwh, "Điện PV"),
          dieselKwh: number(r.dieselKwh, "Điện diesel"),
          bessChargeKwh: number(r.bessChargeKwh, "Điện sạc pin"),
          bessDischargeKwh: number(r.bessDischargeKwh, "Điện xả pin"),
          soc,
          quality: String(quality),
          source: String(source),
        };
      });
      db.exec("BEGIN IMMEDIATE");
      try {
        const insert = db.prepare(
          "INSERT INTO pilot_readings VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(site_id,measured_at,source) DO UPDATE SET imported_kwh=excluded.imported_kwh,exported_kwh=excluded.exported_kwh,pv_kwh=excluded.pv_kwh,diesel_kwh=excluded.diesel_kwh,bess_charge_kwh=excluded.bess_charge_kwh,bess_discharge_kwh=excluded.bess_discharge_kwh,soc_pct=excluded.soc_pct,quality=excluded.quality",
        );
        for (const r of rows)
          insert.run(
            r.id,
            r.siteId,
            r.measuredAt,
            r.importedKwh,
            r.exportedKwh,
            r.pvKwh,
            r.dieselKwh,
            r.bessChargeKwh,
            r.bessDischargeKwh,
            r.soc,
            r.quality,
            r.source,
          );
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      audit(identity, "readings.imported", siteId);
      return { accepted: rows.length };
    },
    simulateAdapter(identity: Identity, siteId: string, raw: unknown) {
      requireRole(identity, ["admin", "engineer"]);
      site(identity, siteId);
      const day = date(object(raw).day, "Ngày giả lập");
      if (day.includes("T")) throw new HttpError(400, "Cần ngày YYYY-MM-DD.");
      const readings = Array.from({ length: 96 }, (_, index) => {
        const hour = index / 4;
        const solar = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
        const at = new Date(`${day}T00:00:00Z`);
        at.setUTCMinutes(index * 15);
        return {
          measuredAt: at.toISOString(),
          importedKwh: Math.max(
            0,
            20 + 12 * Math.sin((hour / 24) * Math.PI) - solar * 12,
          ),
          exportedKwh: 0,
          pvKwh: solar * 12,
          dieselKwh: 0,
          bessChargeKwh: 0,
          bessDischargeKwh: 0,
          socPct: 50,
          quality: "estimated",
          source: "adapter-simulated",
        };
      });
      for (let index = 0; index < readings.length; index += 40)
        this.addReadings(identity, siteId, {
          readings: readings.slice(index, index + 40),
        });
      audit(identity, "adapter.simulated", siteId);
      return {
        accepted: readings.length,
        source: "adapter-simulated",
        commandsSent: 0,
        controlMode: "simulation",
      };
    },
    invoices(identity: Identity, siteId: string) {
      site(identity, siteId);
      return db
        .prepare(
          "SELECT * FROM pilot_invoices WHERE site_id=? ORDER BY period_start DESC",
        )
        .all(siteId);
    },
    addInvoice(identity: Identity, siteId: string, raw: unknown) {
      requireRole(identity, ["admin", "engineer"]);
      site(identity, siteId);
      const r = object(raw),
        start = date(r.periodStart, "Ngày bắt đầu"),
        end = date(r.periodEnd, "Ngày kết thúc");
      if (start.includes("T") || end.includes("T") || start >= end)
        throw new HttpError(
          400,
          "Kỳ hóa đơn cần hai ngày YYYY-MM-DD, ngày cuối không bao gồm.",
        );
      const id = randomUUID();
      db.prepare("INSERT INTO pilot_invoices VALUES (?,?,?,?,?,?,?,?,?)").run(
        id,
        siteId,
        start,
        end,
        number(r.billedKwh, "kWh hóa đơn"),
        number(r.amountVnd, "Số tiền VND"),
        required(r.supplier, "Nhà cung cấp"),
        required(r.reference, "Mã hóa đơn"),
        new Date().toISOString(),
      );
      audit(identity, "invoice.created", siteId);
      return { id };
    },
    loads(identity: Identity, siteId: string) {
      site(identity, siteId);
      return db
        .prepare(
          "SELECT * FROM pilot_load_groups WHERE site_id=? ORDER BY name",
        )
        .all(siteId);
    },
    addLoad(identity: Identity, siteId: string, raw: unknown) {
      requireRole(identity, ["admin", "engineer"]);
      site(identity, siteId);
      const r = object(raw),
        category = String(r.category);
      if (!["essential", "shiftable", "curtailable"].includes(category))
        throw new HttpError(400, "Loại tải không hợp lệ.");
      const earliest = number(r.earliestHour, "Giờ bắt đầu", 0, 23),
        latest = number(r.latestHour, "Giờ kết thúc", 1, 24),
        hours = number(r.requiredHours, "Số giờ cần chạy", 0, 24);
      if (
        !Number.isInteger(earliest) ||
        !Number.isInteger(latest) ||
        earliest >= latest ||
        !Number.isInteger(hours) ||
        hours < 1 ||
        hours > latest - earliest
      )
        throw new HttpError(400, "Khung giờ tải không hợp lệ.");
      const id = randomUUID();
      db.prepare(
        "INSERT INTO pilot_load_groups VALUES (?,?,?,?,?,?,?,?,?)",
      ).run(
        id,
        siteId,
        required(r.name, "Tên tải"),
        category,
        number(r.ratedKw, "Công suất tải", 0, 1e6),
        earliest,
        latest,
        hours,
        1,
      );
      audit(identity, "load.created", siteId);
      return { id };
    },
    plan(identity: Identity, siteId: string, raw: unknown) {
      requireRole(identity, ["admin", "engineer"]);
      const s = site(identity, siteId),
        r = object(raw),
        day = date(r.day, "Ngày lập kế hoạch");
      if (day.includes("T"))
        throw new HttpError(400, "Chỉ nhận ngày YYYY-MM-DD.");
      const loads = db
        .prepare(
          "SELECT * FROM pilot_load_groups WHERE site_id=? AND enabled=1",
        )
        .all(siteId);
      const tariff = parseJSON(s, "tariff_json") as {
        offPeak: number;
        normal: number;
        peak: number;
        offPeakHours: number[];
        peakHours: number[];
      };
      const priceAt = (hour: number) =>
        tariff.offPeakHours?.includes(hour)
          ? tariff.offPeak
          : tariff.peakHours?.includes(hour)
            ? tariff.peak
            : tariff.normal;
      const startUtc = new Date(
        Date.parse(`${day}T00:00:00Z`) - 7 * 3600000,
      ).toISOString();
      const endUtc = new Date(
        Date.parse(`${day}T00:00:00Z`) + 17 * 3600000,
      ).toISOString();
      const rows = db
        .prepare(
          "SELECT measured_at,pv_kwh,source FROM pilot_readings WHERE site_id=? AND measured_at>=? AND measured_at<? ORDER BY measured_at",
        )
        .all(siteId, startUtc, endUtc);
      const hasMeasured = rows.some((row) => row.source === "import");
      const readings = rows.filter(
        (row) => row.source === (hasMeasured ? "import" : "adapter-simulated"),
      );
      const pvByHour = Array(24).fill(0) as number[];
      for (const row of readings)
        pvByHour[(new Date(String(row.measured_at)).getUTCHours() + 7) % 24] +=
          Number(row.pv_kwh);
      const scheduled = Array(24).fill(0) as number[];
      const assigned: {
        id: unknown;
        name: unknown;
        category: unknown;
        startHour: number;
        endHour: number;
        ratedKw: unknown;
      }[] = [];
      const warnings: string[] = [];
      const ordered = [...loads].sort(
        (a, b) =>
          ({ essential: 0, shiftable: 1, curtailable: 2 })[
            String(a.category) as "essential" | "shiftable" | "curtailable"
          ] -
          { essential: 0, shiftable: 1, curtailable: 2 }[
            String(b.category) as "essential" | "shiftable" | "curtailable"
          ],
      );
      for (const load of ordered) {
        const kw = Number(load.rated_kw),
          duration = Number(load.required_hours),
          earliest = Number(load.earliest_hour),
          latest = Number(load.latest_hour);
        const candidates = Array.from(
          { length: latest - earliest - duration + 1 },
          (_, i) => earliest + i,
        );
        const feasible = candidates.filter((start) =>
          Array.from({ length: duration }, (_, i) => start + i).every(
            (hour) => scheduled[hour] + kw <= Number(s.grid_limit_kw),
          ),
        );
        let start: number | undefined;
        if (load.category === "essential") start = earliest;
        else if (load.category === "curtailable") {
          start = earliest;
          warnings.push(
            `${load.name}: có thể giảm tải nhưng chưa được tự động cắt.`,
          );
        } else if (feasible.length)
          start = feasible.sort((a, b) => {
            const score = (at: number) =>
              Array.from({ length: duration }, (_, i) => at + i).reduce(
                (total, hour) =>
                  total + Math.max(0, kw - pvByHour[hour]) * priceAt(hour),
                0,
              );
            return score(a) - score(b) || a - b;
          })[0];
        else
          warnings.push(
            `${load.name}: không có khung giờ đáp ứng giới hạn lưới; cần kỹ sư xem lại.`,
          );
        if (start !== undefined) {
          for (let hour = start; hour < start + duration; hour++)
            scheduled[hour] += kw;
          assigned.push({
            id: load.id,
            name: load.name,
            category: load.category,
            startHour: start,
            endHour: start + duration,
            ratedKw: load.rated_kw,
          });
        }
      }
      const peakKw = Math.max(0, ...scheduled);
      if (peakKw > Number(s.grid_limit_kw))
        warnings.push(
          "Tải thiết yếu hoặc tải cần duyệt vượt giới hạn lưới; kế hoạch không đủ điều kiện vận hành.",
        );
      if (!readings.length)
        warnings.push(
          "Chưa có số đo ngày này; kế hoạch chỉ dựa trên biểu giá và công suất tải.",
        );
      const data = {
        id: randomUUID(),
        siteId,
        day,
        mode: "simulation",
        zeroExportRequested: r.zeroExport === true,
        approved: false,
        dispatched: false,
        peakScheduledKw: peakKw,
        inputSource: hasMeasured
          ? "import"
          : readings.length
            ? "adapter-simulated"
            : "none",
        assumptions:
          "Lịch 1 giờ, múi giờ Việt Nam; PV khả dụng ước từ số đo cùng ngày. Không điều khiển thiết bị hay bảo đảm Zero-Export.",
        assignments: assigned,
        warnings,
        createdAt: new Date().toISOString(),
      };
      db.prepare("INSERT INTO pilot_plans VALUES (?,?,?,?)").run(
        data.id,
        siteId,
        data.createdAt,
        JSON.stringify(data),
      );
      audit(identity, "plan.simulated", siteId);
      return data;
    },
    report(identity: Identity, siteId: string) {
      const s = site(identity, siteId);
      const totals = db
        .prepare(
          "SELECT COUNT(*) AS intervals,COALESCE(SUM(CASE WHEN source='import' AND quality='measured' THEN imported_kwh ELSE 0 END),0) AS measured_imported_kwh,COALESCE(SUM(CASE WHEN source='import' AND quality='measured' THEN exported_kwh ELSE 0 END),0) AS measured_exported_kwh,COALESCE(SUM(CASE WHEN source='import' AND quality='measured' THEN pv_kwh ELSE 0 END),0) AS measured_pv_kwh,COALESCE(SUM(CASE WHEN source='import' AND quality='measured' THEN diesel_kwh ELSE 0 END),0) AS measured_diesel_kwh,SUM(CASE WHEN source='import' AND quality='measured' THEN 1 ELSE 0 END) AS measured_intervals,SUM(CASE WHEN source='adapter-simulated' THEN 1 ELSE 0 END) AS simulated_intervals FROM pilot_readings WHERE site_id=?",
        )
        .get(siteId)!;
      const invoiceRows = db
        .prepare(
          "SELECT * FROM pilot_invoices WHERE site_id=? ORDER BY period_start DESC",
        )
        .all(siteId);
      const byPeriod = db.prepare(
        "SELECT COUNT(*) AS intervals,COALESCE(SUM(imported_kwh),0) AS imported_kwh FROM pilot_readings WHERE site_id=? AND source='import' AND quality='measured' AND measured_at>=? AND measured_at<?",
      );
      const reconciliation = invoiceRows.map((invoice) => {
        const measure = byPeriod.get(
          siteId,
          new Date(
            Date.parse(`${invoice.period_start}T00:00:00Z`) - 7 * 3600000,
          ).toISOString(),
          new Date(
            Date.parse(`${invoice.period_end}T00:00:00Z`) - 7 * 3600000,
          ).toISOString(),
        )!;
        return {
          invoiceId: invoice.id,
          reference: invoice.reference,
          periodStart: invoice.period_start,
          periodEnd: invoice.period_end,
          billedKwh: invoice.billed_kwh,
          amountVnd: invoice.amount_vnd,
          measuredKwh: measure.imported_kwh,
          measuredIntervals: measure.intervals,
          gapKwh: Number(invoice.billed_kwh) - Number(measure.imported_kwh),
          comparable: Number(measure.intervals) > 0,
        };
      });
      const factor = db
        .prepare(
          "SELECT id,valid_from,grid_kg_per_kwh,diesel_kg_per_kwh,source FROM pilot_factor_versions WHERE site_id=? ORDER BY valid_from DESC,created_at DESC LIMIT 1",
        )
        .get(siteId);
      const gridFactor = Number(factor?.grid_kg_per_kwh ?? s.emission_factor);
      const dieselFactor = Number(factor?.diesel_kg_per_kwh ?? 0);
      return {
        siteId,
        controlMode: "simulation",
        dataStatus:
          Number(totals.measured_intervals) > 0
            ? "contains_measured_data"
            : "simulation_only",
        totals,
        reconciliation,
        estimatedGridCarbonKg:
          Number(totals.measured_imported_kwh) * gridFactor,
        estimatedDieselCarbonKg:
          Number(totals.measured_diesel_kwh) * dieselFactor,
        emissionFactor: {
          id: factor?.id ?? null,
          validFrom: factor?.valid_from ?? null,
          grid: gridFactor,
          diesel: dieselFactor,
          source: factor?.source ?? s.factor_source,
        },
        tariff: parseJSON(s, "tariff_json"),
        note: "Đối soát theo kỳ hóa đơn với số đo do người nhập đánh dấu measured; chưa được thiết bị xác minh. Chi phí thực tế lấy từ hóa đơn; chưa cộng thuế/phí ngoài hóa đơn. Dữ liệu giả lập không được tính vào kết quả thực tế. Không phải chứng nhận ESG.",
      };
    },
    audit(identity: Identity, siteId: string) {
      site(identity, siteId);
      return db
        .prepare(
          "SELECT actor,action,created_at FROM pilot_audit WHERE organization_id=? AND site_id=? ORDER BY created_at DESC LIMIT 100",
        )
        .all(identity.organizationId, siteId);
    },
  };
}
