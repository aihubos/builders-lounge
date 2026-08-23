const MODULES = Object.freeze([
  {
    id: "meeting-notes",
    title: "AI 회의록",
    description: "회의 파일에서 결정사항과 할 일을 정리하는 흐름을 미리 확인합니다.",
    detail: "파일 선택 → AI 정리 → 검토·내보내기",
    icon: "✦",
    action: "meeting",
  },
  {
    id: "shorts-studio",
    title: "AI 쇼츠 스튜디오",
    description: "영상에서 후보 구간을 찾고 세로 영상으로 편집하는 흐름을 미리 확인합니다.",
    detail: "영상 선택 → 후보 구간 분석 → 세로 영상 편집",
    icon: "▶",
    action: "shorts",
  },
]);

function normalizeOptions(rootOrOptions, maybeOptions = {}) {
  if (rootOrOptions && typeof rootOrOptions === "object" && "root" in rootOrOptions) return rootOrOptions;
  return { ...maybeOptions, root: rootOrOptions };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusMeta(status) {
  return {
    queued: { label: "대기", className: "status-waiting" },
    processing: { label: "처리 중", className: "status-current" },
    completed: { label: "완료", className: "status-complete" },
    failed: { label: "실패", className: "status-failed" },
  }[status] || { label: "확인 중", className: "status-muted" };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value || "날짜 없음");
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function metric(label, value, note, action) {
  return `<button class="home-metric-card" type="button" data-home-nav="${action}">
    <span class="home-metric-label">${label}</span>
    <strong>${value}</strong>
    <span class="home-metric-note">${note}</span>
  </button>`;
}

function renderTool(module) {
  return `<article class="home-tool-card">
    <div class="home-tool-icon" aria-hidden="true">${module.icon}</div>
    <div class="home-tool-copy">
      <div class="home-tool-title-row"><h3>${module.title}</h3><span class="sample-label">샘플 화면</span></div>
      <p>${module.description}</p>
      <span class="home-tool-flow">${module.detail}</span>
    </div>
    <button class="primary-button" type="button" data-home-module="${module.action}">샘플 화면 보기 <span aria-hidden="true">→</span></button>
  </article>`;
}

function renderRecentJob(job) {
  const meta = statusMeta(job.status);
  const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
  return `<li class="home-job-row">
    <div class="home-job-main"><div class="home-job-heading"><span class="home-job-module">${escapeHtml(job.module)}</span><span class="status-pill ${meta.className}">${meta.label}</span><span class="sample-label">샘플</span></div><strong>${escapeHtml(job.title)}</strong><span>${escapeHtml(job.detail)}</span></div>
    <div class="home-job-side"><time datetime="${escapeHtml(job.updatedAt)}">${formatDate(job.updatedAt)}</time>${job.status === "processing" ? `<span class="home-job-progress" aria-label="진행률 ${progress}%"><i style="width:${progress}%"></i></span>` : ""}</div>
  </li>`;
}

function renderEmptyJobs() {
  return `<div class="empty-state compact-empty"><span class="empty-state-icon" aria-hidden="true">○</span><strong>표시할 샘플 작업이 없습니다.</strong><p>설정에서 샘플 데이터 표시를 다시 켤 수 있습니다.</p></div>`;
}

function renderHome(rootOrOptions, maybeOptions = {}) {
  const { root, data = {}, onNavigate = () => {}, onModuleOpen = () => {} } = normalizeOptions(rootOrOptions, maybeOptions);
  if (!(root instanceof HTMLElement)) throw new TypeError("renderHome requires a DOM element as root");

  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const results = Array.isArray(data.results) ? data.results : [];
  const files = Array.isArray(data.files) ? data.files : [];
  const usage = data.usage;
  const activeJobs = jobs.filter((job) => job.status === "processing" || job.status === "queued").length;
  const usageValue = usage ? `${usage.used}/${usage.total}` : "연결 전";
  const callbacks = { onNavigate, onModuleOpen };
  root.__homeCallbacks = callbacks;

  root.innerHTML = `<section class="lounge-home" aria-labelledby="home-dashboard-title">
    <div class="home-hero-line"><div><p class="section-label">WORKSPACE OVERVIEW</p><h3 id="home-dashboard-title">작업 대시보드</h3><p>도구와 샘플 작업의 현재 상태를 한눈에 확인합니다.</p></div><span class="sample-label sample-label-large">샘플 데이터 표시 중</span></div>

    <section class="home-tools-board" aria-labelledby="home-tools-title"><div class="home-section-heading"><div><p class="section-label">QUICK START</p><h4 id="home-tools-title">바로 만들기</h4></div><span class="home-section-caption">연결 전 샘플 화면</span></div><div class="home-tool-list">${MODULES.map(renderTool).join("")}</div></section>

    <section class="home-metrics" aria-label="샘플 요약 지표">
      ${metric("진행 중 작업", activeJobs, "대기·처리 중 샘플", "jobs")}
      ${metric("결과물", results.length, "완료된 샘플", "results")}
      ${metric("파일", files.length, "보관된 샘플", "files")}
      ${metric("샘플 사용량", usageValue, "이번 달 데모 기준", "usage")}
    </section>

    <div class="home-lower-grid">
      <section class="home-recent-card" aria-labelledby="home-recent-title"><div class="home-section-heading"><div><p class="section-label">RECENT ACTIVITY</p><h4 id="home-recent-title">최근 작업</h4></div><button class="text-button" type="button" data-home-nav="jobs">전체 보기 <span aria-hidden="true">→</span></button></div>${jobs.length ? `<ul class="home-job-list">${jobs.slice(0, 3).map(renderRecentJob).join("")}</ul>` : renderEmptyJobs()}</section>
      <aside class="home-membership-card" aria-labelledby="home-membership-title"><div class="home-section-heading"><div><p class="section-label">ACCOUNT</p><h4 id="home-membership-title">멤버십·사용량</h4></div><span class="sample-label">샘플</span></div><span class="membership-state">연결 준비 중</span><p>실제 로그인·결제 연결 전에는 사용량을 샘플로만 보여줍니다.</p><div class="usage-mini"><div><span>샘플 사용량</span><strong>${usageValue}</strong></div><span class="usage-bar"><i style="width:${usage ? Math.min(100, (usage.used / usage.total) * 100) : 0}%"></i></span></div><button class="secondary-button" type="button" data-home-nav="membership">상태 안내 보기</button></aside>
    </div>
  </section>`;

  if (!root.dataset.homeBound) {
    root.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-home-nav]");
      if (nav) {
        root.__homeCallbacks?.onNavigate(nav.dataset.homeNav);
        return;
      }
      const module = event.target.closest("[data-home-module]");
      if (module) root.__homeCallbacks?.onModuleOpen({ action: module.dataset.homeModule });
    });
    root.dataset.homeBound = "true";
  }
}

export { renderHome, MODULES };
export default renderHome;
