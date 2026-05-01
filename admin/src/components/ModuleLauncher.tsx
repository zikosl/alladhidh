import { useMemo, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { formatMoney } from '../lib/format';
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
  const { theme, toggleTheme } = useTheme();
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
        return lowStockCount > 0 ? `${lowStockCount} alertes` : 'Stable';
      case 'pos':
        return activeOrders > 0 ? `${activeOrders} actives` : 'Ouvrir';
      case 'recipes':
        return `${menuItems.length} menus`;
      case 'sales':
        return `${orders.length} tickets`;
      case 'reports':
        return 'Direct';
      case 'finance':
        return 'Tresorerie';
      case 'payroll':
        return 'Equipe';
      case 'settings':
        return 'Reglages';
      default:
        return 'Stable';
    }
  }

  const shellClass =
    theme === 'dark'
      ? 'border-white/10 bg-[#0f0d0b] text-white shadow-[0_28px_80px_rgba(16,11,8,0.28)]'
      : 'border-zinc-200/80 bg-white/78 text-zinc-950 shadow-[0_28px_80px_rgba(52,27,13,0.12)]';
  const panelClass =
    theme === 'dark'
      ? 'border-white/10 bg-white/[0.045] backdrop-blur-xl'
      : 'border-white/80 bg-white/78 backdrop-blur-xl';
  const mutedText = theme === 'dark' ? 'text-white/45' : 'text-zinc-500';

  return (
    <section className={`relative overflow-hidden rounded-[2rem] border p-2.5 ${shellClass}`}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(233,50,24,0.18),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(247,201,40,0.14),transparent_28%)]" />
      <div className={collapsed ? 'grid gap-2 lg:grid-cols-[82px_minmax(0,1fr)]' : 'grid gap-2 lg:grid-cols-[260px_minmax(0,1fr)]'}>
        <aside className={`rounded-[1.55rem] border p-2.5 lg:sticky lg:top-4 lg:self-start ${panelClass}`}>
          <div className="flex items-center justify-between gap-2">
            <BrandLogo
              size={collapsed ? 42 : 50}
              showName={!collapsed}
              className={theme === 'dark' ? '[&_div_div:first-child]:text-white [&_div_div:last-child]:text-amber-200' : ''}
            />
            <button
              onClick={() => setCollapsed((current) => !current)}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-sm font-black ring-1 transition ${
                theme === 'dark' ? 'bg-white/10 text-white ring-white/10' : 'bg-zinc-950 text-white ring-zinc-950'
              }`}
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
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:scale-[1.015] ${
                  theme === 'dark'
                    ? `hover:bg-white/10 ${card.priority ? 'bg-white/10 ring-1 ring-amber-300/20' : 'bg-transparent'}`
                    : `hover:bg-zinc-950/5 ${card.priority ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-transparent'}`
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
                    <span className={`block truncate text-xs font-black ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>{card.title}</span>
                    <span className={`block truncate text-[11px] font-semibold ${mutedText}`}>{card.hint}</span>
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className={`mt-4 rounded-2xl p-3 ring-1 ${theme === 'dark' ? 'bg-white/5 ring-white/10' : 'bg-white/70 ring-zinc-200/70'} ${collapsed ? 'hidden lg:block' : ''}`}>
            {!collapsed ? (
              <>
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/35' : 'text-zinc-400'}`}>Profil</div>
                <div className={`mt-1 truncate text-xs font-black ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>{user?.fullName}</div>
                <div className={`truncate text-[11px] font-semibold ${mutedText}`}>{user?.roleName}</div>
                <button onClick={logout} className={`mt-3 w-full rounded-xl px-3 py-2 text-xs font-black ring-1 ${theme === 'dark' ? 'bg-white/10 text-white ring-white/10' : 'bg-zinc-950 text-white ring-zinc-950'}`}>
                  Deconnexion
                </button>
              </>
            ) : (
              <button onClick={logout} className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-black ring-1 ${theme === 'dark' ? 'bg-white/10 text-white ring-white/10' : 'bg-zinc-950 text-white ring-zinc-950'}`}>
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
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
            <section className="brand-hero relative overflow-hidden rounded-[1.7rem] p-5 text-white">
              <div className="relative max-w-3xl">
                <div className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-200">Centre de commande restaurant</div>
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
              <KpiCard label="CA periode" value={formatMoney(totalSales)} tone="green" hint="Ventes du jour" theme={theme} />
              <KpiCard label="Benefice" value={formatMoney(profit)} tone={profit >= 0 ? 'green' : 'red'} hint="Profit estime" theme={theme} />
              <KpiCard label="Valeur stock" value={formatMoney(stockValue)} tone="blue" hint="Stock valorise" theme={theme} />
              <KpiCard label="Alertes" value={String(lowStockCount)} tone={lowStockCount > 0 ? 'red' : 'green'} hint="Ruptures & stock bas" theme={theme} />
            </section>
          </div>

          <section className={`rounded-[1.7rem] border p-3 backdrop-blur-xl ${panelClass}`}>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">Modules</div>
                <div className={`mt-0.5 text-lg font-black tracking-[-0.03em] ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>Acces rapide</div>
              </div>
              <div className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 ${theme === 'dark' ? 'bg-white/5 text-white/55 ring-white/10' : 'bg-white/70 text-zinc-500 ring-zinc-200/70'}`}>
                {filteredCards.length} module(s)
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {filteredCards.map((card) => (
                <ModuleCard
                  key={card.id}
                  card={card}
                  status={moduleStat(card.id)}
                  theme={theme}
                  onOpen={() => setCurrentModule(card.id)}
                />
              ))}
              {filteredCards.length === 0 ? (
                <div className={`rounded-3xl border border-dashed p-8 text-center text-sm font-semibold sm:col-span-2 2xl:col-span-4 ${theme === 'dark' ? 'border-white/15 bg-white/[0.03] text-white/45' : 'border-zinc-200 bg-white/70 text-zinc-500'}`}>
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
  roleName,
  theme,
  onToggleTheme
}: {
  search: string;
  onSearchChange: (value: string) => void;
  alerts: number;
  userName: string;
  roleName: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const isDark = theme === 'dark';

  return (
    <header className={`flex flex-col gap-2 rounded-[1.55rem] border p-2.5 backdrop-blur-xl md:flex-row md:items-center md:justify-between ${isDark ? 'border-white/10 bg-white/[0.045]' : 'border-white/80 bg-white/78'}`}>
      <label className={`flex min-h-11 flex-1 items-center gap-2 rounded-2xl px-3 ring-1 focus-within:ring-amber-300/50 ${isDark ? 'bg-black/25 ring-white/10' : 'bg-white ring-zinc-200'}`}>
        <span className={isDark ? 'text-white/35' : 'text-zinc-400'}>⌕</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rechercher un module..."
          className={`w-full bg-transparent text-sm font-semibold outline-none ${isDark ? 'text-white placeholder:text-white/30' : 'text-zinc-950 placeholder:text-zinc-400'}`}
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleTheme}
          className={`grid h-11 min-w-11 place-items-center rounded-2xl px-3 text-xs font-black ring-1 transition hover:scale-105 ${isDark ? 'bg-white/8 text-white ring-white/10 hover:bg-white/12' : 'bg-zinc-950 text-white ring-zinc-950 hover:bg-zinc-800'}`}
          title={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
        >
          {isDark ? 'Clair' : 'Sombre'}
        </button>
        <button className={`relative grid h-11 w-11 place-items-center rounded-2xl text-lg ring-1 transition hover:scale-105 ${isDark ? 'bg-white/8 ring-white/10 hover:bg-white/12' : 'bg-white text-zinc-950 ring-zinc-200 hover:bg-zinc-50'}`}>
          🔔
          {alerts > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-black text-white">{alerts}</span> : null}
        </button>
        <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 ring-1 ${isDark ? 'bg-white/8 ring-white/10' : 'bg-white ring-zinc-200'}`}>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-300 text-xs font-black text-zinc-950">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className={`max-w-[150px] truncate text-xs font-black ${isDark ? 'text-white' : 'text-zinc-950'}`}>{userName}</div>
            <div className={`max-w-[150px] truncate text-[11px] font-semibold ${isDark ? 'text-white/45' : 'text-zinc-500'}`}>{roleName}</div>
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
  tone,
  theme
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'green' | 'red' | 'blue';
  theme: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  const toneClasses = {
    green: 'bg-emerald-400 shadow-emerald-500/20',
    red: 'bg-red-500 shadow-red-500/20',
    blue: 'bg-sky-400 shadow-sky-500/20'
  }[tone];

  return (
    <article className={`rounded-[1.45rem] border p-3.5 backdrop-blur-xl transition hover:-translate-y-0.5 ${isDark ? 'border-white/10 bg-white/[0.07] shadow-[0_16px_40px_rgba(0,0,0,0.18)] hover:bg-white/[0.09]' : 'border-white/80 bg-white/78 shadow-soft hover:bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-[10px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-white/35' : 'text-zinc-400'}`}>{label}</div>
          <div className={`mt-1 text-xl font-black tracking-[-0.04em] ${isDark ? 'text-white' : 'text-zinc-950'}`}>{value}</div>
          <div className={`mt-1 text-[11px] font-semibold ${isDark ? 'text-white/45' : 'text-zinc-500'}`}>{hint}</div>
        </div>
        <span className={`mt-1 h-2.5 w-2.5 rounded-full shadow-lg ${toneClasses}`} />
      </div>
    </article>
  );
}

function ModuleCard({
  card,
  status,
  theme,
  onOpen
}: {
  card: (typeof moduleCards)[number];
  status: string;
  theme: 'light' | 'dark';
  onOpen: () => void;
}) {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onOpen}
      className={`group min-h-[168px] rounded-[1.45rem] border p-3.5 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:scale-[1.01] ${
        isDark
          ? 'border-white/10 bg-white/[0.07] shadow-[0_16px_40px_rgba(0,0,0,0.16)] hover:bg-white/[0.1] hover:shadow-[0_20px_52px_rgba(0,0,0,0.24)]'
          : 'border-white/80 bg-white/78 shadow-soft hover:bg-white'
      } ${card.priority ? 'ring-1 ring-amber-300/25' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl text-xl text-white shadow-lg shadow-black/20"
          style={{ background: card.accent }}
        >
          {card.icon}
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${isDark ? 'bg-white/8 text-white/65 ring-white/10' : 'bg-zinc-50 text-zinc-600 ring-zinc-200'}`}>
          {status}
        </span>
      </div>

      <div className="mt-4">
        <div className={`text-base font-black tracking-[-0.03em] ${isDark ? 'text-white' : 'text-zinc-950'}`}>{card.title}</div>
        <div className="mt-0.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-500">{card.hint}</div>
        <p className={`mt-2 line-clamp-2 text-xs font-medium leading-5 ${isDark ? 'text-white/45' : 'text-zinc-500'}`}>{card.description}</p>
      </div>

      <div className={`mt-4 flex items-center justify-between border-t pt-3 ${isDark ? 'border-white/10' : 'border-zinc-100'}`}>
        <span className={`text-xs font-bold ${isDark ? 'text-white/35' : 'text-zinc-400'}`}>Ouvrir</span>
        <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black transition group-hover:translate-x-0.5 ${isDark ? 'bg-white text-zinc-950' : 'bg-zinc-950 text-white'}`}>→</span>
      </div>
    </button>
  );
}
