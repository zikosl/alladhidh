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

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand">Livraison</div>
            <div className="text-sm font-black text-zinc-950">{deliveryOrders.length} course(s)</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[260px_150px]">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Client, tel, adresse..."
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none"
            />
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700">
              {statusFilter === 'all' ? 'Tous les statuts' : formatDeliveryStatus(statusFilter)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {deliveryOrders.map((order) => {
          const action = nextDeliveryAction(order.deliveryStatus);
          return (
            <article key={order.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-soft">
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
                <div className="font-black text-zinc-950">{order.customerName || 'Client livraison'}</div>
                <div className="mt-1">{order.phone}</div>
                <div className="mt-1 line-clamp-2">{order.address}</div>
              </div>

              <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-zinc-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1 text-xs font-semibold text-zinc-700">
                    <span className="truncate">{item.productName}</span>
                    <span className="font-black text-zinc-950">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-end">
                {action ? (
                  <button
                    onClick={() => setDeliveryOrderStatus(order.id, action.status)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-black ${action.className}`}
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
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 p-8 text-sm text-zinc-500 xl:col-span-2">
            Aucune livraison ne correspond aux filtres actifs.
          </div>
        )}
      </div>
    </section>
  );
}
