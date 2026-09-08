export const COMPANY = "广东粤电云河发电有限公司";
export const CARRIER = "广东省新能航运有限公司/船管公司";
export const TONNAGE_REMINDER_THRESHOLD = 80000;

export function resetState() {
  return { big_ship_no: "", contract_no: "", flow: "", current_total: 0 };
}

export function parseMessage(rawText, now = new Date()) {
  const text = normalizeText(rawText);
  return {
    ship_no: extractShipNo(text),
    amount: extractAmount(text),
    phone: extractPhone(text),
    flow: "",
    schedule: extractSchedule(text, now),
    isCancellation: /取消计划|计划取消/u.test(text),
  };
}

export function buildOutput(parsed, state) {
  const currentTotal = toInt(state.current_total);
  const newTotal = parsed.isCancellation
    ? currentTotal - parsed.amount
    : currentTotal <= 0 ? parsed.amount : currentTotal + parsed.amount;
  const contractNo = String(state.contract_no || "").trim();
  const lines = [
    `委托公司：${COMPANY}`,
    `承运公司:${CARRIER}`,
    `大船号:${state.big_ship_no}`,
    ...(contractNo ? [`合同号：${contractNo}`] : []),
    `船号:${parsed.ship_no}`,
    `报装${parsed.amount}吨`,
    `累积${newTotal}吨`,
    `电话${parsed.phone}`,
    `船期：${parsed.schedule}`,
    `流向：${state.flow}`,
    ...(parsed.isCancellation ? ["计划取消"] : []),
  ];
  return { output: lines.join("\n"), newTotal };
}

export function generateShipment(rawText, state, now = new Date()) {
  const normalizedState = {
    big_ship_no: String(state.big_ship_no || "").trim(),
    contract_no: String(state.contract_no || "").trim(),
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
  let cancellationKey = null;
  if (parsed.isCancellation) {
    const explicitShip = normalizedText.match(/(?:^|\n)[ \t]*(?:小船号|船号|船名)[ \t]*[:：]?[ \t]*([^\r\n]+)/u)
      || normalizedText.match(/@([^\s,，、]+)/u);
    if (!explicitShip || !normalizeShipNo(explicitShip[1]).replace(/[:：\s]/gu, "")) {
      throw new Error("取消计划必须明确填写小船号或船名。");
    }
    parsed.ship_no = normalizeShipNo(explicitShip[1]);
    const amountToken = normalizedText.match(/(?:报装|计划装|装煤|装)[ \t]*[:：]?[ \t]*([^\s吨]+)/u)?.[1];
    if (!amountToken || !/^\d+$/u.test(amountToken) || !Number.isSafeInteger(parsed.amount) || parsed.amount <= 0) {
      throw new Error("取消吨数必须为正整数。");
    }
    const bigShip = normalizedText.match(/(?:^|\n)[ \t]*大船号[ \t]*[:：]?[ \t]*([^\r\n]*)/u);
    if (bigShip && bigShip[1].trim() !== normalizedState.big_ship_no) {
      throw new Error("取消信息的大船号与当前大船不一致，请切换到对应大船。");
    }
    if (!Number.isSafeInteger(Number(state.current_total)) || Number(state.current_total) < parsed.amount) {
      throw new Error("取消吨数超过当前累计，或当前累计无效。");
    }
    cancellationKey = JSON.stringify([parsed.ship_no, parsed.amount]);
  }
  const { output, newTotal } = buildOutput(parsed, normalizedState);
  return {
    parsed,
    output,
    newTotal,
    cancellationKey,
    reminderRequired: !parsed.isCancellation && newTotal > TONNAGE_REMINDER_THRESHOLD,
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

  const labelMatch = text.match(/(?:^|\n)[ \t]*(?:小船号|船号|船名)[ \t]*[:：]?[ \t]*([^\r\n]+)/u);
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
