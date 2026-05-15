import { useEffect, useMemo, useState } from 'react';
import { printCustomerInvoice, printKitchenTicket } from '../lib/print';
import { BRAND_NAME, resolveBrandLogoUrl } from '../lib/brand';
import { numberInputValue, parseNumberInput } from '../lib/numberInput';
import { WorkspaceShell } from './WorkspaceShell';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { RestaurantSettings, RestaurantTableInput, ShiftTemplateInput, StaffUserInput } from '../types/pos';
import { useFeedback } from './FeedbackProvider';

type SettingsView = 'general' | 'tickets' | 'staff' | 'roles' | 'tables' | 'shifts';

const defaultSettings: RestaurantSettings = {
  restaurantName: BRAND_NAME,
  currency: 'DZD',
  defaultDeliveryFee: 0,
  lowStockThreshold: 1000,
  logoUrl: null,
  receiptTitle: 'Facture client',
  receiptSubtitle: 'Cuisine rapide & service moderne',
  receiptAddress: 'Alger, Algerie',
  receiptPhone: '0550 00 00 00',
  receiptEmail: null,
  receiptWebsite: null,
  receiptFacebook: null,
  receiptInstagram: '@restaurant',
  receiptTiktok: null,
  receiptWhatsapp: '0550 00 00 00',
  receiptFooter: 'Merci pour votre visite.',
  receiptAdditionalNote: null,
  kitchenTicketHeader: 'Preparation cuisine',
  kitchenTicketFooter: 'Service en cours',
  showContactBlock: true,
  showSocialLinks: true,
  showFooterNote: true,
  showLogoInKitchenTicket: false,
  autoPrintKitchenTicket: false
};

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

const emptyShiftForm: ShiftTemplateInput = {
  name: '',
  startTime: '08:00',
  endTime: '16:00',
  activeDays: [0, 1, 2, 3, 4, 5, 6],
  autoCloseMinutes: 15,
  isActive: true
};

