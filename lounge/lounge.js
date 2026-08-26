import "./platform.js?v=20260826-unified-cards-v2";
import { renderHome } from "./js/pages/home.js?v=20260826-unified-cards-v2";
import { mountJobs } from "./jobs.js";
import { mountAdmin } from "./admin.js?v=20260825-masterpiece-provider-v1";
import "./settings.js";
import { DEMO_MODE_STORAGE_KEY, getCounts, getDemoSnapshot } from "./demo-data.js";
import { mountReportHubTopbar } from "./topbar.js";
import { mountCommunity } from "./community.js?v=20260826-unified-cards-v2";
import { mountShorts } from "./shorts.js?v=20260825-editable-progress-v2";
import { catalogItems } from "./catalog.js";
import { publishedItems } from "./community-data.js";

const ROUTE_STORAGE_KEY = "ai-builders-lounge-route";
const DENSITY_STORAGE_KEY = "ai-builders-lounge-density";
const ALLOWED_DENSITIES = new Set(["comfortable", "compact"]);
const MOBILE_BREAKPOINT = 1180;

const shell = document.querySelector("[data-lounge-shell]");
const sidebar = document.querySelector("[data-lounge-sidebar]");
const menuToggle = document.querySelector("[data-lounge-menu-toggle]");
const menuCloseButtons = [...document.querySelectorAll("[data-lounge-menu-close]")];
const drawerScrim = document.querySelector(".drawer-scrim");
const liveRegion = document.querySelector("[data-lounge-live]");
const notice = document.querySelector("[data-lounge-notice]");
const pageTitle = document.querySelector("[data-page-title]");
const pageKicker = document.querySelector("[data-page-kicker]");
const pageDescription = document.querySelector("[data-page-description]");
const pageStatus = document.querySelector("[data-page-status]");
const mobilePageTitle = document.querySelector("[data-mobile-page-title]");
const mobileMenu = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
const searchDialog = document.querySelector("[data-global-search-dialog]");
const searchInput = document.querySelector("[data-global-search-input]");
const searchResults = document.querySelector("[data-global-search-results]");
const searchForm = document.querySelector("[data-global-search-form]");

const viewMeta = Object.freeze({
  home: { kicker: "모아보기", title: "지금 라운지에서 볼 글", description: "자유게시판, 프롬프트 모음, 뉴스레터, 이미지 게시판을 한 화면에서 바로 봅니다.", status: "커뮤니티 운영 중" },
  shorts: { kicker: "만들기", title: "AI 쇼츠 스튜디오", description: "한 문장을 실제 세로형 MP4 또는 WebM 영상으로 만들고, 완성 뒤 선택해 게시합니다.", status: "영상 완성 시 Build 5" },
  webtoon: { kicker: "만들기", title: "웹툰 제작기", description: "공감툰 제작기가 Google 로그인과 빌드 잔액을 공유합니다.", status: "빌드 포인트" },
  masterpiece: { kicker: "만들기", title: "세계명화 프롬프트", description: "프롬프트는 무료로 만들고 이미지 생성에 빌드를 사용합니다.", status: "빌드 포인트" },
  prompts: { kicker: "커뮤니티", title: "프롬프트 모음", description: "상황별 공개 프롬프트를 카드로 보고 바로 복사합니다.", status: "공개 콘텐츠" },
  newsletter: { kicker: "커뮤니티", title: "뉴스레터", description: "한 장의 카드로 먼저 보고, 눌러서 본문을 읽습니다.", status: "공개 콘텐츠" },
  videos: { kicker: "콘텐츠", title: "영상 모음", description: "요약을 먼저 보고 원하는 영상만 눌러 재생합니다.", status: "선택 재생" },
  memes: { kicker: "콘텐츠", title: "이미지 게시판", description: "프롬프트·뉴스레터와 같은 카드로 이미지를 봅니다.", status: "공개 콘텐츠" },
  board: { kicker: "커뮤니티", title: "자유게시판", description: "Report Hub와 같은 글·댓글을 Google 계정으로 나눕니다.", status: "실시간 게시판" },
  games: { kicker: "커뮤니티", title: "게임방", description: "한 번에 하나의 게임만 불러와 가볍게 즐깁니다.", status: "선택 실행" },
  jobs: { kicker: "내 작업", title: "진행 중 작업", description: "샘플 작업의 상태와 진행률을 확인합니다.", status: "샘플 데이터" },
  results: { kicker: "내 작업", title: "결과물", description: "완료된 샘플 결과를 미리 확인합니다.", status: "샘플 데이터" },
  files: { kicker: "내 작업", title: "파일", description: "작업에 사용된 샘플 파일 목록을 확인합니다.", status: "샘플 데이터" },
  usage: { kicker: "계정", title: "빌드 내역", description: "적립·사용·환불·관리자 조정 내역을 확인합니다.", status: "실시간 잔액" },
  membership: { kicker: "계정", title: "내 계정", description: "Google 계정과 현재 빌드 잔액을 확인합니다.", status: "Google 로그인" },
  admin: { kicker: "관리", title: "관리자 설정", description: "AI API·모델·빌드 가격·멤버 권한을 설정합니다.", status: "Jeremy 관리자" },
  settings: { kicker: "지원", title: "설정", description: "보기 밀도와 샘플 표시 여부를 바꿉니다.", status: "브라우저 저장" },
  help: { kicker: "지원", title: "이용 안내", description: "실제 운영 기능과 샘플 범위, 커뮤니티 이용 원칙을 확인합니다.", status: "운영 안내" },
});

