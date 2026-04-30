import { useMemo } from 'react';
import { usePosStore } from '../store/usePosStore';
import { OrderType } from '../types/pos';
import { formatOrderStatus } from '../lib/format';
import { nextKitchenAction, OrderStatusBadge, OrderTypeBadge } from './posUi';

function minutesSince(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

interface KitchenScreenProps {
  statusFilter: 'all' | 'pending' | 'preparing' | 'ready';
  typeFilter: 'all' | OrderType;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => Promise<void>;
}

export function KitchenScreen({ statusFilter, typeFilter, search, onSearchChange, onRefresh }: KitchenScreenProps) {
  const { kitchenOrders, setKitchenStatus } = usePosStore();
  const filteredOrders = useMemo(() => {
    return kitchenOrders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesType = typeFilter === 'all' || order.type === typeFilter;
      const needle = search.trim().toLowerCase();
      const matchesSearch =
        !needle ||
        String(order.id).includes(needle) ||
        (order.customerName ?? '').toLowerCase().includes(needle) ||
        (order.tableNumber ?? '').toLowerCase().includes(needle);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [kitchenOrders, search, statusFilter, typeFilter]);
  const kitchenStats = useMemo(
    () => ({
      pending: filteredOrders.filter((order) => order.status === 'pending').length,
      preparing: filteredOrders.filter((order) => order.status === 'preparing').length,
      ready: filteredOrders.filter((order) => order.status === 'ready').length,
      urgent: filteredOrders.filter((order) => minutesSince(order.createdAt) >= 15 && order.status !== 'ready').length
    }),
    [filteredOrders]
  );

  return (
    <section className="space-y-3">
      <div className="premium-panel p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand">Cuisine</div>
            <div className="text-base font-black text-zinc-950">{filteredOrders.length} ticket(s)</div>
            <p className="mt-0.5 text-[11px] font-bold text-zinc-500">Priorite aux tickets urgents et commandes en preparation.</p>
          </div>
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-zinc-50 p-1.5 ring-1 ring-zinc-100">
            <KitchenMetric label="Attente" value={kitchenStats.pending} tone="amber" />
            <KitchenMetric label="Prepa" value={kitchenStats.preparing} tone="sky" />
            <KitchenMetric label="Pretes" value={kitchenStats.ready} tone="emerald" />
            <KitchenMetric label="Urgent" value={kitchenStats.urgent} tone="red" />
          </div>
          <div className="grid gap-2 sm:grid-cols-[230px_150px_auto]">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="#, table, client..."
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
            <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700">
              {statusFilter === 'all' ? 'Tous les etats' : formatOrderStatus(statusFilter)}
            </div>
            <button onClick={() => void onRefresh()} className="rounded-2xl bg-ink px-3 py-2 text-xs font-black text-white shadow-soft transition hover:-translate-y-0.5 active:translate-y-0">
              Rafraichir
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {filteredOrders.map((order) => {
          const age = minutesSince(order.createdAt);
          const urgent = age >= 15;
          const action = nextKitchenAction(order.status);

          return (
            <article
              key={order.id}
              className={`premium-card relative overflow-hidden p-3 transition hover:-translate-y-0.5 ${
                urgent ? 'border-red-200 bg-red-50/95 ring-1 ring-red-200' : ''
              }`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-1.5 ${
                  urgent
                    ? 'bg-red-500'
                    : order.status === 'pending'
                      ? 'bg-amber-400'
                      : order.status === 'preparing'
                        ? 'bg-sky-500'
                        : 'bg-emerald-500'
                }`}
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    #{order.id}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <OrderTypeBadge type={order.type} />
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${urgent ? 'bg-red-600 text-white shadow-soft' : 'bg-zinc-100 text-zinc-600'}`}>
                  {age} min
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 text-sm font-black text-zinc-900">
                <span>
                {order.tableNumber ? `Table ${order.tableNumber}` : order.customerName ?? 'Client'}
                </span>
                <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-black text-white">
                  {order.items.reduce((total, item) => total + item.quantity, 0)} article(s)
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-zinc-100">
                    <div className="text-sm font-bold text-zinc-900">{item.productName}</div>
                    <div className="text-base font-black text-zinc-950">x{item.quantity}</div>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="mt-3 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-bold text-white">
                  Note : {order.notes}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-2">
                {urgent ? <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">Urgent</span> : <span />}
                {action ? (
                  <button
                    onClick={() => setKitchenStatus(order.id, action.status)}
                    className={`rounded-2xl px-4 py-2 text-sm font-black shadow-soft transition hover:-translate-y-0.5 active:translate-y-0 ${action.className}`}
                  >
                    {action.label}
                  </button>
                ) : (
                  <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">En attente retrait</span>
                )}
              </div>
            </article>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="premium-panel border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 xl:col-span-3">
            Aucun ticket ne correspond aux filtres actifs.
          </div>
        )}
      </div>
    </section>
  );
}

function KitchenMetric({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'sky' | 'emerald' | 'red' }) {
  const toneClasses = {
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    red: 'bg-red-50 text-red-700 ring-red-100'
  }[tone];

  return (
    <div className={`rounded-xl px-2 py-1.5 text-center ring-1 ${toneClasses}`}>
      <div className="text-sm font-black leading-none">{value}</div>
      <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em]">{label}</div>
    </div>
  );
}
