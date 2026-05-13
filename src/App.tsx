import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/admin/AdminLayout'
import { RequireAdmin } from './components/admin/RequireAdmin'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminProdutoCreatePage } from './pages/AdminProdutoCreatePage'
import { AdminProdutoEditPage } from './pages/AdminProdutoEditPage'
import { AdminProdutosPage } from './pages/AdminProdutosPage'
import { CatalogPage } from './pages/CatalogPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
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
        <Route path="produtos/novo" element={<AdminProdutoCreatePage />} />
        <Route path="produtos/:id/editar" element={<AdminProdutoEditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
