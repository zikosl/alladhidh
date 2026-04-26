import { useEffect, useMemo, useState } from 'react';
import { WorkspaceShell } from './WorkspaceShell';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { RestaurantSettings, RestaurantTableInput, StaffUserInput } from '../types/pos';

type SettingsView = 'general' | 'staff' | 'roles' | 'tables';

const emptyStaffForm: StaffUserInput = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  roleId: 0,
  status: 'active'
};

const emptyTableForm: RestaurantTableInput = {
  name: '',
  zone: '',
  capacity: 4,
  isActive: true
};

export function SettingsWorkspace() {
  const {
    setCurrentModule,
    restaurantSettings,
    staffUsers,
    roles,
    permissions,
    restaurantTables,
    refreshAdminData,
    saveRestaurantSettings,
    upsertStaffUser,
    resetStaffPasswordForUser,
    saveRolePermissions,
    upsertRestaurantTable,
    removeRestaurantTable
  } = usePosStore();
  const { hasPermission } = useAuthStore();
  const [view, setView] = useState<SettingsView>('general');
  const [settingsForm, setSettingsForm] = useState<RestaurantSettings>({
    restaurantName: 'Restaurant Suite',
    currency: 'DZD',
    defaultDeliveryFee: 200,
    lowStockThreshold: 1000,
    receiptFooter: 'Merci pour votre visite.'
  });
  const [staffForm, setStaffForm] = useState<StaffUserInput>(emptyStaffForm);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [passwordReset, setPasswordReset] = useState<{ userId: number | null; value: string }>({ userId: null, value: '' });
  const [tableForm, setTableForm] = useState<RestaurantTableInput>(emptyTableForm);
  const [editingTableId, setEditingTableId] = useState<number | null>(null);

  useEffect(() => {
    void refreshAdminData();
  }, [refreshAdminData]);

  useEffect(() => {
    if (restaurantSettings) {
      setSettingsForm(restaurantSettings);
    }
  }, [restaurantSettings]);

  const navigation = useMemo(() => {
    const items: Array<{ id: SettingsView; label: string; hint: string }> = [];
    if (hasPermission('settings.read', 'settings.write')) {
      items.push({ id: 'general', label: 'General', hint: 'Restaurant & POS' });
    }
    if (hasPermission('staff.manage')) {
      items.push({ id: 'staff', label: 'Equipe', hint: 'Comptes & acces' });
    }
    if (hasPermission('roles.manage')) {
      items.push({ id: 'roles', label: 'Privileges', hint: 'Roles & permissions' });
    }
    if (hasPermission('tables.manage')) {
      items.push({ id: 'tables', label: 'Tables', hint: 'Salle & capacites' });
    }
    return items;
  }, [hasPermission]);

  useEffect(() => {
    if (navigation.length > 0 && !navigation.some((item) => item.id === view)) {
      setView(navigation[0].id);
    }
  }, [navigation, view]);

  function editStaffUser(userId: number) {
    const user = staffUsers.find((entry) => entry.id === userId);
    if (!user) return;
    setEditingStaffId(userId);
    setStaffForm({
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: '',
      roleId: user.roleId,
      status: user.status
    });
  }

  function resetStaffForm() {
    setEditingStaffId(null);
    setStaffForm({
      ...emptyStaffForm,
      roleId: roles[0]?.id ?? 0
    });
  }

  function editTable(tableId: number) {
    const table = restaurantTables.find((entry) => entry.id === tableId);
    if (!table) return;
    setEditingTableId(tableId);
    setTableForm({
      id: table.id,
      name: table.name,
      zone: table.zone ?? '',
      capacity: table.capacity,
      isActive: table.isActive
    });
  }

  function resetTableForm() {
    setEditingTableId(null);
    setTableForm(emptyTableForm);
  }

  return (
    <WorkspaceShell
      title="Parametres"
      subtitle="Administration du restaurant, de l’equipe, des roles, des tables et des preferences d’exploitation."
      accent="linear-gradient(135deg, #64748b, #94a3b8)"
      icon="⚙️"
      sectionLabel="Module parametres"
      onBack={() => setCurrentModule('apps')}
      navigation={navigation}
      activeView={view}
      onChangeView={(next) => setView(next as SettingsView)}
    >
      {view === 'general' && (
        <section className="rounded-2xl bg-white/90 p-4 shadow-soft">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">General</div>
          <h2 className="mt-1 text-xl font-bold text-zinc-950">Parametres du restaurant</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Nom du restaurant" value={settingsForm.restaurantName} onChange={(value) => setSettingsForm((current) => ({ ...current, restaurantName: value }))} placeholder="Ex: Restaurant Suite Alger" />
            <Field label="Devise" value={settingsForm.currency} onChange={(value) => setSettingsForm((current) => ({ ...current, currency: value }))} placeholder="DZD" />
            <Field
              label="Frais de livraison par defaut"
              value={String(settingsForm.defaultDeliveryFee)}
              onChange={(value) => setSettingsForm((current) => ({ ...current, defaultDeliveryFee: Number(value) }))}
              placeholder="Ex: 200"
              type="number"
            />
            <Field
              label="Seuil alerte stock"
              value={String(settingsForm.lowStockThreshold)}
              onChange={(value) => setSettingsForm((current) => ({ ...current, lowStockThreshold: Number(value) }))}
              placeholder="Ex: 1000"
              type="number"
            />
            <div className="md:col-span-2">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-600">Pied de ticket</span>
                <textarea
                  value={settingsForm.receiptFooter ?? ''}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, receiptFooter: event.target.value }))}
                  placeholder="Ex: Merci pour votre visite. A bientot."
                  className="mt-1 min-h-24 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
                />
              </label>
            </div>
          </div>
          {hasPermission('settings.write') ? (
            <button
              onClick={() => void saveRestaurantSettings(settingsForm)}
              className="mt-4 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white"
            >
              Enregistrer les parametres
            </button>
          ) : null}
        </section>
      )}

      {view === 'staff' && (
        <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Equipe</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">{editingStaffId ? 'Modifier un compte' : 'Nouveau compte'}</h2>
            <div className="mt-4 space-y-3">
              <Field label="Nom complet" value={staffForm.fullName} onChange={(value) => setStaffForm((current) => ({ ...current, fullName: value }))} placeholder="Ex: Nadia Bensaid" />
              <Field label="Nom utilisateur" value={staffForm.username} onChange={(value) => setStaffForm((current) => ({ ...current, username: value }))} placeholder="Ex: nadia" />
              <Field label="Email" value={staffForm.email ?? ''} onChange={(value) => setStaffForm((current) => ({ ...current, email: value }))} placeholder="Ex: nadia@restaurant.local" />
              {!editingStaffId ? (
                <Field label="Mot de passe initial" value={staffForm.password ?? ''} onChange={(value) => setStaffForm((current) => ({ ...current, password: value }))} placeholder="Minimum 6 caracteres" type="password" />
              ) : null}
              <label className="block">
                <span className="text-xs font-semibold text-zinc-600">Role</span>
                <select
                  value={staffForm.roleId}
                  onChange={(event) => setStaffForm((current) => ({ ...current, roleId: Number(event.target.value) }))}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
                >
                  <option value={0}>Choisir un role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-zinc-600">Statut</span>
                <select
                  value={staffForm.status}
                  onChange={(event) => setStaffForm((current) => ({ ...current, status: event.target.value as 'active' | 'disabled' }))}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
                >
                  <option value="active">Actif</option>
                  <option value="disabled">Desactive</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => void upsertStaffUser(staffForm)}
                className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white"
              >
                {editingStaffId ? 'Mettre a jour' : 'Creer le compte'}
              </button>
              <button onClick={resetStaffForm} className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Comptes equipe</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Utilisateurs et acces</h2>
            <div className="mt-4 space-y-3">
              {staffUsers.map((user) => (
                <article key={user.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">{user.fullName}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {user.username} • {user.roleName} • {user.status === 'active' ? 'Actif' : 'Desactive'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => editStaffUser(user.id)} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
                        Modifier
                      </button>
                      <button
                        onClick={() => setPasswordReset({ userId: user.id, value: '' })}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
                      >
                        Reinit. mdp
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-zinc-500">
                    Derniere connexion: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fr-DZ') : 'Jamais'}
                  </div>
                  {passwordReset.userId === user.id ? (
                    <div className="mt-3 flex flex-col gap-2 md:flex-row">
                      <input
                        type="password"
                        value={passwordReset.value}
                        onChange={(event) => setPasswordReset({ userId: user.id, value: event.target.value })}
                        placeholder="Nouveau mot de passe"
                        className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none"
                      />
                      <button
                        onClick={() => {
                          void resetStaffPasswordForUser(user.id, passwordReset.value);
                          setPasswordReset({ userId: null, value: '' });
                        }}
                        className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        Confirmer
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {view === 'roles' && (
        <section className="space-y-4">
          <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Privileges</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Matrice de roles et permissions</h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {roles.map((role) => {
              const selectedCodes = new Set(role.permissions.map((permission) => permission.code));
              return (
                <article key={role.id} className="rounded-2xl bg-white/90 p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-zinc-950">{role.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">{role.usersCount} utilisateur(s)</div>
                    </div>
                    <button
                      onClick={() => void saveRolePermissions(role.id, [...selectedCodes])}
                      className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700"
                    >
                      Sauver
                    </button>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {permissions.map((permission) => (
                      <label key={permission.code} className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                        <input
                          type="checkbox"
                          checked={selectedCodes.has(permission.code)}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...selectedCodes, permission.code]
                              : [...selectedCodes].filter((code) => code !== permission.code);
                            void saveRolePermissions(role.id, next);
                          }}
                        />
                        <span>
                          <span className="font-semibold text-zinc-900">{permission.label}</span>
                          <span className="ml-2 text-xs text-zinc-500">{permission.code}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {view === 'tables' && (
        <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Salle</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">{editingTableId ? 'Modifier une table' : 'Nouvelle table'}</h2>
            <div className="mt-4 space-y-3">
              <Field label="Nom / numero" value={tableForm.name} onChange={(value) => setTableForm((current) => ({ ...current, name: value }))} placeholder="Ex: A1, Terrasse 4" />
              <Field label="Zone" value={tableForm.zone ?? ''} onChange={(value) => setTableForm((current) => ({ ...current, zone: value }))} placeholder="Ex: Salle principale, Terrasse" />
              <Field label="Capacite" type="number" value={String(tableForm.capacity)} onChange={(value) => setTableForm((current) => ({ ...current, capacity: Number(value) }))} placeholder="Ex: 4" />
              <label className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={tableForm.isActive}
                  onChange={(event) => setTableForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Table active
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => void upsertRestaurantTable(tableForm)} className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white">
                {editingTableId ? 'Mettre a jour' : 'Ajouter'}
              </button>
              <button onClick={resetTableForm} className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Plan de salle</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Tables disponibles</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {restaurantTables.map((table) => (
                <article key={table.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-zinc-950">{table.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">{table.zone || 'Sans zone'}</div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${table.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'}`}>
                      {table.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-zinc-700">{table.capacity} places</div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => editTable(table.id)} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
                      Modifier
                    </button>
                    <button onClick={() => void removeRestaurantTable(table.id)} className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </WorkspaceShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
      />
    </label>
  );
}
