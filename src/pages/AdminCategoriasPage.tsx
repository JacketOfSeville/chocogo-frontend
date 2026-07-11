import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createCategoria,
  deleteCategoria,
  listCategorias,
  updateCategoria,
  type CategoriaInput,
} from '../lib/adminApi'
import { getAdminSession } from '../lib/authStorage'
import type { Categoria } from '../types/api'

const emptyForm: CategoriaInput = {
  nome: '',
  descricao: '',
}

export function AdminCategoriasPage() {
  const session = getAdminSession()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState<CategoriaInput>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const accessToken = session?.accessToken

  const orderedCategorias = useMemo(
    () => [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [categorias],
  )

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const token = accessToken
    let mounted = true

    async function loadCategorias() {
      setIsLoading(true)
      setError('')

      try {
        const result = await listCategorias(token)
        if (!mounted) {
          return
        }

        setCategorias(result)
      } catch (loadError) {
        if (!mounted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar categorias.'
        setError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadCategorias()

    return () => {
      mounted = false
    }
  }, [accessToken])

  if (!session) {
    return null
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function onStartEdit(categoria: Categoria) {
    setEditingId(categoria.id)
    setForm({
      nome: categoria.nome,
      descricao: categoria.descricao ?? '',
    })
    setError('')
    setSuccess('')
  }

  async function onSaveCategoria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!accessToken) {
      return
    }

    const nome = form.nome.trim()
    const descricao = form.descricao?.trim()

    if (!nome) {
      setError('Nome da categoria e obrigatorio.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      if (editingId) {
        const updated = await updateCategoria(
          editingId,
          {
            nome,
            descricao,
          },
          accessToken,
        )

        setCategorias((previous) => previous.map((categoria) => (categoria.id === updated.id ? updated : categoria)))
        setSuccess('Categoria atualizada com sucesso.')
      } else {
        const created = await createCategoria(
          {
            nome,
            descricao,
          },
          accessToken,
        )

        setCategorias((previous) => [...previous, created])
        setSuccess('Categoria criada com sucesso.')
      }

      resetForm()
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao salvar categoria.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function onDeleteCategoria(categoria: Categoria) {
    if (!accessToken) {
      return
    }

    const confirmed = window.confirm(`Deseja excluir a categoria "${categoria.nome}"?`)
    if (!confirmed) {
      return
    }

    setDeletingId(categoria.id)
    setError('')
    setSuccess('')

    try {
      await deleteCategoria(categoria.id, accessToken)
      setCategorias((previous) => previous.filter((item) => item.id !== categoria.id))

      if (editingId === categoria.id) {
        resetForm()
      }

      setSuccess('Categoria excluida com sucesso.')
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Falha ao excluir categoria.'
      setError(message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-cacao-200/90 bg-white/80 p-6 shadow-card backdrop-blur-sm">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600">Modulo</p>
        <h2 className="text-3xl text-cacao-900">Categorias</h2>
        <p className="mt-1 text-sm text-cacao-700">Liste, cadastre, edite e exclua categorias do catalogo.</p>
      </header>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-cacao-200 bg-white shadow-card">
          {isLoading ? (
            <p className="p-5 text-sm text-cacao-700">Carregando categorias...</p>
          ) : orderedCategorias.length === 0 ? (
            <p className="p-5 text-sm text-cacao-700">Nenhuma categoria cadastrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-cacao-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-cacao-700">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-cacao-700">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold text-cacao-700">Descricao</th>
                    <th className="px-4 py-3 text-right font-semibold text-cacao-700">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedCategorias.map((categoria) => (
                    <tr key={categoria.id} className="border-t border-cacao-100">
                      <td className="px-4 py-3 text-cacao-900">#{categoria.id}</td>
                      <td className="px-4 py-3 text-cacao-900">{categoria.nome}</td>
                      <td className="px-4 py-3 text-cacao-700">{categoria.descricao?.trim() ? categoria.descricao : '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onStartEdit(categoria)}
                            className="rounded-full border border-cacao-300 px-3 py-1.5 font-semibold text-cacao-700 transition hover:bg-cacao-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCategoria(categoria)}
                            disabled={deletingId === categoria.id}
                            className="rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === categoria.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form onSubmit={onSaveCategoria} className="rounded-2xl border border-cacao-200 bg-white p-5 shadow-card">
          <h3 className="text-xl text-cacao-900">{editingId ? 'Editar categoria' : 'Nova categoria'}</h3>

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-cacao-700">Nome</span>
            <input
              type="text"
              value={form.nome}
              onChange={(event) => setForm((previous) => ({ ...previous, nome: event.target.value }))}
              className="w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              placeholder="Ex.: Trufas"
              maxLength={50}
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-sm font-medium text-cacao-700">Descricao (opcional)</span>
            <textarea
              value={form.descricao ?? ''}
              onChange={(event) => setForm((previous) => ({ ...previous, descricao: event.target.value }))}
              className="min-h-24 w-full rounded-xl border border-cacao-200 bg-white px-3 py-2 text-cacao-900 outline-none ring-cacao-600/50 transition focus:ring"
              placeholder="Categoria para chocolates artesanais..."
              maxLength={255}
            />
          </label>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-cacao-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cacao-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Cadastrar categoria'}
            </button>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-cacao-300 px-4 py-2 text-sm font-semibold text-cacao-700 transition hover:bg-cacao-50"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </section>
  )
}
