import { useMemo, useState } from 'react';
import { formatMoney, formatOrderStatus, formatOrderType } from '../lib/format';
import { printCustomerInvoice, printKitchenTicket } from '../lib/print';
import { usePosStore } from '../store/usePosStore';
import { OrderStatus, OrderType } from '../types/pos';
import { useFeedback } from './FeedbackProvider';
import { MarkOrderLostModal } from './MarkOrderLostModal';
import { WorkspaceShell } from './WorkspaceShell';

type StatusFilter = 'all' | OrderStatus;
type TypeFilter = 'all' | OrderType;
type PaymentFilter = 'all' | 'paid' | 'unpaid';
type OrdersPeriodFilter = 'today' | 'month' | 'custom' | 'all';

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'preparing', label: 'En preparation' },
  { value: 'ready', label: 'Pret' },
  { value: 'paid', label: 'Paye' },
  { value: 'cancelled', label: 'Annule' },
  { value: 'lost', label: 'Perdue' }
];

const typeOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'Tous les types' },
  { value: 'dine_in', label: 'Sur place' },
  { value: 'take_away', label: 'A emporter' },
  { value: 'delivery', label: 'Livraison' }
];

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function SalesWorkspace() {
  const { confirm, toast } = useFeedback();
  const { orders, employeeProfiles, restaurantSettings, cancelOrder, markOrderLost, setCurrentModule } = usePosStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<OrdersPeriodFilter>('today');
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [lostOrder, setLostOrder] = useState<(typeof orders)[number] | null>(null);

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesType = typeFilter === 'all' || order.type === typeFilter;
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      const isoDate = order.createdAt.slice(0, 10);
      const matchesPeriod =
        periodFilter === 'all'
          ? true
          : periodFilter === 'today'
            ? isSameDay(orderDate, today)
            : periodFilter === 'month'
              ? isSameMonth(orderDate, today)
              : (!dateFrom || isoDate >= dateFrom) && (!dateTo || isoDate <= dateTo);
      const matchesPayment =
        paymentFilter === 'all' ||
        (paymentFilter === 'paid' && order.status === 'paid') ||
        (paymentFilter === 'unpaid' && order.status !== 'paid' && order.status !== 'cancelled' && order.status !== 'lost');
      const matchesSearch =
        !needle ||
        String(order.id).includes(needle) ||
        (order.customerName ?? '').toLowerCase().includes(needle) ||
        (order.tableNumber ?? '').toLowerCase().includes(needle) ||
        (order.phone ?? '').toLowerCase().includes(needle);

      return matchesStatus && matchesType && matchesPayment && matchesPeriod && matchesSearch;
    });
  }, [dateFrom, dateTo, orders, paymentFilter, periodFilter, search, statusFilter, typeFilter]);

  const totals = useMemo(() => {
    const payable = filteredOrders.filter((order) => order.status !== 'cancelled' && order.status !== 'lost');
    const paid = filteredOrders.filter((order) => order.status === 'paid');
    return {
      all: filteredOrders.length,
      active: filteredOrders.filter((order) => ['pending', 'preparing', 'ready'].includes(order.status)).length,
      paid: paid.length,
      cancelled: filteredOrders.filter((order) => order.status === 'cancelled').length,
      lost: filteredOrders.filter((order) => order.status === 'lost').length,
      revenue: paid.reduce((sum, order) => sum + order.totalPrice, 0),
      pendingRevenue: filteredOrders.filter((order) => order.status !== 'paid' && order.status !== 'cancelled' && order.status !== 'lost').reduce((sum, order) => sum + order.totalPrice, 0),
      averageTicket: payable.length > 0 ? payable.reduce((sum, order) => sum + order.totalPrice, 0) / payable.length : 0
    };
  }, [filteredOrders]);

  return (
    <WorkspaceShell
      title="Commandes"
      subtitle="Recherche, suivi, reimpression cuisine et factures client."
      accent="var(--gradient-sales)"
      icon="📋"
      sectionLabel="Module commandes"
      onBack={() => setCurrentModule('apps')}
      navigation={[{ id: 'orders', label: 'Commandes', hint: 'Liste et suivi' }]}
      activeView="orders"
      onChangeView={() => undefined}
    >
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
        <Metric label="Affichees" value={String(totals.all)} />
        <Metric label="Actives" value={String(totals.active)} />
        <Metric label="Payees" value={String(totals.paid)} />
        <Metric label="Annulees" value={String(totals.cancelled)} />
        <Metric label="Perdues" value={String(totals.lost)} />
        <Metric label="CA paye" value={formatMoney(totals.revenue)} />
        <Metric label="A encaisser" value={formatMoney(totals.pendingRevenue)} />
      </section>

      <section className="premium-panel rounded-[1.6rem] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Commandes</div>
            <div className="mt-1 text-xl font-bold text-zinc-950">Historique recent</div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[220px_150px_150px_150px_150px_150px_150px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher #, table, client..."
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none"
            />
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value as OrdersPeriodFilter)}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none"
            >
              <option value="today">Aujourd'hui</option>
              <option value="month">Ce mois</option>
              <option value="custom">Personnalise</option>
              <option value="all">Tout</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              disabled={periodFilter !== 'custom'}
              onChange={(event) => setDateFrom(event.target.value)}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none disabled:opacity-50"
            />
            <input
              type="date"
              value={dateTo}
              disabled={periodFilter !== 'custom'}
              onChange={(event) => setDateTo(event.target.value)}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none disabled:opacity-50"
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
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none"
            >
              <option value="all">Paiement</option>
              <option value="paid">Payees</option>
              <option value="unpaid">A encaisser</option>
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
                    <StatusBadge status={order.status} />
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
                  {order.status !== 'paid' && order.status !== 'cancelled' && order.status !== 'lost' ? (
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
                  {order.status !== 'paid' && order.status !== 'cancelled' && order.status !== 'lost' ? (
                    <button
                      onClick={() => setLostOrder(order)}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600"
                    >
                      Marquer perdue
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
      {lostOrder ? (
        <MarkOrderLostModal
          order={lostOrder}
          employees={employeeProfiles}
          onClose={() => setLostOrder(null)}
          onConfirm={async (payload) => {
            await markOrderLost(lostOrder.id, payload);
            setLostOrder(null);
          }}
        />
      ) : null}
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

function StatusBadge({ status }: { status: OrderStatus }) {
  const toneClass: Record<OrderStatus, string> = {
    pending: 'bg-amber-50 text-amber-700',
    preparing: 'bg-brand/10 text-brand',
    ready: 'bg-emerald-50 text-emerald-700',
    paid: 'bg-charcoal text-white',
    cancelled: 'bg-red-50 text-red-600',
    lost: 'bg-red-50 text-red-700'
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass[status]}`}>{formatOrderStatus(status)}</span>;
}
