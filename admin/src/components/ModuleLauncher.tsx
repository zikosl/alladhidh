import { useMemo, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { ModuleId } from '../types/pos';
import { useTheme } from './ThemeProvider';

const moduleCards: Array<{
  id: ModuleId;
  icon: string;
  title: string;
  hint: string;
  description: string;
  accent: string;
  priority?: boolean;
}> = [
  {
    id: 'inventory',
    icon: '📦',
    title: 'Stock',
    hint: 'Matières & alertes',
    description: 'Entrées, pertes et ruptures critiques.',
    accent: 'linear-gradient(135deg, #155e75, #16a34a)'
  },
  {
    id: 'pos',
    icon: '🧾',
    title: 'Point de vente',
    hint: 'Commande rapide',
    description: 'Caisse, cuisine, paiement et livraison.',
    accent: 'linear-gradient(135deg, #d9481c, #fb923c)',
    priority: true
  },
  {
    id: 'recipes',
    icon: '🍔',
    title: 'Recettes',
    hint: 'Menu & marges',
    description: 'Articles vendables, coûts et prix.',
    accent: 'linear-gradient(135deg, #0f766e, #14b8a6)'
  },
  {
    id: 'sales',
    icon: '📋',
    title: 'Commandes',
    hint: 'Tickets & factures',
    description: 'Historique, annulations et impression.',
    accent: 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
  },
  {
    id: 'reports',
    icon: '📊',
    title: 'Rapports',
    hint: 'Ventes & profit',
    description: 'CA, marges, pertes et décisions.',
    accent: 'linear-gradient(135deg, #111827, #334155)'
  },
  {
    id: 'finance',
    icon: '💸',
    title: 'Finance',
    hint: 'Dépenses',
    description: 'Charges, achats stock et trésorerie.',
    accent: 'linear-gradient(135deg, #0f766e, #14b8a6)'
  },
  {
    id: 'payroll',
    icon: '👥',
    title: 'Paie',
    hint: 'Personnel',
    description: 'Avances, périodes et paiements staff.',
    accent: 'linear-gradient(135deg, #1d4ed8, #38bdf8)'
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Paramètres',
    hint: 'Accès & système',
    description: 'Rôles, tables, tickets et sécurité.',
    accent: 'linear-gradient(135deg, #64748b, #94a3b8)'
  }
];

export function ModuleLauncher() {
  const { setCurrentModule } = usePosStore();
  const { user, logout, hasPermission } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');

  const visibleCards = useMemo(
    () =>
      moduleCards.filter((card) => {
        switch (card.id) {
          case 'inventory':
            return hasPermission('inventory.read', 'inventory.write');
          case 'pos':
            return hasPermission('pos.use', 'pos.kitchen', 'pos.cashier', 'pos.delivery');
          case 'recipes':
            return hasPermission('recipes.read', 'recipes.write');
          case 'sales':
            return hasPermission('sales.read');
          case 'reports':
            return hasPermission('reports.read');
          case 'finance':
            return hasPermission('finance.read', 'finance.write');
          case 'payroll':
            return hasPermission('payroll.read', 'payroll.write');
          case 'settings':
            return hasPermission('settings.read', 'settings.write', 'staff.manage', 'roles.manage', 'tables.manage');
          default:
            return true;
        }
      }),
    [hasPermission]
  );

  const filteredCards = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return visibleCards;
    return visibleCards.filter((card) =>
      [card.title, card.hint, card.description].some((value) => value.toLowerCase().includes(needle))
    );
  }, [search, visibleCards]);

  const isDark = theme === 'dark';

  return (
    <section className="space-y-3">
      <div className="premium-panel overflow-hidden rounded-[2rem] p-3">
        <div className="brand-hero relative overflow-hidden rounded-[1.5rem] p-4 text-white">
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <BrandLogo size={58} showName className="[&_div_div:first-child]:text-white [&_div_div:last-child]:text-amber-200" />
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex min-h-10 w-full min-w-[220px] items-center gap-2 rounded-2xl bg-white/10 px-3 ring-1 ring-white/15 sm:w-auto">
                <span className="text-white/45">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un module..."
                  className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/40"
                />
              </label>
              <button onClick={toggleTheme} className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/15">
                {isDark ? 'Mode clair' : 'Mode sombre'}
              </button>
              <button onClick={logout} className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/15">
                Déconnexion
              </button>
            </div>
          </div>

          <div className="relative mt-6 max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-200">Modules restaurant</div>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-white">Piloter le restaurant sans bruit</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/68">
              Une page simple: ouvrez le module dont vous avez besoin et avancez sans chercher.
            </p>
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            <button onClick={() => setCurrentModule('pos')} className="flame-button rounded-2xl px-4 py-2.5 text-sm font-black text-white">
              Ouvrir la caisse
            </button>
            <button onClick={() => setCurrentModule('inventory')} className="clay-button rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/15">
              Contrôler le stock
            </button>
            <button onClick={() => setCurrentModule('reports')} className="clay-button rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/15">
              Voir les rapports
            </button>
          </div>

          <div className="relative mt-5 rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/65 ring-1 ring-white/15">
            Session: <span className="font-black text-white">{user?.fullName}</span> · {user?.roleName}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filteredCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setCurrentModule(card.id)}
            className={`premium-card module-card-glow group min-h-[148px] rounded-[1.6rem] p-3.5 text-left transition hover:-translate-y-1 hover:scale-[1.01] ${
              card.priority ? 'ring-2 ring-brand/20' : ''
            }`}
          >
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div
                className="grid h-11 w-11 place-items-center rounded-2xl text-xl text-white shadow-lg shadow-zinc-950/10"
                style={{ background: card.accent }}
              >
                {card.icon}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${isDark ? 'bg-white/10 text-white/70 ring-1 ring-white/10' : 'mesh-chip text-zinc-600'}`}>
                Ouvrir
              </span>
            </div>
            <div className="relative z-10 mt-4">
              <div className="text-base font-black tracking-[-0.02em] text-zinc-950">{card.title}</div>
              <div className="mt-0.5 text-xs font-black uppercase tracking-[0.16em] text-brand">{card.hint}</div>
              <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-zinc-500">{card.description}</p>
            </div>
            <div className="relative z-10 mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="text-xs font-bold text-zinc-400">Entrer</span>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-zinc-950 text-xs font-black text-white transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>
        ))}
        {filteredCards.length === 0 ? (
          <div className="premium-card rounded-[1.6rem] border-dashed p-8 text-center text-sm font-semibold text-zinc-500 sm:col-span-2 xl:col-span-4">
            Aucun module ne correspond à la recherche.
          </div>
        ) : null}
      </div>
    </section>
  );
}
