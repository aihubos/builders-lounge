const API_BASE = /^(127\.0\.0\.1|localhost)$/.test(window.location.hostname)
  ? "http://127.0.0.1:8787"
  : "https://reportmode-request-board.report-request-board.workers.dev";

const ERROR_MESSAGES = Object.freeze({
  login_required: "Google 로그인이 필요합니다.",
  google_login_not_configured: "Google 로그인 설정이 아직 완료되지 않았습니다.",
  invalid_google_token: "로그인 시간이 만료되었습니다. 다시 로그인해 주세요.",
  unverified_google_account: "확인된 Google 계정으로 로그인해 주세요.",
  admin_required: "관리자 계정만 사용할 수 있습니다.",
  not_owner: "본인이 작성한 글만 수정하거나 삭제할 수 있습니다.",
  insufficient_builds: "빌드가 부족합니다. 게시글을 작성하거나 관리자에게 충전을 요청해 주세요.",
  tool_disabled: "관리자가 이 도구를 아직 열지 않았습니다.",
  tool_not_configured: "관리자 API 설정이 아직 완료되지 않았습니다.",
  config_encryption_not_ready: "서버의 API 키 보관 설정이 아직 완료되지 않았습니다.",
  api_key_decryption_failed: "저장된 API 키를 읽지 못했습니다. 관리자가 키를 다시 저장해 주세요.",
  provider_request_failed: "연결된 AI 서비스 요청에 실패했습니다. 관리자 설정과 사용량을 확인해 주세요.",
  empty_provider_response: "AI 서비스가 빈 결과를 반환했습니다.",
  request_already_used: "같은 생성 요청이 이미 처리되었습니다. 다시 눌러 새 요청을 시작해 주세요.",
  prompt_required: "생성할 내용을 입력해 주세요.",
  invalid_endpoint: "API 주소는 외부 HTTPS 주소만 사용할 수 있습니다.",
  server_error: "서버에서 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
});

const state = {
  config: null,
  credential: "",
  user: null,
  tools: [],
  loading: true,
  error: "",
  initialized: false,
};

const subscribers = new Set();
let expiryTimer = 0;
let initPromise = null;

function errorMessage(code, fallback = "요청을 처리하지 못했습니다.") {
  return ERROR_MESSAGES[code] || fallback;
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (state.credential) headers.Authorization = `Bearer ${state.credential}`;
  const response = await fetch(API_BASE + path, { cache: "no-store", ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && state.credential) clearSession(false);
    const error = new Error(errorMessage(body?.error, body?.message || "요청을 처리하지 못했습니다."));
    error.code = body?.error || "request_failed";
    error.status = response.status;
    throw error;
  }
  return body;
}

function notify() {
  renderAccount();
  subscribers.forEach((callback) => {
    try { callback(snapshot()); } catch { /* 한 화면 오류가 로그인 상태 갱신을 막지 않게 합니다. */ }
  });
  window.dispatchEvent(new CustomEvent("lounge:authchange", { detail: snapshot() }));
  shareWithEmbeddedApps();
}

function snapshot() {
  return Object.freeze({
    config: state.config,
    user: state.user,
    tools: [...state.tools],
    loading: state.loading,
    error: state.error,
    authenticated: Boolean(state.user && state.credential),
  });
}

function decodeExpiry(token) {
  try {
    const encoded = token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
    return Number(payload.exp || 0) * 1000;
  } catch { return 0; }
}

function scheduleExpiry(token) {
  window.clearTimeout(expiryTimer);
  const expiry = decodeExpiry(token);
  if (!expiry) return;
  expiryTimer = window.setTimeout(() => clearSession(true), Math.max(1_000, expiry - Date.now() - 5_000));
}

function clearSession(announce = true) {
  state.credential = "";
  state.user = null;
  window.clearTimeout(expiryTimer);
  try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch { /* Google 스크립트가 없어도 로그아웃합니다. */ }
  notify();
  if (announce) setLiveMessage("로그인 시간이 만료되었습니다. 다시 로그인해 주세요.");
}

function setLiveMessage(message) {
  const live = document.querySelector("[data-lounge-live]");
  if (live) live.textContent = message;
}

