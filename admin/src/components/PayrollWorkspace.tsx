import { useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { EmployeeProfileInput, PayrollAdjustmentInput, PayrollEntryInput, PayrollPaymentInput, PayrollPeriodInput, PayrollPeriodStatus, SalaryAdvanceInput } from '../types/pos';
import { WorkspaceShell } from './WorkspaceShell';

type PayrollView = 'employees' | 'periods' | 'advances' | 'adjustments';
type PayrollStatusFilter = 'all' | PayrollPeriodStatus;

const emptyEmployeeProfileForm: EmployeeProfileInput = {
  userId: 0,
  position: '',
  employmentType: 'monthly',
  baseSalary: 0,
  hireDate: '',
  isActive: true,
  payrollNotes: ''
};

const emptyAdvanceForm: SalaryAdvanceInput = {
  employeeId: 0,
  amount: 0,
  reason: '',
  method: 'cash',
  note: '',
  date: new Date().toISOString().slice(0, 10)
};

const emptyPayrollPeriodForm: PayrollPeriodInput = {
  label: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  notes: ''
};

const emptyAdjustmentForm: PayrollAdjustmentInput = {
  employeeId: 0,
  periodId: null,
  type: 'deduction',
  amount: 0,
  reason: '',
  note: '',
  date: new Date().toISOString().slice(0, 10)
};

export function PayrollWorkspace() {
  const {
    setCurrentModule,
    staffUsers,
    employeeProfiles,
    salaryAdvances,
    payrollAdjustments,
    payrollPeriods,
    upsertEmployeePayrollProfile,
    addSalaryAdvance,
    addPayrollAdjustment,
    removePayrollAdjustment,
    addPayrollPeriod,
    savePayrollEntry,
    addPayrollPayment,
    savePayrollPeriodStatus
  } = usePosStore();
  const [view, setView] = useState<PayrollView>('employees');
  const [employeeProfileForm, setEmployeeProfileForm] = useState<EmployeeProfileInput>(emptyEmployeeProfileForm);
  const [advanceForm, setAdvanceForm] = useState<SalaryAdvanceInput>(emptyAdvanceForm);
  const [adjustmentForm, setAdjustmentForm] = useState<PayrollAdjustmentInput>(emptyAdjustmentForm);
  const [payrollPeriodForm, setPayrollPeriodForm] = useState<PayrollPeriodInput>(emptyPayrollPeriodForm);
  const [payrollEntryDrafts, setPayrollEntryDrafts] = useState<Record<number, PayrollEntryInput>>({});
  const [payrollPaymentDrafts, setPayrollPaymentDrafts] = useState<Record<number, PayrollPaymentInput>>({});
  const [periodStatusFilter, setPeriodStatusFilter] = useState<PayrollStatusFilter>('all');
  const [periodSearch, setPeriodSearch] = useState('');
  const canSaveEmployee = employeeProfileForm.userId > 0 && employeeProfileForm.baseSalary > 0;
  const canCreatePeriod = payrollPeriodForm.label.trim().length > 0 && Boolean(payrollPeriodForm.startDate) && Boolean(payrollPeriodForm.endDate);
  const canCreateAdvance = advanceForm.employeeId > 0 && advanceForm.amount > 0 && advanceForm.reason.trim().length > 0;
  const canCreateAdjustment = adjustmentForm.employeeId > 0 && adjustmentForm.amount > 0 && adjustmentForm.reason.trim().length > 0;

  const payrollTotals = useMemo(() => {
    return payrollPeriods.reduce(
      (acc, period) => {
        acc.payroll += period.payrollTotal;
        acc.paid += period.paidTotal;
        acc.remaining += period.remainingTotal;
        acc.deductions += period.entries.reduce((sum, entry) => sum + entry.deductions, 0);
        return acc;
      },
      { payroll: 0, paid: 0, remaining: 0, deductions: 0 }
    );
  }, [payrollPeriods]);

  const adjustmentTotals = useMemo(() => {
    return payrollAdjustments.reduce(
      (acc, adjustment) => {
        acc.total += adjustment.amount;
        if (adjustment.type === 'penalty') acc.penalties += adjustment.amount;
        return acc;
      },
      { total: 0, penalties: 0 }
    );
  }, [payrollAdjustments]);

  const filteredPayrollPeriods = useMemo(() => {
    const query = periodSearch.trim().toLowerCase();
    return payrollPeriods.filter((period) => {
      const matchesStatus = periodStatusFilter === 'all' || period.status === periodStatusFilter;
      const matchesSearch =
        query.length === 0 ||
        period.label.toLowerCase().includes(query) ||
        period.entries.some((entry) => entry.employeeName.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [payrollPeriods, periodSearch, periodStatusFilter]);

  function editEmployeeProfile(userId: number) {
    const profile = employeeProfiles.find((entry) => entry.userId === userId);
    if (!profile) return;
    setEmployeeProfileForm({
      userId: profile.userId,
      position: profile.position ?? '',
      employmentType: profile.employmentType,
      baseSalary: profile.baseSalary,
      hireDate: profile.hireDate?.slice(0, 10) ?? '',
      isActive: profile.isActive,
      payrollNotes: profile.payrollNotes ?? ''
    });
    setView('employees');
  }

  return (
    <WorkspaceShell
      title="Paie"
      subtitle="Profils de paie, avances, periodes salariales et paiements du personnel."
      accent="var(--gradient-payroll)"
      icon="👥"
      sectionLabel="Module paie"
      onBack={() => setCurrentModule('apps')}
      navigation={[
        { id: 'employees', label: 'Employes', hint: 'Profils & base salariale' },
        { id: 'periods', label: 'Periodes', hint: 'Bulletins & paiements' },
        { id: 'advances', label: 'Avances', hint: 'Acomptes & restant' },
        { id: 'adjustments', label: 'Retenues', hint: 'Retenues & penalites' }
      ]}
      activeView={view}
      onChangeView={(next) => setView(next as PayrollView)}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricPanel label="Masse salariale" value={formatMoney(payrollTotals.payroll)} hint="Total net sur les periodes chargees" />
        <MetricPanel label="Deja paye" value={formatMoney(payrollTotals.paid)} hint="Paiements de salaires enregistres" />
        <MetricPanel label="Reste a payer" value={formatMoney(payrollTotals.remaining)} hint="Restant ouvert sur les periodes" />
        <MetricPanel label="Retenues" value={formatMoney(adjustmentTotals.total || payrollTotals.deductions)} hint={`${formatMoney(adjustmentTotals.penalties)} en penalites`} />
      </div>

      {view === 'employees' ? (
        <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Employes</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Profil paie</h2>
            <div className="mt-4 space-y-3">
              <SelectField
                label="Compte staff"
                value={String(employeeProfileForm.userId)}
                onChange={(value) => setEmployeeProfileForm((current) => ({ ...current, userId: Number(value) }))}
                options={[
                  ['0', 'Choisir un employe'],
                  ...staffUsers.map((user) => [String(user.id), `${user.fullName} • ${user.roleName}`] as [string, string])
                ]}
              />
              <Field label="Poste" value={employeeProfileForm.position ?? ''} onChange={(value) => setEmployeeProfileForm((current) => ({ ...current, position: value }))} placeholder="Ex: Chef de rang, Caissier principal" />
              <SelectField label="Type de paie" value={employeeProfileForm.employmentType} onChange={(value) => setEmployeeProfileForm((current) => ({ ...current, employmentType: value as EmployeeProfileInput['employmentType'] }))} options={[['monthly', 'Mensuelle'], ['daily', 'Journaliere'], ['hourly', 'Horaire']]} />
              <Field label="Salaire de base" type="number" value={String(employeeProfileForm.baseSalary || '')} onChange={(value) => setEmployeeProfileForm((current) => ({ ...current, baseSalary: Number(value) }))} placeholder="Ex: 45000" />
              <Field label="Date embauche" type="date" value={employeeProfileForm.hireDate ?? ''} onChange={(value) => setEmployeeProfileForm((current) => ({ ...current, hireDate: value }))} placeholder="" />
              <Toggle label="Employe actif pour la paie" checked={employeeProfileForm.isActive} onChange={(checked) => setEmployeeProfileForm((current) => ({ ...current, isActive: checked }))} />
              <label className="block">
                <span className="text-xs font-semibold text-zinc-600">Notes paie</span>
                <textarea value={employeeProfileForm.payrollNotes ?? ''} onChange={(event) => setEmployeeProfileForm((current) => ({ ...current, payrollNotes: event.target.value }))} placeholder="Ex: prime weekend, contrat saisonnier..." className="mt-1 min-h-20 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                disabled={!canSaveEmployee}
                onClick={() => void upsertEmployeePayrollProfile(employeeProfileForm)}
                className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Sauver profil
              </button>
              <button onClick={() => setEmployeeProfileForm(emptyEmployeeProfileForm)} className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700">Reinitialiser</button>
            </div>
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Equipe paie</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Profils employes</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {employeeProfiles.map((profile) => (
                <article key={profile.id} className="premium-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">{profile.fullName}</div>
                      <div className="mt-1 text-xs text-zinc-500">{profile.position || profile.roleName} • {profile.employmentType}</div>
                    </div>
                    <button onClick={() => editEmployeeProfile(profile.userId)} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-zinc-700">Editer</button>
                  </div>
                  <div className="mt-3 text-sm text-zinc-700">{formatMoney(profile.baseSalary)}</div>
                </article>
              ))}
              {employeeProfiles.length === 0 ? (
                <div className="premium-card rounded-2xl border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 md:col-span-2">
                  Aucun profil paie. Selectionnez un compte staff pour creer le premier profil.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {view === 'periods' ? (
        <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Periodes</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Creer une periode de paie</h2>
            <div className="mt-4 space-y-3">
              <Field label="Libelle" value={payrollPeriodForm.label} onChange={(value) => setPayrollPeriodForm((current) => ({ ...current, label: value }))} placeholder="Ex: Paie Avril 2026" />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Debut" type="date" value={payrollPeriodForm.startDate} onChange={(value) => setPayrollPeriodForm((current) => ({ ...current, startDate: value }))} placeholder="" />
                <Field label="Fin" type="date" value={payrollPeriodForm.endDate} onChange={(value) => setPayrollPeriodForm((current) => ({ ...current, endDate: value }))} placeholder="" />
              </div>
              <Field label="Note" value={payrollPeriodForm.notes ?? ''} onChange={(value) => setPayrollPeriodForm((current) => ({ ...current, notes: value }))} placeholder="Ex: Paie mensuelle staff salle et cuisine" />
              <button
                disabled={!canCreatePeriod}
                onClick={() => {
                  void addPayrollPeriod(payrollPeriodForm);
                  setPayrollPeriodForm(emptyPayrollPeriodForm);
                }}
                className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Generer la periode
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="premium-panel rounded-[1.6rem] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Suivi periodes</div>
                  <h2 className="mt-1 text-xl font-bold text-zinc-950">Bulletins & paiements</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
                  <Field label="Recherche" value={periodSearch} onChange={setPeriodSearch} placeholder="Periode ou employe" />
                  <SelectField
                    label="Statut"
                    value={periodStatusFilter}
                    onChange={(value) => setPeriodStatusFilter(value as PayrollStatusFilter)}
                    options={[
                      ['all', 'Tous'],
                      ['draft', 'Brouillon'],
                      ['validated', 'Validee'],
                      ['paid', 'Cloturee']
                    ]}
                  />
                </div>
              </div>
              <div className="mt-3 text-xs font-semibold text-zinc-500">
                {filteredPayrollPeriods.length} periode(s) affichee(s)
              </div>
            </div>

            {filteredPayrollPeriods.map((period) => (
              <article key={period.id} className="premium-panel rounded-[1.7rem] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-bold text-zinc-950">{period.label}</div>
                      <PeriodBadge status={period.status} />
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {new Date(period.startDate).toLocaleDateString('fr-DZ')} - {new Date(period.endDate).toLocaleDateString('fr-DZ')}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                      Reste {formatMoney(period.remainingTotal)}
                    </span>
                    <button onClick={() => void savePayrollPeriodStatus(period.id, 'draft')} className={statusActionClass(period.status === 'draft')}>Brouillon</button>
                    <button onClick={() => void savePayrollPeriodStatus(period.id, 'validated')} className={statusActionClass(period.status === 'validated')}>Valider</button>
                    <button onClick={() => void savePayrollPeriodStatus(period.id, 'paid')} className={statusActionClass(period.status === 'paid')}>Cloturer</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MetricMini label="Total paie" value={formatMoney(period.payrollTotal)} />
                  <MetricMini label="Paye" value={formatMoney(period.paidTotal)} />
                  <MetricMini label="Reste" value={formatMoney(period.remainingTotal)} />
                </div>
                <div className="mt-4 space-y-3">
                  {period.entries.map((entry) => {
                    const draft = payrollEntryDrafts[entry.id] ?? {
                      baseSalary: entry.baseSalary,
                      bonuses: entry.bonuses,
                      deductions: entry.deductions,
                      advanceDeduction: entry.advanceDeduction,
                      notes: entry.notes ?? ''
                    };
                    const paymentDraft = payrollPaymentDrafts[entry.id] ?? {
                      amount: entry.remainingAmount,
                      method: 'cash',
                      paidAt: new Date().toISOString().slice(0, 10),
                      note: ''
                    };
                    const canPayEntry = entry.remainingAmount > 0 && paymentDraft.amount > 0 && paymentDraft.amount <= entry.remainingAmount;

                    return (
                      <div key={entry.id} className="rounded-2xl border border-zinc-100 bg-zinc-50/85 p-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-zinc-950">{entry.employeeName}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                              <span>{entry.position || 'Sans poste'}</span>
                              <PaymentBadge status={entry.paymentStatus} />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-zinc-900">{formatMoney(entry.netSalary)}</div>
                            <div className="mt-1 text-xs font-black text-amber-600">Reste {formatMoney(entry.remainingAmount)}</div>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-4">
                          <Field label="Base" type="number" value={String(draft.baseSalary)} onChange={(value) => setPayrollEntryDrafts((current) => ({ ...current, [entry.id]: { ...draft, baseSalary: Number(value) } }))} placeholder="" />
                          <Field label="Primes" type="number" value={String(draft.bonuses)} onChange={(value) => setPayrollEntryDrafts((current) => ({ ...current, [entry.id]: { ...draft, bonuses: Number(value) } }))} placeholder="" />
                          <Field label="Retenues" type="number" value={String(draft.deductions)} onChange={(value) => setPayrollEntryDrafts((current) => ({ ...current, [entry.id]: { ...draft, deductions: Number(value) } }))} placeholder="" />
                          <Field label="Avances deduites" type="number" value={String(draft.advanceDeduction)} onChange={(value) => setPayrollEntryDrafts((current) => ({ ...current, [entry.id]: { ...draft, advanceDeduction: Number(value) } }))} placeholder="" />
                        </div>
                        <div className="mt-3">
                          <Field label="Note ligne" value={draft.notes ?? ''} onChange={(value) => setPayrollEntryDrafts((current) => ({ ...current, [entry.id]: { ...draft, notes: value } }))} placeholder="Optionnel" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={() => void savePayrollEntry(entry.id, draft)} className="rounded-2xl bg-ink px-4 py-2.5 text-sm font-black text-white shadow-soft">Mettre a jour ligne</button>
                        </div>
                        <div className="mt-4 rounded-2xl bg-white p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Paiement</div>
                          <div className="mt-3 grid gap-3 md:grid-cols-4">
                            <Field label="Montant" type="number" value={String(paymentDraft.amount)} onChange={(value) => setPayrollPaymentDrafts((current) => ({ ...current, [entry.id]: { ...paymentDraft, amount: Number(value) } }))} placeholder="" />
                            <SelectField label="Mode" value={paymentDraft.method} onChange={(value) => setPayrollPaymentDrafts((current) => ({ ...current, [entry.id]: { ...paymentDraft, method: value as PayrollPaymentInput['method'] } }))} options={[['cash', 'Especes'], ['card', 'Carte'], ['transfer', 'Virement']]} />
                            <Field label="Date" type="date" value={paymentDraft.paidAt ?? ''} onChange={(value) => setPayrollPaymentDrafts((current) => ({ ...current, [entry.id]: { ...paymentDraft, paidAt: value } }))} placeholder="" />
                            <Field label="Note" value={paymentDraft.note ?? ''} onChange={(value) => setPayrollPaymentDrafts((current) => ({ ...current, [entry.id]: { ...paymentDraft, note: value } }))} placeholder="Optionnel" />
                          </div>
                          {paymentDraft.amount > entry.remainingAmount ? (
                            <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">
                              Le montant depasse le reste a payer.
                            </div>
                          ) : null}
                          <div className="mt-3 rounded-2xl bg-brand/10 px-3 py-2 text-xs font-black text-brand ring-1 ring-brand/15">
                            Impact finance: le paiement sera visible automatiquement dans Finance / Salaires.
                          </div>
                          <button
                            disabled={!canPayEntry}
                            onClick={async () => {
                              await addPayrollPayment(entry.id, paymentDraft);
                              setPayrollPaymentDrafts((current) => {
                                const next = { ...current };
                                delete next[entry.id];
                                return next;
                              });
                            }}
                            className="mt-3 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300"
                          >
                            Enregistrer paiement
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
            {filteredPayrollPeriods.length === 0 ? (
              <div className="premium-card rounded-2xl border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">
                Aucune periode ne correspond aux filtres.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {view === 'advances' ? (
        <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Avances</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Enregistrer une avance</h2>
            <div className="mt-4 space-y-3">
              <SelectField
                label="Employe"
                value={String(advanceForm.employeeId)}
                onChange={(value) => setAdvanceForm((current) => ({ ...current, employeeId: Number(value) }))}
                options={[
                  ['0', 'Choisir un employe'],
                  ...employeeProfiles.map((employee) => [String(employee.id), employee.fullName] as [string, string])
                ]}
              />
              <Field label="Montant avance" type="number" value={String(advanceForm.amount || '')} onChange={(value) => setAdvanceForm((current) => ({ ...current, amount: Number(value) }))} placeholder="Ex: 10000" />
              <Field label="Motif" value={advanceForm.reason} onChange={(value) => setAdvanceForm((current) => ({ ...current, reason: value }))} placeholder="Ex: Avance de fin de semaine" />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Paiement" value={advanceForm.method ?? 'cash'} onChange={(value) => setAdvanceForm((current) => ({ ...current, method: value as SalaryAdvanceInput['method'] }))} options={[['cash', 'Especes'], ['card', 'Carte'], ['transfer', 'Virement']]} />
                <Field label="Date" type="date" value={advanceForm.date ?? ''} onChange={(value) => setAdvanceForm((current) => ({ ...current, date: value }))} placeholder="" />
              </div>
              <Field label="Note" value={advanceForm.note ?? ''} onChange={(value) => setAdvanceForm((current) => ({ ...current, note: value }))} placeholder="Optionnel" />
              <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">
                Impact finance: une depense automatique "Avances salaires" sera ajoutee.
              </div>
              <button
                disabled={!canCreateAdvance}
                onClick={() => {
                  void addSalaryAdvance(advanceForm);
                  setAdvanceForm(emptyAdvanceForm);
                }}
                className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Ajouter avance
              </button>
            </div>
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Suivi</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Avances actives</h2>
            <div className="mt-4 space-y-3">
              {salaryAdvances.map((advance) => (
                <article key={advance.id} className="premium-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">{advance.employeeName}</div>
                      <div className="mt-1 text-xs text-zinc-500">{advance.reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-zinc-950">{formatMoney(advance.amount)}</div>
                      <div className="mt-1 text-xs text-amber-600">Reste {formatMoney(advance.remainingAmount)}</div>
                    </div>
                  </div>
                </article>
              ))}
              {salaryAdvances.length === 0 ? (
                <div className="premium-card rounded-2xl border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">
                  Aucune avance active.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {view === 'adjustments' ? (
        <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Retenues</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Ajouter une retenue</h2>
            <div className="mt-4 space-y-3">
              <SelectField
                label="Employe"
                value={String(adjustmentForm.employeeId)}
                onChange={(value) => setAdjustmentForm((current) => ({ ...current, employeeId: Number(value) }))}
                options={[
                  ['0', 'Choisir un employe'],
                  ...employeeProfiles.map((employee) => [String(employee.id), employee.fullName] as [string, string])
                ]}
              />
              <SelectField
                label="Periode"
                value={String(adjustmentForm.periodId ?? 0)}
                onChange={(value) => setAdjustmentForm((current) => ({ ...current, periodId: Number(value) || null }))}
                options={[
                  ['0', 'Sans periode'],
                  ...payrollPeriods.map((period) => [String(period.id), period.label] as [string, string])
                ]}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Type" value={adjustmentForm.type} onChange={(value) => setAdjustmentForm((current) => ({ ...current, type: value as PayrollAdjustmentInput['type'] }))} options={[['deduction', 'Retenue'], ['penalty', 'Penalite']]} />
                <Field label="Montant" type="number" value={String(adjustmentForm.amount || '')} onChange={(value) => setAdjustmentForm((current) => ({ ...current, amount: Number(value) }))} placeholder="Ex: 1500" />
              </div>
              <Field label="Motif" value={adjustmentForm.reason} onChange={(value) => setAdjustmentForm((current) => ({ ...current, reason: value }))} placeholder="Ex: Retard, casse, absence..." />
              <Field label="Date" type="date" value={adjustmentForm.date ?? ''} onChange={(value) => setAdjustmentForm((current) => ({ ...current, date: value }))} placeholder="" />
              <Field label="Note" value={adjustmentForm.note ?? ''} onChange={(value) => setAdjustmentForm((current) => ({ ...current, note: value }))} placeholder="Optionnel" />
              <div className="rounded-2xl bg-brand/10 px-3 py-2 text-xs font-semibold text-brand ring-1 ring-brand/15">
                Si une periode est choisie, la retenue est appliquee automatiquement a la ligne de paie.
              </div>
              <button
                disabled={!canCreateAdjustment}
                onClick={async () => {
                  await addPayrollAdjustment(adjustmentForm);
                  setAdjustmentForm(emptyAdjustmentForm);
                }}
                className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Ajouter retenue
              </button>
            </div>
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Suivi</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Retenues & penalites</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MetricMini label="Total retenues" value={formatMoney(adjustmentTotals.total)} />
              <MetricMini label="Penalites" value={formatMoney(adjustmentTotals.penalties)} />
              <MetricMini label="Nombre" value={String(payrollAdjustments.length)} />
            </div>
            <div className="mt-4 space-y-3">
              {payrollAdjustments.map((adjustment) => (
                <article key={adjustment.id} className="premium-card rounded-2xl p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">{adjustment.employeeName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <AdjustmentBadge type={adjustment.type} />
                        <span>{new Date(adjustment.date).toLocaleDateString('fr-DZ')}</span>
                        {adjustment.periodLabel ? <span>{adjustment.periodLabel}</span> : <span>Sans periode</span>}
                      </div>
                      <div className="mt-2 text-sm text-zinc-700">{adjustment.reason}</div>
                      {adjustment.note ? <div className="mt-1 text-xs text-zinc-500">{adjustment.note}</div> : null}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-zinc-950">{formatMoney(adjustment.amount)}</div>
                      <button
                        onClick={() => void removePayrollAdjustment(adjustment.id)}
                        className="mt-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {payrollAdjustments.length === 0 ? (
                <div className="premium-card rounded-2xl border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">
                  Aucune retenue enregistree.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </WorkspaceShell>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-3 text-sm text-zinc-700 ring-1 ring-zinc-100">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function formatPayrollStatus(status: PayrollPeriodStatus) {
  const labels: Record<PayrollPeriodStatus, string> = {
    draft: 'Brouillon',
    validated: 'Validee',
    paid: 'Cloturee'
  };
  return labels[status];
}

function PeriodBadge({ status }: { status: PayrollPeriodStatus }) {
  const toneClass: Record<PayrollPeriodStatus, string> = {
    draft: 'bg-zinc-100 text-zinc-600',
    validated: 'bg-brand/10 text-brand',
    paid: 'bg-emerald-50 text-emerald-700'
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[status]}`}>
      {formatPayrollStatus(status)}
    </span>
  );
}

function PaymentBadge({ status }: { status: 'unpaid' | 'partial' | 'paid' }) {
  const labels: Record<typeof status, string> = {
    unpaid: 'Non paye',
    partial: 'Partiel',
    paid: 'Paye'
  };
  const toneClass: Record<typeof status, string> = {
    unpaid: 'bg-amber-50 text-amber-700',
    partial: 'bg-brand/10 text-brand',
    paid: 'bg-emerald-50 text-emerald-700'
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[status]}`}>
      {labels[status]}
    </span>
  );
}

function AdjustmentBadge({ type }: { type: 'deduction' | 'penalty' }) {
  const labels: Record<typeof type, string> = {
    deduction: 'Retenue',
    penalty: 'Penalite'
  };
  const toneClass: Record<typeof type, string> = {
    deduction: 'bg-amber-50 text-amber-700',
    penalty: 'bg-red-50 text-red-600'
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[type]}`}>{labels[type]}</span>;
}

function statusActionClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-black ${
    active ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-700'
  }`;
}

function MetricPanel({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="premium-card rounded-2xl p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand">{label}</div>
      <div className="mt-3 text-2xl font-black text-zinc-950">{value}</div>
      <div className="mt-2 text-sm text-zinc-500">{hint}</div>
    </article>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</div>
      <div className="mt-2 text-sm font-bold text-zinc-950">{value}</div>
    </div>
  );
}
