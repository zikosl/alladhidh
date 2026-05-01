import { useMemo, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { formatMoney } from '../lib/format';
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
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  const lowStockCount = inventoryItems.filter((item) => item.status !== 'in_stock').length;
  const activeOrders = dashboard?.cards.activeOrders ?? 0;
  const totalSales = dashboard?.cards.totalSalesToday ?? 0;
  const profit = dashboard?.cards.profitToday ?? 0;
  const stockValue = dashboard?.stockInsights.stockValue ?? 0;
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

  function moduleStat(moduleId: ModuleId) {
    switch (moduleId) {
      case 'inventory':
        return lowStockCount > 0 ? `${lowStockCount} alertes` : 'OK';
      case 'pos':
        return activeOrders > 0 ? `${activeOrders} actives` : 'Ouvrir';
      case 'recipes':
        return `${menuItems.length} menus`;
      case 'sales':
        return `${orders.length} tickets`;
      case 'reports':
        return 'Live';
      case 'finance':
        return 'Cash';
      case 'payroll':
        return 'Equipe';
      case 'settings':
        return 'Config';
      default:
        return 'OK';
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f0d0b] p-2.5 text-white shadow-[0_28px_80px_rgba(16,11,8,0.28)]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(233,50,24,0.22),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(247,201,40,0.16),transparent_28%)]" />
      <div className={collapsed ? 'grid gap-2 lg:grid-cols-[82px_minmax(0,1fr)]' : 'grid gap-2 lg:grid-cols-[260px_minmax(0,1fr)]'}>
        <aside className="rounded-[1.55rem] border border-white/10 bg-white/[0.045] p-2.5 backdrop-blur-xl lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center justify-between gap-2">
            <BrandLogo
              size={collapsed ? 42 : 50}
              showName={!collapsed}
              className="[&_div_div:first-child]:text-white [&_div_div:last-child]:text-amber-200"
            />
            <button
              onClick={() => setCollapsed((current) => !current)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/10 text-sm font-black text-white ring-1 ring-white/10"
              title={collapsed ? 'Elargir' : 'Reduire'}
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>

          <div className="mt-4 space-y-1.5">
            {visibleCards.map((card) => (
              <button
                key={card.id}
                onClick={() => setCurrentModule(card.id)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:scale-[1.015] hover:bg-white/10 ${
                  card.priority ? 'bg-white/10 ring-1 ring-amber-300/20' : 'bg-transparent'
                }`}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-lg text-white shadow-lg shadow-black/15"
                  style={{ background: card.accent }}
                >
                  {card.icon}
                </span>
                {!collapsed ? (
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black text-white">{card.title}</span>
                    <span className="block truncate text-[11px] font-semibold text-white/45">{card.hint}</span>
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className={`mt-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 ${collapsed ? 'hidden lg:block' : ''}`}>
            {!collapsed ? (
              <>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Profil</div>
                <div className="mt-1 truncate text-xs font-black text-white">{user?.fullName}</div>
                <div className="truncate text-[11px] font-semibold text-white/45">{user?.roleName}</div>
                <button onClick={logout} className="mt-3 w-full rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/10">
                  Deconnexion
                </button>
              </>
            ) : (
              <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-xs font-black text-white ring-1 ring-white/10">
                ⏻
              </button>
            )}
          </div>
        </aside>

        <main className="space-y-2.5">
          <TopBar
            search={search}
            onSearchChange={setSearch}
            alerts={lowStockCount + activeOrders}
            userName={user?.fullName ?? 'Admin'}
            roleName={user?.roleName ?? 'Admin'}
          />

          <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
            <section className="brand-hero relative overflow-hidden rounded-[1.7rem] p-5 text-white">
              <div className="relative max-w-3xl">
                <div className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-200">Restaurant command center</div>
                <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-white">Piloter le restaurant sans bruit</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/68">
                  Trois actions rapides, modules clairs, decisions visibles. Pense pour le rush, pas pour les menus caches.
                </p>
              </div>

              <div className="relative mt-5 flex flex-wrap gap-2">
                <button onClick={() => setCurrentModule('pos')} className="flame-button rounded-2xl px-4 py-3 text-sm font-black text-white transition hover:scale-[1.025]">
                  Ouvrir la caisse
                </button>
                <button onClick={() => setCurrentModule('inventory')} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:scale-[1.025] hover:bg-white/15">
                  Controler le stock
                </button>
                <button onClick={() => setCurrentModule('reports')} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:scale-[1.025] hover:bg-white/15">
                  Voir les rapports
                </button>
              </div>
            </section>

            <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <KpiCard label="CA periode" value={formatMoney(totalSales)} tone="green" hint="Ventes du jour" />
              <KpiCard label="Benefice" value={formatMoney(profit)} tone={profit >= 0 ? 'green' : 'red'} hint="Profit estime" />
              <KpiCard label="Valeur stock" value={formatMoney(stockValue)} tone="blue" hint="Stock valorise" />
              <KpiCard label="Alertes" value={String(lowStockCount)} tone={lowStockCount > 0 ? 'red' : 'green'} hint="Ruptures & stock bas" />
            </section>
          </div>

          <section className="rounded-[1.7rem] border border-white/10 bg-white/[0.045] p-3 backdrop-blur-xl">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200/70">Modules</div>
                <div className="mt-0.5 text-lg font-black tracking-[-0.03em] text-white">Acces rapide</div>
              </div>
              <div className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-black text-white/55 ring-1 ring-white/10">
                {filteredCards.length} module(s)
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {filteredCards.map((card) => (
                <ModuleCard
                  key={card.id}
                  card={card}
                  status={moduleStat(card.id)}
                  onOpen={() => setCurrentModule(card.id)}
                />
              ))}
              {filteredCards.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm font-semibold text-white/45 sm:col-span-2 2xl:col-span-4">
                  Aucun module ne correspond a la recherche.
                </div>
              ) : null}
            </div>
          </section>
        </main>
      </div>
    </section>
  );
}

function TopBar({
  search,
  onSearchChange,
  alerts,
  userName,
  roleName
}: {
  search: string;
  onSearchChange: (value: string) => void;
  alerts: number;
  userName: string;
  roleName: string;
}) {
  return (
    <header className="flex flex-col gap-2 rounded-[1.55rem] border border-white/10 bg-white/[0.045] p-2.5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl bg-black/25 px-3 ring-1 ring-white/10 focus-within:ring-amber-300/40">
        <span className="text-white/35">⌕</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rechercher un module..."
          className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/30"
        />
      </label>

      <div className="flex items-center gap-2">
        <button className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/8 text-lg ring-1 ring-white/10 transition hover:scale-105 hover:bg-white/12">
          🔔
          {alerts > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-black text-white">{alerts}</span> : null}
        </button>
        <div className="flex items-center gap-2 rounded-2xl bg-white/8 px-3 py-2 ring-1 ring-white/10">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-300 text-xs font-black text-zinc-950">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="max-w-[150px] truncate text-xs font-black text-white">{userName}</div>
            <div className="max-w-[150px] truncate text-[11px] font-semibold text-white/45">{roleName}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'green' | 'red' | 'blue';
}) {
  const toneClasses = {
    green: 'bg-emerald-400 shadow-emerald-500/20',
    red: 'bg-red-500 shadow-red-500/20',
    blue: 'bg-sky-400 shadow-sky-500/20'
  }[tone];

  return (
    <article className="rounded-[1.45rem] border border-white/10 bg-white/[0.07] p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.09]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{label}</div>
          <div className="mt-1 text-xl font-black tracking-[-0.04em] text-white">{value}</div>
          <div className="mt-1 text-[11px] font-semibold text-white/45">{hint}</div>
        </div>
        <span className={`mt-1 h-2.5 w-2.5 rounded-full shadow-lg ${toneClasses}`} />
      </div>
    </article>
  );
}

function ModuleCard({
  card,
  status,
  onOpen
}: {
  card: (typeof moduleCards)[number];
  status: string;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className={`group min-h-[168px] rounded-[1.45rem] border border-white/10 bg-white/[0.07] p-3.5 text-left shadow-[0_16px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:-translate-y-1 hover:scale-[1.01] hover:bg-white/[0.1] hover:shadow-[0_20px_52px_rgba(0,0,0,0.24)] ${
        card.priority ? 'ring-1 ring-amber-300/25' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl text-xl text-white shadow-lg shadow-black/20"
          style={{ background: card.accent }}
        >
          {card.icon}
        </div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-black text-white/65 ring-1 ring-white/10">
          {status}
        </span>
      </div>

      <div className="mt-4">
        <div className="text-base font-black tracking-[-0.03em] text-white">{card.title}</div>
        <div className="mt-0.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/70">{card.hint}</div>
        <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-white/45">{card.description}</p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <span className="text-xs font-bold text-white/35">Ouvrir</span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-black text-zinc-950 transition group-hover:translate-x-0.5">→</span>
      </div>
    </button>
  );
}
