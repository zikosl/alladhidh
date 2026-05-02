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
        const matchesStatus = statusFilter === 'all' ? order.status !== 'paid' && order.status !== 'cancelled' : order.status === statusFilter;
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
  const cashierStats = useMemo(
    () => ({
      ready: activeOrders.filter((order) => order.status === 'ready').length,
      waiting: activeOrders.filter((order) => order.status !== 'ready' && order.status !== 'paid').length,
      paid: activeOrders.filter((order) => order.status === 'paid').length,
      total: activeOrders.reduce((sum, order) => sum + Number(order.totalPrice), 0)
    }),
    [activeOrders]
  );

  return (
    <section className="space-y-3">
      <div className="premium-panel p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand">Caisse</div>
            <div className="text-base font-black text-zinc-950">{activeOrders.length} commande(s)</div>
            <p className="mt-0.5 text-[11px] font-bold text-zinc-500">Paiement rapide: la commande peut etre encaissee tout de suite.</p>
          </div>
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-zinc-50 p-1.5 ring-1 ring-zinc-100">
            <CashierMetric label="Pretes" value={cashierStats.ready} tone="emerald" />
            <CashierMetric label="Attente" value={cashierStats.waiting} tone="amber" />
            <CashierMetric label="Payees" value={cashierStats.paid} tone="ink" />
            <CashierMetric label="Total" value={formatMoney(cashierStats.total)} tone="brand" />
          </div>
          <div className="grid gap-2 sm:grid-cols-[230px_150px]">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="#, table, client..."
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
            <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700">
              {typeFilter === 'all' ? 'Tous les types' : formatOrderType(typeFilter)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {activeOrders.map((order) => (
          <article key={order.id} className="premium-card p-3 transition hover:-translate-y-0.5">
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
                <div className="mt-1 text-xl font-black text-zinc-950">{formatMoney(order.totalPrice)}</div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <div className="space-y-1.5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-600">
                    <span className="truncate">{item.productName}</span>
                    <span className="shrink-0 font-black text-zinc-900">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {order.status === 'paid' ? (
              <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-700">
                Commande deja payee
              </div>
            ) : (
              <>
                {order.status !== 'ready' ? (
                  <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-700">
                    Cuisine: {order.status === 'pending' ? 'en attente' : 'en preparation'}
                  </div>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void payOrder(order.id, 'cash')}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Especes
                  </button>
                  <button
                    onClick={() => void payOrder(order.id, 'card')}
                    className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Carte
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
        {activeOrders.length === 0 && (
          <div className="premium-panel border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 xl:col-span-2">
            Aucune commande a encaisser ne correspond aux filtres actifs.
          </div>
        )}
      </div>
    </section>
  );
}

function CashierMetric({
  label,
  value,
  tone
}: {
  label: string;
  value: number | string;
  tone: 'emerald' | 'amber' | 'ink' | 'brand';
}) {
  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    ink: 'bg-zinc-950 text-white ring-zinc-950',
    brand: 'bg-brand/10 text-brand ring-brand/15'
  }[tone];

  return (
    <div className={`rounded-xl px-2 py-1.5 text-center ring-1 ${toneClasses}`}>
      <div className="truncate text-sm font-black leading-none">{value}</div>
      <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em]">{label}</div>
    </div>
  );
}
