"use strict";

document.documentElement.classList.add("install-js");

const requestSource = document.querySelector("[data-install-request]");
const copyButtons = [...document.querySelectorAll("[data-copy-request]")];
const copyStatuses = [...document.querySelectorAll("[data-copy-status]")];
const osTabs = [...document.querySelectorAll("[data-os-tab]")];
const osPanels = [...document.querySelectorAll("[data-os-panel]")];

function setCopyStatus(message, state = "") {
  copyStatuses.forEach((status) => {
    status.textContent = message;
    status.classList.toggle("is-success", state === "success");
    status.classList.toggle("is-error", state === "error");
  });
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

async function copyInstallRequest() {
  const request = requestSource?.textContent.trim();
  if (!request) {
    setCopyStatus("복사할 요청문을 찾지 못했습니다. 아래 요청문을 직접 선택하세요.", "error");
    return;
  }

  copyButtons.forEach((button) => {
    button.disabled = true;
  });

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(request);
    } else if (!fallbackCopy(request)) {
      throw new Error("clipboard unavailable");
    }

    setCopyStatus("복사했습니다. Codex 대화창에 붙여넣으세요.", "success");
  } catch (error) {
    setCopyStatus("복사하지 못했습니다. 아래 요청문을 직접 선택하세요.", "error");
    requestSource.closest("details")?.setAttribute("open", "");
  } finally {
    copyButtons.forEach((button) => {
      button.disabled = false;
    });
  }
}

copyButtons.forEach((button) => {
  button.addEventListener("click", copyInstallRequest);
});

function activatePlatform(platform, focusTab = false) {
  const selectedTab = osTabs.find((tab) => tab.dataset.osTab === platform) ?? osTabs[0];
  if (!selectedTab) return;

  osTabs.forEach((tab) => {
    const selected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  osPanels.forEach((panel) => {
    panel.hidden = panel.dataset.osPanel !== selectedTab.dataset.osTab;
  });

  if (focusTab) selectedTab.focus();
}

osTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activatePlatform(tab.dataset.osTab));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + osTabs.length) % osTabs.length;
    activatePlatform(osTabs[nextIndex].dataset.osTab, true);
  });
});

const platformName = navigator.userAgentData?.platform ?? navigator.platform ?? "";
activatePlatform(/Win/i.test(platformName) ? "windows" : "macos");
