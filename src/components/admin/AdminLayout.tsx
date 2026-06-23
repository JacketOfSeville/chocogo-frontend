import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAdminSession } from '../../lib/authStorage'

function sidebarLinkClass(isActive: boolean): string {
  return [
    'block rounded-xl px-3 py-2 text-sm font-semibold transition',
    isActive ? 'bg-cacao-700 text-white' : 'text-cacao-700 hover:bg-cacao-100',
  ].join(' ')
}

export function AdminLayout() {
  const navigate = useNavigate()

  function onLogout() {
    clearAdminSession()
    navigate('/admin/login', { replace: true })
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cacao-600">ChocoGo Admin</p>
          <h1 className="mt-2 text-2xl text-cacao-900">Modulos</h1>
        </div>

        <nav className="mt-6">
          <NavLink to="/admin/produtos" className={({ isActive }) => sidebarLinkClass(isActive)}>
            Produtos
          </NavLink>
          <NavLink to="/admin/pedidos" className={({ isActive }) => sidebarLinkClass(isActive)}>
            Pedidos
          </NavLink>
        </nav>

        <div className="mt-auto space-y-2 pt-6">
          <NavLink to="/" className="block rounded-xl border border-cacao-200 px-3 py-2 text-sm font-semibold text-cacao-700 hover:bg-cacao-50">
            Ver catalogo
          </NavLink>
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-xl bg-cacao-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900"
          >
            Sair
          </button>
        </div>
      </aside>

      <section className="admin-content">
        <Outlet />
      </section>
    </main>
  )
}
