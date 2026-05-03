import { ReactNode, useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';
import { MeasurementUnit, MenuCategory, MenuItem } from '../types/pos';
import { usePosStore } from '../store/usePosStore';
import { useFeedback } from './FeedbackProvider';
import { WorkspaceShell } from './WorkspaceShell';

type RecipesView = 'catalog' | 'categories' | 'margins';
type ModalMode = 'recipe' | 'category' | null;

const emptyRecipeForm = {
  name: '',
  categoryId: 0,
  image: '',
  estimatedCost: 0,
  sellingPrice: 0,
  ingredients: [{ inventoryItemId: 0, amountUsed: 0, unit: 'g' as MeasurementUnit }]
};

const emptyCategoryForm = {
  name: '',
  description: ''
};

function recipeUnitForInventory(unit: MeasurementUnit): MeasurementUnit {
  if (unit === 'kg' || unit === 'g') return 'g';
  if (unit === 'liter' || unit === 'ml') return 'ml';
  return 'portion';
}

export function RecipesWorkspace() {
  const { confirm } = useFeedback();
  const {
    inventoryItems,
    menuItems,
    menuCategories,
    upsertMenuItem,
    removeMenuItem,
    addMenuCategory,
    removeMenuCategory,
    setCurrentModule
  } = usePosStore();
  const [view, setView] = useState<RecipesView>('catalog');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [form, setForm] = useState(emptyRecipeForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');

  const selectedCategory = menuCategories.find((category) => category.id === form.categoryId);
  const recipeInventoryItems = useMemo(
    () => inventoryItems.filter((item) => item.usageType !== 'direct_sale'),
    [inventoryItems]
  );

  const computedMetrics = useMemo(() => {
    const estimatedCost = form.estimatedCost;
    const profit = form.sellingPrice - estimatedCost;
    const margin = form.sellingPrice > 0 ? (profit / form.sellingPrice) * 100 : 0;
    return { estimatedCost, profit, margin };
  }, [form.estimatedCost, form.sellingPrice]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, menuItems, search]);

  const averageCost = menuItems.length
    ? menuItems.reduce((sum, item) => sum + item.estimatedCost, 0) / menuItems.length
    : 0;
  const averageMargin = menuItems.length
    ? menuItems.reduce((sum, item) => sum + item.margin, 0) / menuItems.length
    : 0;
  const sortedByMargin = [...menuItems].sort((left, right) => right.margin - left.margin);

  function openRecipeModal(item?: MenuItem) {
    if (item) {
      setEditingId(item.id);
      setForm({
        name: item.name,
        categoryId: item.categoryId ?? 0,
        image: item.image ?? '',
        estimatedCost: item.estimatedCost,
        sellingPrice: item.sellingPrice,
        ingredients: item.ingredients.map((ingredient) => ({
          inventoryItemId: ingredient.inventoryItemId,
          amountUsed: ingredient.amountUsed,
          unit: ingredient.unit
        }))
      });
    } else {
      setEditingId(null);
      setForm({
        ...emptyRecipeForm,
        categoryId: menuCategories[0]?.id ?? 0
      });
    }
    setModalMode('recipe');
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
    setForm(emptyRecipeForm);
    setCategoryForm(emptyCategoryForm);
  }

  async function saveRecipe() {
    await upsertMenuItem({
      id: editingId ?? undefined,
      name: form.name,
      categoryId: form.categoryId || null,
      category: selectedCategory?.name ?? 'General',
      image: form.image || null,
      estimatedCost: form.estimatedCost,
      sellingPrice: form.sellingPrice,
      ingredients: form.ingredients.filter((ingredient) => ingredient.inventoryItemId !== 0 && ingredient.amountUsed > 0)
    });
    closeModal();
    setView('catalog');
  }

  async function saveCategory() {
    await addMenuCategory({
      name: categoryForm.name,
      description: categoryForm.description || null
    });
    closeModal();
  }

  return (
    <WorkspaceShell
      title="Recettes / Menu"
      subtitle="Creez des articles vendables a partir du stock avec cout estime, prix de vente et marge."
      accent="var(--gradient-recipes)"
      icon="🍔"
      sectionLabel="Module recettes"
      onBack={() => setCurrentModule('apps')}
      navigation={[
        { id: 'catalog', label: 'Catalogue', hint: 'Articles vendables' },
        { id: 'categories', label: 'Categories', hint: 'Categories & recettes' },
        { id: 'margins', label: 'Marges', hint: 'Rentabilite' }
      ]}
      activeView={view}
      onChangeView={(nextView) => setView(nextView as RecipesView)}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Articles menu" value={String(menuItems.length)} />
        <Metric label="Categories" value={String(menuCategories.length)} />
        <Metric label="Cout moyen" value={formatMoney(averageCost)} />
        <Metric label="Marge moyenne" value={`${averageMargin.toFixed(1)}%`} />
      </section>

      {view === 'catalog' && (
        <section className="premium-panel rounded-[1.6rem] p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Catalogue</div>
              <h2 className="mt-1 text-xl font-bold text-zinc-950">Recettes vendables</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[220px_180px_150px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une recette..."
                className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold outline-none"
              />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold outline-none"
              >
                <option value="all">Toutes categories</option>
                {menuCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => openRecipeModal()}
                className="rounded-2xl bg-ink px-4 py-2.5 text-sm font-black text-white shadow-soft"
              >
                Nouvelle recette
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filteredMenuItems.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                onEdit={() => openRecipeModal(item)}
                onDelete={() => {
                  void confirm({
                    title: 'Supprimer la recette ?',
                    message: `"${item.name}" sera retiree du menu.`,
                    confirmLabel: 'Supprimer',
                    tone: 'danger'
                  }).then((confirmed) => {
                    if (confirmed) void removeMenuItem(item.id);
                  });
                }}
              />
            ))}
          </div>
        </section>
      )}

      {view === 'categories' && (
        <section className="premium-panel rounded-[1.6rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Categories menu</div>
              <h2 className="mt-1 text-xl font-bold text-zinc-950">Chaque categorie contient ses recettes</h2>
            </div>
            <button onClick={() => setModalMode('category')} className="rounded-2xl bg-ink px-4 py-2.5 text-sm font-black text-white shadow-soft">
              Ajouter categorie
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {menuCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                recipes={menuItems.filter((item) => item.categoryId === category.id)}
                onDelete={() => {
                  void confirm({
                    title: 'Supprimer la categorie ?',
                    message: `"${category.name}" sera supprimee si aucune recette ne la bloque.`,
                    confirmLabel: 'Supprimer',
                    tone: 'danger'
                  }).then((confirmed) => {
                    if (confirmed) void removeMenuCategory(category.id);
                  });
                }}
              />
            ))}
          </div>
        </section>
      )}

      {view === 'margins' && (
        <section className="premium-panel rounded-[1.6rem] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Rentabilite</div>
          <h2 className="mt-1 text-xl font-bold text-zinc-950">Marges par recette</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-100 bg-white/70">
            <table className="min-w-full divide-y divide-zinc-100">
              <thead className="bg-brand/5">
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                  <th className="px-4 py-3">Recette</th>
                  <th className="px-4 py-3">Categorie</th>
                  <th className="px-4 py-3">Cout</th>
                  <th className="px-4 py-3">Prix</th>
                  <th className="px-4 py-3">Profit</th>
                  <th className="px-4 py-3">Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white/80">
                {sortedByMargin.map((item) => (
                  <tr key={item.id} className="text-sm text-zinc-700 transition hover:bg-orange-50/45">
                    <td className="px-4 py-3 font-semibold text-zinc-950">{item.name}</td>
                    <td className="px-4 py-3">{item.category}</td>
                    <td className="px-4 py-3">{formatMoney(item.estimatedCost)}</td>
                    <td className="px-4 py-3">{formatMoney(item.sellingPrice)}</td>
                    <td className="px-4 py-3">{formatMoney(item.profit)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {item.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {modalMode === 'recipe' && (
        <Modal title={editingId ? 'Modifier la recette' : 'Nouvelle recette'} onClose={closeModal}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
                <div className="text-sm font-semibold text-zinc-950">Identite de la recette</div>
                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-600">Nom de la recette</span>
                    <input
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Ex: Pizza viande, Burger maison, Jus citron"
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-600">Categorie</span>
                    <select
                      value={form.categoryId}
                      onChange={(event) => setForm((current) => ({ ...current, categoryId: Number(event.target.value) }))}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none"
                    >
                      <option value={0}>Choisir une categorie</option>
                      {menuCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
                <div className="text-sm font-semibold text-zinc-950">Valeurs commerciales</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-600">Cout estime</span>
                    <input
                      type="number"
                      min="0"
                      value={form.estimatedCost}
                      onChange={(event) => setForm((current) => ({ ...current, estimatedCost: Number(event.target.value) }))}
                      placeholder="Ex: 420"
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-600">Prix de vente</span>
                    <input
                      type="number"
                      min="0"
                      value={form.sellingPrice}
                      onChange={(event) => setForm((current) => ({ ...current, sellingPrice: Number(event.target.value) }))}
                      placeholder="Ex: 1200"
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-zinc-600">Image optionnelle</span>
                    <input
                      value={form.image}
                      onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))}
                      placeholder="Collez un lien image ou laissez vide"
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Ingredients depuis le stock</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      L unite suit automatiquement la matiere choisie pour garder la saisie exacte.
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        ingredients: [...current.ingredients, { inventoryItemId: 0, amountUsed: 0, unit: 'g' }]
                      }))
                    }
                    className="rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white shadow-soft"
                  >
                    Ajouter
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {form.ingredients.map((ingredient, index) => {
                    const selectedInventory = inventoryItems.find((item) => item.id === ingredient.inventoryItemId);
                    return (
                      <div
                        key={`${ingredient.inventoryItemId}-${index}`}
                        className="grid gap-2 rounded-2xl border border-zinc-200 bg-white/90 p-3 md:grid-cols-[1.3fr_0.55fr_0.35fr_auto]"
                      >
                        <select
                          value={ingredient.inventoryItemId}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              ingredients: current.ingredients.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? {
                                      ...entry,
                                      inventoryItemId: Number(event.target.value),
                                      unit:
                                        recipeUnitForInventory(
                                          inventoryItems.find((item) => item.id === Number(event.target.value))?.unit ??
                                            entry.unit
                                        )
                                    }
                                  : entry
                              )
                            }))
                          }
                          className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none"
                        >
                          <option value={0}>Choisir une matiere premiere</option>
                          {recipeInventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          value={ingredient.amountUsed}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              ingredients: current.ingredients.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, amountUsed: Number(event.target.value) } : entry
                              )
                            }))
                          }
                          placeholder={
                            ingredient.unit === 'g'
                              ? 'Ex: 150'
                              : ingredient.unit === 'ml'
                                ? 'Ex: 80'
                                : 'Ex: 1'
                          }
                          className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none"
                        />
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-center text-sm font-black text-zinc-600">
                          {ingredient.unit}
                        </div>
                        <button
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              ingredients: current.ingredients.filter((_, entryIndex) => entryIndex !== index)
                            }))
                          }
                          className="rounded-2xl bg-red-50 px-3 py-2.5 text-xs font-black text-red-600"
                        >
                          Retirer
                        </button>
                        {selectedInventory ? (
                          <div className="text-xs text-zinc-500 md:col-span-4">
                            Unite stock: <span className="font-semibold text-zinc-700">{selectedInventory.unit}</span>
                            {' '}• Stock actuel: <span className="font-semibold text-zinc-700">{selectedInventory.quantity}</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                disabled={!form.name.trim() || !form.categoryId || form.sellingPrice < 0 || form.estimatedCost < 0}
                onClick={saveRecipe}
                className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {editingId ? 'Mettre a jour' : 'Enregistrer'}
              </button>
            </div>

            <aside className="rounded-2xl bg-zinc-950 p-4 text-white xl:sticky xl:top-4 xl:self-start">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">Resume</div>
              <div className="mt-4 space-y-3">
                <Summary label="Categorie" value={selectedCategory?.name ?? '-'} dark />
                <Summary label="Cout estime" value={formatMoney(form.estimatedCost)} dark />
                <Summary label="Prix" value={formatMoney(form.sellingPrice)} dark />
                <Summary label="Profit" value={formatMoney(computedMetrics.profit)} dark />
                <Summary label="Marge" value={`${computedMetrics.margin.toFixed(1)}%`} dark />
                <Summary
                  label="Ingredients valides"
                  value={String(form.ingredients.filter((ingredient) => ingredient.inventoryItemId !== 0 && ingredient.amountUsed > 0).length)}
                  dark
                />
              </div>
            </aside>
          </div>
        </Modal>
      )}

      {modalMode === 'category' && (
        <Modal title="Nouvelle categorie menu" onClose={closeModal}>
          <FormField
            label="Nom de categorie"
            value={categoryForm.name}
            onChange={(value) => setCategoryForm((current) => ({ ...current, name: value }))}
            placeholder="Ex: Pizza, Burgers, Boissons, Desserts"
          />
          <TextAreaField
            label="Description optionnelle"
            value={categoryForm.description}
            onChange={(value) => setCategoryForm((current) => ({ ...current, description: value }))}
            placeholder="Ex: Toutes les recettes vendues autour de la pizza"
          />
          <button
            disabled={!categoryForm.name.trim()}
            onClick={saveCategory}
            className="mt-3 w-full rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white disabled:bg-zinc-300"
          >
            Creer la categorie
          </button>
        </Modal>
      )}
    </WorkspaceShell>
  );
}

