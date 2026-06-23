import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { clearSession, getSession } from '../lib/authStorage'
import { UserTopbar } from '../components/UserTopbar'
import { getPedido, listPedidoItens } from '../lib/pedidoApi'
import { getCatalogProducts, type CatalogProduct } from '../lib/catalogService'
import type { Pedido, PedidoItem } from '../types/api'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const ENTREGA_LABELS: Record<number, string> = {
  1: 'Entrega',
  2: 'Retirada',
}

function getDeliveryProgressLabel(pedido: Pedido): string {
  const isRetirada = pedido.id_tipo_entrega === 2
  const isEntrega = pedido.id_tipo_entrega === 1

  if (isRetirada) {
    if (pedido.pronto_retirada) {
      return 'Pronto para retirada'
    }

    return 'Em preparo para retirada'
  }

  if (isEntrega) {
    if (pedido.entregue) {
      return 'Entregue'
    }

    if (pedido.id_status_pedido === 3) {
      return 'Saiu para entrega'
    }

    if (pedido.id_status_pedido === 2) {
      return 'Em preparo'
    }

    return 'Aguardando processamento'
  }

  return 'Status indisponivel'
}

export function UserPedidoDetailPage() {
  const [session, setSession] = useState(() => getSession())
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [itens, setItens] = useState<PedidoItem[]>([])
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const params = useParams()

  const accessToken = session?.accessToken
  const pedidoId = Number(params.id)

  useEffect(() => {
    if (!accessToken || !Number.isInteger(pedidoId) || pedidoId <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false)
      return
    }

    const token = accessToken
    let mounted = true

    async function load() {
      setIsLoading(true)
      setError('')

      try {
        const [pedidoData, itensData, catalogProducts] = await Promise.all([
          getPedido(pedidoId, token),
          listPedidoItens(pedidoId, token),
          getCatalogProducts({ includeInactive: true }),
        ])

        if (!mounted) return

        setPedido(pedidoData)
        setItens(itensData)
        setProducts(catalogProducts)
      } catch (loadError) {
        if (!mounted) return
        const message = loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o pedido.'
        setError(message)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [accessToken, pedidoId])

  if (!session || !accessToken) {
    return <Navigate to="/login" replace />
  }

  function onLogout() {
    clearSession()
    setSession(null)
  }

  const valorTotal = pedido ? Number(pedido.valor_total) : 0
  const valorFrete = pedido ? Number(pedido.valor_frete) : 0
  const valorProdutos = valorTotal - valorFrete

  return (
    <main className="catalog-shell space-y-6">
      <UserTopbar session={session} onLogout={onLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8">
        {isLoading ? (
          <p className="text-sm text-cacao-700">Carregando pedido...</p>
        ) : error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : pedido ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            {/* Items */}
            <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
              <h1 className="mb-1 text-3xl text-cacao-900">Pedido #{pedido.id}</h1>
              <p className="mb-5 text-sm text-cacao-700">Itens incluidos neste pedido.</p>

              <div className="space-y-3">
                {itens.map((item) => {
                  const product = products.find((p) => p.id === item.id_produto)
                  return (
                    <article key={item.id} className="rounded-xl border border-cacao-100 p-4">
                      <div className="flex items-center gap-3">
                        {product?.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.nome}
                            className="h-12 w-12 rounded-lg object-cover border border-cacao-100 bg-cacao-50 shrink-0"
                          />
                        ) : null}
                        <div>
                          <p className="font-semibold text-cacao-900">{product?.nome ?? `Produto #${item.id_produto}`}</p>
                          <p className="text-sm text-cacao-700">
                            {item.quantidade}x {currency.format(Number(item.preco_momento))}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-cacao-800">
                            Subtotal: {currency.format(Number(item.subtotal))}
                          </p>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            {/* Summary */}
            <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
              <h2 className="mb-4 text-2xl text-cacao-900">Resumo</h2>

              <dl className="mb-4 space-y-2 text-sm text-cacao-800">
                <div className="flex justify-between">
                  <dt className="text-cacao-700">Pagamento</dt>
                  <dd className="font-semibold">{pedido.meio_pagamento}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-cacao-700">Tipo de entrega</dt>
                  <dd className="font-semibold">{ENTREGA_LABELS[pedido.id_tipo_entrega] ?? pedido.id_tipo_entrega}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-cacao-700">Status da entrega</dt>
                  <dd className="font-semibold">{getDeliveryProgressLabel(pedido)}</dd>
                </div>
              </dl>

              <div className="space-y-1 rounded-xl bg-cacao-50 p-3 text-sm text-cacao-800">
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

              <Link
                to="/meus-pedidos"
                className="mt-4 block w-full rounded-full border border-cacao-300 px-5 py-2 text-center text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
              >
                Ver todos os pedidos
              </Link>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  )
}
