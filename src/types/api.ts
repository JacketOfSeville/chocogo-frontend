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

export interface Endereco {
  id: number
  id_usuario: number
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  cep: string
  principal: boolean
}

export interface Carrinho {
  id: number
  id_usuario: number
  data_criacao: string
}

export interface CarrinhoItem {
  id: number
  id_carrinho: number
  id_produto: number
  quantidade: number
}

export interface CheckoutResumo {
  valor_produtos: string | number
  valor_frete: string | number
  valor_total: string | number
}

export interface Pedido {
  id: number
  id_usuario: number
  id_endereco: number | null
  id_status_pedido: number
  id_tipo_entrega: number
  meio_pagamento: string
  valor_total: string | number
  valor_frete: string | number
  data_criacao?: string
}

export interface PedidoItem {
  id: number
  id_pedido: number
  id_produto: number
  quantidade: number
  preco_momento: string | number
  subtotal: string | number
}
