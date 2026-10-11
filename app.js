import { renderLookbook } from "./lookbook.js?v=20261011-original";
import { CLASSROOM, CURRICULUM, MATERIALS, PROMPTS, VIDEOS } from "./data.js";

const API = window.location.port === "8787"
  ? "http://127.0.0.1:8787"
  : "https://reportmode-request-board.report-request-board.workers.dev";
const CATEGORIES = { report_opinion: "리포트 의견", ai_question: "AI 질문", knowledge_share: "정보 공유", free_opinion: "자유 의견" };
const ERRORS = {
  title_too_short: "제목을 4글자 이상 입력해 주세요.",
  content_too_short: "내용을 10글자 이상 입력해 주세요.",
  comment_too_short: "댓글을 2글자 이상 입력해 주세요.",
  invalid_category: "분류를 선택해 주세요.",
  login_required: "로그인이 필요합니다.",
  invalid_google_token: "로그인 시간이 만료되었습니다. 다시 로그인해 주세요.",
  unverified_google_account: "확인된 Google 계정으로 로그인해 주세요.",
  google_login_not_configured: "Google 로그인 설정이 아직 완료되지 않았습니다.",
  not_owner: "본인이 쓴 글이나 댓글만 바꿀 수 있습니다.",
  admin_required: "관리자 권한이 필요합니다.",
  not_found: "글을 찾지 못했습니다. 삭제되었을 수 있습니다.",
  invalid_visitor: "방문자 정보를 확인할 수 없습니다.",
};
const READINGS = {
  prompts: { title: "프롬프트", items: PROMPTS, tag: (item) => item.category, extra: () => "" },
  newsletter: { title: "뉴스레터", items: [], loaded: false, failed: false, tag: (item) => (item.edition === "economy" ? "경제·시사" : "AI·에이전트"), extra: (item) => item.date }, // newsletter.json(키라쨩 카드뉴스)에서 불러옵니다.
  videos: { title: "영상", items: VIDEOS, tag: (item) => item.category, extra: (item) => item.duration || "" },
};
const PROMO = '<section class="promo" aria-label="수업 안내"><div class="promo-copy"><p class="promo-kicker">AI BUILDERS LAB 수업</p>'
  + '<h2>수업을 들으면 누구나<br>쇼츠·롱폼 유튜버가 될 수 있어요</h2>'
  + '<p class="promo-sub">AI와 함께라면 첫 영상도 어렵지 않아요. 수업에서 함께 시작해요.</p>'
  + '<p class="promo-actions"><a class="btn" href="https://open.kakao.com/me/aibuilderslab" target="_blank" rel="noopener noreferrer">교육문의 ↗</a><a class="btn-line" href="#curriculum">커리큘럼 보기</a></p></div>'
  + '<img src="assets/promo-youtuber-v2.webp" width="720" height="720" alt="노트북과 촬영 장비로 쇼츠와 롱폼 영상을 만드는 키라 캐릭터"></section>';

const POLICIES = ["guidelines", "privacy", "terms"];
const CALENDAR_EMBED = "https://calendar.google.com/calendar/embed?src=aibuilderslab.kr%40gmail.com&src=ko.south_korea%23holiday%40group.v.calendar.google.com&color=%23039BE5&color=%23D50000&ctz=Asia%2FSeoul&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0&hl=ko&wkst=2";
const CALENDAR_SUBSCRIBE = "https://calendar.google.com/calendar/r?cid=aibuilderslab.kr@gmail.com";

const main = document.querySelector("#main");
const loginDialog = document.querySelector("[data-login-dialog]");
const consent = loginDialog.querySelector("[data-consent]");
const googleBox = loginDialog.querySelector("[data-google-button]");
const loginStatus = loginDialog.querySelector("[data-login-status]");
const auth = { credential: "", user: null, config: null, timer: 0 };
let renderId = 0;
let lastHref = "";
let googlePromise = null;
let calendarEvents = null; // null: 불러오는 중, "error": 실패, 배열: 일정
let barCache = "";
let calendarView = "week";
let calendarOffset = 0;
let calendarCoverage = null;

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
const enc = encodeURIComponent;
const kst = (date) => date.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }); // "YYYY-MM-DD HH:MM:SS"
const validDate = (value) => { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date : null; };
const fullDate = (value) => { const date = validDate(value); return date ? kst(date).slice(0, 16) : ""; };
const adminMark = (item) => (Number(item.is_admin) === 1 ? '<span class="admin">관리자</span>' : "");
const setTitle = (text) => { document.title = text ? text + " | Builders Lounge" : "Builders Lounge | AI Builders Lab"; };
const announce = (message) => { document.querySelector("[data-live]").textContent = message; };

function shortDate(value) {
  const date = validDate(value);
  if (!date) return "";
  const text = kst(date);
  const now = kst(new Date());
  if (text.slice(0, 10) === now.slice(0, 10)) return text.slice(11, 16);
  return text.slice(0, 4) === now.slice(0, 4) ? text.slice(5, 10) : text.slice(2, 10);
}

function visitorId() {
  try {
    const key = "builders-lounge:visitor-id";
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const next = crypto.randomUUID?.() || "visitor-" + Date.now();
    localStorage.setItem(key, next);
    return next;
  } catch { return "preview-" + Date.now(); }
}

function reportMailto(label, id, title = "") {
  const body = ["대상: " + label, "항목 번호: " + id, title ? "제목: " + title : "", "주소: " + window.location.href, "", "신고 사유:"].filter((line, index) => line || index > 3).join("\n");
  return "mailto:hello@ai-hub-os.com?subject=" + enc("[Builders Lounge] " + label + " 신고") + "&body=" + enc(body);
}

async function api(path, options = {}) {
  const headers = {};
  if (options.body) headers["Content-Type"] = "application/json";
  if (auth.credential) headers.Authorization = "Bearer " + auth.credential;
  let response;
  try {
    response = await fetch(API + path, { cache: "no-store", ...options, headers });
  } catch {
    throw new Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && auth.credential) logout("로그인 시간이 만료되었습니다. 다시 로그인해 주세요.");
    throw new Error(ERRORS[body?.error] || "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return body;
}

/* ---------- 로그인 ---------- */

function renderAccount() {
  document.querySelectorAll(".workspace-actions [data-login]").forEach(button => { button.hidden = !!auth.user; });
  document.querySelector("[data-account]").innerHTML = auth.user
    ? '<p><strong>' + esc(auth.user.name || "빌더") + '</strong>님</p><div class="account-actions"><a class="btn" href="#write">글쓰기</a><button class="btn-line" type="button" data-logout>로그아웃</button></div>'
    : '<button class="btn" type="button" data-login>🔑 가입·로그인</button>';
}


function logout(message = "로그아웃했습니다.") {
  clearTimeout(auth.timer);
  auth.credential = "";
  auth.user = null;
  try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch { /* 로그인 모듈이 없어도 로그아웃합니다. */ }
  renderAccount();
  announce(message);
  if (route().name !== "write") render(true); // 쓰던 글이 지워지지 않게 글쓰기 화면은 그대로 둡니다.
}

function tokenExpiry(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return Number(JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "="))).exp || 0) * 1000;
  } catch { return 0; }
}

