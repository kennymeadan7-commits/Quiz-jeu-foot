import { useState, type FormEvent } from 'react'

type LoginProps = {
  isSubmitting: boolean
  errorMessage: string | null
  onLogin: (email: string, password: string) => Promise<void>
}

function Login({ isSubmitting, errorMessage, onLogin }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onLogin(email, password)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 md:grid-cols-2">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 p-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs ring-1 ring-white/20">
            <span className="relative block h-4 w-6 overflow-hidden rounded-sm ring-1 ring-black/20">
              <span className="absolute inset-y-0 left-0 w-2/5 bg-[#008751]" />
              <span className="absolute inset-y-0 right-0 w-3/5">
                <span className="block h-1/2 w-full bg-[#FCD116]" />
                <span className="block h-1/2 w-full bg-[#E8112D]" />
              </span>
            </span>
            République du Bénin
          </div>
          <h1 className="mt-6 text-3xl font-bold leading-tight">CEG 5 DOGBO</h1>
          <p className="mt-3 text-slate-100">
            Plateforme de gestion scolaire sécurisée pour les administrateurs et les professeurs.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-200">
            <li>• Accès administrateur complet</li>
            <li>• Accès professeur limité à sa matière</li>
            <li>• Notes protégées par RLS Supabase</li>
          </ul>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-semibold text-slate-900">Connexion</h2>
          <p className="mt-2 text-sm text-slate-600">Identifie-toi pour accéder à ton espace.</p>
          {errorMessage ? (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
          ) : null}

          <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Email</span>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm"
                type="email"
                placeholder="exemple@ceg5.bj"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Mot de passe</span>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <button
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Login
