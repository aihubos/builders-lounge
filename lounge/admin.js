const PROVIDER_LABELS = Object.freeze({
  openai: "OpenAI 호환",
  gemini: "Gemini 텍스트",
  "gemini-image": "Gemini 이미지",
  anthropic: "Anthropic",
  webhook: "외부 제작 API",
});

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function status(root, selector, message, error = false) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = message || "";
  node.dataset.error = String(error);
}

function renderTool(tool) {
  return `<form class="admin-tool-form" data-admin-tool-form="${escapeHtml(tool.id)}">
    <div class="admin-tool-title">
      <h5>${escapeHtml(tool.name)}</h5>
      <label class="admin-toggle"><input type="checkbox" name="enabled" ${tool.enabled ? "checked" : ""}><span>사용 허용</span></label>
    </div>
    <div class="admin-tool-fields">
      <label>소모 빌드<input type="number" name="buildCost" min="0" max="10000" value="${Number(tool.cost || 0)}" required></label>
      <label>연결 방식<select name="provider">${Object.entries(PROVIDER_LABELS).map(([id, label]) => `<option value="${id}" ${tool.provider === id ? "selected" : ""}>${label}</option>`).join("")}</select></label>
    </div>
    <label>API 주소<input type="url" name="endpointUrl" maxlength="700" value="${escapeHtml(tool.endpointUrl || "")}" required placeholder="https://..."></label>
    <label>모델<input name="model" maxlength="120" value="${escapeHtml(tool.model || "")}" required placeholder="모델 이름"></label>
    <label>API 키
      <input type="password" name="apiKey" maxlength="10000" autocomplete="new-password" placeholder="${tool.apiKeyConfigured ? "새 키를 입력할 때만 변경됩니다" : "서버에 암호화해 저장할 키"}">
    </label>
    <label>시스템 지시문<textarea name="systemPrompt" maxlength="8000">${escapeHtml(tool.systemPrompt || "")}</textarea></label>
    <div class="admin-tool-actions">
      <button class="primary-button" type="submit">설정 저장</button>
      <button class="secondary-button" type="button" data-admin-clear-key="${escapeHtml(tool.id)}" ${tool.apiKeyConfigured ? "" : "disabled"}>API 키 삭제</button>
      <span class="sample-label">키 ${tool.apiKeyConfigured ? "저장됨" : "없음"}</span>
    </div>
    <p class="admin-status" data-admin-tool-status="${escapeHtml(tool.id)}" role="status"></p>
  </form>`;
}

function renderUser(user, currentEmail) {
  const protectedUser = user.email?.toLocaleLowerCase("en-US") === currentEmail?.toLocaleLowerCase("en-US");
  return `<article class="admin-user-row" data-admin-user="${escapeHtml(user.google_sub)}">
    <span class="admin-user-copy"><strong>${escapeHtml(user.display_name || user.email)}</strong><small>${escapeHtml(user.email)} · ${user.role === "admin" ? "관리자" : "멤버"}</small></span>
    <span class="admin-user-balance">${Number(user.build_balance || 0).toLocaleString("ko-KR")} 빌드</span>
    <form class="admin-user-adjust" data-admin-adjust-form="${escapeHtml(user.google_sub)}">
      <input type="number" name="delta" step="1" placeholder="±빌드" aria-label="조정할 빌드" required>
      <input name="reason" maxlength="200" placeholder="조정 이유" aria-label="조정 이유" required>
      <button class="secondary-button" type="submit">반영</button>
    </form>
    <button class="danger-button" type="button" data-admin-delete-user="${escapeHtml(user.google_sub)}" ${protectedUser ? "disabled" : ""}>계정 삭제</button>
  </article>`;
}