function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  googlePromise ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("Google 로그인 모듈을 확인하지 못했습니다.")));
    script.onerror = () => { googlePromise = null; reject(new Error("Google 로그인 모듈을 불러오지 못했습니다.")); };
    document.head.append(script);
  });
  return googlePromise;
}

function openLogin() {
  consent.checked = false;
  googleBox.replaceChildren();
  loginStatus.textContent = "";
  loginDialog.showModal();
}

consent.addEventListener("change", async () => {
  googleBox.replaceChildren();
  loginStatus.textContent = "";
  if (!consent.checked) return;
  try {
    auth.config ||= await api("/lounge/config");
    if (!auth.config.googleClientId) throw new Error(ERRORS.google_login_not_configured);
    const google = await loadGoogle();
    google.initialize({ client_id: auth.config.googleClientId, callback: (response) => acceptCredential(response?.credential), auto_select: false, cancel_on_tap_outside: false });
    if (consent.checked) google.renderButton(googleBox, { theme: "outline", size: "large", text: "signin_with", locale: "ko", width: 260 });
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

async function acceptCredential(credential) {
  if (!consent.checked || !credential) return;
  auth.credential = String(credential);
  try {
    const data = await api("/lounge/me");
    auth.user = data.user || { name: "빌더" };
    clearTimeout(auth.timer);
    const expiry = tokenExpiry(auth.credential);
    if (expiry) auth.timer = setTimeout(() => logout("로그인 시간이 만료되었습니다. 다시 로그인해 주세요."), Math.max(1000, expiry - Date.now() - 5000));
    loginDialog.close();
    renderAccount();
    announce((auth.user.name || "빌더") + "님, 로그인되었습니다.");
    render(true);
  } catch (error) {
    auth.credential = "";
    auth.user = null;
    loginStatus.textContent = error.message;
  }
}

/* ---------- 화면 전환 ---------- */

function route() {
  const [name = "", id = ""] = window.location.hash.slice(1).split("/");
  try { return { name: name || (location.search ? "board" : "home"), id: decodeURIComponent(id) }; } catch { return { name, id: "" }; }
}

function go(url) {
  window.history.pushState(null, "", url);
  render();
}

function render(force = false) {
  if (!force && window.location.href === lastHref) return;
  const moved = window.location.href !== lastHref;
  lastHref = window.location.href;
  renderId += 1;
  document.body.classList.remove("menu-open");
  document.querySelector("[data-menu]").setAttribute("aria-expanded", "false");
  const { name, id } = route();
  document.querySelector('.more-nav')?.removeAttribute('open');
  document.querySelector('.global-search input').value = new URLSearchParams(location.search).get('q') || '';
  const section = name === "write" ? "board" : name;
  const names = {home:'AI 활용 홈',library:'전체 자료 검색',prompts:'업무 프롬프트',materials:'교육자료',lectures:'슬라이드 갤러리',lookbook:'브랜드 룩북',motion:'모션 스타일',videos:'영상',board:'자유게시판',calendar:'모임 일정',curriculum:'AI 강의',newsletter:'뉴스레터',terms:'이용약관',privacy:'개인정보 처리 안내',guidelines:'운영정책'};
  document.querySelector('[data-page-label]').textContent = names[section] || '라운지';
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === section) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (moved) {
    window.scrollTo(0, 0);
    if (window.innerWidth <= 900 && document.activeElement?.closest("#side")) main.focus();
  }
  if (name === "lookbook") { setTitle("브랜드 룩북"); return renderLookbook(main, id); }
  if (name === "motion") return renderDesignDirectory(name);
  if (name === "home") return renderLibraryHome();
  if (["library", "materials", "lectures"].includes(name)) return id ? renderResource(id) : renderLibrary(name);
  if (["prompts", "videos"].includes(name) && !id) return renderLibrary(name);
  if (name === "board") return renderBoard();
  if (name === "write") return renderWrite();
  if (name === "calendar") return renderCalendar();
  if (name === "curriculum") return renderCurriculum();
  if (READINGS[name]) return id ? renderReading(name, id) : renderReadingList(name);
  if (POLICIES.includes(name)) return renderPolicy(name);
  window.history.replaceState(null, "", window.location.pathname + "#board"); // 없어진 메뉴 주소는 자유게시판으로 보냅니다.
  lastHref = window.location.href;
  return renderBoard();
}

/* ---------- 자유게시판 ---------- */

function boardHref({ page = 1, category = "all", q = "" } = {}) {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return window.location.pathname + (query ? "?" + query : "") + "#board";
}

function postRow(post) {
  const comments = Number(post.comment_count || 0);
  return '<a class="row" href="?post=' + enc(post.id) + '#board">'
    + '<span class="c-cat">' + esc(CATEGORIES[post.category] || "기타") + "</span>"
    + '<span class="c-title">' + esc(post.title) + (comments ? '<b class="cmt">[' + comments + "]</b>" : "") + (post.origin === "shorts" ? '<em class="badge">영상</em>' : "") + "</span>"
    + '<span class="c-author">' + esc(post.author || "방문자") + "</span>"
    + '<span class="c-views">' + Number(post.view_count || 0).toLocaleString("ko-KR") + "</span>"
    + '<time class="c-date" datetime="' + esc(post.created_at || "") + '">' + shortDate(post.created_at) + "</time></a>";
}

function pager(page, total, category, q) {
  if (total <= 1) return "";
  const start = Math.floor((page - 1) / 10) * 10 + 1;
  const end = Math.min(total, start + 9);
  const link = (target, label, current = false) => '<a href="' + boardHref({ page: target, category, q }) + '"' + (current ? ' aria-current="page"' : "") + ">" + label + "</a>";
  let html = start > 1 ? link(start - 1, "이전") : "";
  for (let target = start; target <= end; target += 1) html += link(target, target, target === page);
  return html + (end < total ? link(end + 1, "다음") : "");
}

async function renderBoard() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("post")) return renderPost(params.get("post"));
  const ticket = renderId;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const category = CATEGORIES[params.get("category")] ? params.get("category") : "all";
  const q = (params.get("q") || "").trim().slice(0, 120);

  setTitle(q ? "‘" + q + "’ 검색" : "");
  const tabs = [["all", "전체"], ...Object.entries(CATEGORIES)]
    .map(([key, label]) => '<a href="' + boardHref({ category: key, q }) + '"' + (key === category ? ' aria-current="true"' : "") + ">" + label + "</a>").join("");
  main.innerHTML = '<div class="head"><h1>자유게시판</h1><a class="btn" href="#write">글쓰기</a></div>'
    + '<form class="library-search board-search" data-search role="search"><input name="q" value="' + esc(q) + '" aria-label="게시판 검색" placeholder="게시판 검색"><button class="btn">검색</button></form>'
    + '<nav class="tabs" aria-label="분류">' + tabs + "</nav>"
    + (q ? '<p class="search-note">‘' + esc(q) + '’ 검색 결과 · <a href="' + boardHref({ category }) + '">검색 지우기</a></p>' : "")
    + '<div class="list" data-list><p class="empty">불러오는 중입니다.</p></div><nav class="pager" aria-label="페이지" data-pager></nav>';
  try {
    const data = await api("/board/posts?" + new URLSearchParams({ page, pageSize: 20, category, sort: "latest", q }));
    if (ticket !== renderId) return;
    const posts = Array.isArray(data.posts) ? data.posts : [];
    main.querySelector("[data-list]").innerHTML = posts.length
      ? '<div class="row row-head" aria-hidden="true"><span>분류</span><span>제목</span><span>글쓴이</span><span>조회</span><span>날짜</span></div>' + posts.map(postRow).join("")
      : '<p class="empty">' + (q ? "검색 결과가 없습니다." : "아직 글이 없습니다. 첫 글을 남겨 주세요.") + "</p>";
    main.querySelector("[data-pager]").innerHTML = pager(page, Math.max(1, Number(data.pagination?.totalPages) || 1), category, q);
  } catch (error) {
    if (ticket === renderId) main.querySelector("[data-list]").innerHTML = '<p class="empty">' + esc(error.message) + "</p>";
  }
}

