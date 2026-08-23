import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const sourceSupport = [
  "index.html",
  "styles.css",
  "robots.txt",
  "sitemap.xml",
  "lounge/lounge.css",
  "lounge/lounge.js",
  "lounge/topbar.css",
  "lounge/topbar.js",
  "lounge/demo-data.js",
  "lounge/jobs.css",
  "lounge/jobs.js",
  "lounge/settings.css",
  "lounge/settings.js",
  "lounge/placeholders.js",
  "lounge/js/pages/home.css",
  "lounge/js/pages/home.js",
];
const loungeScripts = [
  "lounge/lounge.js",
  "lounge/demo-data.js",
  "lounge/topbar.js",
  "lounge/jobs.js",
  "lounge/settings.js",
  "lounge/placeholders.js",
  "lounge/js/pages/home.js",
];

async function exists(base, file) {
  try {
    await access(resolve(base, file));
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

for (const file of sourceSupport) {
  expect(await exists(root, file), "소스 지원 파일이 없습니다: " + file);
}

const indexHtml = await readFile(resolve(root, "index.html"), "utf8");
const settingsScript = await readFile(resolve(root, "lounge/settings.js"), "utf8");
const loungeScript = (await Promise.all(
  loungeScripts.map((file) => readFile(resolve(root, file), "utf8")),
)).join("\n");
const topbarScript = await readFile(resolve(root, "lounge/topbar.js"), "utf8");
const robots = await readFile(resolve(root, "robots.txt"), "utf8");
const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");

expect(indexHtml.includes("data-lounge-shell"), "루트 Builders Lounge 셸이 없습니다.");
expect(indexHtml.includes('href="lounge/lounge.css"') && indexHtml.includes('src="lounge/lounge.js"'), "루트 Lounge 경로가 없습니다.");
expect(indexHtml.includes('href="assets/favicon.png"') && indexHtml.includes('src="assets/report-hub-logo.png"'), "루트 assets 경로가 없습니다.");
expect(indexHtml.includes('<link rel="canonical" href="https://aihubos.github.io/builders-lounge/" />'), "canonical 루트 주소가 없습니다.");
expect(indexHtml.includes('<meta property="og:url" content="https://aihubos.github.io/builders-lounge/" />'), "OG 루트 주소가 없습니다.");
expect(!/noindex\s*,?\s*nofollow/i.test(indexHtml), "루트 검색 제외 설정이 남아 있습니다.");
expect(!indexHtml.includes("공개 홈페이지") && !indexHtml.includes("topbar-home-link"), "이전 홈페이지 링크가 남아 있습니다.");
expect(indexHtml.includes("AI 회의록") && indexHtml.includes("AI 쇼츠 스튜디오"), "연결 예정 기능 표기가 없습니다.");
expect(indexHtml.includes("샘플 UI MVP") && indexHtml.includes("MVP 데모"), "샘플 MVP 안내가 부족합니다.");
const nonVisitorScripts = loungeScript.replace(topbarScript, "");
expect(!/type\s*=\s*["']file/i.test(indexHtml) && !/\b(XMLHttpRequest|FormData)\b/.test(nonVisitorScripts) && !/\bfetch\s*\(/.test(nonVisitorScripts), "연결 전 외부 요청·업로드 로직이 있습니다.");
expect(topbarScript.includes('SITE_ID = "builders-lounge"') && topbarScript.includes("builders-lounge:visitor-id") && topbarScript.includes("/visits"), "방문 집계 설정이 Builders Lounge 전용이 아닙니다.");
expect(settingsScript.includes('href="#help"') && !settingsScript.includes("기존 홈페이지"), "설정 도움말 링크가 잘못되었습니다.");
expect(robots.includes("Allow: /") && robots.includes("Sitemap: https://aihubos.github.io/builders-lounge/sitemap.xml"), "robots.txt 루트 sitemap 참조가 없습니다.");

const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
expect(urls.length === 1 && urls[0] === "https://aihubos.github.io/builders-lounge/", "sitemap.xml은 루트 주소만 포함해야 합니다.");

for (const file of [
  "hermes.html",
  "script.js",
  "site-config.js",
  "install/index.html",
  "install/install.css",
  "install/install.js",
  "design-qa.md",
  "lounge/index.html",
]) {
  expect(!(await exists(root, file)), "삭제 대상 소스가 남아 있습니다: " + file);
}

const dist = resolve(root, "dist", "client");
for (const file of [
  "index.html",
  "styles.css",
  "assets",
  "robots.txt",
  "sitemap.xml",
  ".nojekyll",
  "lounge/lounge.css",
  "lounge/lounge.js",
  "lounge/topbar.css",
  "lounge/topbar.js",
  "lounge/demo-data.js",
  "lounge/jobs.css",
  "lounge/jobs.js",
  "lounge/settings.css",
  "lounge/settings.js",
  "lounge/placeholders.js",
  "lounge/js/pages/home.css",
  "lounge/js/pages/home.js",
]) {
  expect(await exists(dist, file), "빌드 결과 필수 파일이 없습니다: " + file);
}
for (const file of ["hermes.html", "script.js", "site-config.js", "install", "lounge/index.html"]) {
  expect(!(await exists(dist, file)), "빌드 결과에 삭제 대상이 남아 있습니다: " + file);
}

const builtIndex = await readFile(resolve(dist, "index.html"), "utf8");
const builtSitemap = await readFile(resolve(dist, "sitemap.xml"), "utf8");
expect(builtIndex.includes("data-lounge-shell") && !/noindex\s*,?\s*nofollow/i.test(builtIndex), "빌드 루트가 Lounge indexable 화면이 아닙니다.");
const builtUrls = [...builtSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
expect(builtUrls.length === 1 && builtUrls[0] === "https://aihubos.github.io/builders-lounge/", "빌드 sitemap이 루트만 가리키지 않습니다.");

console.log("Builders Lounge 루트 전환과 정적 산출물 검사 통과");