let demoMode = readDemoMode();
let jobsController = null;
let searchReturnFocus = null;

const SEARCH_TOOLS = Object.freeze([
  { id: "search-shorts", title: "AI 쇼츠 스튜디오", summary: "긴 영상에서 세로형 숏폼 후보를 찾는 제작 흐름", route: "shorts", typeLabel: "제작 도구", icon: "▶" },
  { id: "search-webtoon", title: "웹툰 제작기", summary: "빌드 포인트로 대화와 아이디어를 공감 카드로 바꾸는 도구", route: "webtoon", typeLabel: "제작 도구", icon: "▣" },
  { id: "search-masterpiece", title: "세계명화 프롬프트", summary: "명화와 캐릭터를 조합하는 이미지 프롬프트 도구", route: "masterpiece", typeLabel: "제작 도구", icon: "♜" },
  { id: "search-board", title: "자유게시판", summary: "질문, 정보와 빌더 결과물을 나누는 통합 게시판", route: "board", typeLabel: "커뮤니티", icon: "☷" },
]);

function readLocalValue(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeLocalValue(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* 저장소가 제한되어도 탐색은 계속합니다. */ }
}

function readDemoMode() {
  const saved = readLocalValue(DEMO_MODE_STORAGE_KEY);
  return saved !== "off";
}

function setDemoMode(nextValue) {
  demoMode = Boolean(nextValue);
  writeLocalValue(DEMO_MODE_STORAGE_KEY, demoMode ? "on" : "off");
  shell?.setAttribute("data-demo-mode", demoMode ? "on" : "off");
  if (notice) notice.textContent = getNoticeCopy();
  if (pageStatus && document.documentElement.dataset.loungeRoute === "home") pageStatus.textContent = "커뮤니티 운영 중";
  renderHomeModule();
  renderDataModules();
  window.dispatchEvent(new CustomEvent("lounge:demochange", { detail: { demoMode } }));
}