async function renderPost(id) {
  const ticket = renderId;
  main.innerHTML = '<p class="empty">불러오는 중입니다.</p>';
  let post;
  try {
    post = (await api("/board/posts/" + enc(id))).post;
  } catch (error) {
    if (ticket === renderId) main.innerHTML = '<p class="empty">' + esc(error.message) + '</p><p class="center"><a class="btn-line" href="#board">목록으로</a></p>';
    return;
  }
  if (ticket !== renderId || !post) return;
  setTitle(post.title);
  api("/board/posts/" + enc(post.id) + "/views", { method: "POST", body: JSON.stringify({ visitorId: visitorId() }) }).catch(() => {});
  const media = /^https:\/\//.test(post.mediaUrl || "") && ["video/mp4", "video/webm"].includes(post.mediaType) ? post.mediaUrl : "";
  main.innerHTML = '<article class="post" data-post-id="' + esc(post.id) + '">'
    + '<header class="post-head"><span class="cat">' + esc(CATEGORIES[post.category] || "기타") + "</span><h1>" + esc(post.title) + "</h1>"
    + '<div class="meta"><strong>' + esc(post.author || "방문자") + "</strong>" + adminMark(post) + "<span>" + fullDate(post.created_at) + "</span><span>조회 " + Number(post.view_count || 0).toLocaleString("ko-KR") + "</span></div></header>"
    + (media ? '<video class="media" controls playsinline preload="metadata" src="' + esc(media) + '" aria-label="' + esc(post.title) + ' 영상"></video>' : "")
    + '<div class="post-body">' + esc(post.content) + "</div>"
    + '<div class="post-actions"><a class="btn-line" href="#board">목록</a><button class="btn-line" type="button" data-copy-link>링크 복사</button><span class="spacer"></span>'
    + (post.can_edit ? '<a class="link" href="?post=' + enc(post.id) + '#write">수정</a><button class="link" type="button" data-delete-post>삭제</button>' : "")
    + '<a class="link" href="' + esc(reportMailto("게시글", post.id, post.title)) + '">신고</a></div></article>'
    + '<section class="comments" aria-labelledby="comments-title"><h2 id="comments-title">댓글 <span data-comment-count></span></h2><div data-comments><p class="empty small">댓글을 불러오는 중입니다.</p></div>'
    + (auth.user
      ? '<form class="comment-form" data-comment-form><textarea class="field" name="content" maxlength="2000" rows="3" required placeholder="댓글을 입력해 주세요" aria-label="댓글"></textarea><p class="status" data-status role="status"></p><button class="btn">댓글 등록</button></form>'
      : '<p class="login-hint"><button class="link" type="button" data-login>로그인</button>하면 댓글을 쓸 수 있습니다.</p>')
    + "</section>";
  loadComments(post.id, ticket);
}

function commentHtml(comment) {
  return '<div class="comment" data-comment-id="' + esc(comment.id) + '"><div class="comment-head"><strong>' + esc(comment.author || "방문자") + "</strong>" + adminMark(comment)
    + "<time>" + fullDate(comment.updated_at || comment.created_at) + '</time><span class="comment-actions">'
    + (comment.can_edit ? '<button class="link" type="button" data-edit-comment>수정</button><button class="link" type="button" data-delete-comment>삭제</button>' : "")
    + '<a class="link" href="' + esc(reportMailto("댓글", comment.id)) + '">신고</a></span></div><p data-comment-body>' + esc(comment.content) + "</p></div>";
}

async function loadComments(postId, ticket = renderId) {
  const box = main.querySelector("[data-comments]");
  try {
    const comments = (await api("/board/posts/" + enc(postId) + "/comments")).comments || [];
    if (ticket !== renderId) return;
    main.querySelector("[data-comment-count]").textContent = comments.length;
    box.innerHTML = comments.length ? comments.map(commentHtml).join("") : '<p class="empty small">아직 댓글이 없습니다.</p>';
  } catch (error) {
    if (ticket === renderId) box.innerHTML = '<p class="empty small">' + esc(error.message) + "</p>";
  }
}

async function renderWrite() {
  const ticket = renderId;
  setTitle("글쓰기");
  if (!auth.user) {
    main.innerHTML = '<div class="notice"><p>글을 쓰려면 로그인해 주세요.</p><button class="btn" type="button" data-login>로그인</button> <a class="btn-line" href="#board">목록으로</a></div>';
    return;
  }
  const editId = new URLSearchParams(window.location.search).get("post") || "";
  let post = null;
  if (editId) {
    main.innerHTML = '<p class="empty">불러오는 중입니다.</p>';
    try { post = (await api("/board/posts/" + enc(editId))).post; } catch (error) {
      if (ticket === renderId) main.innerHTML = '<p class="empty">' + esc(error.message) + "</p>";
      return;
    }
    if (ticket !== renderId) return;
    if (!post?.can_edit) { main.innerHTML = '<p class="empty">본인이 쓴 글만 수정할 수 있습니다.</p>'; return; }
  }
  const selected = post?.category || "free_opinion";
  const options = Object.entries(CATEGORIES).map(([key, label]) => '<option value="' + key + '"' + (key === selected ? " selected" : "") + ">" + label + "</option>").join("");
  main.innerHTML = '<form class="write" data-write-form data-id="' + esc(editId) + '"><h1>' + (post ? "글 수정" : "글쓰기") + "</h1>"
    + '<label>분류<select class="field" name="category"' + (post?.origin === "shorts" ? " disabled" : "") + ">" + options + "</select></label>"
    + '<label>제목<input class="field" name="title" maxlength="100" required value="' + esc(post?.title || "") + '"></label>'
    + '<label>내용<textarea class="field" name="content" maxlength="5000" rows="14" required>' + esc(post?.content || "") + "</textarea></label>"
    + '<p class="hint">제목은 4글자, 내용은 10글자 이상 써 주세요. 일반 텍스트만 쓸 수 있습니다.</p><p class="status" data-status role="status"></p>'
    + '<div class="form-actions"><a class="btn-line" href="' + (editId ? "?post=" + enc(editId) + "#board" : "#board") + '">취소</a><button class="btn">' + (post ? "수정" : "등록") + "</button></div></form>";
}

