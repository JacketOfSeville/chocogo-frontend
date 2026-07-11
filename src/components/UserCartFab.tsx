import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getSession } from '../lib/authStorage'
import { CART_UPDATED_EVENT, getCartItemCount } from '../lib/cartApi'

function shouldHideCartFab(pathname: string): boolean {
  if (pathname.startsWith('/carrinho')) {
    return true
  }

  if (pathname.startsWith('/meus-pedidos')) {
    return true
  }

  if (pathname.startsWith('/admin')) {
    return true
  }

  return false
}

export function UserCartFab() {
  const location = useLocation()
  const session = getSession()
  const [itemCount, setItemCount] = useState(0)

  const accessToken = session?.accessToken

  useEffect(() => {
    if (!session || session.user.roleId !== 1 || !accessToken) {
      return
    }

    const token = accessToken

    let mounted = true

    async function refreshCount() {
      try {
        const total = await getCartItemCount(token)
        if (mounted) {
          setItemCount(total)
        }
      } catch {
        if (mounted) {
          setItemCount(0)
        }
      }
    }

    const onVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void refreshCount()
      }
    }

    void refreshCount()

    window.addEventListener(CART_UPDATED_EVENT, refreshCount)
    window.addEventListener('focus', refreshCount)
    document.addEventListener('visibilitychange', onVisibilityRefresh)

    return () => {
      mounted = false
      window.removeEventListener(CART_UPDATED_EVENT, refreshCount)
      window.removeEventListener('focus', refreshCount)
      document.removeEventListener('visibilitychange', onVisibilityRefresh)
    }
  }, [accessToken, location.pathname, session])

  if (!session || session.user.roleId !== 1) {
    return null
  }

  if (shouldHideCartFab(location.pathname)) {
    return null
  }

  return (
    <Link
      to="/carrinho"
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-cacao-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-cacao-900"
      aria-label="Ir para o carrinho"
    >
      <span aria-hidden="true">🛒</span>
      Carrinho ({itemCount})
    </Link>
  )
}
