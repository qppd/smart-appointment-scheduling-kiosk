import { describe, it, expect } from 'vitest'
import { validateEmail, validateContactNumber, validatePassword } from '../utils/validators'

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('user.name+tag@domain.co.ph')).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(validateEmail('notanemail')).toBe(false)
    expect(validateEmail('@domain.com')).toBe(false)
    expect(validateEmail('')).toBe(false)
  })
})

describe('validateContactNumber', () => {
  it('accepts PH mobile numbers', () => {
    expect(validateContactNumber('09171234567')).toBe(true)
    expect(validateContactNumber('+639171234567')).toBe(true)
  })

  it('accepts landline numbers', () => {
    expect(validateContactNumber('028123456')).toBe(true)
  })

  it('rejects too short numbers', () => {
    expect(validateContactNumber('12345')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateContactNumber('')).toBe(false)
  })
})

describe('validatePassword', () => {
  it('accepts password 6+ chars', () => {
    expect(validatePassword('abcdef')).toBeNull()
    expect(validatePassword('abcdefghijklmnop')).toBeNull()
  })

  it('rejects short passwords', () => {
    expect(validatePassword('abcde')).toBe('Password must be at least 6 characters')
  })

  it('rejects empty password', () => {
    expect(validatePassword('')).toBe('Password must be at least 6 characters')
  })
})
