import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteProduto, listEstoques, listProdutos, type ProdutoResponse } from '../lib/adminApi'
import { getAdminSession } from '../lib/authStorage'

export function AdminProdutosPage() {
  const session = getAdminSession()
  const [produtos, setProdutos] = useState<ProdutoResponse[]>([])
  const [estoqueByProdutoId, setEstoqueByProdutoId] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const accessToken = session?.accessToken

  const orderedProdutos = useMemo(
    () => [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtos],
  )

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
        const [list, estoques] = await Promise.all([listProdutos(token), listEstoques(token)])
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

      <section className="overflow-hidden rounded-2xl border border-cacao-200 bg-white shadow-card">
        {isLoading ? (
          <p className="p-5 text-sm text-cacao-700">Carregando produtos...</p>
        ) : orderedProdutos.length === 0 ? (
          <p className="p-5 text-sm text-cacao-700">Nenhum produto cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-cacao-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">SKU</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Preco</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Estoque</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Ativo</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {orderedProdutos.map((produto) => (
                  <tr key={produto.id} className="border-t border-cacao-100">
                    <td className="px-4 py-3 text-cacao-900">{produto.nome}</td>
                    <td className="px-4 py-3 text-cacao-700">{produto.codigo_sku}</td>
                    <td className="px-4 py-3 text-cacao-700">
                      {Number.parseFloat(produto.preco).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-4 py-3 text-cacao-700">{estoqueByProdutoId[produto.id] ?? 0}</td>
                    <td className="px-4 py-3 text-cacao-700">{produto.ativo ? 'Sim' : 'Nao'}</td>
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
                          disabled={isDeletingId === produto.id}
                          className="rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeletingId === produto.id ? 'Excluindo...' : 'Excluir'}
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
