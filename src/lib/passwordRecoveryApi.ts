import { requestApi } from './apiClient'

export interface PasswordResetResponse {
  message: string
}

export async function requestPasswordReset(email: string): Promise<PasswordResetResponse> {
  return requestApi<PasswordResetResponse>('/auth/password/forgot', {
    method: 'POST',
    body: { email },
  })
}

export async function resetPassword(token: string, senha: string): Promise<PasswordResetResponse> {
  return requestApi<PasswordResetResponse>('/auth/password/reset', {
    method: 'POST',
    body: { token, senha },
  })
}