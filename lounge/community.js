import { COMMUNITY_CATEGORIES, publishedItems } from "./community-data.js";
import { addCatalogItem, catalogCardCover, catalogItems, isCatalogAdmin, removeCatalogItem } from "./catalog.js";

const BOARD_API_BASE = window.location.port === "8787"
  ? "http://127.0.0.1:8787"
  : "https://reportmode-request-board.report-request-board.workers.dev";
const BOARD_CATEGORIES = Object.freeze({ report_opinion: "리포트 의견", ai_question: "AI 질문", knowledge_share: "정보 공유", free_opinion: "자유 의견" });
const BOARD_ERRORS = Object.freeze({ author_required: "작성자 이름을 입력해 주세요.", password_too_short: "비밀번호가 짧습니다.", title_too_short: "제목을 4글자 이상 입력해 주세요.", content_too_short: "내용을 10글자 이상 입력해 주세요.", comment_too_short: "댓글을 2글자 이상 입력해 주세요.", invalid_category: "분류를 선택해 주세요.", reserved_admin_name: "Jeremy와 제레미 이름은 관리자만 사용할 수 있습니다.", wrong_password: "비밀번호가 맞지 않습니다.", login_required: "Google 로그인이 필요합니다.", invalid_google_token: "로그인 시간이 만료되었습니다. 다시 로그인해 주세요.", not_owner: "본인이 작성한 글이나 댓글만 변경할 수 있습니다.", admin_required: "관리자 권한이 필요합니다.", not_found: "글을 찾지 못했습니다. 목록을 새로 불러와 주세요.", invalid_visitor: "방문자 정보를 확인할 수 없습니다." });

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatDate(value, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", withTime ? { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" } : { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric" }).format(date);
}

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 없음";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }).format(date);
}

