import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AuthSession } from '../lib/authStorage'

interface UserTopbarProps {
  session: AuthSession | null
  onLogout?: () => void
}

export function UserTopbar({ session, onLogout }: UserTopbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = session
    ? [
        { to: '/', label: 'Catalogo' },
        { to: '/minha-conta', label: 'Minha conta' },
        ...(session.user.roleId === 1 ? [{ to: '/carrinho', label: 'Carrinho' }] : []),
        { to: '/meus-pedidos', label: 'Pedidos' },
        { to: '/meus-enderecos', label: 'Endereços' },
        ...(session.user.roleId === 2 ? [{ to: '/admin/produtos', label: 'Area Admin' }] : []),
      ]
    : [
        { to: '/login', label: 'Entrar' },
        { to: '/register', label: 'Criar conta' },
      ]

  return (
    <header className="catalog-topbar">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-8">
        <Link to="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600 transition hover:text-cacao-800">
          ChocoGo
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex flex-wrap items-center justify-end gap-2">
          {session ? <span className="px-2 text-sm font-medium text-cacao-700">Ola, {session.user.nome}</span> : null}
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                link.to === '/admin/produtos'
                  ? 'border-cacao-700 bg-cacao-700 text-white hover:bg-cacao-900'
                  : 'border-cacao-300 text-cacao-700 hover:bg-cacao-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {session && onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
            >
              Sair
            </button>
          ) : null}
        </div>

        {/* Hamburger for mobile */}
        <div className="sm:hidden flex items-center">
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={mobileMenuOpen}
            className="inline-flex items-center justify-center rounded-full border border-cacao-300 p-2 text-cacao-700 hover:bg-cacao-50 focus:outline-none"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {mobileMenuOpen && (
            <div className="absolute right-4 top-14 z-50 min-w-[160px] rounded-xl border border-cacao-200 bg-white shadow-lg">
              {session ? (
                <span className="block px-4 py-2 text-left text-sm font-medium text-cacao-700">Ola, {session.user.nome}</span>
              ) : null}
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-cacao-50 ${
                    link.to === '/admin/produtos' ? 'font-semibold text-cacao-900' : 'text-cacao-700'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {session && onLogout ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onLogout()
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-cacao-700 hover:bg-cacao-50"
                >
                  Sair
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
