"use strict";

(() => {
  const DENSITY_STORAGE_KEY = "ai-builders-lounge-density";
  const DENSITIES = new Set(["comfortable", "compact"]);

  function readDensity() {
    try {
      const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
      return DENSITIES.has(saved) ? saved : "comfortable";
    } catch {
      return "comfortable";
    }
  }

  function saveDensity(value) {
    if (!DENSITIES.has(value)) return;
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, value);
    } catch {
      // 저장이 제한된 환경에서도 선택한 화면은 이 페이지에서 적용합니다.
    }
  }

  function applyDensity(container, value) {
    const nextValue = DENSITIES.has(value) ? value : "comfortable";
    const appRoot = container.closest("[data-lounge-shell], [data-lounge-app]") || document.documentElement;
    appRoot.dataset.density = nextValue;
    container.querySelectorAll("[data-lounge-density]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.loungeDensity === nextValue));
    });
    const status = container.querySelector("[data-lounge-density-status]");
    if (status) status.textContent = nextValue === "compact" ? "촘촘한 보기를 적용했습니다." : "여유 있는 보기를 적용했습니다.";
    return nextValue;
  }

  function render(container) {
    if (!(container instanceof HTMLElement)) return;
    const density = readDensity();

    container.innerHTML = `
      <section class="lounge-settings" aria-labelledby="lounge-settings-title">
        <header class="lounge-page-heading">
          <p class="lounge-kicker">내 계정</p>
          <h1 id="lounge-settings-title">설정과 도움말</h1>
          <p>AI 도구를 연결하기 전, 이 작업공간의 공통 환경과 이용 안내를 확인합니다.</p>
        </header>

        <section class="lounge-settings-section" aria-labelledby="lounge-density-title">
          <div class="lounge-choice-group">
            <h2 id="lounge-density-title">화면 보기</h2>
            <p>이 선택만 현재 브라우저에 저장됩니다. 계정 정보나 작업 자료는 이 화면에서 저장하지 않습니다.</p>
          </div>
          <div class="lounge-choice-list" aria-label="화면 보기 선택">
            <button class="lounge-choice" type="button" data-lounge-density="comfortable" aria-pressed="${density === "comfortable"}">여유 있게 보기</button>
            <button class="lounge-choice" type="button" data-lounge-density="compact" aria-pressed="${density === "compact"}">촘촘하게 보기</button>
          </div>
          <p class="lounge-setting-status" role="status" aria-live="polite" data-lounge-density-status>${density === "compact" ? "촘촘한 보기를 적용했습니다." : "여유 있는 보기를 적용했습니다."}</p>
        </section>

        <section class="lounge-settings-section" aria-labelledby="lounge-connect-title">
          <h2 id="lounge-connect-title">기능 연결 상태</h2>
          <ul class="lounge-module-list">
            <li><strong>AI 회의록</strong><span class="lounge-module-status">기존 기능 연결 예정</span></li>
            <li><strong>AI 쇼츠 스튜디오</strong><span class="lounge-module-status">기존 기능 연결 예정</span></li>
          </ul>
          <p>연결 주소와 권한이 등록되기 전에는 이 작업공간에서 자료를 받거나 처리하지 않습니다.</p>
        </section>

        <section class="lounge-settings-section" aria-labelledby="lounge-help-title">
          <h2 id="lounge-help-title">도움말</h2>
          <ul class="lounge-help-list">
            <li><details><summary>지금 사용할 수 있는 범위</summary><p>홈, 작업 내역, 멤버십·사용량, 설정·도움말을 확인할 수 있습니다. AI 회의록과 AI 쇼츠 스튜디오는 기존 기능을 연결할 자리만 준비되어 있습니다.</p></details></li>
            <li><details><summary>자료와 개인정보 안내</summary><p>현재 두 도구에는 업로드·생성·API 호출이 연결되어 있지 않습니다. 이 화면은 계정·결제정보를 요청하지 않습니다.</p></details></li>
            <li><details><summary>기존 홈페이지로 돌아가기</summary><p><a class="lounge-text-link" href="../">AI 빌더스 랩 홈페이지 열기</a></p></details></li>
          </ul>
        </section>
      </section>
    `;

    applyDensity(container, density);
    container.querySelectorAll("[data-lounge-density]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextValue = button.dataset.loungeDensity;
        saveDensity(nextValue);
        applyDensity(container, nextValue);
      });
    });
  }

  window.LoungeSettings = Object.freeze({ render });
})();
