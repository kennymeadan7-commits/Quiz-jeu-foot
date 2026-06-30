import { useEffect, useMemo, useState } from 'react'
import { hasSupabaseConfig, supabase } from './lib/supabase/client'

const modules = [
  { name: 'Élèves', description: 'Créer, modifier et suivre les profils élèves.' },
  { name: 'Classes', description: 'Gérer les classes, niveaux et année scolaire.' },
  { name: 'Matières', description: 'Configurer les matières et leurs coefficients.' },
  { name: 'Notes', description: 'Saisir les évaluations et notes par période.' },
]

type ClassAverageRow = {
  class_id: string
  period: string
  class_average: number
}

function App() {
  const [classAverages, setClassAverages] = useState<ClassAverageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadClassAverages() {
      if (!hasSupabaseConfig || !supabase) {
        setLoading(false)
        setErrorMessage(
          'Supabase non configuré. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans web/.env.local.',
        )
        return
      }

      const { data, error } = await supabase
        .from('v_class_averages')
        .select('class_id, period, class_average')
        .eq('period', 'T1')
        .order('class_average', { ascending: false })
        .limit(5)

      if (error) {
        setErrorMessage(`Erreur Supabase: ${error.message}`)
        setLoading(false)
        return
      }

      setClassAverages((data ?? []) as ClassAverageRow[])
      setLoading(false)
    }

    loadClassAverages()
  }, [])

  const headlineAverage = useMemo(() => {
    if (classAverages.length === 0) return '-- / 20'
    return `${classAverages[0].class_average.toFixed(2)} / 20`
  }, [classAverages])

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
        <p className="text-sm uppercase tracking-wide text-slate-300">Secondaire</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          Gestion des moyennes scolaires
        </h1>
        <p className="mt-3 max-w-3xl text-slate-200">
          Prototype web (React + Tailwind). La base de données Supabase est déjà
          prévue avec calcul de moyenne pondérée, moyenne de classe et classement.
        </p>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Meilleure moyenne classe (T1)"
          value={loading ? 'Chargement...' : headlineAverage}
        />
        <StatCard
          label="Classes chargées (T1)"
          value={loading ? '...' : String(classAverages.length)}
        />
        <StatCard label="Source" value={hasSupabaseConfig ? 'Supabase' : 'Mode local'} />
        <StatCard
          label="Statut"
          value={errorMessage ? 'À configurer' : loading ? 'Connexion...' : 'Connecté'}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Modules CRUD</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <article key={module.name} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{module.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{module.description}</p>
              <button
                type="button"
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Ouvrir
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Moyennes de classe (T1)</h2>
        {errorMessage ? (
          <p className="mt-2 text-sm text-amber-700">{errorMessage}</p>
        ) : loading ? (
          <p className="mt-2 text-sm text-slate-600">Chargement des données...</p>
        ) : classAverages.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Aucune donnée trouvée. Vérifie que la vue v_class_averages contient des lignes.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">#</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Classe ID</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Période</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Moyenne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {classAverages.map((row, index) => (
                  <tr key={`${row.class_id}-${row.period}-${index}`}>
                    <td className="px-3 py-2 text-slate-600">{index + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.class_id}</td>
                    <td className="px-3 py-2 text-slate-700">{row.period}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {row.class_average.toFixed(2)} / 20
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Prochaine étape</h2>
        <p className="mt-2 text-slate-600">
          Brancher les données réelles depuis Supabase, puis afficher les résultats des vues :
          <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-sm">v_student_averages</code>,
          <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-sm">v_class_averages</code> et
          <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-sm">v_student_ranking</code>.
        </p>
      </section>
    </main>
  )
}

type StatCardProps = {
  label: string
  value: string
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  )
}

export default App
