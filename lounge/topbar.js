const VISITOR_API_BASE = "https://reportmode-request-board.report-request-board.workers.dev";
const SITE_ID = "builders-lounge";
const VISITOR_STORAGE_KEY = "builders-lounge:visitor-id";

function getVisitorId() {
  try {
    const saved = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (saved) return saved;
    const next = window.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_STORAGE_KEY, next);
    return next;
  } catch {
    return `preview-${Date.now()}`;
  }
}

function isLocalPreview() {
  const hostname = window.location.hostname;
  return window.location.protocol === "file:" || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function formatVisitorCount(payload) {
  const total = Number(payload?.total);
  return Number.isFinite(total) ? `방문 ${total.toLocaleString("ko-KR")}` : "방문 집계 준비 중";
}

async function loadVisitorCount(output) {
  if (!output) return;
  if (isLocalPreview()) {
    output.textContent = "로컬 미리보기";
    return;
  }

  try {
    const visitorId = getVisitorId();
    await fetch(`${VISITOR_API_BASE}/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: SITE_ID, visitorId }),
    });
    const response = await fetch(`${VISITOR_API_BASE}/visits?site=${encodeURIComponent(SITE_ID)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`visitor status ${response.status}`);
    output.textContent = formatVisitorCount(await response.json());
  } catch {
    output.textContent = "방문 집계 준비 중";
  }
}

function formatClock(now = new Date()) {
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return { date, time };
}

function mountClock(clock) {
  const dateNode = clock?.querySelector(".report-hub-clock-date");
  const timeNode = clock?.querySelector(".report-hub-clock-time");
  if (!dateNode || !timeNode) return () => {};

  const update = () => {
    const next = formatClock();
    dateNode.textContent = next.date;
    timeNode.textContent = next.time;
  };
  update();
  const timer = window.setInterval(update, 1000);
  return () => window.clearInterval(timer);
}

export function mountReportHubTopbar(root = document) {
  const clock = root.querySelector("[data-report-hub-clock]");
  const visitor = root.querySelector("#loungeVisitorCount");
  const stopClock = mountClock(clock);
  void loadVisitorCount(visitor);
  return () => stopClock();
}