function compactHomeTitle(value, limit = 32) {
  const text = String(value || "").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function reportMailto(kind, id, title = "") {
  const label = kind === "comment" ? "댓글" : "게시글";
  const subject = `[Builders Lounge] ${label} 신고`;
  const body = [
    `대상: ${label}`,
    `항목 번호: ${String(id || "확인 필요")}`,
    title ? `제목: ${String(title)}` : "",
    `주소: ${window.location.href}`,
    "",
    "신고 사유:",
  ].filter(Boolean).join("\n");
  return `mailto:hello@ai-hub-os.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function chip(label, active, attribute, value) {
  return `<button class="community-filter-chip" type="button" aria-pressed="${active}" ${attribute}="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}

function copyToClipboard(text, button, successText = "복사됨") {
  const original = button.textContent;
  const done = () => { button.textContent = successText; button.setAttribute("data-copy-state", "success"); window.setTimeout(() => { button.textContent = original; button.removeAttribute("data-copy-state"); }, 1500); };
  const fail = () => { button.textContent = "원문을 선택해 복사해 주세요"; button.setAttribute("data-copy-state", "error"); };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(fail);
  else fail();
}

function cardCover(item, fallback) {
  const src = catalogCardCover(item);
  const optimized = { "assets/og.png": "assets/og.webp", "assets/report-hub-banner.png": "assets/report-hub-banner.webp" }[src];
  return `<picture>${optimized ? `<source srcset="${optimized}" type="image/webp">` : ""}<img src="${escapeHtml(src)}" alt="${escapeHtml(item.title || fallback)}" width="1600" height="1000" loading="lazy" decoding="async"></picture>`;
}

function bindBrokenImages(scope) {
  scope?.querySelectorAll("img[data-community-image], .catalog-card-cover img, .meme-dialog-art img").forEach((image) => {
    if (image.dataset.errorBound) return;
    image.dataset.errorBound = "true";
    image.addEventListener("error", () => {
      const fallback = document.createElement("span");
      fallback.className = "image-fallback";
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", "이미지를 불러오지 못했습니다");
      fallback.textContent = "이미지를 불러오지 못했습니다";
      image.replaceWith(fallback);
    }, { once: true });
  });
}

function openCommunityDialog(dialog, focusTarget) {
  if (!dialog) return;
  if (!dialog.dataset.focusBound) {
    dialog.dataset.focusBound = "true";
    dialog.addEventListener("close", () => {
      const target = dialog.__returnFocus;
      dialog.__returnFocus = null;
      window.requestAnimationFrame(() => target?.focus?.({ preventScroll: true }));
    });
  }
  dialog.__returnFocus = document.activeElement;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  window.requestAnimationFrame(() => focusTarget?.focus?.({ preventScroll: true }));
}

function closeCommunityDialog(dialog) {
  if (!dialog) return;
  if (dialog.open && typeof dialog.close === "function") dialog.close();
  else {
    dialog.removeAttribute("open");
    const target = dialog.__returnFocus;
    dialog.__returnFocus = null;
    target?.focus?.({ preventScroll: true });
  }
}

function adminForm(type, fields) {
  if (!isCatalogAdmin()) return "";
  return `<form class="catalog-admin-form" data-catalog-form="${type}"><strong>관리자 등록</strong><div class="catalog-admin-grid">${fields}</div><p class="community-form-status" data-catalog-status="${type}" role="status"></p><button class="primary-button" type="submit">카드 올리기</button></form>`;
}

function renderCatalogCard(item, type, kicker) {
  const admin = isCatalogAdmin() ? `<button class="text-button danger-text" type="button" data-catalog-delete="${escapeHtml(item.id)}">삭제</button>` : "";
  return `<article class="catalog-card" data-catalog-id="${escapeHtml(item.id)}"><button class="catalog-card-open" type="button" data-catalog-open="${escapeHtml(item.id)}"><span class="catalog-card-cover">${cardCover(item, kicker)}</span><span class="catalog-card-copy"><span class="community-chip">${escapeHtml(item.kicker || item.category || item.issue || kicker)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.summary || "")}</small></span></button>${admin}</article>`;
}

function renderPromptPanel(root) {
  const paint = () => {
    const items = catalogItems("prompts");
    root.__catalogItems = items;
    root.innerHTML = `<section class="community-view prompts-view" aria-labelledby="prompts-title"><div class="page-intro"><div><p class="page-intro-kicker">COMMUNITY / PROMPTS</p><h1 id="prompts-title">프롬프트 모음</h1><p>상황별 공개 프롬프트를 카드로 보고 바로 복사합니다.</p></div><span class="community-count-badge">${items.length}개 공개</span></div>${adminForm("prompts", `<label>제목<input name="title" maxlength="80" required></label><label>분류<input name="category" maxlength="20" placeholder="업무, 이미지"></label><label>한 줄 요약<input name="summary" maxlength="160" required></label><label>표지 이미지 주소<input name="cover" type="url" placeholder="https://"></label><label class="catalog-admin-wide">프롬프트 원문<textarea name="body" required></textarea></label>`)}<div class="community-toolbar"><div class="community-chip-row" role="group" aria-label="프롬프트 카테고리">${COMMUNITY_CATEGORIES.prompts.map((category) => chip(category, category === "전체", "data-prompt-category", category)).join("")}</div><label class="community-search"><span class="visually-hidden">프롬프트 검색</span><input type="search" placeholder="제목·상황 검색" data-prompt-search></label></div><div class="catalog-grid" data-prompt-grid></div><dialog class="community-dialog prompt-dialog" data-prompt-dialog aria-labelledby="prompt-dialog-title"><div class="community-dialog-head"><div><h4 id="prompt-dialog-title" data-prompt-dialog-title>프롬프트 상세</h4></div><button class="icon-button" type="button" aria-label="프롬프트 상세 닫기" data-prompt-dialog-close>×</button></div><p class="prompt-dialog-summary" data-prompt-dialog-summary></p><div class="prompt-dialog-meta" data-prompt-dialog-meta></div><details class="prompt-source-details"><summary>긴 프롬프트 원문 열기</summary><pre data-prompt-dialog-copy tabindex="0"></pre></details><div class="community-dialog-actions"><button class="secondary-button" type="button" data-prompt-copy aria-live="polite">프롬프트 복사</button><a class="primary-button" target="_blank" rel="noopener" data-prompt-source hidden>출처 열기 <span aria-hidden="true">↗</span></a><button class="secondary-button" type="button" data-prompt-dialog-close>닫기</button></div></dialog></section>`;
    fillPromptGrid(root);
    bindBrokenImages(root);
    bindCatalogForm(root, "prompts");
  };
  if (!root.dataset.catalogBound) {
    root.addEventListener("click", (event) => {
      const items = root.__catalogItems || [];
      const category = event.target.closest("[data-prompt-category]");
      if (category) { root.querySelectorAll("[data-prompt-category]").forEach((node) => node.setAttribute("aria-pressed", String(node === category))); fillPromptGrid(root); return; }
      const open = event.target.closest("[data-catalog-open]");
      if (open) {
        const item = items.find((candidate) => candidate.id === open.dataset.catalogOpen);
        if (!item) return;
        const dialog = root.querySelector("[data-prompt-dialog]");
        root.querySelector("[data-prompt-dialog-title]").textContent = item.title;
        root.querySelector("[data-prompt-dialog-summary]").textContent = `${item.useCase || item.summary} · ${item.expected || ""}`;
        root.querySelector("[data-prompt-dialog-meta]").innerHTML = `${(item.tags || []).map((tag) => `<span class="community-chip">#${escapeHtml(tag)}</span>`).join("")}<span>${escapeHtml(item.author || "")}</span>`;
        root.querySelector("[data-prompt-dialog-copy]").textContent = item.copyText || "";
        root.querySelector("[data-prompt-copy]").dataset.promptCopyId = item.id;
        const source = root.querySelector("[data-prompt-source]");
        source.hidden = !item.sourceUrl;
        if (item.sourceUrl) {
          source.href = item.sourceUrl;
          source.textContent = `${item.sourceLabel || "출처"} 열기 ↗`;
        } else {
          source.removeAttribute("href");
        }
        openCommunityDialog(dialog, dialog.querySelector("[data-prompt-dialog-close]"));
        return;
      }
      const copyButton = event.target.closest("[data-prompt-copy]");
      if (copyButton) { const item = items.find((candidate) => candidate.id === copyButton.dataset.promptCopyId); if (item) copyToClipboard(item.copyText, copyButton, "복사됨"); }
      if (event.target.closest("[data-prompt-dialog-close]")) closeCommunityDialog(root.querySelector("[data-prompt-dialog]"));
      handleCatalogDelete(event, "prompts");
    });
    root.addEventListener("input", (event) => { if (event.target.closest("[data-prompt-search]")) fillPromptGrid(root); });
    root.dataset.catalogBound = "true";
  }
  paint();
}

function fillPromptGrid(root) {
  const items = root.__catalogItems || [];
  const grid = root.querySelector("[data-prompt-grid]");
  if (!grid) return;
  const active = root.querySelector('[data-prompt-category][aria-pressed="true"]')?.dataset.promptCategory || "전체";
  const query = (root.querySelector("[data-prompt-search]")?.value || "").trim().toLowerCase();
  const filtered = items.filter((item) => (active === "전체" || item.category === active) && (!query || [item.title, item.summary, item.useCase, ...(item.tags || [])].join(" ").toLowerCase().includes(query)));
  grid.innerHTML = filtered.length ? filtered.map((item) => renderCatalogCard(item, "prompts", "프롬프트")).join("") : '<div class="community-empty-state"><strong>조건에 맞는 프롬프트가 없습니다.</strong><p>검색어를 지우거나 다른 분류를 선택해 보세요.</p></div>';
  bindBrokenImages(grid);
}

function renderNewsletterPanel(root) {
  const paint = () => {
    const items = catalogItems("newsletters");
    root.__catalogItems = items;
    root.innerHTML = `<section class="community-view newsletter-view" aria-labelledby="newsletter-title"><div class="page-intro"><div><p class="page-intro-kicker">COMMUNITY / NEWSLETTER</p><h1 id="newsletter-title">뉴스레터</h1><p>한 장의 카드로 먼저 보고, 눌러서 본문을 읽습니다.</p></div><span class="community-count-badge">${items.length}개 공개</span></div>${adminForm("newsletters", `<label>제목<input name="title" maxlength="80" required></label><label>호수<input name="category" maxlength="20" placeholder="2호"></label><label>한 줄 요약<input name="summary" maxlength="160" required></label><label>표지 이미지 주소<input name="cover" type="url" placeholder="https://"></label><label class="catalog-admin-wide">본문<textarea name="body" required></textarea></label>`)}<div class="catalog-grid" data-newsletter-grid></div><dialog class="community-dialog newsletter-dialog" data-newsletter-dialog aria-labelledby="newsletter-dialog-title"><div class="community-dialog-head"><div><h4 id="newsletter-dialog-title" data-newsletter-dialog-title>뉴스레터</h4></div><button class="icon-button" type="button" aria-label="뉴스레터 닫기" data-newsletter-dialog-close>×</button></div><div class="newsletter-dialog-scroll"><div class="newsletter-dialog-body" data-newsletter-dialog-body></div></div><div class="newsletter-dialog-footer"><span class="newsletter-dialog-source" data-newsletter-dialog-source></span><button class="secondary-button" type="button" data-newsletter-dialog-close>닫기</button></div></dialog></section>`;
    const grid = root.querySelector("[data-newsletter-grid]");
    grid.innerHTML = items.length ? items.map((item) => renderCatalogCard(item, "newsletters", "뉴스레터")).join("") : '<div class="community-empty-state"><strong>등록된 뉴스레터가 없습니다.</strong></div>';
    bindBrokenImages(grid);
    bindCatalogForm(root, "newsletters");
  };
  if (!root.dataset.catalogBound) {
    root.addEventListener("click", (event) => {
      const items = root.__catalogItems || [];
      const open = event.target.closest("[data-catalog-open]");
      if (open) {
        const item = items.find((candidate) => candidate.id === open.dataset.catalogOpen);
        if (!item) return;
        const dialog = root.querySelector("[data-newsletter-dialog]");
        root.querySelector("[data-newsletter-dialog-title]").textContent = item.title;
        root.querySelector("[data-newsletter-dialog-body]").innerHTML = `<p class="newsletter-dialog-lead">${escapeHtml(item.summary)}</p><div class="newsletter-dialog-sections">${(item.sections || []).map((section) => `<section><h5>${escapeHtml(section.heading)}</h5><p>${escapeHtml(section.body)}</p></section>`).join("")}</div>`;
        const source = root.querySelector("[data-newsletter-dialog-source]");
        source.innerHTML = item.sourceUrl ? `<a class="text-button" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(item.sourceLabel || "원문")} 열기 ↗</a>` : "";
        openCommunityDialog(dialog, dialog.querySelector("[data-newsletter-dialog-close]"));
        return;
      }
      if (event.target.closest("[data-newsletter-dialog-close]")) closeCommunityDialog(root.querySelector("[data-newsletter-dialog]"));
      handleCatalogDelete(event, "newsletters");
    });
    root.dataset.catalogBound = "true";
  }
  paint();
}

function renderMemePanel(root) {
  const paint = () => {
    const items = catalogItems("memes");
    root.__catalogItems = items;
    root.innerHTML = `<section class="community-view memes-view" aria-labelledby="memes-title"><div class="page-intro"><div><p class="page-intro-kicker">COMMUNITY / IMAGES</p><h1 id="memes-title">이미지 게시판</h1><p>프롬프트·뉴스레터와 같은 카드로 이미지를 봅니다.</p></div><span class="community-count-badge">${items.length}개 공개</span></div>${adminForm("memes", `<label>제목<input name="title" maxlength="80" required></label><label>분류<input name="category" maxlength="20" placeholder="AI 공감"></label><label>한 줄 요약<input name="summary" maxlength="160" required></label><label>이미지 주소<input name="cover" type="url" placeholder="https://"></label><label class="catalog-admin-wide">설명<textarea name="body" required></textarea></label>`)}<div class="community-chip-row" role="group" aria-label="이미지 분류">${COMMUNITY_CATEGORIES.memes.map((category) => chip(category, category === "전체", "data-meme-category", category)).join("")}</div><div class="catalog-grid" data-meme-grid></div><dialog class="community-dialog meme-dialog" data-meme-dialog aria-labelledby="meme-dialog-title"><div class="community-dialog-head"><div><h4 id="meme-dialog-title" data-meme-title>이미지 게시판</h4></div><button class="icon-button" type="button" aria-label="이미지 상세 닫기" data-meme-close>×</button></div><div class="meme-dialog-scroll"><div class="meme-dialog-art" data-meme-art></div><p class="meme-dialog-description" data-meme-summary></p></div><div class="newsletter-dialog-footer"><button class="secondary-button" type="button" data-meme-close>닫기</button></div></dialog></section>`;
    fillMemeGrid(root);
    bindCatalogForm(root, "memes");
  };
  if (!root.dataset.catalogBound) {
    root.addEventListener("click", (event) => {
      const items = root.__catalogItems || [];
      const category = event.target.closest("[data-meme-category]");
      if (category) { root.querySelectorAll("[data-meme-category]").forEach((node) => node.setAttribute("aria-pressed", String(node === category))); fillMemeGrid(root); return; }
      const open = event.target.closest("[data-catalog-open]");
      if (open) {
        const item = items.find((candidate) => candidate.id === open.dataset.catalogOpen);
        if (!item) return;
        const dialog = root.querySelector("[data-meme-dialog]");
        root.querySelector("[data-meme-title]").textContent = item.title;
        root.querySelector("[data-meme-art]").innerHTML = cardCover(item, "이미지");
        root.querySelector("[data-meme-summary]").textContent = `${item.summary || ""} ${item.credit ? "· " + item.credit : ""}`.trim();
        bindBrokenImages(dialog);
        openCommunityDialog(dialog, dialog.querySelector("[data-meme-close]"));
        return;
      }
      if (event.target.closest("[data-meme-close]")) closeCommunityDialog(root.querySelector("[data-meme-dialog]"));
      handleCatalogDelete(event, "memes");
    });
    root.dataset.catalogBound = "true";
  }
  paint();
}

function fillMemeGrid(root) {
  const items = root.__catalogItems || [];
  const grid = root.querySelector("[data-meme-grid]");
  if (!grid) return;
  const active = root.querySelector('[data-meme-category][aria-pressed="true"]')?.dataset.memeCategory || "전체";
  const filtered = items.filter((item) => active === "전체" || item.category === active);
  grid.innerHTML = filtered.length ? filtered.map((item) => renderCatalogCard(item, "memes", "이미지")).join("") : '<div class="community-empty-state"><strong>등록된 이미지가 없습니다.</strong></div>';
  bindBrokenImages(grid);
}

function handleCatalogDelete(event, type) {
  const remove = event.target.closest("[data-catalog-delete]");
  if (!remove) return;
  event.preventDefault();
  if (!window.confirm("이 카드를 삭제할까요?")) return;
  try {
    removeCatalogItem(type, remove.closest("[data-catalog-id]")?.dataset.catalogId || remove.dataset.catalogDelete);
    window.dispatchEvent(new CustomEvent("lounge:catalogchange"));
  } catch (error) {
    window.alert(error.message);
  }
}

function bindCatalogForm(root, type) {
  const form = root.querySelector(`[data-catalog-form="${type}"]`);
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "true";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = root.querySelector(`[data-catalog-status="${type}"]`);
    try {
      addCatalogItem(type, form);
      if (status) { status.textContent = "올렸습니다. 이 브라우저에서는 새로고침 후에도 유지됩니다."; status.dataset.error = "false"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); }
      form.reset();
      window.dispatchEvent(new CustomEvent("lounge:catalogchange"));
    } catch (error) {
      if (status) { status.textContent = error.message; status.dataset.error = "true"; status.setAttribute("role", "alert"); status.setAttribute("aria-live", "assertive"); }
    }
  });
}