function applySavedDensity() {
  const density = readLocalValue(DENSITY_STORAGE_KEY);
  if (shell && ALLOWED_DENSITIES.has(density)) shell.dataset.density = density;
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function searchCatalog() {
  const typeMeta = {
    prompts: { route: "prompts", typeLabel: "프롬프트", icon: "⌘" },
    newsletters: { route: "newsletter", typeLabel: "뉴스레터", icon: "N" },
    videos: { route: "videos", typeLabel: "추천 영상", icon: "▶" },
    memes: { route: "memes", typeLabel: "이미지 게시판", icon: "▣" },
    games: { route: "games", typeLabel: "게임방", icon: "✦" },
  };
  const liveTypes = { prompts: catalogItems("prompts"), newsletters: catalogItems("newsletters"), memes: catalogItems("memes"), videos: publishedItems("videos"), games: publishedItems("games") };
  const content = Object.entries(typeMeta).flatMap(([type, meta]) => (liveTypes[type] || []).map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary || item.useCase || "Builders Lounge 공개 콘텐츠",
    route: meta.route,
    typeLabel: meta.typeLabel,
    icon: meta.icon,
    searchText: [item.title, item.summary, item.useCase, item.category, ...(item.tags || [])].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR"),
  })));
  return [...SEARCH_TOOLS.map((item) => ({ ...item, searchText: `${item.title} ${item.summary} ${item.typeLabel}`.toLocaleLowerCase("ko-KR") })), ...content];
}

function renderGlobalSearch(rawQuery = "") {
  if (!searchResults) return;
  const query = String(rawQuery || "").trim().slice(0, 120);
  const normalized = query.toLocaleLowerCase("ko-KR");
  const catalog = searchCatalog();
  const matches = (normalized ? catalog.filter((item) => item.searchText.includes(normalized)) : catalog.filter((item) => ["search-webtoon", "prompt-stic", "newsletter-001", "video-openclaw", "game-pokopia"].includes(item.id))).slice(0, 12);

  if (!matches.length) {
    searchResults.innerHTML = `<div class="portal-search-empty"><strong>일치하는 공개 콘텐츠가 없습니다.</strong><p>다른 표현으로 검색하거나 게시판의 실제 글을 검색해 보세요.</p></div>`;
  } else {
    const groups = new Map();
    matches.forEach((item) => { if (!groups.has(item.typeLabel)) groups.set(item.typeLabel, []); groups.get(item.typeLabel).push(item); });
    searchResults.innerHTML = [...groups.entries()].map(([label, items]) => `<section class="portal-search-section"><h3>${escapeHtml(label)}</h3>${items.map((item) => `<button class="portal-search-result" type="button" data-global-search-route="${escapeHtml(item.route)}"><span aria-hidden="true">${escapeHtml(item.icon)}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.summary)}</small></span><em>열기 →</em></button>`).join("")}</section>`).join("");
  }

  searchResults.insertAdjacentHTML("afterend", `<button class="secondary-button portal-search-board" type="button" data-global-board-search="${escapeHtml(query)}">${query ? `게시판에서 ‘${escapeHtml(query)}’ 검색` : "자유게시판 전체 보기"}</button>`);
  searchDialog?.querySelectorAll(".portal-search-board").forEach((button, index) => { if (index > 0) button.remove(); });
}

function openGlobalSearch() {
  if (!searchDialog) return;
  searchReturnFocus = document.activeElement;
  if (!searchDialog.open) searchDialog.showModal();
  renderGlobalSearch(searchInput?.value || "");
  window.requestAnimationFrame(() => searchInput?.focus({ preventScroll: true }));
}

function closeGlobalSearch({ restoreFocus = true } = {}) {
  if (!restoreFocus) searchReturnFocus = null;
  if (searchDialog?.open) searchDialog.close();
  else if (restoreFocus) searchReturnFocus?.focus?.({ preventScroll: true });
}

