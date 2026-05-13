import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAdminSession } from '../../lib/authStorage'

interface RequireAdminProps {
  children: ReactNode
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation()
  const session = getAdminSession()

  if (!session || session.user.roleId !== 2) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
