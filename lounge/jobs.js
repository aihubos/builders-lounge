const FILTERS = Object.freeze([
  { id: "all", label: "전체" },
  { id: "active", label: "진행 중" },
  { id: "completed", label: "완료" },
  { id: "failed", label: "실패" },
]);

const STATUS_META = Object.freeze({
  queued: { label: "대기", tone: "waiting", filter: "active" },
  processing: { label: "처리 중", tone: "current", filter: "active" },
  completed: { label: "완료", tone: "complete", filter: "completed" },
  failed: { label: "실패", tone: "failed", filter: "failed" },
  cancelled: { label: "취소됨", tone: "muted", filter: "failed" },
});

function normalizeOptions(rootOrOptions, maybeOptions = {}) {
  if (rootOrOptions && typeof rootOrOptions === "object" && "root" in rootOrOptions) {
    return rootOrOptions;
  }
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

function normaliseJob(job, index) {
  const status = STATUS_META[job?.status] ? job.status : "queued";
  return {
    id: String(job?.id || `job-${index + 1}`),
    title: String(job?.title || "이름 없는 작업"),
    module: String(job?.module || "AI 작업"),
    status,
    createdAt: job?.createdAt || "",
    updatedAt: job?.updatedAt || job?.createdAt || "",
    detail: String(job?.detail || "상세 정보가 연결되면 이곳에 표시됩니다."),
    canRetry: Boolean(job?.canRetry),
    canDelete: Boolean(job?.canDelete),
  };
}

function formatDate(value) {
  if (!value) return "날짜 정보 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.queued;
}

function getFilteredJobs(jobs, filter) {
  if (filter === "all") return jobs;
  return jobs.filter((job) => statusMeta(job.status).filter === filter);
}

function renderTabs(filter) {
  return FILTERS.map((item) => {
    const selected = item.id === filter;
    return `<button class="jobs-filter" type="button" role="tab" aria-selected="${selected}" aria-controls="lounge-jobs-results" data-jobs-filter="${item.id}">${item.label}</button>`;
  }).join("");
}

function renderEmpty(filter) {
  const copy = {
    all: ["아직 만든 작업이 없습니다.", "AI 회의록이나 AI 쇼츠 스튜디오가 연결되면 이곳에서 작업 상태를 확인합니다."],
    active: ["진행 중인 작업이 없습니다.", "새 작업을 시작하면 처리 상태와 다음 안내가 이곳에 표시됩니다."],
    completed: ["완료된 작업이 없습니다.", "완료된 결과물은 연결 후 이곳에서 다시 열 수 있습니다."],
    failed: ["실패한 작업이 없습니다.", "실패한 작업이 생기면 원인과 다시 시도할 수 있는지 표시합니다."],
  }[filter] || ["작업이 없습니다.", "작업 상태를 확인할 수 있는 공간입니다."];

  return `<div class="jobs-empty" data-jobs-empty>
    <span class="jobs-empty-index" aria-hidden="true">0</span>
    <div>
      <h3>${copy[0]}</h3>
      <p>${copy[1]}</p>
    </div>
  </div>`;
}

function renderJobRow(job) {
  const meta = statusMeta(job.status);
  const retry = job.canRetry
    ? `<button class="jobs-row-action" type="button" data-jobs-action="retry" data-job-id="${escapeHtml(job.id)}">다시 시도</button>`
    : "";
  const remove = job.canDelete
    ? `<button class="jobs-row-action jobs-row-action-muted" type="button" data-jobs-action="delete" data-job-id="${escapeHtml(job.id)}">삭제</button>`
    : "";

  return `<li class="jobs-row" data-job-id="${escapeHtml(job.id)}">
    <div class="jobs-row-main">
      <div class="jobs-row-heading">
        <p class="jobs-row-module">${escapeHtml(job.module)}</p>
        <span class="jobs-status jobs-status-${meta.tone}">${meta.label}</span>
      </div>
      <h3>${escapeHtml(job.title)}</h3>
      <p class="jobs-row-detail">${escapeHtml(job.detail)}</p>
    </div>
    <div class="jobs-row-meta">
      <time datetime="${escapeHtml(job.updatedAt || job.createdAt)}">${formatDate(job.updatedAt || job.createdAt)}</time>
      <div class="jobs-row-actions">${retry}${remove}</div>
    </div>
  </li>`;
}

function renderList(jobs, filter) {
  const filtered = getFilteredJobs(jobs, filter);
  return filtered.length
    ? `<ul class="jobs-list" data-jobs-list>${filtered.map(renderJobRow).join("")}</ul>`
    : renderEmpty(filter);
}

function renderShell(container, state) {
  container.innerHTML = `<section class="jobs-view" aria-labelledby="lounge-jobs-title">
    <header class="jobs-header">
      <div>
        <p class="jobs-kicker">내 작업</p>
        <h1 id="lounge-jobs-title">최근 작업</h1>
        <p class="jobs-lead">진행 중인 작업과 완료된 결과물을 한 곳에서 확인합니다.</p>
      </div>
      <p class="jobs-privacy">작업 결과는 연결된 기능의 보관 정책을 따릅니다.</p>
    </header>
    <div class="jobs-toolbar">
      <div class="jobs-filters" role="tablist" aria-label="작업 상태 필터">${renderTabs(state.filter)}</div>
      <p class="jobs-count" aria-live="polite">${getFilteredJobs(state.jobs, state.filter).length}개</p>
    </div>
    <div class="jobs-results" id="lounge-jobs-results" role="tabpanel" data-jobs-results aria-live="polite">${renderList(state.jobs, state.filter)}</div>
    <p class="jobs-action-status" role="status" aria-live="polite" data-jobs-action-status></p>
  </section>`;
}

function announceAction(container, action) {
  const status = container.querySelector("[data-jobs-action-status]");
  if (!status) return;
  status.textContent = action === "retry"
    ? "다시 시도 연결 자리는 준비되어 있습니다. 실제 기능 연결 후 사용할 수 있습니다."
    : "삭제 연결 자리는 준비되어 있습니다. 실제 기능 연결 후 사용할 수 있습니다.";
}

function bindEvents(container, state) {
  if (state.bound) return;
  state.bound = true;
  container.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-jobs-filter]");
    if (filterButton && container.contains(filterButton)) {
      const nextFilter = filterButton.dataset.jobsFilter || "all";
      state.filter = FILTERS.some((item) => item.id === nextFilter) ? nextFilter : "all";
      renderShell(container, state);
      container.querySelector(`[data-jobs-filter="${state.filter}"]`)?.focus();
      return;
    }

    const actionButton = event.target.closest("[data-jobs-action]");
    if (!actionButton || !container.contains(actionButton)) return;
    const action = actionButton.dataset.jobsAction;
    const jobId = actionButton.dataset.jobId;
    if (typeof state.onAction === "function") state.onAction({ action, jobId });
    announceAction(container, action);
  });
}

export function mountJobs(rootOrOptions, maybeOptions = {}) {
  const { root, jobs = [], onAction = null } = normalizeOptions(rootOrOptions, maybeOptions);
  if (!(root instanceof HTMLElement)) {
    throw new TypeError("mountJobs requires a DOM element as root");
  }
  const state = {
    jobs: Array.isArray(jobs) ? jobs.map(normaliseJob) : [],
    filter: "all",
    onAction: typeof onAction === "function" ? onAction : null,
    bound: false,
  };

  renderShell(root, state);
  bindEvents(root, state);

  return {
    setJobs(nextJobs) {
      state.jobs = Array.isArray(nextJobs) ? nextJobs.map(normaliseJob) : [];
      renderShell(root, state);
    },
    setFilter(nextFilter) {
      if (!FILTERS.some((item) => item.id === nextFilter)) return;
      state.filter = nextFilter;
      renderShell(root, state);
    },
    destroy() {
      root.replaceChildren();
    },
  };
}

export const renderJobs = mountJobs;

if (typeof window !== "undefined") {
  window.LoungeJobs = Object.freeze({ mount: mountJobs, render: mountJobs });
}
