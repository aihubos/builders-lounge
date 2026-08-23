import { getFeaturedPrompts, getLatestNewsletter, publishedItems } from "../../community-data.js";

const MODULES = Object.freeze([
  { id: "webtoon", title: "웹툰 제작기", description: "대화 한 줄을 공감 카드로 바꾸는 원본 앱을 바로 엽니다.", detail: "문장 입력 → 장면 구성 → 카드 확인", icon: "▣", action: "webtoon", live: true },
  { id: "shorts", title: "AI 쇼츠 스튜디오", description: "영상에서 후보 구간을 찾고 세로 콘텐츠로 만드는 흐름입니다.", detail: "영상 선택 → 후보 분석 → 세로 편집", icon: "▶", action: "shorts" },
  { id: "masterpiece", title: "세계명화 프롬프트", description: "명화와 캐릭터·배경을 조합해 이미지 프롬프트를 만듭니다.", detail: "명화 선택 → 장면 조합 → 프롬프트 확인", icon: "♜", action: "masterpiece", live: true },
  { id: "token", title: "토큰 비용 계산기", description: "모델과 사용량을 바꿔 예상 API 비용을 비교합니다.", detail: "모델 선택 → 토큰 입력 → 비용 비교", icon: "₩", action: "token", live: true },
]);

