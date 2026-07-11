import { requestApi } from './apiClient'
import type { Carrinho, CarrinhoItem } from '../types/api'

export const CART_UPDATED_EVENT = 'chocogo:cart-updated'
export const LS_CARRINHO_ID = 'carrinhoId'
export const LS_CARRINHO_ITEMS = 'carrinhoItems'

export function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export function getPersistedCarrinhoId(): number | null {
  const raw = localStorage.getItem(LS_CARRINHO_ID)
  if (!raw) {
    return null
  }

  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function getPersistedCarrinhoItens(): CarrinhoItem[] {
  const raw = localStorage.getItem(LS_CARRINHO_ITEMS)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed as CarrinhoItem[]
  } catch {
    return []
  }
}

export function persistCarrinhoId(carrinhoId: number | null) {
  if (!carrinhoId || carrinhoId <= 0) {
    localStorage.removeItem(LS_CARRINHO_ID)
    return
  }

  localStorage.setItem(LS_CARRINHO_ID, String(carrinhoId))
}

export function persistCarrinhoItens(itens: CarrinhoItem[]) {
  localStorage.setItem(LS_CARRINHO_ITEMS, JSON.stringify(itens))
}

export function clearPersistedCarrinho() {
  localStorage.removeItem(LS_CARRINHO_ITEMS)
}

function upsertPersistedCarrinhoItem(item: CarrinhoItem) {
  const current = getPersistedCarrinhoItens()
  const exists = current.some((candidate) => candidate.id === item.id)

  if (exists) {
    persistCarrinhoItens(current.map((candidate) => (candidate.id === item.id ? item : candidate)))
    return
  }

  persistCarrinhoItens([...current, item])
}

function removePersistedCarrinhoItem(itemId: number) {
  const current = getPersistedCarrinhoItens()
  persistCarrinhoItens(current.filter((candidate) => candidate.id !== itemId))
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
  const carrinho = await requestApi<Carrinho>('/carrinhos', {
    method: 'POST',
    token,
    body: {},
  })

  persistCarrinhoId(carrinho.id)
  return carrinho
}

export async function ensureCarrinho(token: string): Promise<Carrinho> {
  const carrinhos = await listCarrinhos(token)

  if (carrinhos.length > 0) {
    persistCarrinhoId(carrinhos[0].id)
    return carrinhos[0]
  }

  return createCarrinho(token)
}

export async function listCarrinhoItens(carrinhoId: number, token: string): Promise<CarrinhoItem[]> {
  const params = new URLSearchParams({ id_carrinho: String(carrinhoId) })
  const itens = await requestApi<CarrinhoItem[]>(`/carrinho-itens?${params.toString()}`, { token })
  persistCarrinhoId(carrinhoId)
  persistCarrinhoItens(itens)
  return itens
}

export async function createCarrinhoItem(input: CarrinhoItemInput, token: string): Promise<CarrinhoItem> {
  const item = await requestApi<CarrinhoItem>('/carrinho-itens', {
    method: 'POST',
    token,
    body: input,
  })

  persistCarrinhoId(input.id_carrinho)
  upsertPersistedCarrinhoItem(item)
  notifyCartUpdated()
  return item
}

export async function updateCarrinhoItem(id: number, input: CarrinhoItemUpdateInput, token: string): Promise<CarrinhoItem> {
  const item = await requestApi<CarrinhoItem>(`/carrinho-itens/${id}`, {
    method: 'PUT',
    token,
    body: input,
  })

  upsertPersistedCarrinhoItem(item)
  notifyCartUpdated()
  return item
}

export async function deleteCarrinhoItem(id: number, token: string): Promise<void> {
  await requestApi<void>(`/carrinho-itens/${id}`, {
    method: 'DELETE',
    token,
  })

  removePersistedCarrinhoItem(id)
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
  try {
    const carrinhos = await listCarrinhos(token)

    if (carrinhos.length === 0) {
      persistCarrinhoItens([])
      return 0
    }

    const itens = await listCarrinhoItens(carrinhos[0].id, token)
    return itens.reduce((total, item) => total + item.quantidade, 0)
  } catch {
    const itens = getPersistedCarrinhoItens()
    return itens.reduce((total, item) => total + item.quantidade, 0)
  }
}

export async function checkoutCarrinho(carrinhoId: number, input: CheckoutInput, token: string): Promise<CheckoutResponse> {
  return requestApi<CheckoutResponse>(`/carrinhos/${carrinhoId}/checkout`, {
    method: 'POST',
    token,
    body: input,
  })
}
