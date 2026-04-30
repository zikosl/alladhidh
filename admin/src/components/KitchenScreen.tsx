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

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand">Cuisine</div>
            <div className="text-sm font-black text-zinc-950">{filteredOrders.length} ticket(s)</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[230px_150px_auto]">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="#, table, client..."
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none"
            />
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700">
              {statusFilter === 'all' ? 'Tous les etats' : formatOrderStatus(statusFilter)}
            </div>
            <button onClick={() => void onRefresh()} className="rounded-xl bg-ink px-3 py-2 text-xs font-black text-white">
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
              className={`rounded-2xl border p-3 shadow-soft ${
                urgent ? 'border-red-300 bg-red-50' : 'border-white/60 bg-white/85'
              }`}
            >
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
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${urgent ? 'bg-red-600 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                  {age} min
                </span>
              </div>

              <div className="mt-3 text-sm font-black text-zinc-900">
                {order.tableNumber ? `Table ${order.tableNumber}` : order.customerName ?? 'Client'}
              </div>

              <div className="mt-3 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2">
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
                    className={`rounded-xl px-4 py-2 text-sm font-black ${action.className}`}
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
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 p-8 text-sm text-zinc-500 xl:col-span-3">
            Aucun ticket ne correspond aux filtres actifs.
          </div>
        )}
      </div>
    </section>
  );
}
