import { vi } from 'vitest';

/** Node 25+ має власний (порожній) глобальний localStorage, який ламає jsdom: підставляємо in-memory реалізацію. */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

vi.stubGlobal('localStorage', new MemoryStorage());
vi.stubGlobal('scrollTo', vi.fn());
