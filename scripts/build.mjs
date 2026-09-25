import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const out = resolve(root, "dist/client");
const files = ["index.html", "styles.css", "app.js", "data.js", "robots.txt", "sitemap.xml", ".nojekyll", "THIRD_PARTY_NOTICES.md", "assets"];

for (const file of files) await access(resolve(root, file));
const html = await readFile(resolve(root, "index.html"), "utf8");
for (const needed of ['href="styles.css', 'src="app.js']) {
  if (!html.includes(needed)) throw new Error("index.html에 " + needed + " 연결이 없습니다.");
}

await rm(resolve(root, "dist"), { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of files) await cp(resolve(root, file), resolve(out, file), { recursive: true });
console.log("정적 빌드 완료: " + out);
