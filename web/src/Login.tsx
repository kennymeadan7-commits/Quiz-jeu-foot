import { useState, type FormEvent } from 'react'

type LoginProps = {
  isSubmitting: boolean
  errorMessage: string | null
  infoMessage: string | null
  onLogin: (email: string, password: string) => Promise<void>
  onSignup: (email: string, password: string) => Promise<void>
}

function AlertTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-rose-700">
      <path
        fill="currentColor"
        d="M12 3.25a1.5 1.5 0 0 1 1.32.79l8.3 15.76A1.5 1.5 0 0 1 20.3 22H3.7a1.5 1.5 0 0 1-1.32-2.2l8.3-15.76A1.5 1.5 0 0 1 12 3.25Zm0 5a1 1 0 0 0-1 1v4.5a1 1 0 1 0 2 0v-4.5a1 1 0 0 0-1-1Zm0 9.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"
      />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-slate-400">
      <path
        fill="currentColor"
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Zm2.2-.5L12 9.52 17.8 5H6.2Zm11.8 2.04-5.39 4.2a1 1 0 0 1-1.22 0L6 7.04V18.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V7.04Z"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-slate-400">
      <path
        fill="currentColor"
        d="M12 2.75A5.25 5.25 0 0 0 6.75 8v2H6a2.5 2.5 0 0 0-2.5 2.5v7A2.5 2.5 0 0 0 6 22h12a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 18 10h-.75V8A5.25 5.25 0 0 0 12 2.75Zm3.25 7.25V8a3.25 3.25 0 1 0-6.5 0v2h6.5Zm-3.25 3a1.75 1.75 0 0 1 1 3.18V18a1 1 0 1 1-2 0v-1.82A1.75 1.75 0 0 1 12 13Z"
      />
    </svg>
  )
}

function Login({ isSubmitting, errorMessage, infoMessage, onLogin, onSignup }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setLocalError('Les mots de passe ne correspondent pas.')
        return
      }
      await onSignup(email, password)
      return
    }
    await onLogin(email, password)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg shadow-slate-300/30 md:grid-cols-2">
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/20">
            <span className="relative block h-4 w-6 overflow-hidden rounded-sm ring-1 ring-black/20">
              <span className="absolute inset-y-0 left-0 w-2/5 bg-[#008751]" />
              <span className="absolute inset-y-0 right-0 w-3/5">
                <span className="block h-1/2 w-full bg-[#FCD116]" />
                <span className="block h-1/2 w-full bg-[#E8112D]" />
              </span>
            </span>
            République du Bénin
          </div>
          <h1 className="mt-6 text-3xl font-bold leading-tight tracking-wide">CEG 5 DOGBO</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-100">
            Plateforme de gestion scolaire sécurisée pour les administrateurs et les professeurs.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-200">
            <li>• Accès administrateur complet</li>
            <li>• Accès professeur limité à sa matière</li>
            <li>• Notes protégées par RLS Supabase</li>
          </ul>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-semibold tracking-wide text-slate-900">Connexion à votre espace</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {mode === 'login'
              ? 'Identifie-toi pour accéder à ton espace.'
              : 'Crée ton compte professeur. Un administrateur attribuera ta matière.'}
          </p>
          <div className="mt-4 inline-flex overflow-hidden rounded-md border border-slate-300">
            <button
              type="button"
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                mode === 'login' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setMode('login')}
            >
              Connexion
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                mode === 'signup' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setMode('signup')}
            >
              Créer un compte
            </button>
          </div>
          {localError ? (
            <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">{localError}</p>
          ) : null}
          {errorMessage ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">
              <AlertTriangleIcon />
              <p>{errorMessage}</p>
            </div>
          ) : null}
          {infoMessage ? (
            <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{infoMessage}</p>
          ) : null}

          <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block">
              <span className="sr-only">Email</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <MailIcon />
                </span>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-3 text-sm shadow-sm"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              </div>
            </label>

            <label className="block">
              <span className="sr-only">Mot de passe</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <LockIcon />
                </span>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-3 text-sm shadow-sm"
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              </div>
            </label>
            {mode === 'signup' ? (
              <label className="block">
                <span className="sr-only">Confirmer le mot de passe</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <LockIcon />
                  </span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-3 text-sm shadow-sm"
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
                </div>
              </label>
            ) : null}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  Traitement...
                </>
              ) : mode === 'login' ? (
                'Se connecter'
              ) : (
                'Créer le compte'
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Login
