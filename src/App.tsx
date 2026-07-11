import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/admin/AdminLayout'
import { RequireAdmin } from './components/admin/RequireAdmin'
import { RequireAuth } from './components/auth/RequireAuth'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminProdutoCreatePage } from './pages/AdminProdutoCreatePage'
import { AdminProdutoEditPage } from './pages/AdminProdutoEditPage'
import { AdminProdutosPage } from './pages/AdminProdutosPage'
import { AdminPedidoManagePage } from './pages/AdminPedidoManagePage'
import { AdminPedidosPage } from './pages/AdminPedidosPage'
import { AdminCategoriasPage } from './pages/AdminCategoriasPage'
import { AdminUsuarioDetailPage } from './pages/AdminUsuarioDetailPage'
import { AdminUsuariosPage } from './pages/AdminUsuariosPage'
import { CatalogPage } from './pages/CatalogPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { OfflineStatusToast } from './components/OfflineStatusToast'
import { UserCartFab } from './components/UserCartFab'
import { UserEnderecoCreatePage } from './pages/UserEnderecoCreatePage'
import { UserEnderecoEditPage } from './pages/UserEnderecoEditPage'
import { UserCarrinhoPage } from './pages/UserCarrinhoPage'
import { UserEnderecosPage } from './pages/UserEnderecosPage'
import { UserPedidosPage } from './pages/UserPedidosPage'
import { UserPedidoDetailPage } from './pages/UserPedidoDetailPage'
import { UserProfilePage } from './pages/UserProfilePage'

function App() {
  return (
    <>
      <OfflineStatusToast />
      <UserCartFab />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/meus-enderecos"
          element={
            <RequireAuth>
              <UserEnderecosPage />
            </RequireAuth>
          }
        />
        <Route
          path="/carrinho"
          element={
            <RequireAuth>
              <UserCarrinhoPage />
            </RequireAuth>
          }
        />
        <Route
          path="/meus-enderecos/novo"
          element={
            <RequireAuth>
              <UserEnderecoCreatePage />
            </RequireAuth>
          }
        />
        <Route
          path="/meus-enderecos/:id/editar"
          element={
            <RequireAuth>
              <UserEnderecoEditPage />
            </RequireAuth>
          }
        />
        <Route
          path="/meus-pedidos"
          element={
            <RequireAuth>
              <UserPedidosPage />
            </RequireAuth>
          }
        />
        <Route
          path="/meus-pedidos/:id"
          element={
            <RequireAuth>
              <UserPedidoDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/minha-conta"
          element={
            <RequireAuth>
              <UserProfilePage />
            </RequireAuth>
          }
        />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="produtos" replace />} />
          <Route path="produtos" element={<AdminProdutosPage />} />
          <Route path="categorias" element={<AdminCategoriasPage />} />
          <Route path="produtos/novo" element={<AdminProdutoCreatePage />} />
          <Route path="produtos/:id/editar" element={<AdminProdutoEditPage />} />
          <Route path="pedidos" element={<AdminPedidosPage />} />
          <Route path="pedidos/:id" element={<AdminPedidoManagePage />} />
          <Route path="usuarios" element={<AdminUsuariosPage />} />
          <Route path="usuarios/:id" element={<AdminUsuarioDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
