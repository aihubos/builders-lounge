import { renderHome } from "./js/pages/home.js";
import { mountJobs } from "./jobs.js";
import "./settings.js";
import "./placeholders.js";

const ROUTE_STORAGE_KEY = "ai-builders-lounge-route";
const DENSITY_STORAGE_KEY = "ai-builders-lounge-density";
const ALLOWED_DENSITIES = new Set(["comfortable", "compact"]);

const shell = document.querySelector("[data-lounge-shell]");
const sidebar = document.querySelector("[data-lounge-sidebar]");
const menuToggle = document.querySelector("[data-lounge-menu-toggle]");
const menuCloseButtons = [...document.querySelectorAll("[data-lounge-menu-close]")];
const liveRegion = document.querySelector("[data-lounge-live]");
const notice = document.querySelector("[data-lounge-notice]");
const pageTitle = document.querySelector("[data-page-title]");
const pageKicker = document.querySelector("[data-page-kicker]");
const pageDescription = document.querySelector("[data-page-description]");
const pageStatus = document.querySelector("[data-page-status]");
const pageWrap = document.querySelector(".page-wrap");
const mobileMenu = window.matchMedia("(max-width: 959px)");

const viewMeta = Object.freeze({
  home: { kicker: "Builders Lounge", title: "오늘의 작업공간", description: "필요한 작업을 고르고, 결과를 확인하고, 다음 행동을 정합니다.", status: "미리보기" },
  meeting: { kicker: "만들기", title: "AI 회의록", description: "기존 기능을 연결할 자리를 준비하고 있습니다.", status: "연결 예정" },
  shorts: { kicker: "만들기", title: "AI 쇼츠 스튜디오", description: "기존 기능을 연결할 자리를 준비하고 있습니다.", status: "연결 예정" },
  jobs: { kicker: "내 작업", title: "작업 내역", description: "진행 중인 작업과 결과 상태를 확인합니다.", status: "상태 확인" },
  results: { kicker: "결과물", title: "결과물", description: "완료된 결과와 보관 상태를 확인합니다.", status: "결과 확인" },
  files: { kicker: "파일", title: "파일", description: "업로드한 원본과 작업 파일을 관리합니다.", status: "파일 관리" },
  usage: { kicker: "사용량", title: "사용량", description: "멤버십 연결 전에는 크레딧과 비용을 표시하지 않습니다.", status: "연결 전" },
  membership: { kicker: "멤버십", title: "멤버십 상태", description: "외부 권한을 변경하지 않고 현재 연결 상태만 안내합니다.", status: "연결 전" },
  settings: { kicker: "내 계정", title: "설정", description: "작업공간의 표시와 현재 연결 상태를 확인합니다.", status: "안내" },
  help: { kicker: "도움말", title: "도움말", description: "작업공간의 현재 범위와 연결 상태를 안내합니다.", status: "안내" },
});

function readLocalValue(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalValue(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 브라우저 저장소가 제한되어도 화면 탐색은 계속합니다.
  }
}

function applySavedDensity() {
  const density = readLocalValue(DENSITY_STORAGE_KEY);
  if (!shell || !ALLOWED_DENSITIES.has(density)) return;
  shell.dataset.density = density;
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
  menuToggle?.setAttribute("aria-expanded", String(shouldOpen));
  menuToggle?.setAttribute("aria-label", shouldOpen ? "작업공간 메뉴 닫기" : "작업공간 메뉴 열기");
  syncSidebarAccessibility(shouldOpen);

  if (shouldOpen) {
    window.requestAnimationFrame(() => sidebar?.querySelector("[data-lounge-menu-close]")?.focus({ preventScroll: true }));
  } else if (restoreFocus) {
    menuToggle?.focus({ preventScroll: true });
  }
}

