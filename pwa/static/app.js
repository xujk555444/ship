const STORAGE_KEY = "shipment-pwa-state-v1";

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

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { big_ship_no: "", flow: "", current_total: 0 };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      big_ship_no: parsed.big_ship_no || "",
      flow: parsed.flow || "",
      current_total: Number(parsed.current_total || 0),
    };
  } catch {
    return { big_ship_no: "", flow: "", current_total: 0 };
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

async function generate() {
  const state = readFormState();
  const rawText = elements.rawInput.value.trim();

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: rawText, state }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "生成失败。");
    }

    const data = await response.json();
    elements.outputText.value = data.output;
    writeFormState(data.state);
    saveState(data.state, "结果已生成并保存状态。");

    if (data.reminder_required) {
      const shouldComplete = window.confirm("当前累积已超过80000吨，这条大船是否运完？");
      if (shouldComplete) {
        await resetRun(true);
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
    setStatus("结果已复制到剪贴板。", "success");
  } catch {
    elements.outputText.focus();
    elements.outputText.select();
    document.execCommand("copy");
    setStatus("结果已复制到剪贴板。", "success");
  }
}

async function resetRun(fromReminder = false) {
  const confirmed = fromReminder || window.confirm("确定这条大船已经运完吗？会清空大船号、流向和累积。");
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch("/api/reset-state", { method: "POST" });
    const data = await response.json();
    writeFormState(data.state);
    saveState(data.state, "当前状态已清空。");
  } catch {
    writeFormState({ big_ship_no: "", flow: "", current_total: 0 });
    saveState({ big_ship_no: "", flow: "", current_total: 0 }, "当前状态已清空。");
  }
}

function clearText() {
  elements.rawInput.value = "";
  elements.outputText.value = "";
  setStatus("已清空输入和结果。");
}

function installServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      setStatus("PWA 缓存注册失败，但不影响继续使用。", "error");
    });
  }
}

function bindEvents() {
  elements.saveStateButton.addEventListener("click", () => saveState(readFormState()));
  elements.completeButton.addEventListener("click", () => resetRun(false));
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
