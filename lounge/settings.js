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
      <div class="panel-heading"><p class="section-label">SETTINGS</p><h3 id="lounge-settings-title">설정</h3><p>이 선택값은 현재 브라우저에만 저장됩니다.</p></div>
      <section class="settings-card" aria-labelledby="lounge-density-title"><div class="settings-card-copy"><span class="sample-label">보기 설정</span><h4 id="lounge-density-title">화면 밀도</h4><p>카드와 목록의 간격을 바꿔 편한 방식으로 확인합니다.</p></div><div class="choice-list" aria-label="화면 밀도 선택"><button class="choice-button" type="button" data-lounge-density="comfortable" aria-pressed="${density === "comfortable"}">여유 있게</button><button class="choice-button" type="button" data-lounge-density="compact" aria-pressed="${density === "compact"}">촘촘하게</button></div><p class="setting-status" role="status" aria-live="polite" data-lounge-density-status>${density === "compact" ? "촘촘한 보기를 적용했습니다." : "여유 있는 보기를 적용했습니다."}</p></section>
      <section class="settings-card settings-toggle-card" aria-labelledby="lounge-demo-title"><div class="settings-card-copy"><span class="sample-label">MVP 표시</span><h4 id="lounge-demo-title">샘플 데이터 표시</h4><p>작업·결과물·파일과 샘플 사용량을 화면에 보여줍니다. 실제 데이터는 아닙니다.</p></div><button class="toggle-button" type="button" role="switch" aria-checked="${demoMode}" data-lounge-demo-toggle><span></span><strong>${demoMode ? "켜짐" : "꺼짐"}</strong></button></section>
      <section class="settings-card" aria-labelledby="lounge-connection-title"><div class="settings-card-copy"><span class="sample-label">연결 상태</span><h4 id="lounge-connection-title">AI 도구 연결 전</h4><p>이번 MVP에는 로그인, 파일 업로드, AI API, 결제와 외부 권한 변경이 포함되지 않습니다.</p></div><span class="connection-badge">연결 준비 중</span></section>
      <section class="settings-card settings-help-card" aria-labelledby="lounge-settings-help-title"><div class="settings-card-copy"><span class="sample-label">도움말</span><h4 id="lounge-settings-help-title">초기화 방법</h4><p>샘플 표시를 다시 켜고 기본 보기로 돌아가려면 이 브라우저의 저장값을 지우면 됩니다.</p></div><a class="secondary-button" href="#help" data-view-link="help">도움말 보기 <span aria-hidden="true">→</span></a></section>
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
  }

  window.LoungeSettings = Object.freeze({ render });
})();
