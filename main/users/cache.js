const key = (id) => "quest_" + id;

export function loadCache(userId) {
  try {
    return JSON.parse(localStorage.getItem(key(userId)) || "null");
  } catch {
    return null; // corrupted data
  }
}

export function saveCache(userId, data) {
  localStorage.setItem(key(userId), JSON.stringify({
    balance: data.balance,
    inventory: data.inventory,
    updatedAt: Date.now(),
  }));
}

export function clearCache(userId) {
  localStorage.removeItem(key(userId));
}