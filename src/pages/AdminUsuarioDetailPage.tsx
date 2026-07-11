import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAdminSession } from '../lib/authStorage'
import { getUsuarioById, type UsuarioDetalhe } from '../lib/usuarioApi'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const ORDER_STATUS_LABELS: Record<number, string> = {
  1: 'Recebido',
  2: 'Em preparo',
  3: 'Em rota',
  4: 'Concluido',
  5: 'Cancelado',
}

function parseDate(raw?: string): string {
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

function getOrderStatusLabel(statusId: number): string {
  return ORDER_STATUS_LABELS[statusId] ?? `Status #${statusId}`
}

function getRoleLabel(roleId?: number): string {
  if (roleId === 2) {
    return 'Admin'
  }

  if (roleId === 1) {
    return 'Usuario'
  }

  return 'Desconhecido'
}

function getRoleChipClass(roleId?: number): string {
  if (roleId === 2) {
    return 'bg-amber-100 text-amber-800'
  }

  if (roleId === 1) {
    return 'bg-cacao-100 text-cacao-800'
  }

  return 'bg-slate-100 text-slate-700'
}

export function AdminUsuarioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const session = getAdminSession()

  const [usuario, setUsuario] = useState<UsuarioDetalhe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const accessToken = session?.accessToken
  const userId = Number(id)

  useEffect(() => {
    if (!accessToken || !Number.isInteger(userId) || userId <= 0) {
      return
    }

    const token = accessToken
    let mounted = true

    async function loadUsuario() {
      setIsLoading(true)
      setError('')

      try {
        const result = await getUsuarioById(userId, token)

        if (!mounted) {
          return
        }

        setUsuario(result)
      } catch (loadError) {
        if (!mounted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar usuario.'
        setError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadUsuario()

    return () => {
      mounted = false
    }
  }, [accessToken, userId])

  if (!session) {
    return null
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Usuario invalido.</p>
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-cacao-200/90 bg-white/80 p-6 shadow-card backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600">Usuarios</p>
            <h2 className="text-3xl text-cacao-900">Detalhes do usuario</h2>
          </div>

          <Link
            to="/admin/usuarios"
            className="inline-flex rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
          >
            Voltar para usuarios
          </Link>
        </div>
      </header>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {isLoading ? (
        <p className="rounded-2xl border border-cacao-200 bg-white p-5 text-sm text-cacao-700 shadow-card">Carregando dados do usuario...</p>
      ) : usuario ? (
        <>
          <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
            <h3 className="text-2xl text-cacao-900">{usuario.nome}</h3>
            <div className="mt-3">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRoleChipClass(usuario.id_tipo_usuario)}`}>
                {getRoleLabel(usuario.id_tipo_usuario)}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm text-cacao-800 sm:grid-cols-2">
              <div>
                <dt className="text-cacao-600">ID</dt>
                <dd className="font-semibold text-cacao-900">#{usuario.id}</dd>
              </div>
              <div>
                <dt className="text-cacao-600">Criacao</dt>
                <dd className="font-semibold text-cacao-900">{parseDate(usuario.data_criacao)}</dd>
              </div>
              <div>
                <dt className="text-cacao-600">Email</dt>
                <dd className="font-semibold text-cacao-900">{usuario.email ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-cacao-600">Telefone</dt>
                <dd className="font-semibold text-cacao-900">{usuario.telefone ?? '-'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
            <h3 className="text-xl text-cacao-900">Enderecos</h3>
            {usuario.endereco.length === 0 ? (
              <p className="mt-2 text-sm text-cacao-700">Nenhum endereco cadastrado.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {usuario.endereco.map((endereco) => (
                  <article key={endereco.id} className="rounded-xl border border-cacao-100 p-4">
                    <p className="font-semibold text-cacao-900">
                      {endereco.logradouro}, {endereco.numero}
                    </p>
                    <p className="text-sm text-cacao-700">
                      {endereco.bairro} - {endereco.cidade} | CEP {endereco.cep}
                    </p>
                    {endereco.complemento ? <p className="text-sm text-cacao-700">{endereco.complemento}</p> : null}
                    {endereco.principal ? <p className="mt-1 text-xs font-semibold text-cacao-600">Endereco principal</p> : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
            <h3 className="text-xl text-cacao-900">Pedidos</h3>
            {usuario.pedido.length === 0 ? (
              <p className="mt-2 text-sm text-cacao-700">Nenhum pedido realizado.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-cacao-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-cacao-700">Pedido</th>
                      <th className="px-4 py-3 text-left font-semibold text-cacao-700">Data</th>
                      <th className="px-4 py-3 text-left font-semibold text-cacao-700">Pagamento</th>
                      <th className="px-4 py-3 text-left font-semibold text-cacao-700">Total</th>
                      <th className="px-4 py-3 text-left font-semibold text-cacao-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuario.pedido.map((pedido) => (
                      <tr key={pedido.id} className="border-t border-cacao-100">
                        <td className="px-4 py-3 text-cacao-900">#{pedido.id}</td>
                        <td className="px-4 py-3 text-cacao-700">{parseDate(pedido.data_pedido ?? pedido.data_criacao)}</td>
                        <td className="px-4 py-3 text-cacao-700">{pedido.meio_pagamento}</td>
                        <td className="px-4 py-3 text-cacao-700">{currency.format(Number(pedido.valor_total))}</td>
                        <td className="px-4 py-3 text-cacao-700">{getOrderStatusLabel(pedido.id_status_pedido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  )
}
