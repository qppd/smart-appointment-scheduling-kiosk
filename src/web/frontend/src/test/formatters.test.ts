import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, getStatusColor, getStatusLabel } from '../utils/formatters'

describe('formatDate', () => {
  it('formats ISO date string correctly', () => {
    const result = formatDate('2026-06-15')
    expect(result).toContain('June')
    expect(result).toContain('15')
    expect(result).toContain('2026')
  })

  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('')
  })

  it('returns original string on invalid date', () => {
    const result = formatDate('not-a-date')
    expect(result).toBe('not-a-date')
  })
})

describe('formatTime', () => {
  it('formats morning time correctly', () => {
    expect(formatTime('09:00')).toBe('9:00 AM')
  })

  it('formats afternoon time correctly', () => {
    expect(formatTime('14:30')).toBe('2:30 PM')
  })

  it('formats noon correctly', () => {
    expect(formatTime('12:00')).toBe('12:00 PM')
  })

  it('formats midnight correctly', () => {
    expect(formatTime('00:00')).toBe('12:00 AM')
  })

  it('returns empty string for empty input', () => {
    expect(formatTime('')).toBe('')
  })

  it('handles single-digit hour', () => {
    expect(formatTime('08:05')).toBe('8:05 AM')
  })
})

describe('getStatusColor', () => {
  it('returns yellow for scheduled', () => {
    expect(getStatusColor('scheduled')).toContain('yellow')
  })

  it('returns blue for confirmed', () => {
    expect(getStatusColor('confirmed')).toContain('blue')
  })

  it('returns green for checked_in', () => {
    expect(getStatusColor('checked_in')).toContain('green')
  })

  it('returns gray for completed', () => {
    expect(getStatusColor('completed')).toContain('gray')
  })

  it('returns red for cancelled', () => {
    expect(getStatusColor('cancelled')).toContain('red')
  })

  it('returns orange for no_show', () => {
    expect(getStatusColor('no_show')).toContain('orange')
  })

  it('returns gray for unknown status', () => {
    expect(getStatusColor('unknown')).toContain('gray')
  })
})

describe('getStatusLabel', () => {
  it('returns human-readable labels', () => {
    expect(getStatusLabel('scheduled')).toBe('Scheduled')
    expect(getStatusLabel('checked_in')).toBe('Checked In')
    expect(getStatusLabel('cancelled')).toBe('Cancelled')
    expect(getStatusLabel('no_show')).toBe('No Show')
    expect(getStatusLabel('completed')).toBe('Completed')
    expect(getStatusLabel('confirmed')).toBe('Confirmed')
  })

  it('returns the raw string for unknown status', () => {
    expect(getStatusLabel('unknown_status')).toBe('unknown_status')
  })
})
