import { CURRICULUM, MATERIALS, PROMPTS, VIDEOS } from "./data.js";

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
  + '<p class="promo-actions"><a class="btn" href="https://open.kakao.com/me/aibuilderslab" target="_blank" rel="noopener noreferrer">수업 상담하기 ↗</a><a class="btn-line" href="#curriculum">커리큘럼 보기</a></p></div>'
  + '<img src="assets/promo-youtuber.webp" width="720" height="726" alt="노트북과 스마트폰으로 쇼츠와 롱폼 영상을 만드는 수강생 일러스트"></section>';

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
  document.querySelector("[data-account]").innerHTML = auth.user
    ? '<p><strong>' + esc(auth.user.name || "빌더") + '</strong>님</p><div class="account-actions"><a class="btn" href="#write">글쓰기</a><button class="btn-line" type="button" data-logout>로그아웃</button></div>'
    : '<p class="account-hint">로그인하면 글과 댓글을 쓸 수 있어요.</p><button class="btn btn-block" type="button" data-login>Google 로그인</button>';
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
  try { return { name: name || "board", id: decodeURIComponent(id) }; } catch { return { name, id: "" }; }
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
  const section = name === "write" ? "board" : name;
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === section) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (moved) window.scrollTo(0, 0);
  if (name === "board") return renderBoard();
  if (name === "write") return renderWrite();
  if (name === "calendar") return renderCalendar();
  if (name === "materials") return renderMaterials();
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
  document.querySelector("[data-search] input").value = q;
  setTitle(q ? "‘" + q + "’ 검색" : "");
  const tabs = [["all", "전체"], ...Object.entries(CATEGORIES)]
    .map(([key, label]) => '<a href="' + boardHref({ category: key, q }) + '"' + (key === category ? ' aria-current="true"' : "") + ">" + label + "</a>").join("");
  main.innerHTML = PROMO + '<div class="head"><h1>자유게시판</h1><a class="btn" href="#write">글쓰기</a></div>'
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
  if (start <= now) return { badge: "진행 중", text: "지금 진행 중" };
  const days = Math.round((Date.parse(kst(start).slice(0, 10)) - Date.parse(kst(now).slice(0, 10))) / 86400000);
  const badge = days === 0 ? "오늘" : days === 1 ? "내일" : "D-" + days;
  const date = start.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" });
  return { badge, text: date + " " + (event.allDay ? "종일" : kst(start).slice(11, 16)) };
}

function eventSummary(event) {
  const when = eventWhen(event);
  return '<span class="ev-when"><b>' + when.badge + "</b> " + esc(when.text) + '</span><span class="ev-title">' + esc(event.title) + (event.location ? " · " + esc(event.location) : "") + "</span>";
}

function tickBar() {
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
  main.innerHTML = '<div class="head"><h1>교육 커리큘럼</h1>' + contact + "</div>"
    + '<p class="course-info">' + c.info.map(esc).join(" · ") + "</p>"
    + '<section class="course-block"><h2><span class="cat">' + esc(c.setup.tag) + "</span>" + esc(c.setup.title) + "</h2>"
    + "<p>" + esc(c.setup.summary) + '</p><p class="hint">' + esc(c.setup.scope) + '</p><p class="hint">' + esc(c.setup.exclude) + "</p>"
    + '<ol class="course-steps">' + c.setup.steps.map((step) => "<li><strong>" + esc(step.title) + "</strong><span>" + esc(step.meta) + "</span><p>" + esc(step.body) + "</p></li>").join("") + "</ol></section>"
    + '<section class="course-block"><h2><span class="cat">READY? LET’S MAKE SOMETHING.</span>제작 과정</h2>'
    + '<p class="hint">Hermes와 LLM Wiki가 설치되어 있어야 진행할 수 있습니다. 만들고 싶은 결과물 하나를 선택하세요.</p>'
    + '<div class="list"><div class="row row-course row-head" aria-hidden="true"><span>과정</span><span>내용</span><span>남는 결과</span></div>'
    + c.courses.map((course) => '<div class="row row-course"><span class="c-cat">' + esc(course.no) + "<br>" + esc(course.tool) + '</span><span class="c-title">' + esc(course.title) + "<small>" + esc(course.summary) + '</small></span><span class="c-author">' + esc(course.result) + "</span></div>").join("")
    + '</div><p class="hint course-note">' + esc(c.note) + '</p><p class="actions">' + contact + '<a class="btn-line" href="https://builderslab.ai-hub-os.com/#courses" target="_blank" rel="noopener">Builders Lab 과정 안내 원문 ↗</a></p></section>';
}


async function loadRecent() {
  const box = document.querySelector("[data-recent]");
  try {
    const posts = (await api("/board/posts?" + new URLSearchParams({ page: 1, pageSize: 5, category: "all", sort: "latest", q: "" }))).posts || [];
    box.innerHTML = posts.length
      ? posts.map((post) => '<a href="?post=' + enc(post.id) + '#board"><span>' + esc(post.title) + "</span><time>" + shortDate(post.created_at) + "</time></a>").join("")
      : '<p class="hint">아직 글이 없습니다.</p>';
  } catch {
    box.innerHTML = '<p class="hint">최근 글을 불러오지 못했습니다.</p>';
  }
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
  const menuButton = target.closest("[data-menu]");
  if (menuButton) {
    const open = document.body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(open));
    return;
  }
  if (document.body.classList.contains("menu-open") && !target.closest(".side")) {
    document.body.classList.remove("menu-open");
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
fetch("calendar.json", { cache: "no-cache" })
  .then((response) => (response.ok ? response.json() : Promise.reject(new Error("calendar"))))
  .then((data) => { calendarEvents = Array.isArray(data.events) ? data.events : []; })
  .catch(() => { calendarEvents = "error"; })
  .finally(() => { tickBar(); if (route().name === "calendar") render(true); });
fetch("newsletter.json", { cache: "no-cache" })
  .then((response) => (response.ok ? response.json() : Promise.reject(new Error("newsletter"))))
  .then((data) => { READINGS.newsletter.items = Array.isArray(data.items) ? data.items : []; })
  .catch(() => { READINGS.newsletter.failed = true; })
  .finally(() => { READINGS.newsletter.loaded = true; if (route().name === "newsletter") render(true); });

setInterval(tickBar, 1000);
tickBar();
renderAccount();
loadRecent();
render();
