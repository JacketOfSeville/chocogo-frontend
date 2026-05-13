export interface AuthUser {
  id: number
  nome: string
  email: string | null
  telefone: string | null
  roleId: number
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export type AdminUser = AuthUser
export type AdminSession = AuthSession

const SESSION_KEY = 'chocogo_session'
const LEGACY_ADMIN_SESSION_KEY = 'chocogo_admin_session'

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY)

  if (raw) {
    try {
      return JSON.parse(raw) as AuthSession
    } catch {
      localStorage.removeItem(SESSION_KEY)
    }
  }

  const legacyRaw = localStorage.getItem(LEGACY_ADMIN_SESSION_KEY)

  if (!legacyRaw) {
    return null
  }

  try {
    const parsed = JSON.parse(legacyRaw) as AuthSession
    localStorage.setItem(SESSION_KEY, JSON.stringify(parsed))
    return parsed
  } catch {
    localStorage.removeItem(LEGACY_ADMIN_SESSION_KEY)
    return null
  }
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(LEGACY_ADMIN_SESSION_KEY)
}

export function getAdminSession(): AdminSession | null {
  const session = getSession()

  if (!session || session.user.roleId !== 2) {
    return null
  }

  return session
}

export function saveAdminSession(session: AdminSession): void {
  saveSession(session)
}

export function clearAdminSession(): void {
  clearSession()
}
