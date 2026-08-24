import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const sourceSupport = [
  "index.html",
  "styles.css",
  "robots.txt",
  "sitemap.xml",
  "THIRD_PARTY_NOTICES.md",
  "assets/builders-lounge-logo.png",
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
  "lounge/community.js",
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
  "lounge/platform.js",
  "lounge/shorts.js",
  "lounge/admin.js",
  "lounge/demo-data.js",
  "lounge/community-data.js",
  "lounge/community.js",
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
const communityScript = await readFile(resolve(root, "lounge/community.js"), "utf8");
const platformScript = await readFile(resolve(root, "lounge/platform.js"), "utf8");
const shortsScript = await readFile(resolve(root, "lounge/shorts.js"), "utf8");
const robots = await readFile(resolve(root, "robots.txt"), "utf8");
const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");

expect(indexHtml.includes("data-lounge-shell"), "루트 Builders Lounge 셸이 없습니다.");
expect(indexHtml.includes('href="lounge/lounge.css"') && indexHtml.includes('href="lounge/portal.css"') && indexHtml.includes('href="lounge/shorts.css') && indexHtml.includes('src="lounge/lounge.js'), "루트 Lounge 경로가 없습니다.");
expect(indexHtml.includes('href="assets/favicon.png"') && indexHtml.includes('src="assets/builders-lounge-logo.png"'), "루트 Builders Lounge 자산 경로가 없습니다.");
expect(indexHtml.includes("data-home-mount") && indexHtml.includes("portal-mobile-nav") && loungeScript.includes("portal-index-list"), "홈 마운트, 모바일 메뉴 또는 빠른 콘텐츠 목록이 없습니다.");
expect(!indexHtml.includes("portal-brand-mark") && !indexHtml.includes("portal-brand-copy"), "이전 임시 Builders Lounge 로고가 남아 있습니다.");
expect(!indexHtml.includes('src="assets/report-hub-logo.png"') && !indexHtml.includes("lounge-portal-header"), "이전 Report Hub 로고 또는 이중 상단 헤더가 남아 있습니다.");
expect(indexHtml.includes('<link rel="canonical" href="https://aihubos.github.io/builders-lounge/" />'), "canonical 루트 주소가 없습니다.");
expect(indexHtml.includes('<meta property="og:url" content="https://aihubos.github.io/builders-lounge/" />'), "OG 루트 주소가 없습니다.");
expect(!/noindex\s*,?\s*nofollow/i.test(indexHtml), "루트 검색 제외 설정이 남아 있습니다.");
expect(!indexHtml.includes("공개 홈페이지") && !indexHtml.includes("topbar-home-link"), "이전 홈페이지 링크가 남아 있습니다.");
expect(indexHtml.includes("AI 회의록") && indexHtml.includes("AI 쇼츠 스튜디오"), "연결 예정 기능 표기가 없습니다.");
expect(indexHtml.includes('data-community-view="newsletter"') && indexHtml.includes('data-community-view="board"'), "커뮤니티 화면 표기가 없습니다.");
for (const route of ["home", "meeting", "shorts", "webtoon", "masterpiece", "prompts", "newsletter", "videos", "memes", "board", "games", "usage", "admin", "help"]) {
  expect(indexHtml.includes(`data-view-link="${route}"`) && indexHtml.includes(`data-view-panel="${route}"`), `직접 메뉴 화면 연결이 없습니다: ${route}`);
}
for (const route of ["jobs", "results", "files", "membership", "settings"]) {
  expect(indexHtml.includes(`data-view-panel="${route}"`), `내부 화면 패널이 없습니다: ${route}`);
}
expect(indexHtml.includes("웹툰 제작기") && indexHtml.includes("https://aihubos.github.io/gonggamtoon/"), "웹툰 제작기 메뉴 연결이 없습니다.");
expect(indexHtml.includes("세계명화 프롬프트") && indexHtml.includes('src="https://aihubos.github.io/world-masterpiece-bot/'), "세계명화 프롬프트 메뉴 연결이 없습니다.");
expect(indexHtml.includes("커뮤니티 운영 중") && indexHtml.includes("실제 파일"), "실제 커뮤니티와 샘플 기능의 범위 안내가 부족합니다.");
const nonVisitorScripts = loungeScript.replace(topbarScript, "").replace(communityScript, "").replace(platformScript, "").replace(shortsScript, "");
expect(!/\b(XMLHttpRequest|FormData)\b/.test(nonVisitorScripts) && !/\bfetch\s*\(/.test(nonVisitorScripts), "허용되지 않은 외부 요청·업로드 로직이 있습니다.");
expect(communityScript.includes("reportmode-request-board.report-request-board.workers.dev") && communityScript.includes("/board/posts"), "통합 게시판 API 연결이 없습니다.");
expect(platformScript.includes("/lounge/me") && platformScript.includes("/lounge/tools/") && indexHtml.includes("https://accounts.google.com/gsi/client"), "Google 로그인 또는 빌드 도구 API 연결이 없습니다.");
expect(shortsScript.includes("renderWebm") && shortsScript.includes("BuildersPlatform.shorts.upload") && shortsScript.includes("BuildersPlatform.shorts.render") && shortsScript.includes("BuildersPlatform.shorts.renderSync") && shortsScript.includes("BuildersPlatform.shorts.publish"), "쇼츠 MPT·브라우저 렌더·저장·수동 게시 흐름이 없습니다.");
expect(shortsScript.includes("data-shorts-progress") && shortsScript.includes("data-shorts-progress-value") && shortsScript.includes("startEstimatedProgress"), "쇼츠 제작 애니메이션 또는 진행률 표시가 없습니다.");
expect(shortsScript.includes("data-shorts-plan-form") && shortsScript.includes("data-scene-narration") && platformScript.includes("updatePlan"), "쇼츠 제작 내용 수정·저장 흐름이 없습니다.");
expect(shortsScript.includes("data-auth-required") && shortsScript.includes("Google 로그인 후 제작"), "쇼츠 제작 버튼의 Google 로그인 잠금이 없습니다.");
expect(platformScript.includes("shortsRendererReady") || shortsScript.includes("shortsRendererReady"), "쇼츠 렌더 서버 준비 상태 계약이 없습니다.");
expect(platformScript.includes('"video/mp4"') && shortsScript.includes('"video/mp4"') && shortsScript.includes("MPT_KOREAN_VOICE"), "쇼츠 MP4·한국어 음성 표시 계약이 없습니다.");
expect(shortsScript.includes("게시 버튼을 누르기 전에는 게시되지 않습니다") && shortsScript.includes("rewardBuilds") && communityScript.includes("board-detail-media"), "쇼츠 수동 게시 또는 게시판 영상 표시 계약이 없습니다.");
expect(!/localStorage\.(setItem|getItem)\([^\n]*(credential|token|api.?key)/i.test(platformScript), "로그인 토큰이나 API 키를 브라우저 영구 저장소에 보관하고 있습니다.");
expect(indexHtml.includes("쇼츠 영상은 저장 성공 시 5빌드") && indexHtml.includes("data-admin-slot") && indexHtml.includes("data-platform-account"), "빌드 포인트 또는 관리자 화면 연결이 없습니다.");
expect(!/\/Users\/JeremyLee\//.test(communityScript) && !/\/Users\/JeremyLee\//.test(indexHtml), "로컬 절대 경로가 공개 코드에 포함되어 있습니다.");
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
  "assets/builders-lounge-logo.png",
  "robots.txt",
  "sitemap.xml",
  ".nojekyll",
  "THIRD_PARTY_NOTICES.md",
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
  "lounge/community.js",
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