/* ---------- 읽을거리 ---------- */

function renderReadingList(name) {
  const reading = READINGS[name];
  if (reading.loaded === false) { main.innerHTML = '<p class="empty">불러오는 중입니다.</p>'; return; }
  if (reading.failed) { main.innerHTML = '<p class="empty">' + reading.title + ' 목록을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>'; return; }

  setTitle(reading.title);
  main.innerHTML = '<div class="head"><h1>' + reading.title + '</h1><span class="count">' + reading.items.length + "개</span></div>"
    + '<div class="list">' + (reading.items.map((item) => '<a class="row row-reading" href="#' + name + "/" + enc(item.id) + '"><span class="c-cat">' + esc(reading.tag(item)) + '</span><span class="c-title">' + esc(item.title)
      + '</span><span class="c-author">' + esc(item.author || "") + '</span><span class="c-date">' + esc(reading.extra(item)) + "</span></a>").join("") || '<p class="empty">아직 등록된 글이 없습니다.</p>') + "</div>";
}

function renderReading(name, id) {
  const reading = READINGS[name];
  if (reading.loaded === false) { main.innerHTML = '<p class="empty">불러오는 중입니다.</p>'; return; }
  if (reading.failed) { main.innerHTML = '<p class="empty">' + reading.title + ' 목록을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>'; return; }

  const item = reading.items.find((candidate) => candidate.id === id);
  if (!item) {
    window.history.replaceState(null, "", window.location.pathname + "#" + name);
    lastHref = window.location.href;
    return renderReadingList(name);
  }
  setTitle(item.title);
  let body = "";
  if (name === "prompts") {
    body = (item.useCase ? "<h2>이럴 때 쓰세요</h2><p>" + esc(item.useCase) + "</p>" : "")
      + (item.expected ? "<h2>기대 결과</h2><p>" + esc(item.expected) + "</p>" : "")
      + '<h2>프롬프트</h2><pre class="prompt" tabindex="0">' + esc(item.copyText) + '</pre><button class="btn" type="button" data-copy-prompt="' + esc(item.id) + '">프롬프트 복사</button>';
  } else if (name === "newsletter") {
    body = (item.cards || []).map((src, index) => '<img class="card-img" src="' + esc(src) + '" alt="' + esc(item.title) + " " + (index + 1) + '번째 카드" loading="lazy">').join("") || '<p class="hint">카드 이미지가 아직 없습니다. 아래 원문에서 확인해 주세요.</p>';

  } else {
    body = '<div class="player"><button class="btn" type="button" data-play="' + esc(item.videoId) + '">▶ 영상 재생</button></div>';
  }
  const extra = reading.extra(item);
  main.innerHTML = '<article class="post"><header class="post-head"><span class="cat">' + esc(reading.tag(item)) + "</span><h1>" + esc(item.title) + "</h1>"
    + '<div class="meta"><strong>' + esc(item.author || "") + "</strong>" + (extra ? "<span>" + esc(extra) + "</span>" : "") + "</div></header>"
    + '<div class="post-text"><p class="lead">' + esc(item.summary) + "</p>" + body + "</div>"
    + '<div class="post-actions"><a class="btn-line" href="#' + name + '">목록</a>'
    + (/^https:\/\//.test(item.sourceUrl || "") ? '<a class="link" href="' + esc(item.sourceUrl) + '" target="_blank" rel="noopener">' + esc(item.sourceLabel || "출처") + " ↗</a>" : "") + "</div></article>";
}

function renderPolicy(name) {
  const template = document.getElementById("policy-" + name);
  setTitle(template.dataset.title);
  main.replaceChildren(template.content.cloneNode(true));
}

/* ---------- 시계와 일정 (innox 상단 바 참고) ---------- */

function upcomingEvents(count) {
  if (!Array.isArray(calendarEvents)) return [];
  const now = Date.now();
  return calendarEvents.filter((event) => new Date(event.end || event.start).getTime() > now).slice(0, count);
}

function eventWhen(event) {
  const start = new Date(event.start);
  const now = new Date();
  const days = Math.round((Date.parse(kst(start).slice(0, 10)) - Date.parse(kst(now).slice(0, 10))) / 86400000);
  const badge = start <= now ? "진행 중" : days === 0 ? "오늘" : days === 1 ? "내일" : "D-" + days;
  const date = start.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" });
  const end = validDate(event.end);
  return { badge, text: date + " " + (event.allDay ? "종일" : kst(start).slice(11, 16) + (end ? "–" + (kst(end).slice(0, 10) !== kst(start).slice(0, 10) ? kst(end).slice(5, 10) + " " : "") + kst(end).slice(11, 16) : "")) };
}

function eventSummary(event) {
  const when = eventWhen(event);
  return '<span class="ev-when"><b>' + when.badge + "</b> " + esc(when.text) + '</span><span class="ev-title">' + esc(event.title) + (event.location ? " · " + esc(event.location) : "") + "</span>";
}

function tickBar() {
  if (!document.querySelector("[data-clock]")) return;
  const now = new Date();
  document.querySelector("[data-clock]").textContent = now.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const next = upcomingEvents(1)[0];
  const slot = calendarEvents === null ? '<span class="ev-title">일정을 불러오는 중</span>'
    : calendarEvents === "error" ? '<span class="ev-title">일정을 불러오지 못했습니다</span>'
    : next ? eventSummary(next) : '<span class="ev-title">예정된 일정 없음</span>';
  const today = now.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" });
  if (today + slot === barCache) return; // 바뀐 게 있을 때만 다시 그립니다.
  barCache = today + slot;
  document.querySelector("[data-today]").textContent = today;
  document.querySelector("[data-ev] .ev-body").innerHTML = slot;
}


function renderCalendar() {
  setTitle("일정");
  const events = upcomingEvents(10);
  const list = calendarEvents === null ? '<p class="empty">일정을 불러오는 중입니다.</p>'
    : calendarEvents === "error" ? '<p class="empty">일정 목록을 불러오지 못했습니다. 아래 달력에서 확인해 주세요.</p>'
    : events.length ? events.map((event) => {
      const when = eventWhen(event);
      return '<div class="row row-calendar"><span class="c-date"><b class="cmt">' + when.badge + "</b> " + esc(when.text) + '</span><span class="c-title">' + esc(event.title) + '</span><span class="c-author">' + esc(event.location || "") + "</span></div>";
    }).join("")
    : '<p class="empty">예정된 일정이 없습니다.</p>';
  const mode = window.matchMedia("(max-width: 767px)").matches ? "AGENDA" : "MONTH";
  main.innerHTML = '<div class="head"><h1>일정</h1><a class="btn-line" href="' + CALENDAR_SUBSCRIBE + '" target="_blank" rel="noopener">내 구글 캘린더에 추가 ↗</a></div>'
    + '<div class="list">' + list + "</div>"
    + '<p class="hint calendar-hint">구글 캘린더에서 바꾼 일정은 위 목록과 상단 바에 반영되기까지 최대 1시간쯤 걸립니다. 아래 달력은 바로 반영됩니다.</p>'
    + '<iframe class="calendar-frame" src="' + esc(CALENDAR_EMBED + "&mode=" + mode) + '" title="AI Builders Lab 구글 캘린더" loading="lazy"></iframe>';
}


/* ---------- 교육자료·최근 글 ---------- */

function renderMaterials() {
  setTitle("교육자료");
  const rows = MATERIALS.filter((item) => /^https:\/\//.test(item.url || "")).map((item) => '<a class="row row-reading" href="' + esc(item.url) + '" target="_blank" rel="noopener"><span class="c-cat">' + esc(item.category || "교재")
    + '</span><span class="c-title">' + esc(item.title) + ' ↗</span><span class="c-author">' + esc(item.author || "") + '</span><span class="c-date">' + esc(item.updatedAt || "") + "</span></a>").join("");
  main.innerHTML = '<div class="head"><h1>교육자료</h1><span class="count">' + (rows ? MATERIALS.length + "개" : "") + "</span></div>"
    + '<div class="list">' + (rows || '<p class="empty">교육자료를 준비 중입니다.</p>') + "</div>";
}

function renderCurriculum() {
  setTitle("교육 커리큘럼");
  const c = CURRICULUM;
  const contact = '<a class="btn" href="' + esc(c.contact) + '" target="_blank" rel="noopener noreferrer">과정 상담하기 ↗</a>';
  main.innerHTML = '<div class="head"><h1>AI 강의</h1>' + contact + "</div>"
    + '<p class="course-info">' + c.info.map(esc).join(" · ") + "</p>"
    + '<section class="course-block"><h2><span class="cat">' + esc(c.setup.tag) + "</span>" + esc(c.setup.title) + "</h2>"
    + "<p>" + esc(c.setup.summary) + '</p><p class="hint">' + esc(c.setup.scope) + '</p><p class="hint">' + esc(c.setup.exclude) + "</p>"
    + '<ol class="course-steps">' + c.setup.steps.map((step) => "<li><strong>" + esc(step.title) + "</strong><span>" + esc(step.meta) + "</span><p>" + esc(step.body) + "</p></li>").join("") + "</ol></section>"
    + '<section class="course-block"><h2><span class="cat">READY? LET’S MAKE SOMETHING.</span>제작 과정</h2>'
    + '<p class="hint">Hermes와 LLM Wiki가 설치되어 있어야 진행할 수 있습니다. 만들고 싶은 결과물 하나를 선택하세요.</p>'
    + '<div class="list"><div class="row row-course row-head" aria-hidden="true"><span>과정</span><span>내용</span><span>남는 결과</span></div>'
    + c.courses.map((course) => '<div class="row row-course"><span class="c-cat">' + esc(course.no) + "<br>" + esc(course.tool) + '</span><span class="c-title">' + esc(course.title) + "<small>" + esc(course.summary) + '</small></span><span class="c-author">' + esc(course.result) + "</span></div>").join("")
    + '</div><p class="hint course-note">' + esc(c.note) + '</p><p class="actions">' + contact + '<a class="btn-line" href="https://builderslab.ai-hub-os.com/#courses" target="_blank" rel="noopener">Builders Lab 과정 안내 원문 ↗</a></p></section>'
    + '<section class="course-block"><h2><span class="cat">배움터</span>혼자 따라 하는 6개 과정</h2>'
    + '<p class="hint">현장 수업과 별개로, 순서대로 열어 볼 수 있는 실습 교실입니다.</p><div class="list">'
    + CLASSROOM.map((item) => '<a class="row row-reading" href="' + esc(item.url) + '" target="_blank" rel="noopener"><span class="c-cat">' + esc(item.no) + '</span><span class="c-title">' + esc(item.title) + ' ↗</span><span class="c-author">' + esc(item.outcome) + "</span></a>").join("")
    + '</div><p class="actions"><a class="btn-line" href="https://aihubos.github.io/builderslab-curriculum/" target="_blank" rel="noopener">배움터 전체 보기 ↗</a></p></section>';
}


async function loadRecent() {
  const box = document.querySelector("[data-recent]");
  if (!box) return;
  try {
    const posts = (await api("/board/posts?" + new URLSearchParams({ page: 1, pageSize: 5, category: "all", sort: "latest", q: "" }))).posts || [];
    box.innerHTML = posts.length
      ? posts.map((post) => '<a href="?post=' + enc(post.id) + '#board"><span>' + esc(post.title) + "</span><time>" + shortDate(post.created_at) + "</time></a>").join("")
      : '<p class="hint">아직 글이 없습니다.</p>';
  } catch {
    box.innerHTML = '<p class="hint">최근 글을 불러오지 못했습니다.</p>';
  }
}


/* ---------- 방문자 집계 (Report Hub와 같은 서버 /visits, 예전 라운지 기록에 이어서 씀) ---------- */

async function countVisit() {
  const site = "builders-lounge";
  const local = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname); // 미리보기는 기록하지 않고 읽기만 합니다.
  let data = null;
  try {
    if (!local && !sessionStorage.getItem("builders-lounge:counted")) {
      data = await api("/visits", { method: "POST", body: JSON.stringify({ siteId: site, visitorId: visitorId() }) });
      sessionStorage.setItem("builders-lounge:counted", "1"); // 이 탭에서는 한 번만 기록합니다.
    }
  } catch {
    /* 기록에 실패하면 아래에서 숫자만 다시 읽습니다. */
  }
  if (!data) { try { data = await api("/visits?site=" + site); } catch { /* 집계를 못 불러와도 나머지 화면은 그대로 씁니다. */ } }
  const num = (value) => Number(value || 0).toLocaleString("ko-KR");
  document.querySelectorAll("[data-visit-today]").forEach((node) => { node.textContent = data ? num(data.today) : "-"; });
  document.querySelectorAll("[data-visit-total]").forEach((node) => { node.textContent = data ? num(data.total) : "-"; });
}

