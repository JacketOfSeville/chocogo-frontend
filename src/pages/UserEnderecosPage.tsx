import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { clearSession, getSession } from '../lib/authStorage'
import { UserTopbar } from '../components/UserTopbar'
import { deleteEndereco, listEnderecos } from '../lib/enderecoApi'
import type { Endereco } from '../types/api'

export function UserEnderecosPage() {
  const [session, setSession] = useState(() => getSession())
  const [enderecos, setEnderecos] = useState<Endereco[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const accessToken = session?.accessToken

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const token = accessToken

    let mounted = true

    async function loadEnderecos() {
      setIsLoading(true)
      setError('')

      try {
        const result = await listEnderecos(token)

        if (!mounted) {
          return
        }

        setEnderecos(result)
      } catch (loadError) {
        if (!mounted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : 'Não foi possível carregar os endereços.'
        setError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadEnderecos()

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

  async function onDelete(id: number) {
    if (!accessToken) {
      setError('Sessão inválida. Faça login novamente.')
      return
    }

    const token = accessToken

    const confirmed = window.confirm('Deseja remover este endereço?')
    if (!confirmed) {
      return
    }

    setIsDeletingId(id)
    setError('')
    setSuccess('')

    try {
      await deleteEndereco(id, token)
      setEnderecos((previous) => previous.filter((item) => item.id !== id))
      setSuccess('Endereço removido com sucesso.')
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Não foi possível remover o endereço.'
      setError(message)
    } finally {
      setIsDeletingId(null)
    }
  }

  return (
    <main className="catalog-shell space-y-6">
      <UserTopbar session={session} onLogout={onLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8">
        <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl text-cacao-900">Meus endereços</h1>
              <p className="mt-1 text-sm text-cacao-700">Gerencie seus endereços de entrega.</p>
            </div>

            <Link
              to="/meus-enderecos/novo"
              className="inline-flex items-center justify-center rounded-full bg-cacao-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900"
            >
              Novo endereço
            </Link>
          </div>

          {isLoading ? <p className="text-sm text-cacao-700">Carregando enderecos...</p> : null}

          {!isLoading && enderecos.length === 0 ? (
            <p className="text-sm text-cacao-700">Voce ainda nao possui enderecos cadastrados.</p>
          ) : null}

          {!isLoading && enderecos.length > 0 ? (
            <div className="space-y-3">
              {enderecos.map((endereco) => (
                <article key={endereco.id} className="rounded-xl border border-cacao-100 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold text-cacao-900">
                      {endereco.logradouro}, {endereco.numero}
                    </p>
                    {endereco.principal ? (
                      <span className="rounded-full bg-mint-100 px-2.5 py-1 text-xs font-semibold text-mint-700">Principal</span>
                    ) : null}
                  </div>

                  <p className="text-sm text-cacao-700">
                    {endereco.bairro} - {endereco.cidade}
                  </p>
                  <p className="text-sm text-cacao-700">CEP: {endereco.cep}</p>
                  {endereco.complemento ? <p className="text-sm text-cacao-700">Complemento: {endereco.complemento}</p> : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/meus-enderecos/${endereco.id}/editar`}
                      className="rounded-full border border-cacao-300 px-3 py-1.5 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
                    >
                      Editar
                    </Link>

                    <button
                      type="button"
                      onClick={() => onDelete(endereco.id)}
                      disabled={isDeletingId === endereco.id}
                      className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeletingId === endereco.id ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-4 rounded-xl bg-mint-100 px-3 py-2 text-sm text-mint-700">{success}</p> : null}
      </section>
    </main>
  )
}
