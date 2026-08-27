import { expect } from "@playwright/test";

export const ROUTES = Object.freeze([
  "home", "board", "prompts", "newsletter", "videos", "memes", "games",
  "shorts", "webtoon", "masterpiece", "jobs", "results", "files", "usage",
  "membership", "settings", "help", "admin",
  "guidelines", "privacy", "terms",
]);

export const ROUTE_TITLES = Object.freeze({
  home: "홈",
  board: "자유게시판",
  prompts: "프롬프트 모음",
  newsletter: "뉴스레터",
  videos: "영상 모음",
  memes: "이미지 게시판",
  games: "게임방",
  shorts: "AI 쇼츠 스튜디오",
  webtoon: "웹툰 제작기",
  masterpiece: "세계명화 프롬프트",
  jobs: "진행 중 작업",
  results: "결과물",
  files: "파일",
  usage: "빌드 내역",
  membership: "내 계정",
  settings: "설정",
  help: "이용 안내",
  admin: "관리자 설정",
  guidelines: "커뮤니티 운영정책",
  privacy: "개인정보 처리 안내",
  terms: "이용약관",
});

export const VIEWPORTS = Object.freeze([
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1180, height: 820 },
  { name: "desktop", width: 1440, height: 900 },
]);

const VISUAL_PLATFORM_CONFIG = Object.freeze({
  loginReady: true,
  googleClientId: "",
  shortsRendererReady: false,
  tools: [
    { id: "shorts", name: "AI 쇼츠 스튜디오", enabled: true, apiKeyConfigured: true, cost: 5 },
    { id: "webtoon", name: "웹툰 제작기", enabled: true, apiKeyConfigured: true, cost: 2 },
    { id: "masterpiece", name: "세계명화 프롬프트", enabled: true, apiKeyConfigured: true, cost: 1 },
  ],
});

export async function mockVisualPlatformConfig(page) {
  await page.route("**/lounge/config", (route) => route.fulfill({
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(VISUAL_PLATFORM_CONFIG),
  }));
}

export async function waitForUi(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(280);
}

export async function openRoute(page, route) {
  await page.goto(`/?qa=ui#${route}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-lounge-route", route);
  await expect(page.locator(`[data-view-panel="${route}"]`)).toBeVisible();
  await waitForUi(page);
}

export async function expectNoHorizontalOverflow(page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow).toBeFalsy();
}

export async function expectMinimumVisibleTextSize(page, minimum = 12) {
  const violations = await page.evaluate((minimumSize) => {
    const ignored = "script, style, template, svg, .visually-hidden, [aria-hidden='true'], iframe";
    return [...document.querySelectorAll("body *")]
      .filter((element) => {
        if (!(element instanceof HTMLElement) || element.closest(ignored)) return false;
        const ownText = [...element.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim() || "")
          .join(" ")
          .trim();
        if (!ownText) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .map((element) => ({
        text: [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent?.trim() || "").join(" ").slice(0, 80),
        size: Number.parseFloat(getComputedStyle(element).fontSize),
      }))
      .filter((item) => Number.isFinite(item.size) && item.size < minimumSize);
  }, minimum);
  expect(violations, `12px 미만의 보이는 텍스트: ${JSON.stringify(violations)}`).toEqual([]);
}

export async function expectInteractiveTargets(page, minimum = 44) {
  const violations = await page.evaluate((minimumSize) => {
    const ignored = ".visually-hidden, [aria-hidden='true'], iframe, [data-google-signin-button]";
    return [...document.querySelectorAll("button, [role='button'], a[aria-label]")]
      .filter((element) => {
        if (!(element instanceof HTMLElement) || element.closest(ignored)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return !element.hasAttribute("disabled") && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 80), width: rect.width, height: rect.height };
      })
      .filter((item) => item.width + 0.5 < minimumSize || item.height + 0.5 < minimumSize);
  }, minimum);
  expect(violations, `44px 미만의 인터랙티브 요소: ${JSON.stringify(violations)}`).toEqual([]);
}

export function captureRuntimeErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    const text = message.text();
    const isExpectedGoogleFramePolicyWarning = text.includes("Framing 'https://accounts.google.com/'")
      && text.includes("frame-ancestors 'self'");
    if (message.type() === "error" && !isExpectedGoogleFramePolicyWarning) errors.push(text);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export async function expectFocusOn(page, locator) {
  await expect.poll(async () => locator.evaluate((element) => document.activeElement === element)).toBeTruthy();
}
