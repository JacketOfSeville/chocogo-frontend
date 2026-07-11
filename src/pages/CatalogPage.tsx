import { useEffect, useMemo, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'
import { CatalogGrid } from '../components/catalog/CatalogGrid'
import { CatalogEmptyState, CatalogErrorState, CatalogLoadingState } from '../components/catalog/CatalogStates'
import { getCatalogProducts, type CatalogProduct } from '../lib/catalogService'
import { clearSession, getSession } from '../lib/authStorage'
import { addProdutoAoCarrinho } from '../lib/cartApi'

type LoadStatus = 'loading' | 'success' | 'empty' | 'error'

export function CatalogPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const [session, setSession] = useState(() => getSession())
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [nameFilter, setNameFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null)
  const [modalQuantity, setModalQuantity] = useState(1)
  const [modalError, setModalError] = useState('')
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [error, setError] = useState('')

  const normalizedNameFilter = nameFilter.trim().toLocaleLowerCase('pt-BR')
  const isAdmin = session?.user.roleId === 2
  const accessToken = session?.accessToken

  function onLogout() {
    clearSession()
    setSession(null)
  }

  function openProductModal(product: CatalogProduct) {
    setSelectedProduct(product)
    setModalQuantity(1)
    setModalError('')
  }

  function closeProductModal() {
    setSelectedProduct(null)
    setModalQuantity(1)
    setModalError('')
    setIsAddingToCart(false)
  }

  async function onAddToCart() {
    if (!selectedProduct) {
      return
    }

    if (!accessToken) {
      navigate('/login', { state: { from: '/' } })
      closeProductModal()
      return
    }

    setIsAddingToCart(true)
    setModalError('')

    try {
      await addProdutoAoCarrinho(selectedProduct.id, modalQuantity, accessToken)
      closeProductModal()
    } catch (addError) {
      const message = addError instanceof Error ? addError.message : 'Nao foi possivel adicionar ao carrinho.'
      setModalError(message)
      setIsAddingToCart(false)
    }
  }

  const categories = useMemo(() => {
    const names = new Set<string>()

    for (const product of products) {
      for (const category of product.categories) {
        names.add(category)
      }
    }

    return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesName = normalizedNameFilter.length === 0 || product.nome.toLocaleLowerCase('pt-BR').includes(normalizedNameFilter)
      const matchesCategory = categoryFilter === 'all' || product.categories.includes(categoryFilter)

      return matchesName && matchesCategory
    })
  }, [categoryFilter, normalizedNameFilter, products])

  async function loadCatalog(options?: { resetState?: boolean }) {
    if (options?.resetState ?? true) {
      setStatus('loading')
      setError('')
    }

    try {
      const result = await getCatalogProducts()
      setProducts(result)

      if (result.length === 0) {
        setStatus('empty')
        return
      }

      setStatus('success')
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o catalogo.'
      setError(message)
      setStatus('error')
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadInitialCatalog() {
      try {
        const result = await getCatalogProducts()

        if (!mounted) {
          return
        }

        setProducts(result)

        if (result.length === 0) {
          setStatus('empty')
          return
        }

        setStatus('success')
      } catch (loadError) {
        if (!mounted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o catalogo.'
        setError(message)
        setStatus('error')
      }
    }

    void loadInitialCatalog()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="catalog-shell">
      <header className="catalog-topbar">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-8">
          <Link to="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600 transition hover:text-cacao-800">
            ChocoGo
          </Link>

          {/* Desktop */}
          <div className="hidden sm:flex flex-wrap items-center justify-end gap-2">
            {session ? (
              <>
                <span className="px-2 text-sm font-medium text-cacao-700">Ola, {session.user.nome}</span>
                <Link
                  to="/minha-conta"
                  className="inline-flex items-center justify-center rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
                >
                  Minha conta
                </Link>
                <Link
                  to="/meus-enderecos"
                  className="inline-flex items-center justify-center rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
                >
                  Meus enderecos
                </Link>
                <Link
                  to="/meus-pedidos"
                  className="inline-flex items-center justify-center rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
                >
                  Meus pedidos
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center justify-center rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-full bg-cacao-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900"
                >
                  Register
                </Link>
              </>
            )}

            {isAdmin ? (
              <Link
                to="/admin/produtos"
                className="inline-flex items-center justify-center rounded-full bg-cacao-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900"
              >
                Area Admin
              </Link>
            ) : null}
          </div>

          {/* Hamburger mobile */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              aria-label="Abrir menu"
              className="inline-flex items-center justify-center rounded-full border border-cacao-300 p-2 text-cacao-700 hover:bg-cacao-50 focus:outline-none"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Dropdown menu */}
            {mobileMenuOpen && (
              <div className="absolute right-4 top-14 z-50 min-w-[160px] rounded-xl border border-cacao-200 bg-white shadow-lg">
                {session ? (
                  <>
                    <button
                      type="button"
                      className="block w-full px-4 py-2 text-left text-sm text-cacao-700 hover:bg-cacao-50"
                      disabled
                    >
                      Ola, {session.user.nome}
                    </button>
                    <Link
                      to="/minha-conta"
                      className="block w-full px-4 py-2 text-left text-sm text-cacao-700 hover:bg-cacao-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Minha conta
                    </Link>
                    <Link
                      to="/meus-enderecos"
                      className="block w-full px-4 py-2 text-left text-sm text-cacao-700 hover:bg-cacao-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Meus enderecos
                    </Link>
                    <Link
                      to="/meus-pedidos"
                      className="block w-full px-4 py-2 text-left text-sm text-cacao-700 hover:bg-cacao-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Meus pedidos
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        onLogout()
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-cacao-700 hover:bg-cacao-50"
                    >
                      Sair
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="block w-full px-4 py-2 text-left text-sm text-cacao-700 hover:bg-cacao-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      className="block w-full px-4 py-2 text-left text-sm text-white bg-cacao-700 hover:bg-cacao-900"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </>
                )}
                {isAdmin ? (
                  <Link
                    to="/admin/produtos"
                    className="block w-full px-4 py-2 text-left text-sm text-white bg-cacao-700 hover:bg-cacao-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Area Admin
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="catalog-header">
        <h1 className="mb-3 text-3xl text-cacao-900 sm:text-4xl">Catalogo Principal</h1>
        <p className="max-w-2xl text-sm text-cacao-700 sm:text-base">
          Explore os produtos disponiveis.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-cacao-700">Procurar por nome</span>
            <input
              type="text"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              placeholder="Ex.: Trufa, Cookie..."
              className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-cacao-700">Filtrar por categoria</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
            >
              <option value="all">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {status === 'loading' && <CatalogLoadingState />}
      {status === 'error' && <CatalogErrorState error={error} onRetry={loadCatalog} />}
      {status === 'empty' && <CatalogEmptyState />}
      {status === 'success' &&
        (filteredProducts.length > 0 ? (
          <CatalogGrid products={filteredProducts} onProductSelect={openProductModal} />
        ) : (
          <section className="rounded-2xl border border-cacao-200 bg-white p-6 text-center shadow-card">
            <h2 className="mb-2 text-2xl text-cacao-900">Nenhum resultado para os filtros</h2>
            <p className="text-cacao-700">Ajuste o nome ou a categoria para encontrar os produtos desejados.</p>
          </section>
        ))}

      {selectedProduct ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-cacao-900/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-3xl text-cacao-900">{selectedProduct.nome}</h2>

            <div className="mb-4 overflow-hidden rounded-xl bg-cacao-50">
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.nome} className="h-60 w-full object-cover" />
              ) : (
                <div className="flex h-60 items-center justify-center px-4 text-center text-sm font-medium text-cacao-700">Imagem indisponivel</div>
              )}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {selectedProduct.categories.length > 0 ? (
                selectedProduct.categories.map((category) => (
                  <span key={category} className="rounded-full bg-cacao-50 px-2.5 py-1 text-xs font-medium text-cacao-700">
                    {category}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-cacao-50 px-2.5 py-1 text-xs font-medium text-cacao-700">Sem categoria</span>
              )}
            </div>

            <p className="mb-4 text-lg font-semibold text-cacao-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProduct.preco)}
            </p>

            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium text-cacao-700">Quantidade</span>
              <input
                type="number"
                min={1}
                max={selectedProduct.estoque ?? 1}
                value={modalQuantity}
                onChange={(event) => setModalQuantity(Math.max(1, Number.parseInt(event.target.value || '1', 10) || 1))}
                className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              />
            </label>

            {modalError ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{modalError}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onAddToCart}
                disabled={isAddingToCart}
                className="rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddingToCart ? 'Adicionando...' : 'Adicionar ao carrinho'}
              </button>

              <button
                type="button"
                onClick={closeProductModal}
                className="rounded-full border border-cacao-300 px-5 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
