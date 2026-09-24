import { catalogCardCover, catalogItems } from "../../catalog.js";

const MODULES = Object.freeze([
  { id: "shorts", title: "AI 쇼츠 스튜디오", description: "주제와 대본을 쇼츠 제작안으로 바꿉니다.", action: "shorts" },
  { id: "webtoon", title: "웹툰 제작기", description: "대화와 아이디어를 공감 카드로 바꿉니다.", action: "webtoon" },
  { id: "masterpiece", title: "세계명화 프롬프트", description: "명화와 캐릭터를 새로운 장면으로 조합합니다.", action: "masterpiece" },
]);

function normalizeOptions(rootOrOptions, maybeOptions = {}) {
  if (rootOrOptions && typeof rootOrOptions === "object" && "root" in rootOrOptions) return rootOrOptions;
  return { ...maybeOptions, root: rootOrOptions };
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function toolCost(id) {
  const setting = window.BuildersPlatform?.getTool?.(id);
  const cost = Number(setting?.cost);
  if (setting?.enabled && Number.isFinite(cost) && cost >= 0) return `${cost.toLocaleString("ko-KR")}빌드`;
  return setting ? "관리자 설정 필요" : "";
}

function renderTool(module) {
  return `<button class="home-row" type="button" data-home-module="${module.action}"><strong>${module.title}</strong><small>${module.description}</small><em>${toolCost(module.id)}</em></button>`;
}

function renderRow(item, route, fallback) {
  return `<button class="home-row" type="button" data-home-nav="${route}"><span class="community-chip">${escapeHtml(item.kicker || item.category || fallback)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.summary || "")}</small></button>`;
}

function renderThumb(item) {
  return `<button class="home-thumb" type="button" data-home-nav="memes"><img src="${escapeHtml(catalogCardCover(item))}" alt="" width="1600" height="1000" loading="lazy" decoding="async"><strong>${escapeHtml(item.title)}</strong></button>`;
}

function list(items, render, empty) {
  return items.length ? items.map(render).join("") : `<p class="community-empty-inline">${empty}</p>`;
}

function section(id, title, route, body, className = "") {
  const more = route ? `<button class="text-button" type="button" data-home-nav="${route}">전체 보기</button>` : "";
  return `<section class="home-section ${className}" aria-labelledby="${id}"><div class="home-section-head"><h2 id="${id}">${title}</h2>${more}</div>${body}</section>`;
}

function bindBrokenImages(root) {
  root.querySelectorAll(".home-thumb img").forEach((image) => {
    if (image.dataset.errorBound) return;
    image.dataset.errorBound = "true";
    image.addEventListener("error", () => {
      const fallback = document.createElement("span");
      fallback.className = "image-fallback";
      fallback.textContent = "이미지를 불러오지 못했습니다";
      image.replaceWith(fallback);
    }, { once: true });
  });
}

function renderHome(rootOrOptions, maybeOptions = {}) {
  const { root, onNavigate = () => {}, onModuleOpen = () => {}, onWrite = () => {} } = normalizeOptions(rootOrOptions, maybeOptions);
  if (!(root instanceof HTMLElement)) throw new TypeError("renderHome requires a DOM element as root");
  root.__homeCallbacks = { onNavigate, onModuleOpen, onWrite };

  const prompts = catalogItems("prompts").slice(0, 4);
  const newsletters = catalogItems("newsletters").slice(0, 4);
  const images = catalogItems("memes").slice(0, 4);
  const existingHome = root.querySelector("[data-home-intro]")?.closest(".lounge-home");
  const existingPreview = root.querySelector("[data-home-board-preview]");

  const template = document.createElement("template");
  template.innerHTML = `<section class="lounge-home" aria-labelledby="home-dashboard-title">
    <section class="home-hero" data-home-intro>
      <h1 id="home-dashboard-title">만들고, 나누고, 함께 성장해요</h1>
      <p>AI를 만드는 사람들의 게시판과 자료실입니다. 모든 글은 로그인 없이 볼 수 있어요.</p>
      <div class="home-hero-actions"><button class="primary-button" type="button" data-home-nav="board">게시판 둘러보기</button><button class="secondary-button" type="button" data-home-write>글쓰기</button></div>
    </section>
    <div class="home-body">
      ${section("home-board-title", "최신 글", "board", '<div data-home-board-preview class="home-board-preview"><div class="community-loading">게시판을 불러오는 중입니다.</div></div>')}
      <div class="home-split">
        ${section("home-prompt-title", "프롬프트", "prompts", `<div class="home-list">${list(prompts, (item) => renderRow(item, "prompts", "프롬프트"), "등록된 프롬프트가 없습니다.")}</div>`)}
        ${section("home-letter-title", "뉴스레터", "newsletter", `<div class="home-list">${list(newsletters, (item) => renderRow(item, "newsletter", "뉴스레터"), "등록된 뉴스레터가 없습니다.")}</div>`)}
      </div>
      ${section("home-image-title", "이미지", "memes", `<div class="home-thumbs">${list(images, renderThumb, "등록된 이미지가 없습니다.")}</div>`)}
      ${section("home-tools-title", "AI 만들기", "", `<div class="home-list">${MODULES.map(renderTool).join("")}</div>`, "home-tools")}
    </div>
  </section>`;
  const nextHome = template.content.firstElementChild;
  const nextBody = nextHome.querySelector(":scope > .home-body");
  if (existingHome) {
    const existingBody = existingHome.querySelector(":scope > .home-body");
    if (existingBody) existingBody.replaceWith(nextBody);
    else existingHome.append(nextBody);
    existingHome.removeAttribute("data-home-prerender");
  } else {
    root.replaceChildren(nextHome);
  }
  // 이미 불러온 게시판 미리보기는 다시 요청하지 않고 그대로 옮깁니다.
  const nextPreview = root.querySelector("[data-home-board-preview]");
  if (existingPreview && nextPreview && existingPreview !== nextPreview) nextPreview.replaceWith(existingPreview);
  bindBrokenImages(root);

  if (!root.dataset.homeBound) {
    root.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-home-nav]");
      if (nav) { root.__homeCallbacks?.onNavigate(nav.dataset.homeNav); return; }
      const module = event.target.closest("[data-home-module]");
      if (module) { root.__homeCallbacks?.onModuleOpen({ action: module.dataset.homeModule }); return; }
      if (event.target.closest("[data-home-write]")) root.__homeCallbacks?.onWrite();
    });
    root.dataset.homeBound = "true";
  }
}

export { renderHome, MODULES };
export default renderHome;
