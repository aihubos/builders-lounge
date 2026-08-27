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
  "THIRD_PARTY_NOTICES.md",
  "assets/builders-lounge-logo.png",
  "lounge/tokens.css",
  "lounge/base.css",
  "lounge/lounge.css",
  "lounge/community.css",
  "lounge/portal.css",
  "lounge/platform.css",
  "lounge/lounge.js",
  "lounge/platform.js",
  "lounge/shorts.css",
  "lounge/shorts.js",
  "lounge/admin.js",
  "lounge/topbar.css",
  "lounge/topbar.js",
  "lounge/demo-data.js",
  "lounge/community-data.js",
  "lounge/catalog.js",
  "lounge/community.js",
  "lounge/jobs.css",
  "lounge/jobs.js",
  "lounge/settings.css",
  "lounge/settings.js",
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
  "THIRD_PARTY_NOTICES.md",
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
const expectedLoungeStyles = [
  "lounge/tokens.css?v=20260827-ui-v1",
  "lounge/base.css?v=20260827-ui-v1",
  "lounge/topbar.css?v=20260827-ui-v1",
  "lounge/lounge.css?v=20260827-ui-v1",
  "lounge/portal.css?v=20260827-ui-v1",
  "lounge/js/pages/home.css?v=20260827-ui-v1",
  "lounge/community.css?v=20260827-ui-v1",
  "lounge/platform.css?v=20260827-ui-v1",
  "lounge/jobs.css?v=20260827-ui-v1",
  "lounge/settings.css?v=20260827-ui-v1",
  "lounge/shorts.css?v=20260827-ui-v1",
];
let previousStyleIndex = -1;
for (const href of expectedLoungeStyles) {
  const styleIndex = html.indexOf(`href="${href}"`);
  if (styleIndex <= previousStyleIndex) {
    throw new Error(`Lounge CSS 로드 순서가 잘못되었거나 캐시 키가 다릅니다: ${href}`);
  }
  previousStyleIndex = styleIndex;
}
if (/href="(?:\.\/)?styles\.css(?:[?#"]|$)/.test(html)) {
  throw new Error("Lounge 페이지에서 styles.css를 로드하면 안 됩니다.");
}
const loungeCss = await readFile(resolve(clientRoot, "lounge/lounge.css"), "utf8");
if (loungeCss.includes("@import")) {
  throw new Error("lounge/lounge.css에 @import가 남아 있습니다.");
}
if (!html.includes("data-lounge-shell") || !html.includes("AI 쇼츠 스튜디오")) {
  throw new Error("루트 Builders Lounge 화면 또는 쇼츠 스튜디오가 없습니다.");
}
if (!html.includes('data-community-view="newsletter"') || !html.includes('data-community-view="board"')) {
  throw new Error("Builders Lounge 커뮤니티 화면이 없습니다.");
}
if (!html.includes('href="lounge/lounge.css') || !html.includes('href="lounge/portal.css') || !html.includes('href="lounge/shorts.css') || !html.includes('src="lounge/lounge.js')) {
  throw new Error("루트에서 Lounge 지원 파일 경로를 찾을 수 없습니다.");
}
if (!html.includes('src="assets/builders-lounge-logo.png"') || !html.includes("data-home-mount") || !html.includes("portal-mobile-nav")) {
  throw new Error("Builders Lounge 통합 로고, 홈 마운트 또는 모바일 메뉴가 없습니다.");
}
if (html.includes('src="assets/report-hub-logo.png"') || html.includes("lounge-portal-header")) throw new Error("이전 Report Hub 로고 또는 이중 상단 헤더가 남아 있습니다.");
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
