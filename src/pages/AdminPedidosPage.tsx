import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminSession } from '../lib/authStorage'
import { listPedidos } from '../lib/pedidoApi'
import { listUsuariosByIds } from '../lib/usuarioApi'
import type { Pedido } from '../types/api'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const DELIVERY_TYPE_LABELS: Record<number, string> = {
  1: 'Entrega',
  2: 'Retirada',
}

const ORDER_STATUS_LABELS: Record<number, string> = {
  1: 'Recebido',
  2: 'Em preparo',
  3: 'Em rota',
  4: 'Concluído',
  5: 'Cancelado',
}

function getDeliveryTypeLabel(id: number): string {
  return DELIVERY_TYPE_LABELS[id] ?? `Tipo #${id}`
}

function getOrderStatusLabel(id: number): string {
  return ORDER_STATUS_LABELS[id] ?? `Status #${id}`
}

function parsePedidoDate(pedido: Pedido): string {
  const raw = pedido.data_pedido ?? pedido.data_criacao

  if (!raw) {
    return 'Sem data'
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return 'Sem data'
  }

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusClasses(statusId: number): string {
  if (statusId === 4) {
    return 'bg-emerald-100 text-emerald-800'
  }

  if (statusId === 5) {
    return 'bg-red-100 text-red-700'
  }

  if (statusId === 3) {
    return 'bg-sky-100 text-sky-700'
  }

  return 'bg-cacao-100 text-cacao-800'
}

export function AdminPedidosPage() {
  const session = getAdminSession()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientesById, setClientesById] = useState<Record<number, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deliveryFilter, setDeliveryFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const accessToken = session?.accessToken

  const orderedPedidos = useMemo(
    () =>
      [...pedidos].sort((a, b) => {
        const dateA = new Date(a.data_pedido ?? a.data_criacao ?? 0).getTime()
        const dateB = new Date(b.data_pedido ?? b.data_criacao ?? 0).getTime()
        return dateB - dateA
      }),
    [pedidos],
  )

  const filteredPedidos = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR')

    return orderedPedidos.filter((pedido) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [String(pedido.id), clientesById[pedido.id_usuario] ?? '', pedido.meio_pagamento]
          .some((value) => value.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
      const matchesStatus = statusFilter === 'all' || pedido.id_status_pedido === Number(statusFilter)
      const matchesDelivery = deliveryFilter === 'all' || pedido.id_tipo_entrega === Number(deliveryFilter)

      return matchesSearch && matchesStatus && matchesDelivery
    })
  }, [clientesById, deliveryFilter, orderedPedidos, searchTerm, statusFilter])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const token = accessToken
    let mounted = true

    async function loadPedidos() {
      setIsLoading(true)
      setError('')

      try {
        const result = await listPedidos(token)
        if (!mounted) {
          return
        }

        setPedidos(result)

        const userIds = [...new Set(result.map((pedido) => pedido.id_usuario))]
        const usuarios = await listUsuariosByIds(userIds, token)

        if (!mounted) {
          return
        }

        const mappedNames: Record<number, string> = {}
        for (const usuario of usuarios) {
          mappedNames[usuario.id] = usuario.nome
        }

        setClientesById(mappedNames)
      } catch (loadError) {
        if (!mounted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar pedidos.'
        setError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadPedidos()

    return () => {
      mounted = false
    }
  }, [accessToken])

  if (!session) {
    return null
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-cacao-200/90 bg-white/80 p-6 shadow-card backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600">Módulo</p>
            <h2 className="text-3xl text-cacao-900">Pedidos</h2>
            <p className="mt-1 text-sm text-cacao-700">Acompanhe todos os pedidos e abra o painel de gerenciamento.</p>
          </div>

          <p className="rounded-full bg-cacao-100 px-4 py-2 text-sm font-semibold text-cacao-800">
            {filteredPedidos.length} de {orderedPedidos.length} {orderedPedidos.length === 1 ? 'pedido' : 'pedidos'}
          </p>
        </div>
      </header>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-3 rounded-2xl border border-cacao-200 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_200px_200px_auto]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-cacao-700">Buscar pedido</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Número, cliente ou pagamento"
            className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-sm text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-cacao-700">Situação</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-sm text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
          >
            <option value="all">Todas</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-cacao-700">Entrega</span>
          <select
            value={deliveryFilter}
            onChange={(event) => setDeliveryFilter(event.target.value)}
            className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-sm text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
          >
            <option value="all">Todos</option>
            {Object.entries(DELIVERY_TYPE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setSearchTerm('')
            setStatusFilter('all')
            setDeliveryFilter('all')
          }}
          disabled={!searchTerm && statusFilter === 'all' && deliveryFilter === 'all'}
          className="self-end rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Limpar
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-cacao-200 bg-white shadow-card">
        {isLoading ? (
          <p className="p-5 text-sm text-cacao-700">Carregando pedidos...</p>
        ) : filteredPedidos.length === 0 ? (
          <p className="p-5 text-sm text-cacao-700">Nenhum pedido encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-cacao-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Pedido</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Data</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Entrega</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Pagamento</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Total</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Situação</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredPedidos.map((pedido) => (
                  <tr key={pedido.id} className="border-t border-cacao-100">
                    <td className="px-4 py-3 text-cacao-900">#{pedido.id}</td>
                    <td className="px-4 py-3 text-cacao-700">{clientesById[pedido.id_usuario] ?? 'Cliente desconhecido'}</td>
                    <td className="px-4 py-3 text-cacao-700">{parsePedidoDate(pedido)}</td>
                    <td className="px-4 py-3 text-cacao-700">{getDeliveryTypeLabel(pedido.id_tipo_entrega)}</td>
                    <td className="px-4 py-3 text-cacao-700">{pedido.meio_pagamento}</td>
                    <td className="px-4 py-3 text-cacao-700">{currency.format(Number(pedido.valor_total))}</td>
                    <td className="px-4 py-3 text-cacao-700">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(pedido.id_status_pedido)}`}>
                        {getOrderStatusLabel(pedido.id_status_pedido)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/pedidos/${pedido.id}`}
                        className="inline-flex rounded-full border border-cacao-300 px-3 py-1.5 font-semibold text-cacao-700 transition hover:bg-cacao-50"
                      >
                        Gerenciar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
