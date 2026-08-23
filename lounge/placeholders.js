"use strict";

(() => {
  const TOOL_COPY = Object.freeze({
    meeting: {
      id: "meeting",
      title: "AI 회의록",
      description: "회의 메모나 텍스트 파일을 결정사항과 할 일 중심의 회의록으로 정리합니다.",
      inputLabel: "회의 기록",
      inputPlaceholder: "회의 대화, 메모 또는 자동 전사 결과를 붙여 넣어 주세요.",
      sample: "참석자: Jeremy, 민지, 현우\nJeremy: 다음 주 뉴스레터 2호를 발행합시다.\n민지: 초안은 수요일까지 작성하겠습니다.\n현우: 웹사이트 배너는 목요일까지 반영하겠습니다.\nJeremy: 최종 검토는 금요일 오전에 진행하죠.",
    },
    shorts: {
      id: "shorts",
      title: "AI 쇼츠 스튜디오",
      description: "긴 영상 대본이나 아이디어를 훅·컷·내레이션·자막이 있는 쇼츠 제작안으로 바꿉니다.",
      inputLabel: "영상 대본 또는 주제",
      inputPlaceholder: "원본 영상 대본, 핵심 메시지 또는 만들고 싶은 쇼츠 주제를 입력해 주세요.",
      sample: "AI 에이전트를 처음 도입하는 팀이 자동 실행부터 시작하면 실패하기 쉽다. 먼저 초안을 만들고 사람이 승인하는 흐름을 설계해야 한다. 권한, 실패 시 행동, 로그를 미리 정하는 것이 핵심이다.",
    },
  });

  function render(container, options = {}) {
    if (!(container instanceof HTMLElement)) return;
    const tool = TOOL_COPY[options.tool] || TOOL_COPY.meeting;
    let busy = false;
    let lastSignature = "";

    const draw = () => {
      if (busy) return;
      const platform = window.BuildersPlatform;
      const session = platform?.snapshot?.() || {};
      const setting = platform?.getTool?.(tool.id);
      const signature = `${Boolean(session.user)}:${Boolean(setting?.enabled)}:${setting?.cost ?? ""}:${setting?.model ?? ""}`;
      if (signature === lastSignature && container.querySelector("[data-build-tool-form]")) {
        container.querySelectorAll("[data-tool-balance]").forEach((node) => { node.textContent = session.user ? `${Number(session.user.balance || 0).toLocaleString("ko-KR")} 빌드 보유` : "Google 로그인 필요"; });
        return;
      }
      lastSignature = signature;
      const enabled = Boolean(setting?.enabled && setting?.apiKeyConfigured);
      const cost = Number(setting?.cost || 0);
      container.innerHTML = `<section class="build-tool" aria-labelledby="build-tool-title-${tool.id}">
        <div class="build-tool-head">
          <div><p class="section-label">MAKE · BUILD POINT</p><h3 id="build-tool-title-${tool.id}">${tool.title}</h3><p>${tool.description}</p></div>
          <div class="build-tool-cost" data-disabled="${!enabled}"><span>1회 사용</span><strong>${enabled ? `${cost} 빌드` : "관리자 설정 전"}</strong><small data-tool-balance>${session.user ? `${Number(session.user.balance || 0).toLocaleString("ko-KR")} 빌드 보유` : "Google 로그인 필요"}</small></div>
        </div>
        <div class="build-tool-grid">
          <section class="build-tool-card"><h4>생성할 내용</h4>
            <form class="build-tool-form" data-build-tool-form>
              <div class="build-tool-form-row">
                <label>작업 제목<input name="title" maxlength="120" placeholder="예: AI 빌더스 랩 운영회의"></label>
                <label>${tool.id === "shorts" ? "목표 길이" : "결과 언어"}<select name="option">${tool.id === "shorts" ? '<option value="30초">30초</option><option value="45초">45초</option><option value="60초">60초</option>' : '<option value="한국어">한국어</option><option value="영어">영어</option>'}</select></label>
              </div>
              <label>${tool.inputLabel}<textarea name="source" maxlength="120000" required placeholder="${tool.inputPlaceholder}"></textarea></label>
              ${tool.id === "meeting" ? '<label>텍스트 파일 불러오기<input name="textFile" type="file" accept=".txt,.md,.srt,.vtt,text/plain,text/markdown"></label><p class="build-tool-guide">TXT·MD·SRT·VTT 파일은 브라우저에서 글자만 읽습니다. 음성 파일은 아직 전사하지 않습니다.</p>' : '<p class="build-tool-guide">이번 연결은 쇼츠 대본·컷 구성 제작입니다. 실제 MP4 렌더링은 관리자가 외부 제작 API를 연결하면 결과 링크로 제공합니다.</p>'}
              <div class="build-tool-actions">
                <button class="primary-button" type="submit" ${enabled ? "" : "disabled"}>${enabled ? `${cost}빌드로 생성` : "관리자 설정 대기"}</button>
                <button class="secondary-button" type="button" data-tool-sample>예시 입력</button>
                ${session.user ? "" : '<button class="secondary-button" type="button" data-platform-login-open>Google 로그인</button>'}
              </div>
              <p class="build-tool-status" data-tool-status role="status">${setting ? (enabled ? "생성에 성공한 경우에만 빌드가 차감됩니다." : "관리자가 API 키를 입력하고 도구를 활성화하면 사용할 수 있습니다.") : "도구 설정을 불러오는 중입니다."}</p>
            </form>
          </section>
          <section class="build-tool-card build-tool-output" aria-live="polite"><h4>생성 결과</h4><div class="build-tool-output-empty" data-tool-output>결과가 이곳에 표시됩니다.</div><div class="build-tool-actions" data-tool-output-actions hidden><button class="secondary-button" type="button" data-tool-copy>결과 복사</button><a class="primary-button" href="#" target="_blank" rel="noopener" data-tool-result-link hidden>제작 결과 열기 ↗</a></div></section>
        </div>
      </section>`;

      const form = container.querySelector("[data-build-tool-form]");
      const textarea = form.elements.source;
      const status = container.querySelector("[data-tool-status]");
      const output = container.querySelector("[data-tool-output]");
      const outputActions = container.querySelector("[data-tool-output-actions]");
      const resultLink = container.querySelector("[data-tool-result-link]");
      const submit = form.querySelector('button[type="submit"]');
      let latestText = "";

      container.querySelector("[data-tool-sample]")?.addEventListener("click", () => { textarea.value = tool.sample; textarea.focus(); });
      form.elements.textFile?.addEventListener("change", async () => {
        const file = form.elements.textFile.files?.[0];
        if (!file) return;
        if (file.size > 500_000) { status.textContent = "텍스트 파일은 500KB 이하만 불러올 수 있습니다."; status.dataset.error = "true"; return; }
        textarea.value = (await file.text()).slice(0, 120_000);
        status.textContent = `${file.name}의 글자를 불러왔습니다.`;
        status.dataset.error = "false";
      });
      container.querySelector("[data-tool-copy]")?.addEventListener("click", async (event) => {
        if (!latestText) return;
        try { await navigator.clipboard.writeText(latestText); event.currentTarget.textContent = "복사됨"; window.setTimeout(() => { event.currentTarget.textContent = "결과 복사"; }, 1500); }
        catch { status.textContent = "복사하지 못했습니다. 결과를 직접 선택해 주세요."; status.dataset.error = "true"; }
      });
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const current = platform?.snapshot?.();
        if (!current?.user) { platform?.openLogin?.(); return; }
        const source = textarea.value.trim();
        if (source.length < 10) { status.textContent = "생성할 내용을 10글자 이상 입력해 주세요."; status.dataset.error = "true"; textarea.focus(); return; }
        busy = true;
        submit.disabled = true;
        submit.textContent = "생성 중...";
        status.textContent = "AI가 내용을 정리하고 있습니다. 성공하기 전에는 빌드가 확정 차감되지 않습니다.";
        status.dataset.error = "false";
        output.className = "build-tool-output-empty";
        output.textContent = "생성 중입니다...";
        outputActions.hidden = true;
        resultLink.hidden = true;
        try {
          const title = form.elements.title.value.trim() || tool.title;
          const option = form.elements.option.value;
          const prompt = tool.id === "meeting"
            ? `작업 제목: ${title}\n결과 언어: ${option}\n\n다음 회의 기록을 정리해 주세요.\n\n${source}`
            : `쇼츠 제목: ${title}\n목표 길이: ${option}\n\n다음 내용으로 세로형 쇼츠 제작안을 작성해 주세요.\n\n${source}`;
          const data = await platform.generate(tool.id, { prompt, title, option, source });
          latestText = String(data.result?.text || "").trim();
          output.className = "";
          output.replaceChildren();
          const pre = document.createElement("pre");
          pre.textContent = latestText || (data.result?.jobUrl ? "외부 제작 요청이 접수되었습니다." : "결과 내용이 없습니다.");
          output.appendChild(pre);
          outputActions.hidden = false;
          if (data.result?.jobUrl) { resultLink.href = data.result.jobUrl; resultLink.hidden = false; }
          status.textContent = `완료되었습니다. ${cost}빌드를 사용했고 현재 ${Number(data.balance || 0).toLocaleString("ko-KR")}빌드입니다.`;
        } catch (error) {
          output.className = "build-tool-output-empty";
          output.textContent = "생성을 완료하지 못했습니다.";
          status.textContent = error.message;
          status.dataset.error = "true";
        } finally {
          busy = false;
          submit.disabled = !enabled;
          submit.textContent = enabled ? `${cost}빌드로 생성` : "관리자 설정 대기";
        }
      });
    };

    draw();
    window.BuildersPlatform?.subscribe?.(draw);
  }

  window.LoungePlaceholders = Object.freeze({ render });
})();
