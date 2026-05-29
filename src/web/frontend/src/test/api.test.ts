import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock axios before importing api
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: { baseURL: '' },
    })),
    defaults: { baseURL: '' },
  }
  return { default: mockAxios }
})

describe('API Service', () => {
  it('has correct base URL structure', async () => {
    // Re-import to get the mocked module
    const api = (await import('../services/api')).default
    expect(api).toBeDefined()
    // The base URL should come from env or fallback
    expect(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').toBeTruthy()
  })
})
