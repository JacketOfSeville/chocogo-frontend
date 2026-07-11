import { requestApi } from './apiClient'
import type { Carrinho, CarrinhoItem } from '../types/api'

export const CART_UPDATED_EVENT = 'chocogo:cart-updated'

export function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export interface CheckoutInput {
  id_endereco?: number | null
  id_status_pedido: number
  id_tipo_entrega: number
  meio_pagamento: string
  valor_frete: number
}

export interface CheckoutResponse {
  pedido: {
    id: number
    id_usuario: number
    id_endereco: number | null
    id_status_pedido: number
    id_tipo_entrega: number
    meio_pagamento: string
    valor_total: string | number
    valor_frete: string | number
  }
  itens: Array<{
    id: number
    id_pedido: number
    id_produto: number
    quantidade: number
    preco_momento: string | number
    subtotal: string | number
  }>
  resumo: {
    valor_produtos: string | number
    valor_frete: string | number
    valor_total: string | number
  }
}

interface CarrinhoItemInput {
  id_carrinho: number
  id_produto: number
  quantidade: number
}

interface CarrinhoItemUpdateInput {
  id_carrinho?: number
  id_produto?: number
  quantidade?: number
}

export async function listCarrinhos(token: string): Promise<Carrinho[]> {
  return requestApi<Carrinho[]>('/carrinhos', { token })
}

export async function createCarrinho(token: string): Promise<Carrinho> {
  return requestApi<Carrinho>('/carrinhos', {
    method: 'POST',
    token,
    body: {},
  })
}

export async function ensureCarrinho(token: string): Promise<Carrinho> {
  const carrinhos = await listCarrinhos(token)

  if (carrinhos.length > 0) {
    return carrinhos[0]
  }

  return createCarrinho(token)
}

export async function listCarrinhoItens(carrinhoId: number, token: string): Promise<CarrinhoItem[]> {
  const params = new URLSearchParams({ id_carrinho: String(carrinhoId) })
  return requestApi<CarrinhoItem[]>(`/carrinho-itens?${params.toString()}`, { token })
}

export async function createCarrinhoItem(input: CarrinhoItemInput, token: string): Promise<CarrinhoItem> {
  const item = await requestApi<CarrinhoItem>('/carrinho-itens', {
    method: 'POST',
    token,
    body: input,
  })

  notifyCartUpdated()
  return item
}

export async function updateCarrinhoItem(id: number, input: CarrinhoItemUpdateInput, token: string): Promise<CarrinhoItem> {
  const item = await requestApi<CarrinhoItem>(`/carrinho-itens/${id}`, {
    method: 'PUT',
    token,
    body: input,
  })

  notifyCartUpdated()
  return item
}

export async function deleteCarrinhoItem(id: number, token: string): Promise<void> {
  await requestApi<void>(`/carrinho-itens/${id}`, {
    method: 'DELETE',
    token,
  })

  notifyCartUpdated()
}

export async function addProdutoAoCarrinho(produtoId: number, quantidade: number, token: string): Promise<void> {
  const carrinho = await ensureCarrinho(token)
  const itens = await listCarrinhoItens(carrinho.id, token)
  const existente = itens.find((item) => item.id_produto === produtoId)

  if (existente) {
    await updateCarrinhoItem(existente.id, { quantidade: existente.quantidade + quantidade }, token)
    return
  }

  await createCarrinhoItem(
    {
      id_carrinho: carrinho.id,
      id_produto: produtoId,
      quantidade,
    },
    token,
  )
}

export async function getCartItemCount(token: string): Promise<number> {
  const carrinhos = await listCarrinhos(token)

  if (carrinhos.length === 0) {
    return 0
  }

  const itens = await listCarrinhoItens(carrinhos[0].id, token)
  return itens.reduce((total, item) => total + item.quantidade, 0)
}

export async function checkoutCarrinho(carrinhoId: number, input: CheckoutInput, token: string): Promise<CheckoutResponse> {
  return requestApi<CheckoutResponse>(`/carrinhos/${carrinhoId}/checkout`, {
    method: 'POST',
    token,
    body: input,
  })
}
