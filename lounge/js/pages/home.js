import { catalogCardCover, catalogItems } from "../../catalog.js";

const MODULES = Object.freeze([
  { id: "shorts", title: "AI 쇼츠 스튜디오", description: "주제와 대본을 쇼츠 제작안으로 바꿉니다.", icon: "▶", action: "shorts", accent: "navy" },
  { id: "webtoon", title: "웹툰 제작기", description: "대화와 아이디어를 공감 카드로 바꿉니다.", icon: "▣", action: "webtoon", accent: "green" },
  { id: "masterpiece", title: "세계명화 프롬프트", description: "명화와 캐릭터를 새로운 장면으로 조합합니다.", icon: "♜", action: "masterpiece", accent: "orange" },
]);

function normalizeOptions(rootOrOptions, maybeOptions = {}) {
  if (rootOrOptions && typeof rootOrOptions === "object" && "root" in rootOrOptions) return rootOrOptions;
  return { ...maybeOptions, root: rootOrOptions };
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function renderTool(module) {
  const setting = window.BuildersPlatform?.getTool?.(module.id);
  const cost = Number(setting?.cost);
  const detail = setting?.enabled && Number.isFinite(cost) && cost >= 0
    ? `${cost.toLocaleString("ko-KR")}빌드`
    : setting
      ? "관리자 설정 필요"
      : "비용 확인 중";
  return `<button class="portal-tool-card portal-tool-${module.accent}" type="button" data-home-module="${module.action}"><span class="portal-tool-icon" aria-hidden="true">${module.icon}</span><span class="portal-tool-copy"><span><strong>${module.title}</strong><em>${detail}</em></span><small>${module.description}</small></span><span class="portal-row-arrow" aria-hidden="true">→</span></button>`;
}

function renderBuildCard(session) {
  if (!session?.authenticated) {
    return `<section class="portal-rail-card portal-build-card"><div class="portal-rail-head"><div><h4>빌드 잔액</h4></div><span>로그인 전</span></div><p>Google 로그인 후 글이나 댓글을 남기면 각각 1빌드가 적립됩니다.</p><button class="primary-button" type="button" data-home-login>Google 로그인</button></section>`;
  }
  const user = session.user || {};
  const shorts = window.BuildersPlatform?.getTool?.("shorts");
  const shortsCost = Number(shorts?.cost);
  const shortsCopy = shorts?.enabled && Number.isFinite(shortsCost) && shortsCost >= 0
    ? `일반 글·댓글은 +1빌드, 쇼츠 영상은 저장 성공 시 ${shortsCost.toLocaleString("ko-KR")}빌드입니다.`
    : "일반 글·댓글은 +1빌드, 쇼츠 영상은 저장 성공 시 관리자 설정 비용을 사용합니다.";
  return `<section class="portal-rail-card portal-build-card"><div class="portal-rail-head"><div><h4>${escapeHtml(user.name || "빌더")}님의 빌드</h4></div><span>${Number(user.balance || 0).toLocaleString("ko-KR")}빌드</span></div><p>${shortsCopy}</p><div class="portal-build-actions"><button class="primary-button" type="button" data-home-write>글 쓰고 적립</button><button class="text-button" type="button" data-home-nav="usage">내역 보기</button></div></section>`;
}

function cardCover(item, fallback) {
  const src = catalogCardCover(item);
  const optimized = { "assets/og.png": "assets/og.webp", "assets/report-hub-banner.png": "assets/report-hub-banner.webp" }[src];
  return `<picture>${optimized ? `<source srcset="${optimized}" type="image/webp">` : ""}<img src="${escapeHtml(src)}" alt="${escapeHtml(item.title || fallback)}" width="1600" height="1000" loading="lazy" decoding="async"></picture>`;
}

function bindBrokenImages(root) {
  root.querySelectorAll(".catalog-card-cover img").forEach((image) => {
    if (image.dataset.errorBound) return;
    image.dataset.errorBound = "true";
    image.addEventListener("error", () => {
      const fallback = document.createElement("span");
      fallback.className = "image-fallback";
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", "이미지를 불러오지 못했습니다");
      fallback.textContent = "이미지를 불러오지 못했습니다";
      image.replaceWith(fallback);
    }, { once: true });
  });
}

function renderHomeCard(item, route, kicker) {
  return `<button class="catalog-card" type="button" data-home-nav="${route}"><span class="catalog-card-cover">${cardCover(item, kicker)}</span><span class="catalog-card-copy"><span class="community-chip">${escapeHtml(item.kicker || item.category || kicker)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.summary || "")}</small></span></button>`;
}

function renderHome(rootOrOptions, maybeOptions = {}) {
  const { root, data = {}, onNavigate = () => {}, onModuleOpen = () => {}, onWrite = () => {} } = normalizeOptions(rootOrOptions, maybeOptions);
  if (!(root instanceof HTMLElement)) throw new TypeError("renderHome requires a DOM element as root");

  const prompts = catalogItems("prompts").slice(0, 3);
  const newsletters = catalogItems("newsletters").slice(0, 3);
  const images = catalogItems("memes").slice(0, 3);
  const session = window.BuildersPlatform?.snapshot?.() || null;
  root.__homeCallbacks = { onNavigate, onModuleOpen, onWrite };

  const existingPreview = root.querySelector("[data-home-board-preview]");
  root.innerHTML = `<section class="lounge-home portal-home" aria-labelledby="home-dashboard-title">
    <section class="portal-home-intro" aria-labelledby="home-dashboard-title">
      <div class="portal-home-intro-copy"><p class="portal-home-eyebrow">BUILDERS LOUNGE</p><h1 id="home-dashboard-title">만들고, 나누고, 함께 성장해요</h1><p>만든 결과와 경험을 읽고, 다음 작업을 바로 시작하세요.</p></div>
      <div class="portal-home-intro-actions"><span class="portal-home-intro-caption">AI 제작 도구</span><div class="portal-home-intro-buttons"><button class="primary-button" type="button" data-home-module="shorts">AI 쇼츠 만들기</button><button class="secondary-button" type="button" data-home-write>글 쓰고 1빌드 받기</button></div></div>
    </section>
    <div class="portal-home-layout">
      <div class="portal-home-main">
        <section class="portal-panel portal-board-panel" aria-labelledby="home-board-title">
          <div class="portal-panel-head"><div><h2 id="home-board-title">자유게시판</h2></div><div class="portal-panel-actions"><button class="text-button" type="button" data-home-write>글쓰기</button><button class="text-button" type="button" data-home-nav="board">더보기</button></div></div>
          <div data-home-board-preview class="home-board-preview"><div class="community-loading">게시판을 불러오는 중입니다.</div></div>
        </section>
        <div class="portal-home-community-grid">
          <section class="portal-panel portal-home-prompts" aria-labelledby="home-prompt-title">
            <div class="portal-panel-head"><div><h2 id="home-prompt-title">프롬프트 모음</h2></div><button class="text-button" type="button" data-home-nav="prompts">더보기</button></div>
            <div class="home-compact-cards">${prompts.length ? prompts.map((item) => renderHomeCard(item, "prompts", "프롬프트")).join("") : '<div class="community-empty-inline">등록된 프롬프트가 없습니다.</div>'}</div>
          </section>
          <section class="portal-panel portal-home-newsletter" aria-labelledby="home-letter-title">
            <div class="portal-panel-head"><div><h2 id="home-letter-title">뉴스레터</h2></div><button class="text-button" type="button" data-home-nav="newsletter">더보기</button></div>
            <div class="home-compact-cards">${newsletters.length ? newsletters.map((item) => renderHomeCard(item, "newsletter", "뉴스레터")).join("") : '<div class="community-empty-inline">등록된 뉴스레터가 없습니다.</div>'}</div>
          </section>
        </div>
        <section class="portal-panel portal-home-images" aria-labelledby="home-image-title">
          <div class="portal-panel-head"><div><h2 id="home-image-title">이미지 게시판</h2></div><button class="text-button" type="button" data-home-nav="memes">더보기</button></div>
          <div class="home-compact-cards">${images.length ? images.map((item) => renderHomeCard(item, "memes", "이미지")).join("") : '<div class="community-empty-inline">등록된 이미지가 없습니다.</div>'}</div>
        </section>
        <section class="portal-panel portal-tools-panel" aria-labelledby="home-tools-title">
          <div class="portal-panel-head"><div><h2 id="home-tools-title">AI 제작 도구</h2></div><span class="portal-panel-note">가격·모델·API는 관리자 설정</span></div>
          <div class="portal-tool-grid">${MODULES.map(renderTool).join("")}</div>
        </section>
      </div>

      <aside class="portal-home-rail" aria-label="Builders Lounge 안내">
        <section class="portal-rail-card portal-start-card"><h4>글 하나가<br>1빌드가 돼요.</h4><ol><li><b>1</b><span><strong>Google 계정으로 로그인</strong><small>계정과 빌드 잔액을 안전하게 연결</small></span></li><li><b>2</b><span><strong>게시판에 경험 나누기</strong><small>글 또는 댓글 1건당 1빌드 적립</small></span></li><li><b>3</b><span><strong>AI 제작 도구 사용</strong><small>쇼츠·웹툰·이미지 생성</small></span></li></ol><button class="primary-button" type="button" data-home-write>글 쓰고 1빌드 받기</button></section>
        ${renderBuildCard(session)}
        <p class="portal-home-disclosure">게시판·Google 계정·빌드 원장은 실제 운영 데이터입니다. 샘플 작업·파일은 별도 표시됩니다.</p>
      </aside>
    </div>
  </section>`;
  const nextPreview = root.querySelector("[data-home-board-preview]");
  if (existingPreview && nextPreview && existingPreview !== nextPreview) {
    nextPreview.replaceWith(existingPreview);
  }
  bindBrokenImages(root);

  if (!root.dataset.homeBound) {
    root.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-home-nav]");
      if (nav) { root.__homeCallbacks?.onNavigate(nav.dataset.homeNav); return; }
      const module = event.target.closest("[data-home-module]");
      if (module) { root.__homeCallbacks?.onModuleOpen({ action: module.dataset.homeModule }); return; }
      if (event.target.closest("[data-home-login]")) { window.BuildersPlatform?.openLogin?.(); return; }
      if (event.target.closest("[data-home-write]")) { root.__homeCallbacks?.onWrite(); return; }
    });
    root.dataset.homeBound = "true";
  }
}

export { renderHome, MODULES };
export default renderHome;