async function loadAdmin(root) {
  const platform = window.BuildersPlatform;
  const session = platform?.snapshot?.();
  if (!session?.user) {
    root.innerHTML = `<section class="admin-shell"><div class="community-empty-state"><strong>관리자 로그인이 필요합니다.</strong><p>Jeremy 관리자 Google 계정으로 로그인해 주세요.</p><button class="primary-button" type="button" data-platform-login-open>Google 로그인</button></div></section>`;
    return;
  }
  if (!session.user.isAdmin) {
    root.innerHTML = `<section class="admin-shell"><div class="community-error-state"><strong>관리자 전용 화면입니다.</strong><p>${escapeHtml(session.user.email)} 계정에는 관리자 권한이 없습니다.</p></div></section>`;
    return;
  }

  root.innerHTML = '<div class="community-loading">관리자 설정을 불러오는 중입니다.</div>';
  try {
    const [settings, userData] = await Promise.all([
      platform.request("/lounge/admin/settings"),
      platform.request("/lounge/admin/users"),
    ]);
    const tools = Array.isArray(settings.tools) ? settings.tools : [];
    const users = Array.isArray(userData.users) ? userData.users : [];
    const admins = Array.isArray(settings.admins) ? settings.admins.filter((item) => Number(item.active || 0) === 1) : [];
    root.innerHTML = `<section class="admin-shell" aria-labelledby="admin-title">
      <div class="admin-summary">
        <div><p class="section-label">BUILDERS LOUNGE · ADMIN</p><h3 id="admin-title">관리자 설정</h3><p>도구별 API·모델·가격과 멤버 빌드를 한곳에서 관리합니다.</p></div>
        <div class="admin-ready-list"><span data-ready="${settings.loginReady}">Google 로그인 ${settings.loginReady ? "완료" : "설정 필요"}</span><span data-ready="${settings.encryptionReady}">API 키 보관 ${settings.encryptionReady ? "완료" : "설정 필요"}</span><span>${users.length}명</span></div>
      </div>
      <section class="admin-section">
        <div class="admin-section-head"><div><h4>AI 도구 설정</h4><p>키는 저장 후 다시 표시되지 않습니다. 새 키를 입력할 때만 교체됩니다.</p></div></div>
        <div class="admin-tool-grid">${tools.map(renderTool).join("")}</div>
      </section>
      <section class="admin-section">
        <div class="admin-section-head"><div><h4>멤버·빌드 관리</h4><p>양수는 충전, 음수는 회수입니다. 모든 조정은 관리자 기록에 남습니다.</p></div></div>
        <div class="admin-user-list">${users.length ? users.map((user) => renderUser(user, session.user.email)).join("") : '<div class="community-empty-state">가입한 멤버가 없습니다.</div>'}</div>
        <p class="admin-status" data-admin-user-status role="status"></p>
      </section>
      <section class="admin-section">
        <div class="admin-section-head"><div><h4>관리자 계정</h4><p>기본 관리자 Jeremy 계정은 삭제할 수 없습니다.</p></div></div>
        <form class="admin-inline-form" data-admin-add-form><input type="email" name="email" maxlength="254" placeholder="추가할 Google 계정 이메일" required><button class="secondary-button" type="submit">관리자 추가</button></form>
        <div class="admin-admin-list">${admins.map((admin) => `<div class="admin-admin-row"><span>${escapeHtml(admin.email)}</span><button class="text-button danger-text" type="button" data-admin-remove="${escapeHtml(admin.email)}" ${admin.email === "jeremylee0213@gmail.com" || admin.email === session.user.email ? "disabled" : ""}>권한 해제</button></div>`).join("")}</div>
        <p class="admin-status" data-admin-admin-status role="status"></p>
      </section>
      <p class="build-tool-guide">Google OAuth 클라이언트 ID와 서버 암호화 키는 로그인 이전에 필요한 기반 설정이므로 Cloudflare Worker 비밀값으로 1회 등록합니다. AI API 키는 위 화면에서 직접 교체·삭제할 수 있습니다.</p>
    </section>`;
  } catch (error) {
    root.innerHTML = `<div class="community-error-state"><strong>관리자 설정을 불러오지 못했습니다.</strong><p>${escapeHtml(error.message)}</p><button class="secondary-button" type="button" data-admin-retry>다시 시도</button></div>`;
  }
}

function toolPayload(form, clearApiKey = false) {
  return {
    enabled: form.elements.enabled.checked,
    buildCost: Number(form.elements.buildCost.value),
    provider: form.elements.provider.value,
    endpointUrl: form.elements.endpointUrl.value.trim(),
    model: form.elements.model.value.trim(),
    apiKey: clearApiKey ? "" : form.elements.apiKey.value.trim(),
    clearApiKey,
    systemPrompt: form.elements.systemPrompt.value,
  };
}

