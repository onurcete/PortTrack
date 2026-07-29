// Arka planda geçmiş veri güncellemesi durumunu takip eder
const activeBackfills = new Map<string, number>();

export function setBackfillActive(userId: string) {
  activeBackfills.set(userId, Date.now());
}

export function setBackfillDone(userId: string) {
  activeBackfills.delete(userId);
}

export function isBackfillActive(userId: string): boolean {
  const ts = activeBackfills.get(userId);
  if (!ts) return false;
  // 60 saniyeden uzun sürdüyse otomatik temizle (stale lock prevention)
  if (Date.now() - ts > 60000) {
    activeBackfills.delete(userId);
    return false;
  }
  return true;
}
