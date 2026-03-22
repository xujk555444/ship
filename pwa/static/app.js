import { TONNAGE_REMINDER_THRESHOLD, generateShipment, resetState } from "./shipment-core.js";

const STORAGE_KEY = "shipment-pwa-state-v2";

const elements = {
  bigShipInput: document.querySelector("#bigShipInput"),
  flowInput: document.querySelector("#flowInput"),
  totalInput: document.querySelector("#totalInput"),
  rawInput: document.querySelector("#rawInput"),
  outputText: document.querySelector("#outputText"),
  statusText: document.querySelector("#statusText"),
  saveStateButton: document.querySelector("#saveStateButton"),
  completeButton: document.querySelector("#completeButton"),
  clearButton: document.querySelector("#clearButton"),
  generateButton: document.querySelector("#generateButton"),
  copyButton: document.querySelector("#copyButton"),
};

function getEmptyState() {
  return { big_ship_no: "", flow: "", current_total: 0 };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return getEmptyState();
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      big_ship_no: String(parsed.big_ship_no || "").trim(),
      flow: String(parsed.flow || "").trim(),
      current_total: Number(parsed.current_total || 0),
    };
  } catch {
    return getEmptyState();
  }
}

function saveState(state, message = "状态已保存到本机浏览器。") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  setStatus(message, "success");
}

function readFormState() {
  return {
    big_ship_no: elements.bigShipInput.value.trim(),
    flow: elements.flowInput.value.trim(),
    current_total: Number(elements.totalInput.value || 0),
  };
}

function writeFormState(state) {
  elements.bigShipInput.value = state.big_ship_no || "";
  elements.flowInput.value = state.flow || "";
  elements.totalInput.value = state.current_total ? String(state.current_total) : "";
}

function setStatus(message, tone = "") {
  elements.statusText.textContent = message;
  if (tone) {
    elements.statusText.dataset.tone = tone;
  } else {
    delete elements.statusText.dataset.tone;
  }
}

function clearStatus() {
  setStatus("");
}

function generate() {
  const state = readFormState();
  const rawText = elements.rawInput.value.trim();

  try {
    const { output, state: updatedState, reminderRequired } = generateShipment(rawText, state);
    elements.outputText.value = output;
    writeFormState(updatedState);
    saveState(updatedState, "结果已生成并保存状态。");

    if (reminderRequired) {
      const shouldComplete = window.confirm(`当前累积已超过${TONNAGE_REMINDER_THRESHOLD}吨，这条大船是否运完？`);
      if (shouldComplete) {
        completeRun(true);
      }
    }
  } catch (error) {
    setStatus(error.message || "生成失败。", "error");
  }
}

async function copyOutput() {
  const text = elements.outputText.value;
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    clearStatus();
  } catch {
    elements.outputText.focus();
    elements.outputText.select();
    const copied = document.execCommand("copy");
    if (!copied) {
      setStatus("复制失败，请手动长按复制。", "error");
      return;
    }
    clearStatus();
  }
}

function completeRun(fromReminder = false) {
  const confirmed = fromReminder || window.confirm("确定这条大船已经运完吗？会清空大船号、流向和累积。");
  if (!confirmed) {
    return;
  }

  const state = resetState();
  writeFormState(state);
  saveState(state, "当前状态已清空。");
}

function clearText() {
  elements.rawInput.value = "";
  elements.outputText.value = "";
  setStatus("已清空输入和结果。");
}

function installServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      setStatus("PWA 缓存注册失败，但不影响继续使用。", "error");
    });
  }
}

function bindEvents() {
  elements.saveStateButton.addEventListener("click", () => saveState(readFormState()));
  elements.completeButton.addEventListener("click", () => completeRun(false));
  elements.clearButton.addEventListener("click", clearText);
  elements.generateButton.addEventListener("click", generate);
  elements.copyButton.addEventListener("click", copyOutput);
}

function init() {
  writeFormState(loadState());
  bindEvents();
  installServiceWorker();
}

init();
