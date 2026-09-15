const DB_NAME = "rotaclara-storage";
const STORE_NAME = "freight";
const KEY = "latest-csv";

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export async function saveFreightRaw(raw: string) {
  try { localStorage.setItem("rotaclara-csv", raw); return "local" as const; }
  catch { const db = await openDb(); await new Promise<void>((resolve, reject) => { const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(raw, KEY); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); return "indexeddb" as const; }
}

export async function loadFreightRaw() {
  const local = localStorage.getItem("rotaclara-csv");
  if (local) return local;
  try { const db = await openDb(); return await new Promise<string>((resolve, reject) => { const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(KEY); request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : ""); request.onerror = () => reject(request.error); }); }
  catch { return ""; }
}