export function mountAdmin(root) {
  if (!(root instanceof HTMLElement)) return { refresh: () => {} };
  const refresh = () => loadAdmin(root);
  root.addEventListener("submit", async (event) => {
    const platform = window.BuildersPlatform;
    const toolForm = event.target.closest("[data-admin-tool-form]");
    if (toolForm) {
      event.preventDefault();
      const toolId = toolForm.dataset.adminToolForm;
      status(root, `[data-admin-tool-status="${toolId}"]`, "저장 중입니다.");
      try {
        await platform.request(`/lounge/admin/tools/${encodeURIComponent(toolId)}`, { method: "PUT", body: JSON.stringify(toolPayload(toolForm)) });
        toolForm.elements.apiKey.value = "";
        status(root, `[data-admin-tool-status="${toolId}"]`, "저장했습니다.");
        await platform.refreshMe();
        window.setTimeout(refresh, 500);
      } catch (error) { status(root, `[data-admin-tool-status="${toolId}"]`, error.message, true); }
      return;
    }
    const adjustForm = event.target.closest("[data-admin-adjust-form]");
    if (adjustForm) {
      event.preventDefault();
      status(root, "[data-admin-user-status]", "빌드를 반영하는 중입니다.");
      try {
        await platform.request(`/lounge/admin/users/${encodeURIComponent(adjustForm.dataset.adminAdjustForm)}/builds`, { method: "POST", body: JSON.stringify({ delta: Number(adjustForm.elements.delta.value), reason: adjustForm.elements.reason.value.trim() }) });
        status(root, "[data-admin-user-status]", "빌드를 반영했습니다.");
        await refresh();
      } catch (error) { status(root, "[data-admin-user-status]", error.message, true); }
      return;
    }
    const addForm = event.target.closest("[data-admin-add-form]");
    if (addForm) {
      event.preventDefault();
      status(root, "[data-admin-admin-status]", "관리자를 추가하는 중입니다.");
      try {
        await platform.request("/lounge/admin/admins", { method: "POST", body: JSON.stringify({ email: addForm.elements.email.value.trim() }) });
        await refresh();
      } catch (error) { status(root, "[data-admin-admin-status]", error.message, true); }
    }
  });

  root.addEventListener("click", async (event) => {
    const platform = window.BuildersPlatform;
    if (event.target.closest("[data-admin-retry]")) { refresh(); return; }
    const clearKey = event.target.closest("[data-admin-clear-key]");
    if (clearKey) {
      const toolId = clearKey.dataset.adminClearKey;
      const form = root.querySelector(`[data-admin-tool-form="${toolId}"]`);
      if (!form || !window.confirm("이 도구의 저장된 API 키를 삭제할까요? 삭제 즉시 생성이 중단됩니다.")) return;
      status(root, `[data-admin-tool-status="${toolId}"]`, "API 키를 삭제하는 중입니다.");
      try {
        await platform.request(`/lounge/admin/tools/${encodeURIComponent(toolId)}`, { method: "PUT", body: JSON.stringify(toolPayload(form, true)) });
        await refresh();
      } catch (error) { status(root, `[data-admin-tool-status="${toolId}"]`, error.message, true); }
      return;
    }
    const deleteUser = event.target.closest("[data-admin-delete-user]");
    if (deleteUser) {
      if (!window.confirm("이 멤버 계정을 삭제할까요? 게시글까지 삭제하려면 다음 확인에서 선택할 수 있습니다.")) return;
      const deleteContent = window.confirm("이 멤버가 작성한 게시글과 댓글도 함께 삭제할까요?");
      try {
        await platform.request(`/lounge/admin/users/${encodeURIComponent(deleteUser.dataset.adminDeleteUser)}`, { method: "DELETE", body: JSON.stringify({ deleteContent }) });
        await refresh();
      } catch (error) { status(root, "[data-admin-user-status]", error.message, true); }
      return;
    }
    const removeAdmin = event.target.closest("[data-admin-remove]");
    if (removeAdmin) {
      if (!window.confirm(`${removeAdmin.dataset.adminRemove} 계정의 관리자 권한을 해제할까요?`)) return;
      try {
        await platform.request(`/lounge/admin/admins/${encodeURIComponent(removeAdmin.dataset.adminRemove)}`, { method: "DELETE", body: "{}" });
        await refresh();
      } catch (error) { status(root, "[data-admin-admin-status]", error.message, true); }
    }
  });

  window.BuildersPlatform?.subscribe?.(() => {
    if (document.documentElement.dataset.loungeRoute === "admin") void refresh();
  });
  void refresh();
  return { refresh };
}

