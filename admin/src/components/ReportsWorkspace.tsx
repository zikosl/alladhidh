import { useEffect, useMemo, useState } from 'react';
import { fetchDashboard, fetchProfitReport } from '../lib/api';
import { formatMoney } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { DashboardData, DeliveryStatus, OrderStatus, OrderType, ProfitReport, ReportFilters } from '../types/pos';
import { WorkspaceShell } from './WorkspaceShell';

type ReportsView = 'overview' | 'sales' | 'operations' | 'profit' | 'stock';

export function ReportsWorkspace() {
  const { setCurrentModule, dashboard, profitReport, stockRows } = usePosStore();
  const [view, setView] = useState<ReportsView>('overview');
  const [filters, setFilters] = useState<ReportFilters>({ period: '7d' });
  const [reportDashboard, setReportDashboard] = useState<DashboardData | null>(dashboard);
  const [reportProfit, setReportProfit] = useState<ProfitReport | null>(profitReport);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setReportDashboard(dashboard);
  }, [dashboard]);

  useEffect(() => {
    setReportProfit(profitReport);
  }, [profitReport]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [nextDashboard, nextProfit] = await Promise.all([
          fetchDashboard(filters),
          fetchProfitReport(filters)
        ]);
        if (!cancelled) {
          setReportDashboard(nextDashboard);
          setReportProfit(nextProfit);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Impossible de charger les rapports', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const lowStockCount = reportDashboard?.stockAlerts.length ?? 0;
  const totalSalesPeriod = reportProfit?.totals.sales ?? 0;
  const averageHourlySales = useMemo(() => {
    if (!reportDashboard || reportDashboard.charts.salesByHour.length === 0) return 0;
    return (
      reportDashboard.charts.salesByHour.reduce((sum, row) => sum + row.totalSales, 0) / reportDashboard.charts.salesByHour.length
    );
  }, [reportDashboard]);

  const totalTrackedStock = useMemo(() => stockRows.length, [stockRows.length]);

  function exportCsv() {
    if (!reportDashboard || !reportProfit) return;
    const rows = [
      ['Section', 'Libelle', 'Valeur'],
      ['Synthese', 'CA periode', String(reportProfit.totals.sales)],
      ['Synthese', 'Benefice net apres paie', String(reportProfit.totals.netProfit)],
      ['Synthese', 'Benefice cash', String(reportProfit.totals.cashBenefit)],
      ['Synthese', 'Encaissements', String(reportProfit.totals.cashRevenue)],
      ['Synthese', 'Sorties cash', String(reportProfit.totals.cashOut)],
      ['Synthese', 'Charges depenses + paie', String(reportProfit.totals.expenses)],
      ['Synthese', 'Depenses operationnelles', String(reportDashboard.financials.expenseTotal)],
      ['Synthese', 'Paie constatee', String(reportProfit.totals.payroll)],
      ['Synthese', 'Pertes', String(reportProfit.totals.losses)],
      ...reportDashboard.charts.salesPerDay.map((row) => ['Ventes par jour', row.date, String(row.totalSales)]),
      ...reportDashboard.charts.topSellingProducts.map((row) => ['Top produit', row.name, String(row.revenue)]),
      ...reportDashboard.stockAlerts.map((row) => ['Stock critique', row.name, String(row.currentStock)])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-${filters.period}-${filters.dateFrom ?? ''}-${filters.dateTo ?? ''}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const activeDashboard = reportDashboard;
  const activeProfit = reportProfit;

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
      <section className="rounded-2xl bg-white/90 p-4 shadow-soft">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Filtres rapports</div>
            <div className="mt-1 text-sm text-zinc-500">Choisissez une periode de lecture et exportez le tableau de bord courant.</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[180px_160px_160px_auto]">
            <select
              value={filters.period}
              onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value as ReportFilters['period'] }))}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none"
            >
              <option value="today">Aujourd'hui</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="custom">Personnalise</option>
            </select>
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              disabled={filters.period !== 'custom'}
              onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none disabled:opacity-50"
            />
            <input
              type="date"
              value={filters.dateTo ?? ''}
              disabled={filters.period !== 'custom'}
              onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none disabled:opacity-50"
            />
            <button onClick={exportCsv} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {!activeDashboard || !activeProfit || loading ? (
        <div className="rounded-2xl bg-white/90 px-6 py-16 text-center text-sm font-semibold text-zinc-500 shadow-soft">
          Chargement des rapports...
        </div>
      ) : null}

      {activeDashboard && activeProfit && view === 'overview' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            <MetricCard label="CA periode" value={formatMoney(activeDashboard.cards.totalSalesToday)} />
            <MetricCard label="Benefice periode" value={formatMoney(activeDashboard.cards.profitToday)} />
            <MetricCard label="Benefice cash" value={formatMoney(activeDashboard.cards.cashBenefitToday)} />
            <MetricCard label="Ticket moyen" value={formatMoney(activeDashboard.cards.averageTicketToday)} />
            <MetricCard label="Commandes actives" value={String(activeDashboard.cards.activeOrders)} />
            <MetricCard label="Stock critique" value={String(lowStockCount)} />
            <MetricCard label="Pertes periode" value={formatMoney(activeDashboard.cards.lossesToday)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Panel title="Tendance des ventes" eyebrow="7 derniers jours">
              <div className="space-y-4">
                {activeDashboard.charts.salesPerDay.map((day) => (
                  <BarRow
                    key={day.date}
                    label={day.date}
                    value={formatMoney(day.totalSales)}
                    hint={`${day.ordersCount} commandes`}
                    percent={(day.totalSales / Math.max(...activeDashboard.charts.salesPerDay.map((entry) => entry.totalSales), 1)) * 100}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Angles d'attention" eyebrow="Lecture direction">
              <div className="space-y-3">
                <InsightCard
                  label="Marge nette estimee"
                  value={`${safePercent((activeProfit.totals.netProfit / Math.max(totalSalesPeriod, 1)) * 100)}%`}
                  tone={activeProfit.totals.netProfit >= 0 ? 'good' : 'danger'}
                />
                <InsightCard label="Evolution CA" value={`${safePercent(activeDashboard.cards.salesChangePct)}%`} tone={activeDashboard.cards.salesChangePct >= 0 ? 'good' : 'danger'} />
                <InsightCard label="Evolution profit" value={`${safePercent(activeDashboard.cards.profitChangePct)}%`} tone={activeDashboard.cards.profitChangePct >= 0 ? 'good' : 'danger'} />
                <InsightCard
                  label="Retards cuisine"
                  value={`${activeDashboard.operations.delayedOrders} ticket(s)`}
                  tone={activeDashboard.operations.delayedOrders > 0 ? 'warn' : 'good'}
                />
                <InsightCard
                  label="Heure moyenne active"
                  value={formatMoney(averageHourlySales)}
                  tone="neutral"
                />
              </div>
            </Panel>
          </div>

          <Panel title="Benefice cash par jour" eyebrow="Encaissements - sorties">
            <div className="space-y-4">
              {activeDashboard.charts.cashBenefitPerDay.map((day) => (
                <BarRow
                  key={day.date}
                  label={day.date}
                  value={formatMoney(day.cashBenefit)}
                  hint={`In ${formatMoney(day.cashIn)} / Out ${formatMoney(day.cashOut)}`}
                  percent={
                    (Math.abs(day.cashBenefit) /
                      Math.max(...activeDashboard.charts.cashBenefitPerDay.map((entry) => Math.abs(entry.cashBenefit)), 1)) *
                    100
                  }
                />
              ))}
              {activeDashboard.charts.cashBenefitPerDay.length === 0 ? <EmptyState text="Aucun mouvement cash sur cette periode." /> : null}
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Ventes par canal" eyebrow="Mix de service">
              <div className="space-y-3">
                {activeDashboard.charts.salesByType.map((row) => (
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
                {activeDashboard.operations.statusBreakdown.map((row) => (
                  <SummaryLine key={row.status} label={formatStatus(row.status)} value={String(row.count)} />
                ))}
              </div>
            </Panel>
            <Panel title="Livraison" eyebrow="Performance canal">
              <div className="space-y-3">
                <SummaryLine label="CA livraison" value={formatMoney(activeDashboard.delivery.revenue)} />
                <SummaryLine label="Nombre de courses" value={String(activeDashboard.delivery.totalOrders)} />
                <SummaryLine label="Frais moyens" value={formatMoney(activeDashboard.delivery.averageFee)} />
              </div>
            </Panel>
          </div>
        </section>
      )}

      {activeDashboard && activeProfit && view === 'sales' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="CA periode" value={formatMoney(activeProfit.totals.sales)} />
            <MetricCard label="Ticket moyen periode" value={formatMoney(activeProfit.totals.averageTicket)} />
            <MetricCard
              label="Canal dominant"
              value={formatType([...activeDashboard.charts.salesByType].sort((a, b) => b.totalSales - a.totalSales)[0]?.type ?? 'dine_in')}
            />
            <MetricCard label="Table active" value={String(activeDashboard.tables.activeDineInOrders)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Panel title="Meilleures ventes" eyebrow="Par produit">
              <div className="space-y-3">
                {activeDashboard.charts.topSellingProducts.map((product) => (
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
                {activeDashboard.charts.salesByHour.length === 0 ? (
                  <EmptyState text="Aucune vente aujourd'hui pour l'instant." />
                ) : (
                  activeDashboard.charts.salesByHour.map((hour) => (
                    <BarRow
                      key={hour.hour}
                      label={hour.hour}
                      value={formatMoney(hour.totalSales)}
                      hint={`${hour.ordersCount} commandes`}
                      percent={(hour.totalSales / Math.max(...activeDashboard.charts.salesByHour.map((entry) => entry.totalSales), 1)) * 100}
                    />
                  ))
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Panel title="Canaux de vente" eyebrow="Sur place, emporter, livraison">
              <div className="space-y-3">
                {activeDashboard.charts.salesByType.map((row) => (
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
                {activeDashboard.tables.revenueByTable.length === 0 ? (
                  <EmptyState text="Aucune commande sur place encore enregistree." />
                ) : (
                  activeDashboard.tables.revenueByTable.map((table) => (
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

      {activeDashboard && activeProfit && view === 'operations' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Prep. moyenne" value={`${activeDashboard.operations.averagePreparationMinutes.toFixed(1)} min`} />
            <MetricCard label="Paiement moyen" value={`${activeDashboard.operations.averagePaymentMinutes.toFixed(1)} min`} />
            <MetricCard label="Livraison moyenne" value={`${activeDashboard.operations.averageDeliveryMinutes.toFixed(1)} min`} />
            <MetricCard label="Retards cuisine" value={String(activeDashboard.operations.delayedOrders)} />
            <MetricCard label="Retards livraison" value={String(activeDashboard.operations.delayedDeliveries)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Charge par statut" eyebrow="Vision production">
              <div className="space-y-3">
                {activeDashboard.operations.statusBreakdown.map((row) => (
                  <SummaryLine key={row.status} label={formatStatus(row.status)} value={String(row.count)} />
                ))}
              </div>
            </Panel>

            <Panel title="Suivi livraison" eyebrow="Statuts de course">
              <div className="space-y-3">
                {activeDashboard.delivery.byStatus.map((row) => (
                  <SummaryLine key={row.status} label={formatDeliveryStatus(row.status)} value={String(row.count)} />
                ))}
              </div>
            </Panel>
          </div>
        </section>
      )}

      {activeDashboard && activeProfit && view === 'profit' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="CA periode" value={formatMoney(activeProfit.totals.sales)} />
            <MetricCard label="Cout matieres estime" value={formatMoney(activeProfit.totals.estimatedCosts)} />
            <MetricCard label="Charges dep. + paie" value={formatMoney(activeProfit.totals.expenses)} />
            <MetricCard label="Pertes stock" value={formatMoney(activeProfit.totals.losses)} />
            <MetricCard label="Benefice net apres paie" value={formatMoney(activeProfit.totals.netProfit)} />
            <MetricCard label="Benefice cash" value={formatMoney(activeProfit.totals.cashBenefit)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="Depenses operationnelles" value={formatMoney(activeDashboard.financials.manualExpenseTotal)} />
            <MetricCard label="Achats stock" value={formatMoney(activeDashboard.financials.stockPurchaseTotal)} />
            <MetricCard label="Paie constatee" value={formatMoney(activeProfit.totals.payroll)} />
            <MetricCard label="Paie payee" value={formatMoney(activeDashboard.financials.payrollPaidTotal)} />
            <MetricCard label="Avances payees" value={formatMoney(activeDashboard.financials.salaryAdvanceTotal)} />
            <MetricCard label="Reste paie" value={formatMoney(activeDashboard.financials.payrollOutstandingTotal)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Panel title="Produits les plus rentables" eyebrow="Profit estime">
              <div className="space-y-3">
                {activeProfit.margins.bestProducts.map((item) => (
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
                {activeProfit.margins.weakestProducts.map((item) => (
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
              {activeDashboard.financials.expensesByCategory.map((item) => (
                <div key={item.category} className="rounded-xl bg-zinc-50 px-4 py-3">
                  <div className="text-sm font-semibold text-zinc-900">{item.category}</div>
                  <div className="mt-2 text-lg font-bold text-zinc-950">{formatMoney(item.amount)}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Masse salariale par employe" eyebrow="Visibilite equipe">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {activeDashboard.financials.payrollByEmployee.map((item) => (
                <div key={item.employeeId} className="rounded-xl bg-zinc-50 px-4 py-3">
                  <div className="text-sm font-semibold text-zinc-900">{item.employeeName}</div>
                  <div className="mt-2 text-sm text-zinc-500">Total paie {formatMoney(item.payrollTotal)}</div>
                  <div className="mt-1 text-lg font-bold text-zinc-950">Paye {formatMoney(item.paidTotal)}</div>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      )}

      {activeDashboard && activeProfit && view === 'stock' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Articles suivis" value={String(totalTrackedStock)} />
            <MetricCard label="Stock critique" value={String(lowStockCount)} />
            <MetricCard label="Valeur stock" value={formatMoney(activeDashboard.stockInsights.stockValue)} />
            <MetricCard label="Pertes cumulees" value={formatMoney(activeDashboard.stockInsights.totalLossValue)} />
            <MetricCard label="Alertes actives" value={String(activeDashboard.stockAlerts.length)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Ingredients en alerte" eyebrow="Rupture a prevenir">
              <div className="space-y-3">
                {activeDashboard.stockAlerts.length === 0 ? (
                  <EmptyState text="Aucune alerte stock pour le moment." />
                ) : (
                  activeDashboard.stockAlerts.map((item) => (
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
                {activeDashboard.stockInsights.lossesByIngredient.length === 0 ? (
                  <EmptyState text="Aucune perte enregistree pour le moment." />
                ) : (
                  activeDashboard.stockInsights.lossesByIngredient.map((item) => (
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
              {activeDashboard.stockInsights.topConsumedIngredients.map((item) => (
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
