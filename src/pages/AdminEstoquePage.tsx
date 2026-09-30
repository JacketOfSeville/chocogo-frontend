import { useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from '../config'
import { createEstoque, listEstoques, listProdutoImagens, listProdutos, type EstoqueResponse, type ProdutoResponse } from '../lib/adminApi'
import { getAdminSession } from '../lib/authStorage'

interface StockDraft {
  quantity: string
  unitCost: string
}

interface ProductStock {
  quantity: number
  minimum: number
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function toAbsoluteImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const root = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${root}${url.startsWith('/') ? '' : '/'}${url}`
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminEstoquePage() {
  const session = getAdminSession()
  const [produtos, setProdutos] = useState<ProdutoResponse[]>([])
  const [estoques, setEstoques] = useState<EstoqueResponse[]>([])
  const [imageByProductId, setImageByProductId] = useState<Record<number, string>>({})
  const [drafts, setDrafts] = useState<Record<number, StockDraft>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const accessToken = session?.accessToken

  const stockByProductId = useMemo(() => {
    const result = new Map<number, ProductStock>()
    const latestEntryIdByProductId = new Map<number, number>()

    for (const entry of estoques) {
      const current = result.get(entry.id_produto) ?? { quantity: 0, minimum: 0 }
      current.quantity += entry.quantidade

      if (entry.id > (latestEntryIdByProductId.get(entry.id_produto) ?? 0)) {
        current.minimum = entry.quantidade_min
        latestEntryIdByProductId.set(entry.id_produto, entry.id)
      }

      result.set(entry.id_produto, current)
    }

    return result
  }, [estoques])

  const orderedProdutos = useMemo(
    () => [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtos],
  )

  const orderedStockLots = useMemo(
    () => [...estoques].sort((a, b) => new Date(b.data_update).getTime() - new Date(a.data_update).getTime()),
    [estoques],
  )

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const token = accessToken
    let mounted = true

    async function loadStock() {
      setIsLoading(true)
      setError('')

      try {
        const [productList, stockList, images] = await Promise.all([
          listProdutos(token),
          listEstoques(token),
          listProdutoImagens(token),
        ])
        if (mounted) {
          setProdutos(productList)
          setEstoques(stockList)

          const imageRecord: Record<number, string> = {}
          const sortedImages = [...images].sort((a, b) => {
            if (a.principal !== b.principal) {
              return a.principal ? -1 : 1
            }

            if (a.ordem !== b.ordem) {
              return a.ordem - b.ordem
            }

            return a.id - b.id
          })

          for (const image of sortedImages) {
            if (!imageRecord[image.id_produto]) {
              imageRecord[image.id_produto] = toAbsoluteImageUrl(image.url)
            }
          }

          setImageByProductId(imageRecord)
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados do estoque.')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadStock()

    return () => {
      mounted = false
    }
  }, [accessToken])

  if (!session || !accessToken) {
    return null
  }

  const token = accessToken

  function getDraft(productId: number): StockDraft {
    return drafts[productId] ?? { quantity: '', unitCost: '' }
  }

  function updateDraft(productId: number, field: keyof StockDraft, value: string) {
    setDrafts((previous) => ({
      ...previous,
      [productId]: { ...getDraft(productId), [field]: value },
    }))
  }

  async function onAddStock(product: ProdutoResponse) {
    const draft = getDraft(product.id)
    const quantity = Number(draft.quantity)
    const unitCost = Number(draft.unitCost)

    if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      setError('Informe uma quantidade inteira maior que zero e um custo unitário válido.')
      return
    }

    setSavingId(product.id)
    setError('')
    setSuccess('')

    try {
      const currentStock = stockByProductId.get(product.id)
      const created = await createEstoque(
        {
          id_produto: product.id,
          quantidade: quantity,
          quantidade_min: currentStock?.minimum ?? 0,
          valor_unitario: unitCost,
        },
        token,
      )

      setEstoques((previous) => [...previous, created])
      setDrafts((previous) => ({ ...previous, [product.id]: { quantity: '', unitCost: '' } }))
      setSuccess(`Entrada de ${quantity} unidade(s) registrada para ${product.nome}.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível registrar a entrada de estoque.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-cacao-200/90 bg-white/85 p-6 shadow-card backdrop-blur-sm">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-cacao-600">Operação</p>
        <h2 className="text-3xl text-cacao-900">Entrada de estoque</h2>
        <p className="mt-1 text-sm text-cacao-700">Registre reposições e confira o saldo projetado de cada produto.</p>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-cacao-200 bg-white shadow-card">
        {isLoading ? (
          <p className="p-5 text-sm text-cacao-700">Carregando produtos e saldos...</p>
        ) : orderedProdutos.length === 0 ? (
          <p className="p-5 text-sm text-cacao-700">Nenhum produto cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full border-collapse text-sm">
              <thead className="bg-cacao-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Produto</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Saldo atual</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Adicionar</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Custo unitário</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Valor da entrada</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Saldo projetado</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Ação</th>
                </tr>
              </thead>
              <tbody>
                {orderedProdutos.map((product) => {
                  const currentQuantity = stockByProductId.get(product.id)?.quantity ?? 0
                  const draft = getDraft(product.id)
                  const addingQuantity = Number(draft.quantity) || 0
                  const unitCost = Number(draft.unitCost) || 0
                  const isValid = Number.isInteger(addingQuantity) && addingQuantity > 0 && unitCost >= 0 && draft.unitCost !== ''

                  return (
                    <tr key={product.id} className="border-t border-cacao-100 align-middle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {imageByProductId[product.id] ? (
                            <img
                              src={imageByProductId[product.id]}
                              alt={product.nome}
                              className="size-12 shrink-0 rounded-md border border-cacao-200 bg-cacao-50 object-cover"
                            />
                          ) : (
                            <div className="size-12 shrink-0 rounded-md border border-cacao-200 bg-cacao-50" aria-hidden="true" />
                          )}
                          <div>
                            <p className="font-semibold text-cacao-900">{product.nome}</p>
                            <p className="mt-0.5 text-xs text-cacao-500">SKU {product.codigo_sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-cacao-900">{currentQuantity}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={draft.quantity}
                          onChange={(event) => updateDraft(product.id, 'quantity', event.target.value)}
                          aria-label={`Quantidade a adicionar para ${product.nome}`}
                          placeholder="0"
                          className="w-28 rounded-lg border border-cacao-200 px-3 py-2 text-right text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative w-36">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-cacao-500">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.unitCost}
                            onChange={(event) => updateDraft(product.id, 'unitCost', event.target.value)}
                            aria-label={`Custo unitário para ${product.nome}`}
                            placeholder="0,00"
                            className="w-full rounded-lg border border-cacao-200 py-2 pl-9 pr-3 text-right text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-cacao-700">{currency.format(addingQuantity * unitCost)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-cacao-900">{currentQuantity + addingQuantity}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void onAddStock(product)}
                          disabled={!isValid || savingId !== null}
                          className="whitespace-nowrap rounded-full bg-cacao-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {savingId === product.id ? 'Salvando...' : 'Registrar entrada'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-cacao-200 bg-white shadow-card">
        <div className="border-b border-cacao-100 px-5 py-4">
          <h3 className="text-xl text-cacao-900">Lotes de estoque</h3>
          <p className="mt-1 text-sm text-cacao-600">Cada reposição registrada aparece como um lote separado.</p>
        </div>
        {orderedStockLots.length === 0 ? (
          <p className="p-5 text-sm text-cacao-700">Ainda não há lotes registrados.</p>
        ) : (
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-[700px] w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-cacao-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Data</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Produto</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Saldo do lote</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Custo unitário</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Valor atual do lote</th>
                </tr>
              </thead>
              <tbody>
                {orderedStockLots.map((entry) => {
                  const productName = produtos.find((product) => product.id === entry.id_produto)?.nome ?? `Produto #${entry.id_produto}`
                  const unitCost = entry.valor_unitario === null ? null : Number(entry.valor_unitario)

                  return (
                    <tr key={entry.id} className="border-t border-cacao-100">
                      <td className="px-4 py-3 text-cacao-700">{formatDate(entry.data_update)}</td>
                      <td className="px-4 py-3 font-medium text-cacao-900">{productName}</td>
                      <td className="px-4 py-3 text-right text-cacao-700">{entry.quantidade}</td>
                      <td className="px-4 py-3 text-right text-cacao-700">{unitCost === null ? 'Não registrado' : currency.format(unitCost)}</td>
                      <td className="px-4 py-3 text-right font-medium text-cacao-900">
                        {unitCost === null ? 'Não registrado' : currency.format(entry.quantidade * unitCost)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}