/* ---------- 자료 중심 홈·검색 ---------- */
const LIBRARY_TYPES = { prompts: '업무 프롬프트', materials: '교육자료', lectures: '슬라이드 갤러리', videos: '영상' };
const RESOURCES = MATERIALS.map((item, index) => ({ ...item, id: 'material-' + index, section: /^(PDF|PPT|ZIP)$/.test(item.category) ? 'lectures' : 'materials', summary: item.category + ' · ' + (item.author || 'AI Builders Lab') }));
const LIBRARY_ITEMS = [...PROMPTS.map(item => ({ ...item, section: 'prompts' })), ...RESOURCES, ...VIDEOS.map(item => ({ ...item, section: 'videos' }))];
const resourceHref = item => '#' + item.section + '/' + enc(item.id);
const libraryAction = item => item.section === 'prompts'
  ? '<button class="btn-line" data-copy-prompt="' + esc(item.id) + '">📋 복사</button>'
  : '<a class="btn-line" href="' + resourceHref(item) + '">' + (item.section === 'videos' ? '▶ 보기' : '자료 보기 →') + '</a>';
function libraryRow(item) {
  return '<div class="library-row ' + (item.section === 'prompts' ? 'prompt-row' : '') + '"><span class="resource-kind">' + esc(item.category || LIBRARY_TYPES[item.section]) + '</span><a class="resource-title" href="' + resourceHref(item) + '"><strong>' + esc(item.title) + '</strong><small>' + esc(item.summary) + '</small></a>' + libraryAction(item) + '</div>';
}
function librarySearch(section = 'library', q = '') {
  return '<form class="library-search" data-library-search="' + section + '" role="search"><input type="search" name="q" maxlength="120" value="' + esc(q) + '" placeholder="🔍 예: 홈페이지, 이미지, 블로그" aria-label="자료 검색"><button class="btn" type="submit">찾기</button></form>';
}
function renderLibraryHome() {
  setTitle('배우고, 나누고, 성장하는 라운지');
  const categories = [['prompts','✧','바로 복사해서 쓰는 질문 틀'],['materials','▤','교재와 실습, 학습 게임'],['lectures','▥','슬라이드, PPT, 수업 파일'],['videos','▷','눈으로 보고 따라 하는 배움']];
  const panel = (title, desc, section, items) => `<section class="library-panel"><div class="panel-heading"><div><h2>${title}</h2><p>${desc}</p></div><a href="#${section}">전체 보기 →</a></div><div class="resource-stack">${items.map(libraryRow).join('')}</div></section>`;
  main.innerHTML = `<div class="library-home hub-home">
    <section class="home-intro"><p class="eyebrow">배우고, 나누고, 성장한다.</p><h1>필요한 배움을, 바로 찾아보세요.</h1><p>우리 모임의 프롬프트·교재·영상이 한곳에.</p><div class="keywords"><span>추천 검색</span>${['홈페이지','이미지','블로그','에이전트'].map(q=>`<a href="?q=${enc(q)}#library">${q}</a>`).join('')}</div></section>
    <section class="category-grid" aria-label="자료 분류">${categories.map(([key,icon,desc])=>`<a class="category-card" href="#${key}"><div class="category-top"><span class="category-icon" aria-hidden="true">${icon}</span><span class="card-arrow">↗</span></div><div class="category-summary"><h2>${LIBRARY_TYPES[key]}</h2><strong>${LIBRARY_ITEMS.filter(i=>i.section===key).length}<small>개</small></strong></div><p>${desc}</p></a>`).join('')}</section>
    <div class="home-workspace"><div class="home-library"><div class="library-columns">${panel('자주 쓰는 프롬프트','좋은 질문 하나로 시작하세요.','prompts',LIBRARY_ITEMS.filter(i=>i.section==='prompts').slice(0,4))}${panel('수업 자료 바로가기','수업이 끝난 뒤에도, 혼자 다시 해볼 수 있게.','lectures',[RESOURCES[4],RESOURCES[1],RESOURCES[5],RESOURCES[2]])}</div>
    <section class="library-panel"><div class="panel-heading"><div><h2>보고 따라 하는 영상</h2><p>도구의 첫 실행부터, 직접 만드는 과정까지.</p></div><a href="#videos">전체 보기 →</a></div><div class="video-grid">${VIDEOS.slice(0,4).map(item=>`<a class="video-card" href="#videos/${enc(item.id)}"><div class="video-thumbnail"><img src="https://i.ytimg.com/vi/${esc(item.videoId)}/hqdefault.jpg" alt="" loading="lazy"><span>▶</span><em>${esc(item.duration)}</em></div><div><small>${esc(item.category)}</small><strong>${esc(item.title)}</strong></div></a>`).join('')}</div></section></div>
    <aside class="home-rail" aria-label="시작 안내와 모임"><section class="library-panel start-panel"><span class="rail-kicker">START HERE</span><h2>처음 오셨나요?</h2><p>가장 작은 시작부터 함께해요.</p><a class="start-step" href="#prompts/prompt-stic"><b>01</b><span><strong>AI에게 질문해 보기</strong><small>STIC 템플릿을 복사해 보세요</small></span><em>→</em></a><a class="start-step" href="#materials"><b>02</b><span><strong>교재로 직접 만들어 보기</strong><small>실습 자료를 열고 따라 해보세요</small></span><em>→</em></a><a class="start-step" href="#board"><b>03</b><span><strong>경험과 질문 나누기</strong><small>혼자 막힌 부분을 함께 풀어요</small></span><em>→</em></a></section>
    <section class="library-panel community-panel"><h2>함께 만드는 배움</h2><p>모임 소식과 질문을<br>편한 채널에서 이어가세요.</p><a href="https://daangn.com/kr/share/community/ref/invite-group/baRr2nojJVT?utm_campaign=share_qr" target="_blank" rel="noopener noreferrer"><img src="assets/daangn-logo-204.webp" alt="">당근 모임 <span>↗</span></a><a href="https://open.kakao.com/o/grZIANIi" target="_blank" rel="noopener noreferrer"><img src="assets/kakao-openchat-icon-84.webp" alt="">카카오 단체방 <span>↗</span></a><a href="https://builderslab.ai-hub-os.com/" target="_blank" rel="noopener noreferrer">AI 빌더스 랩 소개 <span>↗</span></a></section></aside></div></div>`;
}