async function acceptCredential(credential) {
  state.credential = String(credential || "");
  state.error = "";
  try {
    const data = await request("/lounge/me");
    state.user = data.user || null;
    state.tools = Array.isArray(data.tools) ? data.tools : state.tools;
    scheduleExpiry(state.credential);
    closeLogin();
    setLiveMessage(`${state.user?.name || "빌더"}님, 로그인되었습니다. 현재 ${Number(state.user?.balance || 0)}빌드입니다.`);
    notify();
    return state.user;
  } catch (error) {
    state.credential = "";
    state.user = null;
    state.error = error.message;
    notify();
    throw error;
  }
}

function waitForGoogle(attempt = 0) {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (attempt >= 80) return Promise.reject(new Error("Google 로그인 모듈을 불러오지 못했습니다."));
  return new Promise((resolve) => window.setTimeout(resolve, 100)).then(() => waitForGoogle(attempt + 1));
}

async function renderGoogleButtons() {
  if (!state.config?.googleClientId) return;
  const googleId = await waitForGoogle();
  googleId.initialize({
    client_id: state.config.googleClientId,
    callback: (response) => { void acceptCredential(response?.credential).catch((error) => showLoginStatus(error.message, true)); },
    auto_select: false,
    cancel_on_tap_outside: false,
  });
  document.querySelectorAll("[data-google-signin-button]").forEach((container) => {
    container.replaceChildren();
    googleId.renderButton(container, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      logo_alignment: "left",
      locale: "ko",
      width: Math.min(320, Math.max(220, container.clientWidth || 280)),
    });
  });
}

function showLoginStatus(message, error = false) {
  document.querySelectorAll("[data-platform-login-status]").forEach((node) => {
    node.textContent = message || "";
    node.dataset.error = String(error);
  });
}

function openLogin() {
  const dialog = document.querySelector("[data-platform-login-dialog]");
  if (!dialog) return;
  if (!dialog.open) dialog.showModal?.();
  if (!state.config?.loginReady) showLoginStatus("Google OAuth 클라이언트 ID를 서버에 먼저 설정해 주세요.", true);
  else showLoginStatus("로그인 정보는 현재 탭의 메모리에만 유지되며 API 키는 서버에서만 사용됩니다.");
  void renderGoogleButtons().catch((error) => showLoginStatus(error.message, true));
  window.requestAnimationFrame(() => dialog.querySelector("[data-platform-login-close]")?.focus({ preventScroll: true }));
}

function closeLogin() {
  const dialog = document.querySelector("[data-platform-login-dialog]");
  if (dialog?.open) dialog.close();
}

function renderAccount() {
  document.querySelectorAll("[data-platform-account]").forEach((root) => {
    if (state.loading) {
      root.innerHTML = '<span class="platform-account-loading">계정 확인 중</span>';
      return;
    }
    if (!state.user) {
      root.innerHTML = `<button class="platform-login-button" type="button" data-platform-login-open aria-label="Google 로그인">
        <span class="platform-google-mark" aria-hidden="true">G</span><strong>Google 로그인</strong>
      </button>`;
      return;
    }
    root.innerHTML = `<div class="platform-account-signed">
      <button class="platform-balance-button" type="button" data-platform-account-menu aria-label="내 계정 메뉴 열기">
        ${state.user.picture ? `<img src="${escapeHtml(state.user.picture)}" alt="" referrerpolicy="no-referrer">` : '<span class="platform-avatar-fallback" aria-hidden="true">B</span>'}
        <span><strong data-build-balance>${Number(state.user.balance || 0).toLocaleString("ko-KR")} 빌드</strong><small>${escapeHtml(state.user.name || state.user.email)}</small></span>
      </button>
      <div class="platform-account-popover" data-platform-account-popover hidden>
        <strong>${escapeHtml(state.user.name || "빌더")}</strong><small>${escapeHtml(state.user.email)}</small>
        <span>현재 잔액 <b>${Number(state.user.balance || 0).toLocaleString("ko-KR")} 빌드</b></span>
        ${state.user.isAdmin ? '<button type="button" data-platform-admin-open>관리자 설정</button>' : ""}
        <button type="button" data-platform-logout>로그아웃</button>
      </div>
    </div>`;
  });
  document.querySelectorAll("[data-admin-only]").forEach((node) => { node.hidden = !state.user?.isAdmin; });
  document.querySelectorAll("[data-build-balance]").forEach((node) => {
    node.textContent = state.user ? `${Number(state.user.balance || 0).toLocaleString("ko-KR")} 빌드` : "로그인 전";
  });
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function bindUi() {
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-platform-login-open]")) { openLogin(); return; }
    if (event.target.closest("[data-platform-login-close]")) { closeLogin(); return; }
    if (event.target.closest("[data-platform-logout]")) { clearSession(false); setLiveMessage("로그아웃되었습니다."); return; }
    if (event.target.closest("[data-platform-admin-open]")) {
      document.querySelector("[data-platform-account-popover]")?.setAttribute("hidden", "");
      window.dispatchEvent(new CustomEvent("lounge:navigate", { detail: { view: "admin" } }));
      return;
    }
    const menu = event.target.closest("[data-platform-account-menu]");
    if (menu) {
      const popover = menu.parentElement?.querySelector("[data-platform-account-popover]");
      if (popover) popover.hidden = !popover.hidden;
      return;
    }
    document.querySelectorAll("[data-platform-account-popover]").forEach((node) => { node.hidden = true; });
  });
  document.querySelector("[data-platform-login-dialog]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeLogin();
  });
}

