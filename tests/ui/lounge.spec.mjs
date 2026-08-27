import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  ROUTES,
  ROUTE_TITLES,
  VIEWPORTS,
  captureRuntimeErrors,
  expectFocusOn,
  expectInteractiveTargets,
  expectMinimumVisibleTextSize,
  expectNoHorizontalOverflow,
  mockVisualPlatformConfig,
  openRoute,
  waitForUi,
} from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

async function establishQaSession(page, { isAdmin = false } = {}) {
  await page.route("**/lounge/me/ledger", (route) => route.fulfill({
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify({ ledger: [] }),
  }));
  await page.route("**/lounge/me", (route) => route.fulfill({
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify({
      user: {
        google_sub: "qa-user",
        name: isAdmin ? "QA 관리자" : "QA 빌더",
        email: isAdmin ? "qa-admin@example.com" : "qa-user@example.com",
        balance: 24,
        isAdmin,
      },
      tools: [],
    }),
  }));
  await page.evaluate(() => {
    const consent = document.querySelector("[data-platform-policy-consent]");
    if (consent) consent.checked = true;
    return window.BuildersPlatform.acceptCredential("qa-session-token");
  });
}

test("all routes open directly with the correct panel, title, navigation, and no runtime errors", async ({ page }) => {
  const errors = captureRuntimeErrors(page);
  for (const route of ROUTES) {
    await openRoute(page, route);
    await expect(page).toHaveTitle(`${ROUTE_TITLES[route]} | Builders Lounge`);
    await expect(page.locator(`[data-view-link="${route}"]`).first()).toHaveAttribute("aria-current", "page");
    const hiddenPanels = await page.locator("[data-view-panel]").evaluateAll((panels, activeRoute) => panels
      .filter((panel) => panel.dataset.viewPanel !== activeRoute)
      .every((panel) => panel.hidden), route);
    expect(hiddenPanels).toBeTruthy();
  }
  expect(errors, `콘솔 또는 페이지 오류: ${errors.join("\n")}`).toEqual([]);
});

test("all routes keep text and controls readable without horizontal overflow across target viewports", async ({ browser }) => {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    await mockVisualPlatformConfig(page);
    for (const route of ROUTES) {
      await openRoute(page, route);
      await expectNoHorizontalOverflow(page);
      await expectMinimumVisibleTextSize(page);
      await expectInteractiveTargets(page);
    }
    await page.close();
  }
});

test("global search returns results, navigates, closes with Escape, and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openRoute(page, "home");
  const opener = page.locator(".topbar-search-opener");
  await opener.focus();
  await opener.click();
  const dialog = page.locator("[data-global-search-dialog]");
  await expect(dialog).toHaveAttribute("open", "");
  await page.locator("[data-global-search-input]").fill("프롬프트");
  await expect(page.locator("[data-global-search-route]")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toHaveAttribute("open", "");
  await expectFocusOn(page, opener);
  await opener.click();
  await page.locator('[data-global-search-route="prompts"]').first().click();
  await expect(page.locator('[data-view-panel="prompts"]')).toBeVisible();
  await expect(dialog).not.toHaveAttribute("open", "");
});

test("mobile drawer makes the background inert, closes by scrim or Escape, and navigates", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoute(page, "home");
  const trigger = page.locator("[data-mobile-menu-open]");
  await trigger.click();
  await expect(page.locator("[data-lounge-shell]")).toHaveAttribute("data-menu-open", "");
  await expect(page.locator("#lounge-sidebar")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#lounge-main")).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-lounge-shell]")).not.toHaveAttribute("data-menu-open", "");
  await expect(page.locator("#lounge-sidebar")).toHaveAttribute("inert", "");
  await expect(page.locator("#lounge-main")).not.toHaveAttribute("inert", "");
  await expectFocusOn(page, page.locator("[data-lounge-menu-toggle]"));
  await trigger.click();
  await page.locator(".drawer-scrim").click({ position: { x: 2, y: 2 } });
  await expect(page.locator("[data-lounge-shell]")).not.toHaveAttribute("data-menu-open", "");
  await expectFocusOn(page, page.locator("[data-lounge-menu-toggle]"));
  await trigger.click();
  await page.locator('#lounge-sidebar [data-view-link="prompts"]').click();
  await expect(page.locator('[data-view-panel="prompts"]')).toBeVisible();
  await expect(page.locator("[data-lounge-shell]")).not.toHaveAttribute("data-menu-open", "");
  await expect(page.locator('#lounge-sidebar [data-view-link="prompts"]')).toHaveAttribute("aria-current", "page");
});