function openBoardSearch(query = "") {
  const url = new URL(window.location.href);
  ["post", "page", "category", "sort", "q"].forEach((key) => url.searchParams.delete(key));
  if (query) url.searchParams.set("q", query.slice(0, 120));
  url.hash = "board";
  window.history.pushState({}, "", url);
  closeGlobalSearch({ restoreFocus: false });
  showView("board", { announce: true });
  window.LoungeCommunity?.refreshBoard?.();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value || "날짜 정보 없음");
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function getNoticeCopy(view = document.documentElement.dataset.loungeRoute || "home") {
  if (view === "home") return "Google 로그인 후 게시글 한 건당 1빌드가 적립됩니다. API 키와 도구별 가격은 관리자만 설정합니다.";
  if (view === "shorts") return "한 문장을 제작안으로 확장해 실제 세로형 영상을 만들고, 완성 뒤 게시 여부를 직접 선택합니다.";
  if (view === "webtoon") return "웹툰 제작기는 Lounge 로그인과 빌드 잔액을 공유합니다. API 키는 서버에서만 사용합니다.";
  if (view === "masterpiece") return "프롬프트 조합은 무료이며 실제 이미지 생성에만 설정된 빌드가 사용됩니다.";
  if (view === "prompts") return "공개용으로 정리한 프롬프트만 제공합니다. 개인 정보·로컬 경로·비밀값은 포함하지 않습니다.";
  if (view === "newsletter") return "AI 빌더스 랩 뉴스레터는 직접 작성한 요약과 원문 출처를 제공하는 읽기용 아카이브입니다.";
  if (view === "videos") return "영상은 재생 버튼을 눌렀을 때만 youtube-nocookie.com 플레이어를 한 개 불러옵니다.";
  if (view === "memes") return "이미지 게시판은 프롬프트·뉴스레터와 같은 카드로 보여 줍니다.";
  if (view === "board") return "게시글과 댓글은 Report Hub와 공유됩니다. Google 로그인 후 새 글을 등록하면 1빌드가 적립됩니다.";
  if (view === "admin") return "관리자만 API 키·모델·빌드 가격·멤버 잔액·삭제 권한을 설정할 수 있습니다. API 키는 다시 표시되지 않습니다.";
  if (view === "games") return "게임은 선택한 한 개만 본문에 표시합니다. 화면이 열리지 않으면 새 탭으로 이용할 수 있습니다.";
  return demoMode ? "아래 작업과 사용량은 화면 확인용 샘플입니다. 실제 파일은 업로드되거나 처리되지 않습니다." : "샘플 데이터가 숨겨져 있습니다. 실제 파일·AI 처리는 아직 연결되지 않았습니다.";
}

function renderResults(root, data) {
  if (!root) return;
  if (!data.results.length) {
    root.innerHTML = `<div class="panel-heading"><p class="section-label">OUTPUTS</p><h3>결과물</h3><p>샘플 표시가 꺼져 있어 결과물을 숨겼습니다.</p></div><div class="empty-state"><span class="empty-state-icon" aria-hidden="true">✓</span><strong>표시할 결과물이 없습니다.</strong><p>설정에서 샘플 데이터 표시를 다시 켜면 예시 결과를 볼 수 있습니다.</p></div>`;
    return;
  }
  const result = data.results[0];
  root.innerHTML = `<div class="panel-heading"><p class="section-label">OUTPUTS</p><h3>결과물</h3><p>완료된 샘플 결과를 미리 확인합니다.</p></div><article class="result-card"><div class="result-card-head"><div><span class="sample-label">샘플 결과</span><h4>${escapeHtml(result.title)}</h4><p>${result.formats.map(escapeHtml).join(" · ")}</p></div><span class="result-date">${formatDate(result.createdAt)}</span></div><details class="result-preview"><summary>샘플 미리보기 <span aria-hidden="true">＋</span></summary><div class="result-preview-body"><strong>요약</strong><p>${escapeHtml(result.summary)}</p><ul><li>장면 3개</li><li>대사 5개</li></ul></div></details><p class="disabled-note">실제 다운로드 주소는 MVP 범위에 포함하지 않습니다.</p></article>`;
}

