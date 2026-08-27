"use strict";

(() => {
  const DENSITY_STORAGE_KEY = "ai-builders-lounge-density";
  const DEMO_MODE_STORAGE_KEY = "builders-lounge:demo-mode";
  const DENSITIES = new Set(["comfortable", "compact"]);

  function readDensity() {
    try {
      const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
      return DENSITIES.has(saved) ? saved : "comfortable";
    } catch { return "comfortable"; }
  }

  function saveValue(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* 브라우저 저장소가 제한되어도 현재 화면은 적용합니다. */ }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isRetiredTool(tool) {
    const id = String(tool?.id || "").trim().toLocaleLowerCase("en-US");
    return id === "meeting" || id === "minutes";
  }

  function runtimeConnection(snapshot = {}) {
    const config = snapshot.config || {};
    const tools = Array.isArray(snapshot.tools) ? snapshot.tools.filter((tool) => !isRetiredTool(tool)) : [];
    const configuredTools = tools.filter((tool) => tool?.enabled && tool?.apiKeyConfigured);
    const toolNames = configuredTools.map((tool) => String(tool.name || tool.id || "도구").trim()).filter(Boolean);
    const login = snapshot.loading
      ? { tone: "checking", label: "확인 중", detail: "서비스 설정을 확인하고 있습니다." }
      : config.loginReady
        ? { tone: "ready", label: "사용 가능", detail: "Google 계정으로 로그인할 수 있습니다." }
        : { tone: "attention", label: "설정 필요", detail: "관리자가 Google OAuth 클라이언트 ID를 등록해야 합니다." };
    const ai = snapshot.loading
      ? { tone: "checking", label: "확인 중", detail: "관리자 도구 설정을 불러오고 있습니다." }
      : { tone: configuredTools.length ? "ready" : "attention", label: configuredTools.length ? `${configuredTools.length}개 사용 가능` : "설정 필요", detail: toolNames.length ? `${toolNames.join(", ")}에서 생성 요청을 받을 수 있습니다.` : "관리자가 도구별 API 키와 사용 허용을 설정해야 합니다." };
    const renderer = snapshot.loading || typeof config.shortsRendererReady !== "boolean"
      ? { tone: "checking", label: "확인 중", detail: "쇼츠 렌더 서버 상태를 확인하고 있습니다." }
      : config.shortsRendererReady
        ? { tone: "ready", label: "사용 가능", detail: "MoneyPrinterTurbo 렌더 서버를 사용할 수 있습니다." }
        : { tone: "attention", label: "설정 필요", detail: "브라우저 WebM 제작은 가능하지만 서버 렌더 기능은 관리자 설정 후 사용할 수 있습니다." };
    return { login, ai, renderer, error: snapshot.error || "" };
  }

  function renderRuntimeConnection(container, snapshot) {
    const target = container.querySelector("[data-lounge-runtime-connection]");
    if (!target) return;
    const connection = runtimeConnection(snapshot);
    const states = [connection.login.tone, connection.ai.tone, connection.renderer.tone];
    const overall = snapshot.loading
      ? "확인 중"
      : states.every((state) => state === "ready")
        ? "모두 사용 가능"
        : states.some((state) => state === "ready")
          ? "일부 사용 가능"
          : "관리자 설정 필요";
    target.querySelector("[data-connection-badge]").textContent = overall;
      target.querySelector("[data-connection-badge]").dataset.state = snapshot.loading ? "checking" : overall === "모두 사용 가능" ? "ready" : "attention";
    target.querySelector("[data-connection-login]").innerHTML = `<strong>Google 로그인</strong><span>${escapeHtml(connection.login.label)}</span><small>${escapeHtml(connection.login.detail)}</small>`;
    target.querySelector("[data-connection-ai]").innerHTML = `<strong>AI 도구</strong><span>${escapeHtml(connection.ai.label)}</span><small>${escapeHtml(connection.ai.detail)}</small>`;
    target.querySelector("[data-connection-renderer]").innerHTML = `<strong>쇼츠 렌더 서버</strong><span>${escapeHtml(connection.renderer.label)}</span><small>${escapeHtml(connection.renderer.detail)}</small>`;
    const error = target.querySelector("[data-connection-error]");
    if (error) {
      error.hidden = !connection.error;
      error.textContent = connection.error ? `상태 확인 오류: ${connection.error}` : "";
    }
  }

  function applyDensity(container, value) {
    const nextValue = DENSITIES.has(value) ? value : "comfortable";
    const appRoot = container.closest("[data-lounge-shell], [data-lounge-app]") || document.documentElement;
    appRoot.dataset.density = nextValue;
    container.querySelectorAll("[data-lounge-density]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.loungeDensity === nextValue)));
    const status = container.querySelector("[data-lounge-density-status]");
    if (status) status.textContent = nextValue === "compact" ? "촘촘한 보기를 적용했습니다." : "여유 있는 보기를 적용했습니다.";
  }

  function render(container, options = {}) {
    if (!(container instanceof HTMLElement)) return;
    const density = readDensity();
    let demoMode = options.demoMode !== false;
    const onDemoChange = typeof options.onDemoChange === "function" ? options.onDemoChange : () => {};

    container.innerHTML = `<section class="lounge-settings" aria-labelledby="lounge-settings-title">
      <div class="panel-heading"><p class="section-label">SETTINGS</p><h3 id="lounge-settings-title">설정</h3><p>보기 선택은 현재 브라우저에 저장되고, 연결 상태는 서비스 응답을 기준으로 표시합니다.</p></div>
      <section class="settings-card" aria-labelledby="lounge-density-title"><div class="settings-card-copy"><span class="sample-label">보기 설정</span><h4 id="lounge-density-title">화면 밀도</h4><p>카드와 목록의 간격만 바꿔 글자 크기를 유지한 채 편한 방식으로 확인합니다.</p></div><div class="choice-list" aria-label="화면 밀도 선택"><button class="choice-button" type="button" data-lounge-density="comfortable" aria-pressed="${density === "comfortable"}">여유 있게</button><button class="choice-button" type="button" data-lounge-density="compact" aria-pressed="${density === "compact"}">촘촘하게</button></div><p class="setting-status" role="status" aria-live="polite" data-lounge-density-status>${density === "compact" ? "촘촘한 보기를 적용했습니다." : "여유 있는 보기를 적용했습니다."}</p></section>
      <section class="settings-card settings-toggle-card" aria-labelledby="lounge-demo-title"><div class="settings-card-copy"><span class="sample-label">데이터 표시</span><h4 id="lounge-demo-title">화면 확인용 데이터</h4><p>작업·결과물·파일 영역에 제공된 샘플 데이터를 표시합니다. 실제 계정 작업과 결과는 별도로 표시됩니다.</p></div><button class="toggle-button" type="button" role="switch" aria-labelledby="lounge-demo-title" aria-checked="${demoMode}" data-lounge-demo-toggle><span></span><strong>${demoMode ? "켜짐" : "꺼짐"}</strong></button></section>
      <section class="settings-card settings-connection-card" aria-labelledby="lounge-connection-title" data-lounge-runtime-connection><div class="settings-card-copy"><span class="sample-label">서비스 상태</span><h4 id="lounge-connection-title">연결 상태</h4><div class="connection-status-list"><div data-connection-login></div><div data-connection-ai></div><div data-connection-renderer></div></div><p class="connection-error" data-connection-error role="status" hidden></p></div><span class="connection-badge" data-connection-badge>확인 중</span></section>
      <section class="settings-card settings-help-card" aria-labelledby="lounge-settings-help-title"><div class="settings-card-copy"><span class="sample-label">도움말</span><h4 id="lounge-settings-help-title">초기화 방법</h4><p>보기 밀도와 화면 확인용 데이터 표시는 이 브라우저에서만 저장됩니다. 저장값을 지우면 기본값으로 돌아갑니다.</p></div><a class="secondary-button" href="#help" data-view-link="help">도움말 보기 <span aria-hidden="true">→</span></a></section>
    </section>`;

    applyDensity(container, density);
    container.querySelectorAll("[data-lounge-density]").forEach((button) => button.addEventListener("click", () => {
      const next = button.dataset.loungeDensity;
      saveValue(DENSITY_STORAGE_KEY, next);
      applyDensity(container, next);
    }));
    container.querySelector("[data-lounge-demo-toggle]")?.addEventListener("click", (event) => {
      demoMode = !demoMode;
      const button = event.currentTarget;
      saveValue(DEMO_MODE_STORAGE_KEY, demoMode ? "on" : "off");
      button.setAttribute("aria-checked", String(demoMode));
      button.querySelector("strong").textContent = demoMode ? "켜짐" : "꺼짐";
      onDemoChange(demoMode);
    });

    const platform = window.BuildersPlatform;
    renderRuntimeConnection(container, platform?.snapshot?.() || {});
    platform?.subscribe?.((snapshot) => renderRuntimeConnection(container, snapshot));
  }

  window.LoungeSettings = Object.freeze({ render });
})();
