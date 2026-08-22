"use strict";

(() => {
  const TOOL_COPY = Object.freeze({
    meeting: {
      id: "meeting",
      title: "AI 회의록",
      description: "기존 회의록 기능을 이 작업공간에 연결할 자리를 준비하고 있습니다.",
      steps: [
        "기존 기능의 연결 주소와 이용 범위를 확인합니다.",
        "멤버 권한과 자료 처리 기준을 연결합니다.",
        "연결이 완료되면 이 화면에서 기존 기능으로 안전하게 이동합니다.",
      ],
    },
    shorts: {
      id: "shorts",
      title: "AI 쇼츠 스튜디오",
      description: "기존 쇼츠 제작 기능을 이 작업공간에 연결할 자리를 준비하고 있습니다.",
      steps: [
        "기존 기능의 연결 주소와 이용 범위를 확인합니다.",
        "멤버 권한과 자료 처리 기준을 연결합니다.",
        "연결이 완료되면 이 화면에서 기존 기능으로 안전하게 이동합니다.",
      ],
    },
  });

  function requestHelp() {
    window.dispatchEvent(new CustomEvent("lounge:navigate", { detail: { view: "settings" } }));
  }

  function render(container, options = {}) {
    if (!(container instanceof HTMLElement)) return;
    const tool = TOOL_COPY[options.tool] || TOOL_COPY.meeting;
    const titleId = `lounge-placeholder-title-${tool.id}`;
    const statusTitleId = `lounge-placeholder-status-title-${tool.id}`;
    const steps = tool.steps.map((step, index) => `
      <li><span class="lounge-placeholder-step-number" aria-hidden="true">0${index + 1}</span><span>${step}</span></li>
    `).join("");

    container.innerHTML = `
      <section class="lounge-placeholder" aria-labelledby="${titleId}">
        <header class="lounge-page-heading">
          <p class="lounge-kicker">만들기</p>
          <h1 id="${titleId}">${tool.title}</h1>
          <p>${tool.description}</p>
        </header>
        <section class="lounge-placeholder-panel" aria-labelledby="${statusTitleId}">
          <p class="lounge-status-label" id="${statusTitleId}">현재 상태</p>
          <h2>기존 기능 연결 예정</h2>
          <p>이번 단계에서는 업로드, 생성, API 호출, 결과 화면을 제공하지 않습니다. 기존 기능이 연결되면 이 자리에 실제 시작 동선이 표시됩니다.</p>
          <ol class="lounge-placeholder-steps">${steps}</ol>
          <button class="lounge-placeholder-action" type="button" data-lounge-open-help>연결 전 안내 보기</button>
        </section>
      </section>
    `;

    container.querySelector("[data-lounge-open-help]")?.addEventListener("click", requestHelp);
  }

  window.LoungePlaceholders = Object.freeze({ render });
})();