function renderVideoPanel(root) {
  const listItems = publishedItems("videos");
  root.innerHTML = `<section class="community-view videos-view" aria-labelledby="videos-title"><div class="page-intro"><div><p class="page-intro-kicker">COMMUNITY / VIDEO</p><h3 id="videos-title">영상 모음</h3><p>요약을 먼저 보고, 재생을 눌렀을 때만 원본 영상을 불러옵니다.</p></div><span class="community-count-badge">${listItems.length}개</span></div><div class="community-chip-row" role="group" aria-label="영상 카테고리">${COMMUNITY_CATEGORIES.videos.map((category) => chip(category, category === "전체", "data-video-category", category)).join("")}</div><div class="video-layout"><div class="video-list" data-video-list></div><div class="video-player-shell" data-video-player><div class="video-player-placeholder"><strong>재생할 영상을 선택해 주세요.</strong><p>자동 재생하지 않으며, 선택한 영상 하나만 표시합니다.</p></div></div></div></section>`;
  const list = root.querySelector("[data-video-list]"); const player = root.querySelector("[data-video-player]");
  const render = () => { const active = root.querySelector('[data-video-category][aria-pressed="true"]')?.dataset.videoCategory || "전체"; const filtered = listItems.filter((item) => active === "전체" || item.category === active); list.innerHTML = filtered.map((item) => `<article class="video-card" data-video-card="${escapeHtml(item.id)}" aria-current="false"><div class="video-card-copy"><div class="prompt-card-topline"><span class="community-chip">${escapeHtml(item.category)}</span><span class="video-meta">${escapeHtml(item.duration)} · ${escapeHtml(item.difficulty)}</span></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.summary)}</p></div><div class="video-card-actions"><button class="primary-button" type="button" data-video-play="${escapeHtml(item.id)}">재생</button><a class="text-button" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener">YouTube 원문 ↗</a></div></article>`).join("") || '<div class="community-empty-state"><strong>등록된 영상이 없습니다.</strong></div>'; };
  root.addEventListener("click", (event) => {
    const category = event.target.closest("[data-video-category]");
    if (category) { root.querySelectorAll("[data-video-category]").forEach((node) => node.setAttribute("aria-pressed", String(node === category))); player.innerHTML = '<div class="video-player-placeholder"><strong>재생할 영상을 선택해 주세요.</strong><p>자동 재생하지 않으며, 선택한 영상 하나만 표시합니다.</p></div>'; render(); return; }
    if (event.target.closest("[data-video-stop]")) { player.innerHTML = '<div class="video-player-placeholder"><strong>재생할 영상을 선택해 주세요.</strong><p>자동 재생하지 않으며, 선택한 영상 하나만 표시합니다.</p></div>'; root.querySelectorAll("[data-video-card]").forEach((card) => card.setAttribute("aria-current", "false")); return; }
    const play = event.target.closest("[data-video-play]");
    if (!play) return;
    const item = listItems.find((candidate) => candidate.id === play.dataset.videoPlay);
    if (!item) return;
    root.querySelectorAll("[data-video-card]").forEach((card) => card.setAttribute("aria-current", String(card.dataset.videoCard === item.id)));
    player.innerHTML = `<div class="video-player-head"><strong>${escapeHtml(item.title)}</strong><button class="text-button" type="button" data-video-stop>플레이어 닫기</button></div><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.videoId)}?rel=0" title="${escapeHtml(item.title)}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  });
  render();
}

function renderGamePanel(root) {
  const items = publishedItems("games");
  root.innerHTML = `<section class="community-view games-view" aria-labelledby="games-title"><div class="page-intro"><div><p class="page-intro-kicker">COMMUNITY / PLAY</p><h3 id="games-title">게임방</h3><p>카드를 고른 뒤 실행합니다. 라운지에는 한 번에 하나의 게임만 표시합니다.</p></div><span class="community-count-badge">${items.length}개</span></div><div class="game-list" data-game-list></div><div class="game-player-shell" data-game-player hidden></div></section>`;
  const list = root.querySelector("[data-game-list]");
  list.innerHTML = items.length ? items.map((item) => `<article class="game-card" data-game-card="${escapeHtml(item.id)}"><div class="game-card-copy"><div class="prompt-card-topline"><span class="community-chip">게임</span><span class="video-meta">${item.mobileReady ? "모바일 지원" : "데스크톱 권장"}</span></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.summary)}</p><small>조작 · ${escapeHtml(item.controls)}</small></div><div class="game-card-actions"><button class="primary-button" type="button" data-game-play="${escapeHtml(item.id)}">바로 플레이</button><a class="text-button" href="${escapeHtml(item.launchUrl)}" target="_blank" rel="noopener">새 탭으로 열기 ↗</a></div></article>`).join("") : '<div class="community-empty-state"><strong>등록된 게임이 없습니다.</strong></div>';
  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-game-stop]")) { const player = root.querySelector("[data-game-player]"); player.hidden = true; player.innerHTML = ""; return; }
    const play = event.target.closest("[data-game-play]"); if (!play) return;
    const item = items.find((candidate) => candidate.id === play.dataset.gamePlay); if (!item) return;
    const player = root.querySelector("[data-game-player]");
    player.hidden = false;
    if (!item.embedAllowed) {
      player.innerHTML = `<div class="game-player-head"><strong>${escapeHtml(item.title)}</strong><button class="text-button" type="button" data-game-stop>닫기</button></div><div class="game-player-placeholder"><strong>이 게임은 라운지 안에서 실행할 수 없습니다.</strong><p>아래 새 탭 링크에서 원본을 열어 주세요.</p><a class="secondary-button" href="${escapeHtml(item.launchUrl)}" target="_blank" rel="noopener">새 탭으로 열기 ↗</a></div>`;
      return;
    }
    player.innerHTML = `<div class="game-player-head"><strong>${escapeHtml(item.title)}</strong><button class="text-button" type="button" data-game-stop>닫기</button></div><iframe src="${escapeHtml(item.launchUrl)}" title="${escapeHtml(item.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  });
}

function boardRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const config = { cache: method === "GET" ? "default" : "no-store", ...options, headers: { ...(options.headers || {}) } };
  if (config.body) config.headers["Content-Type"] = "application/json";
  const token = window.BuildersPlatform?.getCredential?.();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else if (config.headers.Authorization) delete config.headers.Authorization;
  return fetch(BOARD_API_BASE + path, config).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(BOARD_ERRORS[body?.error] || "게시판을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      error.code = body?.error;
      throw error;
    }
    return body;
  });
}

function boardVisitorId() {
  try { const key = "builders-lounge:visitor-id"; const saved = localStorage.getItem(key); if (saved) return saved; const next = globalThis.crypto?.randomUUID?.() || `visitor-${Date.now()}`; localStorage.setItem(key, next); return next; } catch { return `preview-${Date.now()}`; }
}

function boardUrl(state, replace = false) {
  const url = new URL(window.location.href);
  ["post", "page", "category", "sort", "q"].forEach((key) => url.searchParams.delete(key));
  if (state.postId) url.searchParams.set("post", state.postId);
  else { if (state.page > 1) url.searchParams.set("page", String(state.page)); if (state.category !== "all") url.searchParams.set("category", state.category); if (state.sort !== "latest") url.searchParams.set("sort", state.sort); if (state.query) url.searchParams.set("q", state.query); }
  url.hash = "board";
  window.history[replace ? "replaceState" : "pushState"]({ postId: state.postId || "" }, "", url);
}