function normalizeOptions(rootOrOptions, maybeOptions = {}) {
  if (rootOrOptions && typeof rootOrOptions === "object" && "root" in rootOrOptions) return rootOrOptions;
  return { ...maybeOptions, root: rootOrOptions };
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function statusMeta(status) {
  return { queued: { label: "대기", className: "status-waiting" }, processing: { label: "처리 중", className: "status-current" }, completed: { label: "완료", className: "status-complete" }, failed: { label: "실패", className: "status-failed" } }[status] || { label: "확인 중", className: "status-muted" };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value || "날짜 없음");
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function renderTool(module) {
  return `<article class="home-tool-card home-tool-card-community"><div class="home-tool-icon" aria-hidden="true">${module.icon}</div><div class="home-tool-copy"><div class="home-tool-title-row"><h3>${module.title}</h3><span class="sample-label">${module.live ? "원본 앱" : "샘플 화면"}</span></div><p>${module.description}</p><span class="home-tool-flow">${module.detail}</span></div><button class="primary-button" type="button" data-home-module="${module.action}">${module.live ? "바로 열기" : "샘플 화면 보기"} <span aria-hidden="true">→</span></button></article>`;
}

function renderPromptCard(prompt) {
  return `<article class="home-prompt-card"><div class="home-card-topline"><span class="community-chip">${escapeHtml(prompt.category)}</span><span class="sample-label">관리자 추천</span></div><h5>${escapeHtml(prompt.title)}</h5><p>${escapeHtml(prompt.summary)}</p><div class="home-card-actions"><button class="text-button" type="button" data-home-copy="${escapeHtml(prompt.id)}">프롬프트 복사</button><button class="text-button" type="button" data-home-nav="prompts">자세히 보기 <span aria-hidden="true">→</span></button></div></article>`;
}

function renderNewsletterCard(newsletter) {
  if (!newsletter) return `<div class="community-empty-inline">아직 공개된 뉴스레터가 없습니다.</div>`;
  return `<article class="home-newsletter-feature"><div class="home-newsletter-copy"><div class="home-card-topline"><span class="community-chip">${escapeHtml(newsletter.issue)}</span><time datetime="${escapeHtml(newsletter.publishedAt)}">${escapeHtml(newsletter.publishedAt)}</time></div><h5>${escapeHtml(newsletter.title)}</h5><p>${escapeHtml(newsletter.summary)}</p><button class="primary-button" type="button" data-home-nav="newsletter">읽어보기 <span aria-hidden="true">→</span></button></div><div class="newsletter-mark" aria-hidden="true"><span>AI</span><strong>BL</strong><small>NEWSLETTER</small></div></article>`;
}

function renderMeme(meme) {
  const cover = meme.cover ? `<img src="${escapeHtml(meme.cover)}" alt="${escapeHtml(meme.title)} 결과물 미리보기" loading="lazy">` : `<div class="meme-art meme-art-${escapeHtml(meme.tone || "blue")}"><span>${escapeHtml(meme.caption).replaceAll("\n", "<br>")}</span></div>`;
  return `<article class="home-meme-card"><div class="home-meme-cover">${cover}</div><div class="home-meme-copy"><span class="community-chip">${escapeHtml(meme.category)}</span><h5>${escapeHtml(meme.title)}</h5></div></article>`;
}

function renderGameCard(game) {
  return `<button class="home-game-card" type="button" data-home-nav="games"><span class="game-card-icon" aria-hidden="true">✦</span><span><strong>${escapeHtml(game.title)}</strong><small>${escapeHtml(game.summary)}</small></span><span aria-hidden="true">→</span></button>`;
}

function renderVideoCard(video) {
  return `<button class="home-video-card" type="button" data-home-nav="videos"><span class="video-card-icon" aria-hidden="true">▶</span><span><strong>${escapeHtml(video.title)}</strong><small>${escapeHtml(video.duration)} · ${escapeHtml(video.difficulty)}</small></span><span aria-hidden="true">→</span></button>`;
}

function renderRecentJob(job) {
  const meta = statusMeta(job.status);
  const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
  return `<li class="home-job-row"><div class="home-job-main"><div class="home-job-heading"><span class="home-job-module">${escapeHtml(job.module)}</span><span class="status-pill ${meta.className}">${meta.label}</span><span class="sample-label">샘플</span></div><strong>${escapeHtml(job.title)}</strong><span>${escapeHtml(job.detail)}</span></div><div class="home-job-side"><time datetime="${escapeHtml(job.updatedAt)}">${formatDate(job.updatedAt)}</time>${job.status === "processing" ? `<span class="home-job-progress" aria-label="진행률 ${progress}%"><i style="width:${progress}%"></i></span>` : ""}</div></li>`;
}

function metric(label, value, note, action) {
  return `<button class="home-metric-card" type="button" data-home-nav="${action}"><span class="home-metric-label">${label}</span><strong>${value}</strong><span class="home-metric-note">${note}</span></button>`;
}

async function copyText(text, button) {
  const done = () => { const original = button.textContent; button.textContent = "복사됨"; window.setTimeout(() => { button.textContent = original; }, 1500); };
  try { if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable"); await navigator.clipboard.writeText(text); done(); } catch { button.textContent = "원문에서 복사"; window.setTimeout(() => { button.textContent = "프롬프트 복사"; }, 1500); }
}

function renderHome(rootOrOptions, maybeOptions = {}) {
  const { root, data = {}, onNavigate = () => {}, onModuleOpen = () => {}, onWrite = () => {} } = normalizeOptions(rootOrOptions, maybeOptions);
  if (!(root instanceof HTMLElement)) throw new TypeError("renderHome requires a DOM element as root");
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const results = Array.isArray(data.results) ? data.results : [];
  const files = Array.isArray(data.files) ? data.files : [];
  const usage = data.usage;
  const activeJobs = jobs.filter((job) => job.status === "processing" || job.status === "queued").length;
  const usageValue = usage ? `${usage.used}/${usage.total}` : "연결 전";
  const featuredPrompts = getFeaturedPrompts();
  const newsletter = getLatestNewsletter();
  const memes = publishedItems("memes").slice(6, 10);
  const games = publishedItems("games").slice(0, 1);
  const videos = publishedItems("videos").slice(0, 2);
  root.__homeCallbacks = { onNavigate, onModuleOpen, onWrite };

  root.innerHTML = `<section class="lounge-home" aria-labelledby="home-dashboard-title">
    <div class="home-hero-line home-community-hero"><div><p class="section-label">BUILDERS LOUNGE · COMMUNITY</p><h3 id="home-dashboard-title">오늘의 빌더 보드</h3><p>도구를 고르고, 프롬프트를 참고하고, 다른 빌더의 경험을 만나보세요.</p></div><div class="home-hero-actions"><button class="primary-button" type="button" data-home-nav="prompts">프롬프트 둘러보기 <span aria-hidden="true">→</span></button><button class="secondary-button" type="button" data-home-write>게시글 쓰기 <span aria-hidden="true">↗</span></button></div></div>
    <section class="community-section home-tools-board" aria-labelledby="home-tools-title"><div class="home-section-heading"><div><p class="section-label">MAKE SOMETHING</p><h4 id="home-tools-title">오늘 바로 만들어보기</h4></div><span class="home-section-caption">작은 실험부터 시작해요</span></div><div class="home-tool-list">${MODULES.map(renderTool).join("")}</div></section>
    <section class="community-section home-prompt-section" aria-labelledby="home-prompts-title"><div class="home-section-heading"><div><p class="section-label">PROMPT LIBRARY</p><h4 id="home-prompts-title">인기 프롬프트</h4></div><button class="text-button" type="button" data-home-nav="prompts">전체 보기 <span aria-hidden="true">→</span></button></div><div class="home-prompt-grid">${featuredPrompts.map(renderPromptCard).join("")}</div></section>
    <section class="community-section home-newsletter-section" aria-labelledby="home-newsletter-title"><div class="home-section-heading"><div><p class="section-label">AI BUILDERS LAB NEWSLETTER</p><h4 id="home-newsletter-title">AI 빌더스 랩 뉴스레터</h4></div><button class="text-button" type="button" data-home-nav="newsletter">전체 발행 보기 <span aria-hidden="true">→</span></button></div>${renderNewsletterCard(newsletter)}</section>
    <div class="home-community-grid"><section class="community-section home-recent-card" aria-labelledby="home-board-title"><div class="home-section-heading"><div><p class="section-label">COMMUNITY BOARD</p><h4 id="home-board-title">커뮤니티 최신 글</h4></div><button class="text-button" type="button" data-home-nav="board">게시판 열기 <span aria-hidden="true">→</span></button></div><div data-home-board-preview class="home-board-preview"><div class="community-loading">게시판을 불러오는 중입니다.</div></div></section><aside class="home-membership-card" aria-labelledby="home-membership-title"><div class="home-section-heading"><div><p class="section-label">ACCOUNT</p><h4 id="home-membership-title">멤버십·사용량</h4></div><span class="sample-label">샘플</span></div><span class="membership-state">연결 준비 중</span><p>실제 로그인·결제 연결 전에는 사용량을 샘플로만 보여줍니다.</p><div class="usage-mini"><div><span>샘플 사용량</span><strong>${usageValue}</strong></div><span class="usage-bar"><i style="width:${usage ? Math.min(100, (usage.used / usage.total) * 100) : 0}%"></i></span></div><button class="secondary-button" type="button" data-home-nav="membership">상태 안내 보기</button></aside></div>
    <section class="community-section home-memes-section" aria-labelledby="home-memes-title"><div class="home-section-heading"><div><p class="section-label">BUILDER MEMES</p><h4 id="home-memes-title">빌더들의 짤방</h4></div><button class="text-button" type="button" data-home-nav="memes">전체 보기 <span aria-hidden="true">→</span></button></div><div class="home-meme-scroller">${memes.map(renderMeme).join("")}</div></section>
    <section class="community-section home-play-section" aria-labelledby="home-play-title"><div class="home-section-heading"><div><p class="section-label">PLAY & WATCH</p><h4 id="home-play-title">게임방과 영상 모음</h4></div><span class="home-section-caption">만들다 잠깐 쉬어가기</span></div><div class="home-play-grid"><div class="home-play-list">${games.map(renderGameCard).join("")}</div><div class="home-play-list">${videos.map(renderVideoCard).join("")}</div></div></section>
    <div class="home-legacy-grid"><section class="community-section home-recent-card" aria-labelledby="home-recent-title"><div class="home-section-heading"><div><p class="section-label">RECENT WORK</p><h4 id="home-recent-title">최근 샘플 작업</h4></div><button class="text-button" type="button" data-home-nav="jobs">전체 보기 <span aria-hidden="true">→</span></button></div>${jobs.length ? `<ul class="home-job-list">${jobs.slice(0, 3).map(renderRecentJob).join("")}</ul>` : `<div class="empty-state compact-empty"><span class="empty-state-icon" aria-hidden="true">○</span><strong>표시할 샘플 작업이 없습니다.</strong><p>설정에서 샘플 데이터 표시를 다시 켤 수 있습니다.</p></div>`}</section><section class="community-section home-metric-section" aria-label="샘플 작업 요약"><div class="home-section-heading"><div><p class="section-label">WORK SNAPSHOT</p><h4>작업 현황</h4></div><span class="sample-label">샘플</span></div><div class="home-metrics">${metric("진행 중 작업", activeJobs, "대기·처리 중", "jobs")}${metric("결과물", results.length, "완료된 샘플", "results")}${metric("파일", files.length, "보관된 샘플", "files")}${metric("사용량", usageValue, "이번 달 데모", "usage")}</div></section></div>
  </section>`;

  if (!root.dataset.homeBound) {
    root.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-home-nav]");
      if (nav) { root.__homeCallbacks?.onNavigate(nav.dataset.homeNav); return; }
      const module = event.target.closest("[data-home-module]");
      if (module) { root.__homeCallbacks?.onModuleOpen({ action: module.dataset.homeModule }); return; }
      if (event.target.closest("[data-home-write]")) { root.__homeCallbacks?.onWrite(); return; }
      const copy = event.target.closest("[data-home-copy]");
      if (copy) { const prompt = getFeaturedPrompts().find((item) => item.id === copy.dataset.homeCopy); if (prompt) void copyText(prompt.copyText, copy); }
    });
    root.dataset.homeBound = "true";
  }
}

export { renderHome, MODULES };
export default renderHome;
