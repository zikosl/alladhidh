import { useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { WorkspaceShell } from './WorkspaceShell';

type ReportsView = 'overview' | 'profit' | 'stock';

export function ReportsWorkspace() {
  const { setCurrentModule, dashboard, profitReport, stockRows } = usePosStore();
  const [view, setView] = useState<ReportsView>('overview');

  const topStockValue = useMemo(
    () => [...stockRows].sort((left, right) => left.currentStock - right.currentStock).slice(0, 8),
    [stockRows]
  );

  const stockValuation = useMemo(
    () => stockRows.reduce((sum, row) => sum + row.currentStock * row.purchasePrice, 0),
    [stockRows]
  );

  const lowStockCount = useMemo(
    () => profitReport?.stockAlerts.length ?? dashboard?.stockAlerts.length ?? 0,
    [dashboard?.stockAlerts.length, profitReport?.stockAlerts.length]
  );

  return (
    <WorkspaceShell
      title="Rapports & analyses"
      subtitle="Suivez les ventes, la rentabilite, les produits performants et les niveaux de stock avec des donnees backend en direct."
      accent="linear-gradient(135deg, #111827, #334155)"
      icon="📊"
      sectionLabel="Module rapports"
      onBack={() => setCurrentModule('apps')}
      navigation={[
        { id: 'overview', label: 'Vue globale', hint: 'KPIs & tendances' },
        { id: 'profit', label: 'Profit', hint: 'Resultat & marges' },
        { id: 'stock', label: 'Stock', hint: 'Alertes & valorisation' }
      ]}
      activeView={view}
      onChangeView={(id) => setView(id as ReportsView)}
    >
      {view === 'overview' && dashboard && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Ventes du jour" value={formatMoney(dashboard.cards.totalSalesToday)} />
            <MetricCard label="Profit estime" value={formatMoney(profitReport?.totals.netProfit ?? dashboard.cards.profitToday)} />
            <MetricCard label="Commandes actives" value={String(dashboard.cards.activeOrders)} />
            <MetricCard label="Alertes stock" value={String(lowStockCount)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Tendance des ventes</div>
              <div className="mt-4 space-y-4">
                {dashboard.charts.salesPerDay.map((day) => (
                  <div key={day.date}>
                    <div className="mb-2 flex items-center justify-between text-xs text-zinc-600 md:text-sm">
                      <span>{day.date}</span>
                      <span>{formatMoney(day.totalSales)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-zinc-100">
                      <div
                        className="h-3 rounded-full bg-brand"
                        style={{
                          width: `${Math.max(
                            10,
                            (day.totalSales /
                              Math.max(...dashboard.charts.salesPerDay.map((entry) => entry.totalSales), 1)) *
                              100
                          )}%`
                        }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">{day.ordersCount} commandes</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Meilleures ventes</div>
              <div className="mt-4 space-y-3">
                {dashboard.charts.topSellingProducts.map((product) => (
                  <div key={product.productId} className="rounded-xl bg-zinc-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-zinc-900">{product.name}</div>
                      <div className="text-xs text-zinc-500">{product.totalQuantity} vendus</div>
                    </div>
                    <div className="mt-2 text-base font-bold text-zinc-950">{formatMoney(product.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {view === 'profit' && (
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Synthese profit</div>
              <div className="mt-5 space-y-4">
                <SummaryRow label="Chiffre d'affaires" value={formatMoney(profitReport?.totals.sales ?? dashboard?.cards.totalSalesToday ?? 0)} />
                <SummaryRow label="Profit net estime" value={formatMoney(profitReport?.totals.netProfit ?? dashboard?.cards.profitToday ?? 0)} />
                <SummaryRow label="Commandes ouvertes" value={String(profitReport?.totals.activeOrders ?? dashboard?.cards.activeOrders ?? 0)} />
              </div>
            </div>

            <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Lecture rapide</div>
              <div className="mt-4 space-y-3 text-sm text-zinc-600">
                <p>Les donnees de profit proviennent de l'endpoint backend dedie et restent synchronisees avec l'activite des commandes.</p>
                <p>Le stock critique est recoupe avec les alertes de matieres premieres pour aider a prioriser les achats.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Articles a risque</div>
            <div className="mt-4 space-y-3">
              {(profitReport?.stockAlerts ?? []).length === 0 ? (
                <div className="rounded-xl bg-emerald-50 px-4 py-5 text-sm font-medium text-emerald-700">
                  Aucun article critique pour le moment.
                </div>
              ) : (
                profitReport?.stockAlerts.map((item) => (
                  <div key={item.ingredientId} className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{item.name}</div>
                        <div className="mt-1 text-xs text-zinc-500">Stock restant: {item.currentStock.toFixed(2)}</div>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                        {formatMoney(item.purchasePrice)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {view === 'stock' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Articles suivis" value={String(stockRows.length)} />
            <MetricCard label="Stock critique" value={String(lowStockCount)} />
            <MetricCard label="Valorisation estimee" value={formatMoney(stockValuation)} />
          </div>

          <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Niveaux de stock</div>
                <div className="mt-2 text-sm text-zinc-500">Les lignes les plus basses remontent en premier pour accelerer les decisions d'achat.</div>
              </div>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Ingredient</th>
                    <th className="pb-3 pr-4 font-semibold">Stock</th>
                    <th className="pb-3 pr-4 font-semibold">Cout unitaire</th>
                    <th className="pb-3 font-semibold">Etat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {topStockValue.map((row) => {
                    const isAlert = (profitReport?.stockAlerts ?? []).some((item) => item.ingredientId === row.ingredientId);
                    return (
                      <tr key={row.ingredientId}>
                        <td className="py-4 pr-4 font-semibold text-zinc-900">{row.name}</td>
                        <td className="py-4 pr-4 text-zinc-600">{row.currentStock.toFixed(2)}</td>
                        <td className="py-4 pr-4 text-zinc-600">{formatMoney(row.purchasePrice)}</td>
                        <td className="py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isAlert ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isAlert ? 'A surveiller' : 'Correct'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </WorkspaceShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/90 p-4 shadow-soft">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-zinc-950">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-4 py-3">
      <span className="text-sm text-zinc-600">{label}</span>
      <span className="text-sm font-bold text-zinc-950">{value}</span>
    </div>
  );
}
