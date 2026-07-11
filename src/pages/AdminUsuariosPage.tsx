import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminSession } from '../lib/authStorage'
import { listUsuarios, type UsuarioResumo } from '../lib/usuarioApi'

function parseDate(raw?: string): string {
  if (!raw) {
    return 'Sem data'
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return 'Sem data'
  }

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getRoleLabel(roleId?: number): string {
  if (roleId === 2) {
    return 'Admin'
  }

  if (roleId === 1) {
    return 'Usuario'
  }

  return 'Desconhecido'
}

function getRoleChipClass(roleId?: number): string {
  if (roleId === 2) {
    return 'bg-amber-100 text-amber-800'
  }

  if (roleId === 1) {
    return 'bg-cacao-100 text-cacao-800'
  }

  return 'bg-slate-100 text-slate-700'
}

export function AdminUsuariosPage() {
  const session = getAdminSession()
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const accessToken = session?.accessToken

  const orderedUsuarios = useMemo(
    () => [...usuarios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [usuarios],
  )

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const token = accessToken
    let mounted = true

    async function loadUsuarios() {
      setIsLoading(true)
      setError('')

      try {
        const result = await listUsuarios(token)

        if (!mounted) {
          return
        }

        setUsuarios(result)
      } catch (loadError) {
        if (!mounted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar usuarios.'
        setError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadUsuarios()

    return () => {
      mounted = false
    }
  }, [accessToken])

  if (!session) {
    return null
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-cacao-200/90 bg-white/80 p-6 shadow-card backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cacao-600">Modulo</p>
            <h2 className="text-3xl text-cacao-900">Usuarios</h2>
            <p className="mt-1 text-sm text-cacao-700">Visualize dados de conta, enderecos e pedidos por usuario.</p>
          </div>

          <p className="rounded-full bg-cacao-100 px-4 py-2 text-sm font-semibold text-cacao-800">{orderedUsuarios.length} usuario(s)</p>
        </div>
      </header>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-cacao-200 bg-white shadow-card">
        {isLoading ? (
          <p className="p-5 text-sm text-cacao-700">Carregando usuarios...</p>
        ) : orderedUsuarios.length === 0 ? (
          <p className="p-5 text-sm text-cacao-700">Nenhum usuario encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-cacao-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Permissao</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Telefone</th>
                  <th className="px-4 py-3 text-left font-semibold text-cacao-700">Criacao</th>
                  <th className="px-4 py-3 text-right font-semibold text-cacao-700">Acao</th>
                </tr>
              </thead>
              <tbody>
                {orderedUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-t border-cacao-100">
                    <td className="px-4 py-3 text-cacao-900">#{usuario.id}</td>
                    <td className="px-4 py-3 text-cacao-900">{usuario.nome}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRoleChipClass(usuario.id_tipo_usuario)}`}>
                        {getRoleLabel(usuario.id_tipo_usuario)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cacao-700">{usuario.email ?? '-'}</td>
                    <td className="px-4 py-3 text-cacao-700">{usuario.telefone ?? '-'}</td>
                    <td className="px-4 py-3 text-cacao-700">{parseDate(usuario.data_criacao)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/usuarios/${usuario.id}`}
                        className="inline-flex rounded-full border border-cacao-300 px-3 py-1.5 font-semibold text-cacao-700 transition hover:bg-cacao-50"
                      >
                        Visualizar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
