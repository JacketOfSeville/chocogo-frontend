import { useEffect, useState } from 'react'

const TOAST_DURATION_MS = 4500

interface CacheFallbackMessage {
  type: 'SW_CACHE_FALLBACK'
  resourceKind?: string
}

function isCacheFallbackMessage(value: unknown): value is CacheFallbackMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as { type?: unknown }
  return payload.type === 'SW_CACHE_FALLBACK'
}

function getToastMessage(kind?: string): string {
  if (kind === 'catalog') {
    return 'Sem conexão. Exibindo dados do catálogo salvos em cache.'
  }

  return 'Sem conexão. Exibindo conteúdo salvo em cache.'
}

export function OfflineStatusToast() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [toastMessage, setToastMessage] = useState('')
  const [isToastVisible, setIsToastVisible] = useState(false)

  useEffect(() => {
    function onOnline() {
      setIsOnline(true)
      setIsToastVisible(false)
    }

    function onOffline() {
      setIsOnline(false)
      setToastMessage('Você está offline. Tentando usar dados em cache.')
      setIsToastVisible(true)
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    let timeoutId: number | null = null

    function onServiceWorkerMessage(event: MessageEvent<unknown>) {
      if (!isCacheFallbackMessage(event.data)) {
        return
      }

      setToastMessage(getToastMessage(event.data.resourceKind))
      setIsToastVisible(true)

      timeoutId = window.setTimeout(() => {
        if (navigator.onLine) {
          setIsToastVisible(false)
        }
      }, TOAST_DURATION_MS)
    }

    navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage)

    return () => {
      navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage)
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  if (!isToastVisible && isOnline) {
    return null
  }

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[100] flex justify-center px-4 py-3">
      <div
        className={[
          'max-w-xl rounded-2xl border px-4 py-3 text-sm shadow-card backdrop-blur-md',
          isOnline ? 'border-sky-200 bg-sky-50/95 text-sky-900' : 'border-amber-200 bg-amber-50/95 text-amber-900',
        ].join(' ')}
      >
        <strong className="font-semibold">Modo offline:</strong> {toastMessage}
      </div>
    </div>
  )
}
