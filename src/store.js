const STORAGE_KEY = 'ephemeral-care-room-state';

export function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        requests: Array.isArray(saved.requests) ? saved.requests : [],
        nextId: typeof saved.nextId === 'number' ? saved.nextId : 1,
      };
    }
  } catch (_) {}
  return { requests: [], nextId: 1 };
}

export function savePersisted(requests, nextId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ requests, nextId }));
  } catch (_) {}
}

export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}
