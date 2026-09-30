import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getAdminSession } from '../lib/authStorage'
import { getOrderReport, type OrderReport } from '../lib/reportApi'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const STATUS_COLORS = ['#16856f', '#d58b16', '#397d94', '#406b48', '#d84942', '#7554a6']

function formatShortDate(value: string, period: number): string {
  const date = new Date(`${value}T12:00:00`)
  return date.toLocaleDateString('pt-BR', period <= 7 ? { weekday: 'short', day: '2-digit' } : { day: '2-digit', month: 'short' })
}

function StatCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden="true" />
      <p className="text-sm font-medium text-cacao-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-cacao-900">{value}</p>
      <p className="mt-1 text-xs text-cacao-500">{detail}</p>
    </article>
  )
}

export function AdminRelatoriosPage() {
  const session = getAdminSession()
  const [periodDays, setPeriodDays] = useState(30)
  const [report, setReport] = useState<OrderReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const accessToken = session?.accessToken

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const token = accessToken
    let mounted = true

    async function loadReport() {
      setIsLoading(true)
      setError('')

      try {
        const result = await getOrderReport(periodDays, token)
        if (mounted) {
          setReport(result)
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os relatórios.')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadReport()

    return () => {
      mounted = false
    }
  }, [accessToken, periodDays])

  if (!session) {
    return null
  }

  return (
    <section className="admin-report-page space-y-5">
      <header className="rounded-3xl border border-cacao-200/90 bg-white/85 p-6 shadow-card backdrop-blur-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-cacao-600">Visão do negócio</p>
            <h2 className="text-3xl text-cacao-900">Relatórios</h2>
            <p className="mt-1 text-sm text-cacao-700">Acompanhe vendas, pedidos e produtos em destaque.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end" data-print-hide>
            <label className="block w-full sm:w-48">
              <span className="mb-1 block text-xs font-semibold uppercase text-cacao-500">Período</span>
              <select
                value={periodDays}
                onChange={(event) => setPeriodDays(Number(event.target.value))}
                className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2.5 text-sm font-semibold text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={30}>Últimos 30 dias</option>
                <option value={90}>Últimos 90 dias</option>
                <option value={365}>Últimos 12 meses</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={isLoading || !report}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cacao-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">⇩</span>
              Exportar PDF
            </button>
          </div>
        </div>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {isLoading && !report ? (
        <p className="rounded-2xl border border-cacao-200 bg-white p-5 text-sm text-cacao-700 shadow-card">Carregando relatórios...</p>
      ) : report ? (
        <>
          <section className="report-metrics grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores do período">
            <StatCard
              label="Faturamento"
              value={currency.format(report.summary.revenue)}
              detail="Pedidos não cancelados"
              accent="bg-emerald-600"
            />
            <StatCard
              label="Pedidos"
              value={report.summary.orderCount.toLocaleString('pt-BR')}
              detail={`${report.summary.canceledOrders} cancelado(s)`}
              accent="bg-cacao-700"
            />
            <StatCard
              label="Ticket médio"
              value={currency.format(report.summary.averageTicket)}
              detail="Por pedido válido"
              accent="bg-amber-500"
            />
            <StatCard
              label="Entrega e retirada"
              value={`${report.summary.deliveryOrders} / ${report.summary.pickupOrders}`}
              detail="Pedidos para entrega / retirada"
              accent="bg-sky-600"
            />
          </section>

          <section className="report-charts grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]">
            <article className="min-w-0 rounded-2xl border border-cacao-200 bg-white p-5 shadow-card sm:p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-xl text-cacao-900">Faturamento ao longo do tempo</h3>
                  <p className="mt-1 text-sm text-cacao-600">Receita diária, sem pedidos cancelados</p>
                </div>
                <span className="text-xs font-medium text-cacao-500">{periodDays === 365 ? '12 meses' : `${periodDays} dias`}</span>
              </div>

              {report.salesTimeline.some((point) => point.revenue > 0) ? (
                <div className="h-[290px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.salesTimeline} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#17866f" stopOpacity={0.24} />
                          <stop offset="95%" stopColor="#17866f" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#eadfd5" strokeDasharray="3 5" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value: string) => formatShortDate(value, periodDays)}
                        tick={{ fill: '#806d60', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={periodDays > 30 ? 34 : 16}
                      />
                      <YAxis
                        tickFormatter={(value: number) => compactCurrency.format(value)}
                        tick={{ fill: '#806d60', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={68}
                      />
                      <Tooltip
                        labelFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { dateStyle: 'long' })}
                        formatter={(value) => [currency.format(Number(value)), 'Faturamento']}
                        contentStyle={{ borderRadius: 12, borderColor: '#e8d7c8', fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#17866f" strokeWidth={3} fill="url(#salesFill)" activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[290px] items-center justify-center rounded-xl bg-cacao-50 px-5 text-center text-sm text-cacao-600">
                  Ainda não há vendas neste período.
                </div>
              )}
            </article>

            <article className="min-w-0 rounded-2xl border border-cacao-200 bg-white p-5 shadow-card sm:p-6">
              <div className="mb-3">
                <h3 className="text-xl text-cacao-900">Situação dos pedidos</h3>
                <p className="mt-1 text-sm text-cacao-600">Distribuição no período selecionado</p>
              </div>

              {report.ordersByStatus.length > 0 ? (
                <>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={report.ordersByStatus}
                          dataKey="count"
                          nameKey="label"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={3}
                          stroke="white"
                          strokeWidth={3}
                        >
                          {report.ordersByStatus.map((entry, index) => (
                            <Cell key={entry.id} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${Number(value)} pedido(s)`, name]}
                          contentStyle={{ borderRadius: 12, borderColor: '#e8d7c8', fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2">
                    {report.ordersByStatus.map((status, index) => (
                      <li key={status.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2 text-cacao-700">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                          <span className="truncate">{status.label}</span>
                        </span>
                        <strong className="text-cacao-900">{status.count}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex h-[290px] items-center justify-center rounded-xl bg-cacao-50 px-5 text-center text-sm text-cacao-600">
                  Nenhum pedido neste período.
                </div>
              )}
            </article>
          </section>

          <article className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card sm:p-6">
            <div className="mb-5">
              <h3 className="text-xl text-cacao-900">Produtos mais vendidos</h3>
              <p className="mt-1 text-sm text-cacao-600">Por unidades em pedidos não cancelados</p>
            </div>

            {report.topProducts.length > 0 ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.topProducts} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="#eadfd5" strokeDasharray="3 5" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#806d60', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={132}
                      tick={{ fill: '#5e4839', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value)} unidade(s)`, 'Vendidos']}
                      contentStyle={{ borderRadius: 12, borderColor: '#e8d7c8', fontSize: 12 }}
                    />
                    <Bar dataKey="quantity" name="Unidades" fill="#bd6a37" radius={[0, 7, 7, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[240px] items-center justify-center rounded-xl bg-cacao-50 px-5 text-center text-sm text-cacao-600">
                Ainda não há produtos vendidos neste período.
              </div>
            )}
          </article>
        </>
      ) : null}

      {report ? (
        <footer className="hidden text-xs text-cacao-500 print:block">
          Relatório gerado em {new Date().toLocaleString('pt-BR')}
        </footer>
      ) : null}
    </section>
  )
}