function shareWithEmbeddedApps(targetWindow = null) {
  if (!state.credential) return;
  const message = { type: "builders-lounge:auth", credential: state.credential, user: state.user, tools: state.tools };
  if (targetWindow) {
    targetWindow.postMessage(message, window.location.origin);
    return;
  }
  document.querySelectorAll("iframe").forEach((frame) => {
    try {
      if (new URL(frame.src).origin === window.location.origin) frame.contentWindow?.postMessage(message, window.location.origin);
    } catch { /* 외부 iframe에는 로그인 정보를 보내지 않습니다. */ }
  });
}

function bindFrameBridge() {
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "builders-lounge:request-auth" && event.source) shareWithEmbeddedApps(event.source);
    if (event.data?.type === "builders-lounge:balance" && Number.isFinite(Number(event.data.balance))) {
      applyBalance(Number(event.data.balance));
    }
  });
  document.querySelectorAll("iframe").forEach((frame) => frame.addEventListener("load", () => shareWithEmbeddedApps(frame.contentWindow)));
}

async function initialize() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    bindUi();
    bindFrameBridge();
    try {
      state.config = await request("/lounge/config");
      state.tools = Array.isArray(state.config?.tools) ? state.config.tools : [];
      state.error = "";
    } catch (error) {
      state.error = error.message;
      state.config = { loginReady: false, googleClientId: "", tools: [] };
    } finally {
      state.loading = false;
      state.initialized = true;
      notify();
    }
  })();
  return initPromise;
}

function subscribe(callback) {
  subscribers.add(callback);
  callback(snapshot());
  return () => subscribers.delete(callback);
}

function getTool(toolId) {
  return state.tools.find((tool) => tool.id === toolId) || null;
}

function getCredential() {
  return state.credential;
}

function applyBalance(balance) {
  if (!state.user || !Number.isFinite(Number(balance))) return;
  state.user = { ...state.user, balance: Number(balance) };
  notify();
}

async function refreshMe() {
  if (!state.credential) return null;
  const data = await request("/lounge/me");
  state.user = data.user || null;
  state.tools = Array.isArray(data.tools) ? data.tools : state.tools;
  notify();
  return state.user;
}

async function generate(toolId, input) {
  if (!state.user || !state.credential) {
    openLogin();
    throw Object.assign(new Error(ERROR_MESSAGES.login_required), { code: "login_required" });
  }
  const requestId = crypto.randomUUID();
  const data = await request(`/lounge/tools/${encodeURIComponent(toolId)}/generate`, {
    method: "POST",
    headers: { "X-Request-Id": requestId },
    body: JSON.stringify({ requestId, input }),
  });
  applyBalance(data.balance);
  return data;
}

window.BuildersPlatform = Object.freeze({
  API_BASE,
  initialize,
  snapshot,
  subscribe,
  request,
  openLogin,
  closeLogin,
  refreshMe,
  getCredential,
  getTool,
  generate,
  applyBalance,
  acceptCredential,
  errorMessage,
});

void initialize();
