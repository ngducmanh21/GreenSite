import type { Config, ScenarioRecord } from "@greensite/contracts";
import { HttpError } from "../../common/http.js";
import { defaultConfig, SITES } from "./seed.js";

/** Explicit read-only preview. Never claims to persist a configuration. */
export function openDemoDatabase() {
  function site(id: string) {
    const value = SITES.find((item) => item.id === id);
    if (!value)
      throw new HttpError(404, "Không tìm thấy công trường.", "SITE_NOT_FOUND");
    return structuredClone(value);
  }
  return {
    close() {},
    ready() {
      return { ok: 1 };
    },
    sites() {
      return structuredClone(SITES);
    },
    site,
    scenario(id: string): ScenarioRecord {
      const value = site(id);
      return {
        site: value,
        defaults: defaultConfig(value),
        config: defaultConfig(value),
        revision: 0,
        saved: false,
        updatedAt: null,
        persistence: "demo",
      };
    },
    save(_id: string, _config: Config, _revision: number): ScenarioRecord {
      throw new HttpError(
        503,
        "Bản demo chưa kết nối database. Bạn có thể mô phỏng và xuất báo cáo, nhưng chưa lưu được kịch bản.",
        "PERSISTENCE_NOT_CONFIGURED",
      );
    },
    history(id: string) {
      site(id);
      return [];
    },
  };
}
