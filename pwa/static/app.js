import { TONNAGE_REMINDER_THRESHOLD, generateShipment } from "./shipment-core.js";
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  addShip,
  createEmptyStore,
  getActiveShip,
  parseStore,
  removeShip,
  selectShip,
  updateShip,
} from "./shipment-store.js";

const elements = {
  shipsList: document.querySelector("#shipsList"),
  shipCount: document.querySelector("#shipCount"),
  emptyState: document.querySelector("#emptyState"),
  workspace: document.querySelector("#workspace"),
  addShipButton: document.querySelector("#addShipButton"),
  bigShipInput: document.querySelector("#bigShipInput"),
  contractInput: document.querySelector("#contractInput"),
  flowInput: document.querySelector("#flowInput"),
  totalInput: document.querySelector("#totalInput"),
  rawInput: document.querySelector("#rawInput"),
  outputText: document.querySelector("#outputText"),
  statusText: document.querySelector("#statusText"),
  saveStateButton: document.querySelector("#saveStateButton"),
  completeButton: document.querySelector("#completeButton"),
  clearButton: document.querySelector("#clearButton"),
  clearRawButton: document.querySelector("#clearRawButton"),
  generateButton: document.querySelector("#generateButton"),
  copyButton: document.querySelector("#copyButton"),
};

let store = createEmptyStore();

function loadStore() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return parseStore(localStorage.getItem(STORAGE_KEY));
  } catch {
    setStatus("无法读取本机状态，本次内容只会保留到页面关闭。", "error");
    return createEmptyStore();
  }
}

function persistStore(message = "") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    setStatus("无法保存到本机，请不要关闭当前页面。", "error");
    return false;
  }

  if (message) {
    setStatus(message, "success");
  }
  return true;
}

function createShipId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `ship-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readFormShip() {
  return {
    big_ship_no: elements.bigShipInput.value,
    contract_no: elements.contractInput.value.trim(),
    flow: elements.flowInput.value,
    current_total: Number(elements.totalInput.value || 0),
    raw_text: elements.rawInput.value,
    output_text: elements.outputText.value,
  };
}

function writeFormShip(ship) {
  elements.bigShipInput.value = ship.big_ship_no || "";
  elements.contractInput.value = ship.contract_no || "";
  elements.flowInput.value = ship.flow || "";
  elements.totalInput.value = ship.current_total ? String(ship.current_total) : "";
  elements.rawInput.value = ship.raw_text || "";
  elements.outputText.value = ship.output_text || "";
}

function persistActiveShip(refreshCards = false) {
  const activeShip = getActiveShip(store);
  if (!activeShip) {
    return;
  }

  store = updateShip(store, activeShip.id, readFormShip());
  persistStore();
  if (refreshCards) {
    renderShipCards();
  }
}

function renderShipCards() {
  const previousScroll = elements.shipsList.scrollLeft;
  elements.shipCount.textContent = String(store.ships.length);
  elements.shipsList.replaceChildren();

  store.ships.forEach((ship, index) => {
    const isActive = ship.id === store.activeShipId;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ship-tab${isActive ? " is-active" : ""}`;
    button.dataset.shipId = ship.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(isActive));
    button.setAttribute("aria-controls", "workspace");
    button.tabIndex = isActive ? 0 : -1;

    const name = document.createElement("span");
    name.className = "ship-tab-name";
    name.textContent = ship.big_ship_no.trim() || `新大船 ${index + 1}`;

    const flow = document.createElement("span");
    flow.className = "ship-tab-flow";
    flow.textContent = ship.flow.trim() || "待填写流向";

    const total = document.createElement("span");
    total.className = "ship-tab-total";
    total.textContent = `累积 ${ship.current_total || 0} 吨`;

    button.append(name, flow, total);
    elements.shipsList.append(button);
  });

  elements.shipsList.scrollLeft = previousScroll;
}

function renderWorkspace() {
  const activeShip = getActiveShip(store);
  const hasShips = Boolean(activeShip);
  elements.emptyState.hidden = hasShips;
  elements.shipsList.hidden = !hasShips;
  elements.workspace.hidden = !hasShips;

  if (activeShip) {
    writeFormShip(activeShip);
  }
}

