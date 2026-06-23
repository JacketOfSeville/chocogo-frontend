import { requestApi } from './apiClient'
import type { Pedido, PedidoItem } from '../types/api'

export interface UpdatePedidoInput {
  id_usuario?: number
  id_endereco?: number | null
  id_status_pedido?: number
  id_tipo_entrega?: number
  pronto_retirada?: boolean
  entregue?: boolean
  meio_pagamento?: string
  valor_total?: number
  valor_frete?: number
}

export async function listPedidos(token: string): Promise<Pedido[]> {
  return requestApi<Pedido[]>('/pedidos', { token })
}

export async function getPedido(id: number, token: string): Promise<Pedido> {
  return requestApi<Pedido>(`/pedidos/${id}`, { token })
}

export async function updatePedido(id: number, input: UpdatePedidoInput, token: string): Promise<Pedido> {
  return requestApi<Pedido>(`/pedidos/${id}`, {
    method: 'PUT',
    token,
    body: input,
  })
}

export async function listPedidoItens(pedidoId: number, token: string): Promise<PedidoItem[]> {
  const params = new URLSearchParams({ id_pedido: String(pedidoId) })
  return requestApi<PedidoItem[]>(`/pedido-itens?${params.toString()}`, { token })
}
