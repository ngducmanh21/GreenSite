import { scenarioPresets } from "./presets.js";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Config, Site, ScenarioRecord } from "@greensite/contracts";
import { SITES, defaultConfig } from "./seed.js";
import { HttpError } from "../../common/http.js";
export function openDatabase(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;",
  );
  const version = Number(
    db.prepare("PRAGMA user_version").get()?.user_version ?? 0,
  );
  if (version > 1) {
    db.close();
    throw new Error("Database schema mới hơn service hiện tại.");
  }
  if (version === 0)
    db.exec(`BEGIN IMMEDIATE;
    CREATE TABLE sites (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE scenarios (site_id TEXT PRIMARY KEY REFERENCES sites(id), config TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE scenario_history (site_id TEXT NOT NULL REFERENCES sites(id), revision INTEGER NOT NULL, config TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (site_id, revision));
    PRAGMA user_version=1; COMMIT;`);
  const seed = db.prepare("INSERT OR IGNORE INTO sites (id,data) VALUES (?,?)");
  for (const site of SITES) seed.run(site.id, JSON.stringify(site));
  return {
    close: () => db.close(),
    ready: () => db.prepare("SELECT 1 AS ok").get(),
    sites: (): Site[] =>
      db
        .prepare("SELECT data FROM sites ORDER BY rowid")
        .all()
        .map((row) => JSON.parse(String(row.data))),
    site: (id: string): Site => {
      const row = db.prepare("SELECT data FROM sites WHERE id=?").get(id);
      if (!row)
        throw new HttpError(
          404,
          "Không tìm thấy công trường.",
          "SITE_NOT_FOUND",
        );
      return JSON.parse(String(row.data));
    },
    scenario(id: string): ScenarioRecord {
      const site = this.site(id),
        defaults = defaultConfig(site);
      const row = db
        .prepare(
          "SELECT config,revision,updated_at FROM scenarios WHERE site_id=?",
        )
        .get(id);
      return {
        presets: scenarioPresets(defaults),
        persistence: "sqlite",
        site,
        defaults,
        config: row ? JSON.parse(String(row.config)) : defaults,
        revision: row ? Number(row.revision) : 0,
        saved: !!row,
        updatedAt: row ? String(row.updated_at) : null,
      };
    },
    save(id: string, config: Config, expectedRevision: number): ScenarioRecord {
      this.site(id);
      db.exec("BEGIN IMMEDIATE");
      try {
        const current = Number(
          db.prepare("SELECT revision FROM scenarios WHERE site_id=?").get(id)
            ?.revision ?? 0,
        );
        if (current !== expectedRevision)
          throw new HttpError(
            409,
            "Kịch bản đã được cập nhật ở phiên khác. Tải lại cấu hình trước khi lưu.",
            "REVISION_CONFLICT",
          );
        const updated = new Date().toISOString(),
          revision = current + 1,
          json = JSON.stringify(config);
        db.prepare(
          "INSERT INTO scenarios(site_id,config,revision,updated_at) VALUES (?,?,?,?) ON CONFLICT(site_id) DO UPDATE SET config=excluded.config,revision=excluded.revision,updated_at=excluded.updated_at",
        ).run(id, json, revision, updated);
        db.prepare(
          "INSERT INTO scenario_history(site_id,revision,config,updated_at) VALUES (?,?,?,?)",
        ).run(id, revision, json, updated);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return this.scenario(id);
    },
    history(id: string) {
      this.site(id);
      return db
        .prepare(
          "SELECT revision,config,updated_at FROM scenario_history WHERE site_id=? ORDER BY revision DESC LIMIT 20",
        )
        .all(id)
        .map((row) => ({
          revision: Number(row.revision),
          config: JSON.parse(String(row.config)),
          updatedAt: String(row.updated_at),
        }));
    },
  };
}