function renderLibrary(section) {
  const q = (new URLSearchParams(location.search).get('q') || '').slice(0, 120);
  const items = LIBRARY_ITEMS.filter(item => (section === 'library' || section === item.section) && (!q || [item.title, item.summary, item.category, item.copyText, ...(item.tags || [])].join(' ').toLocaleLowerCase().includes(q.toLocaleLowerCase())));
  const title = LIBRARY_TYPES[section] || '전체 자료 검색';
  setTitle(title);
  main.innerHTML = '<section class="library-panel library-list"><h1>' + title + '</h1>'
    + '<nav class="library-filters" aria-label="자료 분류">' + [['library', '전체'], ...Object.entries(LIBRARY_TYPES)].map(([key, label]) => '<a href="' + (q ? '?q=' + enc(q) : '') + '#' + key + '"' + (key === section ? ' aria-current="page"' : '') + '>' + label + '</a>').join('') + '</nav>'
    + '<p class="result-count">' + items.length + '개 자료' + (q ? ' · “' + esc(q) + '” 검색 결과 <a href="#' + section + '">검색 지우기</a>' : '') + '</p><div class="resource-stack">' + (items.map(libraryRow).join('') || '<p class="empty">찾는 자료가 없어요. 다른 말로 검색하거나 <a href="https://open.kakao.com/me/aibuilderslab" target="_blank" rel="noopener noreferrer">카카오로 요청해 주세요.</a></p>') + '</div></section>';
}
function renderResource(id) {
  const item = RESOURCES.find(item => item.id === id);
  if (!item) { main.innerHTML = '<section class="library-panel"><h1>자료를 찾을 수 없어요</h1><a href="#library">자료실로 돌아가기</a></section>'; return; }
  setTitle(item.title);
  main.innerHTML = '<article class="library-panel resource-detail"><a class="btn-line" href="#' + item.section + '">← 목록으로</a><p class="eyebrow">' + esc(LIBRARY_TYPES[item.section]) + '</p><h1>' + esc(item.title) + '</h1><p>' + esc(item.summary) + '</p><div class="resource-meta">🔖 형식 · ' + esc(item.category) + '<br>🏷️ 만든 곳 · ' + esc(item.author) + '</div><p><a class="btn" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' + (/\.(pdf|pptx|zip)$/.test(item.url) ? '⬇ 자료 열기·받기' : '자료 열기 ↗') + '</a></p></article>';
}