function renderFiles(root, data) {
  if (!root) return;
  if (!data.files.length) {
    root.innerHTML = `<div class="panel-heading file-panel-heading"><div><p class="section-label">FILES</p><h3>파일</h3><p>샘플 표시가 꺼져 있어 파일을 숨겼습니다.</p></div><button class="disabled-button" type="button" disabled>업로드 준비 중</button></div><div class="empty-state"><span class="empty-state-icon" aria-hidden="true">□</span><strong>표시할 파일이 없습니다.</strong><p>파일 업로드는 아직 연결되어 있지 않습니다.</p></div>`;
    return;
  }
  root.innerHTML = `<div class="panel-heading file-panel-heading"><div><p class="section-label">FILES</p><h3>파일</h3><p>작업 확인용 샘플 파일 3개입니다.</p></div><button class="disabled-button" type="button" disabled aria-describedby="file-disabled-note">업로드 준비 중</button></div><div class="file-list">${data.files.map((file) => `<article class="file-row"><div class="file-icon" aria-hidden="true">${file.kind === "영상" ? "▶" : file.kind === "오디오" ? "♫" : "TXT"}</div><div class="file-copy"><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.kind)} · ${escapeHtml(file.size)} · <span class="sample-label">샘플</span></span></div><button class="disabled-button" type="button" disabled aria-describedby="file-disabled-note">삭제 불가</button></article>`).join("")}</div><p class="disabled-note" id="file-disabled-note">샘플 파일은 업로드·삭제되지 않습니다. 실제 파일 기능은 연결 후 제공됩니다.</p>`;
}

function renderUsage(root, data) {
  if (!root) return;
  const session = window.BuildersPlatform?.snapshot?.();
  if (!session?.user) {
    root.innerHTML = `<div class="panel-heading"><p class="section-label">BUILD LEDGER</p><h3>빌드 내역</h3><p>Google 로그인 후 적립과 사용 내역을 확인합니다.</p></div><div class="empty-state"><span class="empty-state-icon" aria-hidden="true">B</span><strong>로그인이 필요합니다.</strong><p>게시글을 등록하면 1빌드가 적립됩니다.</p><button class="primary-button" type="button" data-platform-login-open>Google 로그인</button></div>`;
    return;
  }
  root.innerHTML = `<div class="panel-heading"><p class="section-label">BUILD LEDGER</p><h3>빌드 내역</h3><p>적립·사용·환불·관리자 조정 기록입니다.</p></div><section class="usage-card"><div class="usage-card-heading"><div><span class="sample-label">현재 잔액</span><h4>${Number(session.user.balance || 0).toLocaleString("ko-KR")}<small> 빌드</small></h4></div><strong>${escapeHtml(session.user.name || "빌더")}</strong></div><div class="file-list" data-build-ledger><div class="community-loading">내역을 불러오는 중입니다.</div></div></section>`;
  window.BuildersPlatform.request("/lounge/me/ledger").then((response) => {
    const list = root.querySelector("[data-build-ledger]");
    if (!list) return;
    const ledger = Array.isArray(response.ledger) ? response.ledger : [];
    list.innerHTML = ledger.length ? ledger.map((entry) => `<article class="file-row"><div class="file-icon" aria-hidden="true">${Number(entry.delta) > 0 ? "+" : "−"}</div><div class="file-copy"><strong>${escapeHtml(entry.reason)}</strong><span>${formatDate(entry.created_at)} · 잔액 ${Number(entry.balance_after || 0).toLocaleString("ko-KR")}빌드</span></div><strong class="${Number(entry.delta) > 0 ? "status-success" : "danger-text"}">${Number(entry.delta) > 0 ? "+" : ""}${Number(entry.delta).toLocaleString("ko-KR")}</strong></article>`).join("") : '<div class="empty-state"><strong>아직 빌드 내역이 없습니다.</strong><p>첫 게시글을 작성하면 1빌드가 적립됩니다.</p></div>';
  }).catch((error) => {
    const list = root.querySelector("[data-build-ledger]");
    if (list) list.innerHTML = `<div class="community-error-state"><strong>내역을 불러오지 못했습니다.</strong><p>${escapeHtml(error.message)}</p></div>`;
  });
}

