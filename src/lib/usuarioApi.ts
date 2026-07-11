import { requestApi } from './apiClient'
import type { Endereco, Pedido } from '../types/api'

export interface UsuarioResumo {
  id: number
  nome: string
  email?: string | null
  telefone?: string | null
  id_tipo_usuario?: number
  data_criacao?: string
}

export interface UsuarioDetalhe extends UsuarioResumo {
  endereco: Endereco[]
  pedido: Pedido[]
}

export async function listUsuarios(token: string): Promise<UsuarioResumo[]> {
  return requestApi<UsuarioResumo[]>('/usuarios', { token })
}

export async function listUsuariosByIds(ids: number[], token: string): Promise<UsuarioResumo[]> {
  if (ids.length === 0) {
    return []
  }

  const uniqueIds = [...new Set(ids)].filter((value) => Number.isInteger(value) && value > 0)

  if (uniqueIds.length === 0) {
    return []
  }

  const params = new URLSearchParams({ ids: uniqueIds.join(',') })
  return requestApi<UsuarioResumo[]>(`/usuarios?${params.toString()}`, { token })
}

export async function getUsuarioById(id: number, token: string): Promise<UsuarioDetalhe> {
  return requestApi<UsuarioDetalhe>(`/usuarios/${id}`, { token })
}
