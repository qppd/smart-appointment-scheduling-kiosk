import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../store/authStore'

describe('AuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    })
  })

  const mockUser = {
    id: '123',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    contact_number: '09171234567',
    birth_date: '1990-01-15',
    address: 'Taytay, Rizal',
    role: 'resident',
    status: 'active',
    fingerprint_enrolled: true,
    otp_verified: true,
    created_at: '2026-05-01T00:00:00Z',
  }

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })

  it('setAuth stores token and user', () => {
    useAuthStore.getState().setAuth('test-token', mockUser)
    const state = useAuthStore.getState()
    expect(state.token).toBe('test-token')
    expect(state.user?.first_name).toBe('Juan')
    expect(state.isAuthenticated).toBe(true)
    expect(localStorage.getItem('token')).toBe('test-token')
  })

  it('logout clears everything', () => {
    useAuthStore.getState().setAuth('test-token', mockUser)
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('updateUser updates user without changing token', () => {
    useAuthStore.getState().setAuth('test-token', mockUser)
    const updatedUser = { ...mockUser, first_name: 'Pedro' }
    useAuthStore.getState().updateUser(updatedUser)
    const state = useAuthStore.getState()
    expect(state.user?.first_name).toBe('Pedro')
    expect(state.token).toBe('test-token')
  })

  it('persists to localStorage', () => {
    useAuthStore.getState().setAuth('persist-token', mockUser)
    expect(localStorage.getItem('token')).toBe('persist-token')
    expect(localStorage.getItem('user')).toContain('Dela Cruz')
  })
})
