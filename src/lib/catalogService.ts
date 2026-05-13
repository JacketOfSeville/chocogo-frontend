import { API_BASE_URL } from '../config'
import { fetchApi } from './apiClient'
import type { Categoria, Produto, ProdutoCategoria, ProdutoImagem } from '../types/api'

export interface CatalogProduct {
  id: number
  nome: string
  sku: string
  pesoGramas: number
  preco: number
  ativo: boolean
  imageUrl: string | null
  imageUrls: string[]
  categories: string[]
  estoque?: number // undefined = no estoque record
}

function toPriceNumber(value: string | number): number {
  if (typeof value === 'number') {
    return value
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function pickMainImage(images: ProdutoImagem[]): ProdutoImagem | null {
  if (images.length === 0) {
    return null
  }

  return [...images].sort((a, b) => {
    if (a.principal !== b.principal) {
      return a.principal ? -1 : 1
    }

    if (a.ordem !== b.ordem) {
      return a.ordem - b.ordem
    }

    return a.id - b.id
  })[0]
}

function sortImages(images: ProdutoImagem[]): ProdutoImagem[] {
  return [...images].sort((a, b) => {
    if (a.principal !== b.principal) {
      return a.principal ? -1 : 1
    }

    if (a.ordem !== b.ordem) {
      return a.ordem - b.ordem
    }

    return a.id - b.id
  })
}

function toAbsoluteImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const root = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${root}${url.startsWith('/') ? '' : '/'}${url}`
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const [produtos, imagens, produtoCategorias, categorias, estoques] = await Promise.all([
    fetchApi<Produto[]>('/produtos'),
    fetchApi<ProdutoImagem[]>('/produto-imagens'),
    fetchApi<ProdutoCategoria[]>('/produto-categorias'),
    fetchApi<Categoria[]>('/categorias'),
    fetchApi<import('../lib/adminApi').EstoqueResponse[]>('/estoques'),
  ])

  const imagesByProduct = new Map<number, ProdutoImagem[]>()
  for (const imagem of imagens) {
    const productImages = imagesByProduct.get(imagem.id_produto) ?? []
    productImages.push(imagem)
    imagesByProduct.set(imagem.id_produto, productImages)
  }

  const categoryNameById = new Map<number, string>()
  for (const categoria of categorias) {
    categoryNameById.set(categoria.id, categoria.nome)
  }

  const categoryIdsByProduct = new Map<number, number[]>()
  for (const rel of produtoCategorias) {
    const categoryIds = categoryIdsByProduct.get(rel.id_produto) ?? []
    categoryIds.push(rel.id_categoria)
    categoryIdsByProduct.set(rel.id_produto, categoryIds)
  }

  const estoqueByProduct = new Map<number, number>()
  for (const estoque of estoques) {
    estoqueByProduct.set(estoque.id_produto, estoque.quantidade)
  }

  return produtos
    .filter((produto) => produto.ativo)
    .map((produto) => {
    const sortedImages = sortImages(imagesByProduct.get(produto.id) ?? [])
    const selectedImage = pickMainImage(sortedImages)
    const categoryIds = categoryIdsByProduct.get(produto.id) ?? []
    const estoque = estoqueByProduct.get(produto.id)

    return {
      id: produto.id,
      nome: produto.nome,
      sku: produto.codigo_sku,
      pesoGramas: produto.peso_gramas,
      preco: toPriceNumber(produto.preco),
      ativo: produto.ativo,
      imageUrl: selectedImage ? toAbsoluteImageUrl(selectedImage.url) : null,
      imageUrls: sortedImages.map((image) => toAbsoluteImageUrl(image.url)),
      categories: categoryIds.map((categoryId) => categoryNameById.get(categoryId)).filter((value): value is string => Boolean(value)),
      estoque,
    }
    })
}
