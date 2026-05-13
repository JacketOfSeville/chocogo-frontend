import { requestApi } from './apiClient'
import type { AuthSession } from './authStorage'

interface LoginRequestBody {
  email?: string
  telefone?: string
  senha: string
}

interface RegisterRequestBody extends LoginRequestBody {
  nome: string
}

export interface RegisterInput {
  nome: string
  email?: string
  telefone?: string
  senha: string
}

function toIdentifierBody(identifier: string, senha: string): LoginRequestBody {
  if (identifier.includes('@')) {
    return { email: identifier, senha }
  }

  return { telefone: identifier, senha }
}

export async function loginUser(identifier: string, senha: string): Promise<AuthSession> {
  return requestApi<AuthSession>('/auth/login', {
    method: 'POST',
    body: toIdentifierBody(identifier, senha),
  })
}

export async function registerUser(input: RegisterInput): Promise<AuthSession> {
  const payload: RegisterRequestBody = {
    nome: input.nome,
    senha: input.senha,
    email: input.email?.trim() || undefined,
    telefone: input.telefone?.trim() || undefined,
  }

  return requestApi<AuthSession>('/auth/register', {
    method: 'POST',
    body: payload,
  })
}
