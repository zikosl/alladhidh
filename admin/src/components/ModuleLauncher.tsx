import { BrandLogo } from './BrandLogo';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { ModuleId } from '../types/pos';

const moduleCards: Array<{
  id: ModuleId;
  icon: string;
  title: string;
  hint: string;
  accent: string;
  priority?: boolean;
}> = [
  {
    id: 'inventory',
    icon: '📦',
    title: 'Stock',
    hint: 'Matieres & alertes',
    accent: 'linear-gradient(135deg, #155e75, #16a34a)'
  },
  {
    id: 'pos',
    icon: '🧾',
    title: 'Point de vente',
    hint: 'Commande rapide',
    accent: 'linear-gradient(135deg, #d9481c, #fb923c)',
    priority: true
  },
  {
    id: 'recipes',
    icon: '🍔',
    title: 'Recettes',
    hint: 'Menu & marges',
    accent: 'linear-gradient(135deg, #0f766e, #14b8a6)'
  },
  {
    id: 'sales',
    icon: '📋',
    title: 'Commandes',
    hint: 'Tickets & factures',
    accent: 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
  },
  {
    id: 'reports',
    icon: '📊',
    title: 'Rapports',
    hint: 'Ventes & profit',
    accent: 'linear-gradient(135deg, #111827, #334155)'
  },
  {
    id: 'finance',
    icon: '💸',
    title: 'Finance',
    hint: 'Depenses',
    accent: 'linear-gradient(135deg, #0f766e, #14b8a6)'
  },
  {
    id: 'payroll',
    icon: '👥',
    title: 'Paie',
    hint: 'Personnel',
    accent: 'linear-gradient(135deg, #1d4ed8, #38bdf8)'
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Parametres',
    hint: 'Acces & systeme',
    accent: 'linear-gradient(135deg, #64748b, #94a3b8)'
  }
];

export function ModuleLauncher() {
  const { setCurrentModule, inventoryItems, menuItems, orders, dashboard } = usePosStore();
  const { user, logout, hasPermission } = useAuthStore();

  const lowStockCount = inventoryItems.filter((item) => item.status !== 'in_stock').length;
  const activeOrders = dashboard?.cards.activeOrders ?? 0;
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
      <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <BrandLogo size={48} showName />
          <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 md:min-w-[300px]">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-900">{user?.fullName}</div>
              <div className="text-xs text-zinc-500">{user?.roleName}</div>
            </div>
            <button
              onClick={() => void logout()}
              className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-100"
            >
              Sortir
            </button>
          </div>
        </div>

      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setCurrentModule(card.id)}
            className={`group min-h-[112px] rounded-2xl border bg-white/90 p-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-zinc-300 ${
              card.priority ? 'border-zinc-900/25 ring-2 ring-zinc-950/5' : 'border-white/70'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl text-xl text-white"
                style={{ background: card.accent }}
              >
                {card.icon}
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {moduleStat(card.id)}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-base font-black text-zinc-950">{card.title}</div>
              <div className="mt-0.5 text-xs font-semibold text-zinc-500">{card.hint}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
