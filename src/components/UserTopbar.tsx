import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AuthSession } from '../lib/authStorage'

interface UserTopbarProps {
  session: AuthSession
  onLogout: () => void
}

export function UserTopbar({ session, onLogout }: UserTopbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { to: '/', label: 'Catalogo' },
    { to: '/carrinho', label: 'Carrinho' },
    { to: '/meus-pedidos', label: 'Pedidos' },
    { to: '/meus-enderecos', label: 'Endereços' },
  ]

  return (
    <header className="catalog-topbar">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-8">
        <Link to="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600 transition hover:text-cacao-800">
          ChocoGo
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex flex-wrap items-center justify-end gap-2">
          <span className="px-2 text-sm font-medium text-cacao-700">Ola, {session.user.nome}</span>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="inline-flex items-center justify-center rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
          >
            Sair
          </button>
        </div>

        {/* Hamburger for mobile */}
        <div className="sm:hidden flex items-center">
          <button
            type="button"
            aria-label="Abrir menu"
            className="inline-flex items-center justify-center rounded-full border border-cacao-300 p-2 text-cacao-700 hover:bg-cacao-50 focus:outline-none"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {mobileMenuOpen && (
            <div className="absolute right-4 top-14 z-50 min-w-[160px] rounded-xl border border-cacao-200 bg-white shadow-lg">
              <button type="button" className="block w-full px-4 py-2 text-left text-sm text-cacao-700" disabled>
                Ola, {session.user.nome}
              </button>
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block w-full px-4 py-2 text-left text-sm text-cacao-700 hover:bg-cacao-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
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
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
