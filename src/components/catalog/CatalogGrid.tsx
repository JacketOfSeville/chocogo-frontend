import type { CatalogProduct } from '../../lib/catalogService'
import { ProductCard } from './ProductCard'

interface CatalogGridProps {
  products: CatalogProduct[]
}

export function CatalogGrid({ products }: CatalogGridProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </section>
  )
}
