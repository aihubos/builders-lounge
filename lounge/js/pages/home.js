import { getFeaturedPrompts, getLatestNewsletter, publishedItems } from "../../community-data.js";

const MODULES = Object.freeze([
  { id: "meeting", title: "AI 회의록", description: "회의 기록을 결정사항과 할 일로 정리합니다.", icon: "✦", action: "meeting", accent: "blue" },
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

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value || "상시 공개");
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function statusMeta(status) {
  return { queued: { label: "대기", className: "status-waiting" }, processing: { label: "처리 중", className: "status-current" }, completed: { label: "완료", className: "status-complete" }, failed: { label: "실패", className: "status-failed" } }[status] || { label: "확인 중", className: "status-muted" };
}

function renderTool(module) {
  const setting = window.BuildersPlatform?.getTool?.(module.id);
  const detail = setting?.enabled ? `${Number(setting.cost || 0).toLocaleString("ko-KR")}빌드` : "API 준비 중";
  return `<button class="portal-tool-card portal-tool-${module.accent}" type="button" data-home-module="${module.action}"><span class="portal-tool-icon" aria-hidden="true">${module.icon}</span><span class="portal-tool-copy"><span><strong>${module.title}</strong><em>${detail}</em></span><small>${module.description}</small></span><span class="portal-row-arrow" aria-hidden="true">→</span></button>`;
}

function renderBuildCard(session) {
  if (!session?.authenticated) {
    return `<section class="portal-rail-card portal-build-card"><div class="portal-rail-head"><div><p class="section-label">MY BUILDS</p><h4>빌드 포인트</h4></div><span>로그인 전</span></div><p>Google 로그인 후 글이나 댓글을 남기면 각각 1빌드가 적립됩니다.</p><button class="primary-button" type="button" data-home-login>Google 로그인</button></section>`;
  }
  const user = session.user || {};
  return `<section class="portal-rail-card portal-build-card"><div class="portal-rail-head"><div><p class="section-label">MY BUILDS</p><h4>${escapeHtml(user.name || "빌더")}님의 빌드</h4></div><span>${Number(user.balance || 0).toLocaleString("ko-KR")}빌드</span></div><p>글·댓글은 +1빌드, 이미지는 5빌드, 영상은 10빌드가 기본입니다. 관리자가 바꿀 수 있습니다.</p><div class="portal-build-actions"><button class="primary-button" type="button" data-home-write>글 쓰고 적립</button><button class="text-button" type="button" data-home-nav="usage">내역 보기</button></div></section>`;
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
  const session = window.BuildersPlatform?.snapshot?.() || null;
  root.__homeCallbacks = { onNavigate, onModuleOpen, onWrite };

  root.innerHTML = `<section class="lounge-home portal-home" aria-labelledby="home-dashboard-title">
    <div class="portal-home-layout">
      <div class="portal-home-main">
        <section class="portal-home-hero">
          <div class="portal-home-hero-copy"><span class="portal-live-badge"><i aria-hidden="true"></i> BUILDERS COMMUNITY</span><h3 id="home-dashboard-title">만들고, 나누고,<br><strong>함께 성장해요.</strong></h3><p>게시판에 경험을 나누어 빌드를 모으고, AI 회의록·쇼츠·웹툰·이미지 제작에 사용해 보세요.</p><div class="portal-home-hero-actions"><button class="primary-button" type="button" data-home-write>글 쓰고 1빌드 받기 <span aria-hidden="true">→</span></button><button class="secondary-button" type="button" data-home-nav="meeting">AI 도구 둘러보기</button></div></div>
          <div class="portal-hero-map" aria-label="Builders Lounge 이용 흐름"><span><b>01</b>Google 로그인</span><i></i><span><b>02</b>글·댓글 작성 · 1빌드</span><i></i><span><b>03</b>AI 도구에서 사용</span></div>
        </section>

        <section class="portal-panel portal-feed-panel" aria-labelledby="home-feed-title">
          <div class="portal-panel-head"><div><p class="section-label">LOUNGE NOW</p><h4 id="home-feed-title">라운지 모아보기</h4></div></div>
          <div class="portal-feed-tabs" role="group" aria-label="모아보기 분류"><button type="button" aria-pressed="true" data-home-feed-filter="all">추천</button><button type="button" aria-pressed="false" data-home-feed-filter="prompt">프롬프트</button><button type="button" aria-pressed="false" data-home-feed-filter="newsletter">뉴스레터</button><button type="button" aria-pressed="false" data-home-feed-filter="video">영상</button><button type="button" aria-pressed="false" data-home-feed-filter="play">놀이터</button></div>
          <div class="portal-feed-list">${feed.map(renderFeedRow).join("")}</div>
        </section>

        <section class="portal-panel portal-board-panel" aria-labelledby="home-board-title">
          <div class="portal-panel-head"><div><p class="section-label">COMMUNITY</p><h4 id="home-board-title">자유게시판 새 글</h4></div><div class="portal-panel-actions"><button class="text-button" type="button" data-home-write>글쓰기</button><button class="text-button" type="button" data-home-nav="board">전체 보기 <span aria-hidden="true">→</span></button></div></div>
          <div data-home-board-preview class="home-board-preview"><div class="community-loading">게시판을 불러오는 중입니다.</div></div>
        </section>

        <section class="portal-panel portal-tools-panel" aria-labelledby="home-tools-title">
          <div class="portal-panel-head"><div><p class="section-label">BUILD WITH AI</p><h4 id="home-tools-title">빌드로 사용하는 AI 제작 도구</h4></div><span class="portal-panel-note">가격·모델·API는 관리자 설정</span></div>
          <div class="portal-tool-grid">${MODULES.map(renderTool).join("")}</div>
        </section>

        <section class="portal-panel portal-projects-panel" aria-labelledby="home-projects-title">
          <div class="portal-panel-head"><div><p class="section-label">MADE BY BUILDERS</p><h4 id="home-projects-title">빌더들이 만든 결과물</h4></div><button class="text-button" type="button" data-home-nav="memes">전체 보기 <span aria-hidden="true">→</span></button></div>
          <div class="portal-project-grid">${projects.map(renderProjectCard).join("")}</div>
        </section>
      </div>

      <aside class="portal-home-rail" aria-label="Builders Lounge 추천 정보">
        <section class="portal-rail-card portal-start-card"><span class="portal-rail-eyebrow">처음 오셨나요?</span><h4>글 하나가<br>1빌드가 돼요.</h4><ol><li><b>1</b><span><strong>Google 계정으로 로그인</strong><small>계정과 빌드 잔액을 안전하게 연결</small></span></li><li><b>2</b><span><strong>게시판에 경험 나누기</strong><small>글 또는 댓글 1건당 1빌드 적립</small></span></li><li><b>3</b><span><strong>AI 제작 도구 사용</strong><small>회의록·쇼츠·웹툰·이미지 생성</small></span></li></ol><button class="primary-button" type="button" data-home-write>글 쓰고 1빌드 받기</button></section>

        ${renderBuildCard(session)}

        <section class="portal-rail-card portal-rail-section"><div class="portal-rail-head"><div><p class="section-label">WEEKLY LETTER</p><h4>AI 빌더스 랩 뉴스레터</h4></div><span>${newsletters.length}개</span></div>${renderNewsletterSide(newsletter)}</section>

        <section class="portal-rail-card portal-rail-section"><div class="portal-rail-head"><div><p class="section-label">QUICK INDEX</p><h4>둘러볼 콘텐츠</h4></div></div><div class="portal-index-list"><button type="button" data-home-nav="prompts"><span>프롬프트 모음</span><strong>${publishedItems("prompts").length}</strong></button><button type="button" data-home-nav="videos"><span>추천 영상</span><strong>${videos.length}</strong></button><button type="button" data-home-nav="memes"><span>짤방·결과물</span><strong>${memes.length}</strong></button><button type="button" data-home-nav="games"><span>게임방</span><strong>${games.length}</strong></button></div></section>

        <section class="portal-rail-card portal-rail-section"><div class="portal-rail-head"><div><p class="section-label">POPULAR PROMPTS</p><h4>운영진 추천 프롬프트</h4></div><button class="text-button" type="button" data-home-nav="prompts">전체</button></div><ul class="portal-prompt-list">${prompts.map(renderPromptRow).join("")}</ul></section>

        <section class="portal-rail-card portal-channel-card"><p class="section-label">OFFICIAL CHANNELS</p><h4>라운지 밖에서도 만나요</h4><div><a href="https://open.kakao.com/o/grZIANIi" target="_blank" rel="noopener"><span class="channel-dot channel-kakao" aria-hidden="true">K</span>카카오 오픈채팅 <b aria-hidden="true">↗</b></a><a href="https://daangn.com/kr/share/community/ref/invite-group/baRr2nojJVT?utm_campaign=share_qr" target="_blank" rel="noopener"><span class="channel-dot channel-daangn" aria-hidden="true">당</span>당근 모임 <b aria-hidden="true">↗</b></a></div></section>

        <section class="portal-rail-card portal-work-card"><div class="portal-rail-head"><div><p class="section-label">DEMO WORK</p><h4>샘플 작업</h4></div><button class="text-button" type="button" data-home-nav="jobs">보기</button></div>${jobs.length ? `<ul>${jobs.slice(0, 2).map(renderRecentJob).join("")}</ul>` : `<p>설정에서 샘플 데이터를 켜면 작업 예시가 표시됩니다.</p>`}<div class="portal-work-counts"><span>결과물 <b>${results.length}</b></span><span>파일 <b>${files.length}</b></span><span>샘플 사용량 <b>${usage ? `${usage.used}/${usage.total}` : "숨김"}</b></span></div></section>

        <p class="portal-home-disclosure">게시판·Google 계정·빌드 원장은 실제 운영 데이터입니다. 샘플 작업·파일은 별도 표시됩니다. API 키는 관리자만 서버에 설정하며 사용자 브라우저에는 전달되지 않습니다.</p>
      </aside>
    </div>
  </section>`;

  if (!root.dataset.homeBound) {
    root.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-home-nav]");
      if (nav) { root.__homeCallbacks?.onNavigate(nav.dataset.homeNav); return; }
      const module = event.target.closest("[data-home-module]");
      if (module) { root.__homeCallbacks?.onModuleOpen({ action: module.dataset.homeModule }); return; }
      if (event.target.closest("[data-home-login]")) { window.BuildersPlatform?.openLogin?.(); return; }
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