function MenuCard({ item, onEdit, onDelete }: { item: MenuItem; onEdit: () => void; onDelete: () => void }) {
  const isDirectSale = item.sourceType === 'direct_stock';

  return (
    <article className="premium-card rounded-2xl p-4 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{item.category}</div>
          <div className="mt-1 text-lg font-bold text-zinc-950">{item.name}</div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isDirectSale ? 'bg-sky-100 text-sky-700' : 'bg-white text-zinc-700'}`}>
          {isDirectSale ? 'Vente directe' : `${item.ingredients.length} ingredients`}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-zinc-600">
        <Summary label="Cout" value={formatMoney(item.estimatedCost)} />
        <Summary label="Prix" value={formatMoney(item.sellingPrice)} />
        <Summary label="Profit" value={formatMoney(item.profit)} />
        <Summary label="Marge" value={`${item.margin.toFixed(1)}%`} />
      </div>

      <div className="mt-4 flex gap-2">
        {isDirectSale ? (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
            Gere dans stock
          </span>
        ) : (
          <>
            <button onClick={onEdit} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700">
              Modifier
            </button>
            <button onClick={onDelete} className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
              Supprimer
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function CategoryCard({
  category,
  recipes,
  onDelete
}: {
  category: MenuCategory;
  recipes: MenuItem[];
  onDelete: () => void;
}) {
  return (
    <article className="premium-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-zinc-950">{category.name}</div>
          <div className="mt-1 text-xs text-zinc-500">{category.description || 'Aucune description'}</div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
          {recipes.length} recettes
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {recipes.length === 0 ? (
          <div className="rounded-2xl bg-white px-3 py-3 text-xs text-zinc-500">Aucune recette dans cette categorie.</div>
        ) : (
          recipes.slice(0, 4).map((recipe) => (
            <div key={recipe.id} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm">
              <span className="font-semibold text-zinc-800">{recipe.name}</span>
              <span className="text-xs text-zinc-500">{formatMoney(recipe.sellingPrice)}</span>
            </div>
          ))
        )}
      </div>
      <button
        disabled={recipes.length > 0}
        onClick={onDelete}
        className="mt-4 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        Supprimer
      </button>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="premium-card rounded-2xl p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-zinc-950">{value}</div>
    </div>
  );
}

function Summary({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={dark ? 'text-white/65' : ''}>{label}</span>
      <span className={dark ? 'font-semibold text-white' : 'font-semibold text-zinc-950'}>{value}</span>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 min-h-24 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
      />
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/35 px-3 py-6 backdrop-blur-sm">
      <div className="dialog-panel-motion premium-panel mx-auto w-full max-w-5xl rounded-[1.7rem] bg-white p-5 shadow-2xl">
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-4 rounded-2xl bg-white/90 py-1 backdrop-blur">
          <h3 className="text-lg font-bold text-zinc-950">{title}</h3>
          <button onClick={onClose} className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm font-black text-zinc-700">
            Fermer
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
