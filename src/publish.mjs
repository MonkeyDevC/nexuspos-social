// Uso:
//   node src/publish.mjs posts/<carpeta>            -> simulación (no publica nada)
//   node src/publish.mjs posts/<carpeta> --yes      -> publica de verdad
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadEnv } from "./env.mjs";
import { InstagramClient } from "./instagram.mjs";

const REPO = "MonkeyDevC/nexuspos-social";
const [, , rel, flag] = process.argv;
if (!rel) { console.error("Indica la carpeta del post, p. ej. posts/2026-10-05_carrusel_senales-de-perdida"); process.exit(1); }

const dir = path.resolve(ROOT, rel);
const post = JSON.parse(fs.readFileSync(path.join(dir, "post.json"), "utf8"));
const baseUrl = `https://raw.githubusercontent.com/${REPO}/main/${path.relative(ROOT, dir).split(path.sep).join("/")}`;
const imageUrls = post.images.map((f) => `${baseUrl}/${f}`);

console.log(`Post: ${post.title}\nTipo: ${post.type} · ${imageUrls.length} imagen(es) · estado: ${post.status}`);
imageUrls.forEach((u) => console.log("  " + u));

if (post.type !== "carousel" && post.type !== "image") { console.error(`Tipo no soportado todavía: ${post.type}`); process.exit(1); }
if (flag !== "--yes") { console.log("\nSimulación: no se publicó nada. Añade --yes para publicar."); process.exit(0); }
if (post.status === "published") { console.error("Este post ya figura como publicado."); process.exit(1); }

const env = loadEnv();
const ig = new InstagramClient({ token: env.IG_ACCESS_TOKEN, version: env.IG_API_VERSION });
const result = post.type === "carousel"
  ? await ig.publishCarousel({ imageUrls, caption: post.caption })
  : await ig.publishImage({ imageUrl: imageUrls[0], caption: post.caption });

post.status = "published";
post.published = { id: result.id, permalink: result.permalink, at: new Date().toISOString() };
fs.writeFileSync(path.join(dir, "post.json"), JSON.stringify(post, null, 2) + "\n");
console.log(`\nPublicado: ${result.permalink}`);
