import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CatalogGrid } from '../components/catalog/CatalogGrid'
import { CatalogEmptyState, CatalogErrorState, CatalogLoadingState } from '../components/catalog/CatalogStates'
import { getCatalogProducts, type CatalogProduct } from '../lib/catalogService'

type LoadStatus = 'loading' | 'success' | 'empty' | 'error'

export function CatalogPage() {
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [nameFilter, setNameFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [error, setError] = useState('')

  const normalizedNameFilter = nameFilter.trim().toLocaleLowerCase('pt-BR')

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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600">ChocoGo</p>
          <Link
            to="/admin/login"
            className="inline-flex w-fit items-center justify-center rounded-full bg-cacao-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900"
          >
            Area Admin
          </Link>
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
          <CatalogGrid products={filteredProducts} />
        ) : (
          <section className="rounded-2xl border border-cacao-200 bg-white p-6 text-center shadow-card">
            <h2 className="mb-2 text-2xl text-cacao-900">Nenhum resultado para os filtros</h2>
            <p className="text-cacao-700">Ajuste o nome ou a categoria para encontrar os produtos desejados.</p>
          </section>
        ))}
    </main>
  )
}
