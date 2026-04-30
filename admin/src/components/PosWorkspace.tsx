import { useEffect, useMemo, useState } from 'react';
import { CashierScreen } from './CashierScreen';
import { DeliveryScreen } from './DeliveryScreen';
import { KitchenScreen } from './KitchenScreen';
import { OrderScreen } from './OrderScreen';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { DeliveryStatus, OrderStatus, OrderType, PosScreen } from '../types/pos';

const posTabs: Array<{ id: PosScreen; label: string; hint: string }> = [
  { id: 'order', label: 'Caisse', hint: 'Commande rapide' },
  { id: 'kitchen', label: 'Cuisine', hint: 'KDS' },
  { id: 'cashier', label: 'Paiement', hint: 'Cloture' },
  { id: 'delivery', label: 'Livraison', hint: 'Suivi' }
];

export function PosWorkspace() {
  const { posScreen, setPosScreen, setCurrentModule, categories, selectedCategory, setSelectedCategory, orders, refreshLiveData } =
    usePosStore();
  const { hasPermission } = useAuthStore();
  const [kitchenStatus, setKitchenStatus] = useState<'all' | Extract<OrderStatus, 'pending' | 'preparing' | 'ready'>>('all');
  const [kitchenType, setKitchenType] = useState<'all' | OrderType>('all');
  const [kitchenSearch, setKitchenSearch] = useState('');
  const [cashierStatus, setCashierStatus] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'paid'>('all');
  const [cashierType, setCashierType] = useState<'all' | OrderType>('all');
  const [cashierSearch, setCashierSearch] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<'all' | DeliveryStatus>('all');
  const [deliverySearch, setDeliverySearch] = useState('');

  const activeOrdersCount = useMemo(
    () => orders.filter((order) => ['pending', 'preparing', 'ready'].includes(order.status)).length,
    [orders]
  );
  const tabCounters = useMemo(
    () => ({
      order: activeOrdersCount,
      kitchen: orders.filter((order) => ['pending', 'preparing'].includes(order.status)).length,
      cashier: orders.filter((order) => order.status === 'ready').length,
      delivery: orders.filter((order) => order.type === 'delivery' && order.deliveryStatus !== 'delivered').length
    }),
    [activeOrdersCount, orders]
  );
  const visibleTabs = useMemo(
    () =>
      posTabs.filter((tab) => {
        if (tab.id === 'order') return hasPermission('pos.use');
        if (tab.id === 'kitchen') return hasPermission('pos.kitchen');
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
                className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                  selectedCategory === category ? 'bg-ink text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (posScreen === 'kitchen') {
      const states = [
        { id: 'all', label: 'Toutes' },
        { id: 'pending', label: 'En attente' },
        { id: 'preparing', label: 'En preparation' },
        { id: 'ready', label: 'Pretes' }
      ] as const;

      return (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Etats cuisine</div>
            <div className="mt-2 space-y-1.5">
              {states.map((state) => (
                <button
                  key={state.id}
                  onClick={() => setKitchenStatus(state.id)}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                    kitchenStatus === state.id ? 'bg-ink text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {state.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Type</div>
            <div className="mt-2 grid grid-cols-1 gap-1.5">
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'dine_in', label: 'Sur place' },
                { id: 'take_away', label: 'A emporter' },
                { id: 'delivery', label: 'Livraison' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setKitchenType(type.id as 'all' | OrderType)}
                  className={`rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                    kitchenType === type.id ? 'bg-brand text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
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
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                    cashierStatus === state.id ? 'bg-ink text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
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
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                    cashierType === type.id ? 'bg-brand text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
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
              className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                deliveryStatus === state.id ? 'bg-ink text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
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
    <section className="grid gap-3 xl:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/60 bg-white/90 p-2.5 shadow-soft backdrop-blur xl:sticky xl:top-4 xl:self-start">
        <button
          onClick={() => setCurrentModule('apps')}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-700"
        >
          ← Retour aux modules
        </button>

        <div className="mt-2.5 rounded-xl bg-[linear-gradient(135deg,#dc2626,#f97316)] p-3 text-white">
          <div className="flex items-center gap-3">
            <div className="text-xl">🧾</div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">Module POS</div>
              <div className="mt-0.5 text-base font-black">Point de vente</div>
            </div>
          </div>
        </div>

        {renderSidebarFilters()}
      </aside>

      <div className="space-y-3">
        <section className="rounded-2xl border border-white/60 bg-white/90 p-2.5 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-brand">Poste actif</div>
              <div className="mt-0.5 text-base font-black text-zinc-950">
                {posTabs.find((tab) => tab.id === posScreen)?.label}
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPosScreen(tab.id)}
                  className={`min-w-fit rounded-xl px-3 py-2 text-left transition ${
                    posScreen === tab.id ? 'bg-ink text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
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
        </section>

        {posScreen === 'order' && <OrderScreen />}
        {posScreen === 'kitchen' && (
          <KitchenScreen
            statusFilter={kitchenStatus}
            typeFilter={kitchenType}
            search={kitchenSearch}
            onSearchChange={setKitchenSearch}
            onRefresh={refreshLiveData}
          />
        )}
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
