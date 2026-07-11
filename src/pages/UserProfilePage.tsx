import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { UserTopbar } from '../components/UserTopbar'
import { updateCurrentUser } from '../lib/authApi'
import type { AuthSession } from '../lib/authStorage'
import { clearSession, getSession, saveSession } from '../lib/authStorage'

export function UserProfilePage() {
  const [session, setSession] = useState(() => getSession())
  const [nome, setNome] = useState(() => session?.user.nome ?? '')
  const [email, setEmail] = useState(() => session?.user.email ?? '')
  const [telefone, setTelefone] = useState(() => session?.user.telefone ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!session) {
    return <Navigate to="/login" replace />
  }

  function onLogout() {
    clearSession()
    setSession(null)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!session) {
      setError('Sessao invalida. Faca login novamente.')
      return
    }

    const nextNome = nome.trim()
    const nextEmail = email.trim()
    const nextTelefone = telefone.trim()

    if (!nextNome) {
      setError('Informe seu nome.')
      return
    }

    if (!nextEmail && !nextTelefone) {
      setError('Informe email ou telefone.')
      return
    }

    setIsSubmitting(true)

    try {
      const updatedUser = await updateCurrentUser(
        {
          nome: nextNome,
          email: nextEmail,
          telefone: nextTelefone,
        },
        session.accessToken,
      )

      const updatedSession: AuthSession = {
        ...session,
        user: updatedUser,
      }

      saveSession(updatedSession)
      setSession(updatedSession)
      setSuccess('Dados atualizados com sucesso.')
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Nao foi possivel atualizar seus dados.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="catalog-shell space-y-6">
      <UserTopbar session={session} onLogout={onLogout} />

      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-cacao-200 bg-white p-6 shadow-card sm:p-8">
        <h1 className="mb-2 text-3xl text-cacao-900">Minha conta</h1>
        <p className="mb-6 text-cacao-700">Atualize seu nome, email e telefone.</p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-cacao-700">Nome</span>
            <input
              className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              type="text"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-cacao-700">Email</span>
            <input
              className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@exemplo.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-cacao-700">Telefone</span>
            <input
              className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              type="text"
              value={telefone}
              onChange={(event) => setTelefone(event.target.value)}
              placeholder="(51) 99999-9999"
            />
          </label>

          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </form>
      </section>
    </main>
  )
}
