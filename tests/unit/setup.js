import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom has no IntersectionObserver: treat every element as on screen straight away
class MockIntersectionObserver {
  constructor(cb) {
    this.cb = cb
  }
  observe(el) {
    this.cb([{ isIntersecting: true, target: el }], this)
  }
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = MockIntersectionObserver

// Node 25 ships its own (non-functional without a file) localStorage that shadows jsdom's,
// so give each test run a simple in-memory Storage.
class MemoryStorage {
  #data = new Map()
  get length() {
    return this.#data.size
  }
  key(i) {
    return [...this.#data.keys()][i] ?? null
  }
  getItem(k) {
    return this.#data.has(String(k)) ? this.#data.get(String(k)) : null
  }
  setItem(k, v) {
    this.#data.set(String(k), String(v))
  }
  removeItem(k) {
    this.#data.delete(String(k))
  }
  clear() {
    this.#data.clear()
  }
}
for (const name of ['localStorage', 'sessionStorage']) {
  Object.defineProperty(globalThis, name, { value: new MemoryStorage(), configurable: true, writable: true })
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
})
