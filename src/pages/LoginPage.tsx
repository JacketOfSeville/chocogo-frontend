import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginUser } from '../lib/authApi'
import { saveSession } from '../lib/authStorage'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [senha, setSenha] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fromPath = (location.state as { from?: string } | null)?.from ?? '/'

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const session = await loginUser(identifier.trim(), senha)
      saveSession(session)
      navigate(fromPath, { replace: true })
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Nao foi possivel autenticar.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="catalog-shell">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-cacao-200 bg-white p-6 shadow-card sm:p-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600">ChocoGo</p>
        <h1 className="mb-2 text-3xl text-cacao-900">Login</h1>
        <p className="mb-6 text-cacao-700">Entre para acompanhar seus pedidos e acessar recursos da sua conta.</p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-cacao-700">Email ou telefone</span>
            <input
              className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-cacao-700">Senha</span>
            <input
              className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />
          </label>

          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>

            <Link to="/register" className="text-sm font-medium text-cacao-700 underline underline-offset-4">
              Criar conta
            </Link>

            <Link to="/" className="text-sm font-medium text-cacao-700 underline underline-offset-4">
              Voltar ao catalogo
            </Link>
          </div>
        </form>
      </section>
    </main>
  )
}
