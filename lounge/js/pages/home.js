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
  const detail = setting?.enabled ? `${Number(setting.cost || 0).toLocaleString("ko-KR")}빌드` : "API 준비 중";
  return `<button class="portal-tool-card portal-tool-${module.accent}" type="button" data-home-module="${module.action}"><span class="portal-tool-icon" aria-hidden="true">${module.icon}</span><span class="portal-tool-copy"><span><strong>${module.title}</strong><em>${detail}</em></span><small>${module.description}</small></span><span class="portal-row-arrow" aria-hidden="true">→</span></button>`;
}

function renderBuildCard(session) {
  if (!session?.authenticated) {
    return `<section class="portal-rail-card portal-build-card"><div class="portal-rail-head"><div><h4>빌드 포인트</h4></div><span>로그인 전</span></div><p>Google 로그인 후 글이나 댓글을 남기면 각각 1빌드가 적립됩니다.</p><button class="primary-button" type="button" data-home-login>Google 로그인</button></section>`;
  }
  const user = session.user || {};
  return `<section class="portal-rail-card portal-build-card"><div class="portal-rail-head"><div><h4>${escapeHtml(user.name || "빌더")}님의 빌드</h4></div><span>${Number(user.balance || 0).toLocaleString("ko-KR")}빌드</span></div><p>일반 글·댓글은 +1빌드, 쇼츠 영상은 저장 성공 시 5빌드입니다.</p><div class="portal-build-actions"><button class="primary-button" type="button" data-home-write>글 쓰고 적립</button><button class="text-button" type="button" data-home-nav="usage">내역 보기</button></div></section>`;
}

function cardCover(item, fallback) {
  const src = catalogCardCover(item);
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.title || fallback)}" loading="lazy">`;
}

function renderHomeCard(item, route, kicker) {
  return `<button class="catalog-card" type="button" data-home-nav="${route}"><span class="catalog-card-cover">${cardCover(item, kicker)}</span><span class="catalog-card-copy"><span class="community-chip">${escapeHtml(item.kicker || item.category || kicker)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.summary || "")}</small></span></button>`;
}

function renderHome(rootOrOptions, maybeOptions = {}) {
  const { root, data = {}, onNavigate = () => {}, onModuleOpen = () => {}, onWrite = () => {} } = normalizeOptions(rootOrOptions, maybeOptions);
  if (!(root instanceof HTMLElement)) throw new TypeError("renderHome requires a DOM element as root");

  const prompts = catalogItems("prompts").slice(0, 4);
  const newsletters = catalogItems("newsletters").slice(0, 4);
  const images = catalogItems("memes").slice(0, 4);
  const session = window.BuildersPlatform?.snapshot?.() || null;
  root.__homeCallbacks = { onNavigate, onModuleOpen, onWrite };

  const existingPreview = root.querySelector("[data-home-board-preview]");
  root.innerHTML = `<section class="lounge-home portal-home" aria-labelledby="home-dashboard-title">
    <div class="portal-home-layout">
      <div class="portal-home-main">
        <h3 id="home-dashboard-title" class="visually-hidden">라운지 모아보기</h3>
        <div class="home-quad-grid">
          <section class="portal-panel home-quad-panel" aria-labelledby="home-board-title">
            <div class="portal-panel-head"><div><h4 id="home-board-title">자유게시판</h4></div><div class="portal-panel-actions"><button class="text-button" type="button" data-home-write>글쓰기</button><button class="text-button" type="button" data-home-nav="board">더보기</button></div></div>
            <div data-home-board-preview class="home-board-preview"><div class="community-loading">게시판을 불러오는 중입니다.</div></div>
          </section>
          <section class="portal-panel home-quad-panel" aria-labelledby="home-prompt-title">
            <div class="portal-panel-head"><div><h4 id="home-prompt-title">프롬프트 모음</h4></div><button class="text-button" type="button" data-home-nav="prompts">더보기</button></div>
            <div class="home-quad-cards">${prompts.length ? prompts.map((item) => renderHomeCard(item, "prompts", "프롬프트")).join("") : '<div class="community-empty-inline">등록된 프롬프트가 없습니다.</div>'}</div>
          </section>
          <section class="portal-panel home-quad-panel" aria-labelledby="home-letter-title">
            <div class="portal-panel-head"><div><h4 id="home-letter-title">뉴스레터</h4></div><button class="text-button" type="button" data-home-nav="newsletter">더보기</button></div>
            <div class="home-quad-cards">${newsletters.length ? newsletters.map((item) => renderHomeCard(item, "newsletter", "뉴스레터")).join("") : '<div class="community-empty-inline">등록된 뉴스레터가 없습니다.</div>'}</div>
          </section>
          <section class="portal-panel home-quad-panel" aria-labelledby="home-image-title">
            <div class="portal-panel-head"><div><h4 id="home-image-title">이미지 게시판</h4></div><button class="text-button" type="button" data-home-nav="memes">더보기</button></div>
            <div class="home-quad-cards">${images.length ? images.map((item) => renderHomeCard(item, "memes", "이미지")).join("") : '<div class="community-empty-inline">등록된 이미지가 없습니다.</div>'}</div>
          </section>
        </div>

        <section class="portal-panel portal-tools-panel" aria-labelledby="home-tools-title">
          <div class="portal-panel-head"><div><h4 id="home-tools-title">AI 제작 도구</h4></div><span class="portal-panel-note">가격·모델·API는 관리자 설정</span></div>
          <div class="portal-tool-grid">${MODULES.map(renderTool).join("")}</div>
        </section>
      </div>

      <aside class="portal-home-rail" aria-label="Builders Lounge 안내">
        <section class="portal-rail-card portal-start-card"><h4>글 하나가<br>1빌드가 돼요.</h4><ol><li><b>1</b><span><strong>Google 계정으로 로그인</strong><small>계정과 빌드 잔액을 안전하게 연결</small></span></li><li><b>2</b><span><strong>게시판에 경험 나누기</strong><small>글 또는 댓글 1건당 1빌드 적립</small></span></li><li><b>3</b><span><strong>AI 제작 도구 사용</strong><small>쇼츠·웹툰·이미지 생성</small></span></li></ol><button class="primary-button" type="button" data-home-write>글 쓰고 1빌드 받기</button></section>
        ${renderBuildCard(session)}
        <section class="portal-rail-card portal-channel-card"><h4>라운지 밖에서도 만나요</h4><div><a href="https://open.kakao.com/o/grZIANIi" target="_blank" rel="noopener"><span class="channel-dot channel-kakao" aria-hidden="true">K</span>카카오 오픈채팅 <b aria-hidden="true">↗</b></a><a href="https://daangn.com/kr/share/community/ref/invite-group/baRr2nojJVT?utm_campaign=share_qr" target="_blank" rel="noopener"><span class="channel-dot channel-daangn" aria-hidden="true">당</span>당근 모임 <b aria-hidden="true">↗</b></a></div></section>
        <p class="portal-home-disclosure">게시판·Google 계정·빌드 원장은 실제 운영 데이터입니다. 샘플 작업·파일은 별도 표시됩니다.</p>
      </aside>
    </div>
  </section>`;
  const nextPreview = root.querySelector("[data-home-board-preview]");
  if (existingPreview && nextPreview && existingPreview !== nextPreview) {
    nextPreview.replaceWith(existingPreview);
  }

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