function updateCounts(data) {
  const counts = getCounts(data);
  document.querySelectorAll("[data-nav-jobs-count]").forEach((node) => { node.textContent = counts.jobs; });
  document.querySelectorAll("[data-nav-results-count]").forEach((node) => { node.textContent = counts.results; });
  document.querySelectorAll("[data-nav-files-count]").forEach((node) => { node.textContent = counts.files; });
}

function renderDataModules() {
  const data = getDemoSnapshot(demoMode);
  updateCounts(data);
  renderResults(document.querySelector("[data-results-slot]"), data);
  renderFiles(document.querySelector("[data-files-slot]"), data);
  renderUsage(document.querySelector("[data-usage-slot]"), data);
  const jobsRoot = document.querySelector("[data-jobs-slot]");
  if (jobsRoot) {
    if (jobsController) jobsController.setJobs(data.jobs);
    else jobsController = mountJobs(jobsRoot, { jobs: data.jobs });
  }
}

function renderHomeModule() {
  const home = document.querySelector("[data-home-mount]");
  if (!home) return;
  renderHome(home, {
    data: getDemoSnapshot(demoMode),
    onNavigate: (view) => showView(view, { updateHash: true }),
    onModuleOpen: (module) => showView(module.action || "shorts", { updateHash: true }),
    onWrite: () => { showView("board", { updateHash: true }); window.dispatchEvent(new CustomEvent("lounge:boardwrite")); },
  });
  window.LoungeCommunity?.refreshHomePreview?.();
}

function syncSidebarAccessibility(isOpen = shell?.hasAttribute("data-menu-open")) {
  if (!sidebar) return;
  const shouldHideSidebar = mobileMenu.matches && !isOpen;
  sidebar.toggleAttribute("inert", shouldHideSidebar);
  if (shouldHideSidebar) sidebar.setAttribute("aria-hidden", "true");
  else sidebar.removeAttribute("aria-hidden");
}

function setMenuOpen(isOpen, { restoreFocus = false } = {}) {
  const shouldOpen = Boolean(isOpen) && mobileMenu.matches;
  shell?.toggleAttribute("data-menu-open", shouldOpen);
  document.body.classList.toggle("lounge-menu-open", shouldOpen);
  if (drawerScrim) drawerScrim.hidden = !shouldOpen;
  menuToggle?.setAttribute("aria-expanded", String(shouldOpen));
  menuToggle?.setAttribute("aria-label", shouldOpen ? "작업공간 메뉴 닫기" : "작업공간 메뉴 열기");
  syncSidebarAccessibility(shouldOpen);
  if (shouldOpen) window.requestAnimationFrame(() => sidebar?.querySelector("[data-lounge-menu-close]")?.focus({ preventScroll: true }));
  else if (restoreFocus) menuToggle?.focus({ preventScroll: true });
}

function syncMenuForViewport() {
  if (!mobileMenu.matches) setMenuOpen(false);
  syncSidebarAccessibility(mobileMenu.matches && Boolean(shell?.hasAttribute("data-menu-open")));
}

function showView(requestedView, { updateHash = false, announce = true } = {}) {
  const view = viewMeta[requestedView] ? requestedView : "home";
  const meta = viewMeta[view];
  document.documentElement.dataset.loungeRoute = view;
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const active = panel.dataset.viewPanel === view;
    panel.hidden = !active;
    panel.classList.toggle("is-visible", active);
  });
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    const active = link.dataset.viewLink === view;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
  });
  if (pageKicker) pageKicker.textContent = meta.kicker;
  if (pageTitle) pageTitle.textContent = meta.title;
  if (pageDescription) pageDescription.textContent = meta.description;
  if (pageStatus) pageStatus.textContent = view === "home" ? "커뮤니티 운영 중" : meta.status;
  if (mobilePageTitle) mobilePageTitle.textContent = meta.title;
  document.title = `${meta.title} | Builders Lounge`;
  if (notice) notice.textContent = getNoticeCopy(view);
  if (updateHash && window.location.hash !== `#${view}`) history.pushState(null, "", `#${view}`);
  if (view !== "board") window.LoungeCommunity?.clearBoardQuery?.();
  writeLocalValue(ROUTE_STORAGE_KEY, view);
  if (announce && liveRegion) liveRegion.textContent = `${meta.title} 화면으로 이동했습니다.`;
  if (mobileMenu.matches) setMenuOpen(false);
  window.dispatchEvent(new CustomEvent("lounge:viewchange", { detail: { view } }));
}

