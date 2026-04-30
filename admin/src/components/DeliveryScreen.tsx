import { useMemo } from 'react';
import { formatDeliveryStatus, formatMoney } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { DeliveryStatus } from '../types/pos';
import { DeliveryStatusBadge, nextDeliveryAction, OrderStatusBadge } from './posUi';

interface DeliveryScreenProps {
  statusFilter: 'all' | DeliveryStatus;
  search: string;
  onSearchChange: (value: string) => void;
}

export function DeliveryScreen({ statusFilter, search, onSearchChange }: DeliveryScreenProps) {
  const { orders, setDeliveryOrderStatus } = usePosStore();

  const deliveryOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (order.type !== 'delivery') return false;
        const matchesStatus = statusFilter === 'all' || (order.deliveryStatus ?? 'pending') === statusFilter;
        const needle = search.trim().toLowerCase();
        const matchesSearch =
          !needle ||
          String(order.id).includes(needle) ||
          (order.customerName ?? '').toLowerCase().includes(needle) ||
          (order.phone ?? '').toLowerCase().includes(needle) ||
          (order.address ?? '').toLowerCase().includes(needle);
        return matchesStatus && matchesSearch;
      }),
    [orders, search, statusFilter]
  );
  const deliveryStats = useMemo(
    () => ({
      pending: deliveryOrders.filter((order) => (order.deliveryStatus ?? 'pending') === 'pending').length,
      onTheWay: deliveryOrders.filter((order) => order.deliveryStatus === 'on_the_way').length,
      delivered: deliveryOrders.filter((order) => order.deliveryStatus === 'delivered').length,
      total: deliveryOrders.reduce((sum, order) => sum + Number(order.totalPrice), 0)
    }),
    [deliveryOrders]
  );

  return (
    <section className="space-y-3">
      <div className="premium-panel p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand">Livraison</div>
            <div className="text-base font-black text-zinc-950">{deliveryOrders.length} course(s)</div>
            <p className="mt-0.5 text-[11px] font-bold text-zinc-500">Suivi simple: a preparer, en route, livree.</p>
          </div>
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-zinc-50 p-1.5 ring-1 ring-zinc-100">
            <DeliveryMetric label="Attente" value={deliveryStats.pending} tone="amber" />
            <DeliveryMetric label="Route" value={deliveryStats.onTheWay} tone="sky" />
            <DeliveryMetric label="Livrees" value={deliveryStats.delivered} tone="emerald" />
            <DeliveryMetric label="Total" value={formatMoney(deliveryStats.total)} tone="brand" />
          </div>
          <div className="grid gap-2 sm:grid-cols-[260px_150px]">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Client, tel, adresse..."
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
            <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700">
              {statusFilter === 'all' ? 'Tous les statuts' : formatDeliveryStatus(statusFilter)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {deliveryOrders.map((order) => {
          const action = nextDeliveryAction(order.deliveryStatus);
          return (
            <article key={order.id} className="premium-card p-3 transition hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    #{order.id}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <DeliveryStatusBadge status={order.deliveryStatus} />
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-zinc-500">Total</div>
                  <div className="text-lg font-black text-zinc-950">{formatMoney(order.totalPrice)}</div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-zinc-50 p-3 text-xs font-semibold text-zinc-600">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-black text-zinc-950">{order.customerName || 'Client livraison'}</div>
                  {order.phone && <a href={`tel:${order.phone}`} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-zinc-950 ring-1 ring-zinc-100">Appeler</a>}
                </div>
                <div className="mt-1">{order.phone}</div>
                <div className="mt-1 line-clamp-2">{order.address}</div>
              </div>

              <div className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-zinc-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-1 text-xs font-semibold text-zinc-700">
                    <span className="truncate">{item.productName}</span>
                    <span className="shrink-0 font-black text-zinc-950">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-end">
                {action ? (
                  <button
                    onClick={() => setDeliveryOrderStatus(order.id, action.status)}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-black shadow-soft transition hover:-translate-y-0.5 active:translate-y-0 ${action.className}`}
                  >
                    {action.label}
                  </button>
                ) : (
                  <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Course terminee</span>
                )}
              </div>
            </article>
          );
        })}
        {deliveryOrders.length === 0 && (
          <div className="premium-panel border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 xl:col-span-2">
            Aucune livraison ne correspond aux filtres actifs.
          </div>
        )}
      </div>
    </section>
  );
}

function DeliveryMetric({
  label,
  value,
  tone
}: {
  label: string;
  value: number | string;
  tone: 'amber' | 'sky' | 'emerald' | 'brand';
}) {
  const toneClasses = {
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    brand: 'bg-brand/10 text-brand ring-brand/15'
  }[tone];

  return (
    <div className={`rounded-xl px-2 py-1.5 text-center ring-1 ${toneClasses}`}>
      <div className="truncate text-sm font-black leading-none">{value}</div>
      <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em]">{label}</div>
    </div>
  );
}
