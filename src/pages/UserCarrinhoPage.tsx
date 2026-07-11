import { useEffect, useMemo, useState } from 'react'


// LocalStorage keys
const LS_CARRINHO_ID = 'carrinhoId'
const LS_CARRINHO_ITEMS = 'carrinhoItems'
import { Navigate, useNavigate } from 'react-router-dom'
import { clearSession, getSession } from '../lib/authStorage'
import { UserTopbar } from '../components/UserTopbar'
import {
  checkoutCarrinho,
  deleteCarrinhoItem,
  ensureCarrinho,
  listCarrinhoItens,
  notifyCartUpdated,
  updateCarrinhoItem,
  type CheckoutInput,
} from '../lib/cartApi'
import { getCatalogProducts, type CatalogProduct } from '../lib/catalogService'
import { listEnderecos } from '../lib/enderecoApi'
import type { CarrinhoItem, Endereco } from '../types/api'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

type EntregaMode = 'entrega' | 'retirada'

const CHECKOUT_STATUS_PEDIDO_ID = 1
const CHECKOUT_TIPO_ENTREGA_ENTREGA_ID = 1
const CHECKOUT_TIPO_ENTREGA_RETIRADA_ID = 2

export function UserCarrinhoPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => getSession())
  // restore localStorage
  const [carrinhoId, setCarrinhoId] = useState<number | null>(() => {
    const raw = localStorage.getItem(LS_CARRINHO_ID)
    return raw ? Number(raw) : null
  })
  const [items, setItems] = useState<CarrinhoItem[]>(() => {
    const raw = localStorage.getItem(LS_CARRINHO_ITEMS)
    if (!raw) return []
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  })
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [enderecos, setEnderecos] = useState<Endereco[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [meioPagamento, setMeioPagamento] = useState('PIX')
  const [entregaMode, setEntregaMode] = useState<EntregaMode>('entrega')
  const [enderecoId, setEnderecoId] = useState<number | null>(null)

  const accessToken = session?.accessToken

  const itemDetails = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.id_produto)
        return {
          item,
          product,
          subtotal: (product?.preco ?? 0) * item.quantidade,
        }
      })
      .filter((detail) => Boolean(detail.product))
  }, [items, products])

  const valorProdutos = useMemo(() => itemDetails.reduce((total, detail) => total + detail.subtotal, 0), [itemDetails])
  const valorFrete = entregaMode === 'entrega' ? 10 : 0
  const valorTotal = valorProdutos + valorFrete

  // Load API on token change, always fetch fresh data from server
  useEffect(() => {
    if (!accessToken) {
      return
    }

    const token = accessToken
    let mounted = true

    async function loadCarrinho() {
      setIsLoading(true)
      setError('')

      try {
        const [carrinho, catalogProducts, userEnderecos] = await Promise.all([
          ensureCarrinho(token),
          getCatalogProducts({ includeInactive: true }),
          listEnderecos(token),
        ])

        const carrinhoItens = await listCarrinhoItens(carrinho.id, token)

        if (!mounted) {
          return
        }

        setCarrinhoId(carrinho.id)
        setProducts(catalogProducts)
        setEnderecos(userEnderecos)
        setItems(carrinhoItens)

        const principal = userEnderecos.find((endereco) => endereco.principal)
        setEnderecoId(principal?.id ?? userEnderecos[0]?.id ?? null)
      } catch (loadError) {
        if (!mounted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o carrinho.'
        setError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadCarrinho()

    return () => {
      mounted = false
    }
  }, [accessToken])

  // Persist to localStorage
  useEffect(() => {
    if (carrinhoId) {
      localStorage.setItem(LS_CARRINHO_ID, String(carrinhoId))
    }
  }, [carrinhoId])

  useEffect(() => {
    localStorage.setItem(LS_CARRINHO_ITEMS, JSON.stringify(items))
  }, [items])

  if (!session || !accessToken) {
    return <Navigate to="/login" replace />
  }

  function onLogout() {
    clearSession()
    setSession(null)
  }

  async function onIncreaseQuantidade(item: CarrinhoItem) {
    if (!accessToken) {
      setError('Sessao invalida. Faca login novamente.')
      return
    }

    const token = accessToken
    setError('')
    setSuccess('')

    try {
      const updated = await updateCarrinhoItem(item.id, { quantidade: item.quantidade + 1 }, token)
      setItems((previous) => previous.map((current) => (current.id === updated.id ? updated : current)))
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Nao foi possivel atualizar a quantidade.'
      setError(message)
    }
  }

  async function onDecreaseQuantidade(item: CarrinhoItem) {
    if (!accessToken) {
      setError('Sessao invalida. Faca login novamente.')
      return
    }

    const token = accessToken

    if (item.quantidade <= 1) {
      await onRemoveItem(item.id)
      return
    }

    setError('')
    setSuccess('')

    try {
      const updated = await updateCarrinhoItem(item.id, { quantidade: item.quantidade - 1 }, token)
      setItems((previous) => previous.map((current) => (current.id === updated.id ? updated : current)))
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Nao foi possivel atualizar a quantidade.'
      setError(message)
    }
  }

  async function onRemoveItem(itemId: number) {
    if (!accessToken) {
      setError('Sessao invalida. Faca login novamente.')
      return
    }

    const token = accessToken
    setError('')
    setSuccess('')

    try {
      await deleteCarrinhoItem(itemId, token)
      setItems((previous) => previous.filter((item) => item.id !== itemId))
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : 'Nao foi possivel remover o item.'
      setError(message)
    }
  }

  async function onCheckout() {
    if (!accessToken) {
      setError('Sessao invalida. Faca login novamente.')
      return
    }

    if (!carrinhoId) {
      setError('Carrinho indisponivel no momento.')
      return
    }

    if (items.length === 0) {
      setError('Adicione itens ao carrinho antes de finalizar o pedido.')
      return
    }

    if (entregaMode === 'entrega' && !enderecoId) {
      setError('Selecione um endereco para entrega.')
      return
    }

    const token = accessToken
    const checkoutPayload: CheckoutInput = {
      id_endereco: entregaMode === 'entrega' ? enderecoId : null,
      id_status_pedido: CHECKOUT_STATUS_PEDIDO_ID,
      id_tipo_entrega: entregaMode === 'entrega' ? CHECKOUT_TIPO_ENTREGA_ENTREGA_ID : CHECKOUT_TIPO_ENTREGA_RETIRADA_ID,
      meio_pagamento: meioPagamento,
      valor_frete: valorFrete,
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await checkoutCarrinho(carrinhoId, checkoutPayload, token)
      // Backend already deleted all carrinho_itens; clear client state and localStorage
      setItems([])
      localStorage.removeItem(LS_CARRINHO_ITEMS)
      notifyCartUpdated()
      navigate(`/meus-pedidos/${result.pedido.id}`)
    } catch (checkoutError) {
      const message = checkoutError instanceof Error ? checkoutError.message : 'Nao foi possivel realizar o pedido.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="catalog-shell space-y-6">
      <UserTopbar session={session} onLogout={onLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
            <h1 className="mb-2 text-3xl text-cacao-900">Carrinho</h1>
            <p className="mb-5 text-sm text-cacao-700">Revise os itens antes de realizar o pedido.</p>

            {isLoading ? <p className="text-sm text-cacao-700">Carregando carrinho...</p> : null}

            {!isLoading && itemDetails.length === 0 ? <p className="text-sm text-cacao-700">Seu carrinho esta vazio.</p> : null}

            {!isLoading && itemDetails.length > 0 ? (
              <div className="space-y-3">
                {itemDetails.map(({ item, product, subtotal }) => (
                  <article key={item.id} className="rounded-xl border border-cacao-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {product?.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.nome}
                            className="h-12 w-12 rounded-lg object-cover border border-cacao-100 bg-cacao-50"
                          />
                        ) : null}
                        <div>
                          <p className="font-semibold text-cacao-900">{product?.nome}</p>
                          <p className="text-sm text-cacao-700">{currency.format(product?.preco ?? 0)} cada</p>
                          <p className="mt-1 text-sm font-semibold text-cacao-800">Subtotal: {currency.format(subtotal)}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cacao-200 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => onDecreaseQuantidade(item)}
                        className="rounded-full px-2 py-1 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-100"
                      >
                        -
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold text-cacao-900">{item.quantidade}</span>
                      <button
                        type="button"
                        onClick={() => onIncreaseQuantidade(item)}
                        className="rounded-full px-2 py-1 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-100"
                      >
                        +
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-2xl text-cacao-900">Finalizar pedido</h2>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium text-cacao-700">Meio de pagamento</span>
              <select
                value={meioPagamento}
                onChange={(event) => setMeioPagamento(event.target.value)}
                className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              >
                <option value="PIX">PIX</option>
                <option value="Cartao de Credito">Cartao de Credito</option>
                <option value="Cartao de Debito">Cartao de Debito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </label>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium text-cacao-700">Tipo de entrega</span>
              <select
                value={entregaMode}
                onChange={(event) => setEntregaMode(event.target.value as EntregaMode)}
                className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              >
                <option value="entrega">Entrega</option>
                <option value="retirada">Retirada</option>
              </select>
            </label>

            {entregaMode === 'entrega' ? (
              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Endereco</span>
                <select
                  value={enderecoId ?? ''}
                  onChange={(event) => setEnderecoId(event.target.value ? Number(event.target.value) : null)}
                  className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
                >
                  <option value="">Selecione um endereco</option>
                  {enderecos
                    .filter((endereco) => endereco.id_usuario === session.user.id)
                    .map((endereco) => (
                      <option key={endereco.id} value={endereco.id}>
                        {endereco.logradouro}, {endereco.numero} - {endereco.bairro}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}

            <div className="mb-4 space-y-1 rounded-xl bg-cacao-50 p-3 text-sm text-cacao-800">
              <p className="flex items-center justify-between">
                <span>Produtos</span>
                <strong>{currency.format(valorProdutos)}</strong>
              </p>
              <p className="flex items-center justify-between">
                <span>Frete</span>
                <strong>{currency.format(valorFrete)}</strong>
              </p>
              <p className="flex items-center justify-between border-t border-cacao-200 pt-2 text-base text-cacao-900">
                <span>Total</span>
                <strong>{currency.format(valorTotal)}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              disabled={isSubmitting}
              className="w-full rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Processando...' : 'Realizar Pedido'}
            </button>

            {/* <p className="mt-3 text-xs text-cacao-600">
              Entrega/Retirada IDs fixos (Entrega = 1, Retirada = 2, Status = 1).
            </p> */}
          </section>
        </div>

        {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-4 rounded-xl bg-mint-100 px-3 py-2 text-sm text-mint-700">{success}</p> : null}
      </section>
    </main>
  )
}
