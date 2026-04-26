import { useMemo } from 'react';
import { formatDeliveryStatus, formatMoney } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { DeliveryStatus } from '../types/pos';

const deliveryStatuses = [
  { value: 'pending', label: 'En attente' },
  { value: 'on_the_way', label: 'En route' },
  { value: 'delivered', label: 'Livre' }
] as const;

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
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Livraison</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">Suivi client, adresse et progression de course</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[280px_180px]">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Rechercher client, telephone ou adresse..."
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none"
            />
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
              {statusFilter === 'all' ? 'Tous les statuts' : formatDeliveryStatus(statusFilter)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {deliveryOrders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Commande #{order.id}
                </div>
                <div className="mt-2 text-xl font-bold text-zinc-950">{order.customerName}</div>
              </div>
              <div className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white md:text-sm">
                {formatDeliveryStatus(order.deliveryStatus)}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-zinc-600 md:text-sm">
              <div>{order.phone}</div>
              <div>{order.address}</div>
              <div>Frais : {formatMoney(order.deliveryFee)}</div>
            </div>

            <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1 text-xs text-zinc-700 md:text-sm">
                  <span>{item.productName}</span>
                  <span>x{item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-3">
              {deliveryStatuses.map((status) => (
                <button
                  key={status.value}
                  onClick={() => setDeliveryOrderStatus(order.id, status.value)}
                  className={`rounded-xl px-4 py-3 text-xs font-semibold md:text-sm ${
                    order.deliveryStatus === status.value ? 'bg-brand text-white' : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </article>
        ))}
        {deliveryOrders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 p-8 text-sm text-zinc-500 xl:col-span-2">
            Aucune livraison ne correspond aux filtres actifs.
          </div>
        )}
      </div>
    </section>
  );
}
