import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import {
  bulkCreateEmployeeAccountTransactions,
  createEmployeeAccountTransaction,
  fetchEmployeeAccounts,
  fetchPayrollSettings,
  updatePayrollSettings
} from '../lib/api';
import { formatMoney } from '../lib/format';
import { numberInputValue, parseNumberInput } from '../lib/numberInput';
import { usePosStore } from '../store/usePosStore';
import {
  EmployeeAccount,
  EmployeeAccountBulkInput,
  EmployeeAccountTransactionInput,
  EmployeeAccountTransactionType,
  EmployeeProfileInput,
  PayrollPaymentMode,
  PayrollSettings
} from '../types/pos';
import { useFeedback } from './FeedbackProvider';
import { WorkspaceShell } from './WorkspaceShell';

type PayrollView = 'accounts' | 'history' | 'bulk' | 'settings';

const today = () => new Date().toISOString().slice(0, 10);

const defaultSettings: PayrollSettings = {
  paymentMode: 'daily',
  defaultDailyAmount: 0,
  monthlyDivisor: 30,
  allowNegativeBalance: true,
  autoDeductAcompte: true
};

const emptyEmployeeProfileForm: EmployeeProfileInput = {
  userId: null,
  fullName: '',
  position: '',
  employmentType: 'daily',
  baseSalary: 0,
  hireDate: '',
  isActive: true,
  payrollNotes: ''
};

const emptyTransactionForm: EmployeeAccountTransactionInput = {
  employeeId: 0,
  type: 'acompte',
  amount: 0,
  label: '',
  note: '',
  occurredAt: today()
};

const emptyBulkForm: EmployeeAccountBulkInput = {
  employeeIds: [],
  type: 'payment',
  amount: null,
  label: '',
  note: '',
  occurredAt: today()
};

