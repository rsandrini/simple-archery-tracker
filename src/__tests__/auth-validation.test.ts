import { describe, it, expect } from 'vitest'
import { validateRegistrationInput } from '@/lib/auth-validation'

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
