import { getFeaturedPrompts, getLatestNewsletter, publishedItems } from "../../community-data.js";

const MODULES = Object.freeze([
  { id: "webtoon", title: "웹툰 제작기", description: "대화와 아이디어를 공감 카드로 바꿉니다.", detail: "원본 앱", icon: "▣", action: "webtoon", accent: "blue", live: true },
  { id: "shorts", title: "AI 쇼츠 스튜디오", description: "긴 영상에서 짧은 콘텐츠 후보를 찾습니다.", detail: "샘플 흐름", icon: "▶", action: "shorts", accent: "navy" },
  { id: "masterpiece", title: "세계명화 프롬프트", description: "명화와 캐릭터를 새로운 장면으로 조합합니다.", detail: "원본 앱", icon: "♜", action: "masterpiece", accent: "orange", live: true },
  { id: "token", title: "토큰 비용 계산기", description: "모델별 예상 API 비용을 비교합니다.", detail: "바로 사용", icon: "₩", action: "token", accent: "green", live: true },
]);

function normalizeOptions(rootOrOptions, maybeOptions = {}) {
  if (rootOrOptions && typeof rootOrOptions === "object" && "root" in rootOrOptions) return rootOrOptions;
  return { ...maybeOptions, root: rootOrOptions };
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value || "상시 공개");
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function statusMeta(status) {
  return { queued: { label: "대기", className: "status-waiting" }, processing: { label: "처리 중", className: "status-current" }, completed: { label: "완료", className: "status-complete" }, failed: { label: "실패", className: "status-failed" } }[status] || { label: "확인 중", className: "status-muted" };
}

function renderTool(module) {
  return `<button class="portal-tool-card portal-tool-${module.accent}" type="button" data-home-module="${module.action}"><span class="portal-tool-icon" aria-hidden="true">${module.icon}</span><span class="portal-tool-copy"><span><strong>${module.title}</strong><em>${module.detail}</em></span><small>${module.description}</small></span><span class="portal-row-arrow" aria-hidden="true">→</span></button>`;
}

function feedItems() {
  const prompts = getFeaturedPrompts().map((item) => ({ ...item, kind: "prompt", kindLabel: "프롬프트", route: "prompts", dateLabel: "운영진 추천" }));
  const newsletters = publishedItems("newsletters").map((item) => ({ ...item, kind: "newsletter", kindLabel: "뉴스레터", route: "newsletter", dateLabel: formatShortDate(item.publishedAt) }));
  const videos = publishedItems("videos").slice(0, 2).map((item) => ({ ...item, kind: "video", kindLabel: "추천 영상", route: "videos", dateLabel: item.duration }));
  const games = publishedItems("games").slice(0, 1).map((item) => ({ ...item, kind: "play", kindLabel: "게임방", route: "games", dateLabel: item.mobileReady ? "모바일 지원" : "PC 권장" }));
  return [...prompts, ...newsletters, ...videos, ...games];
}

function renderFeedRow(item) {
  return `<button class="portal-feed-row" type="button" data-home-nav="${item.route}" data-home-feed-kind="${item.kind}"><span class="portal-feed-category">${escapeHtml(item.kindLabel)}</span><span class="portal-feed-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.summary)}</small></span><span class="portal-feed-meta">${escapeHtml(item.dateLabel)}</span><span class="portal-row-arrow" aria-hidden="true">›</span></button>`;
}

function renderPromptRow(prompt) {
  return `<li><div><span class="portal-list-index" aria-hidden="true">P</span><span><strong>${escapeHtml(prompt.title)}</strong><small>${escapeHtml(prompt.useCase)}</small></span></div><button type="button" data-home-copy="${escapeHtml(prompt.id)}">복사</button></li>`;
}

function renderNewsletterSide(newsletter) {
  if (!newsletter) return `<div class="community-empty-inline">공개된 뉴스레터가 없습니다.</div>`;
  return `<button class="portal-newsletter-card" type="button" data-home-nav="newsletter"><span class="portal-newsletter-issue">ISSUE ${escapeHtml(newsletter.issue)}</span><strong>${escapeHtml(newsletter.title.replace(/^AI 빌더스 랩 뉴스레터\s*/, ""))}</strong><p>${escapeHtml(newsletter.summary)}</p><span>최신 호 읽기 <b aria-hidden="true">→</b></span></button>`;
}

function renderProjectCard(item) {
  const visual = item.cover
    ? `<img src="${escapeHtml(item.cover)}" alt="${escapeHtml(item.title)} 프로젝트 화면" loading="lazy">`
    : `<span class="meme-art meme-art-${escapeHtml(item.tone || "blue")}">${escapeHtml(item.caption || item.title).replaceAll("\n", "<br>")}</span>`;
  return `<button class="portal-project-card" type="button" data-home-nav="memes"><span class="portal-project-cover">${visual}</span><span><small>${escapeHtml(item.category)}</small><strong>${escapeHtml(item.title)}</strong></span></button>`;
}

