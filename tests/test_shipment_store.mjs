import test from "node:test";
import assert from "node:assert/strict";

test("取消记录兼容旧数据，跨重载保留且各船隔离", () => {
  let store = addShip(createEmptyStore(), "a");
  assert.deepEqual(getActiveShip(store).cancellation_keys, []);
  store = updateShip(store, "a", { cancellation_keys: ['["大福8988",3900]'], current_total: 45800 });
  store = addShip(store, "b");
  assert.deepEqual(getActiveShip(store).cancellation_keys, []);
  store = selectShip(parseStore(JSON.stringify(store)), "a");
  store = updateShip(store, "a", { raw_text: "", output_text: "" });
  assert.deepEqual(getActiveShip(store).cancellation_keys, ['["大福8988",3900]']);
  assert.equal(getActiveShip(store).current_total, 45800);
  assert.deepEqual(removeShip(store, "a").ships.map((ship) => ship.id), ["b"]);
  const legacy = { version: 3, activeShipId: "old", ships: [{ id: "old", current_total: 99 }] };
  assert.deepEqual(getActiveShip(parseStore(JSON.stringify(legacy))).cancellation_keys, []);
});

import {
  STORE_VERSION,
  addShip,
  createEmptyStore,
  getActiveShip,
  parseStore,
  removeShip,
  selectShip,
  updateShip,
} from "../pwa/static/shipment-store.js";

test("新增多条大船并分别保存累计", () => {
  let store = addShip(createEmptyStore(), "ship-a");
  store = updateShip(store, "ship-a", {
    big_ship_no: "九华真诚",
    flow: "高栏—都骑",
    current_total: 3200,
  });
  store = addShip(store, "ship-b");
  store = updateShip(store, "ship-b", {
    big_ship_no: "粤海轮",
    flow: "高栏—云浮",
    current_total: 4600,
  });

  assert.equal(store.ships[0].current_total, 3200);
  assert.equal(store.ships[1].current_total, 4600);
  assert.equal(store.activeShipId, "ship-b");
});

test("每条大船分别保存原始信息和生成结果", () => {
  let store = addShip(createEmptyStore(), "ship-a");
  store = updateShip(store, "ship-a", { raw_text: "A 原文", output_text: "A 结果" });
  store = addShip(store, "ship-b");
  store = updateShip(store, "ship-b", { raw_text: "B 原文", output_text: "B 结果" });

  assert.deepEqual(
    store.ships.map(({ raw_text, output_text }) => ({ raw_text, output_text })),
    [
      { raw_text: "A 原文", output_text: "A 结果" },
      { raw_text: "B 原文", output_text: "B 结果" },
    ],
  );
});

test("每条大船分别保存合同号", () => {
  let store = addShip(createEmptyStore(), "ship-a");
  store = updateShip(store, "ship-a", { contract_no: " CONTRACT-A " });
  store = addShip(store, "ship-b");
  store = updateShip(store, "ship-b", { contract_no: "CONTRACT-B" });

  assert.deepEqual(store.ships.map((ship) => ship.contract_no), ["CONTRACT-A", "CONTRACT-B"]);
});

test("现有 v3 数据缺少合同号时自动使用空值", () => {
  const store = parseStore(JSON.stringify({
    version: STORE_VERSION,
    activeShipId: "ship-a",
    ships: [
      {
        id: "ship-a",
        big_ship_no: "九华真诚",
        flow: "高栏—都骑",
        current_total: 3200,
        raw_text: "原文",
        output_text: "结果",
      },
    ],
  }));

  assert.equal(store.ships[0].contract_no, "");
  assert.equal(store.ships[0].current_total, 3200);
  assert.equal(store.ships[0].raw_text, "原文");
  assert.equal(store.ships[0].output_text, "结果");
});

test("切换大船后返回对应状态", () => {
  let store = addShip(createEmptyStore(), "ship-a");
  store = updateShip(store, "ship-a", { big_ship_no: "大船 A" });
  store = addShip(store, "ship-b");
  store = updateShip(store, "ship-b", { big_ship_no: "大船 B" });
  store = selectShip(store, "ship-a");

  assert.equal(getActiveShip(store).big_ship_no, "大船 A");
});

test("删除当前大船后优先选择下一条", () => {
  let store = addShip(createEmptyStore(), "ship-a");
  store = addShip(store, "ship-b");
  store = addShip(store, "ship-c");
  store = selectShip(store, "ship-b");
  store = removeShip(store, "ship-b");

  assert.deepEqual(store.ships.map((ship) => ship.id), ["ship-a", "ship-c"]);
  assert.equal(store.activeShipId, "ship-c");
});

test("删除最后一条大船后回到空状态", () => {
  let store = addShip(createEmptyStore(), "ship-a");
  store = removeShip(store, "ship-a");

  assert.deepEqual(store, createEmptyStore());
});

test("旧版单船数据不迁移", () => {
  const oldState = JSON.stringify({
    big_ship_no: "旧大船",
    flow: "旧流向",
    current_total: 12000,
  });

  assert.deepEqual(parseStore(oldState), createEmptyStore());
});

test("损坏或重复编号的数据会安全归一化", () => {
  const store = parseStore(JSON.stringify({
    version: STORE_VERSION,
    activeShipId: "missing",
    ships: [
      { id: "ship-a", current_total: "3200" },
      { id: "ship-a", current_total: 9999 },
      { id: "", current_total: 4600 },
    ],
  }));

  assert.equal(store.ships.length, 1);
  assert.equal(store.ships[0].current_total, 3200);
  assert.equal(store.activeShipId, "ship-a");
});
