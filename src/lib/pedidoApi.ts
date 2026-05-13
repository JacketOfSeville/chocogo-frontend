import { requestApi } from './apiClient'
import type { Pedido, PedidoItem } from '../types/api'

export async function listPedidos(token: string): Promise<Pedido[]> {
  return requestApi<Pedido[]>('/pedidos', { token })
}

export async function getPedido(id: number, token: string): Promise<Pedido> {
  return requestApi<Pedido>(`/pedidos/${id}`, { token })
}

export async function listPedidoItens(pedidoId: number, token: string): Promise<PedidoItem[]> {
  const params = new URLSearchParams({ id_pedido: String(pedidoId) })
  return requestApi<PedidoItem[]>(`/pedido-itens?${params.toString()}`, { token })
}
