import type { AdminSession } from './authStorage'
import { requestApi } from './apiClient'
import type { Categoria, ProdutoCategoria } from '../types/api'

interface LoginRequestBody {
  email?: string
  telefone?: string
  senha: string
}

export interface CreateProdutoInput {
  nome: string
  codigo_sku: string
  peso_gramas: number
  preco: number
  ativo?: boolean
}

export interface UpdateProdutoInput {
  nome?: string
  codigo_sku?: string
  peso_gramas?: number
  preco?: number
  ativo?: boolean
}

export interface ProdutoResponse {
  id: number
  nome: string
  codigo_sku: string
  peso_gramas: number
  preco: string
  ativo: boolean
}

export interface CreateEstoqueInput {
  quantidade: number
  quantidade_min: number
}

export interface EstoqueResponse {
  id: number
  id_produto: number
  quantidade: number
  quantidade_min: number
}

interface CreateImageUrlInput {
  id_produto: number
  url: string
  ordem: number
  principal?: boolean
}

interface CreateProdutoCategoriaInput {
  id_produto: number
  id_categoria: number
}

export interface CategoriaInput {
  nome: string
  descricao?: string
}

interface UploadImageInput {
  id_produto: number
  file: File
  ordem: number
  principal?: boolean
}

export interface ProdutoImagemResponse {
  id: number
  id_produto: number
  url: string
  principal: boolean
  ordem: number
}

function toLoginBody(identifier: string, senha: string): LoginRequestBody {
  if (identifier.includes('@')) {
    return { email: identifier, senha }
  }

  return { telefone: identifier, senha }
}

export async function loginAdmin(identifier: string, senha: string): Promise<AdminSession> {
  const session = await requestApi<AdminSession>('/auth/login', {
    method: 'POST',
    body: toLoginBody(identifier, senha),
  })

  if (session.user.roleId !== 2) {
    throw new Error('Somente administradores podem acessar esta area.')
  }

  return session
}

export async function createProduto(input: CreateProdutoInput, token: string): Promise<ProdutoResponse> {
  return requestApi<ProdutoResponse>('/produtos', {
    method: 'POST',
    token,
    body: input,
  })
}

export async function listProdutos(token: string): Promise<ProdutoResponse[]> {
  return requestApi<ProdutoResponse[]>('/produtos', {
    token,
  })
}

export async function getProdutoById(id: number, token: string): Promise<ProdutoResponse> {
  return requestApi<ProdutoResponse>(`/produtos/${id}`, {
    token,
  })
}

export async function updateProduto(id: number, input: UpdateProdutoInput, token: string): Promise<ProdutoResponse> {
  return requestApi<ProdutoResponse>(`/produtos/${id}`, {
    method: 'PUT',
    token,
    body: input,
  })
}

export async function deleteProduto(id: number, token: string): Promise<void> {
  await requestApi<void>(`/produtos/${id}`, {
    method: 'DELETE',
    token,
  })
}

export async function createEstoque(
  input: CreateEstoqueInput & { id_produto: number },
  token: string,
): Promise<EstoqueResponse> {
  return requestApi<EstoqueResponse>('/estoques', {
    method: 'POST',
    token,
    body: input,
  })
}

export async function updateEstoque(id: number, input: CreateEstoqueInput, token: string): Promise<EstoqueResponse> {
  return requestApi<EstoqueResponse>(`/estoques/${id}`, {
    method: 'PUT',
    token,
    body: input,
  })
}

export async function listEstoques(token: string): Promise<EstoqueResponse[]> {
  return requestApi<EstoqueResponse[]>('/estoques', {
    token,
  })
}

export async function createProdutoImagemUrl(input: CreateImageUrlInput, token: string): Promise<ProdutoImagemResponse> {
  return requestApi<ProdutoImagemResponse>('/produto-imagens', {
    method: 'POST',
    token,
    body: input,
  })
}

export async function listProdutoImagens(token: string): Promise<ProdutoImagemResponse[]> {
  return requestApi<ProdutoImagemResponse[]>('/produto-imagens', {
    token,
  })
}

export async function deleteProdutoImagem(id: number, token: string): Promise<void> {
  await requestApi<void>(`/produto-imagens/${id}`, {
    method: 'DELETE',
    token,
  })
}

export async function listCategorias(token: string): Promise<Categoria[]> {
  return requestApi<Categoria[]>('/categorias', {
    token,
  })
}

export async function createCategoria(input: CategoriaInput, token: string): Promise<Categoria> {
  return requestApi<Categoria>('/categorias', {
    method: 'POST',
    token,
    body: input,
  })
}

export async function updateCategoria(id: number, input: Partial<CategoriaInput>, token: string): Promise<Categoria> {
  return requestApi<Categoria>(`/categorias/${id}`, {
    method: 'PUT',
    token,
    body: input,
  })
}

export async function deleteCategoria(id: number, token: string): Promise<void> {
  await requestApi<void>(`/categorias/${id}`, {
    method: 'DELETE',
    token,
  })
}

export async function listProdutoCategorias(token: string): Promise<ProdutoCategoria[]> {
  return requestApi<ProdutoCategoria[]>('/produto-categorias', {
    token,
  })
}

export async function createProdutoCategoria(input: CreateProdutoCategoriaInput, token: string): Promise<ProdutoCategoria> {
  return requestApi<ProdutoCategoria>('/produto-categorias', {
    method: 'POST',
    token,
    body: input,
  })
}

export async function deleteProdutoCategoria(id: number, token: string): Promise<void> {
  await requestApi<void>(`/produto-categorias/${id}`, {
    method: 'DELETE',
    token,
  })
}

export async function uploadProdutoImagem(input: UploadImageInput, token: string): Promise<ProdutoImagemResponse> {
  const form = new FormData()
  form.append('image', input.file)
  form.append('id_produto', String(input.id_produto))
  form.append('ordem', String(input.ordem))

  if (input.principal !== undefined) {
    form.append('principal', String(input.principal))
  }

  return requestApi<ProdutoImagemResponse>('/produto-imagens/upload', {
    method: 'POST',
    token,
    body: form,
  })
}
