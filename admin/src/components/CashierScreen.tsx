import { useMemo } from 'react';
import { formatMoney, formatOrderType } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { OrderType } from '../types/pos';
import { OrderStatusBadge, OrderTypeBadge } from './posUi';

interface CashierScreenProps {
  statusFilter: 'all' | 'pending' | 'preparing' | 'ready' | 'paid';
  typeFilter: 'all' | OrderType;
  search: string;
  onSearchChange: (value: string) => void;
}

export function CashierScreen({ statusFilter, typeFilter, search, onSearchChange }: CashierScreenProps) {
  const { orders, payOrder } = usePosStore();

  const activeOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesStatus = statusFilter === 'all' ? order.status === 'ready' : order.status === statusFilter;
        const matchesType = typeFilter === 'all' || order.type === typeFilter;
        const needle = search.trim().toLowerCase();
        const matchesSearch =
          !needle ||
          String(order.id).includes(needle) ||
          (order.customerName ?? '').toLowerCase().includes(needle) ||
          (order.tableNumber ?? '').toLowerCase().includes(needle);
        return matchesStatus && matchesType && matchesSearch;
      }),
    [orders, search, statusFilter, typeFilter]
  );

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand">Caisse</div>
            <div className="text-sm font-black text-zinc-950">{activeOrders.length} commande(s)</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[230px_150px]">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="#, table, client..."
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none"
            />
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700">
              {typeFilter === 'all' ? 'Tous les types' : formatOrderType(typeFilter)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {activeOrders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-soft">
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
              <div className="text-right">
                <div className="text-[10px] font-bold text-zinc-500">{order.tableNumber ? `Table ${order.tableNumber}` : order.customerName ?? 'Client'}</div>
                <div className="mt-1 text-lg font-black text-zinc-950">{formatMoney(order.totalPrice)}</div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-zinc-50 p-3">
              <div className="space-y-1.5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs font-semibold text-zinc-600">
                    <span className="truncate">{item.productName}</span>
                    <span className="font-black text-zinc-900">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {order.status === 'paid' ? (
              <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-700">
                Commande deja payee
              </div>
            ) : order.status !== 'ready' ? (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-700">
                En attente cuisine
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => payOrder(order.id, 'cash')}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"
                >
                  Espece
                </button>
                <button
                  onClick={() => payOrder(order.id, 'card')}
                  className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white"
                >
                  Carte
                </button>
              </div>
            )}
          </article>
        ))}
        {activeOrders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 p-8 text-sm text-zinc-500 xl:col-span-2">
            Aucune commande a encaisser ne correspond aux filtres actifs.
          </div>
        )}
      </div>
    </section>
  );
}
