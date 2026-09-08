export const STORE_VERSION = 3;
export const STORAGE_KEY = "shipment-pwa-state-v3";
export const LEGACY_STORAGE_KEY = "shipment-pwa-state-v2";

export function createEmptyStore() {
  return { version: STORE_VERSION, activeShipId: null, ships: [] };
}

export function createShip(id) {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) {
    throw new Error("新增大船时缺少有效编号。");
  }

  return {
    id: normalizedId,
    big_ship_no: "",
    contract_no: "",
    flow: "",
    current_total: 0,
    raw_text: "",
    output_text: "",
    cancellation_keys: [],
  };
}

export function parseStore(serialized) {
  if (!serialized) {
    return createEmptyStore();
  }

  try {
    return normalizeStore(JSON.parse(serialized));
  } catch {
    return createEmptyStore();
  }
}

export function normalizeStore(value) {
  if (!value || value.version !== STORE_VERSION || !Array.isArray(value.ships)) {
    return createEmptyStore();
  }

  const seenIds = new Set();
  const ships = value.ships
    .map(normalizeShip)
    .filter((ship) => {
      if (!ship || seenIds.has(ship.id)) {
        return false;
      }
      seenIds.add(ship.id);
      return true;
    });

  const requestedActiveId = String(value.activeShipId || "");
  const activeShipId = ships.some((ship) => ship.id === requestedActiveId)
    ? requestedActiveId
    : (ships[0]?.id ?? null);

  return { version: STORE_VERSION, activeShipId, ships };
}

export function addShip(store, id) {
  const normalizedStore = normalizeStore(store);
  const ship = createShip(id);
  return {
    ...normalizedStore,
    activeShipId: ship.id,
    ships: [...normalizedStore.ships, ship],
  };
}

export function selectShip(store, id) {
  const normalizedStore = normalizeStore(store);
  const shipId = String(id || "");
  if (!normalizedStore.ships.some((ship) => ship.id === shipId)) {
    return normalizedStore;
  }
  return { ...normalizedStore, activeShipId: shipId };
}

export function updateShip(store, id, changes) {
  const normalizedStore = normalizeStore(store);
  const shipId = String(id || "");
  return {
    ...normalizedStore,
    ships: normalizedStore.ships.map((ship) =>
      ship.id === shipId ? normalizeShip({ ...ship, ...changes, id: ship.id }) : ship,
    ),
  };
}

export function removeShip(store, id) {
  const normalizedStore = normalizeStore(store);
  const shipId = String(id || "");
  const removedIndex = normalizedStore.ships.findIndex((ship) => ship.id === shipId);
  if (removedIndex < 0) {
    return normalizedStore;
  }

  const ships = normalizedStore.ships.filter((ship) => ship.id !== shipId);
  let activeShipId = normalizedStore.activeShipId;
  if (activeShipId === shipId) {
    activeShipId = ships[removedIndex]?.id ?? ships[removedIndex - 1]?.id ?? null;
  }

  return { ...normalizedStore, activeShipId, ships };
}

export function getActiveShip(store) {
  const normalizedStore = normalizeStore(store);
  return normalizedStore.ships.find((ship) => ship.id === normalizedStore.activeShipId) ?? null;
}

function normalizeShip(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const id = String(value.id || "").trim();
  if (!id) {
    return null;
  }

  const total = Number(value.current_total);
  return {
    id,
    big_ship_no: String(value.big_ship_no || ""),
    contract_no: String(value.contract_no || "").trim(),
    flow: String(value.flow || ""),
    current_total: Number.isFinite(total) ? Math.trunc(total) : 0,
    raw_text: String(value.raw_text || ""),
    output_text: String(value.output_text || ""),
    cancellation_keys: Array.isArray(value.cancellation_keys)
      ? [...new Set(value.cancellation_keys.filter((key) => typeof key === "string"))]
      : [],
  };
}
