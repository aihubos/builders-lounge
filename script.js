"use strict";

const config = window.AI_BUILDERS_CONFIG || {};
const application = config.application || {};
const course = config.course || {};
const calendarConfig = config.calendar || {};

document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

const CONTACT_LINKS = Object.freeze({
  kakaoProfile: application.kakaoProfile || "https://open.kakao.com/me/aibuilderslab",
  paidWorkshop: application.daangn || "https://daangn.com/kr/share/community/ref/invite-group/baRr2nojJVT?utm_campaign=share_qr",
  kakaoGroup: application.kakaoGroup || "https://open.kakao.com/o/grZIANIi",
});

const mobileBreakpoint = window.matchMedia("(max-width: 767px)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function setExternalLink(anchor, url) {
  if (!anchor || !url) return;
  anchor.href = url;
  if (/^https?:/i.test(url)) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }
}

document.querySelectorAll("[data-contact-key]").forEach((anchor) => {
  const url = CONTACT_LINKS[anchor.dataset.contactKey];
  if (url) setExternalLink(anchor, url);
});

const menuToggle = document.querySelector("[data-menu-toggle]");
const siteNav = document.querySelector("[data-site-nav]");
const navLinks = [...document.querySelectorAll("[data-site-nav] > a")];

function setMenu(open, restoreFocus = false) {
  if (!menuToggle || !siteNav) return;
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  siteNav.classList.toggle("is-open", open);
  siteNav.inert = mobileBreakpoint.matches && !open;
  document.body.classList.toggle("menu-open", open && mobileBreakpoint.matches);
  if (!open && restoreFocus) menuToggle.focus();
}

function syncMenuForViewport() {
  if (!siteNav || !menuToggle) return;
  if (mobileBreakpoint.matches) {
    siteNav.inert = menuToggle.getAttribute("aria-expanded") !== "true";
    return;
  }
  siteNav.inert = false;
  siteNav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "메뉴 열기");
  document.body.classList.remove("menu-open");
}

menuToggle?.addEventListener("click", () => {
  setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
});

navLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));
siteNav?.querySelectorAll(".nav-more-panel a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
mobileBreakpoint.addEventListener("change", syncMenuForViewport);
syncMenuForViewport();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
    setMenu(false, true);
  }
});

const heroVideo = document.querySelector("[data-hero-video]");
const heroVideoButton = document.querySelector("[data-hero-video-load]");
const heroVideoLabel = document.querySelector("[data-hero-video-label]");
const heroVideoIcon = document.querySelector(".media-control-icon");
let heroVideoLoaded = false;

function syncHeroVideoControl() {
  if (!heroVideo || !heroVideoButton || !heroVideoLabel) return;
  const isPaused = heroVideo.paused;
  heroVideoButton.setAttribute("aria-pressed", String(!isPaused));
  heroVideoLabel.textContent = isPaused ? "브랜드 영상 재생" : "브랜드 영상 일시정지";
  if (heroVideoIcon) heroVideoIcon.textContent = isPaused ? "▶" : "Ⅱ";
}

function markHeroVideoError() {
  if (!heroVideoButton || !heroVideoLabel) return;
  heroVideoButton.disabled = true;
  heroVideoButton.setAttribute("aria-label", "브랜드 영상을 재생할 수 없음");
  heroVideoLabel.textContent = "포스터로 보기";
  if (heroVideoIcon) heroVideoIcon.textContent = "i";
}

function loadHeroVideo() {
  if (!heroVideo) return;
  if (!heroVideoLoaded) {
    const source = document.createElement("source");
    source.src = "assets/hero-builders-character.mp4";
    source.type = "video/mp4";
    heroVideo.append(source);
    heroVideo.controls = false;
    heroVideoLoaded = true;
    heroVideo.load();
    heroVideo.addEventListener("error", markHeroVideoError, { once: true });
  }
  heroVideo.muted = true;
  heroVideo.play().catch(() => syncHeroVideoControl());
}

heroVideo?.addEventListener("play", syncHeroVideoControl);
heroVideo?.addEventListener("pause", syncHeroVideoControl);
heroVideoButton?.addEventListener("click", () => {
  if (!heroVideoLoaded) {
    loadHeroVideo();
    return;
  }
  if (heroVideo.paused) heroVideo.play().catch(() => syncHeroVideoControl());
  else heroVideo.pause();
});

if (heroVideo && reduceMotion.matches) {
  heroVideo.pause();
}
syncHeroVideoControl();

const curriculumTriggers = [...document.querySelectorAll("[data-curriculum-trigger]")];
const accordionAllButton = document.querySelector("[data-accordion-all]");

function getCurriculumState() {
  return curriculumTriggers.map((trigger) => trigger.getAttribute("aria-expanded") === "true");
}

