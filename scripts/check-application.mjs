import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const sourceFiles = [
  "index.html",
  "hermes.html",
  "styles.css",
  "script.js",
  "site-config.js",
  "robots.txt",
  "sitemap.xml",
  "install/index.html",
  "install/install.css",
  "install/install.js",
  "lounge/index.html",
  "lounge/lounge.css",
  "lounge/lounge.js",
  "lounge/settings.js",
  "lounge/placeholders.js",
];

const contents = await Promise.all(
  sourceFiles.map(async (file) => [file, await readFile(resolve(root, file), "utf8")]),
);
const source = new Map(contents);
const indexHtml = source.get("index.html");
const script = source.get("script.js");
const config = source.get("site-config.js");
const hermesHtml = source.get("hermes.html");
const installHtml = source.get("install/index.html");
const installScript = source.get("install/install.js");
const loungeHtml = source.get("lounge/index.html");
const loungeScript = source.get("lounge/lounge.js");
const loungeSettingsScript = source.get("lounge/settings.js");
const loungePlaceholdersScript = source.get("lounge/placeholders.js");
const scanned = [...source.values()].join("\n");

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

[
  "outcomes",
  "proof",
  "curriculum",
  "audience",
  "trust",
  "schedule",
  "faq",
  "final-cta",
].forEach((id) => expect(indexHtml.includes(`id="${id}"`), `#${id} 섹션이 없습니다.`));

expect((indexHtml.match(/data-primary-cta/g) || []).length >= 4, "주요 카카오 CTA가 충분하지 않습니다.");
expect(indexHtml.includes('data-contact-key="kakaoProfile"'), "개인 카카오 CTA 설정이 없습니다.");
expect(indexHtml.includes("수요일·토요일"), "정기 운영 요일이 없습니다.");
expect(indexHtml.includes("20,000원") && indexHtml.includes("최대 3명"), "현재 가격 또는 정원이 없습니다.");
expect(indexHtml.includes("동탄") && indexHtml.includes("개인 노트북"), "지역 또는 준비물이 없습니다.");
expect(indexHtml.includes('aria-controls="curriculum-part-0"'), "커리큘럼 아코디언 연결이 없습니다.");
expect(indexHtml.includes("FAQPage") && indexHtml.includes('"@type": "Organization"') && indexHtml.includes('"@type": "Course"'), "JSON-LD 구조화 데이터가 없습니다.");
expect(!/<video[^>]*\bautoplay\b/i.test(indexHtml), "히어로 영상 자동재생이 남아 있습니다.");
expect(/<video[^>]*preload="none"/i.test(indexHtml), "히어로 영상의 지연 로드 설정이 없습니다.");
expect(!/api\/google-calendar\.ics|googleapis\.com\/calendar|countapi\.mileshilliard|AIzaSy/i.test(scanned), "실패하는 외부 런타임 호출 또는 API 키가 남아 있습니다.");
expect(script.includes("assets/google-calendar.ics") && script.includes("일정 스냅샷을 읽지 못했습니다"), "정적 ICS fallback 또는 오류 상태가 없습니다.");
expect(!/[—–]/.test(scanned), "화면 문구에 긴 대시 문자가 남아 있습니다.");
expect(!/data-airtable|Airtable|AIRTABLE|airtable\.com|신청 폼 준비/i.test(scanned), "Airtable 신청 흐름이 남아 있습니다.");
expect(!/전화 문의|010-3065|821030657890|oneToOneInterest/i.test(scanned), "삭제 대상 전화 문의 정보가 남아 있습니다.");
expect(!/api\.airtable\.com|Authorization:\s*Bearer|pat[A-Za-z0-9_-]{10,}/i.test(scanned), "외부 인증 정보가 남아 있습니다.");
expect(config.includes("kakaoProfile") && config.includes("snapshotUrl"), "공개 사이트 설정이 없습니다.");
expect(source.get("robots.txt").includes("sitemap.xml"), "robots.txt에 sitemap 참조가 없습니다.");
expect(source.get("sitemap.xml").includes("hermes.html") && source.get("sitemap.xml").includes("install/"), "sitemap.xml 경로가 부족합니다.");
expect(indexHtml.includes('href="install/"'), "메인 내비게이션에 설치 안내 링크가 없습니다.");

