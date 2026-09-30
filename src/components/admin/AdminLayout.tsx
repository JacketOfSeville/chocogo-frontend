import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAdminSession, getAdminSession } from '../../lib/authStorage'
import { usePushNotifications } from '../../hooks/usePushNotifications'

function sidebarLinkClass(isActive: boolean): string {
  return [
    'block rounded-xl px-3 py-2 text-sm font-semibold transition',
    isActive ? 'bg-cacao-700 text-white' : 'text-cacao-700 hover:bg-cacao-100',
  ].join(' ')
}

export function AdminLayout() {
  const navigate = useNavigate()
  const session = getAdminSession()
  const push = usePushNotifications(session?.accessToken)

  function onLogout() {
    clearAdminSession()
    navigate('/admin/login', { replace: true })
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cacao-600">ChocoGo Admin</p>
          <h1 className="mt-2 text-2xl text-cacao-900">Módulos</h1>
        </div>

        <nav className="mt-6">
          <NavLink to="/admin/produtos" className={({ isActive }) => sidebarLinkClass(isActive)}>
            Produtos
          </NavLink>
          <NavLink to="/admin/estoque" className={({ isActive }) => sidebarLinkClass(isActive)}>
            Estoque
          </NavLink>
          <NavLink to="/admin/categorias" className={({ isActive }) => sidebarLinkClass(isActive)}>
            Categorias
          </NavLink>
          <NavLink to="/admin/pedidos" className={({ isActive }) => sidebarLinkClass(isActive)}>
            Pedidos
          </NavLink>
          <NavLink to="/admin/relatorios" className={({ isActive }) => sidebarLinkClass(isActive)}>
            Relatórios
          </NavLink>
          <NavLink to="/admin/usuarios" className={({ isActive }) => sidebarLinkClass(isActive)}>
            Usuários
          </NavLink>
        </nav>

        <div className="mt-auto space-y-2 pt-6">
          {push.isSupported ? (
            <button
              type="button"
              onClick={() => (push.isSubscribed ? push.unsubscribe() : push.subscribe())}
              disabled={push.isLoading}
              className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {push.isLoading ? 'Aguarde...' : push.isSubscribed ? 'Desativar notificações' : 'Ativar notificações de novos pedidos'}
            </button>
          ) : null}
          {push.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{push.error}</p> : null}
          <NavLink to="/" className="block rounded-xl border border-cacao-200 px-3 py-2 text-sm font-semibold text-cacao-700 text-center hover:bg-cacao-50">
            Ver catálogo
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