test("content and account dialogs open, close, and return focus", async ({ page }) => {
  const cases = [
    { route: "prompts", opener: "[data-catalog-open]", dialog: "[data-prompt-dialog]", closer: "[data-prompt-dialog-close]" },
    { route: "newsletter", opener: "[data-catalog-open]", dialog: "[data-newsletter-dialog]", closer: "[data-newsletter-dialog-close]" },
    { route: "memes", opener: "[data-catalog-open]", dialog: "[data-meme-dialog]", closer: "[data-meme-close]" },
    { route: "membership", opener: "[data-platform-login-open]", dialog: "[data-platform-login-dialog]", closer: "[data-platform-login-close]" },
  ];
  for (const item of cases) {
    await openRoute(page, item.route);
    const opener = page.locator(`[data-view-panel="${item.route}"] ${item.opener}`).first();
    await expect(opener).toBeVisible();
    await opener.click();
    const dialog = page.locator(item.dialog);
    await expect(dialog).toHaveAttribute("open", "");
    await expectMinimumVisibleTextSize(page);
    await expectInteractiveTargets(page);
    await dialog.locator(item.closer).first().click();
    await expect(dialog).not.toHaveAttribute("open", "");
    await expectFocusOn(page, opener);
  }
});

test("policy routes are public and Google login stays closed until policy consent", async ({ page }) => {
  await page.route("https://accounts.google.com/gsi/client", (route) => route.abort());
  await page.addInitScript(() => {
    window.google = {
      accounts: {
        id: {
          initialize() {},
          renderButton(container) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Google 계정으로 계속";
            container.replaceChildren(button);
          },
        },
      },
    };
  });
  await page.route("**/lounge/config", (route) => route.fulfill({
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify({ loginReady: true, googleClientId: "qa-client-id", tools: [] }),
  }));
  for (const route of ["guidelines", "privacy", "terms"]) {
    await openRoute(page, route);
    await expect(page.locator(`[data-view-panel="${route}"] .policy-meta`)).toBeVisible();
  }
  await openRoute(page, "membership");
  await page.locator("[data-platform-login-open]").first().click();
  const dialog = page.locator("[data-platform-login-dialog]");
  await expect(dialog.locator(".platform-policy-login-placeholder")).toBeDisabled();
  await dialog.locator("[data-platform-policy-consent]").check();
  await expect(dialog.locator("[data-google-signin-button] button")).toHaveText("Google 계정으로 계속");
});

test("board detail displays MP4 shorts and offers post and comment reporting", async ({ page }) => {
  const post = {
    id: "post-qa-mp4",
    category: "knowledge_share",
    title: "공개 쇼츠 확인",
    content: "공개된 쇼츠 본문입니다.",
    author: "QA 빌더",
    is_admin: 0,
    view_count: 3,
    comment_count: 1,
    created_at: "2026-08-28T00:00:00.000Z",
    origin: "shorts",
    mediaUrl: "https://media.example.com/shorts.mp4",
    mediaType: "video/mp4",
    can_edit: false,
  };
  await page.route("**/board/posts/post-qa-mp4/comments", (route) => route.fulfill({
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify({ comments: [{ id: "comment-qa", author: "댓글 작성자", content: "확인 댓글", created_at: "2026-08-28T00:01:00.000Z", can_edit: false }] }),
  }));
  await page.route("**/board/posts/post-qa-mp4/views", (route) => route.fulfill({
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify({ ok: true }),
  }));
  await page.route("**/board/posts/post-qa-mp4", (route) => route.fulfill({
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify({ post }),
  }));
  await page.goto("/?post=post-qa-mp4#board", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".board-detail-media")).toHaveAttribute("src", post.mediaUrl);
  await expect(page.locator(".board-detail-actions a").filter({ hasText: "신고" })).toHaveAttribute("href", /mailto:hello@ai-hub-os\.com/);
  await expect(page.locator(".board-comment-actions a").filter({ hasText: "신고" })).toHaveAttribute("href", /mailto:hello@ai-hub-os\.com/);
});

test("board writing requires the existing Google login gate before opening its form", async ({ page }) => {
  await openRoute(page, "board");
  const opener = page.locator('[data-view-panel="board"] [data-board-open-write]');
  await opener.click();
  const loginDialog = page.locator("[data-platform-login-dialog]");
  await expect(loginDialog).toHaveAttribute("open", "");
  await loginDialog.locator("[data-platform-login-close]").click();
  await expect(loginDialog).not.toHaveAttribute("open", "");
  await expectFocusOn(page, opener);
});

