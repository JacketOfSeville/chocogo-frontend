const SW_VERSION = 'v2'
const APP_SHELL_CACHE = `app-shell-${SW_VERSION}`
const STATIC_CACHE = `static-${SW_VERSION}`
const CATALOG_API_CACHE = `catalog-api-${SW_VERSION}`
const IMAGE_CACHE = `images-${SW_VERSION}`

const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
  '/manifest.webmanifest',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/apple-touch-icon.png',
]

const CATALOG_API_PATTERN = /\/api\/(produtos|produto-imagens|produto-categorias|categorias|estoques)\/?$/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![APP_SHELL_CACHE, STATIC_CACHE, CATALOG_API_CACHE, IMAGE_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isCatalogApiRequest(url, request) {
  return request.method === 'GET' && CATALOG_API_PATTERN.test(url.pathname)
}

function isImageRequest(url, request) {
  if (request.destination === 'image') {
    return true
  }

  if (url.pathname.startsWith('/uploads/')) {
    return true
  }

  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url.pathname)
}

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) {
    return false
  }

  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite/') ||
    APP_SHELL_URLS.includes(url.pathname)
  )
}

async function resolveNavigationFallback() {
  const cache = await caches.open(APP_SHELL_CACHE)

  const exactIndex = await cache.match('/index.html')
  if (exactIndex) {
    return exactIndex
  }

  const root = await cache.match('/')
  if (root) {
    return root
  }

  const shellCandidates = await cache.keys()
  const htmlRequest = shellCandidates.find((request) => request.url.endsWith('/index.html') || request.url.endsWith('/'))

  if (htmlRequest) {
    const html = await cache.match(htmlRequest)
    if (html) {
      return html
    }
  }

  return new Response(
    '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChocoGo</title></head><body><p style="font-family:sans-serif;padding:16px">Sem conexao e nenhum cache disponivel ainda.</p></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

  for (const client of clients) {
    client.postMessage(payload)
  }
}

async function networkFirst(request, cacheName, resourceKind = 'generic') {
  const cache = await caches.open(cacheName)

  try {
    const fresh = await fetch(request)
    if (fresh.ok) {
      await cache.put(request, fresh.clone())
    }
    return fresh
  } catch {
    const cached = await cache.match(request)
    if (cached) {
      await notifyClients({
        type: 'SW_CACHE_FALLBACK',
        resourceKind,
        url: request.url,
      })
      return cached
    }

    throw new Error('Network unavailable and no cached response')
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    fetch(request)
      .then((fresh) => {
        if (fresh.ok) {
          void cache.put(request, fresh.clone())
        }
      })
      .catch(() => {
        // ignore background refresh errors
      })

    return cached
  }

  const fresh = await fetch(request)
  if (fresh.ok) {
    await cache.put(request, fresh.clone())
  }

  return fresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, APP_SHELL_CACHE, 'navigation').catch(async () => {
        return resolveNavigationFallback()
      }),
    )
    return
  }

  if (isCatalogApiRequest(url, request)) {
    event.respondWith(networkFirst(request, CATALOG_API_CACHE, 'catalog'))
    return
  }

  if (isImageRequest(url, request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  if (url.origin === self.location.origin && ['script', 'style', 'font', 'worker'].includes(request.destination)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
  }
})
