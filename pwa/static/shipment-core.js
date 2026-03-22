export const COMPANY = "广东粤电云河发电有限公司";
export const CARRIER = "广东省新能航运有限公司/船管公司";
export const TONNAGE_REMINDER_THRESHOLD = 80000;

export function resetState() {
  return { big_ship_no: "", flow: "", current_total: 0 };
}

export function parseMessage(rawText, now = new Date()) {
  const text = normalizeText(rawText);
  return {
    ship_no: extractShipNo(text),
    amount: extractAmount(text),
    phone: extractPhone(text),
    flow: "",
    schedule: extractSchedule(text, now),
  };
}

export function buildOutput(parsed, state) {
  const currentTotal = toInt(state.current_total);
  const newTotal = currentTotal <= 0 ? parsed.amount : currentTotal + parsed.amount;
  const lines = [
    `委托公司：${COMPANY}`,
    `承运公司:${CARRIER}`,
    `大船号:${state.big_ship_no}`,
    `船号:${parsed.ship_no}`,
    `报装${parsed.amount}吨`,
    `累积${newTotal}吨`,
    `电话${parsed.phone}`,
    `船期：${parsed.schedule}`,
    `流向：${state.flow}`,
  ];
  return { output: lines.join("\n"), newTotal };
}

export function generateShipment(rawText, state, now = new Date()) {
  const normalizedState = {
    big_ship_no: String(state.big_ship_no || "").trim(),
    flow: String(state.flow || "").trim(),
    current_total: toInt(state.current_total),
  };
  const normalizedText = String(rawText || "").trim();

  if (!normalizedState.big_ship_no) {
    throw new Error("请先填写大船号。");
  }
  if (!normalizedState.flow) {
    throw new Error("请先在当前状态中填写流向。");
  }
  if (!normalizedText) {
    throw new Error("请先粘贴原始报装信息。");
  }

  const parsed = parseMessage(normalizedText, now);
  const { output, newTotal } = buildOutput(parsed, normalizedState);
  return {
    parsed,
    output,
    newTotal,
    reminderRequired: newTotal > TONNAGE_REMINDER_THRESHOLD,
    state: {
      ...normalizedState,
      current_total: newTotal,
    },
  };
}

export function normalizeText(text) {
  return String(text || "")
    .replaceAll("\u2005", " ")
    .replaceAll("\u00a0", " ")
    .replaceAll("，", " ")
    .replaceAll(",", " ")
    .trim();
}

export function extractShipNo(text) {
  const atMatch = text.match(/@([^\s,，、]+)/u);
  if (atMatch) {
    return normalizeShipNo(atMatch[1].trim());
  }

  const labelMatch = text.match(/(?:船号|船名)\s*[:：]?\s*([^\r\n]+)/u);
  if (labelMatch) {
    return normalizeShipNo(labelMatch[1].trim());
  }

  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim().replace(/^[：:]+/u, "").trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error("未识别到船号，请检查原始信息。");
  }

  const firstLine = lines[0].replace(/^(?:船号|船名)\s*[:：]?/u, "").trim();
  if (!firstLine) {
    throw new Error("未识别到船号，请检查原始信息。");
  }
  return normalizeShipNo(firstLine);
}

export function extractAmount(text) {
  const amountMatch = text.match(/(?:报装|计划装|装煤|装)\s*[:：]?\s*(\d+)\s*吨?/u);
  if (!amountMatch) {
    throw new Error("未识别到报装吨数，请检查原始信息。");
  }
  return Number(amountMatch[1]);
}

export function extractPhone(text) {
  const labeledMatch = text.match(/电话\s*[:：]?\s*(1\d{10})/u);
  if (labeledMatch) {
    return labeledMatch[1];
  }

  const standaloneMatch = text.match(/(?<!\d)(1\d{10})(?!\d)/u);
  return standaloneMatch ? standaloneMatch[1] : "";
}

export function extractSchedule(text, now = new Date()) {
  const explicitMatch = text.match(/船期\s*[:：]?\s*(\d{1,2})月\s*(\d{1,2})日/u);
  if (explicitMatch) {
    return `${Number(explicitMatch[1])}月${Number(explicitMatch[2])}日`;
  }

  const dayOnlyMatch = text.match(/船期\s*[:：]?\s*(\d{1,2})号/u);
  if (dayOnlyMatch) {
    return `${now.getMonth() + 1}月${Number(dayOnlyMatch[1])}日`;
  }

  if (text.includes("吉船")) {
    return formatDay(now);
  }

  if (text.includes("@") && text.includes("装煤")) {
    const nextDay = new Date(now);
    nextDay.setDate(now.getDate() + 1);
    return formatDay(nextDay);
  }

  return "";
}

export function formatDay(day) {
  return `${day.getMonth() + 1}月${day.getDate()}日`;
}

export function toInt(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

export function normalizeShipNo(value) {
  const shipNo = String(value || "").trim();
  if (/^[\p{Script=Han}A-Za-z]+[0-9]+船$/u.test(shipNo)) {
    return shipNo.slice(0, -1);
  }
  return shipNo;
}
