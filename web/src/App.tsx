const modules = [
  { name: 'Élèves', description: 'Créer, modifier et suivre les profils élèves.' },
  { name: 'Classes', description: 'Gérer les classes, niveaux et année scolaire.' },
  { name: 'Matières', description: 'Configurer les matières et leurs coefficients.' },
  { name: 'Notes', description: 'Saisir les évaluations et notes par période.' },
]

function App() {
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
        <StatCard label="Moyenne classe (T1)" value="12.84 / 20" />
        <StatCard label="Élèves classés" value="36" />
        <StatCard label="Matières actives" value="9" />
        <StatCard label="Notes manquantes" value="14" />
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
