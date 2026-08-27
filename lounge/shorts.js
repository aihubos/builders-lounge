const EXAMPLES = [
  "AI에게 원하는 답을 받는 질문법을 초보자에게 알려줘.",
  "회의 메모를 결정과 할 일 중심으로 정리하는 방법을 알려줘.",
  "스마트폰으로 음식 사진을 깔끔하게 찍는 방법 3가지를 알려줘.",
];

const RECOVERY_STORAGE_KEY = "builders-lounge-shorts-recovery-v1";
const ACTIVE_JOB_STATUSES = new Set(["reserving", "processing"]);
const TERMINAL_RELEASE_STATUSES = new Set(["released", "expired"]);
const SUPPORTED_MEDIA_TYPES = new Set(["video/webm", "video/mp4"]);
const MPT_KOREAN_VOICE = "ko-KR-HyunsuMultilingualNeural-Male";
const NON_RESERVED_PREPARE_ERRORS = new Set([
  "login_required", "invalid_google_token", "insufficient_builds", "tool_disabled",
  "tool_not_configured", "shorts_cost_misconfigured", "shorts_topic_too_short",
]);
const RETRYABLE_RENDER_ERRORS = new Set([
  "network_error",
  "server_error",
  "shorts_renderer_unreachable",
  "shorts_renderer_request_failed",
]);
const SHORTS_TOOL_ID = "shorts";
const SHORTS_STEP_ORDER = Object.freeze(["input", "plan", "video", "publish"]);
const SHORTS_STEP_LABELS = Object.freeze({
  input: "한 문장",
  plan: "제작 내용",
  video: "영상 결과",
  publish: "수동 게시",
});
const SHORTS_STEP_STATUS_LABELS = Object.freeze({ complete: "완료", current: "현재", waiting: "대기" });
const SHORTS_STEP_ICONS = Object.freeze({ complete: "✓", current: "●", waiting: "○" });

function normalizeBuildCost(value) {
  const cost = Number(value);
  return Number.isFinite(cost) && cost >= 0 ? Math.trunc(cost) : null;
}

function shortsToolSetting(snapshot = window.BuildersPlatform?.snapshot?.()) {
  return window.BuildersPlatform?.getTool?.(SHORTS_TOOL_ID)
    || snapshot?.tools?.find?.((tool) => tool?.id === SHORTS_TOOL_ID)
    || null;
}

function isHttpsUrl(value) {
  try { return new URL(String(value || "")).protocol === "https:"; } catch { return false; }
}

function isSafeMediaUrl(value) {
  try {
    const url = new URL(String(value || ""), window.location.href);
    return url.protocol === "https:"
      || (url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname));
  } catch { return false; }
}

function readRecoveryState() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(RECOVERY_STORAGE_KEY) || "null");
    if (!value || typeof value !== "object") return null;
    const requestId = String(value.requestId || "").slice(0, 128);
    const jobId = String(value.jobId || "").slice(0, 128);
    if (!requestId && !jobId) return null;
    return {
      requestId,
      jobId,
      publishRequestId: String(value.publishRequestId || "").slice(0, 128),
      topic: String(value.topic || "").slice(0, 300),
      settings: {
        subtitles: value.settings?.subtitles !== false,
        subtitleStyle: ["basic", "emphasis", "minimal"].includes(value.settings?.subtitleStyle) ? value.settings.subtitleStyle : "basic",
        voice: value.settings?.voice === true,
        voiceId: String(value.settings?.voiceId || "auto").slice(0, 80),
      },
    };
  } catch { return null; }
}

function writeRecoveryState(value) {
  try { window.sessionStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(value)); } catch { /* 저장소가 제한되어도 서버 작업은 계속합니다. */ }
}