export function SettingsWorkspace() {
  const { confirm, toast } = useFeedback();
  const {
    setCurrentModule,
    restaurantSettings,
    staffUsers,
    roles,
    permissions,
    restaurantTables,
    shiftTemplates,
    orders,
    refreshAdminData,
    saveRestaurantSettings,
    upsertStaffUser,
    resetStaffPasswordForUser,
    saveRolePermissions,
    upsertRestaurantTable,
    removeRestaurantTable,
    saveShiftTemplate,
    removeShiftTemplate
  } = usePosStore();
  const { hasPermission } = useAuthStore();

  const [view, setView] = useState<SettingsView>('general');
  const [settingsForm, setSettingsForm] = useState<RestaurantSettings>(defaultSettings);
  const [staffForm, setStaffForm] = useState<StaffUserInput>(emptyStaffForm);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [passwordReset, setPasswordReset] = useState<{ userId: number | null; value: string }>({ userId: null, value: '' });
  const [tableForm, setTableForm] = useState<RestaurantTableInput>(emptyTableForm);
  const [editingTableId, setEditingTableId] = useState<number | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftTemplateInput>(emptyShiftForm);
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);

  useEffect(() => {
    void refreshAdminData();
  }, [refreshAdminData]);

  useEffect(() => {
    if (restaurantSettings) {
      setSettingsForm({ ...restaurantSettings, defaultDeliveryFee: 0 });
    }
  }, [restaurantSettings]);

  useEffect(() => {
    if (!staffForm.roleId && roles[0]) {
      setStaffForm((current) => ({ ...current, roleId: roles[0].id }));
    }
  }, [roles, staffForm.roleId]);

  const navigation = useMemo(() => {
    const items: Array<{ id: SettingsView; label: string; hint: string }> = [];
    if (hasPermission('settings.read', 'settings.write')) {
      items.push({ id: 'general', label: 'Restaurant', hint: 'Identite & valeurs POS' });
      items.push({ id: 'tickets', label: 'Tickets', hint: 'Facture & cuisine' });
    }
    if (hasPermission('staff.manage')) {
      items.push({ id: 'staff', label: 'Equipe', hint: 'Comptes staff' });
    }
    if (hasPermission('roles.manage')) {
      items.push({ id: 'roles', label: 'Privileges', hint: 'Acces par role' });
    }
    if (hasPermission('tables.manage')) {
      items.push({ id: 'tables', label: 'Tables', hint: 'Salle & zones' });
    }
    if (hasPermission('finance.write')) {
      items.push({ id: 'shifts', label: 'Services', hint: 'Horaires caisse' });
    }
    return items;
  }, [hasPermission]);

  useEffect(() => {
    if (navigation.length > 0 && !navigation.some((item) => item.id === view)) {
      setView(navigation[0].id);
    }
  }, [navigation, view]);

  const previewOrder =
    orders[0] ??
    {
      id: 999,
      type: 'delivery' as const,
      status: 'paid' as const,
      tableNumber: null,
      customerName: 'Client exemple',
      phone: '0550 00 00 00',
      address: 'Alger centre',
      notes: 'Sans oignon',
      deliveryFee: 0,
      deliveryStatus: 'pending' as const,
      totalPrice: 1750,
      createdAt: new Date().toISOString(),
      items: [
        { id: 1, productId: 1, productName: 'Pizza viande', quantity: 1, unitPrice: 1200 },
        { id: 2, productId: 2, productName: 'Boisson', quantity: 1, unitPrice: 350 }
      ]
    };

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

  function editShift(shiftId: number) {
    const shift = shiftTemplates.find((entry) => entry.id === shiftId);
    if (!shift) return;
    setEditingShiftId(shift.id);
    setShiftForm({
      id: shift.id,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      activeDays: shift.activeDays,
      autoCloseMinutes: shift.autoCloseMinutes,
      isActive: shift.isActive
    });
  }

  function resetShiftForm() {
    setEditingShiftId(null);
    setShiftForm(emptyShiftForm);
  }

  function toggleShiftDay(day: number) {
    setShiftForm((current) => {
      const hasDay = current.activeDays.includes(day);
      const activeDays = hasDay ? current.activeDays.filter((entry) => entry !== day) : [...current.activeDays, day];
      return { ...current, activeDays: activeDays.sort((left, right) => left - right) };
    });
  }

  return (
    <WorkspaceShell
      title="Parametres"
      subtitle="Restaurant, tickets, equipe, privileges et plan de salle."
      accent="var(--gradient-settings)"
      icon="⚙️"
      sectionLabel="Module parametres"
      onBack={() => setCurrentModule('apps')}
      navigation={navigation}
      activeView={view}
      onChangeView={(next) => setView(next as SettingsView)}
    >
      {view === 'general' && (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Restaurant" title="Informations principales" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Nom du restaurant" value={settingsForm.restaurantName} onChange={(value) => setSettingsForm((current) => ({ ...current, restaurantName: value }))} placeholder="Ex: اللذيذ" />
              <Field label="Devise" value={settingsForm.currency} onChange={(value) => setSettingsForm((current) => ({ ...current, currency: value }))} placeholder="DZD" />
              <Field
                label="Seuil alerte stock"
                value={numberInputValue(settingsForm.lowStockThreshold)}
                onChange={(value) => setSettingsForm((current) => ({ ...current, lowStockThreshold: parseNumberInput(value) }))}
                placeholder="Ex: 1000"
                type="number"
              />
            </div>
            {hasPermission('settings.write') ? (
              <PrimaryButton onClick={() => void saveRestaurantSettings(settingsForm)}>
                Enregistrer
              </PrimaryButton>
            ) : null}
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Apercu" title="Marque active" />
            <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-5 text-center">
              <img src={resolveBrandLogoUrl(settingsForm.logoUrl)} alt={settingsForm.restaurantName} className="mx-auto h-20 w-20 object-contain" />
              <div className="mt-3 text-xl font-black text-zinc-950">{settingsForm.restaurantName}</div>
              <div className="mt-1 text-sm font-semibold text-brand">{settingsForm.currency}</div>
            </div>
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              Ces valeurs alimentent le POS, les tickets et les rapports. Finance et Paie sont gerees dans leurs modules dedies.
            </div>
          </div>
        </section>
      )}

      {view === 'tickets' && (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="premium-panel rounded-[1.6rem] p-4">
              <SectionTitle label="Branding" title="Facture client" />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Lien logo" value={settingsForm.logoUrl ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, logoUrl: value || null }))} placeholder="Optionnel, sinon /logo.png" />
                <Field label="Titre facture" value={settingsForm.receiptTitle} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptTitle: value }))} placeholder="Facture client" />
                <Field label="Sous-titre" value={settingsForm.receiptSubtitle ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptSubtitle: value || null }))} placeholder="Cuisine rapide & service moderne" />
                <Field label="Adresse" value={settingsForm.receiptAddress ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptAddress: value || null }))} placeholder="Alger, Algerie" />
                <Field label="Telephone" value={settingsForm.receiptPhone ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptPhone: value || null }))} placeholder="0550 00 00 00" />
                <Field label="Email" value={settingsForm.receiptEmail ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptEmail: value || null }))} placeholder="contact@restaurant.dz" />
                <Field label="Site web" value={settingsForm.receiptWebsite ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptWebsite: value || null }))} placeholder="www.restaurant.dz" />
                <Field label="WhatsApp" value={settingsForm.receiptWhatsapp ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptWhatsapp: value || null }))} placeholder="0550 00 00 00" />
                <Field label="Instagram" value={settingsForm.receiptInstagram ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptInstagram: value || null }))} placeholder="@restaurant" />
                <Field label="Facebook" value={settingsForm.receiptFacebook ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptFacebook: value || null }))} placeholder="Page Facebook" />
                <Field label="TikTok" value={settingsForm.receiptTiktok ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptTiktok: value || null }))} placeholder="@restaurant" />
                <Field label="Entete ticket cuisine" value={settingsForm.kitchenTicketHeader ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, kitchenTicketHeader: value || null }))} placeholder="Preparation cuisine" />
              </div>
            </div>

            <div className="premium-panel rounded-[1.6rem] p-4">
              <SectionTitle label="Messages" title="Textes imprimes" />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextArea label="Pied de facture" value={settingsForm.receiptFooter ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptFooter: value || null }))} placeholder="Merci pour votre visite." />
                <TextArea label="Note additionnelle" value={settingsForm.receiptAdditionalNote ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, receiptAdditionalNote: value || null }))} placeholder="Infos supplementaires, promotion, horaires..." />
                <div className="md:col-span-2">
                  <TextArea label="Pied ticket cuisine" value={settingsForm.kitchenTicketFooter ?? ''} onChange={(value) => setSettingsForm((current) => ({ ...current, kitchenTicketFooter: value || null }))} placeholder="Service en cours" compact />
                </div>
              </div>
            </div>

            <div className="premium-panel rounded-[1.6rem] p-4">
              <SectionTitle label="Options" title="Ce qui apparait sur le ticket" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Toggle label="Contacts sur facture" checked={settingsForm.showContactBlock} onChange={(checked) => setSettingsForm((current) => ({ ...current, showContactBlock: checked }))} />
                <Toggle label="Reseaux sociaux" checked={settingsForm.showSocialLinks} onChange={(checked) => setSettingsForm((current) => ({ ...current, showSocialLinks: checked }))} />
                <Toggle label="Pied de facture" checked={settingsForm.showFooterNote} onChange={(checked) => setSettingsForm((current) => ({ ...current, showFooterNote: checked }))} />
                <Toggle label="Logo ticket cuisine" checked={settingsForm.showLogoInKitchenTicket} onChange={(checked) => setSettingsForm((current) => ({ ...current, showLogoInKitchenTicket: checked }))} />
              </div>
              <PrimaryButton onClick={() => void saveRestaurantSettings(settingsForm)}>
                Enregistrer tickets
              </PrimaryButton>
            </div>
          </div>

          <div className="space-y-4">
            <div className="premium-panel rounded-[1.6rem] p-4">
              <SectionTitle label="Apercu" title="Ticket minimal" />
              <div className="mt-3 grid gap-2">
                <button
                  onClick={() => {
                    printCustomerInvoice(previewOrder, settingsForm);
                    toast({ title: 'Apercu facture lance', tone: 'success' });
                  }}
                  className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white shadow-soft"
                >
                  Tester facture
                </button>
                <button
                  onClick={() => {
                    printKitchenTicket(previewOrder, settingsForm);
                    toast({ title: 'Apercu cuisine lance', tone: 'success' });
                  }}
                  className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700"
                >
                  Tester cuisine
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <div className="mb-3 flex justify-center">
                  <img src={resolveBrandLogoUrl(settingsForm.logoUrl)} alt="Logo" className="max-h-16 max-w-[140px] rounded-lg object-contain" />
                </div>
                <div className="text-center text-lg font-black text-zinc-950">{settingsForm.restaurantName}</div>
                {settingsForm.receiptSubtitle ? <div className="mt-1 text-center text-xs text-zinc-500">{settingsForm.receiptSubtitle}</div> : null}
                {settingsForm.showContactBlock ? (
                  <div className="mt-4 space-y-1 text-center text-xs text-zinc-600">
                    {settingsForm.receiptAddress ? <div>{settingsForm.receiptAddress}</div> : null}
                    {settingsForm.receiptPhone ? <div>{settingsForm.receiptPhone}</div> : null}
                    {settingsForm.receiptEmail ? <div>{settingsForm.receiptEmail}</div> : null}
                  </div>
                ) : null}
                {settingsForm.showSocialLinks ? (
                  <div className="mt-4 space-y-1 text-center text-xs text-zinc-500">
                    {settingsForm.receiptInstagram ? <div>Instagram: {settingsForm.receiptInstagram}</div> : null}
                    {settingsForm.receiptFacebook ? <div>Facebook: {settingsForm.receiptFacebook}</div> : null}
                    {settingsForm.receiptWhatsapp ? <div>WhatsApp: {settingsForm.receiptWhatsapp}</div> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      )}

      {view === 'staff' && (
        <section className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Equipe" title={editingStaffId ? 'Modifier un compte' : 'Nouveau compte'} />
            <div className="mt-4 space-y-3">
              <Field label="Nom complet" value={staffForm.fullName} onChange={(value) => setStaffForm((current) => ({ ...current, fullName: value }))} placeholder="Ex: Nadia Bensaid" />
              <Field label="Nom utilisateur" value={staffForm.username} onChange={(value) => setStaffForm((current) => ({ ...current, username: value }))} placeholder="Ex: nadia" />
              <Field label="Email" value={staffForm.email ?? ''} onChange={(value) => setStaffForm((current) => ({ ...current, email: value }))} placeholder="Ex: nadia@restaurant.local" />
              {!editingStaffId ? (
                <Field label="Mot de passe initial" value={staffForm.password ?? ''} onChange={(value) => setStaffForm((current) => ({ ...current, password: value }))} placeholder="Minimum 6 caracteres" type="password" />
              ) : null}
              <Select
                label="Role"
                value={String(staffForm.roleId)}
                onChange={(value) => setStaffForm((current) => ({ ...current, roleId: Number(value) }))}
                options={[['0', 'Choisir un role'], ...roles.map((role) => [String(role.id), role.name] as [string, string])]}
              />
              <Select
                label="Statut"
                value={staffForm.status}
                onChange={(value) => setStaffForm((current) => ({ ...current, status: value as StaffUserInput['status'] }))}
                options={[
                  ['active', 'Actif'],
                  ['disabled', 'Desactive']
                ]}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => void upsertStaffUser(staffForm)} className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white shadow-soft">
                {editingStaffId ? 'Mettre a jour' : 'Creer le compte'}
              </button>
              <button onClick={resetStaffForm} className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700">
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Comptes" title="Utilisateurs et acces" />
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {staffUsers.map((user) => (
                <article key={user.id} className="premium-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">{user.fullName}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {user.username} - {user.roleName}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'}`}>
                      {user.status === 'active' ? 'Actif' : 'Bloque'}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-zinc-500">
                    Derniere connexion: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fr-DZ') : 'Jamais'}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => editStaffUser(user.id)} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-zinc-700">
                      Modifier
                    </button>
                    <button onClick={() => setPasswordReset({ userId: user.id, value: '' })} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-zinc-700">
                      Reinit. mdp
                    </button>
                  </div>
                  {passwordReset.userId === user.id ? (
                    <div className="mt-3 flex flex-col gap-2 md:flex-row">
                      <input
                        type="password"
                        value={passwordReset.value}
                        onChange={(event) => setPasswordReset({ userId: user.id, value: event.target.value })}
                        placeholder="Nouveau mot de passe"
                        className="flex-1 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none"
                      />
                      <button
                        onClick={() => {
                          void resetStaffPasswordForUser(user.id, passwordReset.value);
                          setPasswordReset({ userId: null, value: '' });
                        }}
                        className="rounded-2xl bg-ink px-4 py-2.5 text-sm font-black text-white shadow-soft"
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
          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Privileges" title="Roles et permissions" />
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Active seulement ce dont chaque equipe a besoin. Moins d'acces visibles signifie moins d'erreurs en service.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {roles.map((role) => {
              const selectedCodes = new Set(role.permissions.map((permission) => permission.code));
              return (
                <article key={role.id} className="premium-panel rounded-[1.6rem] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-zinc-950">{role.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">{role.usersCount} utilisateur(s)</div>
                    </div>
                    {role.isSystem ? <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">Systeme</span> : null}
                  </div>
                  <div className="mt-4 grid gap-2">
                    {permissions.map((permission) => (
                      <label key={permission.code} className="flex items-start gap-3 rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-100">
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
          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Salle" title={editingTableId ? 'Modifier une table' : 'Nouvelle table'} />
            <div className="mt-4 space-y-3">
              <Field label="Nom / numero" value={tableForm.name} onChange={(value) => setTableForm((current) => ({ ...current, name: value }))} placeholder="Ex: A1, Terrasse 4" />
              <Field label="Zone" value={tableForm.zone ?? ''} onChange={(value) => setTableForm((current) => ({ ...current, zone: value }))} placeholder="Ex: Salle principale" />
              <Field label="Capacite" type="number" value={numberInputValue(tableForm.capacity)} onChange={(value) => setTableForm((current) => ({ ...current, capacity: parseNumberInput(value) }))} placeholder="Ex: 4" />
              <Toggle label="Table active" checked={tableForm.isActive} onChange={(checked) => setTableForm((current) => ({ ...current, isActive: checked }))} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => void upsertRestaurantTable(tableForm)} className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white shadow-soft">
                {editingTableId ? 'Mettre a jour' : 'Ajouter'}
              </button>
              <button onClick={resetTableForm} className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700">
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Plan" title="Tables disponibles" />
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {restaurantTables.map((table) => (
                <article key={table.id} className="premium-card rounded-2xl p-4">
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
                    <button onClick={() => editTable(table.id)} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-zinc-700">
                      Modifier
                    </button>
                    <button
                      onClick={() => {
                        void confirm({
                          title: 'Supprimer la table ?',
                          message: `"${table.name}" ne sera plus disponible dans le POS.`,
                          confirmLabel: 'Supprimer',
                          tone: 'danger'
                        }).then((confirmed) => {
                          if (confirmed) void removeRestaurantTable(table.id);
                        });
                      }}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {view === 'shifts' && (
        <section className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Services" title={editingShiftId ? 'Modifier un service' : 'Nouveau service'} />
            <p className="mt-2 text-sm text-zinc-500">
              La caisse s'ouvre par service. A la fin de l'horaire, elle se cloture automatiquement apres le delai choisi.
            </p>
            <div className="mt-4 space-y-3">
              <Field label="Nom du service" value={shiftForm.name} onChange={(value) => setShiftForm((current) => ({ ...current, name: value }))} placeholder="Ex: Matin, Soir, Nuit" />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Debut" type="time" value={shiftForm.startTime} onChange={(value) => setShiftForm((current) => ({ ...current, startTime: value }))} placeholder="" />
                <Field label="Fin" type="time" value={shiftForm.endTime} onChange={(value) => setShiftForm((current) => ({ ...current, endTime: value }))} placeholder="" />
              </div>
              <Field
                label="Cloture auto apres fin"
                type="number"
                value={numberInputValue(shiftForm.autoCloseMinutes)}
                onChange={(value) => setShiftForm((current) => ({ ...current, autoCloseMinutes: parseNumberInput(value) }))}
                placeholder="Ex: 15 minutes"
              />
              <div>
                <span className="text-xs font-semibold text-zinc-600">Jours actifs</span>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[
                    [0, 'Dim'],
                    [1, 'Lun'],
                    [2, 'Mar'],
                    [3, 'Mer'],
                    [4, 'Jeu'],
                    [5, 'Ven'],
                    [6, 'Sam']
                  ].map(([day, label]) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleShiftDay(Number(day))}
                      className={`rounded-2xl px-3 py-2 text-xs font-bold transition ${
                        shiftForm.activeDays.includes(Number(day))
                          ? 'bg-ink text-white shadow-soft'
                          : 'bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100 hover:bg-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="Service actif" checked={shiftForm.isActive} onChange={(checked) => setShiftForm((current) => ({ ...current, isActive: checked }))} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={!shiftForm.name.trim() || shiftForm.activeDays.length === 0}
                onClick={async () => {
                  await saveShiftTemplate(shiftForm);
                  resetShiftForm();
                }}
                className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {editingShiftId ? 'Mettre a jour' : 'Creer le service'}
              </button>
              <button onClick={resetShiftForm} className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700">
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Planning" title="Services de caisse" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {shiftTemplates.map((shift) => (
                <article key={shift.id} className="premium-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-zinc-950">{shift.name}</div>
                      <div className="mt-1 text-xs font-semibold text-zinc-500">
                        {shift.startTime} → {shift.endTime}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${shift.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'}`}>
                      {shift.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {shift.activeDays.map((day) => (
                      <span key={day} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-600">
                        {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][day]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    Cloture auto: {shift.autoCloseMinutes} min apres la fin
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => editShift(shift.id)} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-zinc-700">
                      Modifier
                    </button>
                    <button
                      onClick={() => {
                        void confirm({
                          title: 'Supprimer ce service ?',
                          message: `"${shift.name}" sera desactive s'il contient deja des caisses.`,
                          confirmLabel: 'Supprimer',
                          tone: 'danger'
                        }).then((confirmed) => {
                          if (confirmed) void removeShiftTemplate(shift.id);
                        });
                      }}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
              {shiftTemplates.length === 0 ? (
                <div className="premium-card rounded-2xl border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 md:col-span-2">
                  Aucun service configure. Creez au moins un horaire pour ouvrir la caisse POS.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}
    </WorkspaceShell>
  );
}

function SectionTitle({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">{label}</div>
      <h2 className="mt-1 text-xl font-bold text-zinc-950">{title}</h2>
    </div>
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
        className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none transition focus:border-brand/50 focus:bg-white"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  compact = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  compact?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none transition focus:border-brand/50 focus:bg-white ${compact ? 'min-h-20' : 'min-h-24'}`}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none transition focus:border-brand/50 focus:bg-white">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3 py-3 text-sm text-zinc-700 ring-1 ring-zinc-100">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function PrimaryButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-4 rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white shadow-soft">
      {children}
    </button>
  );
}
