const API_BASE = window.location.port === "8787"
  ? "http://127.0.0.1:8787"
  : "https://reportmode-request-board.report-request-board.workers.dev";

const ERROR_MESSAGES = Object.freeze({
  login_required: "Google 로그인이 필요합니다.",
  policy_consent_required: "이용약관과 개인정보 처리 안내 확인이 필요합니다.",
  google_login_not_configured: "Google 로그인 설정이 아직 완료되지 않았습니다.",
  invalid_google_token: "로그인 시간이 만료되었습니다. 다시 로그인해 주세요.",
  unverified_google_account: "확인된 Google 계정으로 로그인해 주세요.",
  admin_required: "관리자 계정만 사용할 수 있습니다.",
  not_owner: "본인이 작성한 글만 수정하거나 삭제할 수 있습니다.",
  insufficient_builds: "빌드가 부족합니다. 글이나 댓글을 작성하거나 관리자에게 충전을 요청해 주세요.",
  tool_disabled: "관리자가 이 도구를 아직 열지 않았습니다.",
  tool_not_configured: "관리자 API 설정이 아직 완료되지 않았습니다.",
  config_encryption_not_ready: "서버의 API 키 보관 설정이 아직 완료되지 않았습니다.",
  api_key_decryption_failed: "저장된 API 키를 읽지 못했습니다. 관리자가 키를 다시 저장해 주세요.",
  provider_request_failed: "연결된 AI 서비스 요청에 실패했습니다. 관리자 설정과 사용량을 확인해 주세요.",
  empty_provider_response: "AI 서비스가 빈 결과를 반환했습니다.",
  request_already_used: "같은 생성 요청이 이미 처리되었습니다. 다시 눌러 새 요청을 시작해 주세요.",
  prompt_required: "생성할 내용을 입력해 주세요.",
  invalid_endpoint: "API 주소는 외부 HTTPS 주소만 사용할 수 있습니다.",
  shorts_cost_misconfigured: "쇼츠 사용 비용이 5빌드로 설정되어 있지 않습니다.",
  shorts_topic_too_short: "만들고 싶은 내용을 한 문장으로 조금 더 적어 주세요.",
  shorts_storage_not_configured: "영상 저장소가 아직 설정되지 않았습니다.",
  shorts_webm_required: "이 브라우저에서 WebM 영상을 만들지 못했습니다.",
  shorts_file_size_invalid: "영상 파일 크기를 확인하지 못했거나 25MB를 넘었습니다.",
  shorts_reservation_released: "이 작업의 빌드 예약은 이미 해제되었습니다.",
  shorts_already_completed: "이미 완성된 영상은 취소할 수 없습니다.",
  shorts_not_completed: "영상 저장이 끝난 뒤 게시할 수 있습니다.",
  shorts_rights_confirmation_required: "사용할 자료와 게시 내용의 권리를 확인해 주세요.",
  shorts_media_missing: "저장된 영상을 찾지 못했습니다.",
  shorts_publish_failed: "게시판에 등록하지 못했습니다. 같은 버튼으로 다시 시도해 주세요.",
  shorts_upload_commit_failed: "영상 저장은 끝났지만 빌드 확정 상태를 확인하지 못했습니다. 다시 시도하지 말고 관리자에게 알려 주세요.",
  shorts_renderer_not_configured: "MoneyPrinterTurbo 렌더 서버가 아직 설정되지 않았습니다.",
  shorts_renderer_unreachable: "영상 렌더 서버와 연결이 끊어졌습니다. 기존 작업 상태를 다시 확인해 주세요.",
  shorts_renderer_request_failed: "영상 렌더 서버가 작업을 처리하지 못했습니다. 기존 작업 상태를 다시 확인해 주세요.",
  shorts_renderer_unauthorized: "영상 렌더 서버의 내부 인증을 확인하지 못했습니다. 제작 내용과 빌드 예약은 그대로 보존됩니다.",
  shorts_renderer_busy: "영상 렌더 서버가 다른 작업을 처리 중입니다. 잠시 후 같은 제작안을 다시 시도해 주세요.",
  shorts_renderer_plan_invalid: "영상 서버가 제작안 형식을 확인하지 못했습니다. 장면 내용을 수정한 뒤 다시 시도해 주세요.",
  shorts_renderer_task_missing: "영상 서버에서 이전 작업을 찾지 못해 빌드 예약을 해제했습니다. 새로 시작해 주세요.",
  shorts_renderer_invalid_response: "영상 렌더 서버 응답을 확인하지 못했습니다.",
  shorts_renderer_video_fetch_failed: "완성된 MP4를 렌더 서버에서 가져오지 못했습니다.",
  shorts_renderer_media_type_invalid: "렌더 서버가 MP4가 아닌 파일을 반환했습니다.",
  shorts_renderer_video_url_invalid: "렌더 서버의 완성 영상 주소가 허용된 작업 경로와 다릅니다.",
  shorts_renderer_storage_failed: "완성된 MP4를 안전한 저장소에 보관하지 못해 빌드 예약을 해제했습니다.",
  shorts_mp4_structure_invalid: "완성 파일의 MP4 구조를 확인하지 못해 빌드 예약을 해제했습니다.",
  shorts_render_not_started: "아직 시작하지 않은 렌더 작업입니다.",
  shorts_render_plan_incomplete: "렌더할 제작안의 장면 구성이 부족해 빌드 예약을 해제했습니다.",
  shorts_plan_invalid: "제작 방향과 장면 내용을 모두 확인해 주세요.",
  shorts_plan_locked: "영상 제작이 시작되어 제작 내용을 더 이상 수정할 수 없습니다.",
  shorts_reservation_expired: "30분이 지나 빌드 예약이 해제되었습니다. 새로 시작해 주세요.",
  shorts_upload_in_progress: "같은 영상의 저장을 이미 처리하고 있습니다. 작업 상태를 다시 확인해 주세요.",
  shorts_use_studio: "쇼츠는 AI 쇼츠 스튜디오 화면에서 만들어 주세요.",
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
let loginReturnFocus = null;
let googleIdentityPromise = null;

function errorMessage(code, fallback = "요청을 처리하지 못했습니다.") {
  return ERROR_MESSAGES[code] || fallback;
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (state.credential) headers.Authorization = `Bearer ${state.credential}`;
  let response;
  try {
    response = await fetch(API_BASE + path, { cache: "no-store", ...options, headers });
  } catch (error) {
    const wrapped = new Error("서버와 연결이 끊어졌습니다. 인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요.");
    wrapped.code = "network_error";
    throw wrapped;
  }
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
  renderToolCostLabels();
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
  if (!document.querySelector("[data-platform-policy-consent]")?.checked) {
    throw Object.assign(new Error(ERROR_MESSAGES.policy_consent_required), { code: "policy_consent_required" });
  }
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

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (googleIdentityPromise) return googleIdentityPromise;
  googleIdentityPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.addEventListener("load", () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else reject(new Error("Google 로그인 모듈을 확인하지 못했습니다."));
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Google 로그인 모듈을 불러오지 못했습니다.")), { once: true });
    document.head.append(script);
  }).catch((error) => {
    googleIdentityPromise = null;
    throw error;
  });
  return googleIdentityPromise;
}

async function renderGoogleButtons() {
  const consent = document.querySelector("[data-platform-policy-consent]")?.checked === true;
  if (!consent || !state.config?.googleClientId) {
    document.querySelectorAll("[data-google-signin-button]").forEach((container) => {
      const placeholder = document.createElement("button");
      placeholder.type = "button";
      placeholder.className = "platform-policy-login-placeholder";
      placeholder.disabled = true;
      placeholder.textContent = consent ? "Google 로그인 설정을 확인하고 있습니다" : "약관 확인 후 Google 로그인 가능";
      container.replaceChildren(placeholder);
    });
    return;
  }
  const googleId = await loadGoogleIdentity();
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
    node.setAttribute("role", error ? "alert" : "status");
    node.setAttribute("aria-live", error ? "assertive" : "polite");
  });
}

