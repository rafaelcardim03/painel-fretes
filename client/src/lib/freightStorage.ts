const DB_NAME = "rotaclara-storage";
const STORE_NAME = "freight";
const KEY = "latest-csv";

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const saveIndexedDb = async (raw: string) => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(raw, KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export async function saveFreightRaw(raw: string) {
  // IndexedDB is written first so a new import can never be shadowed by an older localStorage copy.
  await saveIndexedDb(raw);
  try { localStorage.setItem("rotaclara-csv", raw); return "local" as const; }
  catch { return "indexeddb" as const; }
}

export async function loadFreightRaw() {
  try {
    const db = await openDb();
    const latest = await new Promise<string>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(KEY);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : "");
      request.onerror = () => reject(request.error);
    });
    if (latest) return latest;
  } catch { /* falls back to localStorage */ }
  return localStorage.getItem("rotaclara-csv") || "";
}

export function notifyReportsRefresh() {
  window.dispatchEvent(new CustomEvent("rotaclara-reports-refresh"));
}
