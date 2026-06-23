import { requestApi } from './apiClient'

export interface UsuarioResumo {
  id: number
  nome: string
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

export async function getUsuarioById(id: number, token: string): Promise<UsuarioResumo> {
  return requestApi<UsuarioResumo>(`/usuarios/${id}`, { token })
}
