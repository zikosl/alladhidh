import { useEffect, useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';
import { usePosStore } from '../store/usePosStore';

const orderTypes = [
  { value: 'dine_in', label: 'Sur place', icon: '🍽️' },
  { value: 'take_away', label: 'A emporter', icon: '🥡' },
  { value: 'delivery', label: 'Livraison', icon: '🛵' }
] as const;

export function OrderScreen() {
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
    holdCart,
    submitOrder
  } = usePosStore();
  const [customerPanelOpen, setCustomerPanelOpen] = useState(orderType !== 'dine_in');

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = selectedCategory === 'Tout' || product.category === selectedCategory;
      const searchMatch = product.name.toLowerCase().includes(search.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [products, selectedCategory, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + (orderType === 'delivery' ? Number(deliveryForm.deliveryFee || 0) : 0);

  useEffect(() => {
    setCustomerPanelOpen(orderType !== 'dine_in');
  }, [orderType]);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Nouvelle commande</div>
              <div className="mt-1 text-lg font-semibold text-zinc-900">Composer en quelques secondes</div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {orderTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setOrderType(type.value)}
                  className={`rounded-xl px-3 py-2.5 text-left transition ${orderType === type.value ? 'bg-ink text-white' : 'bg-zinc-100 text-zinc-700'
                    }`}
                >
                  <div className="text-base">{type.icon}</div>
                  <div className="text-sm font-semibold">{type.label}</div>
                </button>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_200px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un produit..."
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none ring-0 placeholder:text-zinc-400"
              />
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
                Categorie active: <span className="font-semibold">{selectedCategory}</span>
              </div>
              {orderType === 'dine_in' ? (
                <select
                  value={tableNumber}
                  onChange={(event) => setTableNumber(event.target.value)}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">Choisir une table</option>
                  {restaurantTables
                    .filter((table) => table.isActive)
                    .map((table) => (
                      <option key={table.id} value={table.name}>
                        {table.name} {table.zone ? `• ${table.zone}` : ''} • {table.capacity} places
                      </option>
                    ))}
                </select>
              ) : (
                <button
                  onClick={() => setCustomerPanelOpen((current) => !current)}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left text-sm font-medium text-zinc-700"
                >
                  {customerPanelOpen ? 'Masquer details client' : 'Afficher details client'}
                </button>
              )}
            </div>
          </div>

          {orderType !== 'dine_in' && customerPanelOpen && (
            <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {orderType === 'delivery' ? 'Client et livraison' : 'Client a emporter'}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {orderType === 'delivery'
                      ? 'Renseignez les informations necessaires a la course.'
                      : 'Nom et telephone pour identifier rapidement le retrait.'}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  value={deliveryForm.customerName}
                  onChange={(event) => setDeliveryForm({ customerName: event.target.value })}
                  placeholder="Nom du client"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none"
                />
                <input
                  value={deliveryForm.phone}
                  onChange={(event) => setDeliveryForm({ phone: event.target.value })}
                  placeholder="Telephone"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none"
                />
                {orderType === 'delivery' && (
                  <>
                    <input
                      value={deliveryForm.address}
                      onChange={(event) => setDeliveryForm({ address: event.target.value })}
                      placeholder="Adresse complete"
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none md:col-span-2"
                    />
                    <input
                      type="number"
                      value={deliveryForm.deliveryFee}
                      onChange={(event) => setDeliveryForm({ deliveryFee: Number(event.target.value) })}
                      placeholder="Frais de livraison"
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none"
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="group rounded-2xl border border-white/60 p-4 text-left shadow-soft transition hover:-translate-y-1"
              style={{
                background: `linear-gradient(165deg, ${product.color} 0%, rgba(255,255,255,0.92) 100%)`
              }}
            >
              <div className="flex items-start justify-between">
                <div className="text-2xl">{product.icon}</div>
                <div className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold text-zinc-700">
                  {product.category}
                </div>
              </div>
              <div className="mt-6 text-base font-semibold text-zinc-950">{product.name}</div>
              <div className="mt-2 text-xs text-zinc-700">1 clic pour ajouter</div>
              <div className="mt-5 flex items-center justify-between">
                <div className="text-base font-bold text-zinc-950">{formatMoney(product.price)}</div>
                <div className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white md:text-sm">
                  Ajouter
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <aside className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-soft backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Panier</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">Commande</div>
          </div>
          <button onClick={clearCart} className="rounded-full bg-zinc-100 px-4 py-2 text-xs text-zinc-600 md:text-sm">
            Vider
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {cart.length === 0 && (
            <div className="rounded-3xl bg-zinc-50 px-4 py-10 text-center text-xs text-zinc-500 md:text-sm">
              Touchez un produit pour commencer.
            </div>
          )}

          {cart.map((item) => (
            <div key={item.productId} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-2xl text-lg"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{item.name}</div>
                    <div className="text-xs text-zinc-500">{formatMoney(item.price)}</div>
                  </div>
                </div>
                <button onClick={() => removeItem(item.productId)} className="text-xs font-medium text-red-500 md:text-sm">
                  Supprimer
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-white p-1">
                  <button
                    onClick={() => decreaseItem(item.productId)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => increaseItem(item.productId)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-zinc-900 text-white"
                  >
                    +
                  </button>
                </div>
                <div className="text-base font-semibold text-zinc-900">
                  {formatMoney(item.price * item.quantity)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes cuisine, allergies, sans oignon..."
          className="mt-4 min-h-20 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none"
        />

        {lastError && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{lastError}</div>}

        <div className="mt-5 space-y-2 rounded-2xl bg-zinc-950 p-4 text-white">
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>Produits</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>Livraison</span>
            <span>{formatMoney(orderType === 'delivery' ? deliveryForm.deliveryFee : 0)}</span>
          </div>
          <div className="flex items-center justify-between text-xl font-semibold">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <button
            onClick={submitOrder}
            disabled={submitting}
            className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Envoi...' : 'Envoyer en cuisine'}
          </button>
          {/* <button
            onClick={holdCart}
            className="rounded-3xl bg-zinc-100 px-5 py-3 text-base font-semibold text-zinc-700"
          >
            Mettre en attente
          </button> */}
        </div>
      </aside>
    </section>
  );
}
