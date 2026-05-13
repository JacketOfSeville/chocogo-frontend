import { useState } from 'react'
import type { CatalogProduct } from '../../lib/catalogService'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

interface ProductCardProps {
  product: CatalogProduct
  onSelect?: (product: CatalogProduct) => void
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const hasCategories = product.categories.length > 0
  const images = product.imageUrls
  const hasMultipleImages = images.length > 1
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const safeImageIndex = images.length > 0 ? currentImageIndex % images.length : 0
  const currentImageUrl = images[safeImageIndex] ?? product.imageUrl

  // out if estoque is undefined or 0
  const outOfStock = product.estoque === undefined || product.estoque === 0

  function showPreviousImage() {
    if (outOfStock) return
    setCurrentImageIndex((previous) => {
      if (images.length === 0) {
        return previous
      }
      return previous === 0 ? images.length - 1 : previous - 1
    })
  }

  function showNextImage() {
    if (outOfStock) return
    setCurrentImageIndex((previous) => {
      if (images.length === 0) {
        return previous
      }
      return previous === images.length - 1 ? 0 : previous + 1
    })
  }

  function onCardClick() {
    if (outOfStock || !onSelect) {
      return
    }

    onSelect(product)
  }

  function onCardKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (outOfStock || !onSelect) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(product)
    }
  }

  return (
    <article
      className={`product-card${outOfStock ? ' opacity-50 grayscale pointer-events-none select-none' : ''}`}
      tabIndex={outOfStock ? -1 : 0}
      aria-disabled={outOfStock}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
    >
      <div className="relative h-44 overflow-hidden bg-cacao-50 sm:h-52">
        {currentImageUrl ? (
          <img className="h-full w-full object-cover" src={currentImageUrl} alt={product.nome} loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-cacao-100 to-cacao-200 px-4 text-center text-sm font-medium text-cacao-700">
            Imagem indisponivel
          </div>
        )}

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                showPreviousImage()
              }}
              aria-label="Imagem anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2 py-1 text-lg leading-none text-cacao-800 shadow transition hover:bg-white"
              disabled={outOfStock}
            >
              {'<'}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                showNextImage()
              }}
              aria-label="Proxima imagem"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2 py-1 text-lg leading-none text-cacao-800 shadow transition hover:bg-white"
              disabled={outOfStock}
            >
              {'>'}
            </button>

            <span className="absolute bottom-2 right-2 rounded-full bg-cacao-900/75 px-2 py-1 text-xs font-medium text-white">
              {safeImageIndex + 1}/{images.length}
            </span>
          </>
        ) : null}

        {/* <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            product.ativo ? 'bg-mint-100 text-mint-700' : 'bg-cacao-200 text-cacao-700'
          }`}
        >
          {product.ativo ? 'Ativo' : 'Inativo'}
        </span> */}
        {outOfStock && (
          <span className="absolute right-3 top-3 rounded-full bg-cacao-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cacao-700">
            Sem estoque
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <h2 className="line-clamp-2 text-xl text-cacao-900">{product.nome}</h2>
        <p className="text-2xl font-semibold text-cacao-700">{currency.format(product.preco)}</p>

        <div className="flex flex-wrap gap-2">
          {hasCategories ? (
            product.categories.slice(0, 2).map((category) => (
              <span key={category} className="rounded-full bg-cacao-50 px-2.5 py-1 text-xs font-medium text-cacao-700">
                {category}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-cacao-50 px-2.5 py-1 text-xs font-medium text-cacao-700">Sem categoria</span>
          )}

          {product.categories.length > 2 ? (
            <span className="rounded-full bg-cacao-50 px-2.5 py-1 text-xs font-medium text-cacao-700">+{product.categories.length - 2}</span>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-2 border-t border-cacao-100 pt-3 text-sm text-cacao-700">
          <div>
            <dt className="text-xs uppercase tracking-wider text-cacao-600">SKU</dt>
            <dd className="truncate font-medium">{product.sku}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-cacao-600">Peso</dt>
            <dd className="font-medium">{product.pesoGramas} g</dd>
          </div>
        </dl>
      </div>
    </article>
  )
}