function openLogin() {
  const dialog = document.querySelector("[data-platform-login-dialog]");
  if (!dialog) return;
  if (!dialog.open) loginReturnFocus = document.activeElement;
  const policyConsent = dialog.querySelector("[data-platform-policy-consent]");
  if (policyConsent) policyConsent.checked = false;
  if (!dialog.open) dialog.showModal?.();
  if (!state.config?.loginReady) showLoginStatus("Google OAuth 클라이언트 ID를 서버에 먼저 설정해 주세요.", true);
  else showLoginStatus("이용약관과 개인정보 처리 안내를 확인하면 Google 로그인 버튼이 열립니다.");
  void renderGoogleButtons().catch((error) => showLoginStatus(error.message, true));
  window.requestAnimationFrame(() => dialog.querySelector("[data-platform-login-close]")?.focus({ preventScroll: true }));
}

function closeLogin() {
  const dialog = document.querySelector("[data-platform-login-dialog]");
  if (dialog?.open) dialog.close();
}

function renderToolCostLabels() {
  document.querySelectorAll("[data-tool-cost-label]").forEach((node) => {
    const tool = getTool(node.dataset.toolCostLabel);
    const cost = Number(tool?.cost);
    node.textContent = tool?.enabled && Number.isFinite(cost) && cost >= 0
      ? `${cost.toLocaleString("ko-KR")}빌드`
      : tool
        ? "관리자 설정 필요"
        : "비용 확인 중";
  });
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
        ${state.user.picture ? `<img src="${escapeHtml(state.user.picture)}" alt="" width="28" height="28" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '<span class="platform-avatar-fallback" aria-hidden="true">B</span>'}
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
    const policyRoute = event.target.closest("[data-platform-policy-route]");
    if (policyRoute) {
      event.preventDefault();
      const view = policyRoute.dataset.platformPolicyRoute;
      closeLogin();
      window.requestAnimationFrame(() => window.dispatchEvent(new CustomEvent("lounge:navigate", { detail: { view } })));
      return;
    }
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
  document.addEventListener("change", (event) => {
    if (!event.target.matches?.("[data-platform-policy-consent]")) return;
    showLoginStatus(event.target.checked
      ? "동의가 확인되었습니다. Google 계정으로 계속해 주세요."
      : "이용약관과 개인정보 처리 안내 확인이 필요합니다.", !event.target.checked);
    void renderGoogleButtons().catch((error) => showLoginStatus(error.message, true));
  });
  document.querySelector("[data-platform-login-dialog]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeLogin();
  });
  document.querySelector("[data-platform-login-dialog]")?.addEventListener("close", () => {
    const target = loginReturnFocus;
    loginReturnFocus = null;
    window.requestAnimationFrame(() => target?.focus?.({ preventScroll: true }));
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

function requirePlatformLogin() {
  if (state.user && state.credential) return;
  openLogin();
  throw Object.assign(new Error(ERROR_MESSAGES.login_required), { code: "login_required" });
}

const shorts = Object.freeze({
  async recent() {
    requirePlatformLogin();
    const data = await request("/lounge/shorts/recent");
    if (!data || typeof data !== "object" || typeof data.found !== "boolean") {
      throw Object.assign(new Error("최근 쇼츠 작업 응답을 확인하지 못했습니다."), { code: "shorts_recent_invalid_response" });
    }
    const hasRequestId = typeof data.requestId === "string" && data.requestId.trim().length > 0;
    const hasJobId = typeof data.jobId === "string" && data.jobId.trim().length > 0;
    if (data.found && (!hasRequestId || !hasJobId)) {
      throw Object.assign(new Error("최근 쇼츠 작업의 요청·작업 번호를 확인하지 못했습니다."), { code: "shorts_recent_invalid_response" });
    }
    if (typeof data.balance === "number" && Number.isFinite(data.balance)) applyBalance(data.balance);
    return data;
  },
  async status({ jobId = "", requestId = "" }) {
    requirePlatformLogin();
    const path = jobId
      ? `/lounge/shorts/${encodeURIComponent(jobId)}`
      : `/lounge/shorts?requestId=${encodeURIComponent(requestId)}`;
    if (!jobId && !requestId) throw new Error("복구할 쇼츠 작업을 확인하지 못했습니다.");
    const data = await request(path);
    applyBalance(data.balance);
    return data;
  },
  async media({ mediaUrl }) {
    requirePlatformLogin();
    let target;
    try { target = new URL(String(mediaUrl || "")); }
    catch { throw new Error("저장된 영상 주소를 확인하지 못했습니다."); }
    const apiOrigin = new URL(API_BASE).origin;
    if (target.origin !== apiOrigin || !target.pathname.startsWith("/lounge/shorts/")) {
      throw new Error("저장된 영상 주소를 확인하지 못했습니다.");
    }
    let response;
    try {
      response = await fetch(target.href, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${state.credential}` },
      });
    } catch {
      throw Object.assign(new Error("저장된 영상과 연결이 끊어졌습니다. 잠시 후 다시 확인해 주세요."), { code: "network_error" });
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(errorMessage(body?.error, body?.message || "저장된 영상을 불러오지 못했습니다."));
      error.code = body?.error || "request_failed";
      error.status = response.status;
      throw error;
    }
    const video = await response.blob();
    const mediaType = String(video.type || response.headers.get("Content-Type") || "").split(";", 1)[0].trim();
    if (!video.size || !["video/webm", "video/mp4"].includes(mediaType)) {
      throw new Error("저장된 영상 파일 형식을 확인하지 못했습니다.");
    }
    return video;
  },
  async prepare({ requestId = crypto.randomUUID(), topic, settings }) {
    requirePlatformLogin();
    const data = await request("/lounge/shorts/prepare", {
      method: "POST",
      headers: { "X-Request-Id": requestId },
      body: JSON.stringify({ requestId, topic, settings }),
    });
    applyBalance(data.balance);
    return data;
  },
  async updatePlan({ jobId, detailedPrompt, scenes }) {
    requirePlatformLogin();
    if (!jobId) throw new Error("수정할 쇼츠 작업을 확인하지 못했습니다.");
    const data = await request(`/lounge/shorts/${encodeURIComponent(jobId)}/plan`, {
      method: "PATCH",
      body: JSON.stringify({ detailedPrompt, scenes }),
    });
    applyBalance(data.balance);
    return data;
  },
  async render({ jobId }) {
    requirePlatformLogin();
    if (!jobId) throw new Error("렌더할 쇼츠 작업을 확인하지 못했습니다.");
    const data = await request(`/lounge/shorts/${encodeURIComponent(jobId)}/render`, {
      method: "POST",
    });
    applyBalance(data.balance);
    return data;
  },
  async renderSync({ jobId }) {
    requirePlatformLogin();
    if (!jobId) throw new Error("확인할 렌더 작업을 찾지 못했습니다.");
    const data = await request(`/lounge/shorts/${encodeURIComponent(jobId)}/render/sync`, {
      method: "POST",
    });
    applyBalance(data.balance);
    return data;
  },
  async upload({ requestId = crypto.randomUUID(), jobId, video, mimeType = "video/webm" }) {
    requirePlatformLogin();
    if (!(video instanceof Blob) || !jobId) throw new Error("업로드할 영상을 확인하지 못했습니다.");
    const data = await request(`/lounge/shorts/${encodeURIComponent(jobId)}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": mimeType,
        "X-Request-Id": requestId,
        "X-File-Size": String(video.size),
      },
      body: video,
    });
    applyBalance(data.balance);
    return data;
  },
  async release({ requestId = crypto.randomUUID(), jobId, reason = "user_cancelled" }) {
    requirePlatformLogin();
    const data = await request(`/lounge/shorts/${encodeURIComponent(jobId)}/release`, {
      method: "POST",
      headers: { "X-Request-Id": requestId },
      body: JSON.stringify({ requestId, reason }),
    });
    applyBalance(data.balance);
    return data;
  },
  async publish({ publishRequestId = crypto.randomUUID(), jobId, title, content, rightsConfirmed }) {
    requirePlatformLogin();
    return request(`/lounge/shorts/${encodeURIComponent(jobId)}/publish`, {
      method: "POST",
      headers: { "X-Request-Id": publishRequestId },
      body: JSON.stringify({ publishRequestId, title, content, rightsConfirmed }),
    });
  },
});

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
  shorts,
  applyBalance,
  acceptCredential,
  errorMessage,
});

void initialize();
