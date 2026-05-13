export interface Produto {
  id: number
  nome: string
  codigo_sku: string
  peso_gramas: number
  preco: string | number
  ativo: boolean
}

export interface ProdutoImagem {
  id: number
  id_produto: number
  url: string
  principal: boolean
  ordem: number
}

export interface ProdutoCategoria {
  id: number
  id_produto: number
  id_categoria: number
}

export interface Categoria {
  id: number
  nome: string
  descricao: string | null
}