function renderRecentJob(job) {
  const meta = statusMeta(job.status);
  return `<li><span><strong>${escapeHtml(job.title)}</strong><small>${escapeHtml(job.module)} · 샘플</small></span><em class="status-pill ${meta.className}">${meta.label}</em></li>`;
}

async function copyText(text, button) {
  const original = button.textContent;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
    await navigator.clipboard.writeText(text);
    button.textContent = "복사됨";
  } catch {
    button.textContent = "원문 보기";
    button.closest("li")?.querySelector("small")?.setAttribute("title", text);
  }
  window.setTimeout(() => { button.textContent = original; }, 1500);
}

function renderHome(rootOrOptions, maybeOptions = {}) {
  const { root, data = {}, onNavigate = () => {}, onModuleOpen = () => {}, onWrite = () => {} } = normalizeOptions(rootOrOptions, maybeOptions);
  if (!(root instanceof HTMLElement)) throw new TypeError("renderHome requires a DOM element as root");

  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const results = Array.isArray(data.results) ? data.results : [];
  const files = Array.isArray(data.files) ? data.files : [];
  const usage = data.usage;
  const prompts = getFeaturedPrompts();
  const newsletter = getLatestNewsletter();
  const newsletters = publishedItems("newsletters");
  const videos = publishedItems("videos");
  const games = publishedItems("games");
  const memes = publishedItems("memes");
  const projects = memes.filter((item) => item.category === "빌더 결과물").slice(0, 4);
  const feed = feedItems();
  root.__homeCallbacks = { onNavigate, onModuleOpen, onWrite };

  root.innerHTML = `<section class="lounge-home portal-home" aria-labelledby="home-dashboard-title">
    <div class="portal-home-layout">
      <div class="portal-home-main">
        <section class="portal-home-hero">
          <div class="portal-home-hero-copy"><span class="portal-live-badge"><i aria-hidden="true"></i> BUILDERS COMMUNITY</span><h3 id="home-dashboard-title">만들고, 나누고,<br><strong>함께 성장해요.</strong></h3><p>AI 도구와 프롬프트를 사용하고, 빌더들의 실제 경험과 결과물을 한곳에서 만나보세요.</p><div class="portal-home-hero-actions"><button class="primary-button" type="button" data-home-nav="prompts">프롬프트 둘러보기 <span aria-hidden="true">→</span></button><button class="secondary-button" type="button" data-home-write>첫 글 남기기</button></div></div>
          <div class="portal-hero-map" aria-label="Builders Lounge 이용 흐름"><span><b>01</b>도구 고르기</span><i></i><span><b>02</b>직접 만들기</span><i></i><span><b>03</b>경험 나누기</span></div>
        </section>

        <section class="portal-panel portal-feed-panel" aria-labelledby="home-feed-title">
          <div class="portal-panel-head"><div><p class="section-label">LOUNGE NOW</p><h4 id="home-feed-title">라운지 모아보기</h4></div><button class="portal-search-link" type="button" data-home-search>전체 검색 <span aria-hidden="true">⌕</span></button></div>
          <div class="portal-feed-tabs" role="group" aria-label="모아보기 분류"><button type="button" aria-pressed="true" data-home-feed-filter="all">추천</button><button type="button" aria-pressed="false" data-home-feed-filter="prompt">프롬프트</button><button type="button" aria-pressed="false" data-home-feed-filter="newsletter">뉴스레터</button><button type="button" aria-pressed="false" data-home-feed-filter="video">영상</button><button type="button" aria-pressed="false" data-home-feed-filter="play">놀이터</button></div>
          <div class="portal-feed-list">${feed.map(renderFeedRow).join("")}</div>
        </section>

        <section class="portal-panel portal-board-panel" aria-labelledby="home-board-title">
          <div class="portal-panel-head"><div><p class="section-label">COMMUNITY</p><h4 id="home-board-title">자유게시판 새 글</h4></div><div class="portal-panel-actions"><button class="text-button" type="button" data-home-write>글쓰기</button><button class="text-button" type="button" data-home-nav="board">전체 보기 <span aria-hidden="true">→</span></button></div></div>
          <div data-home-board-preview class="home-board-preview"><div class="community-loading">게시판을 불러오는 중입니다.</div></div>
        </section>

        <section class="portal-panel portal-tools-panel" aria-labelledby="home-tools-title">
          <div class="portal-panel-head"><div><p class="section-label">BUILD WITH AI</p><h4 id="home-tools-title">오늘 바로 써보는 제작 도구</h4></div><span class="portal-panel-note">원본 앱 3개 · 샘플 흐름 1개</span></div>
          <div class="portal-tool-grid">${MODULES.map(renderTool).join("")}</div>
        </section>

        <section class="portal-panel portal-projects-panel" aria-labelledby="home-projects-title">
          <div class="portal-panel-head"><div><p class="section-label">MADE BY BUILDERS</p><h4 id="home-projects-title">빌더들이 만든 결과물</h4></div><button class="text-button" type="button" data-home-nav="memes">전체 보기 <span aria-hidden="true">→</span></button></div>
          <div class="portal-project-grid">${projects.map(renderProjectCard).join("")}</div>
        </section>
      </div>

      <aside class="portal-home-rail" aria-label="Builders Lounge 추천 정보">
        <section class="portal-rail-card portal-start-card"><span class="portal-rail-eyebrow">처음 오셨나요?</span><h4>3분이면 빌더가<br>될 수 있어요.</h4><ol><li><b>1</b><span><strong>프롬프트 고르기</strong><small>검증된 공개 템플릿부터</small></span></li><li><b>2</b><span><strong>도구로 만들어보기</strong><small>웹툰·영상·이미지·계산기</small></span></li><li><b>3</b><span><strong>경험 공유하기</strong><small>질문과 결과물을 게시판에</small></span></li></ol><button class="primary-button" type="button" data-home-nav="prompts">첫 프롬프트 고르기</button></section>

        <section class="portal-rail-card portal-rail-section"><div class="portal-rail-head"><div><p class="section-label">WEEKLY LETTER</p><h4>AI 빌더스 랩 뉴스레터</h4></div><span>${newsletters.length}개</span></div>${renderNewsletterSide(newsletter)}</section>

        <section class="portal-rail-card portal-rail-section"><div class="portal-rail-head"><div><p class="section-label">QUICK INDEX</p><h4>둘러볼 콘텐츠</h4></div></div><div class="portal-index-list"><button type="button" data-home-nav="prompts"><span>프롬프트 모음</span><strong>${publishedItems("prompts").length}</strong></button><button type="button" data-home-nav="videos"><span>추천 영상</span><strong>${videos.length}</strong></button><button type="button" data-home-nav="memes"><span>짤방·결과물</span><strong>${memes.length}</strong></button><button type="button" data-home-nav="games"><span>게임방</span><strong>${games.length}</strong></button></div></section>

        <section class="portal-rail-card portal-rail-section"><div class="portal-rail-head"><div><p class="section-label">POPULAR PROMPTS</p><h4>운영진 추천 프롬프트</h4></div><button class="text-button" type="button" data-home-nav="prompts">전체</button></div><ul class="portal-prompt-list">${prompts.map(renderPromptRow).join("")}</ul></section>

        <section class="portal-rail-card portal-channel-card"><p class="section-label">OFFICIAL CHANNELS</p><h4>라운지 밖에서도 만나요</h4><div><a href="https://open.kakao.com/o/grZIANIi" target="_blank" rel="noopener"><span class="channel-dot channel-kakao" aria-hidden="true">K</span>카카오 오픈채팅 <b aria-hidden="true">↗</b></a><a href="https://daangn.com/kr/share/community/ref/invite-group/baRr2nojJVT?utm_campaign=share_qr" target="_blank" rel="noopener"><span class="channel-dot channel-daangn" aria-hidden="true">당</span>당근 모임 <b aria-hidden="true">↗</b></a></div></section>

        <section class="portal-rail-card portal-work-card"><div class="portal-rail-head"><div><p class="section-label">MY WORK · SAMPLE</p><h4>작업 현황</h4></div><button class="text-button" type="button" data-home-nav="jobs">보기</button></div>${jobs.length ? `<ul>${jobs.slice(0, 2).map(renderRecentJob).join("")}</ul>` : `<p>설정에서 샘플 데이터를 켜면 작업 예시가 표시됩니다.</p>`}<div class="portal-work-counts"><span>결과물 <b>${results.length}</b></span><span>파일 <b>${files.length}</b></span><span>사용량 <b>${usage ? `${usage.used}/${usage.total}` : "연결 전"}</b></span></div></section>

        <p class="portal-home-disclosure">게시판과 공개 콘텐츠는 실제로 작동합니다. 작업·파일·사용량은 화면 확인용 샘플이며 로그인·결제는 아직 연결되지 않았습니다.</p>
      </aside>
    </div>
  </section>`;

  if (!root.dataset.homeBound) {
    root.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-home-nav]");
      if (nav) { root.__homeCallbacks?.onNavigate(nav.dataset.homeNav); return; }
      const module = event.target.closest("[data-home-module]");
      if (module) { root.__homeCallbacks?.onModuleOpen({ action: module.dataset.homeModule }); return; }
      if (event.target.closest("[data-home-write]")) { root.__homeCallbacks?.onWrite(); return; }
      if (event.target.closest("[data-home-search]")) { window.dispatchEvent(new CustomEvent("lounge:searchopen")); return; }
      const copy = event.target.closest("[data-home-copy]");
      if (copy) { const prompt = getFeaturedPrompts().find((item) => item.id === copy.dataset.homeCopy); if (prompt) void copyText(prompt.copyText, copy); return; }
      const filter = event.target.closest("[data-home-feed-filter]");
      if (filter) {
        const kind = filter.dataset.homeFeedFilter;
        root.querySelectorAll("[data-home-feed-filter]").forEach((button) => button.setAttribute("aria-pressed", String(button === filter)));
        root.querySelectorAll("[data-home-feed-kind]").forEach((row) => { row.hidden = kind !== "all" && row.dataset.homeFeedKind !== kind; });
      }
    });
    root.dataset.homeBound = "true";
  }
}

export { renderHome, MODULES };
export default renderHome;
