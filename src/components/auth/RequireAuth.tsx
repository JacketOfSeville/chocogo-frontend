import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getSession } from '../../lib/authStorage'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const session = getSession()

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