function clearRecoveryState() {
  try { window.sessionStorage.removeItem(RECOVERY_STORAGE_KEY); } catch { /* 저장소가 제한되어도 화면은 초기화합니다. */ }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function supportedMimeType() {
  return ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
    .find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

function canvasLines(context, text, maxWidth, maxLines = 6) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.join(" ").length < words.join(" ").length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.…]*$/, "")}…`;
  }
  return lines;
}

function drawScene(context, canvas, scene, index, total, subtitleStyle) {
  const palettes = [
    ["#eef4ff", "#dbeafe", "#1457d9"],
    ["#f2f7ff", "#e0e7ff", "#4f46e5"],
    ["#eff6ff", "#cffafe", "#0369a1"],
    ["#f8fafc", "#e2e8f0", "#1e40af"],
  ];
  const [start, end, accent] = palettes[index % palettes.length];
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, start);
  gradient.addColorStop(1, end);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = accent;
  context.beginPath();
  context.arc(canvas.width - 70, 100, 150, 0, Math.PI * 2);
  context.globalAlpha = 0.12;
  context.fill();
  context.globalAlpha = 1;

  context.fillStyle = "#0f172a";
  context.font = "700 34px Pretendard, system-ui, sans-serif";
  context.fillText(`BUILDERS SHORTS · ${String(index + 1).padStart(2, "0")}`, 58, 82);

  context.font = "800 62px Pretendard, system-ui, sans-serif";
  const titleLines = canvasLines(context, scene.title || `장면 ${index + 1}`, canvas.width - 116, 3);
  titleLines.forEach((line, lineIndex) => context.fillText(line, 58, 230 + lineIndex * 76));

  context.fillStyle = "#334155";
  context.font = "500 38px Pretendard, system-ui, sans-serif";
  const visualLines = canvasLines(context, scene.visual || scene.narration, canvas.width - 116, 7);
  visualLines.forEach((line, lineIndex) => context.fillText(line, 58, 520 + lineIndex * 56));

  const subtitle = String(scene.subtitle || scene.narration || "").trim();
  if (subtitle) {
    const minimal = subtitleStyle === "minimal";
    context.fillStyle = minimal ? "rgba(15,23,42,.82)" : "rgba(15,23,42,.94)";
    context.beginPath();
    if (typeof context.roundRect === "function") {
      context.roundRect(38, canvas.height - 300, canvas.width - 76, 220, 30);
    } else {
      context.rect(38, canvas.height - 300, canvas.width - 76, 220);
    }
    context.fill();
    context.fillStyle = subtitleStyle === "emphasis" ? "#fef08a" : "#ffffff";
    context.textAlign = "center";
    context.font = `${subtitleStyle === "emphasis" ? "800" : "700"} 42px Pretendard, system-ui, sans-serif`;
    const subtitleLines = canvasLines(context, subtitle, canvas.width - 130, 3);
    const startY = canvas.height - 220 - ((subtitleLines.length - 1) * 28);
    subtitleLines.forEach((line, lineIndex) => context.fillText(line, canvas.width / 2, startY + lineIndex * 56));
    context.textAlign = "left";
  }

  context.fillStyle = "rgba(15,23,42,.28)";
  context.fillRect(58, canvas.height - 42, canvas.width - 116, 8);
  context.fillStyle = accent;
  context.fillRect(58, canvas.height - 42, (canvas.width - 116) * ((index + 1) / total), 8);
}

async function audioTrackForScenes(scenes, narrationUrl) {
  const urls = narrationUrl
    ? [narrationUrl]
    : scenes.map((scene) => scene.audioUrl).filter(Boolean);
  if (!urls.length) return { tracks: [], start: () => {}, close: async () => {} };
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("이 브라우저는 음성 합성을 지원하지 않습니다.");
  const context = new AudioContextClass();
  const destination = context.createMediaStreamDestination();
  const buffers = [];
  for (const url of urls) {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) throw new Error("음성 파일을 불러오지 못했습니다.");
    buffers.push(await context.decodeAudioData(await response.arrayBuffer()));
  }
  const sources = buffers.map((buffer) => {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    return source;
  });
  return {
    tracks: destination.stream.getAudioTracks(),
    start: () => {
      let offset = context.currentTime + 0.1;
      sources.forEach((source, index) => {
        source.start(offset);
        offset += narrationUrl ? 0 : Math.max(0.1, Number(scenes[index]?.durationSeconds || source.buffer.duration));
      });
    },
    close: () => context.close(),
  };
}

async function renderWebm({ scenes, subtitles, subtitleStyle, voice, narrationUrl, onProgress }) {
  const mimeType = supportedMimeType();
  if (!mimeType || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error("이 브라우저는 WebM 영상 만들기를 지원하지 않습니다.");
  }
  const hasAudio = Boolean(narrationUrl || scenes.some((scene) => scene.audioUrl));
  if (voice && !hasAudio) {
    throw new Error("실제 한국어 음성이 아직 준비되지 않아 영상을 만들지 않았습니다. 음성을 끄거나 렌더 서버 연결 후 다시 시도해 주세요.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const context = canvas.getContext("2d");
  const canvasStream = canvas.captureStream(30);
  const audio = voice ? await audioTrackForScenes(scenes, narrationUrl) : { tracks: [], start: () => {}, close: async () => {} };
  const stream = new MediaStream([...canvasStream.getVideoTracks(), ...audio.tracks]);
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
  const stopped = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
    recorder.onerror = () => reject(recorder.error || new Error("영상 녹화를 완료하지 못했습니다."));
    recorder.onstop = resolve;
  });
  recorder.start(500);
  audio.start();
  const totalMs = scenes.reduce((sum, scene) => sum + Math.max(2, Number(scene.durationSeconds || 4)) * 1000, 0);
  let elapsedMs = 0;
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const durationMs = Math.max(2, Number(scene.durationSeconds || 4)) * 1000;
    const startedAt = performance.now();
    while (performance.now() - startedAt < durationMs) {
      drawScene(context, canvas, { ...scene, subtitle: subtitles ? scene.subtitle : "" }, index, scenes.length, subtitleStyle);
      const sceneElapsed = Math.min(durationMs, performance.now() - startedAt);
      onProgress?.(Math.min(99, Math.round(((elapsedMs + sceneElapsed) / totalMs) * 100)));
      await wait(1000 / 30);
    }
    elapsedMs += durationMs;
  }
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  await audio.close();
  onProgress?.(100);
  const blob = new Blob(chunks, { type: "video/webm" });
  if (!blob.size) throw new Error("완성된 영상 파일이 비어 있습니다.");
  return blob;
}

function statusText(root, message, error = false) {
  const status = root.querySelector("[data-shorts-status]");
  if (!status) return;
  status.textContent = message;
  status.dataset.error = String(error);
}

export function mountShorts(root) {
  if (!(root instanceof HTMLElement)) return;
  const state = {
    requestId: "",
    jobId: "",
    plan: null,
    video: null,
    previewUrl: "",
    mediaUrl: "",
    mediaType: "",
    publishRequestId: "",
    published: null,
    publishStatus: "",
    serverStatus: "",
    renderBlocked: false,
    restoring: false,
    preparing: false,
    recentLookupAttempted: false,
    recentLookupInFlight: false,
    rendererReady: false,
    authenticated: false,
    cost: null,
    toolConfigured: false,
    toolEnabled: false,
    toolApiConfigured: false,
    progressTimer: 0,
    busy: false,
    lastProgressAnnouncement: "",
  };

  root.innerHTML = `<section class="shorts-studio" aria-labelledby="shorts-title">
    <header class="shorts-heading">
      <div><p class="section-label">MAKE · VERTICAL VIDEO</p><h3 id="shorts-title">쇼츠 만들기</h3><p>주제 한 문장만 적으면 AI가 제작 내용을 정리해 실제 세로 영상을 만듭니다.</p></div>
      <div class="shorts-cost" data-shorts-cost-card><strong data-shorts-cost-value>쇼츠 비용 확인 중</strong><span data-shorts-cost-note>관리자 설정을 확인하고 있습니다.</span></div>
    </header>
    <div class="shorts-flow" role="list" aria-label="쇼츠 제작 단계"><span role="listitem" data-step="input" data-step-state="current" aria-current="step"><i data-step-icon aria-hidden="true">●</i><b data-step-label>한 문장</b><small data-step-status>현재</small></span><span role="listitem" data-step="plan" data-step-state="waiting"><i data-step-icon aria-hidden="true">○</i><b data-step-label>제작 내용</b><small data-step-status>대기</small></span><span role="listitem" data-step="video" data-step-state="waiting"><i data-step-icon aria-hidden="true">○</i><b data-step-label>영상 결과</b><small data-step-status>대기</small></span><span role="listitem" data-step="publish" data-step-state="waiting"><i data-step-icon aria-hidden="true">○</i><b data-step-label>수동 게시</b><small data-step-status>대기</small></span></div>
    <section class="shorts-production-progress" data-shorts-progress hidden role="group" aria-labelledby="shorts-progress-label">
      <span class="shorts-progress-animation" aria-hidden="true"><i></i></span>
      <div class="shorts-progress-copy"><strong id="shorts-progress-label" data-shorts-progress-label>제작 작업을 시작합니다</strong><p data-shorts-progress-detail>작업을 시작하고 있어요.</p><progress data-shorts-progress-bar max="100" value="0" aria-label="쇼츠 제작 진행률">0%</progress></div>
      <b data-shorts-progress-value>0%</b>
      <span class="visually-hidden" data-shorts-progress-live aria-live="polite"></span>
    </section>
    <section class="shorts-recovery" data-shorts-recovery hidden>
      <div><strong data-recovery-title>진행 중인 작업을 확인하고 있어요.</strong><p data-recovery-copy>서버 상태를 확인한 뒤 이어서 보여 드립니다.</p></div>
      <div class="shorts-actions"><button class="secondary-button" type="button" data-platform-login-open hidden>Google 로그인</button><button class="primary-button" type="button" data-shorts-recover>상태 다시 확인</button></div>
    </section>
    <section class="shorts-panel" data-shorts-input>
      <label class="shorts-topic">만들고 싶은 쇼츠<textarea rows="4" minlength="5" maxlength="300" placeholder="예: 회의 메모를 결정과 할 일 중심으로 정리하는 방법을 알려줘."></textarea><small>5자 이상 300자 이하로 적어 주세요.</small></label>
      <div class="shorts-examples" aria-label="입력 예시">${EXAMPLES.map((example) => `<button type="button" data-example="${escapeHtml(example)}">${escapeHtml(example)}</button>`).join("")}</div>
      <details class="shorts-settings"><summary>상세 설정 <small>자막과 음성 적용 상태를 확인할 수 있어요.</small></summary>
        <div class="shorts-settings-grid">
          <label class="shorts-switch"><input type="checkbox" name="subtitles" checked><span>자막 사용</span><small>영상 내용을 화면 글자로 보여줍니다.</small></label>
          <label>자막 스타일<select name="subtitleStyle"><option value="basic">기본</option><option value="emphasis">강조</option><option value="minimal">간결</option></select></label>
          <label class="shorts-switch"><input type="checkbox" name="voice" data-renderer-control disabled><span>한국어 음성 사용</span><small data-renderer-voice-note>렌더 서버가 연결되면 한국어 음성을 포함합니다.</small></label>
          <label>목소리 선택<select name="voiceId" data-renderer-control disabled><option value="${MPT_KOREAN_VOICE}">한국어 남성 음성</option></select></label>
        </div>
      </details>
      <p class="shorts-note" data-shorts-cost-note>쇼츠 비용을 확인하고 있습니다. 영상 저장 성공 시 관리자 설정 비용을 사용하며, 실패하거나 취소되면 사용되지 않아요.</p>
      <p class="shorts-render-state" data-shorts-render-state role="status">렌더 서버 연결 상태를 확인하고 있습니다.</p>
      <div class="shorts-login-gate" data-shorts-login-gate>
        <div><strong>Google 로그인 후 제작할 수 있어요.</strong><p>사이트 상단과 같은 계정으로 빌드 잔액과 작업을 연결합니다.</p></div>
        <button class="secondary-button" type="button" data-platform-login-open>Google 로그인</button>
      </div>
      <button class="primary-button" type="button" data-shorts-prepare data-auth-required disabled>Google 로그인 후 제작</button>
    </section>
    <section class="shorts-panel" data-shorts-plan hidden></section>
    <section class="shorts-panel" data-shorts-result hidden></section>
    <p class="shorts-status" data-shorts-status role="status">한 문장으로 시작해 주세요.</p>
    <p class="shorts-license">이 쇼츠 제작기는 <a href="https://github.com/harry0703/MoneyPrinterTurbo" target="_blank" rel="noopener">Harry의 MoneyPrinterTurbo</a> 제작 흐름을 참고했습니다. <a href="THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener">MIT 라이선스</a></p>
  </section>`;

  const inputPanel = root.querySelector("[data-shorts-input]");
  const planPanel = root.querySelector("[data-shorts-plan]");
  const resultPanel = root.querySelector("[data-shorts-result]");
  const recoveryPanel = root.querySelector("[data-shorts-recovery]");
  const progressPanel = root.querySelector("[data-shorts-progress]");
  const progressLabel = progressPanel.querySelector("[data-shorts-progress-label]");
  const progressDetail = progressPanel.querySelector("[data-shorts-progress-detail]");
  const progressBar = progressPanel.querySelector("[data-shorts-progress-bar]");
  const progressValue = progressPanel.querySelector("[data-shorts-progress-value]");
  const progressLive = progressPanel.querySelector("[data-shorts-progress-live]");
  const topicInput = inputPanel.querySelector("textarea");
  const subtitlesInput = inputPanel.querySelector('[name="subtitles"]');
  const subtitleStyleInput = inputPanel.querySelector('[name="subtitleStyle"]');
  const voiceInput = inputPanel.querySelector('[name="voice"]');
  const voiceIdInput = inputPanel.querySelector('[name="voiceId"]');
  const prepareButton = inputPanel.querySelector("[data-shorts-prepare]");
  const loginGate = inputPanel.querySelector("[data-shorts-login-gate]");

  const costLabel = () => state.cost === null
    ? "관리자 설정 비용"
    : `${state.cost.toLocaleString("ko-KR")}빌드`;
  const costHeaderLabel = () => state.cost === null ? "쇼츠 비용 확인 중" : `${state.cost.toLocaleString("ko-KR")} 빌드`;
  const updateCostCopy = (snapshot = window.BuildersPlatform?.snapshot?.()) => {
    const setting = shortsToolSetting(snapshot);
    state.cost = normalizeBuildCost(setting?.cost);
    state.toolConfigured = Boolean(setting);
    state.toolEnabled = Boolean(setting?.enabled);
    state.toolApiConfigured = Boolean(setting?.apiKeyConfigured);
    const value = root.querySelector("[data-shorts-cost-value]");
    if (value) value.textContent = costHeaderLabel();
    root.querySelectorAll("[data-shorts-cost-note]").forEach((node) => {
      if (node.matches(".shorts-note")) {
        node.textContent = state.cost === null
          ? "쇼츠 비용을 확인하고 있습니다. 영상 저장 성공 시 관리자 설정 비용을 사용하며, 실패하거나 취소되면 사용되지 않아요."
          : `영상 저장 성공 시 ${costLabel()} 사용 · 실패하거나 취소되면 사용되지 않아요.`;
      } else {
        node.textContent = state.cost === null
          ? "관리자 설정을 확인하고 있습니다."
          : (state.toolEnabled && state.toolApiConfigured
            ? "영상 저장 성공 시 사용"
            : "관리자 설정 확인 필요 · 현재 제작 요청은 서버에서 확인합니다.");
      }
    });
    root.querySelectorAll("[data-shorts-cost-reserved]").forEach((node) => { node.textContent = `${costLabel()} 사용 예정`; });
    root.querySelectorAll("[data-shorts-cost-completed]").forEach((node) => { node.textContent = `${costLabel()} 사용 완료`; });
    const card = root.querySelector("[data-shorts-cost-card]");
    if (card) {
      card.dataset.state = state.cost === null ? "unknown" : "ready";
      card.setAttribute("aria-label", state.cost === null ? "쇼츠 비용 확인 중" : `쇼츠 비용 ${costLabel()}`);
    }
  };

  const stopProgressAnimation = () => {
    if (state.progressTimer) window.clearInterval(state.progressTimer);
    state.progressTimer = 0;
  };
  const showProgress = (value, label, detail, mode = "working") => {
    const percent = Math.max(0, Math.min(100, Math.trunc(Number(value) || 0)));
    const liveCopy = `${label}. ${detail}`;
    progressPanel.hidden = false;
    progressPanel.dataset.mode = mode;
    progressLabel.textContent = label;
    progressDetail.textContent = detail;
    progressBar.value = percent;
    progressBar.textContent = `${percent}%`;
    progressValue.textContent = `${percent}%`;
    if (progressLive && progressLive.textContent !== liveCopy) progressLive.textContent = liveCopy;
  };
  const hideProgress = () => {
    stopProgressAnimation();
    progressPanel.hidden = true;
    progressPanel.dataset.mode = "idle";
  };
  const startEstimatedProgress = () => {
    stopProgressAnimation();
    let percent = 6;
    showProgress(percent, "제작 내용을 구성하고 있어요", "AI가 핵심 문장과 장면 순서를 정리합니다. 이 단계의 %는 예상 진행률입니다.");
    state.progressTimer = window.setInterval(() => {
      percent = Math.min(88, percent + Math.max(1, Math.ceil((88 - percent) * 0.08)));
      showProgress(percent, "제작 내용을 구성하고 있어요", "완성되면 장면별 문구와 화면 설명을 직접 수정할 수 있어요.");
    }, 650);
  };

  const announceProgress = (message, progress, phase = "working", error = false) => {
    const value = Math.max(0, Math.min(100, Math.trunc(Number(progress) || 0)));
    const bucket = value >= 100 ? 100 : Math.floor(value / 10) * 10;
    const key = `${phase}:${bucket}`;
    if (state.lastProgressAnnouncement === key) return;
    state.lastProgressAnnouncement = key;
    statusText(root, message, error);
  };

  const setStep = (step) => {
    const activeIndex = Math.max(0, SHORTS_STEP_ORDER.indexOf(step));
    root.querySelectorAll("[data-step]").forEach((item) => {
      const itemIndex = SHORTS_STEP_ORDER.indexOf(item.dataset.step);
      const stateName = itemIndex < activeIndex ? "complete" : itemIndex === activeIndex ? "current" : "waiting";
      item.dataset.stepState = stateName;
      if (stateName === "current") item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      const icon = item.querySelector("[data-step-icon]");
      const status = item.querySelector("[data-step-status]");
      if (icon) icon.textContent = SHORTS_STEP_ICONS[stateName];
      if (status) status.textContent = SHORTS_STEP_STATUS_LABELS[stateName];
      item.setAttribute("aria-label", `${itemIndex + 1} ${SHORTS_STEP_LABELS[item.dataset.step]} · ${SHORTS_STEP_STATUS_LABELS[stateName]}`);
    });
  };
  setStep("input");
  updateCostCopy();
  const currentSettings = () => ({
    subtitles: subtitlesInput.checked,
    subtitleStyle: subtitleStyleInput.value,
    voice: state.rendererReady ? true : voiceInput.checked,
    voiceId: state.rendererReady ? MPT_KOREAN_VOICE : voiceIdInput.value,
  });
  const persistRecovery = () => {
    if (!state.requestId && !state.jobId) return;
    writeRecoveryState({
      requestId: state.requestId,
      jobId: state.jobId,
      publishRequestId: state.publishRequestId,
      topic: topicInput.value.trim(),
      settings: currentSettings(),
    });
  };
  const restoreInputs = (saved) => {
    if (!saved) return;
    topicInput.value = saved.topic || topicInput.value;
    subtitlesInput.checked = state.rendererReady ? true : saved.settings.subtitles;
    subtitleStyleInput.value = saved.settings.subtitleStyle;
    voiceInput.checked = state.rendererReady ? true : saved.settings.voice;
    voiceIdInput.value = saved.settings.voiceId === MPT_KOREAN_VOICE ? saved.settings.voiceId : MPT_KOREAN_VOICE;
    subtitlesInput.disabled = state.rendererReady;
    subtitleStyleInput.disabled = state.rendererReady || !subtitlesInput.checked;
    voiceInput.disabled = true;
    voiceIdInput.disabled = true;
  };
  const applyRendererAvailability = (snapshot) => {
    const rendererConfigured = Boolean(snapshot?.config && typeof snapshot.config.shortsRendererReady === "boolean");
    if (rendererConfigured) state.rendererReady = snapshot.config.shortsRendererReady;
    const voiceNote = inputPanel.querySelector("[data-renderer-voice-note]");
    const rendererNote = inputPanel.querySelector("[data-shorts-render-state]");
    if (!rendererConfigured) {
      if (rendererNote) rendererNote.textContent = snapshot?.loading
        ? "렌더 서버 연결 상태를 확인하고 있습니다."
        : "렌더 서버 연결 정보를 확인하지 못했습니다. 브라우저 무음 WebM 경로를 사용할 수 있습니다.";
      if (voiceNote && !snapshot?.loading) voiceNote.textContent = "렌더 서버가 연결되지 않아 브라우저 무음 WebM으로 진행합니다.";
      return;
    }
    voiceInput.checked = state.rendererReady;
    voiceInput.disabled = true;
    voiceIdInput.value = MPT_KOREAN_VOICE;
    voiceIdInput.disabled = true;
    if (state.rendererReady) {
      subtitlesInput.checked = true;
      subtitlesInput.disabled = true;
      subtitleStyleInput.disabled = true;
      if (voiceNote) voiceNote.textContent = "MoneyPrinterTurbo가 한국어 음성과 자막을 함께 만듭니다.";
      if (rendererNote) rendererNote.textContent = "MoneyPrinterTurbo 렌더 서버 연결됨 · 한국어 음성을 포함해 제작합니다.";
    } else {
      subtitlesInput.disabled = state.busy;
      subtitleStyleInput.disabled = state.busy || !subtitlesInput.checked;
      if (voiceNote) voiceNote.textContent = "렌더 서버가 연결되지 않아 브라우저 무음 WebM으로 진행합니다.";
      if (rendererNote) rendererNote.textContent = "MoneyPrinterTurbo 렌더 서버 연결 안 됨 · 브라우저 무음 WebM으로 진행합니다.";
    }
  };
  const showRecovery = (title, copy, error = false) => {
    const authenticated = Boolean(window.BuildersPlatform?.snapshot?.().authenticated);
    recoveryPanel.hidden = false;
    recoveryPanel.dataset.error = String(error);
    recoveryPanel.querySelector("[data-recovery-title]").textContent = title;
    recoveryPanel.querySelector("[data-recovery-copy]").textContent = copy;
    recoveryPanel.querySelector("[data-platform-login-open]").hidden = authenticated;
    recoveryPanel.querySelector("[data-shorts-recover]").hidden = !authenticated;
    inputPanel.hidden = true;
    planPanel.hidden = true;
    resultPanel.hidden = true;
  };
  const hideRecovery = () => { recoveryPanel.hidden = true; recoveryPanel.dataset.error = "false"; };
  const setBusy = (busy) => {
    state.busy = busy;
    root.querySelectorAll("button, textarea, select, input").forEach((control) => {
      if (control.matches("[data-renderer-control]")) control.disabled = true;
      else if (state.published && control.closest("[data-shorts-publish]")) control.disabled = true;
      else if (control.matches('[name="subtitles"], [name="subtitleStyle"]') && state.rendererReady) control.disabled = true;
      else if (control.matches('[name="subtitleStyle"]')) control.disabled = !subtitlesInput.checked || busy;
      else if (control.matches("[data-rights-submit]")) control.disabled = busy || !root.querySelector('[name="rights"]')?.checked;
      else if (control.matches("[data-auth-required]")) control.disabled = busy || state.renderBlocked || !state.authenticated;
      else control.disabled = busy;
    });
    prepareButton.textContent = state.authenticated ? "제작 내용 만들기" : "Google 로그인 후 제작";
    loginGate.hidden = state.authenticated;
    root.querySelectorAll("[data-shorts-plan-login]").forEach((notice) => { notice.hidden = state.authenticated; });
    root.querySelectorAll("[data-shorts-render]").forEach((button) => {
      button.textContent = state.authenticated ? "수정 내용 저장하고 영상 만들기" : "Google 로그인 후 영상 제작";
    });
  };
  const resetPreparedState = ({ clearStored = true } = {}) => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.requestId = "";
    state.jobId = "";
    state.plan = null;
    state.video = null;
    state.previewUrl = "";
    state.mediaUrl = "";
    state.mediaType = "";
    state.publishRequestId = "";
    state.published = null;
    state.publishStatus = "";
    state.serverStatus = "";
    state.renderBlocked = false;
    state.restoring = false;
    hideProgress();
    if (clearStored) clearRecoveryState();
    hideRecovery();
    planPanel.hidden = true;
    resultPanel.hidden = true;
    inputPanel.hidden = false;
    setStep("input");
  };

  const renderPlan = (plan, { restored = false } = {}) => {
    const scenes = Array.isArray(plan?.scenes) ? plan.scenes : [];
    if (!scenes.length) throw new Error("서버에서 장면 구성을 아직 확인하지 못했습니다.");
    state.plan = { ...plan, scenes };
    state.renderBlocked = false;
    hideRecovery();
    inputPanel.hidden = true;
    resultPanel.hidden = true;
    planPanel.hidden = false;
    hideProgress();
    const topic = topicInput.value.trim() || "복구된 쇼츠 작업";
    planPanel.innerHTML = `<div class="shorts-panel-head"><div><span>${restored ? "서버에서 복구한 제작 내용" : "AI가 정리한 제작 내용"}</span><h4>${escapeHtml(topic)}</h4></div><span class="shorts-reserved" data-shorts-cost-reserved>${escapeHtml(costLabel())} 사용 예정</span></div>
      <p class="shorts-edit-guide"><strong>영상 제작 전에 내용을 고칠 수 있어요.</strong><span>전체 방향, 장면 제목, 화면 구성, 내레이션과 자막을 수정한 뒤 최종 제작을 눌러 주세요.</span></p>
      <form data-shorts-plan-form>
        <label>전체 제작 방향<textarea name="detailedPrompt" data-detailed-prompt rows="7" minlength="5" maxlength="30000" required>${escapeHtml(plan.detailedPrompt || "")}</textarea></label>
        <div class="shorts-scenes shorts-scene-editors"><strong>장면 구성 ${scenes.length}개</strong>${scenes.map((scene, index) => `<article data-scene-editor>
          <span>${index + 1}</span>
          <div class="shorts-scene-fields">
            <label>장면 제목<input data-scene-title maxlength="80" required value="${escapeHtml(scene.title || `장면 ${index + 1}`)}"></label>
            <label>화면 구성<textarea data-scene-visual rows="2" maxlength="400" required>${escapeHtml(scene.visual || "")}</textarea></label>
            <label>내레이션<textarea data-scene-narration rows="3" maxlength="600" required>${escapeHtml(scene.narration || scene.subtitle || "")}</textarea></label>
            <div class="shorts-scene-row"><label>화면 자막<input data-scene-subtitle maxlength="140" required value="${escapeHtml(scene.subtitle || scene.narration || "")}"></label><label>장면 길이(초)<input data-scene-duration type="number" min="2" max="8" step="1" required value="${Math.max(2, Math.min(8, Math.trunc(Number(scene.durationSeconds) || 4)))}"></label></div>
          </div>
        </article>`).join("")}</div>
      </form>
      <div class="shorts-plan-login" data-shorts-plan-login${state.authenticated ? " hidden" : ""}><span>Google 로그인 상태에서만 최종 영상을 제작할 수 있어요.</span><button class="secondary-button" type="button" data-platform-login-open>Google 로그인</button></div>
      <div class="shorts-actions"><button class="secondary-button" type="button" data-shorts-cancel>생성 취소</button><button class="primary-button" type="button" data-shorts-render data-auth-required${state.authenticated ? "" : " disabled"}>${state.authenticated ? "수정 내용 저장하고 영상 만들기" : "Google 로그인 후 영상 제작"}</button></div>`;
    setStep("plan");
    persistRecovery();
  };

  const editedPlan = () => {
    const form = planPanel.querySelector("[data-shorts-plan-form]");
    if (!form) throw new Error("수정할 제작 내용을 찾지 못했습니다.");
    if (!form.checkValidity()) {
      form.reportValidity();
      throw new Error("비어 있거나 범위를 벗어난 제작 내용을 확인해 주세요.");
    }
    const detailedPrompt = form.elements.detailedPrompt.value.trim();
    const scenes = [...form.querySelectorAll("[data-scene-editor]")].map((card, index) => ({
      id: index + 1,
      title: card.querySelector("[data-scene-title]").value.trim(),
      visual: card.querySelector("[data-scene-visual]").value.trim(),
      narration: card.querySelector("[data-scene-narration]").value.trim(),
      subtitle: card.querySelector("[data-scene-subtitle]").value.trim(),
      durationSeconds: Math.max(2, Math.min(8, Math.trunc(Number(card.querySelector("[data-scene-duration]").value) || 4))),
      audioUrl: "",
    }));
    if (detailedPrompt.length < 5 || scenes.length < 2 || scenes.some((scene) => !scene.title || !scene.visual || !scene.narration || !scene.subtitle)) {
      throw new Error("전체 제작 방향과 각 장면의 제목·화면·내레이션·자막을 모두 적어 주세요.");
    }
    return { detailedPrompt, scenes, narrationUrl: "" };
  };

  const revealRestoredPlan = (message) => {
    planPanel.querySelector("[data-shorts-render-notice]")?.remove();
    const notice = document.createElement("div");
    notice.className = "shorts-render-notice";
    notice.dataset.shortsRenderNotice = "";
    notice.setAttribute("role", "status");
    const title = document.createElement("strong");
    title.textContent = "제작 내용은 안전하게 복원됐어요.";
    const copy = document.createElement("p");
    copy.textContent = message;
    notice.append(title, copy);
    planPanel.prepend(notice);
    window.requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      planPanel.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    });
  };

  const boardPostUrl = (postId) => {
    const target = new URL(window.location.href);
    target.search = "";
    target.searchParams.set("post", postId);
    target.hash = "board";
    return target.href;
  };

  const renderPublished = (published, { restored = false } = {}) => {
    const form = resultPanel.querySelector("[data-shorts-publish]");
    if (!form) return;
    state.published = published;
    state.publishStatus = "active";
    state.publishRequestId = published.publishRequestId || state.publishRequestId;
    form.querySelector('button[type="submit"]')?.remove();
    form.querySelectorAll("input, textarea").forEach((control) => { control.disabled = true; });
    const publishStatus = form.querySelector("[data-publish-status]");
    publishStatus.dataset.error = "false";
    publishStatus.innerHTML = `<strong>${restored ? "게시 상태 복구 완료" : "게시판 등록 완료"}</strong><span>게시판 등록에는 Build가 추가로 사용되지 않았습니다.</span><a class="primary-button" href="${escapeHtml(published.postUrl)}">게시글 보기</a>`;
    setStep("publish");
    statusText(root, restored ? "서버에서 게시글 1건을 확인해 화면을 복원했습니다." : "게시글 1건이 등록됐습니다. 재시도해도 같은 글을 사용합니다.");
    persistRecovery();
  };

  const renderResult = ({ mediaUrl, video, mediaType = "", publishStatus = "", published = null, restored = false } = {}) => {
    const resolvedMediaType = String(mediaType || video?.type || "").split(";", 1)[0].trim();
    if (!(video instanceof Blob) || !video.size || !SUPPORTED_MEDIA_TYPES.has(resolvedMediaType)) {
      throw new Error("복원할 영상 파일 형식을 확인하지 못했습니다.");
    }
    state.video = video;
    state.mediaUrl = mediaUrl;
    state.mediaType = resolvedMediaType;
    state.publishStatus = publishStatus;
    state.published = null;
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = URL.createObjectURL(video);
    hideRecovery();
    inputPanel.hidden = true;
    planPanel.hidden = true;
    resultPanel.hidden = false;
    stopProgressAnimation();
    showProgress(100, "쇼츠 영상이 완성됐어요", `영상 저장과 ${costLabel()} 확정을 서버에서 확인했습니다.`, "complete");
    const deleted = publishStatus === "deleted";
    if (deleted) state.publishRequestId = "";
    const topic = topicInput.value.trim() || "완성된 쇼츠 영상";
    const detailedPrompt = String(state.plan?.detailedPrompt || "완성된 쇼츠 영상을 공유합니다.").slice(0, 5000);
    const extension = resolvedMediaType === "video/mp4" ? "mp4" : "webm";
    const formatLabel = extension.toUpperCase();
    resultPanel.innerHTML = `<div class="shorts-panel-head"><div><span>${restored ? "서버에서 복구한 영상" : "영상이 완성됐어요"}</span><h4>게시 전 결과를 확인해 주세요.</h4></div><span class="shorts-completed" data-shorts-cost-completed>${escapeHtml(costLabel())} 사용 완료</span></div>
      ${deleted ? '<div class="shorts-recovery-note"><strong>기존 게시글은 삭제되었습니다.</strong><p>이전 공개 링크와 성공 화면은 재사용하지 않습니다. 아래 내용을 확인하고 새 게시 요청으로 다시 등록할 수 있습니다.</p></div>' : ""}
      <div class="shorts-result-grid"><video controls playsinline preload="metadata" src="${escapeHtml(state.previewUrl)}" aria-label="완성된 쇼츠 미리보기"></video>
        <div class="shorts-result-copy"><p>이 영상은 ${published ? "게시판에 등록된 상태입니다." : "아직 게시판에 등록되지 않았습니다."}</p><a class="secondary-button" download="builders-shorts-${escapeHtml(state.jobId)}.${extension}" href="${escapeHtml(state.previewUrl)}">다운로드</a><small>${(video.size / 1024 / 1024).toFixed(1)}MB · ${formatLabel} · 세로형 9:16</small></div></div>
      <form data-shorts-publish><h4>게시판에 등록</h4><p>제목, 설명, 영상과 등록 위치를 확인해 주세요. 버튼을 누르기 전에는 게시되지 않습니다.</p>
        <div class="shorts-publish-grid"><label>게시글 제목<input name="title" minlength="4" maxlength="100" required value="${escapeHtml(topic.slice(0, 100))}"></label><label>등록 위치<input value="공개 게시판 · 정보 공유" readonly></label></div>
        <label>게시글 설명<textarea name="content" minlength="10" maxlength="5000" required>${escapeHtml(detailedPrompt)}</textarea></label>
        <div class="shorts-media-check"><span>등록할 영상</span><code>${escapeHtml(state.mediaUrl)}</code></div>
        <label class="shorts-rights"><input type="checkbox" name="rights">사용하는 자료와 게시 내용에 필요한 권리를 확인했습니다.</label>
        <button class="primary-button" type="submit" data-rights-submit disabled>게시판에 등록</button><p data-publish-status role="status"></p>
      </form>`;
    const form = resultPanel.querySelector("[data-shorts-publish]");
    const rights = form.elements.rights;
    const publishButton = form.querySelector('button[type="submit"]');
    rights.addEventListener("change", () => { publishButton.disabled = state.busy || !rights.checked; });
    setStep("video");
    persistRecovery();
    if (published) renderPublished(published, { restored });
    else if (deleted) statusText(root, "기존 게시글 삭제를 확인했습니다. 새 게시 요청으로만 다시 등록할 수 있습니다.");
    else statusText(root, restored ? "서버의 영상 저장 완료 상태를 확인해 화면을 복원했습니다." : "영상 저장이 완료됐습니다. 게시 버튼을 누르기 전에는 게시되지 않습니다.");
  };

  const validateRecoveredIdentity = (server, saved) => {
    if (!server?.jobId || !server?.requestId) throw new Error("서버 작업 식별자를 확인하지 못했습니다.");
    if (saved.jobId && server.jobId !== saved.jobId) throw new Error("저장된 작업과 서버 작업 번호가 일치하지 않습니다.");
    if (saved.requestId && server.requestId !== saved.requestId) throw new Error("저장된 요청과 서버 요청 번호가 일치하지 않습니다.");
  };

  const applyServerState = (server) => {
    validateRecoveredIdentity(server, { jobId: state.jobId, requestId: state.requestId });
    state.requestId = server.requestId;
    state.jobId = server.jobId;
    state.serverStatus = server.status;
    const scenes = Array.isArray(server.scenes) ? server.scenes : [];
    if (scenes.length) {
      state.plan = {
        detailedPrompt: server.detailedPrompt || state.plan?.detailedPrompt || "",
        scenes,
        narrationUrl: server.narrationUrl || "",
      };
    }
  };

  const finishReleasedServerState = (server) => {
    if (server.reservationStatus !== "released" || !server.releaseEventId) {
      throw new Error("Build 예약 해제 원장 상태를 확인하지 못했습니다.");
    }
    const expired = server.status === "expired" || server.reservationExpired === true;
    resetPreparedState();
    statusText(root, expired
      ? `30분이 지난 작업의 ${costLabel()} 예약 해제를 확인했습니다. 새로 시작해 주세요.`
      : `중단된 작업의 ${costLabel()} 예약 해제를 확인했습니다. 새로 시작해 주세요.`);
  };

  const finishCompletedServerState = async (server, { restored = false, video = null } = {}) => {
    applyServerState(server);
    if (server.status !== "completed" || server.reservationStatus !== "confirmed" || !server.confirmationEventId) {
      throw new Error(`${costLabel()} 확정 원장 상태를 확인하지 못했습니다.`);
    }
    const mediaType = String(server.mediaType || "").split(";", 1)[0].trim();
    if (!SUPPORTED_MEDIA_TYPES.has(mediaType) || !isSafeMediaUrl(server.mediaUrl)) {
      throw new Error("완료된 영구 영상 주소와 형식을 확인하지 못했습니다.");
    }
    const publishStatus = String(server.publishStatus || "");
    if (server.publishedPostId && !["active", "deleted"].includes(publishStatus)) {
      throw new Error("게시글의 현재 공개 상태를 확인하지 못했습니다.");
    }
    if (publishStatus === "active" && (!server.publishedPostId || !server.publishRequestId)) {
      throw new Error("게시된 글의 요청 번호와 게시글 번호를 확인하지 못했습니다.");
    }
    const storedVideo = video || await window.BuildersPlatform.shorts.media({ mediaUrl: server.mediaUrl });
    const returnedMediaType = String(storedVideo?.type || mediaType).split(";", 1)[0].trim();
    if (returnedMediaType !== mediaType) throw new Error("서버 상태와 저장 영상 형식이 일치하지 않습니다.");
    const published = publishStatus === "active" && server.publishedPostId && server.publishRequestId
      ? { postId: server.publishedPostId, publishRequestId: server.publishRequestId, jobId: server.jobId, postUrl: boardPostUrl(server.publishedPostId) }
      : null;
    renderResult({ mediaUrl: server.mediaUrl, mediaType, video: storedVideo, publishStatus, published, restored });
  };

  const pollRenderer = async (initial, { restored = false } = {}) => {
    let server = initial;
    let retryCount = 0;
    let lastProgress = Math.max(0, Math.min(99, Math.trunc(Number(initial?.renderProgress) || 0)));
    while (true) {
      applyServerState(server);
      if (TERMINAL_RELEASE_STATUSES.has(server.status) || server.reservationExpired === true) {
        finishReleasedServerState(server);
        return;
      }
      if (server.status === "completed") {
        await finishCompletedServerState(server, { restored });
        return;
      }
      if (!ACTIVE_JOB_STATUSES.has(server.status)
        || server.reservationStatus !== "reserved"
        || !server.reservationEventId
        || server.renderStarted !== true
        || server.renderState !== "processing") {
        throw new Error("MPT 렌더 작업의 예약·진행 상태를 확인하지 못했습니다.");
      }
      persistRecovery();
      const progress = Math.max(0, Math.min(99, Math.trunc(Number(server.renderProgress) || 0)));
      lastProgress = Math.max(lastProgress, progress);
      showProgress(lastProgress, "쇼츠 영상을 제작하고 있어요", "MoneyPrinterTurbo가 한국어 음성·자막과 세로 영상을 합성합니다.");
      announceProgress(`MoneyPrinterTurbo가 한국어 음성·자막 영상을 만들고 있어요. ${progress}%`, progress, "renderer");
      await wait(1500);
      try {
        server = await window.BuildersPlatform.shorts.renderSync({ jobId: state.jobId });
        retryCount = 0;
      } catch (error) {
        if (!RETRYABLE_RENDER_ERRORS.has(error?.code) || retryCount >= 5) throw error;
        retryCount += 1;
        showProgress(lastProgress, "영상 작업 연결을 다시 확인하고 있어요", `완료 여부를 ${retryCount}/6회 다시 확인합니다. 새 Build 요청은 보내지 않습니다.`, "reconnecting");
        announceProgress(`영상 작업은 유지됩니다. 서버 연결을 다시 확인하고 있어요. ${lastProgress}%`, lastProgress, "reconnecting");
        await wait(1800);
      }
    }
  };

  const reconcileRenderFailure = async (originalError) => {
    try {
      const server = await window.BuildersPlatform.shorts.status({ jobId: state.jobId, requestId: state.requestId });
      applyServerState(server);
      if (TERMINAL_RELEASE_STATUSES.has(server.status) || server.reservationExpired === true) {
        finishReleasedServerState(server);
        return;
      }
      if (server.status === "completed") {
        await finishCompletedServerState(server, { restored: true });
        return;
      }
      if (ACTIVE_JOB_STATUSES.has(server.status) && server.reservationStatus === "reserved" && state.plan?.scenes?.length) {
        if (server.renderStarted === true && server.renderState === "processing") {
          const progress = Math.max(0, Math.min(99, Math.trunc(Number(server.renderProgress) || 0)));
          showProgress(progress, "영상 작업은 서버에서 계속되고 있어요", "상태 다시 확인을 누르면 기존 작업만 이어서 확인합니다.", "reconnecting");
          showRecovery("영상 작업 연결을 다시 확인해 주세요.", `${originalError.message} 기존 작업은 유지되며 새 Build 예약은 만들지 않습니다.`);
          announceProgress(`서버에서 기존 영상 작업 ${progress}% 상태를 확인했습니다.`, progress, "recovered", true);
          return;
        }
        state.renderBlocked = false;
        renderPlan(state.plan, { restored: true });
        revealRestoredPlan(`${originalError.message} 아래 제작안을 확인한 뒤 같은 버튼으로 이어서 제작할 수 있습니다.`);
        statusText(root, "제작안 편집 화면으로 이동했습니다. Build 예약은 새로 만들지 않았습니다.");
        return;
      }
      throw new Error("서버가 알 수 없는 쇼츠 상태를 반환했습니다.");
    } catch (statusError) {
      state.renderBlocked = true;
      showProgress(0, "작업 상태를 확인하지 못했어요", "상태 다시 확인을 누르면 새 요청 없이 기존 작업만 조회합니다.", "failed");
      showRecovery("작업 결과를 아직 확인하지 못했습니다.", `${statusError.message || originalError.message} 새 생성 요청은 보내지 않습니다.`, true);
      statusText(root, "기존 작업의 완료 또는 Build 해제를 확인한 뒤 다시 제작할 수 있습니다.", true);
    }
  };

  const recoverStoredJob = async () => {
    const saved = readRecoveryState();
    if (!saved || state.restoring || state.busy || state.preparing) return;
    restoreInputs(saved);
    state.requestId = saved.requestId;
    state.jobId = saved.jobId;
    state.publishRequestId = saved.publishRequestId;
    if (!window.BuildersPlatform?.snapshot?.().authenticated) {
      showRecovery("진행 중인 쇼츠 작업이 있습니다.", "Google 로그인 후 서버 상태를 확인해 이어서 보여 드립니다.");
      statusText(root, "로그인 전에는 예약·완료·게시 상태를 추측하지 않습니다.");
      return;
    }
    state.restoring = true;
    setBusy(true);
    showRecovery("서버 상태를 확인하고 있어요.", "새 생성 요청을 보내지 않고 기존 작업만 조회합니다.");
    statusText(root, "기존 쇼츠 작업을 서버에서 확인하고 있어요.");
    try {
      const server = await window.BuildersPlatform.shorts.status({ jobId: saved.jobId, requestId: saved.requestId });
      validateRecoveredIdentity(server, saved);
      applyServerState(server);
      if (TERMINAL_RELEASE_STATUSES.has(server.status) || server.reservationExpired === true) {
        finishReleasedServerState(server);
        return;
      }
      if (ACTIVE_JOB_STATUSES.has(server.status)) {
        if (server.reservationStatus !== "reserved" || !server.reservationEventId) throw new Error(`${costLabel()} 예약 원장 상태를 확인하지 못했습니다.`);
        persistRecovery();
        if (server.status === "processing" && state.plan?.scenes?.length) {
          renderPlan(state.plan, { restored: true });
          if (server.renderStarted === true && server.renderState === "processing") {
            setStep("video");
            await pollRenderer(server, { restored: true });
          } else {
            revealRestoredPlan("아래 제작안을 확인하고 ‘수정 내용 저장하고 영상 만들기’를 누르면 기존 Build 예약으로 이어서 제작합니다.");
            statusText(root, "예약된 제작안 편집 화면으로 이동했습니다. 새 Build 예약은 만들지 않았습니다.");
          }
        } else {
          showRecovery("제작 내용을 준비하고 있어요.", "같은 작업을 서버에서 다시 확인하면 새 Build 예약 없이 이어집니다.");
          setStep("plan");
          statusText(root, "서버에서 기존 작업을 처리 중입니다. 잠시 후 상태를 다시 확인해 주세요.");
        }
        return;
      }
      if (server.status !== "completed") throw new Error("서버가 알 수 없는 쇼츠 상태를 반환했습니다.");
      await finishCompletedServerState(server, { restored: true });
    } catch (error) {
      if (error.code === "shorts_job_not_found") {
        resetPreparedState();
        statusText(root, "복구할 서버 작업을 찾지 못했습니다. 새 쇼츠를 시작해 주세요.", true);
      } else {
        showRecovery("기존 작업 상태를 확인하지 못했습니다.", `${error.message} 새 생성 요청은 보내지 않았습니다.`, true);
        statusText(root, "상태 확인이 끝날 때까지 새 Build 예약을 만들지 않습니다.", true);
      }
    } finally {
      state.restoring = false;
      setBusy(false);
    }
  };

  const discoverRecentJob = async () => {
    if (state.recentLookupAttempted || state.recentLookupInFlight) return;
    if (!window.BuildersPlatform?.snapshot?.().authenticated) return;
    if (state.busy || state.restoring || state.preparing || state.requestId || state.jobId || readRecoveryState()) return;
    state.recentLookupAttempted = true;
    state.recentLookupInFlight = true;
    try {
      const recent = await window.BuildersPlatform.shorts.recent();
      if (state.busy || state.restoring || state.preparing || state.requestId || state.jobId || readRecoveryState()) return;
      if (!recent || typeof recent !== "object" || typeof recent.found !== "boolean") {
        throw new Error("최근 쇼츠 작업 응답을 확인하지 못했습니다.");
      }
      if (recent.found === false) return;
      const hasRequestId = typeof recent.requestId === "string" && recent.requestId.trim().length > 0;
      const hasJobId = typeof recent.jobId === "string" && recent.jobId.trim().length > 0;
      if (!hasRequestId || !hasJobId) throw new Error("최근 쇼츠 작업의 요청·작업 번호를 확인하지 못했습니다.");
      const recentSettings = recent.settings && typeof recent.settings === "object" ? recent.settings : {};
      writeRecoveryState({
        requestId: recent.requestId,
        jobId: recent.jobId,
        publishRequestId: String(recent.publishRequestId || "").slice(0, 128),
        topic: String(recent.topic || "").slice(0, 300),
        settings: {
          subtitles: recentSettings.subtitles !== false,
          subtitleStyle: ["basic", "emphasis", "minimal"].includes(recentSettings.subtitleStyle) ? recentSettings.subtitleStyle : "basic",
          voice: recentSettings.voice === true,
          voiceId: String(recentSettings.voiceId || "auto").slice(0, 80),
        },
      });
      if (!readRecoveryState()) throw new Error("최근 쇼츠 작업을 브라우저에 저장하지 못했습니다.");
      void recoverStoredJob();
    } catch (error) {
      if (state.busy || state.restoring || state.preparing || state.requestId || state.jobId || readRecoveryState()) return;
      statusText(root, `최근 쇼츠 작업을 자동으로 확인하지 못했습니다. ${error?.message || "서버 응답을 확인하지 못했습니다."} 새 쇼츠는 바로 시작할 수 있습니다.`, true);
    } finally {
      state.recentLookupInFlight = false;
    }
  };

  inputPanel.addEventListener("click", (event) => {
    const example = event.target.closest("[data-example]");
    if (example) { topicInput.value = example.dataset.example; topicInput.focus(); }
  });
  subtitlesInput.addEventListener("change", () => { subtitleStyleInput.disabled = !subtitlesInput.checked; });
  voiceInput.addEventListener("change", () => { voiceIdInput.disabled = !voiceInput.checked; });

  inputPanel.querySelector("[data-shorts-prepare]").addEventListener("click", async () => {
    if (state.busy) return;
    if (!state.authenticated) {
      window.BuildersPlatform?.openLogin?.();
      statusText(root, "Google 로그인 후 제작할 수 있어요.", true);
      return;
    }
    const topic = topicInput.value.trim();
    if (topic.length < 5) { statusText(root, "누구에게 무엇을 보여 줄지 조금 더 적어 주세요.", true); topicInput.focus(); return; }
    state.requestId = crypto.randomUUID();
    state.jobId = "";
    state.publishRequestId = "";
    state.published = null;
    persistRecovery();
    state.preparing = true;
    setBusy(true);
    startEstimatedProgress();
    statusText(root, "요청을 확인하고 제작 내용을 만들고 있어요.");
    try {
      const plan = await window.BuildersPlatform.shorts.prepare({
        requestId: state.requestId,
        topic,
        settings: currentSettings(),
      });
      if (!plan.jobId || plan.requestId !== state.requestId || plan.status !== "processing" || !plan.reservationEventId) {
        throw new Error(`${costLabel()} 예약과 제작 작업 응답을 확인하지 못했습니다.`);
      }
      state.jobId = plan.jobId;
      state.serverStatus = plan.status;
      stopProgressAnimation();
      showProgress(100, "제작 내용이 완성됐어요", "이제 장면별 내용을 직접 수정한 뒤 영상 제작을 시작할 수 있어요.", "complete");
      await wait(260);
      renderPlan(plan);
      statusText(root, "제작 내용을 자유롭게 수정한 뒤 영상 만들기를 눌러 주세요. 아직 게시되지 않았습니다.");
    } catch (error) {
      stopProgressAnimation();
      if (NON_RESERVED_PREPARE_ERRORS.has(error.code)) {
        resetPreparedState();
        statusText(root, error.message, true);
      } else {
        showProgress(0, "제작 요청 상태를 확인하고 있어요", "같은 요청 번호로 서버 상태만 다시 확인합니다.", "reconnecting");
        showRecovery("요청 응답을 끝까지 확인하지 못했습니다.", `${error.message} 같은 requestId의 서버 작업을 다시 조회합니다.`, true);
        statusText(root, "새 요청을 보내지 않고 기존 예약 상태만 다시 확인해 주세요.", true);
      }
    } finally {
      state.preparing = false;
      setBusy(false);
    }
  });

  planPanel.addEventListener("click", async (event) => {
    if (state.busy || !state.jobId) return;
    if (event.target.closest("[data-shorts-cancel]")) {
      setBusy(true);
      try {
        const released = await window.BuildersPlatform.shorts.release({ jobId: state.jobId, requestId: state.requestId, reason: "user_cancelled" });
        if (!TERMINAL_RELEASE_STATUSES.has(released.status) || released.reservationStatus !== "released" || !released.releaseEventId) {
        throw new Error(`${costLabel()} 예약 해제 원장 상태를 확인하지 못했습니다.`);
        }
        resetPreparedState();
        statusText(root, `생성을 취소했고 ${costLabel()} 예약 해제를 확인했습니다.`);
      } catch (error) {
        showRecovery("취소 결과를 확인하지 못했습니다.", `${error.message} 서버 상태를 다시 확인해 주세요.`, true);
        statusText(root, "예약 해제를 확인하기 전에는 새 요청을 보내지 않습니다.", true);
      }
      finally { setBusy(false); }
      return;
    }
    if (!event.target.closest("[data-shorts-render]")) return;
    if (!state.authenticated) {
      window.BuildersPlatform?.openLogin?.();
      statusText(root, "Google 로그인 후 최종 영상을 제작할 수 있어요.", true);
      return;
    }
    let planEdits;
    try {
      planEdits = editedPlan();
    } catch (error) {
      statusText(root, error.message, true);
      return;
    }
    setBusy(true);
    showProgress(3, "수정한 제작 내용을 저장하고 있어요", "장면별 문구와 화면 구성을 최종 영상에 반영합니다.");
    try {
      const updated = await window.BuildersPlatform.shorts.updatePlan({
        jobId: state.jobId,
        detailedPrompt: planEdits.detailedPrompt,
        scenes: planEdits.scenes,
      });
      if (updated.jobId !== state.jobId || updated.reservationStatus !== "reserved" || !Array.isArray(updated.scenes) || updated.scenes.length < 2) {
        throw new Error("수정한 제작 내용의 서버 저장 상태를 확인하지 못했습니다.");
      }
      state.plan = {
        detailedPrompt: updated.detailedPrompt,
        scenes: updated.scenes,
        narrationUrl: updated.narrationUrl || "",
      };
      persistRecovery();
      setStep("video");
      if (state.rendererReady) {
        showProgress(6, "쇼츠 영상 제작을 시작하고 있어요", "MoneyPrinterTurbo에 수정한 제작 내용을 전달합니다.");
        statusText(root, "MoneyPrinterTurbo에 한국어 음성·자막 영상 작업을 보내고 있어요.");
        const started = await window.BuildersPlatform.shorts.render({ jobId: state.jobId });
        await pollRenderer(started);
        return;
      }
      showProgress(0, "쇼츠 영상을 제작하고 있어요", "브라우저에서 장면과 자막을 합성합니다.");
      statusText(root, "영상을 합치고 있어요. 0%");
      let blob;
      try {
        blob = await renderWebm({
          scenes: state.plan.scenes,
          subtitles: subtitlesInput.checked,
          subtitleStyle: subtitleStyleInput.value,
          voice: voiceInput.checked,
          narrationUrl: state.plan.narrationUrl,
          onProgress: (progress) => {
            showProgress(progress, "쇼츠 영상을 제작하고 있어요", "브라우저에서 장면과 자막을 합성합니다.");
            announceProgress(`영상을 합치고 있어요. ${progress}%`, progress, "browser");
          },
        });
      } catch (renderError) {
        const released = await window.BuildersPlatform.shorts.release({ jobId: state.jobId, requestId: state.requestId, reason: "render_failed" });
        if (!TERMINAL_RELEASE_STATUSES.has(released.status) || !released.releaseEventId) {
          throw new Error(`${renderError.message} Build 예약 해제 상태를 확인하지 못했습니다.`);
        }
        resetPreparedState();
        statusText(root, `${renderError.message} ${costLabel()} 예약 해제를 확인했습니다.`, true);
        return;
      }
      state.video = blob;
      showProgress(98, "완성 영상을 저장하고 있어요", "영상 파일과 Build 사용 결과를 서버에서 확인합니다.");
      statusText(root, "완성된 영상을 안전하게 저장하고 있어요.");
      let uploaded;
      try {
        uploaded = await window.BuildersPlatform.shorts.upload({
          requestId: state.requestId,
          jobId: state.jobId,
          video: blob,
          mimeType: "video/webm",
        });
      } catch (uploadError) {
        const ambiguous = uploadError.code === "network_error" || Number(uploadError.status || 0) >= 500;
        if (ambiguous) {
          persistRecovery();
          await reconcileRenderFailure(uploadError);
          return;
        }
        const released = await window.BuildersPlatform.shorts.release({ jobId: state.jobId, requestId: state.requestId, reason: "upload_failed" });
        if (!TERMINAL_RELEASE_STATUSES.has(released.status) || !released.releaseEventId) {
          throw new Error(`${uploadError.message} Build 예약 해제 상태를 확인하지 못했습니다.`);
        }
        resetPreparedState();
        statusText(root, `${uploadError.message} ${costLabel()} 예약 해제를 확인했습니다.`, true);
        return;
      }
      await finishCompletedServerState(uploaded, { video: blob });
    } catch (error) {
      persistRecovery();
      await reconcileRenderFailure(error);
    } finally { setBusy(false); }
  });

  resultPanel.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-shorts-publish]");
    if (!form) return;
    event.preventDefault();
    if (state.busy || state.published) return;
    const title = form.elements.title.value.trim();
    const content = form.elements.content.value.trim();
    if (title.length < 4 || content.length < 10 || !form.elements.rights.checked) return;
    state.publishRequestId ||= crypto.randomUUID();
    persistRecovery();
    setBusy(true);
    const publishStatus = form.querySelector("[data-publish-status]");
    publishStatus.dataset.error = "false";
    publishStatus.textContent = "게시판에 등록하고 있어요. 같은 영상은 한 번만 등록됩니다.";
    try {
      const published = await window.BuildersPlatform.shorts.publish({
        publishRequestId: state.publishRequestId,
        jobId: state.jobId,
        title,
        content,
        rightsConfirmed: true,
      });
      const confirmed = published.publishRequestId === state.publishRequestId
        && published.jobId === state.jobId
        && Boolean(published.postId)
        && isHttpsUrl(published.postUrl)
        && published.visibility === "public"
        && published.category === "knowledge_share"
        && Number(published.rewardBuilds) === 0
        && published.publishStatus === "active";
      if (!confirmed) {
        throw new Error("게시 요청·작업·주소·공개 범위·분류·Build 보상 응답을 모두 확인하지 못했습니다.");
      }
      renderPublished(published);
    } catch (error) {
      persistRecovery();
      publishStatus.textContent = `게시 결과를 확인하지 못했어요. 같은 게시 요청 번호로 다시 시도하거나 서버 상태를 확인해 주세요. 영상은 보관되어 있고 추가 Build는 사용되지 않습니다. ${error.message}`;
      publishStatus.dataset.error = "true";
    } finally { setBusy(false); }
  });

  recoveryPanel.addEventListener("click", (event) => {
    if (event.target.closest("[data-shorts-recover]")) void recoverStoredJob();
  });

  const saved = readRecoveryState();
  if (saved) {
    restoreInputs(saved);
    state.requestId = saved.requestId;
    state.jobId = saved.jobId;
    state.publishRequestId = saved.publishRequestId;
    showRecovery("진행 중인 쇼츠 작업이 있습니다.", "서버 상태를 확인해 예약·완료·게시 화면을 복원합니다.");
  }
  let wasAuthenticated = false;
  window.BuildersPlatform?.subscribe?.((snapshot) => {
    updateCostCopy(snapshot);
    applyRendererAvailability(snapshot);
    const authenticated = Boolean(snapshot.authenticated);
    state.authenticated = authenticated;
    setBusy(state.busy);
    const becameAuthenticated = authenticated && !wasAuthenticated;
    wasAuthenticated = authenticated;
    const saved = readRecoveryState();
    if (saved) {
      recoveryPanel.querySelector("[data-platform-login-open]").hidden = authenticated;
      recoveryPanel.querySelector("[data-shorts-recover]").hidden = !authenticated;
      if (becameAuthenticated) void recoverStoredJob();
      return;
    }
    if (authenticated) void discoverRecentJob();
  });
  window.addEventListener("online", () => {
    if (!window.BuildersPlatform?.snapshot?.().authenticated) return;
    if (readRecoveryState()) void recoverStoredJob();
    else void discoverRecentJob();
  });
}
