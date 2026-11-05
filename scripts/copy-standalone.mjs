import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../frontend/", import.meta.url));
await mkdir(`${root}.next/standalone/frontend/.next`, { recursive: true });
await cp(
  `${root}.next/static`,
  `${root}.next/standalone/frontend/.next/static`,
  { recursive: true },
);
await cp(`${root}public`, `${root}.next/standalone/frontend/public`, {
  recursive: true,
});
