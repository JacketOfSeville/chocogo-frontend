import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createEstoque,
  createProdutoCategoria,
  createProdutoImagemUrl,
  deleteProdutoCategoria,
  deleteProdutoImagem,
  getProdutoById,
  listCategorias,
  listEstoques,
  listProdutoCategorias,
  listProdutoImagens,
  updateEstoque,
  updateProduto,
  uploadProdutoImagem,
  type CreateEstoqueInput,
  type CreateProdutoInput,
  type EstoqueResponse,
  type ProdutoImagemResponse,
  type ProdutoResponse,
} from '../lib/adminApi'
import { API_BASE_URL } from '../config'
import { getAdminSession } from '../lib/authStorage'
import type { Categoria, ProdutoCategoria } from '../types/api'

interface ImageUrlInput {
  id: number
  url: string
  ordem: number
  principal: boolean
}

const initialProduto: CreateProdutoInput = {
  nome: '',
  codigo_sku: '',
  peso_gramas: 0,
  preco: 0,
  ativo: true,
}

const initialEstoque: CreateEstoqueInput = {
  quantidade: 0,
  quantidade_min: 0,
}

function toAbsoluteImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const root = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${root}${url.startsWith('/') ? '' : '/'}${url}`
}

function pickProdutoEstoque(estoques: EstoqueResponse[], idProduto: number): EstoqueResponse | null {
  const related = estoques.filter((item) => item.id_produto === idProduto)
  if (related.length === 0) {
    return null
  }

  return [...related].sort((a, b) => b.id - a.id)[0]
}

export function AdminProdutoEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const session = getAdminSession()

  const [produto, setProduto] = useState<CreateProdutoInput>(initialProduto)
  const [estoque, setEstoque] = useState<CreateEstoqueInput>(initialEstoque)
  const [estoqueId, setEstoqueId] = useState<number | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtoCategoriaRelations, setProdutoCategoriaRelations] = useState<ProdutoCategoria[]>([])
  const [selectedCategoriaIds, setSelectedCategoriaIds] = useState<number[]>([])
  const [existingImages, setExistingImages] = useState<ProdutoImagemResponse[]>([])
  const [imageUrls, setImageUrls] = useState<ImageUrlInput[]>([{ id: 1, url: '', ordem: 0, principal: false }])
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadStartOrder, setUploadStartOrder] = useState(0)
  const [uploadFirstAsPrincipal, setUploadFirstAsPrincipal] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingImageId, setIsDeletingImageId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const accessToken = session?.accessToken
  const produtoId = Number(id)

  const categoryRelationByCategoriaId = useMemo(() => {
    const map = new Map<number, ProdutoCategoria>()

    for (const relation of produtoCategoriaRelations) {
      if (relation.id_produto === produtoId) {
        map.set(relation.id_categoria, relation)
      }
    }

    return map
  }, [produtoCategoriaRelations, produtoId])

  function applyLoadedData(
    produtoData: ProdutoResponse,
    estoques: EstoqueResponse[],
    imagens: ProdutoImagemResponse[],
    categoriaList: Categoria[],
    produtoCategorias: ProdutoCategoria[],
  ) {
    setProduto({
      nome: produtoData.nome,
      codigo_sku: produtoData.codigo_sku,
      peso_gramas: produtoData.peso_gramas,
      preco: Number.parseFloat(produtoData.preco),
      ativo: produtoData.ativo,
    })

    const currentEstoque = pickProdutoEstoque(estoques, produtoData.id)
    if (currentEstoque) {
      setEstoqueId(currentEstoque.id)
      setEstoque({
        quantidade: currentEstoque.quantidade,
        quantidade_min: currentEstoque.quantidade_min,
      })
    } else {
      setEstoqueId(null)
      setEstoque(initialEstoque)
    }

    setCategorias(categoriaList)

    const currentProdutoCategorias = produtoCategorias.filter((item) => item.id_produto === produtoData.id)
    setProdutoCategoriaRelations(currentProdutoCategorias)
    setSelectedCategoriaIds(currentProdutoCategorias.map((item) => item.id_categoria))

    const currentImages = imagens
      .filter((item) => item.id_produto === produtoData.id)
      .sort((a, b) => {
        if (a.principal !== b.principal) {
          return a.principal ? -1 : 1
        }

        if (a.ordem !== b.ordem) {
          return a.ordem - b.ordem
        }

        return a.id - b.id
      })

    setExistingImages(currentImages)
    setUploadStartOrder(currentImages.length)
  }

  useEffect(() => {
    if (!accessToken || !Number.isInteger(produtoId) || produtoId <= 0) {
      return
    }

    const token = accessToken
    let mounted = true

    async function loadAllData() {
      setIsLoading(true)
      setError('')

      try {
        const [produtoData, estoques, imagens, categoriaList, produtoCategorias] = await Promise.all([
          getProdutoById(produtoId, token),
          listEstoques(token),
          listProdutoImagens(token),
          listCategorias(token),
          listProdutoCategorias(token),
        ])

        if (!mounted) {
          return
        }

        applyLoadedData(produtoData, estoques, imagens, categoriaList, produtoCategorias)
      } catch (requestError) {
        if (!mounted) {
          return
        }

        const message = requestError instanceof Error ? requestError.message : 'Falha ao carregar dados do produto.'
        setError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAllData()

    return () => {
      mounted = false
    }
  }, [accessToken, produtoId])

  function addImageUrlRow() {
    setImageUrls((previous) => {
      const nextId = previous.length === 0 ? 1 : Math.max(...previous.map((item) => item.id)) + 1
      const nextOrder = existingImages.length + previous.length
      return [...previous, { id: nextId, url: '', ordem: nextOrder, principal: false }]
    })
  }

  function removeImageUrlRow(idToRemove: number) {
    setImageUrls((previous) => previous.filter((item) => item.id !== idToRemove))
  }

  function onImageUrlChange(idToChange: number, field: 'url' | 'ordem' | 'principal', value: string | number | boolean) {
    setImageUrls((previous) =>
      previous.map((item) => {
        if (item.id !== idToChange) {
          return item
        }

        if (field === 'url') {
          return { ...item, url: String(value) }
        }

        if (field === 'ordem') {
          return { ...item, ordem: Number(value) }
        }

        return { ...item, principal: Boolean(value) }
      }),
    )
  }

  function onUploadFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    setUploadFiles(files)
  }

  function removeUploadFile(indexToRemove: number) {
    setUploadFiles((previous) => previous.filter((_, index) => index !== indexToRemove))
  }

  function toggleCategoria(idCategoria: number) {
    setSelectedCategoriaIds((previous) => {
      if (previous.includes(idCategoria)) {
        return previous.filter((item) => item !== idCategoria)
      }

      return [...previous, idCategoria]
    })
  }

  async function onDeleteExistingImage(imageId: number) {
    if (!accessToken) {
      return
    }

    const shouldDelete = window.confirm('Deseja remover esta imagem?')
    if (!shouldDelete) {
      return
    }

    setError('')
    setSuccess('')
    setIsDeletingImageId(imageId)

    try {
      await deleteProdutoImagem(imageId, accessToken)
      setExistingImages((previous) => previous.filter((item) => item.id !== imageId))
      setSuccess('Imagem removida com sucesso.')
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Falha ao remover imagem.'
      setError(message)
    } finally {
      setIsDeletingImageId(null)
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!accessToken || !Number.isInteger(produtoId) || produtoId <= 0) {
      setError('Produto invalido.')
      return
    }

    const token = accessToken

    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const updated = await updateProduto(produtoId, produto, token)

      if (estoqueId) {
        await updateEstoque(
          estoqueId,
          {
            quantidade: estoque.quantidade,
            quantidade_min: estoque.quantidade_min,
          },
          token,
        )
      } else {
        const createdEstoque = await createEstoque(
          {
            id_produto: produtoId,
            quantidade: estoque.quantidade,
            quantidade_min: estoque.quantidade_min,
          },
          token,
        )

        setEstoqueId(createdEstoque.id)
      }

      const previousCategoriaIds = new Set(categoryRelationByCategoriaId.keys())
      const selectedCategoriaIdsSet = new Set(selectedCategoriaIds)

      const categoriaIdsToAdd = selectedCategoriaIds.filter((idCategoria) => !previousCategoriaIds.has(idCategoria))
      const categoriaIdsToRemove = [...previousCategoriaIds].filter((idCategoria) => !selectedCategoriaIdsSet.has(idCategoria))

      for (const categoriaId of categoriaIdsToAdd) {
        await createProdutoCategoria(
          {
            id_produto: produtoId,
            id_categoria: categoriaId,
          },
          token,
        )
      }

      for (const categoriaId of categoriaIdsToRemove) {
        const relation = categoryRelationByCategoriaId.get(categoriaId)
        if (relation) {
          await deleteProdutoCategoria(relation.id, token)
        }
      }

      const filledUrlInputs = imageUrls.filter((item) => item.url.trim().length > 0)
      const createdImageRecords: ProdutoImagemResponse[] = []

      for (const image of filledUrlInputs) {
        const created = await createProdutoImagemUrl(
          {
            id_produto: produtoId,
            url: image.url.trim(),
            ordem: image.ordem,
            principal: image.principal,
          },
          token,
        )

        createdImageRecords.push(created)
      }

      for (const [index, file] of uploadFiles.entries()) {
        const created = await uploadProdutoImagem(
          {
            id_produto: produtoId,
            file,
            ordem: uploadStartOrder + index,
            principal: uploadFirstAsPrincipal && index === 0,
          },
          token,
        )

        createdImageRecords.push(created)
      }

      if (createdImageRecords.length > 0) {
        setExistingImages((previous) =>
          [...previous, ...createdImageRecords].sort((a, b) => {
            if (a.principal !== b.principal) {
              return a.principal ? -1 : 1
            }

            if (a.ordem !== b.ordem) {
              return a.ordem - b.ordem
            }

            return a.id - b.id
          }),
        )
      }

      const refreshedProdutoCategorias = await listProdutoCategorias(token)
      setProdutoCategoriaRelations(refreshedProdutoCategorias.filter((item) => item.id_produto === produtoId))

      setImageUrls([{ id: Date.now(), url: '', ordem: existingImages.length, principal: false }])
      setUploadFiles([])
      setUploadFirstAsPrincipal(false)

      setSuccess(`Produto ${updated.nome} atualizado com sucesso.`)
      navigate('/admin/produtos')
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Falha ao atualizar produto.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) {
    return null
  }

  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Produto invalido.</p>
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-cacao-200/90 bg-white/80 p-6 shadow-card backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600">Produtos</p>
            <h2 className="text-3xl text-cacao-900">Editar produto</h2>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/produtos')}
            className="rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
          >
            Voltar para lista
          </button>
        </div>
      </header>

      {isLoading ? (
        <p className="rounded-xl border border-cacao-200 bg-white px-4 py-3 text-sm text-cacao-700">Carregando...</p>
      ) : (
        <form className="grid gap-6" onSubmit={onSubmit}>
          <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
            <h3 className="mb-4 text-2xl text-cacao-900">Dados do produto</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Nome do produto</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  value={produto.nome}
                  onChange={(event) => setProduto((previous) => ({ ...previous, nome: event.target.value }))}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">SKU</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  value={produto.codigo_sku}
                  onChange={(event) => setProduto((previous) => ({ ...previous, codigo_sku: event.target.value }))}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Peso (gramas)</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  type="number"
                  min={0}
                  value={produto.peso_gramas}
                  onChange={(event) =>
                    setProduto((previous) => ({ ...previous, peso_gramas: Number(event.target.value) }))
                  }
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Preço</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={produto.preco}
                  onChange={(event) => setProduto((previous) => ({ ...previous, preco: Number(event.target.value) }))}
                  required
                />
              </label>
            </div>

            <label className="mt-4 inline-flex items-center gap-2 text-sm text-cacao-700">
              <input
                type="checkbox"
                checked={produto.ativo}
                onChange={(event) => setProduto((previous) => ({ ...previous, ativo: event.target.checked }))}
              />
              Produto ativo
            </label>
          </section>

          <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
            <h3 className="mb-4 text-2xl text-cacao-900">Estoque</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Quantidade</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  type="number"
                  min={0}
                  value={estoque.quantidade}
                  onChange={(event) => setEstoque((previous) => ({ ...previous, quantidade: Number(event.target.value) }))}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-cacao-700">Quantidade minima</span>
                <input
                  className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                  type="number"
                  min={0}
                  value={estoque.quantidade_min}
                  onChange={(event) =>
                    setEstoque((previous) => ({ ...previous, quantidade_min: Number(event.target.value) }))
                  }
                  required
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
            <h3 className="mb-4 text-2xl text-cacao-900">Categorias</h3>

            {categorias.length === 0 ? (
              <p className="text-sm text-cacao-700">Nenhuma categoria cadastrada.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categorias.map((categoria) => (
                  <label key={categoria.id} className="inline-flex items-center gap-2 rounded-xl border border-cacao-100 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCategoriaIds.includes(categoria.id)}
                      onChange={() => toggleCategoria(categoria.id)}
                    />
                    <span className="text-cacao-800">{categoria.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
            <h3 className="mb-4 text-2xl text-cacao-900">Imagens</h3>

            <div className="space-y-6">
              <div>
                <h4 className="mb-3 text-lg font-semibold text-cacao-900">Imagens cadastradas</h4>

                {existingImages.length === 0 ? (
                  <p className="text-sm text-cacao-700">Nenhuma imagem cadastrada.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {existingImages.map((image) => (
                      <article key={image.id} className="overflow-hidden rounded-xl border border-cacao-100">
                        <img src={toAbsoluteImageUrl(image.url)} alt="Imagem do produto" className="h-40 w-full object-cover" />
                        <div className="space-y-2 p-3 text-sm text-cacao-700">
                          <p className="truncate">{image.url}</p>
                          <p>Ordem: {image.ordem}</p>
                          <p>{image.principal ? 'Principal' : 'Secundaria'}</p>
                          <button
                            type="button"
                            onClick={() => onDeleteExistingImage(image.id)}
                            disabled={isDeletingImageId === image.id}
                            className="rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeletingImageId === image.id ? 'Removendo...' : 'Remover imagem'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-cacao-900">Adicionar por URL</h4>
                  <button
                    type="button"
                    onClick={addImageUrlRow}
                    className="rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
                  >
                    Adicionar URL
                  </button>
                </div>

                <div className="space-y-3">
                  {imageUrls.map((image) => (
                    <div key={image.id} className="grid gap-3 rounded-xl border border-cacao-100 p-3 md:grid-cols-[1fr_120px_120px_auto]">
                      <input
                        className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                        placeholder="https://..."
                        value={image.url}
                        onChange={(event) => onImageUrlChange(image.id, 'url', event.target.value)}
                      />

                      <input
                        className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                        type="number"
                        min={0}
                        value={image.ordem}
                        onChange={(event) => onImageUrlChange(image.id, 'ordem', Number(event.target.value))}
                      />

                      <label className="inline-flex items-center gap-2 text-sm text-cacao-700">
                        <input
                          type="checkbox"
                          checked={image.principal}
                          onChange={(event) => onImageUrlChange(image.id, 'principal', event.target.checked)}
                        />
                        Principal
                      </label>

                      <button
                        type="button"
                        onClick={() => removeImageUrlRow(image.id)}
                        className="rounded-full border border-cacao-300 px-3 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-4 text-lg font-semibold text-cacao-900">Upload de arquivos</h4>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-cacao-700">Arquivos</span>
                    <input
                      className="w-full rounded-xl border border-cacao-200 px-3 py-2 text-sm"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onUploadFilesChange}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-cacao-700">Ordem inicial</span>
                    <input
                      className="w-full rounded-xl border border-cacao-200 px-3 py-2 outline-none ring-cacao-600/50 transition focus:ring"
                      type="number"
                      min={0}
                      value={uploadStartOrder}
                      onChange={(event) => setUploadStartOrder(Number(event.target.value))}
                    />
                  </label>

                  <label className="inline-flex items-center gap-2 self-end text-sm text-cacao-700">
                    <input
                      type="checkbox"
                      checked={uploadFirstAsPrincipal}
                      onChange={(event) => setUploadFirstAsPrincipal(event.target.checked)}
                    />
                    Primeira imagem como principal
                  </label>
                </div>

                {uploadFiles.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {uploadFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl border border-cacao-100 px-3 py-2 text-sm">
                        <span className="truncate pr-3 text-cacao-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeUploadFile(index)}
                          className="rounded-full border border-cacao-300 px-3 py-1 font-semibold text-cacao-700 transition hover:bg-cacao-50"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-xl bg-mint-100 px-3 py-2 text-sm text-mint-700">{success}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-cacao-700 px-6 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar alteracoes'}
            </button>

            <Link
              to="/admin/produtos"
              className="rounded-full border border-cacao-300 px-6 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </section>
  )
}