function setCurriculumPanel(trigger, open) {
  const panel = document.getElementById(trigger.getAttribute("aria-controls"));
  if (!panel) return;
  trigger.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;
}

function syncAccordionControl() {
  if (!accordionAllButton) return;
  const allOpen = getCurriculumState().every(Boolean);
  accordionAllButton.setAttribute("aria-expanded", String(allOpen));
  accordionAllButton.textContent = allOpen ? "전체 접기" : "전체 펼치기";
}

curriculumTriggers.forEach((trigger, index) => {
  const initialOpen = index === 0;
  setCurriculumPanel(trigger, initialOpen);
  trigger.addEventListener("click", () => {
    const nextOpen = trigger.getAttribute("aria-expanded") !== "true";
    if (mobileBreakpoint.matches && nextOpen) {
      curriculumTriggers.forEach((other) => {
        if (other !== trigger) setCurriculumPanel(other, false);
      });
    }
    setCurriculumPanel(trigger, nextOpen);
    syncAccordionControl();
  });
});

accordionAllButton?.addEventListener("click", () => {
  const shouldOpen = !getCurriculumState().every(Boolean);
  curriculumTriggers.forEach((trigger) => setCurriculumPanel(trigger, shouldOpen));
  syncAccordionControl();
});
syncAccordionControl();

const sectionIds = ["outcomes", "curriculum", "schedule", "faq"];
const observedSections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

function markActiveNav(id) {
  navLinks.forEach((link) => {
    if (link.getAttribute("href") === `#${id}`) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) markActiveNav(visible.target.id);
  }, { rootMargin: "-24% 0px -62% 0px", threshold: [0.05, 0.2, 0.5] });
  observedSections.forEach((section) => sectionObserver.observe(section));
} else {
  markActiveNav("outcomes");
}

const mobileCta = document.querySelector("[data-mobile-cta]");
const heroSection = document.getElementById("top");
const faqSection = document.getElementById("faq");
const finalCta = document.getElementById("final-cta");

function setMobileCta(visible) {
  if (!mobileCta) return;
  const shouldShow = visible && mobileBreakpoint.matches;
  mobileCta.hidden = !shouldShow;
  document.body.classList.toggle("mobile-cta-visible", shouldShow);
}

if ("IntersectionObserver" in window && heroSection) {
  const ctaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === heroSection) setMobileCta(!entry.isIntersecting);
      if ((entry.target === faqSection || entry.target === finalCta) && entry.isIntersecting) setMobileCta(false);
    });
  }, { threshold: 0.12 });
  [heroSection, faqSection, finalCta].filter(Boolean).forEach((section) => ctaObserver.observe(section));
} else {
  setMobileCta(false);
}

mobileBreakpoint.addEventListener("change", () => {
  if (!mobileBreakpoint.matches) setMobileCta(false);
});

function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function unfoldIcsLine(value) {
  return String(value || "").replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function parseIcsDate(value, isDateOnly) {
  const raw = String(value || "").trim();
  if (isDateOnly && /^\d{8}$/.test(raw)) {
    return new Date(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)));
  }
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, utc] = match;
  if (utc) return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

