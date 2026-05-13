import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createProdutoCategoria,
  createEstoque,
  createProduto,
  createProdutoImagemUrl,
  listCategorias,
  uploadProdutoImagem,
  type CreateEstoqueInput,
  type CreateProdutoInput,
} from '../lib/adminApi'
import { getAdminSession } from '../lib/authStorage'
import type { Categoria } from '../types/api'

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

export function AdminProdutoCreatePage() {
  const navigate = useNavigate()
  const session = getAdminSession()
  const accessToken = session?.accessToken
  const [produto, setProduto] = useState<CreateProdutoInput>(initialProduto)
  const [estoque, setEstoque] = useState<CreateEstoqueInput>(initialEstoque)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [selectedCategoriaIds, setSelectedCategoriaIds] = useState<number[]>([])
  const [imageUrls, setImageUrls] = useState<ImageUrlInput[]>([{ id: 1, url: '', ordem: 0, principal: true }])
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadStartOrder, setUploadStartOrder] = useState(0)
  const [uploadFirstAsPrincipal, setUploadFirstAsPrincipal] = useState(false)
  const [isLoadingMeta, setIsLoadingMeta] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const token = accessToken
    let mounted = true

    async function loadMeta() {
      setIsLoadingMeta(true)
      setError('')

      try {
        const categoriaList = await listCategorias(token)

        if (!mounted) {
          return
        }

        setCategorias(categoriaList)
      } catch (requestError) {
        if (!mounted) {
          return
        }

        const message = requestError instanceof Error ? requestError.message : 'Falha ao carregar categorias.'
        setError(message)
      } finally {
        if (mounted) {
          setIsLoadingMeta(false)
        }
      }
    }

    void loadMeta()

    return () => {
      mounted = false
    }
  }, [accessToken])

  const uploadPreviewUrls = useMemo(() => uploadFiles.map((file) => URL.createObjectURL(file)), [uploadFiles])

  useEffect(() => {
    return () => {
      for (const url of uploadPreviewUrls) {
        URL.revokeObjectURL(url)
      }
    }
  }, [uploadPreviewUrls])

  if (!session || !accessToken) {
    return null
  }

  function addImageUrlRow() {
    setImageUrls((previous) => {
      const nextId = previous.length === 0 ? 1 : Math.max(...previous.map((item) => item.id)) + 1
      const nextOrder = previous.length
      return [...previous, { id: nextId, url: '', ordem: nextOrder, principal: false }]
    })
  }

  function removeImageUrlRow(id: number) {
    setImageUrls((previous) => previous.filter((item) => item.id !== id))
  }

  function onImageUrlChange(id: number, field: 'url' | 'ordem' | 'principal', value: string | number | boolean) {
    setImageUrls((previous) =>
      previous.map((item) => {
        if (item.id !== id) {
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

  function toggleCategoria(id: number) {
    setSelectedCategoriaIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id)
      }

      return [...previous, id]
    })
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!accessToken) {
      setError('Sessao invalida. Faca login novamente.')
      return
    }

    const token = accessToken

    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const createdProduto = await createProduto(produto, token)
      await createEstoque(
        {
          id_produto: createdProduto.id,
          quantidade: estoque.quantidade,
          quantidade_min: estoque.quantidade_min,
        },
        token,
      )

      for (const categoriaId of selectedCategoriaIds) {
        await createProdutoCategoria(
          {
            id_produto: createdProduto.id,
            id_categoria: categoriaId,
          },
          token,
        )
      }

      const filledUrlInputs = imageUrls.filter((item) => item.url.trim().length > 0)
      for (const image of filledUrlInputs) {
        await createProdutoImagemUrl(
          {
            id_produto: createdProduto.id,
            url: image.url.trim(),
            ordem: image.ordem,
            principal: image.principal,
          },
          token,
        )
      }

      for (const [index, file] of uploadFiles.entries()) {
        await uploadProdutoImagem(
          {
            id_produto: createdProduto.id,
            file,
            ordem: uploadStartOrder + index,
            principal: uploadFirstAsPrincipal && index === 0,
          },
          token,
        )
      }

      setSuccess(`Produto ${createdProduto.nome} criado com sucesso.`)
      setProduto(initialProduto)
      setEstoque(initialEstoque)
      setSelectedCategoriaIds([])
      setImageUrls([{ id: Date.now(), url: '', ordem: 0, principal: true }])
      setUploadFiles([])
      setUploadStartOrder(0)
      setUploadFirstAsPrincipal(false)
      navigate('/admin/produtos')
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Falha ao criar produto.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-cacao-200/90 bg-white/80 p-6 shadow-card backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600">Produtos</p>
            <h1 className="text-3xl text-cacao-900">Cadastro de produto</h1>
          </div>

          <Link
            to="/admin/produtos"
            className="inline-flex items-center justify-center rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
          >
            Voltar para lista
          </Link>
        </div>
      </header>

      <form className="grid gap-6" onSubmit={onSubmit}>
        <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-2xl text-cacao-900">Dados do produto</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cacao-700">Nome</span>
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
                onChange={(event) => setProduto((previous) => ({ ...previous, peso_gramas: Number(event.target.value) }))}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cacao-700">Preco</span>
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
          <h2 className="mb-4 text-2xl text-cacao-900">Estoque</h2>

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
                onChange={(event) => setEstoque((previous) => ({ ...previous, quantidade_min: Number(event.target.value) }))}
                required
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-2xl text-cacao-900">Categorias</h2>

          {isLoadingMeta ? (
            <p className="text-sm text-cacao-700">Carregando categorias...</p>
          ) : categorias.length === 0 ? (
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
          <h2 className="mb-4 text-2xl text-cacao-900">Imagens</h2>

          <div className="space-y-6">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-cacao-900">Adicionar por URL</h3>
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
              <h3 className="mb-4 text-lg font-semibold text-cacao-900">Upload de arquivos</h3>

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
                  Primeira imagem como principal?
                </label>
              </div>

              {uploadFiles.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {uploadFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-cacao-100 px-3 py-2 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        {uploadPreviewUrls[index] ? (
                          <img
                            src={uploadPreviewUrls[index]}
                            alt={`Preview ${file.name}`}
                            className="h-12 w-12 flex-none rounded-lg border border-cacao-100 object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        <span className="truncate pr-3 text-cacao-700">{file.name}</span>
                      </div>
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

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-cacao-700 px-6 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Criando...' : 'Criar produto'}
          </button>
        </div>
      </form>
    </section>
  )
}
