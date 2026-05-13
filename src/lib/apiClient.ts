import { API_BASE_URL } from '../config'

interface RequestApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  token?: string
  headers?: HeadersInit
}

export async function requestApi<T>(path: string, options: RequestApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  let requestBody: BodyInit | undefined

  if (options.body instanceof FormData) {
    requestBody = options.body
  } else if (options.body) {
    headers.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(options.body)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: requestBody,
  })

  if (!response.ok) {
    let message = `Erro ${response.status}`

    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) {
        message = payload.error
      }
    } catch {
      // fallback generico
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

export async function fetchApi<T>(path: string): Promise<T> {
  return requestApi<T>(path)
}
