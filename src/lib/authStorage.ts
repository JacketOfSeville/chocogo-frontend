export interface AdminUser {
  id: number
  nome: string
  email: string | null
  telefone: string | null
  roleId: number
}

export interface AdminSession {
  accessToken: string
  refreshToken: string
  user: AdminUser
}

const SESSION_KEY = 'chocogo_admin_session'

export function getAdminSession(): AdminSession | null {
  const raw = localStorage.getItem(SESSION_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AdminSession
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function saveAdminSession(session: AdminSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearAdminSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
