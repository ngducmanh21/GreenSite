import fs from "node:fs";
import ts from "typescript";
const cache = new Map();
export function moduleURL(path) {
  if (cache.has(path)) return cache.get(path);
  let source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  for (const name of ["ems", "http"]) {
    if (source.includes(`@/lib/${name}`))
      source = source.replaceAll(
        `@/lib/${name}`,
        moduleURL(`../lib/${name}.ts`),
      );
  }
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  cache.set(path, url);
  return url;
}
export const ems = await import(moduleURL("../lib/ems.ts"));
