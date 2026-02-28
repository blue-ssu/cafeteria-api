type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type GenericCacheStore = Map<string, CacheEntry<unknown>>;

const cacheStore: GenericCacheStore = new Map();

export function buildCacheKey(parts: string[]): string {
  return `meal:${parts
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0)
    .join("|")}`;
}

export function makeMealCacheKey({
  cafeteria,
  mealType,
  rangeStart,
  rangeEnd,
}: {
  cafeteria: string;
  mealType?: string;
  rangeStart: string;
  rangeEnd: string;
}): string {
  return buildCacheKey([
    "query",
    cafeteria,
    mealType ?? "all",
    rangeStart,
    rangeEnd,
  ]);
}

export function getCache<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearCacheByPrefix(prefix: string): void {
  const normalizedPrefix = prefix.startsWith("meal:")
    ? prefix
    : `meal:${prefix.replace(/^\//, "")}`;

  for (const key of cacheStore.keys()) {
    if (key.startsWith(normalizedPrefix)) {
      cacheStore.delete(key);
    }
  }
}
