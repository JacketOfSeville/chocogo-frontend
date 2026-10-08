import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { UserTopbar } from '../components/UserTopbar'
import { requestPasswordReset } from '../lib/passwordRecoveryApi'

export function PasswordRecoveryPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await requestPasswordReset(email.trim())
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível solicitar a redefinição de senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="catalog-shell">
      <UserTopbar session={null} />

      <section className="mx-auto mt-8 w-full max-w-xl rounded-3xl border border-cacao-200 bg-white p-6 shadow-card sm:p-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-cacao-600">Acesso à conta</p>
        <h1 className="mb-2 text-3xl text-cacao-900">Recuperar senha</h1>
        {submitted ? (
          <div role="status" className="space-y-4">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Se o endereço informado estiver cadastrado, você receberá um link para criar uma nova senha. Confira também a pasta de spam.
            </p>
            <Link to="/login" className="inline-flex rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-cacao-700">Informe o e-mail associado à sua conta para receber o link de redefinição.</p>

            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">E-mail</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              {error ? <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
                <Link to="/login" className="text-sm font-medium text-cacao-700 underline underline-offset-4">
                  Voltar ao login
                </Link>
              </div>
            </form>
          </>
        )}
      </section>
    </main>
  )
}