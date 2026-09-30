import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCatalogProducts, type CatalogProduct } from '../lib/catalogService'
import { getAdminSession } from '../lib/authStorage'
import { getPedido, listPedidoItens, updatePedido } from '../lib/pedidoApi'
import { getUsuarioById } from '../lib/usuarioApi'
import type { Pedido, PedidoItem } from '../types/api'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const DELIVERY_TYPE_LABELS: Record<number, string> = {
  1: 'Entrega',
  2: 'Retirada',
}

const ORDER_STATUS_LABELS: Record<number, string> = {
  1: 'Recebido',
  2: 'Em preparo',
  3: 'Em rota',
  4: 'Concluido',
  5: 'Cancelado',
}

const NEXT_STATUS_MAP: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
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

function getDeliveryTypeLabel(id: number): string {
  return DELIVERY_TYPE_LABELS[id] ?? `Tipo #${id}`
}

function getOrderStatusLabel(id: number): string {
  return ORDER_STATUS_LABELS[id] ?? `Status #${id}`
}

function statusBadgeClass(statusId: number): string {
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

export function AdminPedidoManagePage() {
  const { id } = useParams<{ id: string }>()
  const session = getAdminSession()

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [itens, setItens] = useState<PedidoItem[]>([])
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [clienteNome, setClienteNome] = useState('')
  const [selectedStatusId, setSelectedStatusId] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const accessToken = session?.accessToken
  const pedidoId = Number(id)

  const valorTotal = pedido ? Number(pedido.valor_total) : 0
  const valorFrete = pedido ? Number(pedido.valor_frete) : 0
  const valorProdutos = valorTotal - valorFrete
  const canAdvance = pedido ? NEXT_STATUS_MAP[pedido.id_status_pedido] !== undefined : false
  const isDone = pedido?.id_status_pedido === 4
  const isCanceled = pedido?.id_status_pedido === 5
  const isRetirada = pedido?.id_tipo_entrega === 2
  const isEntrega = pedido?.id_tipo_entrega === 1

  const itemRows = useMemo(
    () =>
      itens.map((item) => {
        const product = products.find((entry) => entry.id === item.id_produto)
        return {
          ...item,
          productName: product?.nome ?? `Produto #${item.id_produto}`,
          imageUrl: product?.imageUrl,
        }
      }),
    [itens, products],
  )

  async function loadPedidoData(token: string, currentPedidoId: number) {
    setIsLoading(true)
    setError('')

    try {
      const [pedidoData, itensData, catalogProducts] = await Promise.all([
        getPedido(currentPedidoId, token),
        listPedidoItens(currentPedidoId, token),
        getCatalogProducts({ includeInactive: true }),
      ])

      const usuario = await getUsuarioById(pedidoData.id_usuario, token)

      setPedido(pedidoData)
      setItens(itensData)
      setProducts(catalogProducts)
      setClienteNome(usuario.nome)
      setSelectedStatusId(pedidoData.id_status_pedido)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar pedido.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken || !Number.isInteger(pedidoId) || pedidoId <= 0) {
      return
    }

    queueMicrotask(() => {
      void loadPedidoData(accessToken, pedidoId)
    })
  }, [accessToken, pedidoId])

  async function applyStatus(statusId: number, successMessage: string) {
    if (!accessToken || !pedido) {
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const updated = await updatePedido(pedido.id, { id_status_pedido: statusId }, accessToken)
      setPedido(updated)
      setSelectedStatusId(updated.id_status_pedido)
      setSuccess(successMessage)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao atualizar status do pedido.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function onSaveManualStatus() {
    await applyStatus(selectedStatusId, 'Status atualizado com sucesso.')
  }

  async function onAdvanceStatus() {
    if (!pedido) {
      return
    }

    const nextStatus = NEXT_STATUS_MAP[pedido.id_status_pedido]
    if (!nextStatus) {
      return
    }

    await applyStatus(nextStatus, `Pedido avancou para ${getOrderStatusLabel(nextStatus)}.`)
  }

  async function onMarkAsDone() {
    await applyStatus(4, 'Pedido marcado como concluido.')
  }

  async function onCancelPedido() {
    if (!pedido) {
      return
    }

    const shouldCancel = window.confirm(`Deseja cancelar o pedido #${pedido.id}?`)
    if (!shouldCancel) {
      return
    }

    await applyStatus(5, 'Pedido cancelado.')
  }

  async function onToggleProntoRetirada() {
    if (!pedido || !accessToken) {
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const updated = await updatePedido(
        pedido.id,
        {
          pronto_retirada: !pedido.pronto_retirada,
          entregue: false,
        },
        accessToken,
      )
      setPedido(updated)
      setSuccess(updated.pronto_retirada ? 'Pedido marcado como pronto para retirada.' : 'Flag de retirada pronta removida.')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao atualizar retirada.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function onToggleEntregue() {
    if (!pedido || !accessToken) {
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const updated = await updatePedido(
        pedido.id,
        {
          entregue: !pedido.entregue,
          pronto_retirada: false,
        },
        accessToken,
      )
      setPedido(updated)
      setSuccess(updated.entregue ? 'Pedido marcado como entregue.' : 'Flag de entregue removida.')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao atualizar entrega.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (!session) {
    return null
  }

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Pedido invalido.</p>
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-cacao-200/90 bg-white/85 p-6 shadow-card backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600">Pedidos</p>
            <h2 className="text-3xl text-cacao-900">Gerenciar pedido</h2>
            <p className="mt-1 text-sm text-cacao-700">Confira os detalhes e atualize o andamento do pedido.</p>
          </div>

          <Link
            to="/admin/pedidos"
            className="inline-flex items-center justify-center rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
          >
            Voltar para pedidos
          </Link>
        </div>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

      {isLoading ? (
        <p className="rounded-2xl border border-cacao-200 bg-white p-5 text-sm text-cacao-700 shadow-card">Carregando pedido...</p>
      ) : pedido ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <section className="space-y-5">
            <article className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl text-cacao-900">Pedido #{pedido.id}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(pedido.id_status_pedido)}`}>
                  {getOrderStatusLabel(pedido.id_status_pedido)}
                </span>
                {pedido.entregue ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Entregue</span>
                ) : pedido.pronto_retirada ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Pronto para retirada</span>
                ) : null}
              </div>

              <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-cacao-600">Cliente</dt>
                  <dd className="mt-0.5 font-semibold text-cacao-900">{clienteNome || 'Cliente desconhecido'}</dd>
                </div>
                <div>
                  <dt className="text-cacao-600">Data do pedido</dt>
                  <dd className="mt-0.5 font-semibold text-cacao-900">{parsePedidoDate(pedido)}</dd>
                </div>
                <div>
                  <dt className="text-cacao-600">Tipo de entrega</dt>
                  <dd className="mt-0.5 font-semibold text-cacao-900">{getDeliveryTypeLabel(pedido.id_tipo_entrega)}</dd>
                </div>
                <div>
                  <dt className="text-cacao-600">Pagamento</dt>
                  <dd className="mt-0.5 font-semibold text-cacao-900">{pedido.meio_pagamento}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl text-cacao-900">Itens do pedido</h3>
                <span className="text-sm text-cacao-600">{itemRows.length} item(ns)</span>
              </div>
              {itemRows.length === 0 ? (
                <p className="mt-4 rounded-xl bg-cacao-50 p-4 text-sm text-cacao-700">Nenhum item neste pedido.</p>
              ) : (
                <div className="mt-4 divide-y divide-cacao-100">
                  {itemRows.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="size-14 shrink-0 rounded-lg border border-cacao-100 bg-cacao-50 object-cover"
                          />
                        ) : (
                          <div className="size-14 shrink-0 rounded-lg border border-cacao-100 bg-cacao-50" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-cacao-900">{item.productName}</p>
                          <p className="mt-0.5 text-sm text-cacao-700">
                            {item.quantidade} un. <span className="text-cacao-400">·</span> {currency.format(Number(item.preco_momento))} cada
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-cacao-900">{currency.format(Number(item.subtotal))}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <article className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card sm:p-6">
              <h3 className="text-xl text-cacao-900">Resumo financeiro</h3>

              <dl className="mt-4 space-y-3 rounded-xl bg-cacao-50 p-4 text-sm text-cacao-800">
                <div className="flex items-center justify-between gap-4">
                  <dt>Produtos</dt>
                  <dd className="font-semibold">{currency.format(valorProdutos)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Frete</dt>
                  <dd className="font-semibold">{currency.format(valorFrete)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-cacao-200 pt-3 text-base text-cacao-900">
                  <dt className="font-semibold">Total</dt>
                  <dd className="text-lg font-bold">{currency.format(valorTotal)}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl text-cacao-900">Atualizar pedido</h3>
                  <p className="mt-1 text-sm text-cacao-600">Situação atual: {getOrderStatusLabel(pedido.id_status_pedido)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(pedido.id_status_pedido)}`}>
                  {getOrderStatusLabel(pedido.id_status_pedido)}
                </span>
              </div>

              <div className="mt-5 space-y-2">
                <label className="block text-sm font-semibold text-cacao-700" htmlFor="status-pedido">
                  Alterar situação manualmente
                </label>
                <select
                  id="status-pedido"
                  value={selectedStatusId}
                  onChange={(event) => setSelectedStatusId(Number(event.target.value))}
                  disabled={isSaving}
                  className="w-full rounded-xl border border-cacao-300 bg-white px-3 py-2.5 text-sm text-cacao-900 focus:border-cacao-500 focus:outline-none focus:ring-2 focus:ring-cacao-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {Object.entries(ORDER_STATUS_LABELS).map(([statusId, label]) => (
                    <option key={statusId} value={Number(statusId)}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onSaveManualStatus}
                  disabled={isSaving || selectedStatusId === pedido.id_status_pedido}
                  className="w-full rounded-xl border border-cacao-300 px-4 py-2.5 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar situação'}
                </button>
              </div>

              <div className="mt-5 border-t border-cacao-100 pt-5">
                <p className="text-xs font-semibold uppercase text-cacao-500">Próximo passo</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <button
                    type="button"
                    onClick={onAdvanceStatus}
                    disabled={isSaving || !canAdvance || isCanceled || isDone}
                    className="w-full rounded-xl bg-cacao-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {canAdvance ? `Avançar para ${getOrderStatusLabel(NEXT_STATUS_MAP[pedido.id_status_pedido])}` : 'Sem próximo status'}
                  </button>
                  <button
                    type="button"
                    onClick={onMarkAsDone}
                    disabled={isSaving || isDone || isCanceled}
                    className="w-full rounded-xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Marcar como concluído
                  </button>
                </div>
              </div>

              {isRetirada || isEntrega ? (
                <div className="mt-5 border-t border-cacao-100 pt-5">
                  <p className="text-xs font-semibold uppercase text-cacao-500">Confirmação de {isRetirada ? 'retirada' : 'entrega'}</p>
                  {isRetirada ? (
                    <button
                      type="button"
                      onClick={onToggleProntoRetirada}
                      disabled={isSaving || isCanceled}
                      className="mt-3 w-full rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pedido.pronto_retirada ? 'Desmarcar como pronto para retirada' : 'Marcar como pronto para retirada'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onToggleEntregue}
                      disabled={isSaving || isCanceled}
                      className="mt-3 w-full rounded-xl border border-sky-300 px-4 py-2.5 text-sm font-semibold text-sky-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pedido.entregue ? 'Desmarcar como entregue' : 'Marcar como entregue'}
                    </button>
                  )}
                </div>
              ) : null}

              <div className="mt-5 border-t border-red-100 pt-4">
                <button
                  type="button"
                  onClick={onCancelPedido}
                  disabled={isSaving || isCanceled || isDone}
                  className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCanceled ? 'Pedido cancelado' : 'Cancelar pedido'}
                </button>
              </div>
            </article>
          </aside>
        </div>
      ) : (
        <p className="rounded-2xl border border-cacao-200 bg-white p-5 text-sm text-cacao-700 shadow-card">Pedido não encontrado.</p>
      )}
    </section>
  )
}
