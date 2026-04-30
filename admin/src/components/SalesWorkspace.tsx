import { useMemo, useState } from 'react';
import { formatMoney, formatOrderStatus, formatOrderType } from '../lib/format';
import { printCustomerInvoice, printKitchenTicket } from '../lib/print';
import { usePosStore } from '../store/usePosStore';
import { OrderStatus, OrderType } from '../types/pos';
import { useFeedback } from './FeedbackProvider';
import { WorkspaceShell } from './WorkspaceShell';

type StatusFilter = 'all' | OrderStatus;
type TypeFilter = 'all' | OrderType;

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'preparing', label: 'En preparation' },
  { value: 'ready', label: 'Pret' },
  { value: 'paid', label: 'Paye' },
  { value: 'cancelled', label: 'Annule' }
];

const typeOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'Tous les types' },
  { value: 'dine_in', label: 'Sur place' },
  { value: 'take_away', label: 'A emporter' },
  { value: 'delivery', label: 'Livraison' }
];

export function SalesWorkspace() {
  const { confirm, toast } = useFeedback();
  const { orders, restaurantSettings, cancelOrder, setCurrentModule } = usePosStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesType = typeFilter === 'all' || order.type === typeFilter;
      const matchesSearch =
        !needle ||
        String(order.id).includes(needle) ||
        (order.customerName ?? '').toLowerCase().includes(needle) ||
        (order.tableNumber ?? '').toLowerCase().includes(needle) ||
        (order.phone ?? '').toLowerCase().includes(needle);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [orders, search, statusFilter, typeFilter]);

  const totals = useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter((order) => ['pending', 'preparing', 'ready'].includes(order.status)).length,
      paid: orders.filter((order) => order.status === 'paid').length,
      revenue: orders.filter((order) => order.status === 'paid').reduce((sum, order) => sum + order.totalPrice, 0)
    };
  }, [orders]);

  return (
    <WorkspaceShell
      title="Commandes"
      subtitle="Recherche, suivi, reimpression cuisine et factures client."
      accent="linear-gradient(135deg, #7c3aed, #8b5cf6)"
      icon="📋"
      sectionLabel="Module commandes"
      onBack={() => setCurrentModule('apps')}
      navigation={[{ id: 'orders', label: 'Commandes', hint: 'Liste et suivi' }]}
      activeView="orders"
      onChangeView={() => undefined}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Total" value={String(totals.all)} />
        <Metric label="Actives" value={String(totals.active)} />
        <Metric label="Payees" value={String(totals.paid)} />
        <Metric label="CA paye" value={formatMoney(totals.revenue)} />
      </section>

      <section className="premium-panel rounded-[1.6rem] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Commandes</div>
            <div className="mt-1 text-xl font-bold text-zinc-950">Historique recent</div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[260px_180px_180px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher #, table, client..."
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {filteredOrders.map((order) => (
            <article key={order.id} className="premium-card rounded-2xl p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Commande #{order.id}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-lg font-black text-zinc-950">{formatMoney(order.totalPrice)}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
                      {formatOrderType(order.type)}
                    </span>
                    <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">
                      {formatOrderStatus(order.status)}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-zinc-600 lg:text-right">
                  <div className="font-semibold text-zinc-900">{order.customerName ?? (order.tableNumber ? `Table ${order.tableNumber}` : 'Passage caisse')}</div>
                  <div className="mt-1 text-xs">{new Date(order.createdAt).toLocaleString('fr-DZ')}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item) => (
                    <span key={item.id} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-600">
                      {item.quantity}x {item.productName}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.status !== 'paid' && order.status !== 'cancelled' ? (
                    <button
                      onClick={() => {
                        void confirm({
                          title: `Annuler la commande #${order.id} ?`,
                          message: "Le stock sera restitue par un mouvement d'ajustement.",
                          confirmLabel: 'Annuler commande',
                          tone: 'warning'
                        }).then((confirmed) => {
                          if (confirmed) void cancelOrder(order.id);
                        });
                      }}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600"
                    >
                      Annuler
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      printKitchenTicket(order, restaurantSettings);
                      toast({ title: 'Ticket cuisine pret', message: `Commande #${order.id}`, tone: 'success' });
                    }}
                    className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-black text-zinc-700"
                  >
                    Ticket cuisine
                  </button>
                  <button
                    onClick={() => {
                      printCustomerInvoice(order, restaurantSettings);
                      toast({ title: 'Facture prete', message: `Commande #${order.id}`, tone: 'success' });
                    }}
                    className="rounded-full bg-ink px-3 py-1.5 text-xs font-black text-white"
                  >
                    Facture
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filteredOrders.length === 0 ? (
            <div className="premium-card rounded-2xl border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">
              Aucune commande ne correspond aux filtres actifs.
            </div>
          ) : null}
        </div>
      </section>
    </WorkspaceShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="premium-card rounded-2xl p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-black text-zinc-950">{value}</div>
    </article>
  );
}
