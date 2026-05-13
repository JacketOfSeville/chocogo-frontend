import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { clearSession, getSession } from '../lib/authStorage'
import { UserTopbar } from '../components/UserTopbar'
import { listPedidos } from '../lib/pedidoApi'
import type { Pedido } from '../types/api'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function UserPedidosPage() {
  const [session, setSession] = useState(() => getSession())
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const accessToken = session?.accessToken

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const token = accessToken
    let mounted = true

    async function load() {
      setIsLoading(true)
      setError('')

      try {
        const result = await listPedidos(token)

        if (!mounted) return

        // Backend filtra para o usuario
        setPedidos([...result].reverse())
      } catch (loadError) {
        if (!mounted) return
        const message = loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar os pedidos.'
        setError(message)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [accessToken])

  if (!session || !accessToken) {
    return <Navigate to="/login" replace />
  }

  function onLogout() {
    clearSession()
    setSession(null)
  }

  return (
    <main className="catalog-shell space-y-6">
      <UserTopbar session={session} onLogout={onLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8">
        <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
          <h1 className="mb-2 text-3xl text-cacao-900">Meus pedidos</h1>
          <p className="mb-5 text-sm text-cacao-700">Historico dos seus pedidos realizados.</p>

          {isLoading ? <p className="text-sm text-cacao-700">Carregando pedidos...</p> : null}

          {!isLoading && pedidos.length === 0 ? (
            <p className="text-sm text-cacao-700">Voce ainda nao realizou nenhum pedido.</p>
          ) : null}

          {!isLoading && pedidos.length > 0 ? (
            <div className="space-y-3">
              {pedidos.map((pedido) => (
                <article key={pedido.id} className="rounded-xl border border-cacao-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-cacao-900">Pedido #{pedido.id}</p>
                      <p className="text-sm text-cacao-700">Pagamento: {pedido.meio_pagamento}</p>
                      <p className="mt-1 text-sm font-semibold text-cacao-800">
                        Total: {currency.format(Number(pedido.valor_total))}
                      </p>
                    </div>
                    <Link
                      to={`/meus-pedidos/${pedido.id}`}
                      className="rounded-full border border-cacao-300 px-3 py-1.5 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
                    >
                      Ver detalhes
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  )
}
