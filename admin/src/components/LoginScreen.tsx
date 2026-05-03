import { FormEvent, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { BRAND_NAME } from '../lib/brand';
import { AlertBanner } from './FeedbackProvider';
import { BrandLogo } from './BrandLogo';
import { useTheme } from './ThemeProvider';

export function LoginScreen() {
  const { login, loading, error, clearError } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
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
        <div className="flex justify-end lg:col-span-2">
          <button onClick={toggleTheme} className="mesh-chip rounded-full px-4 py-2 text-xs font-black text-zinc-600">
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
        </div>

        <section className="brand-hero relative overflow-hidden rounded-[2rem] p-8 text-white">
          <BrandLogo size={74} showName className="[&_div_div:first-child]:text-white [&_div_div:last-child]:text-amber-200" />
          <h1 className="mt-5 max-w-xl text-3xl font-black tracking-tight text-white md:text-4xl">
            Connexion simple pour gérer {BRAND_NAME}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
            Chaque membre voit seulement ses modules utiles: caisse, cuisine, stock, recettes, rapports ou administration.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ['Stock fiable', 'Mouvements, pertes, alertes et seuils.'],
              ['POS rapide', 'Caisse, cuisine, livraison et encaissement.'],
              ['Accès contrôlé', 'Rôles, privilèges et comptes équipe.']
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                <div className="text-sm font-semibold text-white">{title}</div>
                <div className="mt-2 text-xs leading-6 text-white/62">{description}</div>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="premium-panel rounded-[2rem] p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-brand">Connexion</div>
          <h2 className="mt-3 text-2xl font-bold text-zinc-950">Accès équipe</h2>
          <p className="mt-2 text-sm text-zinc-500">Utilisez votre identifiant ou votre email et votre mot de passe.</p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">Identifiant</span>
              <input
                value={loginValue}
                onChange={(event) => setLoginValue(event.target.value)}
                placeholder="admin ou nom.utilisateur"
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
              />
            </label>
          </div>

          {error ? <div className="mt-4"><AlertBanner title="Connexion refusée" message={error} tone="error" onClose={clearError} /></div> : null}

          <button
            type="submit"
            disabled={loading}
            className="flame-button mt-6 w-full rounded-2xl px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
            Compte par défaut en dev: <span className="font-semibold text-zinc-700">admin / admin123</span>
          </div>
        </form>
      </div>
    </div>
  );
}
