import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'

// Each test starts from a clean localStorage so persistence tests never leak
// state into one another (the whole data layer is local-first).
beforeEach(() => {
  window.localStorage.clear()
})
afterEach(() => {
  window.localStorage.clear()
})