function readBoardUrl(state) {
  const params = new URLSearchParams(window.location.search);
  state.postId = params.get("post") || "";
  state.page = Math.max(1, Number(params.get("page") || 1) || 1);
  state.category = BOARD_CATEGORIES[params.get("category")] ? params.get("category") : "all";
  state.sort = ["latest", "comments", "views"].includes(params.get("sort")) ? params.get("sort") : "latest";
  state.query = String(params.get("q") || "").slice(0, 120);
  const search = state.root.querySelector("[data-board-search]"); if (search) search.value = state.query;
  const sort = state.root.querySelector("[data-board-sort]"); if (sort) sort.value = state.sort;
  state.root.querySelectorAll("[data-board-category]").forEach((node) => node.setAttribute("aria-pressed", String(node.dataset.boardCategory === state.category)));
}

function dialogOpen(dialog, focusTarget) { if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", ""); window.requestAnimationFrame(() => focusTarget?.focus()); }
function dialogClose(dialog) { dialog.close?.(); dialog.removeAttribute("open"); }

function renderBoard(root, onReady) {
  root.innerHTML = `<section class="community-view board-view" aria-labelledby="board-title"><div class="page-intro board-page-intro"><div><p class="page-intro-kicker">COMMUNITY / BOARD</p><h3 id="board-title">자유게시판</h3><p>질문과 경험을 나누고, 제목과 요약을 한눈에 확인합니다.</p></div><button class="primary-button" type="button" data-board-open-write>새 글 작성 · +1빌드</button></div><div class="board-layout" data-board-list-layout><div class="board-category-row" role="group" aria-label="게시판 분류"><button class="community-filter-chip" type="button" data-board-category="all" aria-pressed="true">전체</button>${Object.entries(BOARD_CATEGORIES).map(([id, label]) => chip(label, false, "data-board-category", id)).join("")}</div><div class="board-toolbar"><form class="board-search-form" data-board-search-form><label><span class="visually-hidden">게시판 검색</span><input type="search" data-board-search placeholder="제목·본문 검색"></label><button class="secondary-button" type="submit">검색</button></form><label class="board-sort-label"><span>정렬</span><select data-board-sort><option value="latest">최신순</option><option value="comments">댓글순</option><option value="views">조회순</option></select></label></div><div class="board-result-line"><span data-board-result-count>게시판을 불러오는 중입니다.</span><button class="text-button" type="button" data-board-refresh>새로고침</button></div><div class="board-list-wrap" data-board-list-wrap aria-live="polite"><div class="community-loading">게시판을 불러오는 중입니다.</div></div><nav class="board-pagination" aria-label="게시판 페이지 이동" data-board-pagination></nav></div><article class="board-detail" data-board-detail hidden></article><dialog class="community-dialog board-dialog" data-board-post-dialog><form method="dialog" class="board-form" data-board-post-form><div class="community-dialog-head"><div><h4 data-board-form-title>새 글 작성</h4></div><button class="icon-button" type="button" aria-label="게시글 작성 닫기" data-board-dialog-close>×</button></div><input type="hidden" name="postId"><label>분류<select name="category"><option value="report_opinion">리포트 의견</option><option value="ai_question">AI 질문</option><option value="knowledge_share">정보 공유</option><option value="free_opinion">자유 의견</option></select></label><label>제목<input name="title" maxlength="100" required placeholder="제목을 입력해 주세요"></label><label>내용<textarea name="content" maxlength="5000" required placeholder="일반 텍스트로 작성해 주세요"></textarea></label><p class="board-form-note">로그인한 Google 계정 이름으로 등록되며, 글과 댓글은 각각 1빌드가 적립됩니다.</p><p class="community-form-status" data-board-post-status role="status"></p><div class="community-dialog-actions"><button class="secondary-button" type="button" data-board-dialog-close>취소</button><button class="primary-button" type="submit" data-board-save>게시하고 1빌드 받기</button></div></form></dialog><dialog class="community-dialog board-dialog" data-board-action-dialog><form method="dialog" class="board-form" data-board-action-form><div class="community-dialog-head"><div><h4 data-board-action-title>게시글 삭제</h4></div><button class="icon-button" type="button" aria-label="확인 창 닫기" data-board-action-close>×</button></div><p data-board-action-copy>삭제하면 되돌릴 수 없습니다.</p><p class="community-form-status" data-board-action-status role="status"></p><div class="community-dialog-actions"><button class="secondary-button" type="button" data-board-action-close>취소</button><button class="danger-button" type="submit">삭제</button></div></form></dialog><dialog class="community-dialog board-dialog" data-board-comment-dialog><form method="dialog" class="board-form" data-board-comment-form><div class="community-dialog-head"><div><h4 data-board-comment-title>댓글 남기기</h4></div><button class="icon-button" type="button" aria-label="댓글 창 닫기" data-board-comment-close>×</button></div><input type="hidden" name="commentId"><label>댓글<textarea name="content" maxlength="2000" required></textarea></label><p class="community-form-status" data-board-comment-dialog-status role="status"></p><div class="community-dialog-actions"><button class="secondary-button" type="button" data-board-comment-close>취소</button><button class="primary-button" type="submit" data-board-comment-save>댓글 등록 · +1빌드</button></div></form></dialog></section>`;

  const state = { root, page: 1, pageSize: 20, category: "all", sort: "latest", query: "", postId: "", post: null, posts: [], comments: [], total: 0, totalPages: 1, busy: false, dialogMode: "create", action: "", lastFocus: null };
  const list = root.querySelector("[data-board-list-wrap]"); const detail = root.querySelector("[data-board-detail]"); const listLayout = root.querySelector("[data-board-list-layout]"); const pagination = root.querySelector("[data-board-pagination]");
  const postDialog = root.querySelector("[data-board-post-dialog]"); const actionDialog = root.querySelector("[data-board-action-dialog]"); const commentDialog = root.querySelector("[data-board-comment-dialog]"); const postForm = root.querySelector("[data-board-post-form]"); const actionForm = root.querySelector("[data-board-action-form]"); const commentForm = root.querySelector("[data-board-comment-form]");
  const setStatus = (selector, text, error = false) => { const node = root.querySelector(selector); if (node) { node.textContent = text || ""; node.dataset.error = String(error); node.setAttribute("role", error ? "alert" : "status"); node.setAttribute("aria-live", error ? "assertive" : "polite"); } };
  const setRoute = (next, replace = false) => { Object.assign(state, next); boardUrl(state, replace); renderRoute(); };
  const renderPagination = () => { pagination.innerHTML = ""; if (state.totalPages <= 1) return; const add = (label, disabled, current, callback) => { const button = document.createElement("button"); button.type = "button"; button.className = "board-page-button"; button.textContent = label; button.disabled = disabled; if (current) button.setAttribute("aria-current", "page"); button.addEventListener("click", callback); pagination.appendChild(button); }; add("이전", state.page <= 1, false, () => { if (state.page > 1) setRoute({ postId: "", page: state.page - 1 }); }); const start = Math.max(1, state.page - 2); const end = Math.min(state.totalPages, start + 4); for (let pageNumber = start; pageNumber <= end; pageNumber += 1) add(String(pageNumber), false, pageNumber === state.page, () => setRoute({ postId: "", page: pageNumber })); add("다음", state.page >= state.totalPages, false, () => { if (state.page < state.totalPages) setRoute({ postId: "", page: state.page + 1 }); }); };
  const renderList = (data) => { state.posts = Array.isArray(data.posts) ? data.posts : []; state.total = Number(data.pagination?.total || 0); state.totalPages = Math.max(1, Number(data.pagination?.totalPages || 1)); root.querySelector("[data-board-result-count]").textContent = state.total ? `총 ${state.total.toLocaleString("ko-KR")}개의 글` : "아직 등록된 글 없음"; if (!state.posts.length) { list.innerHTML = `<div class="community-empty-state"><strong>${state.query ? "검색 조건에 맞는 글이 없습니다." : "아직 작성된 글이 없습니다. 첫 의견을 남겨 주세요."}</strong></div>`; } else { list.innerHTML = state.posts.map((post) => { const dateValue = post.updated_at || post.created_at; return `<a class="board-post-row" href="?post=${encodeURIComponent(post.id)}#board" data-board-post-id="${escapeHtml(post.id)}"><span class="community-chip">${escapeHtml(BOARD_CATEGORIES[post.category] || "기타")}</span><span class="board-post-copy"><strong>${escapeHtml(post.title)}${post.origin === "shorts" ? ' <em class="board-media-badge">쇼츠</em>' : ""}</strong><small>${escapeHtml(post.summary || post.content || "")}</small></span><span class="board-post-meta"><span class="board-post-author">${escapeHtml(post.author || "방문자")}${Number(post.is_admin) === 1 ? "<em>관리자</em>" : ""}</span><time datetime="${escapeHtml(dateValue || "")}"><span class="board-date-full">${formatDate(dateValue)}</span><span class="board-date-short">${formatShortDate(dateValue)}</span></time></span><span class="board-post-stat">댓글 ${Number(post.comment_count || 0).toLocaleString("ko-KR")}</span></a>`; }).join(""); } renderPagination(); };
  const loadPosts = async () => { list.setAttribute("aria-busy", "true"); list.innerHTML = `<div class="community-loading" role="status" aria-live="polite">게시판을 불러오는 중입니다.</div>`; const params = new URLSearchParams({ page: String(state.page), pageSize: String(state.pageSize), category: state.category, sort: state.sort, q: state.query }); try { renderList(await boardRequest(`/board/posts?${params}`)); } catch (error) { root.querySelector("[data-board-result-count]").textContent = "불러오기 실패"; list.innerHTML = `<div class="community-error-state" role="alert"><strong>게시판을 불러오지 못했습니다.</strong><p>${escapeHtml(error.message)}</p><button class="secondary-button" type="button" data-board-refresh>다시 시도</button></div>`; } finally { list.setAttribute("aria-busy", "false"); } };
  const renderComments = (comments) => comments.length ? comments.map((comment) => `<article class="board-comment" data-comment-id="${escapeHtml(comment.id)}"><div class="board-comment-head"><strong>${escapeHtml(comment.author || "방문자")}</strong>${Number(comment.is_admin) === 1 ? '<span class="community-chip">관리자</span>' : ""}<time>${formatDate(comment.updated_at || comment.created_at, true)}</time></div><p>${escapeHtml(comment.content || "")}</p><div class="board-comment-actions">${comment.can_edit ? `<button class="text-button" type="button" data-board-comment-edit="${escapeHtml(comment.id)}">수정</button><button class="text-button" type="button" data-board-comment-delete="${escapeHtml(comment.id)}">삭제</button>` : ""}<a class="text-button" href="${escapeHtml(reportMailto("comment", comment.id))}" aria-label="${escapeHtml(comment.author || "방문자")}님의 댓글 신고">신고</a></div></article>`).join("") : '<div class="community-empty-state"><strong>아직 댓글이 없습니다.</strong></div>';
  const loadComments = async (postId) => { const target = root.querySelector("[data-board-comments]"); target.innerHTML = `<div class="community-loading" role="status" aria-live="polite">댓글을 불러오는 중입니다.</div>`; try { const data = await boardRequest(`/board/posts/${encodeURIComponent(postId)}/comments`); state.comments = Array.isArray(data.comments) ? data.comments : []; target.innerHTML = renderComments(state.comments); root.querySelector("[data-board-comment-count]").textContent = `${state.comments.length}개`; } catch (error) { target.innerHTML = `<div class="community-error-state" role="alert">${escapeHtml(error.message)}</div>`; } };
  const renderDetail = (post) => { const mediaUrl = /^https:\/\//.test(post.mediaUrl || "") && ["video/webm", "video/mp4"].includes(post.mediaType) ? post.mediaUrl : ""; state.post = post; detail.innerHTML = `<div class="board-detail-top"><button class="text-button" type="button" data-board-back>목록으로</button><span class="community-chip">${escapeHtml(BOARD_CATEGORIES[post.category] || "기타")}</span>${post.origin === "shorts" ? '<span class="board-media-badge">쇼츠 영상</span>' : ""}</div><article class="board-detail-card"><h4>${escapeHtml(post.title)}</h4><div class="board-detail-meta"><strong>${escapeHtml(post.author || "방문자")}</strong>${Number(post.is_admin) === 1 ? '<span class="community-chip">관리자</span>' : ""}<time>${formatDate(post.created_at, true)}</time><span>조회 ${Number(post.view_count || 0).toLocaleString("ko-KR")}</span></div>${mediaUrl ? `<video class="board-detail-media" controls playsinline preload="metadata" src="${escapeHtml(mediaUrl)}" aria-label="${escapeHtml(post.title)} 쇼츠 영상"></video>` : ""}<p class="board-detail-content">${escapeHtml(post.content || "")}</p><div class="board-detail-actions"><button class="secondary-button" type="button" data-board-copy>링크 복사</button>${post.can_edit ? '<button class="text-button" type="button" data-board-edit>수정</button><button class="text-button danger-text" type="button" data-board-delete>삭제</button>' : ""}<a class="text-button" href="${escapeHtml(reportMailto("post", post.id, post.title))}">신고</a></div></article><section class="board-comments" aria-labelledby="board-comments-title"><div class="board-comments-head"><h5 id="board-comments-title">댓글 <span data-board-comment-count>0개</span></h5><button class="primary-button" type="button" data-board-open-comment>댓글 쓰기</button></div><div data-board-comments></div></section>`; listLayout.hidden = true; detail.hidden = false; loadComments(post.id); };
  const loadPost = async (postId) => { try { const data = await boardRequest(`/board/posts/${encodeURIComponent(postId)}`); renderDetail(data.post); void boardRequest(`/board/posts/${encodeURIComponent(postId)}/views`, { method: "POST", body: JSON.stringify({ visitorId: boardVisitorId() }) }); } catch (error) { state.postId = ""; boardUrl(state, true); listLayout.hidden = false; detail.hidden = true; list.innerHTML = `<div class="community-error-state" role="alert"><strong>${escapeHtml(error.message)}</strong><button class="secondary-button" type="button" data-board-refresh>목록 다시 불러오기</button></div>`; } };
  const renderRoute = () => { readBoardUrl(state); if (state.postId) loadPost(state.postId); else { listLayout.hidden = false; detail.hidden = true; loadPosts(); } };
  const ensureLogin = () => { if (window.BuildersPlatform?.snapshot?.().user) return true; window.BuildersPlatform?.openLogin?.(); return false; };
  const openWrite = (post = null) => { if (!ensureLogin()) return; state.lastFocus = document.activeElement; state.dialogMode = post ? "edit" : "create"; postForm.reset(); postForm.elements.postId.value = post?.id || ""; postForm.elements.category.value = post?.category || "report_opinion"; postForm.elements.category.disabled = post?.origin === "shorts"; postForm.elements.title.value = post?.title || ""; postForm.elements.content.value = post?.content || ""; root.querySelector("[data-board-form-title]").textContent = post ? "게시글 수정" : "새 글 작성"; root.querySelector("[data-board-save]").textContent = post ? "수정 저장" : "게시하고 1빌드 받기"; setStatus("[data-board-post-status]", "", false); dialogOpen(postDialog, postForm.elements.title); };
  const openAction = (action, itemId, postId = state.post?.id) => { if (!ensureLogin()) return; state.action = action; actionDialog.dataset.itemId = itemId; actionDialog.dataset.postId = postId || ""; root.querySelector("[data-board-action-title]").textContent = action === "post-delete" ? "게시글 삭제" : "댓글 삭제"; root.querySelector("[data-board-action-copy]").textContent = action === "post-delete" ? "이 글 또는 댓글로 받은 1빌드도 함께 취소됩니다." : "삭제하면 되돌릴 수 없습니다."; actionForm.reset(); setStatus("[data-board-action-status]", "", false); dialogOpen(actionDialog, actionForm.querySelector('button[type="submit"]')); };
  const openComment = () => { if (!ensureLogin()) return; state.lastFocus = document.activeElement; commentForm.reset(); commentForm.elements.commentId.value = ""; root.querySelector("[data-board-comment-title]").textContent = "댓글 남기기"; root.querySelector("[data-board-comment-save]").textContent = "댓글 등록 · +1빌드"; setStatus("[data-board-comment-dialog-status]", "", false); dialogOpen(commentDialog, commentForm.elements.content); };
  const openCommentEdit = (comment) => { if (!comment || !ensureLogin()) return; state.lastFocus = document.activeElement; commentForm.reset(); commentForm.elements.commentId.value = comment.id; commentForm.elements.content.value = comment.content || ""; root.querySelector("[data-board-comment-title]").textContent = "댓글 수정"; root.querySelector("[data-board-comment-save]").textContent = "수정 저장"; setStatus("[data-board-comment-dialog-status]", "", false); dialogOpen(commentDialog, commentForm.elements.content); };

  root.addEventListener("click", (event) => {
    const category = event.target.closest("[data-board-category]"); if (category) { event.preventDefault(); setRoute({ postId: "", category: category.dataset.boardCategory, page: 1 }); return; }
    const postLink = event.target.closest("[data-board-post-id]"); if (postLink) { event.preventDefault(); setRoute({ postId: postLink.dataset.boardPostId }); return; }
    if (event.target.closest("[data-board-open-write]")) { openWrite(); return; }
    if (event.target.closest("[data-board-refresh]")) { loadPosts(); return; }
    if (event.target.closest("[data-board-back]")) { setRoute({ postId: "" }); return; }
    if (event.target.closest("[data-board-open-comment]")) { openComment(); return; }
    if (event.target.closest("[data-board-copy]")) copyToClipboard(window.location.href, event.target.closest("[data-board-copy]"), "복사됨");
    if (event.target.closest("[data-board-edit]")) openWrite(state.post);
    if (event.target.closest("[data-board-delete]")) openAction("post-delete", state.post?.id);
    const commentEdit = event.target.closest("[data-board-comment-edit]"); if (commentEdit) { openCommentEdit(state.comments.find((comment) => String(comment.id) === String(commentEdit.dataset.boardCommentEdit))); return; }
    const commentDelete = event.target.closest("[data-board-comment-delete]"); if (commentDelete) openAction("comment-delete", commentDelete.dataset.boardCommentDelete);
    if (event.target.closest("[data-board-dialog-close]")) dialogClose(postDialog);
    if (event.target.closest("[data-board-action-close]")) dialogClose(actionDialog);
    if (event.target.closest("[data-board-comment-close]")) dialogClose(commentDialog);
  });
  root.querySelector("[data-board-sort]").addEventListener("change", (event) => setRoute({ postId: "", sort: event.target.value, page: 1 }));
  root.querySelector("[data-board-search-form]").addEventListener("submit", (event) => { event.preventDefault(); setRoute({ postId: "", query: root.querySelector("[data-board-search]").value.trim().slice(0, 120), page: 1 }); });
  postForm.addEventListener("submit", async (event) => { event.preventDefault(); if (state.busy || !ensureLogin()) return; const payload = { category: postForm.elements.category.value, title: postForm.elements.title.value.trim(), content: postForm.elements.content.value }; const postId = postForm.elements.postId.value; state.busy = true; setStatus("[data-board-post-status]", postId ? "수정 중입니다." : "등록하고 1빌드를 적립하는 중입니다."); try { const response = await boardRequest(postId ? `/board/posts/${encodeURIComponent(postId)}` : "/board/posts", { method: postId ? "PATCH" : "POST", body: JSON.stringify(payload) }); if (!postId && Number(response.reward || 0) > 0) { window.BuildersPlatform?.applyBalance?.(response.balance); } invalidateHomeBoardPreview(); dialogClose(postDialog); state.postId = response.post.id; boardUrl(state); renderRoute(); } catch (error) { setStatus("[data-board-post-status]", error.message, true); } finally { state.busy = false; } });
  actionForm.addEventListener("submit", async (event) => { event.preventDefault(); if (state.busy || !ensureLogin()) return; state.busy = true; setStatus("[data-board-action-status]", "처리 중입니다."); try { const endpoint = state.action === "post-delete" ? `/board/posts/${encodeURIComponent(actionDialog.dataset.itemId)}` : `/board/comments/${encodeURIComponent(actionDialog.dataset.itemId)}`; await boardRequest(endpoint, { method: "DELETE", body: "{}" }); await window.BuildersPlatform?.refreshMe?.(); invalidateHomeBoardPreview(); dialogClose(actionDialog); if (state.action === "post-delete") { state.postId = ""; boardUrl(state); renderRoute(); } else if (state.post) loadComments(state.post.id); } catch (error) { setStatus("[data-board-action-status]", error.message, true); } finally { state.busy = false; } });
  commentForm.addEventListener("submit", async (event) => { event.preventDefault(); if (!state.post || !ensureLogin()) return; state.busy = true; const payload = { content: commentForm.elements.content.value }; const commentId = commentForm.elements.commentId.value; try { await boardRequest(commentId ? `/board/comments/${encodeURIComponent(commentId)}` : `/board/posts/${encodeURIComponent(state.post.id)}/comments`, { method: commentId ? "PATCH" : "POST", body: JSON.stringify(payload) }); invalidateHomeBoardPreview(); dialogClose(commentDialog); await loadComments(state.post.id); } catch (error) { setStatus("[data-board-comment-dialog-status]", error.message, true); } finally { state.busy = false; } });
  [postDialog, actionDialog, commentDialog].forEach((dialog) => dialog.addEventListener("close", () => state.lastFocus?.focus?.()));
  window.addEventListener("popstate", () => { if (document.documentElement.dataset.loungeRoute === "board") renderRoute(); });
  window.addEventListener("lounge:boardwrite", () => { if (document.documentElement.dataset.loungeRoute === "board") openWrite(); });
  onReady({ openWrite, renderRoute, clearQuery: () => { const url = new URL(window.location.href); ["post", "page", "category", "sort", "q"].forEach((key) => url.searchParams.delete(key)); window.history.replaceState({}, "", url); } });
  renderRoute();
}

let homeBoardPreviewPromise = null;
let homeBoardPreviewPosts = null;

function invalidateHomeBoardPreview() {
  homeBoardPreviewPromise = null;
  homeBoardPreviewPosts = null;
}

function paintHomeBoardPreview(root, posts) {
  root.innerHTML = posts.length ? `<ul class="home-board-list">${posts.map((post) => `<li><a href="?post=${encodeURIComponent(post.id)}#board" data-home-board-post="${escapeHtml(post.id)}" aria-label="${escapeHtml(post.title)}"><span class="community-chip">${escapeHtml(BOARD_CATEGORIES[post.category] || "기타")}</span><strong title="${escapeHtml(post.title)}">${escapeHtml(compactHomeTitle(post.title))}</strong><small>${escapeHtml(post.author || "방문자")} · 댓글 ${Number(post.comment_count || 0).toLocaleString("ko-KR")} · ${formatDate(post.updated_at || post.created_at)}</small></a></li>`).join("")}</ul>` : '<div class="community-empty-inline">아직 게시글이 없습니다. 첫 글을 남겨보세요.</div>';
  root.querySelectorAll("[data-home-board-post]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); window.history.pushState({}, "", link.getAttribute("href")); window.dispatchEvent(new PopStateEvent("popstate")); window.dispatchEvent(new CustomEvent("lounge:navigate", { detail: { view: "board" } })); }));
}

async function renderHomeBoardPreview(root) {
  if (!root) return;
  try {
    if (!homeBoardPreviewPosts) {
      homeBoardPreviewPromise ||= boardRequest("/board/posts?page=1&pageSize=6&category=all&sort=latest&q=")
        .then((data) => Array.isArray(data.posts) ? data.posts : [])
        .then((posts) => { homeBoardPreviewPosts = posts; return posts; })
        .finally(() => { homeBoardPreviewPromise = null; });
      await homeBoardPreviewPromise;
    }
    paintHomeBoardPreview(root, homeBoardPreviewPosts || []);
  } catch (error) { root.innerHTML = `<div class="community-error-state" role="alert"><strong>게시판을 불러오지 못했습니다.</strong><p>${escapeHtml(error.message)}</p><button class="secondary-button" type="button" data-home-board-retry>다시 시도</button></div>`; root.querySelector("[data-home-board-retry]")?.addEventListener("click", () => { invalidateHomeBoardPreview(); void renderHomeBoardPreview(root); }); }
}

export function mountCommunity() {
  const mountedViews = new Set();
  let boardController = null;
  let catalogAdminState = isCatalogAdmin();
  const catalogViews = new Set(["prompts", "newsletter", "memes"]);
  const communityViews = new Set(["prompts", "newsletter", "videos", "memes", "board", "games"]);

  const bindHomePreview = () => { void renderHomeBoardPreview(document.querySelector("[data-home-board-preview]")); };
  const renderCatalogView = (view) => {
    const panel = document.querySelector(`[data-community-view="${view}"]`);
    if (!panel) return;
    if (view === "prompts") renderPromptPanel(panel);
    if (view === "newsletter") renderNewsletterPanel(panel);
    if (view === "memes") renderMemePanel(panel);
  };
  const mountView = (view) => {
    if (view === "home") { bindHomePreview(); return; }
    if (!communityViews.has(view) || mountedViews.has(view)) return;
    const panel = document.querySelector(`[data-community-view="${view}"]`);
    if (!panel) return;
    if (catalogViews.has(view)) renderCatalogView(view);
    if (view === "videos") { renderVideoPanel(panel); panel.dataset.ready = "true"; }
    if (view === "games") { renderGamePanel(panel); panel.dataset.ready = "true"; }
    if (view === "board") renderBoard(panel, (controller) => { boardController = controller; });
    mountedViews.add(view);
  };
  const refreshMountedCatalog = () => {
    mountedViews.forEach((view) => { if (catalogViews.has(view)) renderCatalogView(view); });
  };
  const clearInactivePlayers = (view) => {
    if (view !== "videos") {
      const player = document.querySelector("[data-video-player]");
      if (player?.querySelector("iframe")) player.innerHTML = '<div class="video-player-placeholder"><strong>재생할 영상을 선택해 주세요.</strong><p>자동 재생하지 않으며, 선택한 영상 하나만 표시합니다.</p></div>';
    }
    if (view !== "games") {
      const player = document.querySelector("[data-game-player]");
      if (player?.querySelector("iframe")) { player.hidden = true; player.innerHTML = ""; }
    }
  };

  const initialRoute = window.location.hash.slice(1) || document.documentElement.dataset.loungeRoute || "home";
  mountView(initialRoute);
  window.addEventListener("lounge:viewchange", (event) => {
    const view = event.detail?.view || document.documentElement.dataset.loungeRoute || "home";
    mountView(view);
    clearInactivePlayers(view);
    if (view === "home") bindHomePreview();
  });
  window.addEventListener("lounge:catalogchange", () => {
    refreshMountedCatalog();
    if (document.documentElement.dataset.loungeRoute === "home") window.dispatchEvent(new CustomEvent("lounge:authchange"));
  });
  window.addEventListener("lounge:authchange", () => {
    const nextCatalogAdminState = isCatalogAdmin();
    if (nextCatalogAdminState !== catalogAdminState) {
      catalogAdminState = nextCatalogAdminState;
      refreshMountedCatalog();
    }
    if (document.documentElement.dataset.loungeRoute === "home") bindHomePreview();
  });
  window.LoungeCommunity = Object.freeze({ openWrite: () => boardController?.openWrite?.(), refreshBoard: () => boardController?.renderRoute?.(), refreshHomePreview: bindHomePreview, clearBoardQuery: () => boardController?.clearQuery?.() });
}
