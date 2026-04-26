import { useMemo } from 'react';
import { usePosStore } from '../store/usePosStore';
import { Order, OrderType } from '../types/pos';
import { formatOrderStatus, formatOrderType } from '../lib/format';

function minutesSince(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function statusStyle(order: Order) {
  if (order.status === 'ready') return 'bg-emerald-500 text-white';
  if (order.status === 'preparing') return 'bg-sky-500 text-white';
  return 'bg-amber-400 text-zinc-950';
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

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Ecran cuisine</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">Tickets filtres par etat, type et urgence</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[260px_180px_auto]">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Rechercher #, table ou client..."
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none"
            />
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
              {statusFilter === 'all' ? 'Tous les etats' : formatOrderStatus(statusFilter)}
            </div>
            <button onClick={() => void onRefresh()} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">
              Rafraichir
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {filteredOrders.map((order) => {
          const age = minutesSince(order.createdAt);
          const urgent = age >= 15;

          return (
            <article
              key={order.id}
              className={`rounded-2xl border p-4 shadow-soft ${
                urgent ? 'border-red-300 bg-red-50' : 'border-white/60 bg-white/85'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Commande #{order.id}
                  </div>
                  <div className="mt-2 text-xl font-bold text-zinc-950">{formatOrderType(order.type)}</div>
                </div>
                <div className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusStyle(order)}`}>
                  {formatOrderStatus(order.status)}
                </div>
              </div>

              <div className="mt-4 text-base font-semibold text-zinc-900">
                {order.tableNumber ? `Table ${order.tableNumber}` : order.customerName ?? 'Client'}
              </div>

              <div className="mt-5 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2.5">
                    <div className="text-sm font-semibold text-zinc-900">{item.productName}</div>
                    <div className="text-lg font-bold text-zinc-950">x{item.quantity}</div>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="mt-4 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white">
                  Note : {order.notes}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between text-xs font-semibold md:text-sm">
                <span className={urgent ? 'text-red-600' : 'text-zinc-500'}>{age} min</span>
                {urgent && <span className="rounded-full bg-red-600 px-3 py-1 text-white">Urgent</span>}
              </div>

              <div className="mt-5 grid gap-2 md:grid-cols-2">
                <button
                  onClick={() => setKitchenStatus(order.id, 'preparing')}
                  className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white"
                >
                  En preparation
                </button>
                <button
                  onClick={() => setKitchenStatus(order.id, 'ready')}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white"
                >
                  Pret
                </button>
              </div>
            </article>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 p-8 text-sm text-zinc-500 xl:col-span-3">
            Aucun ticket ne correspond aux filtres actifs.
          </div>
        )}
      </div>
    </section>
  );
}
