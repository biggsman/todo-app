// Design Ref: §8.1 — in-memory Storage fakes so storage/state tests never touch real localStorage.

/** A working Storage backed by a Map. */
export class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) this.items.set(key, value);
  }

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, String(value));
  }
}

/** Reads work, every write fails like a full browser storage. */
export class QuotaExceededStorage extends MemoryStorage {
  override setItem(): void {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  }
}

/** Every access fails, like storage blocked by browser settings. */
export class BlockedStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new DOMException('Access is denied for this document.', 'SecurityError');
  }

  override setItem(): void {
    throw new DOMException('Access is denied for this document.', 'SecurityError');
  }
}
