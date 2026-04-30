import { useEffect, useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { AlertBanner, useFeedback } from './FeedbackProvider';

const orderTypes = [
  { value: 'dine_in', label: 'Sur place', icon: '🍽️' },
  { value: 'take_away', label: 'A emporter', icon: '🥡' },
  { value: 'delivery', label: 'Livraison', icon: '🛵' }
] as const;

export function OrderScreen() {
  const { toast } = useFeedback();
  const {
    products,
    restaurantTables,
    selectedCategory,
    search,
    cart,
    orderType,
    tableNumber,
    notes,
    deliveryForm,
    lastError,
    submitting,
    setSearch,
    setOrderType,
    setTableNumber,
    setNotes,
    setDeliveryForm,
    addToCart,
    increaseItem,
    decreaseItem,
    removeItem,
    clearCart,
    submitOrder
  } = usePosStore();
  const [customerPanelOpen, setCustomerPanelOpen] = useState(orderType !== 'dine_in');
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = selectedCategory === 'Tout' || product.category === selectedCategory;
      const searchMatch = product.name.toLowerCase().includes(search.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [products, selectedCategory, search]);
  const activeTables = useMemo(() => restaurantTables.filter((table) => table.isActive), [restaurantTables]);
  const cartQuantityByProduct = useMemo(() => {
    return new Map(cart.map((item) => [item.productId, item.quantity]));
  }, [cart]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;
  const missingTable = orderType === 'dine_in' && !tableNumber.trim();
  const missingDelivery =
    orderType === 'delivery' &&
    (!deliveryForm.customerName.trim() || !deliveryForm.phone.trim() || !deliveryForm.address.trim());
  const canSend = cart.length > 0 && !missingTable && !missingDelivery && !submitting;
  const canPressPrimary = !submitting;
  const sendHint = missingTable
    ? 'Choisir une table'
    : missingDelivery
      ? 'Completer la livraison'
      : cart.length === 0
        ? 'Ajouter un produit'
        : 'Pret pour la cuisine';
  const primaryActionLabel = missingDelivery ? 'Completer livraison' : submitting ? 'Envoi...' : 'Envoyer cuisine';

  function handlePrimaryAction() {
    if (cart.length === 0) {
      toast({ title: 'Panier vide', message: "Ajoutez au moins un produit avant l'envoi en cuisine.", tone: 'warning' });
      return;
    }
    if (missingTable) {
      toast({ title: 'Table manquante', message: 'Choisissez une table pour la commande sur place.', tone: 'warning' });
      return;
    }
    if (missingDelivery) {
      setCustomerPanelOpen(true);
      toast({ title: 'Infos livraison manquantes', message: 'Nom, telephone et adresse sont obligatoires.', tone: 'warning' });
      return;
    }
    void submitOrder();
  }

  useEffect(() => {
    setCustomerPanelOpen(orderType === 'delivery');
  }, [orderType]);

  return (
    <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_310px]">
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand">Nouvelle commande</div>
                <div className="text-sm font-black text-zinc-950">Commande rapide</div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {orderTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setOrderType(type.value)}
                    className={`rounded-xl px-2.5 py-2 text-left transition ${
                      orderType === type.value ? 'bg-ink text-white' : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <div className="text-sm">{type.icon}</div>
                    <div className="text-xs font-black">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_150px_150px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Produit..."
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-400"
              />
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700">
                {selectedCategory}
              </div>
              {orderType === 'dine_in' ? (
                activeTables.length > 0 ? (
                  <select
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold outline-none ${
                      missingTable ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <option value="">Table</option>
                    {activeTables.map((table) => (
                      <option key={table.id} value={table.name}>
                        {table.name}{table.zone ? ` - ${table.zone}` : ''} - {table.capacity} places
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value)}
                    placeholder="Table"
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none"
                  />
                )
              ) : (
                <button
                  onClick={() => setCustomerPanelOpen((current) => !current)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-black ${
                    missingDelivery ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                  }`}
                >
                  {customerPanelOpen ? 'Masquer client' : orderType === 'delivery' ? 'Client / adresse' : 'Client'}
                </button>
              )}
            </div>
          </div>

          {orderType !== 'dine_in' && customerPanelOpen && (
            <div className="mt-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  value={deliveryForm.customerName}
                  onChange={(event) => setDeliveryForm({ customerName: event.target.value })}
                  placeholder="Nom client"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                />
                <input
                  value={deliveryForm.phone}
                  onChange={(event) => setDeliveryForm({ phone: event.target.value })}
                  placeholder="Telephone"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                />
                {orderType === 'delivery' && (
                  <>
                    <input
                      value={deliveryForm.address}
                      onChange={(event) => setDeliveryForm({ address: event.target.value })}
                      placeholder="Adresse"
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none md:col-span-2"
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const quantity = cartQuantityByProduct.get(product.id) ?? 0;
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="group min-h-[118px] rounded-2xl border border-white/60 p-3 text-left shadow-soft transition hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(165deg, ${product.color} 0%, rgba(255,255,255,0.92) 100%)`
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xl">{product.icon}</div>
                  {quantity > 0 ? (
                    <div className="rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-black text-white">x{quantity}</div>
                  ) : (
                    <div className="max-w-[110px] truncate rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-bold text-zinc-700">
                      {product.category}
                    </div>
                  )}
                </div>
                <div className="mt-5 line-clamp-2 text-sm font-black leading-tight text-zinc-950">{product.name}</div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm font-black text-zinc-950">{formatMoney(product.price)}</div>
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-950 text-sm font-black text-white">+</div>
                </div>
              </button>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 p-8 text-center text-sm text-zinc-500 sm:col-span-2 xl:col-span-3 2xl:col-span-4">
              Aucun produit trouve.
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-soft backdrop-blur xl:sticky xl:top-4 xl:self-start">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand">Panier</div>
            <div className="text-sm font-black text-zinc-950">{cart.length} ligne(s)</div>
          </div>
          <button onClick={clearCart} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-600">
            Vider
          </button>
        </div>

        <div className="mt-3 max-h-[45vh] space-y-2 overflow-y-auto pr-1">
          {cart.length === 0 && (
            <div className="rounded-2xl bg-zinc-50 px-4 py-8 text-center text-xs font-semibold text-zinc-500">
              Touchez un produit.
            </div>
          )}

          {cart.map((item) => (
            <div key={item.productId} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-base" style={{ backgroundColor: item.color }}>
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-zinc-900">{item.name}</div>
                    <div className="text-[11px] font-semibold text-zinc-500">{formatMoney(item.price)}</div>
                  </div>
                </div>
                <button onClick={() => removeItem(item.productId)} className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-red-500">
                  x
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="inline-flex items-center gap-1 rounded-full bg-white p-1">
                  <button onClick={() => decreaseItem(item.productId)} className="grid h-7 w-7 place-items-center rounded-full bg-zinc-100 text-xs font-black">
                    -
                  </button>
                  <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                  <button onClick={() => increaseItem(item.productId)} className="grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-xs font-black text-white">
                    +
                  </button>
                </div>
                <div className="text-sm font-black text-zinc-900">{formatMoney(item.price * item.quantity)}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setNotesPanelOpen((current) => !current)}
          className="mt-3 w-full rounded-xl bg-zinc-100 px-3 py-2 text-left text-xs font-black text-zinc-700"
        >
          Notes cuisine {notes.trim() ? '- ajoutees' : ''}
        </button>
        {notesPanelOpen && (
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Sans oignon, allergie..."
            className="mt-2 min-h-16 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none"
          />
        )}

        {lastError && <div className="mt-3"><AlertBanner message={lastError} tone="error" /></div>}

        <div className="mt-3 space-y-1.5 rounded-2xl bg-zinc-950 p-3 text-white">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>Produits</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-black">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <button
            onClick={handlePrimaryAction}
            disabled={!canPressPrimary}
            className="rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {primaryActionLabel}
          </button>
          <div className={`text-center text-[11px] font-black ${canSend ? 'text-emerald-600' : 'text-zinc-500'}`}>{sendHint}</div>
        </div>
      </aside>
    </section>
  );
}
