import { formatMoney } from '../lib/format';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { ModuleId } from '../types/pos';

const moduleCards: Array<{
  id: ModuleId;
  icon: string;
  title: string;
  description: string;
  accent: string;
}> = [
  {
    id: 'inventory',
    icon: '📦',
    title: 'Stock',
    description: 'Gerer les matieres premieres, les portions, les poids, les entrees et les alertes.',
    accent: 'linear-gradient(135deg, #155e75, #16a34a)'
  },
  {
    id: 'pos',
    icon: '🧾',
    title: 'Point de vente',
    description: 'Prendre des commandes, suivre la cuisine, encaisser et preparer les recus.',
    accent: 'linear-gradient(135deg, #d9481c, #fb923c)'
  },
  {
    id: 'recipes',
    icon: '🍔',
    title: 'Recettes / Menu',
    description: 'Construire les articles vendables depuis le stock avec cout, prix et marge.',
    accent: 'linear-gradient(135deg, #0f766e, #14b8a6)'
  },
  {
    id: 'sales',
    icon: '📋',
    title: 'Ventes / Commandes',
    description: 'Consulter les commandes actives, les paiements et l’historique recent.',
    accent: 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
  },
  {
    id: 'reports',
    icon: '📊',
    title: 'Statistiques / Rapports',
    description: 'Suivre les ventes, le profit estime, les meilleures ventes et les alertes stock.',
    accent: 'linear-gradient(135deg, #111827, #334155)'
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Parametres',
    description: 'Regler les parametres du restaurant, les equipes, les seuils et les options POS.',
    accent: 'linear-gradient(135deg, #64748b, #94a3b8)'
  }
];

export function ModuleLauncher() {
  const { setCurrentModule, inventoryItems, menuItems, orders, dashboard } = usePosStore();
  const { user, logout, hasPermission } = useAuthStore();

  const lowStockCount = inventoryItems.filter((item) => item.status !== 'in_stock').length;
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
      case 'settings':
        return hasPermission('settings.read', 'settings.write', 'staff.manage', 'roles.manage', 'tables.manage');
      default:
        return true;
    }
  });

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/60 bg-white/90 px-5 py-5 shadow-soft backdrop-blur md:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-brand">Apps</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 md:text-3xl">
              Tableau des modules
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-zinc-600">
              Une entree claire par module, avec des espaces de travail dedies comme dans un ERP moderne.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-zinc-950 px-4 py-3 text-white">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/70">Ventes du jour</div>
              <div className="mt-2 text-2xl font-bold">{formatMoney(dashboard?.cards.totalSalesToday ?? 0)}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Stock bas</div>
              <div className="mt-2 text-2xl font-bold text-zinc-950">{lowStockCount}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Menus</div>
              <div className="mt-2 text-2xl font-bold text-zinc-950">{menuItems.length}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
          <div className="text-sm text-zinc-600">
            Connecte en tant que <span className="font-semibold text-zinc-900">{user?.fullName}</span>
            {' '}• {user?.roleName}
          </div>
          <button onClick={() => void logout()} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-700">
            Deconnexion
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setCurrentModule(card.id)}
            className="rounded-2xl border border-white/60 bg-white/90 p-4 text-left shadow-soft transition hover:-translate-y-1"
          >
            <div
              className="inline-flex rounded-xl px-4 py-3 text-2xl text-white"
              style={{ background: card.accent }}
            >
              {card.icon}
            </div>
            <div className="mt-4 text-lg font-bold text-zinc-950">{card.title}</div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{card.description}</p>

            <div className="mt-5 flex items-center justify-between text-xs text-zinc-500">
              <span>
                {card.id === 'inventory' && `${inventoryItems.length} articles`}
                {card.id === 'recipes' && `${menuItems.length} menus`}
                {card.id === 'sales' && `${orders.length} commandes`}
                {card.id === 'reports' && `${dashboard?.cards.activeOrders ?? 0} actives`}
                {card.id === 'pos' && 'Service rapide'}
                {card.id === 'settings' && 'Configuration'}
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">Ouvrir</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