test("board writing dialog opens for an authenticated builder and restores focus", async ({ page }) => {
  await mockVisualPlatformConfig(page);
  await openRoute(page, "board");
  await establishQaSession(page);
  const opener = page.locator('[data-view-panel="board"] [data-board-open-write]');
  await opener.click();
  const dialog = page.locator("[data-board-post-dialog]");
  await expect(dialog).toHaveAttribute("open", "");
  await expectMinimumVisibleTextSize(page);
  await expectInteractiveTargets(page);
  await dialog.locator("[data-board-dialog-close]").first().click();
  await expect(dialog).not.toHaveAttribute("open", "");
  await expectFocusOn(page, opener);
});

test("admin controls remain readable for an authenticated administrator", async ({ page }) => {
  await mockVisualPlatformConfig(page);
  const adminSettings = {
    loginReady: true,
    encryptionReady: true,
    admins: [{ email: "qa-admin@example.com", active: 1 }],
    tools: [{
      id: "shorts",
      name: "AI 쇼츠 스튜디오",
      enabled: true,
      cost: 5,
      provider: "openrouter",
      endpointUrl: "https://openrouter.ai/api/v1/chat/completions",
      model: "qa-model",
      apiKeyConfigured: true,
    }],
  };
  const adminUsers = {
    users: [{
      google_sub: "qa-admin",
      display_name: "QA 관리자",
      email: "qa-admin@example.com",
      role: "admin",
      build_balance: 24,
    }],
  };
  await page.route(/\/lounge\/admin\/.+/, (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname.endsWith("/settings") ? adminSettings : pathname.endsWith("/users") ? adminUsers : {};
    return route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });
  await openRoute(page, "home");
  await establishQaSession(page, { isAdmin: true });
  await expect.poll(() => page.evaluate(() => window.BuildersPlatform.snapshot().user?.isAdmin)).toBe(true);
  await page.evaluate(() => { window.location.hash = "admin"; });
  await expect(page.locator("html")).toHaveAttribute("data-lounge-route", "admin");
  await waitForUi(page);
  await expect.poll(() => page.evaluate(() => window.BuildersPlatform.snapshot().user?.isAdmin)).toBe(true);
  await expect(page.locator(".admin-summary")).toBeVisible();
  await expectMinimumVisibleTextSize(page);
  await expectInteractiveTargets(page);
});

test("embedded tools load only after their route opens", async ({ page }) => {
  await openRoute(page, "home");
  await expect(page.locator('#view-webtoon iframe[src]')).toHaveCount(0);
  await expect(page.locator('#view-masterpiece iframe[src]')).toHaveCount(0);
  await openRoute(page, "webtoon");
  await expect(page.locator('#view-webtoon iframe[src]')).toHaveCount(1);
  await expect(page.locator('#view-webtoon a').filter({ hasText: "새 탭으로 열기" }).first()).toBeVisible();
  await openRoute(page, "masterpiece");
  await expect(page.locator('#view-masterpiece iframe[src]')).toHaveCount(1);
  await expect(page.locator('#view-masterpiece a').filter({ hasText: "새 탭으로 열기" }).first()).toBeVisible();
});

test("key routes have no axe core violations", async ({ page }) => {
  for (const route of ["home", "board", "prompts", "shorts", "settings", "admin"]) {
    await openRoute(page, route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${route} axe violations: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
  }
});

const visualCases = [
  { name: "home-1440", route: "home", viewport: { width: 1440, height: 900 } },
  { name: "board-1440", route: "board", viewport: { width: 1440, height: 900 } },
  { name: "prompts-768", route: "prompts", viewport: { width: 768, height: 1024 } },
  { name: "shorts-1180", route: "shorts", viewport: { width: 1180, height: 820 } },
  { name: "settings-768", route: "settings", viewport: { width: 768, height: 1024 } },
  { name: "login-390", route: "membership", viewport: { width: 390, height: 844 }, login: true },
];

for (const item of visualCases) {
  test(`@visual ${item.name}`, async ({ page }) => {
    await mockVisualPlatformConfig(page);
    if (item.login) await page.route("https://accounts.google.com/**", (route) => route.abort());
    await page.setViewportSize(item.viewport);
    await openRoute(page, item.route);
    if (item.login) {
      await page.locator("[data-platform-login-open]").first().click();
      await expect(page.locator("[data-platform-login-dialog]")).toHaveAttribute("open", "");
    }
    await waitForUi(page);
    await expect(page).toHaveScreenshot(`${item.name}.png`, {
      animations: "disabled",
      caret: "hide",
      fullPage: false,
      maxDiffPixelRatio: 0.01,
    });
  });
}