function syncMenuForViewport() {
  if (!mobileMenu.matches) {
    shell?.removeAttribute("data-menu-open");
    document.body.classList.remove("lounge-menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "작업공간 메뉴 열기");
  }
  syncSidebarAccessibility(mobileMenu.matches && Boolean(shell?.hasAttribute("data-menu-open")));
}

function makePlaceholderView(view, tool) {
  if (!pageWrap) return;
  const section = document.createElement("section");
  section.className = "view-panel";
  section.id = `view-${view}`;
  section.dataset.viewPanel = view;
  section.hidden = true;
  pageWrap.append(section);
  window.LoungePlaceholders?.render(section, { tool });
}

function initializeModules() {
  const home = document.querySelector('[data-view-panel="home"]');
  const jobs = document.querySelector('[data-view-panel="jobs"]');
  const settings = document.querySelector('[data-view-panel="settings"]');

  makePlaceholderView("meeting", "meeting");
  makePlaceholderView("shorts", "shorts");

  if (home) {
    renderHome(home, {
      onNavigate: (view) => showView(view, { updateHash: true }),
      onModuleOpen: (module) => showView(module.id === "meeting-notes" ? "meeting" : "shorts", { updateHash: true }),
    });
  }

  if (jobs) {
    jobs.removeAttribute("aria-labelledby");
    mountJobs(jobs, { jobs: [] });
  }
  if (settings) {
    settings.removeAttribute("aria-labelledby");
    window.LoungeSettings?.render(settings);
  }
}

function showView(requestedView, { updateHash = false, announce = true } = {}) {
  const view = viewMeta[requestedView] ? requestedView : "home";
  const meta = viewMeta[view];
  const panels = [...document.querySelectorAll("[data-view-panel]")];
  const viewLinks = [...document.querySelectorAll("[data-view-link]")];

  document.documentElement.dataset.loungeRoute = view;
  panels.forEach((panel) => {
    const isVisible = panel.dataset.viewPanel === view;
    panel.hidden = !isVisible;
    panel.classList.toggle("is-visible", isVisible);
  });
  viewLinks.forEach((link) => {
    const isCurrent = link.dataset.viewLink === view;
    link.classList.toggle("is-active", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (pageKicker) pageKicker.textContent = meta.kicker;
  if (pageTitle) pageTitle.textContent = meta.title;
  if (pageDescription) pageDescription.textContent = meta.description;
  if (pageStatus) pageStatus.textContent = meta.status;
  if (notice && view === "home") {
    notice.textContent = "현재는 작업공간 화면을 먼저 제공합니다. 멤버십과 기존 기능 연결은 준비가 끝난 뒤 별도로 켭니다.";
  }
  if (updateHash && window.location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
  writeLocalValue(ROUTE_STORAGE_KEY, view);
  if (announce && liveRegion) liveRegion.textContent = `${meta.title} 화면으로 이동했습니다.`;
  if (window.innerWidth < 960) setMenuOpen(false);
  window.dispatchEvent(new CustomEvent("lounge:viewchange", { detail: { view } }));
}

function bindNavigation() {
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const view = link.dataset.viewLink;
      if (!view) return;
      event.preventDefault();
      showView(view, { updateHash: true });
    });
  });

  menuToggle?.addEventListener("click", () => setMenuOpen(!shell?.hasAttribute("data-menu-open")));
  menuCloseButtons.forEach((button) => button.addEventListener("click", () => setMenuOpen(false, { restoreFocus: true })));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && shell?.hasAttribute("data-menu-open")) setMenuOpen(false, { restoreFocus: true });
  });
  mobileMenu.addEventListener("change", syncMenuForViewport);
  window.addEventListener("hashchange", () => showView(window.location.hash.slice(1), { announce: false }));
  window.addEventListener("lounge:navigate", (event) => showView(event.detail?.view, { updateHash: true }));
}

applySavedDensity();
initializeModules();
bindNavigation();
syncMenuForViewport();

window.LoungeShell = Object.freeze({ showView, setMenuOpen, viewMeta });
showView(window.location.hash.slice(1) || readLocalValue(ROUTE_STORAGE_KEY) || "home", { announce: false });