function initializeModules() {
  const shorts = document.querySelector('[data-view-panel="shorts"]');
  const settings = document.querySelector("[data-settings-slot]");
  const admin = document.querySelector("[data-admin-slot]");
  if (shorts) mountShorts(shorts);
  renderHomeModule();
  if (settings) window.LoungeSettings?.render(settings, { demoMode, onDemoChange: setDemoMode });
  renderDataModules();
  mountCommunity();
  if (admin) mountAdmin(admin);
}

function bindNavigation() {
  document.querySelectorAll("[data-view-link]").forEach((link) => link.addEventListener("click", (event) => {
    const view = link.dataset.viewLink;
    if (!view) return;
    event.preventDefault();
    showView(view, { updateHash: true });
  }));
  menuToggle?.addEventListener("click", () => setMenuOpen(!shell?.hasAttribute("data-menu-open")));
  document.querySelectorAll("[data-mobile-menu-open]").forEach((button) => button.addEventListener("click", () => setMenuOpen(true)));
  document.querySelectorAll("[data-portal-write]").forEach((button) => button.addEventListener("click", () => { showView("board", { updateHash: true }); window.dispatchEvent(new CustomEvent("lounge:boardwrite")); }));
  menuCloseButtons.forEach((button) => button.addEventListener("click", () => setMenuOpen(false, { restoreFocus: true })));
  document.querySelectorAll("[data-global-search-open]").forEach((button) => button.addEventListener("click", openGlobalSearch));
  document.querySelectorAll("[data-global-search-close]").forEach((button) => button.addEventListener("click", () => closeGlobalSearch()));
  searchForm?.addEventListener("submit", (event) => { event.preventDefault(); renderGlobalSearch(searchInput?.value || ""); });
  searchInput?.addEventListener("input", () => renderGlobalSearch(searchInput.value));
  searchDialog?.addEventListener("click", (event) => {
    const route = event.target.closest("[data-global-search-route]");
    if (route) { closeGlobalSearch({ restoreFocus: false }); showView(route.dataset.globalSearchRoute, { updateHash: true }); return; }
    const boardSearch = event.target.closest("[data-global-board-search]");
    if (boardSearch) openBoardSearch(boardSearch.dataset.globalBoardSearch || "");
  });
  searchDialog?.addEventListener("close", () => { searchReturnFocus?.focus?.({ preventScroll: true }); searchReturnFocus = null; });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && shell?.hasAttribute("data-menu-open")) setMenuOpen(false, { restoreFocus: true });
    if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.target.closest("input, textarea, select, [contenteditable='true']")) { event.preventDefault(); openGlobalSearch(); }
  });
  mobileMenu.addEventListener("change", syncMenuForViewport);
  window.addEventListener("hashchange", () => showView(window.location.hash.slice(1), { announce: false }));
  window.addEventListener("popstate", () => showView(window.location.hash.slice(1), { announce: false }));
  window.addEventListener("lounge:navigate", (event) => showView(event.detail?.view, { updateHash: true }));
  window.addEventListener("lounge:searchopen", openGlobalSearch);
  window.addEventListener("lounge:authchange", () => {
    renderDataModules();
    if (document.documentElement.dataset.loungeRoute === "home") renderHomeModule();
  });
}

applySavedDensity();
shell?.setAttribute("data-demo-mode", demoMode ? "on" : "off");
mountReportHubTopbar();
initializeModules();
bindNavigation();
syncMenuForViewport();

window.LoungeShell = Object.freeze({ showView, setMenuOpen, setDemoMode, viewMeta });
showView(window.location.hash.slice(1) || "home", { announce: false });