expect(installHtml.includes("Codex 설치 요청문 복사"), "설치 요청문 복사 버튼이 없습니다.");
expect(installHtml.includes("TELEGRAM_ALLOWED_USERS"), "Telegram 사용자 허용 목록 안내가 없습니다.");
expect(installHtml.includes("v1.2.1"), "안정 버전이 설치 요청문에 없습니다.");
expect(installHtml.includes("https://raw.githubusercontent.com/jeremylee0213/builderslab-starter/v1.2.1/prompts/codex-install.md"), "버전 고정 Codex 지침 URL이 없습니다.");
expect(installHtml.includes("공식 Hermes Desktop App만 설치"), "Desktop 전용 설치 안내가 없습니다.");
expect(installHtml.includes("Desktop 확인에 실패하면 전체 설치를 중단"), "Desktop 확인 실패 중단 안내가 없습니다.");
expect(installHtml.includes("CLI 전용 설치를 자동 실행하지"), "CLI 전용 자동 설치 금지 안내가 없습니다.");
expect(installHtml.includes("`1`, `2`, `3` 형식으로 답하게"), "번호형 사용자 질문 안내가 없습니다.");
expect(installHtml.includes("Hermes 공식 비밀번호형 자격증명 입력란"), "Bot Token 전용 입력란 안내가 없습니다.");
expect(installHtml.includes("Codex 대화창, 홈페이지, 공개 문서에는 붙여넣지"), "Bot Token 노출 방지 안내가 없습니다.");
expect(!/curl -fsSL|iex\s*\(irm/i.test(installHtml), "홈페이지에 긴 설치 명령을 중복하면 안 됩니다.");
expect(installScript.includes("navigator.clipboard"), "클립보드 복사 동작이 없습니다.");
expect(hermesHtml.includes("Hermes + LLM Wiki 3시간"), "기존 Hermes 입문교육 페이지가 바뀌었습니다.");

expect(indexHtml.includes('href="lounge/"'), "공개 홈페이지에 멤버 도구 진입 링크가 없습니다.");
expect(loungeHtml.includes("AI 회의록") && loungeHtml.includes("AI 쇼츠 스튜디오"), "두 기존 기능의 정확한 표기명이 없습니다.");
expect((loungeHtml.match(/기존 기능 연결 예정/g) || []).length >= 2, "기존 기능 연결 자리가 부족합니다.");
expect(/<meta\s+name=["']robots["']\s+content=["']noindex,nofollow["']/i.test(loungeHtml), "연결 전 멤버 작업공간의 검색 제외 설정이 없습니다.");
expect(!/type\s*=\s*["']file/i.test(loungeHtml), "연결 전 멤버 작업공간에 파일 업로드가 추가되었습니다.");
expect(!/\b(fetch|XMLHttpRequest|FormData)\b/.test(`${loungeScript}\n${loungeSettingsScript}\n${loungePlaceholdersScript}`), "연결 전 멤버 작업공간에 외부 요청 또는 업로드 로직이 추가되었습니다.");
expect(loungeSettingsScript.includes("localStorage"), "작업공간의 로컬 화면 설정 저장이 없습니다.");

const builtIndex = await readFile(resolve(root, "dist", "client", "index.html"), "utf8");
const builtScript = await readFile(resolve(root, "dist", "client", "script.js"), "utf8");
const builtInstall = await readFile(resolve(root, "dist", "client", "install", "index.html"), "utf8");
const builtLounge = await readFile(resolve(root, "dist", "client", "lounge", "index.html"), "utf8");
expect(!/api\/google-calendar\.ics|googleapis\.com\/calendar|countapi\.mileshilliard|AIzaSy/i.test(`${builtIndex}\n${builtScript}`), "빌드 결과에 외부 런타임 호출 또는 API 키가 남아 있습니다.");
expect(builtIndex.includes('id="curriculum"') && builtIndex.includes("FAQPage"), "빌드 결과에 전환형 홈페이지가 없습니다.");
expect(builtInstall.includes("Codex 설치 요청문 복사"), "빌드 결과에 설치 페이지가 없습니다.");
expect(builtLounge.includes("AI 회의록") && builtLounge.includes("AI 쇼츠 스튜디오"), "빌드 결과에 멤버 도구 화면이 없습니다.");
await access(resolve(root, "dist", "client", "index.html"));
await access(resolve(root, "dist", "client", "hermes.html"));
await access(resolve(root, "dist", "client", "install", "install.css"));
await access(resolve(root, "dist", "client", "install", "install.js"));
await access(resolve(root, "dist", "client", "lounge", "index.html"));
await access(resolve(root, "dist", "client", "lounge", "lounge.css"));
await access(resolve(root, "dist", "client", "lounge", "lounge.js"));
await access(resolve(root, "dist", "client", "sitemap.xml"));

console.log("전환형 홈페이지, 정적 캘린더, SEO, 신청 채널과 설치 페이지 정적 검사 통과");
