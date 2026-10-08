import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserTopbar } from '../components/UserTopbar'
import { resetPassword } from '../lib/passwordRecoveryApi'

export function PasswordResetPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (senha !== confirmacao) {
      setError('As senhas não coincidem.')
      return
    }

    setIsSubmitting(true)

    try {
      await resetPassword(token, senha)
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível redefinir sua senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="catalog-shell">
      <UserTopbar session={null} />

      <section className="mx-auto mt-8 w-full max-w-xl rounded-3xl border border-cacao-200 bg-white p-6 shadow-card sm:p-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-cacao-600">Acesso à conta</p>
        <h1 className="mb-2 text-3xl text-cacao-900">Criar nova senha</h1>

        {!token ? (
          <div className="space-y-4">
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              O link está incompleto ou inválido. Solicite uma nova recuperação de senha.
            </p>
            <Link to="/recuperar-senha" className="inline-flex rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900">
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cacao-700">Nova senha</span>
              <input
                className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                required
              />
              <span className="mt-1 block text-xs text-cacao-500">Use pelo menos 8 caracteres.</span>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cacao-700">Confirmar nova senha</span>
              <input
                className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                required
              />
            </label>

            {error ? <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}