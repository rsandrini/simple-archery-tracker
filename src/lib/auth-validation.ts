const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function validateRegistrationInput(email: string, password: string): string | null {
  if (!email || !password) return 'Email and password are required'
  if (!EMAIL_REGEX.test(email)) return 'Invalid email format'
  if (password.length < 8) return 'Password must be at least 8 characters'
  return null
}
