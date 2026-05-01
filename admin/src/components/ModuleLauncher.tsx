import { BrandLogo } from './BrandLogo';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { ModuleId } from '../types/pos';

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
    hint: 'Matieres & alertes',
    description: 'Entrees, pertes, valeur stock et ruptures critiques.',
    accent: 'linear-gradient(135deg, #512711, #f59e0b)'
  },
  {
    id: 'pos',
    icon: '🧾',
    title: 'Point de vente',
    hint: 'Commande rapide',
    description: 'Caisse, cuisine, paiement et livraison en flux court.',
    accent: 'linear-gradient(135deg, #ff3218, #ff7a18 58%, #ffd733)',
    priority: true
  },
  {
    id: 'recipes',
    icon: '🍔',
    title: 'Recettes',
    hint: 'Menu & marges',
    description: 'Produits vendables, couts recettes et prix de vente.',
    accent: 'linear-gradient(135deg, #7c1d12, #ff4b1f 58%, #ffcc2c)'
  },
  {
    id: 'sales',
    icon: '📋',
    title: 'Commandes',
    hint: 'Tickets & factures',
    description: 'Historique, annulations, suivi client et impression.',
    accent: 'linear-gradient(135deg, #35170b, #bd3b17 62%, #f59e0b)'
  },
  {
    id: 'reports',
    icon: '📊',
    title: 'Rapports',
    hint: 'Ventes & profit',
    description: 'CA, benefice cash, marges, pertes et decisions.',
    accent: 'linear-gradient(135deg, #110b07, #3b1c0d 58%, #b45309)'
  },
  {
    id: 'finance',
    icon: '💸',
    title: 'Finance',
    hint: 'Depenses',
    description: 'Journal cash, achats stock, salaires et charges.',
    accent: 'linear-gradient(135deg, #78350f, #f59e0b 62%, #ffd733)'
  },
  {
    id: 'payroll',
    icon: '👥',
    title: 'Paie',
    hint: 'Personnel',
    description: 'Profils, avances, periodes et paiements staff.',
    accent: 'linear-gradient(135deg, #1c1008, #a33116 58%, #ff7a18)'
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Parametres',
    hint: 'Acces & systeme',
    description: 'Roles, tables, ticket, branding et securite.',
    accent: 'linear-gradient(135deg, #3b2415, #7c2d12 58%, #facc15)'
  }
];

export function ModuleLauncher() {
  const { setCurrentModule } = usePosStore();
  const { user, logout, hasPermission } = useAuthStore();

  const visibleCards = moduleCards.filter((card) => {
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
  });

  return (
    <section className="space-y-3">
      <div className="premium-panel overflow-hidden rounded-[2rem] p-3">
        <div className="brand-hero relative overflow-hidden rounded-[1.5rem] p-4 text-white">
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-brand/30 blur-2xl" />
          <div className="absolute bottom-0 right-10 h-24 w-24 rounded-full bg-amber-300/25 blur-xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <BrandLogo size={58} showName className="[&_div_div:first-child]:text-white [&_div_div:last-child]:text-amber-200" />
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">Session active</div>
                <div className="mt-1 truncate text-sm font-black">{user?.fullName}</div>
                <div className="text-xs text-white/60">{user?.roleName}</div>
              </div>
              <button
                onClick={logout}
                className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/15"
              >
                Deconnexion
              </button>
            </div>
          </div>

          <div className="relative mt-6 max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-200">Restaurant command center</div>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-white">Piloter le restaurant sans bruit.</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/68">
              Acces rapide aux operations critiques: vente, cuisine, stock, finance, paie et rapports.
            </p>
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            <button onClick={() => setCurrentModule('pos')} className="flame-button rounded-2xl px-4 py-2.5 text-sm font-black text-white">
              Ouvrir la caisse
            </button>
            <button onClick={() => setCurrentModule('inventory')} className="clay-button rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/15">
              Controler le stock
            </button>
            <button onClick={() => setCurrentModule('reports')} className="clay-button rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/15">
              Voir les rapports
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setCurrentModule(card.id)}
            className={`premium-card module-card-glow group min-h-[148px] rounded-[1.6rem] p-3.5 text-left transition hover:-translate-y-1 ${
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
              <span className="mesh-chip rounded-full px-3 py-1 text-xs font-black text-zinc-600">Ouvrir</span>
            </div>
            <div className="relative z-10 mt-4">
              <div className="text-base font-black tracking-[-0.02em] text-zinc-950">{card.title}</div>
              <div className="mt-0.5 text-xs font-black uppercase tracking-[0.16em] text-brand">{card.hint}</div>
              <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-zinc-500">{card.description}</p>
            </div>
            <div className="relative z-10 mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="text-xs font-bold text-zinc-400">Ouvrir module</span>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-zinc-950 text-xs font-black text-white transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
