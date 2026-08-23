import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const distRoot = resolve(projectRoot, "dist");
const clientRoot = resolve(distRoot, "client");

const requiredFiles = [
  "index.html",
  "styles.css",
  "robots.txt",
  "sitemap.xml",
  ".nojekyll",
  "lounge/lounge.css",
  "lounge/lounge.js",
  "lounge/jobs.css",
  "lounge/jobs.js",
  "lounge/settings.css",
  "lounge/settings.js",
  "lounge/placeholders.js",
  "lounge/js/pages/home.css",
  "lounge/js/pages/home.js",
];

for (const file of requiredFiles) {
  await access(resolve(projectRoot, file));
}
await access(resolve(projectRoot, "assets"));

await rm(distRoot, { recursive: true, force: true });
await mkdir(clientRoot, { recursive: true });

for (const file of [
  "index.html",
  "styles.css",
  "robots.txt",
  "sitemap.xml",
  ".nojekyll",
]) {
  await cp(resolve(projectRoot, file), resolve(clientRoot, file));
}

await cp(resolve(projectRoot, "lounge"), resolve(clientRoot, "lounge"), {
  recursive: true,
});
await cp(resolve(projectRoot, "assets"), resolve(clientRoot, "assets"), {
  recursive: true,
});

const html = await readFile(resolve(clientRoot, "index.html"), "utf8");
if (!html.includes("data-lounge-shell") || !html.includes("AI 회의록") || !html.includes("AI 쇼츠 스튜디오")) {
  throw new Error("루트 Builders Lounge 화면 또는 연결 자리 이름이 없습니다.");
}
if (!html.includes('href="lounge/lounge.css"') || !html.includes('src="lounge/lounge.js"')) {
  throw new Error("루트에서 Lounge 지원 파일 경로를 찾을 수 없습니다.");
}
if (/noindex\s*,?\s*nofollow/i.test(html) || html.includes("공개 홈페이지")) {
  throw new Error("루트에 검색 제외 설정 또는 이전 홈페이지 링크가 남아 있습니다.");
}

const sitemap = await readFile(resolve(clientRoot, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (urls.length !== 1 || urls[0] !== "https://aihubos.github.io/builders-lounge/") {
  throw new Error("sitemap.xml은 Builders Lounge 루트 주소만 포함해야 합니다.");
}

async function expectMissing(relativePath) {
  try {
    await access(resolve(clientRoot, relativePath));
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`빌드 결과에 삭제 대상이 남아 있습니다: ${relativePath}`);
}

for (const deletedPath of ["hermes.html", "script.js", "site-config.js", "install", "lounge/index.html"]) {
  await expectMissing(deletedPath);
}

await writeFile(resolve(distRoot, "BUILD_OK"), "Builders Lounge 정적 빌드 완료\n");
console.log(`정적 빌드 완료: ${distRoot}`);
