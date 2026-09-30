import { useCallback, useEffect, useState } from 'react'
import { getPushPublicKey, subscribeToPush, unsubscribeFromPush } from '../lib/pushApi'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function saveSubscriptionForUser(subscription: PushSubscription, accessToken: string): Promise<void> {
  const keys = subscription.toJSON().keys

  if (!keys?.p256dh || !keys.auth) {
    throw new Error('Falha ao gerar credenciais de notificacao.')
  }

  await subscribeToPush(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
    },
    accessToken,
  )
}

interface UsePushNotificationsResult {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  error: string
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function usePushNotifications(accessToken?: string): UsePushNotificationsResult {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(() => isPushSupported())
  const [error, setError] = useState('')

  const isSupported = isPushSupported()

  useEffect(() => {
    if (!isSupported) {
      return
    }

    let mounted = true

    async function checkSubscription() {
      try {
        const registration = await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()

        if (existing && accessToken) {
          await saveSubscriptionForUser(existing, accessToken)
        }

        if (mounted) {
          setIsSubscribed(Boolean(existing))
        }
      } catch {
        if (mounted) {
          setIsSubscribed(false)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void checkSubscription()

    return () => {
      mounted = false
    }
  }, [accessToken, isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || !accessToken) {
      setError('Notificacoes push nao sao suportadas neste navegador.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        throw new Error('Permissao de notificacao negada.')
      }

      const publicKey = await getPushPublicKey()
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })

      await saveSubscriptionForUser(subscription, accessToken)

      setIsSubscribed(true)
    } catch (subscribeError) {
      const message = subscribeError instanceof Error ? subscribeError.message : 'Nao foi possivel ativar as notificacoes.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, isSupported])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !accessToken) {
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint, accessToken)
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
    } catch (unsubscribeError) {
      const message = unsubscribeError instanceof Error ? unsubscribeError.message : 'Nao foi possivel desativar as notificacoes.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, isSupported])

  return { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe }
}
