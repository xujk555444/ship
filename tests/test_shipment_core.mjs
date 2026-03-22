import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPANY,
  CARRIER,
  TONNAGE_REMINDER_THRESHOLD,
  extractAmount,
  extractPhone,
  extractSchedule,
  generateShipment,
  normalizeShipNo,
} from "../pwa/static/shipment-core.js";

test("固定抬头常量正确", () => {
  assert.equal(COMPANY, "广东粤电云河发电有限公司");
  assert.equal(CARRIER, "广东省新能航运有限公司/船管公司");
  assert.equal(TONNAGE_REMINDER_THRESHOLD, 80000);
});

test("可识别独立 11 位手机号", () => {
  assert.equal(extractPhone("@达峰3013 业务 13533036861 神华装煤2800吨都骑"), "13533036861");
});

test("可识别多种报装写法", () => {
  assert.equal(extractAmount("报装5050"), 5050);
  assert.equal(extractAmount("计划装3000吨"), 3000);
  assert.equal(extractAmount("@达峰3013 装煤2800吨"), 2800);
});

test("船期规则与桌面版保持一致", () => {
  const fakeToday = new Date("2026-03-22T08:00:00+08:00");
  assert.equal(extractSchedule("船期:13号", fakeToday), "3月13日");
  assert.equal(extractSchedule("船期:3月14日", fakeToday), "3月14日");
  assert.equal(extractSchedule("吉船已到锚地", fakeToday), "3月22日");
  assert.equal(extractSchedule("@达峰3013 装煤2800吨", fakeToday), "3月23日");
});

test("船名标准化去掉尾部船字", () => {
  assert.equal(normalizeShipNo("港盛238船"), "港盛238");
});

test("生成结果只使用上方流向，并按累积规则递增", () => {
  const result = generateShipment(
    "船号:福顺855\n报装4600吨\n流向:高栏到云浮\n船期:13号",
    {
      big_ship_no: "九华真诚",
      flow: "高栏—都骑",
      current_total: 70127,
    },
    new Date("2026-03-22T08:00:00+08:00"),
  );

  assert.equal(result.newTotal, 74727);
  assert.match(result.output, /流向：高栏—都骑/u);
  assert.doesNotMatch(result.output, /高栏到云浮/u);
});

test("超过 80000 吨时返回提醒标记", () => {
  const result = generateShipment(
    "船号:福顺855\n报装1000吨",
    {
      big_ship_no: "九华真诚",
      flow: "高栏—都骑",
      current_total: 80000,
    },
    new Date("2026-03-22T08:00:00+08:00"),
  );

  assert.equal(result.reminderRequired, true);
});
