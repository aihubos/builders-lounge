"use strict";

(() => {
  const TOOL_COPY = Object.freeze({
    meeting: {
      id: "meeting",
      title: "AI 회의록",
      description: "회의 파일에서 결정사항과 할 일을 정리하는 3단계 흐름입니다.",
      steps: [
        ["01", "파일 선택", "회의 파일을 준비하는 단계입니다. 실제 파일 선택은 아직 연결하지 않습니다."],
        ["02", "AI 정리", "음성 내용을 결정사항·할 일 중심으로 정리하는 단계입니다."],
        ["03", "검토·내보내기", "초안을 확인하고 원하는 형식으로 내보내는 단계입니다."],
      ],
    },
    shorts: {
      id: "shorts",
      title: "AI 쇼츠 스튜디오",
      description: "긴 영상을 짧은 세로 영상으로 바꾸는 3단계 흐름입니다.",
      steps: [
        ["01", "영상 선택", "원본 영상을 준비하는 단계입니다. 실제 업로드는 아직 연결하지 않습니다."],
        ["02", "후보 구간 분석", "말과 장면을 분석해 쇼츠 후보를 찾는 단계입니다."],
        ["03", "세로 영상 편집", "후보를 9:16 세로 영상으로 다듬는 단계입니다."],
      ],
    },
  });

  function requestHelp() { window.dispatchEvent(new CustomEvent("lounge:navigate", { detail: { view: "help" } })); }

  function render(container, options = {}) {
    if (!(container instanceof HTMLElement)) return;
    const tool = TOOL_COPY[options.tool] || TOOL_COPY.meeting;
    const titleId = `lounge-placeholder-title-${tool.id}`;
    container.innerHTML = `<section class="tool-placeholder" aria-labelledby="${titleId}">
      <div class="panel-heading"><p class="section-label">QUICK START · SAMPLE</p><h3 id="${titleId}">${tool.title}</h3><p>${tool.description}</p></div>
      <div class="tool-status-banner"><span class="status-mark status-mark-review" aria-hidden="true"></span><div><span class="sample-label">MVP 데모</span><strong>샘플 화면만 제공</strong><p>실제 업로드·AI 처리는 연결 전입니다. 아래 순서로 완성될 예정입니다.</p></div></div>
      <ol class="tool-step-list">${tool.steps.map(([number, title, detail]) => `<li><span class="tool-step-number" aria-hidden="true">${number}</span><div><strong>${title}</strong><p>${detail}</p></div><span class="sample-label">샘플</span></li>`).join("")}</ol>
      <div class="tool-placeholder-footer"><p>연결 전에는 파일 선택창이나 외부 API를 실행하지 않습니다.</p><button class="secondary-button" type="button" data-lounge-open-help>이용 안내 보기 <span aria-hidden="true">→</span></button></div>
    </section>`;
    container.querySelector("[data-lounge-open-help]")?.addEventListener("click", requestHelp);
  }

  window.LoungePlaceholders = Object.freeze({ render });
})();
