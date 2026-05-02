import { useEffect, useMemo, useState } from 'react';
import { CashierScreen } from './CashierScreen';
import { DeliveryScreen } from './DeliveryScreen';
import { OrderScreen } from './OrderScreen';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { DeliveryStatus, OrderType, PosScreen } from '../types/pos';

type VisiblePosScreen = Exclude<PosScreen, 'kitchen'>;

const posTabs: Array<{ id: VisiblePosScreen; label: string; hint: string }> = [
  { id: 'order', label: 'Caisse', hint: 'Commande rapide' },
  { id: 'cashier', label: 'Paiement', hint: 'Cloture' },
  { id: 'delivery', label: 'Livraison', hint: 'Suivi' }
];

export function PosWorkspace() {
  const { posScreen, setPosScreen, setCurrentModule, categories, selectedCategory, setSelectedCategory, orders } = usePosStore();
  const { hasPermission } = useAuthStore();
  const [cashierStatus, setCashierStatus] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'paid'>('all');
  const [cashierType, setCashierType] = useState<'all' | OrderType>('all');
  const [cashierSearch, setCashierSearch] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<'all' | DeliveryStatus>('all');
  const [deliverySearch, setDeliverySearch] = useState('');

  const activeOrdersCount = useMemo(
    () => orders.filter((order) => ['pending', 'preparing', 'ready'].includes(order.status)).length,
    [orders]
  );
  const readyToPayTotal = useMemo(
    () => orders.filter((order) => order.status !== 'paid' && order.status !== 'cancelled').reduce((sum, order) => sum + order.totalPrice, 0),
    [orders]
  );
  const deliveryActiveCount = useMemo(
    () => orders.filter((order) => order.type === 'delivery' && order.deliveryStatus !== 'delivered').length,
    [orders]
  );
  const tabCounters = useMemo(
    () => ({
      order: activeOrdersCount,
      cashier: orders.filter((order) => order.status !== 'paid' && order.status !== 'cancelled').length,
      delivery: deliveryActiveCount
    }),
    [activeOrdersCount, deliveryActiveCount, orders]
  );
  const visibleTabs = useMemo(
    () =>
      posTabs.filter((tab) => {
        if (tab.id === 'order') return hasPermission('pos.use');
        if (tab.id === 'cashier') return hasPermission('pos.cashier');
        if (tab.id === 'delivery') return hasPermission('pos.delivery');
        return false;
      }),
    [hasPermission]
  );

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === posScreen)) {
      setPosScreen(visibleTabs[0].id);
    }
  }, [posScreen, setPosScreen, visibleTabs]);

  function renderSidebarFilters() {
    if (posScreen === 'order') {
      return (
        <div className="mt-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Categories</div>
          <div className="mt-2 space-y-1.5">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`w-full rounded-2xl px-3 py-2 text-left text-xs font-black transition ${
                  selectedCategory === category ? 'bg-zinc-950 text-white shadow-lg shadow-zinc-950/10' : 'mesh-chip text-zinc-700 hover:bg-white'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{category}</span>
                  {selectedCategory === category ? <span className="h-1.5 w-1.5 rounded-full bg-brand" /> : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (posScreen === 'cashier') {
      return (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Encaissement</div>
            <div className="mt-2 space-y-1.5">
              {[
                { id: 'all', label: 'A encaisser' },
                { id: 'ready', label: 'Pretes a encaisser' },
                { id: 'pending', label: 'En attente' },
                { id: 'preparing', label: 'En preparation' },
                { id: 'paid', label: 'Payees' }
              ].map((state) => (
                <button
                  key={state.id}
                  onClick={() => setCashierStatus(state.id as 'all' | 'pending' | 'preparing' | 'ready' | 'paid')}
                  className={`w-full rounded-2xl px-3 py-2 text-left text-xs font-black transition ${
                    cashierStatus === state.id ? 'bg-zinc-950 text-white shadow-lg shadow-zinc-950/10' : 'mesh-chip text-zinc-700 hover:bg-white'
                  }`}
                >
                  {state.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Type</div>
            <div className="mt-2 space-y-1.5">
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'dine_in', label: 'Sur place' },
                { id: 'take_away', label: 'A emporter' },
                { id: 'delivery', label: 'Livraison' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setCashierType(type.id as 'all' | OrderType)}
                  className={`w-full rounded-2xl px-3 py-2 text-left text-xs font-black transition ${
                    cashierType === type.id ? 'bg-brand text-white shadow-lg shadow-brand/15' : 'mesh-chip text-zinc-700 hover:bg-white'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-3">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Suivi livraison</div>
        <div className="mt-2 space-y-1.5">
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'pending', label: 'En attente' },
            { id: 'on_the_way', label: 'En route' },
            { id: 'delivered', label: 'Livrees' }
          ].map((state) => (
            <button
              key={state.id}
              onClick={() => setDeliveryStatus(state.id as 'all' | DeliveryStatus)}
              className={`w-full rounded-2xl px-3 py-2 text-left text-xs font-black transition ${
                deliveryStatus === state.id ? 'bg-zinc-950 text-white shadow-lg shadow-zinc-950/10' : 'mesh-chip text-zinc-700 hover:bg-white'
              }`}
            >
              {state.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="grid gap-3 xl:grid-cols-[255px_minmax(0,1fr)]">
      <aside className="premium-panel rounded-[1.7rem] p-2.5 xl:sticky xl:top-4 xl:self-start">
        <button
          onClick={() => setCurrentModule('apps')}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-3 py-2.5 text-xs font-black text-white shadow-sm"
        >
          ← Retour aux modules
        </button>

        <div className="mt-2.5 overflow-hidden rounded-[1.35rem] bg-[radial-gradient(circle_at_15%_10%,rgba(255,215,51,0.35),transparent_28%),linear-gradient(135deg,#1c1008,#ff3218_56%,#ff8a18)] p-3 text-white shadow-lg shadow-orange-900/10">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/18 text-xl ring-1 ring-white/20">🧾</div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">Module caisse</div>
              <div className="mt-0.5 text-base font-black">Point de vente</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-black">
            <div className="rounded-xl bg-white/14 px-2.5 py-2 ring-1 ring-white/15">
              <div className="text-white/55">Actives</div>
              <div className="mt-0.5">{activeOrdersCount}</div>
            </div>
            <div className="rounded-xl bg-white/14 px-2.5 py-2 ring-1 ring-white/15">
              <div className="text-white/55">A encaisser</div>
              <div className="mt-0.5">{tabCounters.cashier}</div>
            </div>
          </div>
        </div>

        {renderSidebarFilters()}
      </aside>

      <div className="space-y-3">
        <section className="premium-panel rounded-[1.7rem] p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-brand">Poste actif</div>
              <div className="mt-0.5 text-base font-black text-zinc-950">
                {posTabs.find((tab) => tab.id === posScreen)?.label ?? 'Paiement'}
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPosScreen(tab.id)}
                  className={`min-w-fit rounded-2xl px-3 py-2 text-left transition ${
                    posScreen === tab.id ? 'bg-zinc-950 text-white shadow-lg shadow-zinc-950/10' : 'mesh-chip text-zinc-700 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black">{tab.label}</span>
                    {tabCounters[tab.id] > 0 ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${posScreen === tab.id ? 'bg-white/20 text-white' : 'bg-white text-zinc-700'}`}>
                        {tabCounters[tab.id]}
                      </span>
                    ) : null}
                  </div>
                  <div className={`text-[11px] ${posScreen === tab.id ? 'text-white/70' : 'text-zinc-500'}`}>{tab.hint}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <PosMetric label="Commandes actives" value={String(activeOrdersCount)} />
            <PosMetric label="A encaisser" value={`${Math.round(readyToPayTotal).toLocaleString('fr-DZ')} DZD`} />
            <PosMetric label="Livraisons" value={String(deliveryActiveCount)} />
          </div>
        </section>

        {posScreen === 'order' && <OrderScreen />}
        {posScreen === 'cashier' && (
          <CashierScreen
            statusFilter={cashierStatus}
            typeFilter={cashierType}
            search={cashierSearch}
            onSearchChange={setCashierSearch}
          />
        )}
        {posScreen === 'delivery' && (
          <DeliveryScreen
            statusFilter={deliveryStatus}
            search={deliverySearch}
            onSearchChange={setDeliverySearch}
          />
        )}
      </div>
    </section>
  );
}

function PosMetric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${danger ? 'border-red-100 bg-red-50 text-red-700' : 'border-zinc-100 bg-white/65 text-zinc-900'}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}