function renderAll() {
  renderShipCards();
  renderWorkspace();
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

function addNewShip() {
  persistActiveShip();
  store = addShip(store, createShipId());
  persistStore();
  renderAll();
  clearStatus();
  elements.bigShipInput.focus();
}

function switchShip(shipId) {
  if (shipId === store.activeShipId) {
    return;
  }

  persistActiveShip();
  store = selectShip(store, shipId);
  persistStore();
  renderAll();
  clearStatus();
}

function saveCurrentShip() {
  const activeShip = getActiveShip(store);
  if (!activeShip) {
    setStatus("请先新增一条大船。", "error");
    return;
  }

  persistActiveShip(true);
  const savedShip = getActiveShip(store);
  const name = savedShip.big_ship_no.trim() || "当前大船";
  setStatus(`“${name}”状态已保存到本机。`, "success");
}

function generate() {
  persistActiveShip();
  const activeShip = getActiveShip(store);
  if (!activeShip) {
    setStatus("请先新增一条大船。", "error");
    return;
  }

  const state = {
    big_ship_no: activeShip.big_ship_no.trim(),
    contract_no: activeShip.contract_no.trim(),
    flow: activeShip.flow.trim(),
    current_total: activeShip.current_total,
  };

  try {
    const { output, state: updatedState, reminderRequired } = generateShipment(
      activeShip.raw_text.trim(),
      state,
    );
    store = updateShip(store, activeShip.id, {
      ...updatedState,
      raw_text: activeShip.raw_text,
      output_text: output,
    });
    persistStore();
    writeFormShip(getActiveShip(store));
    renderShipCards();
    setStatus("结果已生成并保存到当前大船。", "success");

    if (reminderRequired) {
      const updatedShip = getActiveShip(store);
      const name = updatedShip.big_ship_no.trim() || "当前大船";
      const shouldComplete = window.confirm(
        `“${name}”当前累积已超过${TONNAGE_REMINDER_THRESHOLD}吨，是否已运完并删除？`,
      );
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
  persistActiveShip();
  const activeShip = getActiveShip(store);
  if (!activeShip) {
    setStatus("当前没有可标记运完的大船。", "error");
    return;
  }

  const name = activeShip.big_ship_no.trim() || "未命名大船";
  const confirmed = fromReminder || window.confirm(
    `确定“${name}”已经运完吗？最终累积 ${activeShip.current_total || 0} 吨，确认后会删除这条大船。`,
  );
  if (!confirmed) {
    return;
  }

  store = removeShip(store, activeShip.id);
  persistStore();
  renderAll();
  setStatus(`“${name}”已标记运完并删除。`, "success");
}

function clearText() {
  if (!getActiveShip(store)) {
    setStatus("请先新增一条大船。", "error");
    return;
  }

  elements.rawInput.value = "";
  elements.outputText.value = "";
  persistActiveShip();
  setStatus("已清空当前大船的输入和结果。");
}

function clearRawText() {
  if (!getActiveShip(store)) {
    setStatus("请先新增一条大船。", "error");
    return;
  }

  elements.rawInput.value = "";
  persistActiveShip();
  setStatus("已清空当前大船的原始信息。");
}

function installServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      setStatus("PWA 缓存注册失败，但不影响继续使用。", "error");
    });
  }
}

function bindEvents() {
  elements.addShipButton.addEventListener("click", addNewShip);
  elements.shipsList.addEventListener("click", (event) => {
    const shipTab = event.target.closest("[data-ship-id]");
    if (shipTab) {
      switchShip(shipTab.dataset.shipId);
    }
  });
  elements.saveStateButton.addEventListener("click", saveCurrentShip);
  elements.completeButton.addEventListener("click", () => completeRun(false));
  elements.clearButton.addEventListener("click", clearText);
  elements.clearRawButton.addEventListener("click", clearRawText);
  elements.generateButton.addEventListener("click", generate);
  elements.copyButton.addEventListener("click", copyOutput);

  [elements.bigShipInput, elements.contractInput, elements.flowInput, elements.totalInput].forEach((input) => {
    input.addEventListener("input", () => persistActiveShip(true));
  });
  [elements.rawInput, elements.outputText].forEach((input) => {
    input.addEventListener("input", () => persistActiveShip());
  });
}

function init() {
  store = loadStore();
  bindEvents();
  renderAll();
  installServiceWorker();
}

init();
