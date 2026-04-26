import { useMemo } from 'react';
import { formatMoney, formatOrderStatus, formatOrderType } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { OrderType } from '../types/pos';

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
        const matchesStatus = statusFilter === 'all' ? ['pending', 'preparing', 'ready'].includes(order.status) : order.status === statusFilter;
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
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Caisse</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">Encaissement rapide avec recherche et filtres</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[260px_180px]">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Rechercher #, table ou client..."
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none"
            />
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
              {typeFilter === 'all' ? 'Tous les types' : formatOrderType(typeFilter)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {activeOrders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Commande #{order.id}
                </div>
                <div className="mt-2 text-xl font-bold text-zinc-950">{formatOrderType(order.type)}</div>
              </div>
              <div className="rounded-full bg-zinc-950 px-3 py-2 text-xs font-semibold text-white md:text-sm">
                {formatOrderStatus(order.status)}
              </div>
            </div>

            <div className="mt-5 text-3xl font-black text-zinc-950 md:text-4xl">{formatMoney(order.totalPrice)}</div>

            <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs text-zinc-600 md:text-sm">
                    <span>{item.productName}</span>
                    <span>x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button
                onClick={() => payOrder(order.id, 'cash')}
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white"
              >
                Paiement espece
              </button>
              <button
                onClick={() => payOrder(order.id, 'card')}
                className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white"
              >
                Paiement carte
              </button>
            </div>
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
