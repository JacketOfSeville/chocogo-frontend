interface CatalogErrorStateProps {
  error: string
  onRetry: () => void
}

export function CatalogLoadingState() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-cacao-200 bg-white shadow-card">
          <div className="h-44 animate-pulse bg-cacao-100 sm:h-52" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-cacao-100" />
            <div className="h-6 w-2/5 animate-pulse rounded bg-cacao-100" />
            <div className="h-4 w-full animate-pulse rounded bg-cacao-100" />
          </div>
        </div>
      ))}
    </section>
  )
}

export function CatalogEmptyState() {
  return (
    <section className="rounded-2xl border border-cacao-200 bg-white p-6 text-center shadow-card">
      <h2 className="mb-2 text-2xl text-cacao-900">Nenhum produto encontrado</h2>
      <p className="text-cacao-700">A API nao retornou itens no momento. Tente novamente mais tarde.</p>
    </section>
  )
}

export function CatalogErrorState({ error, onRetry }: CatalogErrorStateProps) {
  return (
    <section className="rounded-2xl border border-cacao-200 bg-white p-6 text-center shadow-card">
      <h2 className="mb-2 text-2xl text-cacao-900">Falha ao carregar o catálogo</h2>
      <p className="mb-4 text-cacao-700">{error}</p>
      <button
        className="rounded-full bg-cacao-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900"
        onClick={onRetry}
        type="button"
      >
        Tentar novamente
      </button>
    </section>
  )
}
