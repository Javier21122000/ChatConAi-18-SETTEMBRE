export function readStorage<T>(storage: Storage, key: string, fallback: T): T {
  try { const value = storage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
}
export function writeStorage(storage: Storage, key: string, value: unknown) {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* Private mode can disable storage. */ }
}
