const DB_NAME = "rotaclara-storage";
const STORE_NAME = "imported-files";

type StoredFile = { key: string; name: string; type: string; data: ArrayBuffer; savedAt: number };
const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 2);
  request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "key" }); };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
export async function saveImportedFile(key: string, file: File) {
  const data = await file.arrayBuffer(); const db = await openDb();
  await new Promise<void>((resolve, reject) => { const req = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put({ key, name: file.name, type: file.type || "application/octet-stream", data, savedAt: Date.now() } satisfies StoredFile); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
}
export async function loadImportedFile(key: string) {
  try { const db = await openDb(); return await new Promise<StoredFile | null>((resolve, reject) => { const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key); req.onsuccess = () => resolve((req.result as StoredFile) || null); req.onerror = () => reject(req.error); }); } catch { return null; }
}
export async function downloadImportedFile(key: string) {
  const stored = await loadImportedFile(key); if (!stored) return false;
  const url = URL.createObjectURL(new Blob([stored.data], { type: stored.type }));
  const link = document.createElement("a"); link.href = url; link.download = stored.name; link.style.display = "none";
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000); return true;
}
