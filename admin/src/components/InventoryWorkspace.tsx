import { ReactNode, useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { ExpenseStatus, FinancePaymentMethod, InventoryCategory, InventoryItem, MeasurementType, MeasurementUnit, StockMovement } from '../types/pos';
import { useFeedback } from './FeedbackProvider';
import { WorkspaceShell } from './WorkspaceShell';

type StockView = 'overview' | 'materials' | 'movements' | 'categories' | 'alerts';
type ModalMode = 'material' | 'entry' | 'loss' | 'category' | null;
type CoreUnit = 'kg' | 'portion' | 'liter';

const coreUnits: Array<{ value: CoreUnit; label: string; hint: string; placeholder: string }> = [
  { value: 'kg', label: 'Kg', hint: 'Poids', placeholder: 'Ex: 20 kg de tomate' },
  { value: 'portion', label: 'Portion', hint: 'Pieces / portions', placeholder: 'Ex: 100 portions de viande' },
  { value: 'liter', label: 'Litre', hint: 'Liquide', placeholder: 'Ex: 5 litres de sauce' }
];

const emptyMaterialForm = {
  name: '',
  category: '',
  unit: 'kg' as CoreUnit,
  initialQuantity: 0,
  initialTotalPrice: 0
};

const emptyEntryForm = {
  ingredientId: 0,
  quantity: 0,
  totalPrice: 0,
  expenseStatus: 'paid' as ExpenseStatus,
  paymentMethod: 'cash' as FinancePaymentMethod,
  supplierName: ''
};

const emptyLossForm = {
  ingredientId: 0,
  quantity: 0
};

const emptyCategoryForm = {
  name: '',
  description: ''
};

function measurementTypeFromUnit(unit: CoreUnit): MeasurementType {
  if (unit === 'kg') return 'weight';
  if (unit === 'liter') return 'volume';
  return 'portion';
}

function displayUnit(unit: MeasurementUnit) {
  if (unit === 'liter') return 'litre';
  return unit;
}

function formatMeasurementType(type: MeasurementType) {
  if (type === 'weight') return 'Poids';
  if (type === 'volume') return 'Volume';
  return 'Portions';
}

function formatQuantity(item: Pick<InventoryItem, 'quantity' | 'unit'>) {
  return `${item.quantity.toLocaleString('fr-DZ', { maximumFractionDigits: 3 })} ${displayUnit(item.unit)}`;
}

export function InventoryWorkspace() {
  const { confirm } = useFeedback();
  const {
    inventoryItems,
    inventoryCategories,
    stockMovements,
    upsertInventoryItem,
    addInventoryCategory,
    removeInventoryCategory,
    addStockEntry,
    addStockLoss,
    removeInventoryItem,
    setCurrentModule
  } = usePosStore();
  const [view, setView] = useState<StockView>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InventoryItem['status']>('all');
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [entryForm, setEntryForm] = useState(emptyEntryForm);
  const [lossForm, setLossForm] = useState(emptyLossForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  const derivedCategories = useMemo(() => {
    if (inventoryCategories.length > 0) return inventoryCategories;
    const names = Array.from(new Set(['General', ...inventoryItems.map((item) => item.category || 'General')])).sort();
    return names.map((name, index) => ({
      id: index + 1,
      name,
      description: null,
      itemsCount: inventoryItems.filter((item) => (item.category || 'General') === name).length
    }));
  }, [inventoryCategories, inventoryItems]);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [inventoryItems, search, statusFilter]);

  const lowStockItems = inventoryItems.filter((item) => item.status !== 'in_stock');
  const totalValue = inventoryItems.reduce((sum, item) => sum + item.quantity * item.estimatedCost, 0);
  const portionCount = inventoryItems.filter((item) => item.measurementType === 'portion').length;
  const measuredCount = inventoryItems.filter((item) => item.measurementType !== 'portion').length;
  const selectedEntryItem = inventoryItems.find((item) => item.id === entryForm.ingredientId);
  const selectedLossItem = inventoryItems.find((item) => item.id === lossForm.ingredientId);
  const selectedUnit = coreUnits.find((unit) => unit.value === materialForm.unit) ?? coreUnits[0];
  const visibleItems = view === 'alerts' ? lowStockItems : filteredItems;

  function openMaterialModal(item?: InventoryItem) {
    if (item) {
      setEditingId(item.id);
      setMaterialForm({
        name: item.name,
        category: item.category,
        unit: (item.unit === 'liter' || item.unit === 'kg' || item.unit === 'portion' ? item.unit : 'portion') as CoreUnit,
        initialQuantity: 0,
        initialTotalPrice: 0
      });
    } else {
      setEditingId(null);
      setMaterialForm({
        ...emptyMaterialForm,
        category: derivedCategories[0]?.name ?? 'General'
      });
    }
    setModalMode('material');
  }

  function openEntryModal(item?: InventoryItem) {
    setEntryForm({
      ingredientId: item?.id ?? 0,
      quantity: 0,
      totalPrice: 0,
      expenseStatus: 'paid',
      paymentMethod: 'cash',
      supplierName: ''
    });
    setModalMode('entry');
  }

  function openLossModal(item?: InventoryItem) {
    setLossForm({
      ingredientId: item?.id ?? 0,
      quantity: 0
    });
    setModalMode('loss');
  }

  function openCategoryModal() {
    setCategoryForm(emptyCategoryForm);
    setModalMode('category');
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
    setMaterialForm(emptyMaterialForm);
    setEntryForm(emptyEntryForm);
    setLossForm(emptyLossForm);
    setCategoryForm(emptyCategoryForm);
  }

  async function saveMaterial() {
    const unit = materialForm.unit as MeasurementUnit;
    await upsertInventoryItem({
      id: editingId ?? undefined,
      name: materialForm.name,
      category: materialForm.category || 'General',
      unit,
      measurementType: measurementTypeFromUnit(materialForm.unit),
      initialQuantity: editingId ? 0 : materialForm.initialQuantity,
      initialTotalPrice: editingId ? 0 : materialForm.initialTotalPrice
    });
    closeModal();
  }

  async function saveCategory() {
    await addInventoryCategory({
      name: categoryForm.name,
      description: categoryForm.description || null
    });
    closeModal();
  }

  return (
    <WorkspaceShell
      title="Stock"
      subtitle="Matieres premieres, entrees et alertes."
      accent="linear-gradient(135deg, #155e75, #16a34a)"
      icon="📦"
      sectionLabel="Module stock"
      onBack={() => setCurrentModule('apps')}
      navigation={[
        { id: 'overview', label: 'Vue globale', hint: 'Valeur & alertes' },
        { id: 'materials', label: 'Matieres', hint: 'Articles bruts' },
        { id: 'movements', label: 'Mouvements', hint: 'Audit stock' },
        { id: 'categories', label: 'Categories', hint: 'Organisation' },
        { id: 'alerts', label: 'Alertes', hint: 'Bas & rupture' }
      ]}
      activeView={view}
      onChangeView={(nextView) => setView(nextView as StockView)}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Matieres" value={String(inventoryItems.length)} />
        <Metric label="Alertes" value={String(lowStockItems.length)} />
        <Metric label="Portions" value={String(portionCount)} />
        <Metric label="Valeur" value={formatMoney(totalValue)} />
      </section>

      {(view === 'overview' || view === 'materials' || view === 'alerts') && (
        <section className="rounded-2xl bg-white/90 p-4 shadow-soft">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">
                Matieres premieres
              </div>
              <h2 className="mt-1 text-xl font-bold text-zinc-950">
                {view === 'alerts' ? 'Articles a traiter' : 'Stock operationnel'}
              </h2>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[220px_160px_150px_150px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une matiere..."
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none"
              >
                <option value="all">Tous les statuts</option>
                <option value="in_stock">En stock</option>
                <option value="low_stock">Stock bas</option>
                <option value="out_of_stock">Rupture</option>
              </select>
              <button
                onClick={() => openEntryModal()}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Entree stock
              </button>
              <button
                onClick={() => openMaterialModal()}
                className="rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white"
              >
                Nouvelle matiere
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-100">
            <table className="min-w-full divide-y divide-zinc-100">
              <thead className="bg-zinc-50">
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                  <th className="px-4 py-3">Matiere</th>
                  <th className="px-4 py-3">Unite</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Cout unitaire</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {visibleItems.map((item) => (
                  <tr key={item.id} className="text-sm text-zinc-700">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-950">{item.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">{item.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-950">{displayUnit(item.unit)}</div>
                      <div className="text-xs text-zinc-500">{formatMeasurementType(item.measurementType)}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-950">{formatQuantity(item)}</td>
                    <td className="px-4 py-3">{formatMoney(item.estimatedCost)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openMaterialModal(item)}
                          className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => openEntryModal(item)}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        >
                          Entree
                        </button>
                        <button
                          onClick={() => openLossModal(item)}
                          className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                        >
                          Perte
                        </button>
                        <button
                          onClick={() => {
                            void confirm({
                              title: 'Supprimer la matiere ?',
                              message: `"${item.name}" sera supprimee si aucun historique stock ne bloque l'action.`,
                              confirmLabel: 'Supprimer',
                              tone: 'danger'
                            }).then((confirmed) => {
                              if (confirmed) void removeInventoryItem(item.id);
                            });
                          }}
                          className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            {measuredCount} matieres en poids/volume. Les quantites restent derivees des mouvements stock.
          </div>
        </section>
      )}

      {view === 'movements' && (
        <section className="rounded-2xl bg-white/90 p-4 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Audit stock</div>
              <h2 className="mt-1 text-xl font-bold text-zinc-950">Derniers mouvements</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Chaque entree, vente et perte reste tracee. Le stock affiche est derive de cette liste.
              </p>
            </div>
            <button onClick={() => openEntryModal()} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">
              Entree stock
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {stockMovements.map((movement) => (
              <MovementRow key={movement.id} movement={movement} />
            ))}
            {stockMovements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                Aucun mouvement stock trouve.
              </div>
            ) : null}
          </div>
        </section>
      )}

      {view === 'categories' && (
        <section className="rounded-2xl bg-white/90 p-4 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Categories stock</div>
              <h2 className="mt-1 text-xl font-bold text-zinc-950">Organisation des matieres</h2>
            </div>
            <button onClick={openCategoryModal} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">
              Ajouter categorie
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {derivedCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onDelete={() => {
                  void confirm({
                    title: 'Supprimer la categorie ?',
                    message: `"${category.name}" ne sera supprimee que si elle n'est plus utilisee.`,
                    confirmLabel: 'Supprimer',
                    tone: 'danger'
                  }).then((confirmed) => {
                    if (confirmed) void removeInventoryCategory(category.id);
                  });
                }}
              />
            ))}
          </div>
        </section>
      )}

      {modalMode === 'material' && (
        <Modal title={editingId ? 'Modifier la matiere' : 'Nouvelle matiere'} onClose={closeModal}>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">Nom de la matiere</span>
              <input
                value={materialForm.name}
                onChange={(event) => setMaterialForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex: Tomate, viande hachee, fromage tranche"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">Categorie</span>
              <select
                value={materialForm.category}
                onChange={(event) => setMaterialForm((current) => ({ ...current, category: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
              >
                <option value="">Choisir une categorie</option>
                {derivedCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="text-xs font-semibold text-zinc-600">Unite de suivi</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {coreUnits.map((unit) => (
                  <button
                    key={unit.value}
                    onClick={() => setMaterialForm((current) => ({ ...current, unit: unit.value }))}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      materialForm.unit === unit.value
                        ? 'border-zinc-950 bg-zinc-950 text-white'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <div className="text-sm font-bold">{unit.label}</div>
                    <div className={`mt-1 text-xs ${materialForm.unit === unit.value ? 'text-white/70' : 'text-zinc-500'}`}>
                      {unit.hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {!editingId && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                <div className="text-sm font-semibold text-zinc-900">Stock initial optionnel</div>
                <p className="mt-1 text-xs text-zinc-600">
                  Laissez 0 si la matiere existe sans entree. Si vous saisissez une quantite, le systeme cree une entree stock.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-zinc-600">Quantite initiale</span>
                    <input
                      type="number"
                      min={0}
                      value={materialForm.initialQuantity}
                      onChange={(event) =>
                        setMaterialForm((current) => ({ ...current, initialQuantity: Number(event.target.value) }))
                      }
                      placeholder={selectedUnit.placeholder}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-zinc-600">Prix total achat</span>
                    <input
                      type="number"
                      min={0}
                      value={materialForm.initialTotalPrice}
                      onChange={(event) =>
                        setMaterialForm((current) => ({ ...current, initialTotalPrice: Number(event.target.value) }))
                      }
                      placeholder="Ex: 4500"
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none"
                    />
                  </label>
                </div>
                <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-zinc-600">
                  Cout unitaire calcule:{' '}
                  <span className="font-semibold text-zinc-950">
                    {materialForm.initialQuantity > 0
                      ? formatMoney(materialForm.initialTotalPrice / materialForm.initialQuantity)
                      : formatMoney(0)}
                  </span>
                </div>
              </div>
            )}

            <button
              disabled={!materialForm.name.trim() || !materialForm.category}
              onClick={saveMaterial}
              className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {editingId ? 'Mettre a jour' : 'Creer la matiere'}
            </button>
          </div>
        </Modal>
      )}

      {modalMode === 'entry' && (
        <Modal title="Entree de stock" onClose={closeModal}>
          <div className="space-y-3">
            <select
              value={entryForm.ingredientId}
              onChange={(event) => setEntryForm((current) => ({ ...current, ingredientId: Number(event.target.value) }))}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
            >
              <option value={0}>Choisir une matiere premiere</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {formatQuantity(item)}
                </option>
              ))}
            </select>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">
                  {selectedEntryItem?.measurementType === 'portion'
                    ? 'Nombre de portions'
                    : selectedEntryItem?.measurementType === 'volume'
                      ? 'Volume recu'
                      : 'Poids recu'}
                </span>
                <input
                  type="number"
                  min={0}
                  value={entryForm.quantity}
                  onChange={(event) => setEntryForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                  placeholder="Ex: 20"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">Prix total achat</span>
                <input
                  type="number"
                  min={0}
                  value={entryForm.totalPrice}
                  onChange={(event) => setEntryForm((current) => ({ ...current, totalPrice: Number(event.target.value) }))}
                  placeholder="Ex: 4500"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">Statut finance</span>
                <select
                  value={entryForm.expenseStatus}
                  onChange={(event) =>
                    setEntryForm((current) => ({ ...current, expenseStatus: event.target.value as ExpenseStatus }))
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
                >
                  <option value="paid">Payee</option>
                  <option value="planned">A payer</option>
                  <option value="partial">Partielle</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">Paiement</span>
                <select
                  value={entryForm.paymentMethod}
                  onChange={(event) =>
                    setEntryForm((current) => ({ ...current, paymentMethod: event.target.value as FinancePaymentMethod }))
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
                >
                  <option value="cash">Especes</option>
                  <option value="card">Carte</option>
                  <option value="transfer">Virement</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">Fournisseur</span>
                <input
                  value={entryForm.supplierName ?? ''}
                  onChange={(event) => setEntryForm((current) => ({ ...current, supplierName: event.target.value }))}
                  placeholder="Ex: Grossiste centre"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
                />
              </label>
            </div>

            <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
              <Summary label="Matiere" value={selectedEntryItem?.name ?? '-'} />
              <Summary label="Unite" value={selectedEntryItem ? displayUnit(selectedEntryItem.unit) : '-'} />
              <Summary
                label="Cout unitaire calcule"
                value={entryForm.quantity > 0 ? formatMoney(entryForm.totalPrice / entryForm.quantity) : formatMoney(0)}
              />
              <Summary label="Impact finance" value={entryForm.totalPrice > 0 ? `Achat stock - ${formatMoney(entryForm.totalPrice)}` : 'Aucun montant'} />
            </div>

            <button
              disabled={!entryForm.ingredientId || entryForm.quantity <= 0}
              onClick={async () => {
                await addStockEntry(entryForm);
                closeModal();
              }}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Valider l'entree stock
            </button>
          </div>
        </Modal>
      )}

      {modalMode === 'loss' && (
        <Modal title="Declarer une perte" onClose={closeModal}>
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
              Cette action cree un mouvement <span className="font-semibold">OUT / perte</span>. Le stock reste calcule uniquement depuis les mouvements.
            </div>

            <select
              value={lossForm.ingredientId}
              onChange={(event) => setLossForm((current) => ({ ...current, ingredientId: Number(event.target.value) }))}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
            >
              <option value={0}>Choisir une matiere premiere</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {formatQuantity(item)}
                </option>
              ))}
            </select>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">
                {selectedLossItem?.measurementType === 'portion'
                  ? 'Nombre de portions perdues'
                  : selectedLossItem?.measurementType === 'volume'
                    ? 'Volume perdu'
                    : 'Poids perdu'}
              </span>
              <input
                type="number"
                min={0}
                value={lossForm.quantity}
                onChange={(event) => setLossForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                placeholder="Ex: 2"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
              />
            </label>

            <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
              <Summary label="Matiere" value={selectedLossItem?.name ?? '-'} />
              <Summary label="Stock actuel" value={selectedLossItem ? formatQuantity(selectedLossItem) : '-'} />
              <Summary
                label="Stock apres perte"
                value={
                  selectedLossItem
                    ? `${Math.max(0, selectedLossItem.quantity - lossForm.quantity).toLocaleString('fr-DZ', {
                        maximumFractionDigits: 3
                      })} ${displayUnit(selectedLossItem.unit)}`
                    : '-'
                }
              />
            </div>

            <button
              disabled={!lossForm.ingredientId || lossForm.quantity <= 0 || Boolean(selectedLossItem && lossForm.quantity > selectedLossItem.quantity)}
              onClick={async () => {
                await addStockLoss(lossForm);
                closeModal();
              }}
              className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Valider la perte
            </button>
            {selectedLossItem && lossForm.quantity > selectedLossItem.quantity ? (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                La perte ne peut pas depasser le stock disponible.
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {modalMode === 'category' && (
        <Modal title="Nouvelle categorie" onClose={closeModal}>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">Nom de categorie</span>
              <input
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex: Legumes, Viandes, Boissons, Emballages"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">Description optionnelle</span>
              <textarea
                value={categoryForm.description}
                onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Ex: Matieres utilisees dans les recettes chaudes"
                className="mt-1 min-h-24 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
              />
            </label>
            <button
              disabled={!categoryForm.name.trim()}
              onClick={saveCategory}
              className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Creer la categorie
            </button>
          </div>
        </Modal>
      )}
    </WorkspaceShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/90 p-4 shadow-soft">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-zinc-950">{value}</div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span>{label}</span>
      <span className="font-semibold text-zinc-950">{value}</span>
    </div>
  );
}

function MovementRow({ movement }: { movement: StockMovement }) {
  const isIn = movement.type === 'IN';
  return (
    <article className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {movement.type}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-600">
              {formatMovementReason(movement.reason)}
            </span>
            <span className="text-sm font-semibold text-zinc-950">{movement.ingredientName}</span>
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            {movement.category} - {new Date(movement.date).toLocaleString('fr-DZ')}
          </div>
        </div>
        <div className={`text-lg font-black ${isIn ? 'text-emerald-700' : 'text-red-700'}`}>
          {isIn ? '+' : '-'}
          {movement.quantity.toLocaleString('fr-DZ', { maximumFractionDigits: 3 })} {displayUnit(movement.unit)}
        </div>
      </div>
    </article>
  );
}

function formatMovementReason(reason: StockMovement['reason']) {
  if (reason === 'purchase') return 'Achat';
  if (reason === 'sale') return 'Vente';
  if (reason === 'loss') return 'Perte';
  return 'Ajustement';
}

function CategoryCard({ category, onDelete }: { category: InventoryCategory; onDelete: () => void }) {
  return (
    <article className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-zinc-950">{category.name}</div>
          <div className="mt-1 text-xs text-zinc-500">{category.description || 'Aucune description'}</div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
          {category.itemsCount} articles
        </div>
      </div>
      <button
        disabled={category.itemsCount > 0}
        onClick={onDelete}
        className="mt-4 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        Supprimer
      </button>
    </article>
  );
}

function StatusBadge({ status }: { status: InventoryItem['status'] }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        status === 'in_stock'
          ? 'bg-emerald-100 text-emerald-700'
          : status === 'low_stock'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-red-100 text-red-700'
      }`}
    >
      {status === 'in_stock' ? 'En stock' : status === 'low_stock' ? 'Stock bas' : 'Rupture'}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/35 px-3 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-zinc-950">{title}</h3>
          <button onClick={onClose} className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700">
            Fermer
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
