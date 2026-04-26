import { useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { DeliveryStatus, OrderStatus, OrderType } from '../types/pos';
import { WorkspaceShell } from './WorkspaceShell';

type ReportsView = 'overview' | 'sales' | 'operations' | 'profit' | 'stock';

export function ReportsWorkspace() {
  const { setCurrentModule, dashboard, profitReport, stockRows } = usePosStore();
  const [view, setView] = useState<ReportsView>('overview');

  const lowStockCount = dashboard?.stockAlerts.length ?? 0;
  const totalSalesPeriod = profitReport?.totals.sales ?? 0;
  const averageHourlySales = useMemo(() => {
    if (!dashboard || dashboard.charts.salesByHour.length === 0) return 0;
    return (
      dashboard.charts.salesByHour.reduce((sum, row) => sum + row.totalSales, 0) / dashboard.charts.salesByHour.length
    );
  }, [dashboard]);

  const totalTrackedStock = useMemo(() => stockRows.length, [stockRows.length]);

  return (
    <WorkspaceShell
      title="Rapports & analyses"
      subtitle="Pilotage ventes, rentabilite, operations, pertes et stock pour mieux decider au quotidien."
      accent="linear-gradient(135deg, #111827, #334155)"
      icon="📊"
      sectionLabel="Module rapports"
      onBack={() => setCurrentModule('apps')}
      navigation={[
        { id: 'overview', label: 'Vue globale', hint: 'Direction & priorites' },
        { id: 'sales', label: 'Ventes', hint: 'CA, tickets, produits' },
        { id: 'operations', label: 'Operations', hint: 'Cuisine, caisse, livraison' },
        { id: 'profit', label: 'Rentabilite', hint: 'Marges & depenses' },
        { id: 'stock', label: 'Stock & pertes', hint: 'Consommation & alertes' }
      ]}
      activeView={view}
      onChangeView={(id) => setView(id as ReportsView)}
    >
      {!dashboard || !profitReport ? (
        <div className="rounded-2xl bg-white/90 px-6 py-16 text-center text-sm font-semibold text-zinc-500 shadow-soft">
          Chargement des rapports...
        </div>
      ) : null}

      {dashboard && profitReport && view === 'overview' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="CA aujourd'hui" value={formatMoney(dashboard.cards.totalSalesToday)} />
            <MetricCard label="Benefice aujourd'hui" value={formatMoney(dashboard.cards.profitToday)} />
            <MetricCard label="Ticket moyen" value={formatMoney(dashboard.cards.averageTicketToday)} />
            <MetricCard label="Commandes actives" value={String(dashboard.cards.activeOrders)} />
            <MetricCard label="Stock critique" value={String(lowStockCount)} />
            <MetricCard label="Pertes aujourd'hui" value={formatMoney(dashboard.cards.lossesToday)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Panel title="Tendance des ventes" eyebrow="7 derniers jours">
              <div className="space-y-4">
                {dashboard.charts.salesPerDay.map((day) => (
                  <BarRow
                    key={day.date}
                    label={day.date}
                    value={formatMoney(day.totalSales)}
                    hint={`${day.ordersCount} commandes`}
                    percent={(day.totalSales / Math.max(...dashboard.charts.salesPerDay.map((entry) => entry.totalSales), 1)) * 100}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Angles d'attention" eyebrow="Lecture direction">
              <div className="space-y-3">
                <InsightCard
                  label="Marge nette estimee"
                  value={`${safePercent((profitReport.totals.netProfit / Math.max(totalSalesPeriod, 1)) * 100)}%`}
                  tone={profitReport.totals.netProfit >= 0 ? 'good' : 'danger'}
                />
                <InsightCard
                  label="Retards cuisine"
                  value={`${dashboard.operations.delayedOrders} ticket(s)`}
                  tone={dashboard.operations.delayedOrders > 0 ? 'warn' : 'good'}
                />
                <InsightCard
                  label="Retards livraison"
                  value={`${dashboard.operations.delayedDeliveries} course(s)`}
                  tone={dashboard.operations.delayedDeliveries > 0 ? 'warn' : 'good'}
                />
                <InsightCard
                  label="Heure moyenne active"
                  value={formatMoney(averageHourlySales)}
                  tone="neutral"
                />
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Ventes par canal" eyebrow="Mix de service">
              <div className="space-y-3">
                {dashboard.charts.salesByType.map((row) => (
                  <SummaryLine
                    key={row.type}
                    label={formatType(row.type)}
                    value={formatMoney(row.totalSales)}
                    hint={`${row.ordersCount} commandes`}
                  />
                ))}
              </div>
            </Panel>
            <Panel title="Statuts commandes" eyebrow="Charge en cours">
              <div className="space-y-3">
                {dashboard.operations.statusBreakdown.map((row) => (
                  <SummaryLine key={row.status} label={formatStatus(row.status)} value={String(row.count)} />
                ))}
              </div>
            </Panel>
            <Panel title="Livraison" eyebrow="Performance canal">
              <div className="space-y-3">
                <SummaryLine label="CA livraison" value={formatMoney(dashboard.delivery.revenue)} />
                <SummaryLine label="Nombre de courses" value={String(dashboard.delivery.totalOrders)} />
                <SummaryLine label="Frais moyens" value={formatMoney(dashboard.delivery.averageFee)} />
              </div>
            </Panel>
          </div>
        </section>
      )}

      {dashboard && profitReport && view === 'sales' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="CA periode" value={formatMoney(profitReport.totals.sales)} />
            <MetricCard label="Ticket moyen periode" value={formatMoney(profitReport.totals.averageTicket)} />
            <MetricCard
              label="Canal dominant"
              value={formatType([...dashboard.charts.salesByType].sort((a, b) => b.totalSales - a.totalSales)[0]?.type ?? 'dine_in')}
            />
            <MetricCard label="Table active" value={String(dashboard.tables.activeDineInOrders)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Panel title="Meilleures ventes" eyebrow="Par produit">
              <div className="space-y-3">
                {dashboard.charts.topSellingProducts.map((product) => (
                  <SummaryCard
                    key={product.productId}
                    title={product.name}
                    meta={`${product.totalQuantity} vendus`}
                    value={formatMoney(product.revenue)}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Performance horaire" eyebrow="Aujourd'hui">
              <div className="space-y-4">
                {dashboard.charts.salesByHour.length === 0 ? (
                  <EmptyState text="Aucune vente aujourd'hui pour l'instant." />
                ) : (
                  dashboard.charts.salesByHour.map((hour) => (
                    <BarRow
                      key={hour.hour}
                      label={hour.hour}
                      value={formatMoney(hour.totalSales)}
                      hint={`${hour.ordersCount} commandes`}
                      percent={(hour.totalSales / Math.max(...dashboard.charts.salesByHour.map((entry) => entry.totalSales), 1)) * 100}
                    />
                  ))
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Panel title="Canaux de vente" eyebrow="Sur place, emporter, livraison">
              <div className="space-y-3">
                {dashboard.charts.salesByType.map((row) => (
                  <SummaryLine
                    key={row.type}
                    label={formatType(row.type)}
                    value={formatMoney(row.totalSales)}
                    hint={`${row.ordersCount} commandes`}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Tables les plus rentables" eyebrow="Sur place">
              <div className="space-y-3">
                {dashboard.tables.revenueByTable.length === 0 ? (
                  <EmptyState text="Aucune commande sur place encore enregistree." />
                ) : (
                  dashboard.tables.revenueByTable.map((table) => (
                    <SummaryLine
                      key={table.tableNumber}
                      label={`Table ${table.tableNumber}`}
                      value={formatMoney(table.totalSales)}
                      hint={`${table.ordersCount} commandes`}
                    />
                  ))
                )}
              </div>
            </Panel>
          </div>
        </section>
      )}

      {dashboard && profitReport && view === 'operations' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Prep. moyenne" value={`${dashboard.operations.averagePreparationMinutes.toFixed(1)} min`} />
            <MetricCard label="Paiement moyen" value={`${dashboard.operations.averagePaymentMinutes.toFixed(1)} min`} />
            <MetricCard label="Livraison moyenne" value={`${dashboard.operations.averageDeliveryMinutes.toFixed(1)} min`} />
            <MetricCard label="Retards cuisine" value={String(dashboard.operations.delayedOrders)} />
            <MetricCard label="Retards livraison" value={String(dashboard.operations.delayedDeliveries)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Charge par statut" eyebrow="Vision production">
              <div className="space-y-3">
                {dashboard.operations.statusBreakdown.map((row) => (
                  <SummaryLine key={row.status} label={formatStatus(row.status)} value={String(row.count)} />
                ))}
              </div>
            </Panel>

            <Panel title="Suivi livraison" eyebrow="Statuts de course">
              <div className="space-y-3">
                {dashboard.delivery.byStatus.map((row) => (
                  <SummaryLine key={row.status} label={formatDeliveryStatus(row.status)} value={String(row.count)} />
                ))}
              </div>
            </Panel>
          </div>
        </section>
      )}

      {dashboard && profitReport && view === 'profit' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="CA periode" value={formatMoney(profitReport.totals.sales)} />
            <MetricCard label="Cout matieres estime" value={formatMoney(profitReport.totals.estimatedCosts)} />
            <MetricCard label="Depenses" value={formatMoney(profitReport.totals.expenses)} />
            <MetricCard label="Pertes stock" value={formatMoney(profitReport.totals.losses)} />
            <MetricCard label="Benefice net estime" value={formatMoney(profitReport.totals.netProfit)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Panel title="Produits les plus rentables" eyebrow="Profit estime">
              <div className="space-y-3">
                {profitReport.margins.bestProducts.map((item) => (
                  <SummaryCard
                    key={item.productId}
                    title={item.name}
                    meta={`Marge ${safePercent(item.marginRate)}%`}
                    value={formatMoney(item.estimatedProfit)}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Produits a faible marge" eyebrow="A revoir">
              <div className="space-y-3">
                {profitReport.margins.weakestProducts.map((item) => (
                  <SummaryCard
                    key={item.productId}
                    title={item.name}
                    meta={`CA ${formatMoney(item.revenue)}`}
                    value={`${safePercent(item.marginRate)}%`}
                  />
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Depenses par categorie" eyebrow="Controle des couts">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {dashboard.financials.expensesByCategory.map((item) => (
                <div key={item.category} className="rounded-xl bg-zinc-50 px-4 py-3">
                  <div className="text-sm font-semibold text-zinc-900">{item.category}</div>
                  <div className="mt-2 text-lg font-bold text-zinc-950">{formatMoney(item.amount)}</div>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      )}

      {dashboard && profitReport && view === 'stock' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Articles suivis" value={String(totalTrackedStock)} />
            <MetricCard label="Stock critique" value={String(lowStockCount)} />
            <MetricCard label="Valeur stock" value={formatMoney(dashboard.stockInsights.stockValue)} />
            <MetricCard label="Pertes cumulees" value={formatMoney(dashboard.stockInsights.totalLossValue)} />
            <MetricCard label="Alertes actives" value={String(dashboard.stockAlerts.length)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Ingredients en alerte" eyebrow="Rupture a prevenir">
              <div className="space-y-3">
                {dashboard.stockAlerts.length === 0 ? (
                  <EmptyState text="Aucune alerte stock pour le moment." />
                ) : (
                  dashboard.stockAlerts.map((item) => (
                    <SummaryLine
                      key={item.ingredientId}
                      label={item.name}
                      value={item.currentStock.toFixed(2)}
                      hint={`Cout unitaire ${formatMoney(item.purchasePrice)}`}
                    />
                  ))
                )}
              </div>
            </Panel>

            <Panel title="Pertes par ingredient" eyebrow="Valeur perdue">
              <div className="space-y-3">
                {dashboard.stockInsights.lossesByIngredient.length === 0 ? (
                  <EmptyState text="Aucune perte enregistree pour le moment." />
                ) : (
                  dashboard.stockInsights.lossesByIngredient.map((item) => (
                    <SummaryCard
                      key={item.ingredientId}
                      title={item.name}
                      meta={`Quantite ${item.quantity.toFixed(2)}`}
                      value={formatMoney(item.value)}
                    />
                  ))
                )}
              </div>
            </Panel>
          </div>

          <Panel title="Consommation des matieres premieres" eyebrow="Sorties liees aux ventes">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {dashboard.stockInsights.topConsumedIngredients.map((item) => (
                <div key={item.ingredientId} className="rounded-xl bg-zinc-50 px-4 py-3">
                  <div className="text-sm font-semibold text-zinc-900">{item.name}</div>
                  <div className="mt-2 text-lg font-bold text-zinc-950">{item.quantity.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </Panel>
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

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">{eyebrow}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-950">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-zinc-900">{label}</div>
        {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
      </div>
      <div className="text-sm font-bold text-zinc-950">{value}</div>
    </div>
  );
}

function SummaryCard({ title, meta, value }: { title: string; meta: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{title}</div>
          <div className="mt-1 text-xs text-zinc-500">{meta}</div>
        </div>
        <div className="text-sm font-bold text-zinc-950">{value}</div>
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  hint,
  percent
}: {
  label: string;
  value: string;
  hint: string;
  percent: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-600 md:text-sm">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-3 rounded-full bg-zinc-100">
        <div className="h-3 rounded-full bg-brand" style={{ width: `${Math.max(8, percent)}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-zinc-500">{hint}</div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'danger' | 'neutral';
}) {
  const toneClass =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'bg-red-50 text-red-700'
          : 'bg-zinc-50 text-zinc-700';
  return (
    <div className={`rounded-xl px-4 py-3 ${toneClass}`}>
      <div className="text-xs uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-2 text-lg font-bold">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl bg-zinc-50 px-4 py-8 text-sm text-zinc-500">{text}</div>;
}

function safePercent(value: number) {
  if (!Number.isFinite(value)) return '0.0';
  return value.toFixed(1);
}

function formatType(type: OrderType) {
  switch (type) {
    case 'dine_in':
      return 'Sur place';
    case 'take_away':
      return 'A emporter';
    case 'delivery':
      return 'Livraison';
  }
}

function formatStatus(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'preparing':
      return 'En preparation';
    case 'ready':
      return 'Pret';
    case 'paid':
      return 'Paye';
    case 'cancelled':
      return 'Annule';
  }
}

function formatDeliveryStatus(status: DeliveryStatus) {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'on_the_way':
      return 'En route';
    case 'delivered':
      return 'Livree';
  }
}
