import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../config'
import { deleteProduto, listEstoques, listProdutoImagens, listProdutos, updateProduto, type ProdutoResponse } from '../lib/adminApi'
import { getAdminSession } from '../lib/authStorage'

function toAbsoluteImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const root = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${root}${url.startsWith('/') ? '' : '/'}${url}`
}

export function AdminProdutosPage() {
  const session = getAdminSession()
  const [produtos, setProdutos] = useState<ProdutoResponse[]>([])
  const [estoqueByProdutoId, setEstoqueByProdutoId] = useState<Record<number, number>>({})
  const [imageByProdutoId, setImageByProdutoId] = useState<Record<number, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null)
  const [isUpdatingActiveId, setIsUpdatingActiveId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const accessToken = session?.accessToken

  const orderedProdutos = useMemo(
    () => [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtos],
  )

  const filteredProdutos = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR')

    return orderedProdutos.filter((produto) => {
      const matchesSearch = [produto.nome, produto.codigo_sku].some((value) =>
        value.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
      )
      const matchesActive = activeFilter === 'all' || produto.ativo === (activeFilter === 'active')
      const hasStock = (estoqueByProdutoId[produto.id] ?? 0) > 0
      const matchesStock = stockFilter === 'all' || hasStock === (stockFilter === 'available')

      return matchesSearch && matchesActive && matchesStock
    })
  }, [activeFilter, estoqueByProdutoId, orderedProdutos, searchTerm, stockFilter])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const token = accessToken

    let mounted = true

    async function loadProdutos() {
      setIsLoading(true)
      setError('')

      try {
        const [list, estoques, imagens] = await Promise.all([listProdutos(token), listEstoques(token), listProdutoImagens(token)])
        if (!mounted) {
          return
        }

        setProdutos(list)

        const mappedStock = new Map<number, { id: number; quantidade: number }>()
        for (const item of estoques) {
          const previous = mappedStock.get(item.id_produto)

          if (!previous || item.id > previous.id) {
            mappedStock.set(item.id_produto, { id: item.id, quantidade: item.quantidade })
          }
        }

        const stockRecord: Record<number, number> = {}
        for (const [idProduto, stock] of mappedStock.entries()) {
          stockRecord[idProduto] = stock.quantidade
        }

        setEstoqueByProdutoId(stockRecord)

        const imageRecord: Record<number, string> = {}
        const sortedImages = [...imagens].sort((a, b) => {
          if (a.principal !== b.principal) {
            return a.principal ? -1 : 1
          }

          if (a.ordem !== b.ordem) {
            return a.ordem - b.ordem
          }

          return a.id - b.id
        })

        for (const imagem of sortedImages) {
          if (!imageRecord[imagem.id_produto]) {
            imageRecord[imagem.id_produto] = toAbsoluteImageUrl(imagem.url)
          }
        }

        setImageByProdutoId(imageRecord)
      } catch (requestError) {
        if (!mounted) {
          return
        }

        const message = requestError instanceof Error ? requestError.message : 'Falha ao carregar produtos.'
        setError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadProdutos()

    return () => {
      mounted = false
    }
  }, [accessToken])

  async function onDeleteProduto(id: number, nome: string) {
    if (!accessToken) {
      return
    }

    const shouldDelete = window.confirm(`Deseja excluir o produto "${nome}"?`)
    if (!shouldDelete) {
      return
    }

    setError('')
    setIsDeletingId(id)

    try {
      await deleteProduto(id, accessToken)
      setProdutos((previous) => previous.filter((item) => item.id !== id))
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Falha ao excluir produto.'
      setError(message)
    } finally {
      setIsDeletingId(null)
    }
  }

  async function onToggleProdutoAtivo(produto: ProdutoResponse) {
    if (!accessToken || isUpdatingActiveId !== null) {
      return
    }

    setError('')
    setIsUpdatingActiveId(produto.id)

    try {
      const updated = await updateProduto(produto.id, { ativo: !produto.ativo }, accessToken)
      setProdutos((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Falha ao atualizar status do produto.'
      setError(message)
    } finally {
      setIsUpdatingActiveId(null)
    }
  }

  if (!session) {
    return null
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-cacao-200/90 bg-white/80 p-6 shadow-card backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600">Modulo</p>
            <h2 className="text-3xl text-cacao-900">Produtos</h2>
            <p className="mt-1 text-sm text-cacao-700">Gerencie os produtos cadastrados no sistema.</p>
          </div>

          <Link
            to="/admin/produtos/novo"
            className="inline-flex items-center justify-center rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900"
          >
            Novo produto
          </Link>
        </div>
      </header>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-3 rounded-2xl border border-cacao-200 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_190px_190px_auto]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-cacao-700">Buscar produto</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Nome ou SKU"
            className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-sm text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-cacao-700">Status</span>
          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-sm text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-cacao-700">Estoque</span>
          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
            className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-sm text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
          >
            <option value="all">Todos</option>
            <option value="available">Com estoque</option>
            <option value="empty">Sem estoque</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setSearchTerm('')
            setActiveFilter('all')
            setStockFilter('all')
          }}
          disabled={!searchTerm && activeFilter === 'all' && stockFilter === 'all'}
          className="self-end rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Limpar
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-cacao-200 bg-white shadow-card">
        {isLoading ? (
          <p className="p-5 text-sm text-cacao-700">Carregando produtos...</p>
        ) : filteredProdutos.length === 0 ? (
          <p className="p-5 text-sm text-cacao-700">Nenhum produto cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-cacao-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Produto ({filteredProdutos.length})</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">SKU</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Preco</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Estoque</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Ativo</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredProdutos.map((produto) => (
                  <tr key={produto.id} className="border-t border-cacao-100">
                    <td className="px-4 py-3 text-cacao-900">
                      <div className="flex items-center gap-3">
                        {imageByProdutoId[produto.id] ? (
                          <img
                            src={imageByProdutoId[produto.id]}
                            alt={produto.nome}
                            className="size-14 shrink-0 rounded-md border border-cacao-200 bg-cacao-50 object-cover"
                          />
                        ) : (
                          <div
                            className="size-14 shrink-0 rounded-md border border-cacao-200 bg-cacao-50"
                            aria-label="Produto sem imagem"
                          />
                        )}
                        <span className="font-medium">{produto.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-cacao-700">{produto.codigo_sku}</td>
                    <td className="px-4 py-3 text-cacao-700">
                      {Number.parseFloat(produto.preco).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-4 py-3 text-cacao-700">{estoqueByProdutoId[produto.id] ?? 0}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={produto.ativo}
                        aria-label={`${produto.ativo ? 'Inativar' : 'Ativar'} ${produto.nome}`}
                        onClick={() => void onToggleProdutoAtivo(produto)}
                        disabled={isUpdatingActiveId !== null}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${
                          produto.ativo ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                      >
                        <span
                          className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
                            produto.ativo ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="sr-only">{produto.ativo ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/produtos/${produto.id}/editar`}
                          className="rounded-full border border-cacao-300 px-3 py-1.5 font-semibold text-cacao-700 transition hover:bg-cacao-50"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDeleteProduto(produto.id, produto.nome)}
                          disabled={isDeletingId === produto.id || (produto._count?.itens ?? 0) > 0}
                          title={
                            (produto._count?.itens ?? 0) > 0
                              ? 'Este produto faz parte de pedidos e não pode ser excluído.'
                              : `Excluir ${produto.nome}`
                          }
                          aria-label={
                            (produto._count?.itens ?? 0) > 0
                              ? `${produto.nome} faz parte de pedidos e não pode ser excluído`
                              : `Excluir ${produto.nome}`
                          }
                          className="rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeletingId === produto.id ? 'Excluindo...' : (produto._count?.itens ?? 0) > 0 ? 'Em pedido' : 'Excluir'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
