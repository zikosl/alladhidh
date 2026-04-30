import { BrandLogo } from './BrandLogo';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { ModuleId } from '../types/pos';
import { formatMoney } from '../lib/format';

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
    accent: 'linear-gradient(135deg, #155e75, #16a34a)'
  },
  {
    id: 'pos',
    icon: '🧾',
    title: 'Point de vente',
    hint: 'Commande rapide',
    description: 'Caisse, cuisine, paiement et livraison en flux court.',
    accent: 'linear-gradient(135deg, #d9481c, #fb923c)',
    priority: true
  },
  {
    id: 'recipes',
    icon: '🍔',
    title: 'Recettes',
    hint: 'Menu & marges',
    description: 'Produits vendables, couts recettes et prix de vente.',
    accent: 'linear-gradient(135deg, #0f766e, #14b8a6)'
  },
  {
    id: 'sales',
    icon: '📋',
    title: 'Commandes',
    hint: 'Tickets & factures',
    description: 'Historique, annulations, suivi client et impression.',
    accent: 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
  },
  {
    id: 'reports',
    icon: '📊',
    title: 'Rapports',
    hint: 'Ventes & profit',
    description: 'CA, benefice cash, marges, pertes et decisions.',
    accent: 'linear-gradient(135deg, #111827, #334155)'
  },
  {
    id: 'finance',
    icon: '💸',
    title: 'Finance',
    hint: 'Depenses',
    description: 'Journal cash, achats stock, salaires et charges.',
    accent: 'linear-gradient(135deg, #0f766e, #14b8a6)'
  },
  {
    id: 'payroll',
    icon: '👥',
    title: 'Paie',
    hint: 'Personnel',
    description: 'Profils, avances, periodes et paiements staff.',
    accent: 'linear-gradient(135deg, #1d4ed8, #38bdf8)'
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Parametres',
    hint: 'Acces & systeme',
    description: 'Roles, tables, ticket, branding et securite.',
    accent: 'linear-gradient(135deg, #64748b, #94a3b8)'
  }
];

export function ModuleLauncher() {
  const { setCurrentModule, inventoryItems, menuItems, orders, dashboard } = usePosStore();
  const { user, logout, hasPermission } = useAuthStore();

  const lowStockCount = inventoryItems.filter((item) => item.status !== 'in_stock').length;
  const activeOrders = dashboard?.cards.activeOrders ?? 0;
  const cashBenefit = dashboard?.financials.cashBenefitTotal ?? 0;
  const sales = dashboard?.cards.totalSalesToday ?? 0;
  const stockValue = dashboard?.stockInsights.stockValue ?? 0;
  const urgentSignal = lowStockCount + activeOrders;
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

  function moduleStat(moduleId: ModuleId) {
    switch (moduleId) {
      case 'inventory':
        return lowStockCount > 0 ? `${lowStockCount} alertes` : 'OK';
      case 'pos':
        return 'Ouvrir';
      case 'recipes':
        return `${menuItems.length} menus`;
      case 'sales':
        return `${orders.length} tickets`;
      case 'reports':
        return `${activeOrders} actives`;
      case 'finance':
        return 'Charges';
      case 'payroll':
        return 'Salaires';
      case 'settings':
        return 'Config';
      default:
        return '';
    }
  }

  return (
    <section className="space-y-3">
      <div className="premium-panel overflow-hidden rounded-[2rem] p-3">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-[1.5rem] bg-zinc-950 p-4 text-white">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-brand/30 blur-2xl" />
            <div className="absolute bottom-0 right-10 h-24 w-24 rounded-full bg-amber-300/25 blur-xl" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <BrandLogo size={58} showName className="[&_div_div:first-child]:text-white [&_div_div:last-child]:text-amber-200" />
              <div className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">Session active</div>
                <div className="mt-1 truncate text-sm font-black">{user?.fullName}</div>
                <div className="text-xs text-white/60">{user?.roleName}</div>
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
              <button onClick={() => setCurrentModule('pos')} className="rounded-2xl bg-brand px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-brand/20">
                Ouvrir la caisse
              </button>
              <button onClick={() => setCurrentModule('inventory')} className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/15">
                Controler le stock
              </button>
              <button onClick={() => setCurrentModule('reports')} className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/15">
                Voir les rapports
              </button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
            <CommandMetric label="CA periode" value={formatMoney(sales)} hint="Ventes suivies" tone="hot" />
            <CommandMetric label="Benefice cash" value={formatMoney(cashBenefit)} hint="Encaissements - sorties" tone={cashBenefit >= 0 ? 'good' : 'risk'} />
            <CommandMetric label="Valeur stock" value={formatMoney(stockValue)} hint={`${lowStockCount} alerte(s) stock`} tone="stock" />
            <div className="rounded-2xl border border-zinc-100 bg-white/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Priorite</div>
                  <div className="mt-1 text-sm font-black text-zinc-950">{urgentSignal > 0 ? `${urgentSignal} action(s)` : 'Tout est calme'}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${urgentSignal > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {urgentSignal > 0 ? 'A suivre' : 'OK'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setCurrentModule(card.id)}
            className={`premium-card group min-h-[148px] rounded-[1.6rem] p-3.5 text-left transition hover:-translate-y-1 ${
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
              <span className="mesh-chip rounded-full px-3 py-1 text-xs font-black text-zinc-600">
                {moduleStat(card.id)}
              </span>
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

function CommandMetric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: 'hot' | 'good' | 'risk' | 'stock' }) {
  const toneClass = {
    hot: 'from-orange-50 to-white text-brand',
    good: 'from-emerald-50 to-white text-emerald-700',
    risk: 'from-red-50 to-white text-red-700',
    stock: 'from-sky-50 to-white text-sky-700'
  }[tone];

  return (
    <article className={`rounded-2xl border border-zinc-100 bg-gradient-to-br ${toneClass} px-3 py-2.5`}>
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">{label}</div>
      <div className="mt-1 text-lg font-black tracking-[-0.03em]">{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-zinc-500">{hint}</div>
    </article>
  );
}
