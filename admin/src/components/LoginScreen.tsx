import { FormEvent, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export function LoginScreen() {
  const { login, loading, error, clearError } = useAuthStore();
  const [loginValue, setLoginValue] = useState('admin');
  const [password, setPassword] = useState('admin123');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearError();
    await login(loginValue, password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-soft backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-brand">Restaurant Suite</div>
          <h1 className="mt-4 max-w-xl text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Connexion securisee pour l’exploitation du restaurant
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">
            Authentifiez-vous pour acceder au stock, au point de vente, aux recettes, a la caisse et aux parametres
            selon votre role.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ['Stock fiable', 'Mouvements, pertes, alertes et seuils.'],
              ['POS rapide', 'Caisse, cuisine, livraison et encaissement.'],
              ['Acces controle', 'Roles, privileges et comptes equipe.']
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl bg-zinc-50 p-4">
                <div className="text-sm font-semibold text-zinc-900">{title}</div>
                <div className="mt-2 text-xs leading-6 text-zinc-500">{description}</div>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-soft backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-brand">Connexion</div>
          <h2 className="mt-3 text-2xl font-bold text-zinc-950">Acces equipe</h2>
          <p className="mt-2 text-sm text-zinc-500">Utilisez votre identifiant ou votre email et votre mot de passe.</p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">Identifiant</span>
              <input
                value={loginValue}
                onChange={(event) => setLoginValue(event.target.value)}
                placeholder="admin ou nom.utilisateur"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
              />
            </label>
          </div>

          {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
            Compte par defaut en dev: <span className="font-semibold text-zinc-700">admin / admin123</span>
          </div>
        </form>
      </div>
    </div>
  );
}
