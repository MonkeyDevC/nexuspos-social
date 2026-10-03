import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Lee .env sin dependencias. Nunca imprime valores. */
export function loadEnv() {
  const file = path.join(ROOT, ".env");
  const out = {};
  if (!fs.existsSync(file)) throw new Error("Falta el archivo .env (copia .env.example)");
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!out.IG_ACCESS_TOKEN) throw new Error("IG_ACCESS_TOKEN vacío en .env");
  return out;
}
