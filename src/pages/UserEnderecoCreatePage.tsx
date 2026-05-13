import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { clearSession, getSession } from '../lib/authStorage'
import { UserTopbar } from '../components/UserTopbar'
import { createEndereco, type EnderecoInput } from '../lib/enderecoApi'

const initialForm: EnderecoInput = {
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  cep: '',
  principal: false,
}

export function UserEnderecoCreatePage() {
  const [session, setSession] = useState(() => getSession())
  const [form, setForm] = useState<EnderecoInput>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const accessToken = session?.accessToken

  if (!session || !accessToken) {
    return <Navigate to="/login" replace />
  }

  function onLogout() {
    clearSession()
    setSession(null)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!accessToken) {
      setError('Sessao invalida. Faca login novamente.')
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

      await createEndereco(payload, token)
      navigate('/meus-enderecos', { replace: true })
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Nao foi possivel criar o endereco.'
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
          <h1 className="mb-2 text-3xl text-cacao-900">Novo endereco</h1>
          <p className="mb-5 text-sm text-cacao-700">Cadastre um endereco para entrega.</p>

          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cacao-700">Logradouro</span>
              <input
                className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                value={form.logradouro}
                onChange={(event) => setForm((previous) => ({ ...previous, logradouro: event.target.value }))}
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Numero</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  value={form.numero}
                  onChange={(event) => setForm((previous) => ({ ...previous, numero: event.target.value }))}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">CEP</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  value={form.cep}
                  onChange={(event) => setForm((previous) => ({ ...previous, cep: event.target.value }))}
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cacao-700">Complemento (opcional)</span>
              <input
                className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                value={form.complemento ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, complemento: event.target.value }))}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Bairro</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  value={form.bairro}
                  onChange={(event) => setForm((previous) => ({ ...previous, bairro: event.target.value }))}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Cidade</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  value={form.cidade}
                  onChange={(event) => setForm((previous) => ({ ...previous, cidade: event.target.value }))}
                  required
                />
              </label>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-cacao-700">
              <input
                type="checkbox"
                checked={Boolean(form.principal)}
                onChange={(event) => setForm((previous) => ({ ...previous, principal: event.target.checked }))}
              />
              Endereco principal
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Salvando...' : 'Cadastrar endereco'}
              </button>

              <Link
                to="/meus-enderecos"
                className="rounded-full border border-cacao-300 px-5 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
              >
                Cancelar
              </Link>
            </div>
          </form>

          {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </section>
      </section>
    </main>
  )
}
