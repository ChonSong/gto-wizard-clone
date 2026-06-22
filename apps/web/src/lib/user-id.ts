/**
 * Anonymous user identity utilities.
 * Generates a UUID on first visit and persists in localStorage.
 * Used for study progress tracking without requiring login.
 */

const USER_ID_KEY = 'gto-user-id'

export function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'
  let userId = localStorage.getItem(USER_ID_KEY)
  if (!userId) {
    userId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(USER_ID_KEY, userId)
  }
  return userId
}
