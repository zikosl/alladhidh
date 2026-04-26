import { usePosStore } from '../store/usePosStore';
import { formatMoney } from '../lib/format';

export function AdminScreen() {
  const { dashboard } = usePosStore();

  if (!dashboard) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] bg-white/85 p-5 shadow-soft">
          <div className="text-xs text-zinc-500 md:text-sm">Ventes du jour</div>
          <div className="mt-3 text-3xl font-black text-zinc-950 md:text-4xl">
            {formatMoney(dashboard.cards.totalSalesToday)}
          </div>
        </div>
        <div className="rounded-[28px] bg-white/85 p-5 shadow-soft">
          <div className="text-xs text-zinc-500 md:text-sm">Profit</div>
          <div className="mt-3 text-3xl font-black text-zinc-950 md:text-4xl">
            {formatMoney(dashboard.cards.profitToday)}
          </div>
        </div>
        <div className="rounded-[28px] bg-white/85 p-5 shadow-soft">
          <div className="text-xs text-zinc-500 md:text-sm">Commandes actives</div>
          <div className="mt-3 text-3xl font-black text-zinc-950 md:text-4xl">{dashboard.cards.activeOrders}</div>
        </div>
        <div className="rounded-[28px] bg-white/85 p-5 shadow-soft">
          <div className="text-xs text-zinc-500 md:text-sm">Alertes stock bas</div>
          <div className="mt-3 text-3xl font-black text-zinc-950 md:text-4xl">{dashboard.cards.lowStockAlerts}</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] bg-white/85 p-5 shadow-soft">
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Ventes par jour</div>
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
                      width: `${Math.max(10, (day.totalSales / Math.max(...dashboard.charts.salesPerDay.map((entry) => entry.totalSales), 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] bg-white/85 p-5 shadow-soft">
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Produits les plus vendus</div>
          <div className="mt-4 space-y-3">
            {dashboard.charts.topSellingProducts.map((product) => (
              <div key={product.productId} className="rounded-3xl bg-zinc-50 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900">{product.name}</div>
                  <div className="text-xs text-zinc-500 md:text-sm">{product.totalQuantity} vendus</div>
                </div>
                <div className="mt-2 text-base font-bold text-zinc-950 md:text-lg">{formatMoney(product.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
