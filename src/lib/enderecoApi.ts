import { requestApi } from './apiClient'
import type { Endereco } from '../types/api'

export interface EnderecoInput {
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  cep: string
  principal?: boolean
}

export async function listEnderecos(token: string): Promise<Endereco[]> {
  return requestApi<Endereco[]>('/enderecos', { token })
}

export async function getEndereco(id: number, token: string): Promise<Endereco> {
  return requestApi<Endereco>(`/enderecos/${id}`, { token })
}

export async function createEndereco(input: EnderecoInput, token: string): Promise<Endereco> {
  return requestApi<Endereco>('/enderecos', {
    method: 'POST',
    token,
    body: input,
  })
}

export async function updateEndereco(id: number, input: EnderecoInput, token: string): Promise<Endereco> {
  return requestApi<Endereco>(`/enderecos/${id}`, {
    method: 'PUT',
    token,
    body: input,
  })
}

export async function deleteEndereco(id: number, token: string): Promise<void> {
  await requestApi<void>(`/enderecos/${id}`, {
    method: 'DELETE',
    token,
  })
}
