import { describe, it, expect } from 'vitest'
import { validateRegistrationInput, normalizeEmail } from '@/lib/auth-validation'

describe('validateRegistrationInput', () => {
  it('returns null for valid inputs', () => {
    expect(validateRegistrationInput('user@example.com', 'password123')).toBeNull()
  })

  it('rejects empty email', () => {
    expect(validateRegistrationInput('', 'password123')).toBe('Email and password are required')
  })

  it('rejects empty password', () => {
    expect(validateRegistrationInput('user@example.com', '')).toBe('Email and password are required')
  })

  it('rejects invalid email format', () => {
    expect(validateRegistrationInput('notanemail', 'password123')).toBe('Invalid email format')
  })

  it('rejects password shorter than 8 characters', () => {
    expect(validateRegistrationInput('user@example.com', 'abc123')).toBe('Password must be at least 8 characters')
  })

  it('accepts name as optional (not validated here)', () => {
    expect(validateRegistrationInput('user@example.com', 'password123')).toBeNull()
  })
})

describe('normalizeEmail', () => {
  it('lowercases uppercase email', () => {
    expect(normalizeEmail('User@Example.COM')).toBe('user@example.com')
  })
  it('trims leading/trailing whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com')
  })
  it('leaves already-lowercase email unchanged', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com')
  })
  it('handles mixed case domain', () => {
    expect(normalizeEmail('User@EXAMPLE.com')).toBe('user@example.com')
  })
})