export function PayrollWorkspace() {
  const { confirm, toast } = useFeedback();
  const {
    setCurrentModule,
    staffUsers,
    employeeProfiles,
    refreshAdminData,
    upsertEmployeePayrollProfile
  } = usePosStore();
  const [view, setView] = useState<PayrollView>('accounts');
  const [accounts, setAccounts] = useState<EmployeeAccount[]>([]);
  const [settings, setSettings] = useState<PayrollSettings>(defaultSettings);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [employeeProfileForm, setEmployeeProfileForm] = useState<EmployeeProfileInput>(emptyEmployeeProfileForm);
  const [transactionForm, setTransactionForm] = useState<EmployeeAccountTransactionInput>(emptyTransactionForm);
  const [bulkForm, setBulkForm] = useState<EmployeeAccountBulkInput>(emptyBulkForm);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function loadPayroll() {
    setIsLoading(true);
    try {
      const [nextAccounts, nextSettings] = await Promise.all([fetchEmployeeAccounts(), fetchPayrollSettings()]);
      setAccounts(nextAccounts);
      setSettings(nextSettings);
      if (!selectedEmployeeId && nextAccounts[0]) {
        setSelectedEmployeeId(nextAccounts[0].employeeId);
      }
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Chargement paie impossible', tone: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPayroll();
  }, []);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return accounts.filter((account) => {
      if (!query) return true;
      return [account.fullName, account.position, account.roleName].some((value) => value?.toLowerCase().includes(query));
    });
  }, [accounts, search]);

  const selectedAccount = accounts.find((account) => account.employeeId === selectedEmployeeId) ?? filteredAccounts[0] ?? null;

  const allTransactions = useMemo(() => {
    return accounts
      .flatMap((account) => account.transactions.map((transaction) => ({ ...transaction, employeeName: account.fullName })))
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
  }, [accounts]);

  const totals = useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        acc.due += account.dueAmount;
        acc.toPay += account.finalPayment;
        acc.acompte += account.acompteTotal;
        acc.deductions += account.deductionTotal;
        if (account.accountBalance < 0) acc.negative += 1;
        return acc;
      },
      { due: 0, toPay: 0, acompte: 0, deductions: 0, negative: 0 }
    );
  }, [accounts]);

  function selectAccount(account: EmployeeAccount) {
    setSelectedEmployeeId(account.employeeId);
    setTransactionForm((current) => ({ ...current, employeeId: account.employeeId }));
  }

  async function submitTransaction(input: EmployeeAccountTransactionInput) {
    setIsLoading(true);
    try {
      const nextAccounts = await createEmployeeAccountTransaction(input);
      setAccounts(nextAccounts);
      setTransactionForm({ ...emptyTransactionForm, employeeId: input.employeeId, occurredAt: today() });
      toast({ title: 'Mouvement ajoute', tone: 'success' });
      await refreshAdminData();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Mouvement impossible', tone: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function payAccount(account: EmployeeAccount) {
    if (account.finalPayment <= 0) {
      toast({ title: 'Aucun montant positif a payer', tone: 'warning' });
      return;
    }
    const confirmed = await confirm({
      title: 'Valider le paiement ?',
      message: `${account.fullName} recevra ${formatMoney(account.finalPayment)} en especes.`,
      confirmLabel: 'Payer',
      tone: 'info'
    });
    if (!confirmed) return;
    await submitTransaction({
      employeeId: account.employeeId,
      type: 'payment',
      amount: account.finalPayment,
      label: `Paiement ${formatPaymentMode(settings.paymentMode)}`,
      note: 'Paiement depuis compte employe',
      occurredAt: today()
    });
  }

  async function submitBulk() {
    if (bulkForm.employeeIds.length === 0) {
      toast({ title: 'Selectionnez au moins un employe', tone: 'warning' });
      return;
    }
    const isAutoPayment = bulkForm.type === 'payment' && (!bulkForm.amount || bulkForm.amount <= 0);
    if (!isAutoPayment && (!bulkForm.amount || bulkForm.amount <= 0)) {
      toast({ title: 'Montant requis', tone: 'warning' });
      return;
    }
    const confirmed = await confirm({
      title: 'Appliquer en groupe ?',
      message: `${bulkForm.employeeIds.length} employe(s) seront mis a jour.`,
      confirmLabel: 'Appliquer',
      tone: 'info'
    });
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const nextAccounts = await bulkCreateEmployeeAccountTransactions(bulkForm);
      setAccounts(nextAccounts);
      setBulkForm(emptyBulkForm);
      toast({ title: 'Operation groupee appliquee', tone: 'success' });
      await refreshAdminData();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Operation groupee impossible', tone: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSettings() {
    setIsLoading(true);
    try {
      const nextSettings = await updatePayrollSettings(settings);
      setSettings(nextSettings);
      toast({ title: 'Reglages paie enregistres', tone: 'success' });
      await loadPayroll();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Sauvegarde reglages impossible', tone: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <WorkspaceShell
      title="Paie"
      subtitle="Comptes employes, a comptes, retenues, perdus et paiements journaliers."
      accent="var(--gradient-payroll)"
      icon="👥"
      sectionLabel="Module paie"
      onBack={() => setCurrentModule('apps')}
      navigation={[
        { id: 'accounts', label: 'Comptes', hint: 'Cartes & actions' },
        { id: 'history', label: 'Historique', hint: 'Transactions' },
        { id: 'bulk', label: 'Groupe', hint: 'Paiements rapides' },
        { id: 'settings', label: 'Reglages', hint: 'Mode de paie' }
      ]}
      activeView={view}
      onChangeView={(next) => setView(next as PayrollView)}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricPanel label="A payer" value={formatMoney(totals.toPay)} hint="Apres a comptes et retenues" />
        <MetricPanel label="Base periode" value={formatMoney(totals.due)} hint={`Mode ${formatPaymentMode(settings.paymentMode)}`} />
        <MetricPanel label="A comptes" value={formatMoney(totals.acompte)} hint="Argent deja donne" />
        <MetricPanel label="Retenues" value={formatMoney(totals.deductions)} hint="Perso + perdus" />
        <MetricPanel label="Negatifs" value={String(totals.negative)} hint="Comptes sous zero" />
      </div>

      {view === 'accounts' ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <SectionTitle label="Comptes" title="Employes" />
              <Field label="Recherche" value={search} onChange={setSearch} placeholder="Nom, poste, role..." />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredAccounts.map((account) => (
                <button
                  key={account.employeeId}
                  type="button"
                  onClick={() => selectAccount(account)}
                  className={`rounded-[1.35rem] p-4 text-left transition hover:-translate-y-0.5 ${
                    selectedAccount?.employeeId === account.employeeId
                      ? 'bg-zinc-950 text-white shadow-xl shadow-zinc-950/15'
                      : 'premium-card text-zinc-950 hover:shadow-soft'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black">{account.fullName}</div>
                      <div className={`mt-1 text-xs font-semibold ${selectedAccount?.employeeId === account.employeeId ? 'text-white/60' : 'text-zinc-500'}`}>
                        {account.position || account.roleName}
                      </div>
                    </div>
                    <StatusPill balance={account.accountBalance} active={selectedAccount?.employeeId === account.employeeId} />
                  </div>
                  <div className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] opacity-60">A payer</div>
                  <div className="mt-1 text-2xl font-black">{formatMoney(account.finalPayment)}</div>
                  <div className={`mt-3 grid grid-cols-2 gap-2 text-xs font-bold ${selectedAccount?.employeeId === account.employeeId ? 'text-white/72' : 'text-zinc-500'}`}>
                    <MiniStat label="A compte" value={formatMoney(account.acompteTotal)} />
                    <MiniStat label="Retenues" value={formatMoney(account.deductionTotal)} />
                  </div>
                </button>
              ))}
              {filteredAccounts.length === 0 ? (
                <EmptyState text="Aucun compte employe. Creez un profil paie dans Reglages." />
              ) : null}
            </div>
          </div>

          <AccountPanel
            account={selectedAccount}
            transactionForm={transactionForm}
            setTransactionForm={setTransactionForm}
            isLoading={isLoading}
            onSubmitTransaction={submitTransaction}
            onPay={payAccount}
          />
        </section>
      ) : null}

      {view === 'history' ? (
        <section className="premium-panel rounded-[1.6rem] p-4">
          <SectionTitle label="Historique" title="Toutes les transactions employes" />
          <div className="mt-4 space-y-2">
            {allTransactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
            {allTransactions.length === 0 ? <EmptyState text="Aucune transaction de paie pour le moment." /> : null}
          </div>
        </section>
      ) : null}

      {view === 'bulk' ? (
        <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Groupe" title="Action rapide" />
            <div className="mt-4 space-y-3">
              <SelectField
                label="Action"
                value={bulkForm.type}
                onChange={(value) => setBulkForm((current) => ({ ...current, type: value as EmployeeAccountTransactionType }))}
                options={transactionOptions}
              />
              <Field
                label={bulkForm.type === 'payment' ? 'Montant fixe (vide = final auto)' : 'Montant'}
                type="number"
                value={bulkForm.amount === null || bulkForm.amount === undefined ? '' : numberInputValue(bulkForm.amount)}
                onChange={(value) => setBulkForm((current) => ({ ...current, amount: value === '' ? null : parseNumberInput(value) }))}
                placeholder={bulkForm.type === 'payment' ? 'Laisser vide pour payer le final' : 'Ex: 1000'}
              />
              <Field label="Libelle" value={bulkForm.label ?? ''} onChange={(value) => setBulkForm((current) => ({ ...current, label: value }))} placeholder="Ex: Paiement journee" />
              <Field label="Date" type="date" value={bulkForm.occurredAt ?? today()} onChange={(value) => setBulkForm((current) => ({ ...current, occurredAt: value }))} placeholder="" />
              <TextArea label="Note" value={bulkForm.note ?? ''} onChange={(value) => setBulkForm((current) => ({ ...current, note: value }))} placeholder="Optionnel" />
              <button disabled={isLoading || bulkForm.employeeIds.length === 0} onClick={() => void submitBulk()} className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300">
                Appliquer au groupe
              </button>
            </div>
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Selection" title={`${bulkForm.employeeIds.length} employe(s)`} />
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => {
                const checked = bulkForm.employeeIds.includes(account.employeeId);
                return (
                  <label key={account.employeeId} className={`rounded-2xl p-3 text-sm ring-1 transition ${checked ? 'bg-zinc-950 text-white ring-zinc-950' : 'bg-zinc-50 text-zinc-700 ring-zinc-100'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setBulkForm((current) => ({
                          ...current,
                          employeeIds: event.target.checked
                            ? [...current.employeeIds, account.employeeId]
                            : current.employeeIds.filter((id) => id !== account.employeeId)
                        }));
                      }}
                      className="mr-2"
                    />
                    <span className="font-bold">{account.fullName}</span>
                    <span className="ml-2 text-xs opacity-70">{formatMoney(account.finalPayment)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {view === 'settings' ? (
        <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Reglages" title="Mode de paiement" />
            <div className="mt-4 space-y-3">
              <SelectField
                label="Frequence"
                value={settings.paymentMode}
                onChange={(value) => setSettings((current) => ({ ...current, paymentMode: value as PayrollPaymentMode }))}
                options={[
                  ['daily', 'Journalier'],
                  ['weekly', 'Hebdomadaire'],
                  ['monthly', 'Mensuel']
                ]}
              />
              <Field label="Montant journalier par defaut" type="number" value={numberInputValue(settings.defaultDailyAmount)} onChange={(value) => setSettings((current) => ({ ...current, defaultDailyAmount: parseNumberInput(value) }))} placeholder="Ex: 2000" />
              <Field label="Diviseur mensuel" type="number" value={numberInputValue(settings.monthlyDivisor)} onChange={(value) => setSettings((current) => ({ ...current, monthlyDivisor: parseNumberInput(value) || 30 }))} placeholder="30" />
              <Toggle label="Autoriser solde negatif" checked={settings.allowNegativeBalance} onChange={(checked) => setSettings((current) => ({ ...current, allowNegativeBalance: checked }))} />
              <Toggle label="Deduction automatique des a comptes" checked={settings.autoDeductAcompte} onChange={(checked) => setSettings((current) => ({ ...current, autoDeductAcompte: checked }))} />
              <button disabled={isLoading} onClick={() => void saveSettings()} className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white shadow-soft disabled:bg-zinc-300">
                Enregistrer reglages
              </button>
            </div>
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <SectionTitle label="Profils" title="Comptes paie" />
            <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-3">
                <SelectField
                  label="Compte staff"
                  value={String(employeeProfileForm.userId ?? 0)}
                  onChange={(value) => setEmployeeProfileForm((current) => ({ ...current, userId: Number(value) || null }))}
                  options={[
                    ['0', 'Travailleur sans acces'],
                    ...staffUsers.map((user) => [String(user.id), `${user.fullName} · ${user.roleName}`] as [string, string])
                  ]}
                />
                {!employeeProfileForm.userId ? (
                  <Field label="Nom travailleur" value={employeeProfileForm.fullName ?? ''} onChange={(value) => setEmployeeProfileForm((current) => ({ ...current, fullName: value }))} placeholder="Ex: Mohamed cuisine" />
                ) : null}
                <Field label="Poste" value={employeeProfileForm.position ?? ''} onChange={(value) => setEmployeeProfileForm((current) => ({ ...current, position: value }))} placeholder="Ex: Serveur" />
                <SelectField label="Type salaire" value={employeeProfileForm.employmentType} onChange={(value) => setEmployeeProfileForm((current) => ({ ...current, employmentType: value as EmployeeProfileInput['employmentType'] }))} options={[['daily', 'Journalier'], ['monthly', 'Mensuel'], ['hourly', 'Horaire']]} />
                <Field label="Salaire base" type="number" value={numberInputValue(employeeProfileForm.baseSalary)} onChange={(value) => setEmployeeProfileForm((current) => ({ ...current, baseSalary: parseNumberInput(value) }))} placeholder="Ex: 2000" />
                <Toggle label="Actif" checked={employeeProfileForm.isActive} onChange={(checked) => setEmployeeProfileForm((current) => ({ ...current, isActive: checked }))} />
                <button
                  disabled={(!employeeProfileForm.userId && !employeeProfileForm.fullName?.trim()) || employeeProfileForm.baseSalary <= 0}
                  onClick={async () => {
                    await upsertEmployeePayrollProfile(employeeProfileForm);
                    setEmployeeProfileForm(emptyEmployeeProfileForm);
                    await refreshAdminData();
                    await loadPayroll();
                  }}
                  className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white disabled:bg-zinc-300"
                >
                  Sauver profil
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {employeeProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setEmployeeProfileForm({
                      userId: profile.userId,
                      id: profile.id,
                      fullName: profile.userId ? '' : profile.fullName,
                      position: profile.position ?? '',
                      employmentType: profile.employmentType,
                      baseSalary: profile.baseSalary,
                      hireDate: profile.hireDate?.slice(0, 10) ?? '',
                      isActive: profile.isActive,
                      payrollNotes: profile.payrollNotes ?? ''
                    })}
                    className="rounded-2xl bg-zinc-50 p-3 text-left text-sm ring-1 ring-zinc-100"
                  >
                    <div className="font-bold text-zinc-950">{profile.fullName}</div>
                    <div className="mt-1 text-xs text-zinc-500">{profile.position || profile.roleName} · {formatMoney(profile.baseSalary)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </WorkspaceShell>
  );
}

function AccountPanel({
  account,
  transactionForm,
  setTransactionForm,
  isLoading,
  onSubmitTransaction,
  onPay
}: {
  account: EmployeeAccount | null;
  transactionForm: EmployeeAccountTransactionInput;
  setTransactionForm: Dispatch<SetStateAction<EmployeeAccountTransactionInput>>;
  isLoading: boolean;
  onSubmitTransaction: (input: EmployeeAccountTransactionInput) => Promise<void>;
  onPay: (account: EmployeeAccount) => Promise<void>;
}) {
  if (!account) {
    return (
      <aside className="premium-panel rounded-[1.6rem] p-4">
        <EmptyState text="Selectionnez un employe." />
      </aside>
    );
  }

  return (
    <aside className="premium-panel rounded-[1.6rem] p-4 xl:sticky xl:top-4 xl:self-start">
      <SectionTitle label="Compte" title={account.fullName} />
      <div className="mt-4 rounded-3xl bg-zinc-950 p-4 text-white">
        <div className="text-xs font-bold text-white/60">Paiement final</div>
        <div className="mt-2 text-3xl font-black">{formatMoney(account.finalPayment)}</div>
        <div className={`mt-2 text-xs font-bold ${account.accountBalance < 0 ? 'text-red-200' : 'text-emerald-200'}`}>
          Solde: {formatMoney(account.accountBalance)}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricMini label="Base" value={formatMoney(account.dueAmount)} />
        <MetricMini label="A compte" value={formatMoney(account.acompteTotal)} />
        <MetricMini label="Retenues" value={formatMoney(account.deductionTotal)} />
        <MetricMini label="Payé" value={formatMoney(account.paidTotal)} />
      </div>
      <button disabled={isLoading || account.finalPayment <= 0} onClick={() => void onPay(account)} className="mt-3 w-full rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white shadow-soft disabled:bg-zinc-300">
        Payer maintenant
      </button>

      <div className="mt-5 rounded-3xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Ajouter mouvement</div>
        <div className="mt-3 space-y-3">
          <SelectField label="Type" value={transactionForm.type} onChange={(value) => setTransactionForm((current) => ({ ...current, employeeId: account.employeeId, type: value as EmployeeAccountTransactionType }))} options={transactionOptions} />
          <Field label="Montant" type="number" value={numberInputValue(transactionForm.amount)} onChange={(value) => setTransactionForm((current) => ({ ...current, employeeId: account.employeeId, amount: parseNumberInput(value) }))} placeholder="Ex: 1000" />
          <Field label="Libelle" value={transactionForm.label ?? ''} onChange={(value) => setTransactionForm((current) => ({ ...current, employeeId: account.employeeId, label: value }))} placeholder="Ex: Perdu commande #14" />
          <TextArea label="Note" value={transactionForm.note ?? ''} onChange={(value) => setTransactionForm((current) => ({ ...current, employeeId: account.employeeId, note: value }))} placeholder="Optionnel" />
          <button disabled={isLoading || transactionForm.amount <= 0} onClick={() => void onSubmitTransaction({ ...transactionForm, employeeId: account.employeeId })} className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white disabled:bg-zinc-300">
            Ajouter au compte
          </button>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-100 pt-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Historique</div>
        <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {account.transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}
          {account.transactions.length === 0 ? <EmptyState text="Aucun mouvement." /> : null}
        </div>
      </div>
    </aside>
  );
}

const transactionOptions: Array<[EmployeeAccountTransactionType, string]> = [
  ['acompte', 'A compte'],
  ['personal_deduction', 'Retenue personnelle'],
  ['lost_deduction', 'Perdu / casse'],
  ['payment', 'Paiement'],
  ['bonus', 'Prime']
];

function formatPaymentMode(mode: PayrollPaymentMode) {
  const labels: Record<PayrollPaymentMode, string> = {
    daily: 'journalier',
    weekly: 'hebdomadaire',
    monthly: 'mensuel'
  };
  return labels[mode];
}

function formatTransactionType(type: EmployeeAccountTransactionType) {
  const labels: Record<EmployeeAccountTransactionType, string> = {
    acompte: 'A compte',
    personal_deduction: 'Retenue',
    lost_deduction: 'Perdu',
    payment: 'Paiement',
    bonus: 'Prime'
  };
  return labels[type];
}

function TransactionRow({ transaction }: { transaction: { employeeName?: string; type: EmployeeAccountTransactionType; amount: number; impact: number; label: string; note: string | null; occurredAt: string } }) {
  const positive = transaction.impact >= 0;
  return (
    <div className="rounded-2xl bg-zinc-50 px-3 py-2 ring-1 ring-zinc-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-zinc-900">{transaction.employeeName ? `${transaction.employeeName} · ` : ''}{formatTransactionType(transaction.type)}</div>
          <div className="mt-0.5 text-xs text-zinc-500">{transaction.label}</div>
          {transaction.note ? <div className="mt-0.5 text-xs text-zinc-400">{transaction.note}</div> : null}
          <div className="mt-1 text-[11px] font-semibold text-zinc-400">{new Date(transaction.occurredAt).toLocaleDateString('fr-DZ')}</div>
        </div>
        <div className={`text-sm font-black ${positive ? 'text-emerald-700' : 'text-red-600'}`}>
          {positive ? '+' : '-'}{formatMoney(transaction.amount)}
        </div>
      </div>
    </div>
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

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none transition focus:border-brand/50 focus:bg-white" />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 min-h-20 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none transition focus:border-brand/50 focus:bg-white" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none transition focus:border-brand/50 focus:bg-white">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3 py-3 text-sm text-zinc-700 ring-1 ring-zinc-100">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
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
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-zinc-950">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-black/5">
      {label}<br /><span className="font-black">{value}</span>
    </div>
  );
}

function StatusPill({ balance, active }: { balance: number; active: boolean }) {
  if (balance < 0) {
    return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${active ? 'bg-red-500/15 text-red-200' : 'bg-red-50 text-red-600'}`}>Negatif</span>;
  }
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${active ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700'}`}>OK</span>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">
      {text}
    </div>
  );
}
