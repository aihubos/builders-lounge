const MODULES = Object.freeze([
  {
    id: "meeting-notes",
    title: "AI 회의록",
    description: "기존 회의록 기능을 연결할 자리입니다.",
    status: "기존 기능 연결 예정",
    action: "meeting-notes",
  },
  {
    id: "shorts-studio",
    title: "AI 쇼츠 스튜디오",
    description: "기존 쇼츠 제작 기능을 연결할 자리입니다.",
    status: "기존 기능 연결 예정",
    action: "shorts-studio",
  },
]);

function normalizeOptions(rootOrOptions, maybeOptions = {}) {
  if (rootOrOptions && typeof rootOrOptions === "object" && "root" in rootOrOptions) {
    return rootOrOptions;
  }
  return { ...maybeOptions, root: rootOrOptions };
}

function moduleRow(module) {
  return `
    <article class="lounge-home-module" data-module-id="${module.id}">
      <div class="lounge-home-module-copy">
        <p class="lounge-home-module-status">${module.status}</p>
        <h3>${module.title}</h3>
        <p>${module.description}</p>
      </div>
      <button class="lounge-home-module-action" type="button" data-home-module="${module.action}">
        연결 자리 보기
      </button>
    </article>
  `;
}

/**
 * Render the member workspace home page.
 *
 * The module accepts either `renderHome(root, options)` or
 * `renderHome({ root, onNavigate, onModuleOpen })` so the shell can adopt the
 * page without coupling itself to a router implementation.
 */
export function renderHome(rootOrOptions, maybeOptions = {}) {
  const { root, onNavigate = () => {}, onModuleOpen = () => {} } = normalizeOptions(
    rootOrOptions,
    maybeOptions,
  );

  if (!(root instanceof HTMLElement)) {
    throw new TypeError("renderHome requires a DOM element as root");
  }

  root.innerHTML = `
    <section class="lounge-home">
      <section class="lounge-home-section" aria-labelledby="home-title">
        <div class="lounge-home-section-heading">
          <div>
            <p class="lounge-home-eyebrow">도구</p>
            <h2 id="home-title">만들기</h2>
          </div>
          <div class="lounge-home-access" role="status" aria-live="polite">
            <span class="lounge-home-access-label">멤버십 상태</span>
            <strong>연결 준비 중</strong>
            <small>승인 후 로그인과 권한 확인을 연결합니다.</small>
          </div>
        </div>
        <p class="lounge-home-section-lead">도구 이름과 연결 상태를 먼저 확인합니다.</p>
        <div class="lounge-home-module-list">
          ${MODULES.map(moduleRow).join("")}
        </div>
      </section>

      <div class="lounge-home-columns">
        <section class="lounge-home-section lounge-home-section-compact" aria-labelledby="lounge-home-jobs-title">
          <div class="lounge-home-section-heading">
            <div>
              <p class="lounge-home-eyebrow">내 작업</p>
              <h2 id="lounge-home-jobs-title">진행 중 작업</h2>
            </div>
            <button class="lounge-home-text-action" type="button" data-home-nav="jobs">전체 보기</button>
          </div>
          <div class="lounge-home-empty" role="status">
            <strong>진행 중인 작업이 없습니다.</strong>
            <span>도구가 연결되면 처리 상태가 이곳에 표시됩니다.</span>
          </div>
        </section>

        <section class="lounge-home-section lounge-home-section-compact" aria-labelledby="lounge-home-usage-title">
          <div class="lounge-home-section-heading">
            <div>
              <p class="lounge-home-eyebrow">계정</p>
              <h2 id="lounge-home-usage-title">사용량</h2>
            </div>
            <button class="lounge-home-text-action" type="button" data-home-nav="usage">자세히</button>
          </div>
          <div class="lounge-home-usage" role="status">
            <strong>확인 전</strong>
            <span>멤버십 연결 뒤 남은 사용량을 표시합니다.</span>
          </div>
        </section>
      </div>

      <section class="lounge-home-next" aria-labelledby="lounge-home-next-title">
        <div>
          <p class="lounge-home-eyebrow">다음 단계</p>
          <h2 id="lounge-home-next-title">멤버십 연결이 승인되면 바로 이어집니다.</h2>
          <p>현재 화면은 기능 연결 전에도 메뉴와 상태를 이해할 수 있도록 구성했습니다.</p>
        </div>
        <button class="lounge-home-button" type="button" data-home-nav="membership">
          멤버십 상태 보기
        </button>
      </section>
    </section>
  `;

  const handleClick = (event) => {
    const navButton = event.target.closest("[data-home-nav]");
    if (navButton) {
      onNavigate(navButton.dataset.homeNav);
      return;
    }

    const moduleButton = event.target.closest("[data-home-module]");
    if (moduleButton) {
      const module = MODULES.find((item) => item.action === moduleButton.dataset.homeModule);
      if (module) onModuleOpen(module);
    }
  };

  root.addEventListener("click", handleClick);
  return () => {
    root.removeEventListener("click", handleClick);
    root.replaceChildren();
  };
}

export { MODULES };
export default renderHome;