/* 한국 시간 기준: 1주·2주 일정표와 월간 달력 */
function renderMiniCalendar() {
  const box = document.querySelector('[data-mini-calendar]');
  const today = kst(new Date()).slice(0, 10);
  const anchor = new Date(today + 'T00:00:00+09:00');
  const dayMs = 86400000;
  const key = date => kst(date).slice(0, 10);
  const fmt = date => date.toLocaleDateString('ko-KR', {timeZone:'Asia/Seoul',month:'numeric',day:'numeric'});
  let start, end;
  if (calendarView === 'month') {
    const [year, month] = today.split('-').map(Number);
    start = new Date(Date.UTC(year, month - 1 + calendarOffset, 1) - 9 * 3600000);
    end = new Date(Date.UTC(year, month + calendarOffset, 1) - 9 * 3600000);
  } else {
    const days = calendarView === 'week' ? 7 : 14;
    start = new Date(anchor.getTime() + calendarOffset * days * dayMs);
    end = new Date(start.getTime() + days * dayMs);
  }
  const events = Array.isArray(calendarEvents) ? calendarEvents.filter(e => Date.parse(e.start) < end.getTime() && Date.parse(e.end || e.start) >= start.getTime()) : [];
  const onDay = date => events.filter(e => Date.parse(e.start) < date.getTime() + dayMs && (Date.parse(e.end || e.start) > date.getTime() || key(new Date(e.start)) === key(date)));
  const title = calendarView === 'month' ? start.toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long'}) : fmt(start) + ' – ' + fmt(new Date(end.getTime() - dayMs));
  let contents = '';
  if (calendarEvents === null) contents = '<p class="calendar-empty" role="status">일정을 불러오고 있어요.</p>';
  else if (calendarEvents === 'error') contents = '<p class="calendar-empty" role="status">일정을 불러오지 못했어요. 아래 Google 캘린더에서 확인해 주세요.</p>';
  else if (calendarCoverage && (start.getTime() < calendarCoverage.from || end.getTime() > calendarCoverage.to)) contents = '<p class="calendar-empty">이 기간은 Google 캘린더에서 확인해 주세요.</p>';
  else {
    if (calendarView === 'month') {
      const weekday = (start.getUTCDay() + 1) % 7; // 한국 자정은 전날 UTC 15시입니다.
      const count = Math.round((end - start) / dayMs);
      contents += '<div class="mini-month" aria-label="월간 일정"><div class="weekdays">' + ['일','월','화','수','목','금','토'].map(d=>'<span>'+d+'</span>').join('') + '</div><div class="month-days">' + '<span></span>'.repeat(weekday);
      for (let i=0;i<count;i++) {
        const date = new Date(start.getTime()+i*dayMs), list=onDay(date);
        contents += '<a href="#calendar" class="month-day'+(key(date)===today?' today':'')+(list.length?' has-events':'')+'" aria-label="'+esc(fmt(date)+(list.length?' '+list.map(e=>e.title).join(', '):' 일정 없음'))+'"><span>'+(i+1)+'</span>'+(list.length?'<b>'+list.length+'</b>':'')+'</a>';
      }
      contents += '</div></div>';
    }
    let rows = '';
    for (let cursor=start.getTime();cursor<end.getTime();cursor+=dayMs) {
      const date=new Date(cursor), list=onDay(date);
      if (!list.length) continue;
      rows += '<section class="mini-day"><h3>'+esc(date.toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short'}))+(key(date)===today?' <em>오늘</em>':'')+'</h3>'+list.map(e=>'<a class="mini-event" href="#calendar"><time>'+esc(e.allDay?'종일':kst(new Date(e.start)).slice(11,16)+'–'+kst(new Date(e.end||e.start)).slice(11,16))+'</time><strong>'+esc(e.title)+'</strong>'+(e.location?'<small>'+esc(e.location)+'</small>':'')+'</a>').join('')+'</section>';
    }
    contents += '<div class="mini-agenda">'+(rows||'<p class="calendar-empty">이 기간에 등록된 모임이 없어요.</p>')+'</div>';
  }
  box.innerHTML = '<div class="mini-calendar-head"><span>GOOGLE CALENDAR</span><h2>모임 일정</h2></div><div class="calendar-periods" role="group" aria-label="일정 표시 기간">'+[['week','1주'],['fortnight','2주'],['month','월']].map(([v,l])=>'<button data-calendar-view="'+v+'" aria-pressed="'+(calendarView===v)+'">'+l+'</button>').join('')+'</div><div class="calendar-range"><button data-calendar-move="-1" aria-label="이전 기간">‹</button><strong>'+esc(title)+'</strong><button data-calendar-move="1" aria-label="다음 기간">›</button></div><button class="calendar-today" data-calendar-move="today">오늘 기준으로</button>'+contents+'<div class="calendar-links"><a href="#calendar">전체 일정 보기 →</a><a href="'+CALENDAR_SUBSCRIBE+'" target="_blank" rel="noopener noreferrer">Google 캘린더 열기 ↗</a></div><p class="calendar-sync">한국 시간 · 공개 일정은 약 30분마다 갱신됩니다.<br>1주·2주는 오늘부터, 월은 해당 월 기준입니다.</p>';
}

/* ---------- 이벤트 ---------- */

async function copyText(text, button) {
  button.dataset.label ||= button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "복사됨";
  } catch {
    button.textContent = "복사하지 못했습니다. 직접 선택해 주세요";
  }
  setTimeout(() => { button.textContent = button.dataset.label; }, 1500);
}

async function removeItem(path, question) {
  if (!window.confirm(question)) return false;
  try {
    await api(path, { method: "DELETE", body: "{}" });
    return true;
  } catch (error) {
    window.alert(error.message);
    return false;
  }
}

