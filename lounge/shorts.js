const EXAMPLES = [
  "AI에게 원하는 답을 받는 질문법을 초보자에게 알려줘.",
  "회의 메모를 결정과 할 일 중심으로 정리하는 방법을 알려줘.",
  "스마트폰으로 음식 사진을 깔끔하게 찍는 방법 3가지를 알려줘.",
];

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
    publishRequestId: "",
    published: null,
    renderBlocked: false,
    busy: false,
  };

  root.innerHTML = `<section class="shorts-studio" aria-labelledby="shorts-title">
    <header class="shorts-heading">
      <div><p class="section-label">MAKE · VERTICAL VIDEO</p><h3 id="shorts-title">쇼츠 만들기</h3><p>주제 한 문장만 적으면 AI가 제작 내용을 정리해 실제 WebM 영상을 만듭니다.</p></div>
      <div class="shorts-cost"><strong>Build 5</strong><span>영상 저장 성공 시 사용</span></div>
    </header>
    <div class="shorts-flow" aria-label="쇼츠 제작 단계"><span data-step="input" aria-current="step">1 한 문장</span><span data-step="plan">2 제작 내용</span><span data-step="video">3 영상 결과</span><span data-step="publish">4 수동 게시</span></div>
    <section class="shorts-panel" data-shorts-input>
      <label class="shorts-topic">만들고 싶은 쇼츠<textarea rows="4" minlength="5" maxlength="300" placeholder="예: 회의 메모를 결정과 할 일 중심으로 정리하는 방법을 알려줘."></textarea><small>5자 이상 300자 이하로 적어 주세요.</small></label>
      <div class="shorts-examples" aria-label="입력 예시">${EXAMPLES.map((example) => `<button type="button" data-example="${escapeHtml(example)}">${escapeHtml(example)}</button>`).join("")}</div>
      <details class="shorts-settings"><summary>상세 설정 <small>원하면 자막과 음성을 바꿀 수 있어요.</small></summary>
        <div class="shorts-settings-grid">
          <label class="shorts-switch"><input type="checkbox" name="subtitles" checked><span>자막 사용</span><small>영상 내용을 화면 글자로 보여줍니다.</small></label>
          <label>자막 스타일<select name="subtitleStyle"><option value="basic">기본</option><option value="emphasis">강조</option><option value="minimal">간결</option></select></label>
          <label class="shorts-switch"><input type="checkbox" name="voice" data-unsupported disabled><span>음성 사용</span><small>운영 렌더 서버 연결 후 제공할 예정입니다.</small></label>
          <label>목소리 선택<select name="voiceId" data-unsupported disabled><option value="auto">렌더 서버 연결 필요</option></select></label>
        </div>
      </details>
      <p class="shorts-note">영상 완성 시 Build 5 사용 · 실패하거나 취소되면 사용되지 않아요.</p>
      <button class="primary-button" type="button" data-shorts-prepare>내용 만들기</button>
    </section>
    <section class="shorts-panel" data-shorts-plan hidden></section>
    <section class="shorts-panel" data-shorts-result hidden></section>
    <p class="shorts-status" data-shorts-status role="status">한 문장으로 시작해 주세요.</p>
    <p class="shorts-license">이 쇼츠 제작기는 <a href="https://github.com/harry0703/MoneyPrinterTurbo" target="_blank" rel="noopener">Harry의 MoneyPrinterTurbo</a> 제작 흐름을 참고했습니다. <a href="THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener">MIT 라이선스</a></p>
  </section>`;

  const inputPanel = root.querySelector("[data-shorts-input]");
  const planPanel = root.querySelector("[data-shorts-plan]");
  const resultPanel = root.querySelector("[data-shorts-result]");
  const topicInput = inputPanel.querySelector("textarea");
  const subtitlesInput = inputPanel.querySelector('[name="subtitles"]');
  const subtitleStyleInput = inputPanel.querySelector('[name="subtitleStyle"]');
  const voiceInput = inputPanel.querySelector('[name="voice"]');
  const voiceIdInput = inputPanel.querySelector('[name="voiceId"]');

  const setStep = (step) => root.querySelectorAll("[data-step]").forEach((item) => {
    if (item.dataset.step === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  const setBusy = (busy) => {
    state.busy = busy;
    root.querySelectorAll("button, textarea, select, input").forEach((control) => {
      if (control.matches("[data-unsupported]")) control.disabled = true;
      else if (control.matches('[name="voiceId"]')) control.disabled = !voiceInput.checked || busy;
      else if (control.matches('[name="subtitleStyle"]')) control.disabled = !subtitlesInput.checked || busy;
      else if (control.matches("[data-rights-submit]")) control.disabled = busy || !root.querySelector('[name="rights"]')?.checked;
      else if (control.matches("[data-shorts-render]")) control.disabled = busy || state.renderBlocked;
      else control.disabled = busy;
    });
  };
  const resetPreparedState = () => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.jobId = "";
    state.plan = null;
    state.video = null;
    state.previewUrl = "";
    state.mediaUrl = "";
    state.publishRequestId = "";
    state.published = null;
    state.renderBlocked = false;
    planPanel.hidden = true;
    resultPanel.hidden = true;
    inputPanel.hidden = false;
    setStep("input");
  };

  inputPanel.addEventListener("click", (event) => {
    const example = event.target.closest("[data-example]");
    if (example) { topicInput.value = example.dataset.example; topicInput.focus(); }
  });
  subtitlesInput.addEventListener("change", () => { subtitleStyleInput.disabled = !subtitlesInput.checked; });
  voiceInput.addEventListener("change", () => { voiceIdInput.disabled = !voiceInput.checked; });

  inputPanel.querySelector("[data-shorts-prepare]").addEventListener("click", async () => {
    if (state.busy) return;
    const topic = topicInput.value.trim();
    if (topic.length < 5) { statusText(root, "누구에게 무엇을 보여 줄지 조금 더 적어 주세요.", true); topicInput.focus(); return; }
    state.requestId = crypto.randomUUID();
    setBusy(true);
    statusText(root, "요청을 확인하고 제작 내용을 만들고 있어요.");
    try {
      const plan = await window.BuildersPlatform.shorts.prepare({
        requestId: state.requestId,
        topic,
        settings: {
          subtitles: subtitlesInput.checked,
          subtitleStyle: subtitleStyleInput.value,
          voice: voiceInput.checked,
          voiceId: voiceIdInput.value,
        },
      });
      state.jobId = plan.jobId;
      state.plan = plan;
      state.renderBlocked = false;
      inputPanel.hidden = true;
      planPanel.hidden = false;
      planPanel.innerHTML = `<div class="shorts-panel-head"><div><span>AI가 정리한 제작 내용</span><h4>${escapeHtml(topic)}</h4></div><span class="shorts-reserved">Build 5 사용 예정</span></div>
        <label>상세 프롬프트<textarea data-detailed-prompt rows="10" readonly>${escapeHtml(plan.detailedPrompt)}</textarea></label>
        <div class="shorts-scenes"><strong>장면 구성 ${plan.scenes.length}개</strong>${plan.scenes.map((scene, index) => `<article><span>${index + 1}</span><div><b>${escapeHtml(scene.title)}</b><p>${escapeHtml(scene.subtitle || scene.narration)}</p></div></article>`).join("")}</div>
        <div class="shorts-actions"><button class="secondary-button" type="button" data-shorts-cancel>생성 취소</button><button class="primary-button" type="button" data-shorts-render>이대로 영상 만들기</button></div>`;
      setStep("plan");
      statusText(root, "제작 내용을 확인한 뒤 영상을 만들어 주세요. 아직 게시되지 않았습니다.");
    } catch (error) {
      statusText(root, error.message, true);
    } finally { setBusy(false); }
  });

  planPanel.addEventListener("click", async (event) => {
    if (state.busy || !state.jobId) return;
    if (event.target.closest("[data-shorts-cancel]")) {
      setBusy(true);
      try {
        await window.BuildersPlatform.shorts.release({ jobId: state.jobId, requestId: state.requestId, reason: "user_cancelled" });
        state.jobId = "";
        state.plan = null;
        planPanel.hidden = true;
        inputPanel.hidden = false;
        setStep("input");
        statusText(root, "생성을 취소했어요. Build는 사용되지 않았어요.");
      } catch (error) { statusText(root, error.message, true); }
      finally { setBusy(false); }
      return;
    }
    if (!event.target.closest("[data-shorts-render]")) return;
    setBusy(true);
    setStep("video");
    try {
      statusText(root, "영상을 합치고 있어요. 0%");
      const blob = await renderWebm({
        scenes: state.plan.scenes,
        subtitles: subtitlesInput.checked,
        subtitleStyle: subtitleStyleInput.value,
        voice: voiceInput.checked,
        narrationUrl: state.plan.narrationUrl,
        onProgress: (progress) => statusText(root, `영상을 합치고 있어요. ${progress}%`),
      });
      state.video = blob;
      statusText(root, "완성된 영상을 안전하게 저장하고 있어요.");
      const uploaded = await window.BuildersPlatform.shorts.upload({
        requestId: state.requestId,
        jobId: state.jobId,
        video: blob,
        mimeType: "video/webm",
      });
      if (uploaded.status !== "completed" || !/^https:\/\//.test(uploaded.mediaUrl || "")) {
        throw new Error("영상 저장 완료 응답을 확인하지 못했습니다.");
      }
      state.mediaUrl = uploaded.mediaUrl;
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = URL.createObjectURL(blob);
      planPanel.hidden = true;
      resultPanel.hidden = false;
      resultPanel.innerHTML = `<div class="shorts-panel-head"><div><span>영상이 완성됐어요</span><h4>게시 전 결과를 확인해 주세요.</h4></div><span class="shorts-completed">Build 5 사용 완료</span></div>
        <div class="shorts-result-grid"><video controls playsinline preload="metadata" src="${escapeHtml(state.previewUrl)}" aria-label="완성된 쇼츠 미리보기"></video>
          <div class="shorts-result-copy"><p>이 영상은 아직 게시판에 등록되지 않았습니다.</p><a class="secondary-button" download="builders-shorts-${escapeHtml(state.jobId)}.webm" href="${escapeHtml(state.previewUrl)}">다운로드</a><small>${(blob.size / 1024 / 1024).toFixed(1)}MB · WebM · 세로형 9:16</small></div></div>
        <form data-shorts-publish><h4>게시판에 등록</h4><p>제목, 설명, 영상과 등록 위치를 확인해 주세요. 버튼을 누르기 전에는 게시되지 않습니다.</p>
          <div class="shorts-publish-grid"><label>게시글 제목<input name="title" minlength="4" maxlength="100" required value="${escapeHtml(topicInput.value.trim().slice(0, 100))}"></label><label>등록 위치<input value="공개 게시판 · 정보 공유" readonly></label></div>
          <label>게시글 설명<textarea name="content" minlength="10" maxlength="5000" required>${escapeHtml(state.plan.detailedPrompt.slice(0, 5000))}</textarea></label>
          <div class="shorts-media-check"><span>등록할 영상</span><code>${escapeHtml(state.mediaUrl)}</code></div>
          <label class="shorts-rights"><input type="checkbox" name="rights">사용하는 자료와 게시 내용에 필요한 권리를 확인했습니다.</label>
          <button class="primary-button" type="submit" data-rights-submit disabled>게시판에 등록</button><p data-publish-status role="status"></p>
        </form>`;
      const publishForm = resultPanel.querySelector("[data-shorts-publish]");
      const rights = publishForm.elements.rights;
      const publishButton = publishForm.querySelector('button[type="submit"]');
      rights.addEventListener("change", () => { publishButton.disabled = !rights.checked; });
      setStep("video");
      statusText(root, "영상 저장이 완료됐습니다. 게시 버튼을 누르기 전에는 게시되지 않습니다.");
    } catch (error) {
      try {
        await window.BuildersPlatform.shorts.release({ jobId: state.jobId, requestId: state.requestId, reason: "render_or_upload_failed" });
        statusText(root, `${error.message} Build는 사용되지 않았어요.`, true);
        resetPreparedState();
      } catch (releaseError) {
        state.renderBlocked = true;
        statusText(root, `${error.message} 예약 해제 상태를 다시 확인해 주세요: ${releaseError.message}`, true);
      }
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
    setBusy(true);
    const publishStatus = form.querySelector("[data-publish-status]");
    publishStatus.textContent = "게시판에 등록하고 있어요. 같은 영상은 한 번만 등록됩니다.";
    try {
      const published = await window.BuildersPlatform.shorts.publish({
        publishRequestId: state.publishRequestId,
        jobId: state.jobId,
        title,
        content,
        rightsConfirmed: true,
      });
      if (!published.postId || published.category !== "knowledge_share" || Number(published.rewardBuilds) !== 0) {
        throw new Error("게시 결과의 분류 또는 Build 보상 상태를 확인하지 못했습니다.");
      }
      state.published = published;
      form.querySelector('button[type="submit"]').remove();
      publishStatus.innerHTML = `<strong>게시판 등록 완료</strong><span>게시판 등록에는 Build가 추가로 사용되지 않았습니다.</span><a class="primary-button" href="${escapeHtml(published.postUrl)}">게시글 보기</a>`;
      setStep("publish");
      statusText(root, "게시글 1건이 등록됐습니다. 재시도해도 같은 글을 사용합니다.");
    } catch (error) {
      publishStatus.textContent = `게시판에 등록하지 못했어요. 영상은 보관되어 있고 추가 Build는 사용되지 않았습니다. ${error.message}`;
      publishStatus.dataset.error = "true";
    } finally { setBusy(false); }
  });
}
