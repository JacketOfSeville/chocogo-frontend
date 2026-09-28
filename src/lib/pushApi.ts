import { requestApi } from './apiClient'

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: PushSubscriptionKeys
}

export async function getPushPublicKey(): Promise<string> {
  const result = await requestApi<{ publicKey: string }>('/push/public-key')
  return result.publicKey
}

export async function subscribeToPush(input: PushSubscriptionInput, token: string): Promise<void> {
  await requestApi<void>('/push/subscribe', {
    method: 'POST',
    token,
    body: input,
  })
}

export async function unsubscribeFromPush(endpoint: string, token: string): Promise<void> {
  await requestApi<void>('/push/unsubscribe', {
    method: 'POST',
    token,
    body: { endpoint },
  })
}