document.addEventListener("click", async (event) => {
  const target = event.target;
  const period = target.closest('[data-calendar-view]');
  if (period) { calendarView = period.dataset.calendarView; calendarOffset = 0; renderMiniCalendar(); return; }
  const calendarMove = target.closest('[data-calendar-move]');
  if (calendarMove) { calendarOffset = calendarMove.dataset.calendarMove === 'today' ? 0 : calendarOffset + Number(calendarMove.dataset.calendarMove); renderMiniCalendar(); return; }
  if (!target.closest('.more-nav')) document.querySelector('.more-nav')?.removeAttribute('open');
  if (target.closest('[data-search-shortcut]')) { go(window.location.pathname + '#library'); document.querySelector('.global-search input')?.focus(); return; }
  const menuButton = target.closest("[data-menu]");
  if (menuButton) {
    const open = document.body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(open));
    return;
  }
  if (document.body.classList.contains("menu-open") && !target.closest(".side") && !menuButton) {
    document.body.classList.remove("menu-open");
    document.querySelector("[data-menu]").setAttribute("aria-expanded", "false");
    return;
  }
  const link = target.closest("a[href]");
  if (link) {
    if (link.hasAttribute("data-skip")) { event.preventDefault(); main.focus(); return; }
    const href = link.getAttribute("href");
    const url = new URL(link.href);
    const internal = !link.target && url.origin === window.location.origin && url.pathname === window.location.pathname && url.hash;
    if (!internal || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (link.closest("dialog")) loginDialog.close();
    go(href.startsWith("#") ? window.location.pathname + href : url.pathname + url.search + url.hash); // "#메뉴" 링크는 게시판 검색 조건을 지웁니다.
    return;
  }
  if (target.closest("[data-login]")) return openLogin();
  if (target.closest("[data-login-close]")) return loginDialog.close();
  if (target.closest("[data-logout]")) return logout();
  if (target.closest("[data-copy-link]")) return copyText(window.location.href, target.closest("button"));
  const promptButton = target.closest("[data-copy-prompt]");
  if (promptButton) return copyText(PROMPTS.find((item) => item.id === promptButton.dataset.copyPrompt)?.copyText || "", promptButton);
  const play = target.closest("[data-play]");
  if (play) {
    play.parentElement.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + enc(play.dataset.play) + '?autoplay=1&amp;rel=0" title="YouTube 영상" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    return;
  }
  const postId = main.querySelector("[data-post-id]")?.dataset.postId;
  if (target.closest("[data-delete-post]")) {
    if (await removeItem("/board/posts/" + enc(postId), "이 글을 삭제할까요? 되돌릴 수 없습니다.")) { loadRecent(); go(window.location.pathname + "#board"); }
    return;
  }
  const comment = target.closest("[data-comment-id]");
  if (!comment) return;
  if (target.closest("[data-delete-comment]")) {
    if (await removeItem("/board/comments/" + enc(comment.dataset.commentId), "이 댓글을 삭제할까요?")) loadComments(postId);
    return;
  }
  const body = comment.querySelector("[data-comment-body]");
  if (target.closest("[data-edit-comment]") && !comment.querySelector("form")) {
    body.hidden = true;
    body.insertAdjacentHTML("afterend", '<form class="comment-form" data-comment-edit-form><textarea class="field" name="content" maxlength="2000" rows="3" required aria-label="댓글 수정">' + esc(body.textContent)
      + '</textarea><p class="status" data-status role="status"></p><div class="form-actions"><button class="btn-line" type="button" data-cancel-edit>취소</button><button class="btn">저장</button></div></form>');
    return;
  }
  if (target.closest("[data-cancel-edit]")) {
    comment.querySelector("form").remove();
    body.hidden = false;
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (form.matches("[data-library-search]")) {
    event.preventDefault();
    const q = form.elements.q.value.trim().slice(0, 120);
    go(window.location.pathname + (q ? "?q=" + enc(q) : "") + "#" + (form.dataset.librarySearch || "library"));
    return;
  }
  if (form.matches("[data-search]")) {
    event.preventDefault();
    go(boardHref({ q: form.elements.q.value.trim().slice(0, 120) }));
    return;
  }
  if (!form.matches("[data-write-form], [data-comment-form], [data-comment-edit-form]")) return;
  event.preventDefault();
  const button = form.querySelector("button:not([type=button])");
  const status = form.querySelector("[data-status]");
  if (button.disabled) return;
  button.disabled = true;
  status.textContent = "";
  try {
    if (form.matches("[data-write-form]")) {
      const id = form.dataset.id;
      const payload = { category: form.elements.category.value, title: form.elements.title.value.trim(), content: form.elements.content.value };
      const data = await api(id ? "/board/posts/" + enc(id) : "/board/posts", { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) });
      loadRecent();
      go(window.location.pathname + "?post=" + enc(data.post?.id || id) + "#board");
      return;
    }
    const postId = main.querySelector("[data-post-id]").dataset.postId;
    const content = form.elements.content.value;
    if (form.matches("[data-comment-form]")) {
      await api("/board/posts/" + enc(postId) + "/comments", { method: "POST", body: JSON.stringify({ content }) });
      form.reset();
    } else {
      await api("/board/comments/" + enc(form.closest("[data-comment-id]").dataset.commentId), { method: "PATCH", body: JSON.stringify({ content }) });
    }
    await loadComments(postId);
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

window.addEventListener("popstate", () => render());
window.addEventListener("hashchange", () => render());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.querySelector(".more-nav")?.removeAttribute("open");
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); go(window.location.pathname + '#library'); document.querySelector('.global-search input')?.focus();
  }
  if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
    document.body.classList.remove("menu-open");
    document.querySelector("[data-menu]").setAttribute("aria-expanded", "false");
  }
});
fetch("calendar.json", { cache: "no-cache" })
  .then((response) => (response.ok ? response.json() : Promise.reject(new Error("calendar"))))
  .then((data) => { calendarEvents = Array.isArray(data.events) ? data.events : []; calendarCoverage = data.from && data.to ? {from:Date.parse(data.from),to:Date.parse(data.to)} : null; })
  .catch(() => { calendarEvents = "error"; })
  .finally(() => { tickBar(); renderMiniCalendar(); if (route().name === "calendar") render(true); });
fetch("newsletter.json", { cache: "no-cache" })
  .then((response) => (response.ok ? response.json() : Promise.reject(new Error("newsletter"))))
  .then((data) => { READINGS.newsletter.items = Array.isArray(data.items) ? data.items : []; })
  .catch(() => { READINGS.newsletter.failed = true; })
  .finally(() => { READINGS.newsletter.loaded = true; if (route().name === "newsletter") render(true); });

setInterval(tickBar, 1000);
tickBar();
renderAccount();
renderMiniCalendar();
loadRecent();
countVisit();
render();

function renderDesignDirectory(name) {
  const motion = name === 'motion';
  const title = motion ? '모션 스타일' : '브랜드 룩북';
  const sites = motion ? [['Prompt Motion','http://prompt-motion.com'],['Shotreel','http://shotreel.app']] : [['Prompt Motion','http://prompt-motion.com'],['Shotreel','http://shotreel.app'],['Evil Buttons','http://evilbuttons.com'],['Drawably','http://drawably.dev'],['Alcove','http://tryalcove.com'],['AppLlama','http://appllama.io'],['Design Bookmark','http://designbookmark.com'],['Amicons','http://amicons.design'],['Graphical UI','http://graphicalui.com']];
  setTitle(title);
  main.innerHTML = '<section class="design-directory"><p class="eyebrow">DESIGN LIBRARY</p><h1>'+title+'</h1><p class="design-intro">'+(motion?'움직임의 아이디어를 살펴보고, 프로젝트에 맞는 표현을 찾아보세요.':'브랜드와 UI의 시각적 방향을 찾을 때 참고할 디자인 웹사이트입니다.')+'</p>'
    + (!motion?'<a class="reference-link" href="https://www.oppadu.com/ai/design-systems-site/" target="_blank" rel="noopener noreferrer"><strong>디자인 시스템 레퍼런스</strong><span>참고 사이트 살펴보기 ↗</span></a><h2>디자이너들을 위한 웹사이트</h2>':'')
    + '<div class="design-sites">'+sites.map(([label,url],i)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer"><span class="site-number">'+String(i+1).padStart(2,'0')+'</span><span><strong>'+label+'</strong><small>'+new URL(url).hostname+'</small></span><span class="site-arrow" aria-hidden="true">↗</span></a>').join('')+'</div></section>';
}