function unescapeIcsText(value) {
  return String(value || "").replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseIcsEvents(icsText) {
  const unfolded = unfoldIcsLine(icsText);
  return unfolded.split("BEGIN:VEVENT").slice(1).map((block) => {
    const body = block.split("END:VEVENT")[0] || "";
    const getLine = (name) => body.match(new RegExp(`^${name}(?:;[^:]*)?:([^\\r\\n]+)`, "m"))?.[1] || "";
    const startLine = body.match(/^DTSTART([^:\r\n]*):([^\r\n]+)/m);
    const endLine = body.match(/^DTEND([^:\r\n]*):([^\r\n]+)/m);
    const allDay = Boolean(startLine && /VALUE=DATE/i.test(startLine[1] || ""));
    const start = parseIcsDate(startLine?.[2], allDay);
    const end = parseIcsDate(endLine?.[2], Boolean(endLine && /VALUE=DATE/i.test(endLine[1] || "")));
    return {
      title: unescapeIcsText(getLine("SUMMARY") || "일정"),
      start,
      end,
      allDay,
      type: "event",
    };
  }).filter((event) => event.start instanceof Date && !Number.isNaN(event.start.getTime()));
}

function eventTouchesDay(event, date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const eventEnd = event.end instanceof Date && !Number.isNaN(event.end.getTime())
    ? event.end
    : new Date(event.start.getTime() + (event.allDay ? 24 : 1) * 60 * 60 * 1000);
  return event.start < dayEnd && eventEnd > dayStart;
}

function formatEventTime(event) {
  if (event.allDay) return "하루";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(event.start);
}

function createMonthGrid(year, monthIndex, events) {
  const grid = makeElement("ol", "calendar-grid");
  grid.setAttribute("aria-label", `${year}년 ${monthIndex + 1}월 일정`);
  ["월", "화", "수", "목", "금", "토", "일"].forEach((weekday, index) => {
    const label = makeElement("li", "calendar-weekday", weekday);
    if (index === 5) label.classList.add("is-saturday");
    if (index === 6) label.classList.add("is-sunday");
    grid.append(label);
  });

  const firstDate = new Date(year, monthIndex, 1);
  const startOffset = (firstDate.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - startOffset + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      const blank = makeElement("li", "calendar-blank");
      blank.setAttribute("aria-hidden", "true");
      grid.append(blank);
      continue;
    }
    const date = new Date(year, monthIndex, dayNumber);
    const day = makeElement("li", "calendar-day");
    const weekday = date.getDay();
    const dateKey = toDateKey(date);
    if (weekday === 0) day.classList.add("is-sunday");
    if (weekday === 6) day.classList.add("is-saturday");
    if (dateKey === todayKey) day.classList.add("is-today");
    day.append(makeElement("span", "calendar-date", String(dayNumber)));
    const dayEvents = events.filter((event) => eventTouchesDay(event, date)).sort((a, b) => a.start - b.start);
    if (dayEvents.length) {
      const list = makeElement("ul", "calendar-events");
      dayEvents.slice(0, 3).forEach((event) => {
        const item = makeElement("li", "calendar-event");
        if (!event.allDay) item.append(makeElement("time", "", formatEventTime(event)));
        item.append(makeElement("span", "", event.title));
        list.append(item);
      });
      if (dayEvents.length > 3) list.append(makeElement("li", "calendar-event", `+${dayEvents.length - 3}`));
      day.append(list);
    }
    grid.append(day);
  }
  return grid;
}

function initGoogleCalendar() {
  const root = document.querySelector("[data-google-calendar]");
  const monthLabel = root?.querySelector("[data-calendar-month]");
  const gridHost = root?.querySelector("[data-calendar-grid]");
  const status = root?.querySelector("[data-calendar-status]");
  const prevButton = root?.querySelector("[data-calendar-prev]");
  const nextButton = root?.querySelector("[data-calendar-next]");
  if (!root || !monthLabel || !gridHost || !status) return;

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let events = [];

  function renderMonth() {
    monthLabel.textContent = `${viewYear}년 ${viewMonth + 1}월`;
    gridHost.replaceChildren(createMonthGrid(viewYear, viewMonth, events));
  }

  prevButton?.addEventListener("click", () => {
    const next = new Date(viewYear, viewMonth - 1, 1);
    viewYear = next.getFullYear();
    viewMonth = next.getMonth();
    renderMonth();
  });

  nextButton?.addEventListener("click", () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    viewYear = next.getFullYear();
    viewMonth = next.getMonth();
    renderMonth();
  });

  renderMonth();
  const snapshotUrl = calendarConfig.snapshotUrl || "assets/google-calendar.ics";
  fetch(snapshotUrl, { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`calendar-${response.status}`);
      return response.text();
    })
    .then((text) => {
      if (!text.includes("BEGIN:VCALENDAR")) throw new Error("invalid-calendar");
      events = parseIcsEvents(text);
      renderMonth();
      status.textContent = events.length
        ? "저장된 공개 일정 스냅샷을 표시합니다. 최신 일정은 개인 카카오로 확인해주세요."
        : "공개 스냅샷에 일정이 없습니다. 최신 일정은 개인 카카오로 확인해주세요.";
    })
    .catch(() => {
      root.classList.add("is-error");
      status.classList.add("is-error");
      status.textContent = "일정 스냅샷을 읽지 못했습니다. 최신 일정은 개인 카카오로 확인해주세요.";
    });
}

initGoogleCalendar();

const VISITOR_STATS_KEY = "ai-builders-visitor-stats";
const VISITOR_HIT_KEY = "ai-builders-visitor-hit-on";
const adminDialog = document.querySelector("[data-calendar-admin]");
const adminStatus = document.querySelector("[data-admin-status]");
const adminTotal = document.querySelector("[data-admin-visitor-total]");
const adminToday = document.querySelector("[data-admin-visitor-today]");
const adminChart = document.querySelector("[data-visitor-chart]");
const adminDayTable = document.querySelector("[data-visitor-day-table]");
const adminSourceTable = document.querySelector("[data-visitor-source-table]");

function todayStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
}

function emptyVisitorStats() {
  return { days: {}, sources: {}, daySources: {} };
}

function loadVisitorStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(VISITOR_STATS_KEY) || "null");
    if (!saved || typeof saved !== "object") return emptyVisitorStats();
    return {
      days: saved.days && typeof saved.days === "object" ? saved.days : {},
      sources: saved.sources && typeof saved.sources === "object" ? saved.sources : {},
      daySources: saved.daySources && typeof saved.daySources === "object" ? saved.daySources : {},
    };
  } catch {
    return emptyVisitorStats();
  }
}

