import type { CatalogProduct } from '../../lib/catalogService'
import { ProductCard } from './ProductCard'

interface CatalogGridProps {
  products: CatalogProduct[]
  onProductSelect?: (product: CatalogProduct) => void
}

export function CatalogGrid({ products, onProductSelect }: CatalogGridProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onSelect={onProductSelect} />
      ))}
    </section>
  )
}
