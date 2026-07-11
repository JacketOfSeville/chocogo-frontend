import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { clearSession, getSession } from '../lib/authStorage'
import { UserTopbar } from '../components/UserTopbar'
import { getEndereco, updateEndereco, type EnderecoInput } from '../lib/enderecoApi'

export function UserEnderecoEditPage() {
  const [session, setSession] = useState(() => getSession())
  const [form, setForm] = useState<EnderecoInput | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const params = useParams()

  const accessToken = session?.accessToken
  const enderecoId = Number(params.id)

  useEffect(() => {
    if (!accessToken || !Number.isInteger(enderecoId) || enderecoId <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false)
      return
    }

    const token = accessToken

    let mounted = true

    async function loadEndereco() {
      setIsLoading(true)
      setError('')

      try {
        const endereco = await getEndereco(enderecoId, token)

        if (!mounted) {
          return
        }

        setForm({
          logradouro: endereco.logradouro,
          numero: endereco.numero,
          complemento: endereco.complemento ?? '',
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          cep: endereco.cep,
          principal: endereco.principal,
        })
      } catch (loadError) {
        if (!mounted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : 'Não foi possível carregar o endereço.'
        setError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadEndereco()

    return () => {
      mounted = false
    }
  }, [accessToken, enderecoId])

  if (!session || !accessToken) {
    return <Navigate to="/login" replace />
  }

  function onLogout() {
    clearSession()
    setSession(null)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form || !accessToken) {
      if (!accessToken) {
        setError('Sessão inválida. Faça login novamente.')
      }
      return
    }

    const token = accessToken

    setIsSubmitting(true)
    setError('')

    try {
      const payload: EnderecoInput = {
        ...form,
        complemento: form.complemento?.trim() ? form.complemento.trim() : undefined,
      }

      await updateEndereco(enderecoId, payload, token)
      navigate('/meus-enderecos', { replace: true })
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Não foi possível atualizar o endereço.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="catalog-shell space-y-6">
      <UserTopbar session={session} onLogout={onLogout} />

      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8">
        <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
          <h1 className="mb-2 text-3xl text-cacao-900">Editar endereço</h1>
          <p className="mb-5 text-sm text-cacao-700">Atualize os dados do seu endereço.</p>

          {!Number.isInteger(enderecoId) || enderecoId <= 0 ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Endereço inválido.</p>
          ) : null}

          {isLoading ? <p className="text-sm text-cacao-700">Carregando endereço...</p> : null}

          {!isLoading && form ? (
            <form className="space-y-3" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Logradouro</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  value={form.logradouro}
                  onChange={(event) => setForm((previous) => (previous ? { ...previous, logradouro: event.target.value } : previous))}
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-cacao-700">Numero</span>
                  <input
                    className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                    value={form.numero}
                    onChange={(event) => setForm((previous) => (previous ? { ...previous, numero: event.target.value } : previous))}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-cacao-700">CEP</span>
                  <input
                    className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                    value={form.cep}
                    onChange={(event) => setForm((previous) => (previous ? { ...previous, cep: event.target.value } : previous))}
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Complemento (opcional)</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  value={form.complemento ?? ''}
                  onChange={(event) => setForm((previous) => (previous ? { ...previous, complemento: event.target.value } : previous))}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-cacao-700">Bairro</span>
                  <input
                    className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                    value={form.bairro}
                    onChange={(event) => setForm((previous) => (previous ? { ...previous, bairro: event.target.value } : previous))}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-cacao-700">Cidade</span>
                  <input
                    className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                    value={form.cidade}
                    onChange={(event) => setForm((previous) => (previous ? { ...previous, cidade: event.target.value } : previous))}
                    required
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-cacao-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.principal)}
                  onChange={(event) => setForm((previous) => (previous ? { ...previous, principal: event.target.checked } : previous))}
                />
                Endereço principal
              </label>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                </button>

                <Link
                  to="/meus-enderecos"
                  className="rounded-full border border-cacao-300 px-5 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          ) : null}

          {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </section>
      </section>
    </main>
  )
}