function saveVisitorStats(stats) {
  try {
    localStorage.setItem(VISITOR_STATS_KEY, JSON.stringify(stats));
  } catch {
    /* 저장이 제한된 브라우저에서도 페이지는 계속 사용할 수 있습니다. */
  }
}

function visitSourceLabel() {
  const params = new URLSearchParams(window.location.search);
  const campaign = params.get("utm_source") || params.get("ref");
  if (campaign) return campaign.slice(0, 40);
  if (!document.referrer) return "직접 방문";
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    if (!host || host === window.location.hostname) return "사이트 내부";
    if (host.includes("daangn")) return "당근";
    if (host.includes("kakao")) return "카카오톡";
    if (host.includes("naver")) return "네이버";
    if (host.includes("google")) return "구글";
    return host;
  } catch {
    return "기타";
  }
}

function recordLocalVisit() {
  const today = todayStamp();
  try {
    if (localStorage.getItem(VISITOR_HIT_KEY) === today) return loadVisitorStats();
    localStorage.setItem(VISITOR_HIT_KEY, today);
  } catch {
    return loadVisitorStats();
  }
  const stats = loadVisitorStats();
  const source = visitSourceLabel();
  stats.days[today] = Number(stats.days[today] || 0) + 1;
  stats.sources[source] = Number(stats.sources[source] || 0) + 1;
  stats.daySources[today] = stats.daySources[today] || {};
  stats.daySources[today][source] = Number(stats.daySources[today][source] || 0) + 1;
  saveVisitorStats(stats);
  return stats;
}

function formatCount(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function renderVisitorAdmin() {
  const stats = loadVisitorStats();
  const today = todayStamp();
  const dayRows = Object.entries(stats.days).sort(([a], [b]) => b.localeCompare(a));
  const total = dayRows.reduce((sum, [, count]) => sum + Number(count || 0), 0);
  if (adminTotal) adminTotal.textContent = formatCount(total);
  if (adminToday) adminToday.textContent = formatCount(Number(stats.days[today] || 0));

  if (adminChart) {
    adminChart.replaceChildren();
    const recent = dayRows.slice(0, 14).reverse();
    const maxValue = Math.max(1, ...recent.map(([, count]) => Number(count) || 0));
    recent.forEach(([date, count]) => {
      const bar = makeElement("div", "visitor-chart-bar");
      const fill = makeElement("span");
      fill.style.height = `${Math.max(8, Math.round((Number(count) / maxValue) * 100))}%`;
      bar.append(fill, makeElement("small", "", date.slice(5)));
      adminChart.append(bar);
    });
    if (!recent.length) adminChart.append(makeElement("p", "", "아직 그래프에 표시할 기록이 없습니다."));
  }

  if (adminDayTable) {
    adminDayTable.replaceChildren();
    dayRows.forEach(([date, count]) => {
      const row = makeElement("tr");
      const daySources = Object.entries(stats.daySources?.[date] || {}).sort((a, b) => b[1] - a[1]);
      row.append(makeElement("th", "", date), makeElement("td", "", formatCount(count)), makeElement("td", "", daySources[0]?.[0] || "직접 방문"));
      row.firstElementChild.scope = "row";
      adminDayTable.append(row);
    });
    if (!dayRows.length) {
      const row = makeElement("tr");
      const cell = makeElement("td", "", "아직 기록이 없습니다.");
      cell.colSpan = 3;
      row.append(cell);
      adminDayTable.append(row);
    }
  }

  if (adminSourceTable) {
    adminSourceTable.replaceChildren();
    const sources = Object.entries(stats.sources).sort((a, b) => b[1] - a[1]);
    sources.forEach(([source, count]) => {
      const row = makeElement("tr");
      row.append(makeElement("th", "", source), makeElement("td", "", formatCount(count)));
      row.firstElementChild.scope = "row";
      adminSourceTable.append(row);
    });
    if (!sources.length) {
      const row = makeElement("tr");
      const cell = makeElement("td", "", "아직 기록이 없습니다.");
      cell.colSpan = 2;
      row.append(cell);
      adminSourceTable.append(row);
    }
  }
}

recordLocalVisit();

document.querySelectorAll("[data-admin-open]").forEach((button) => {
  button.addEventListener("click", () => {
    renderVisitorAdmin();
    if (adminStatus) adminStatus.textContent = "이 브라우저에 저장된 통계입니다. 개인 식별 정보는 수집하지 않습니다.";
    adminDialog?.showModal();
  });
});

document.querySelector("[data-admin-close]")?.addEventListener("click", () => adminDialog?.close());
