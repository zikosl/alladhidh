import { useEffect, useMemo, useState } from 'react';
import { fetchDashboard } from '../lib/api';
import { numberInputValue, parseNumberInput } from '../lib/numberInput';
import { WorkspaceShell } from './WorkspaceShell';
import { usePosStore } from '../store/usePosStore';
import { CashSessionInput, DashboardData, ExpenseInput, ExpenseSourceType, FinanceTransaction, ReportFilters } from '../types/pos';
import { formatMoney } from '../lib/format';
import { useFeedback } from './FeedbackProvider';

type FinanceView = 'journal' | 'caisse' | 'categories';
type FinancePeriodFilter = 'today' | 'month' | 'custom';
type FinanceStatusFilter = 'all' | ExpenseInput['status'];
type FinanceSourceFilter = 'all' | ExpenseSourceType | 'finance' | 'pos' | 'stock' | 'payroll' | 'caisse' | 'orders';

const emptyExpenseForm: ExpenseInput = {
  amount: 0,
  categoryId: null,
  type: 'variable',
  status: 'paid',
  paymentMethod: 'cash',
  supplierName: '',
  description: '',
  dueDate: '',
  paidAt: '',
  date: new Date().toISOString().slice(0, 10)
};

const emptyCashSessionForm: CashSessionInput = {
  businessDate: new Date().toISOString().slice(0, 10),
  shiftTemplateId: null,
  openingAmount: 0,
  closingAmount: null,
  status: 'open',
  notes: ''
};

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function formatExpenseStatus(status: ExpenseInput['status']) {
  const labels: Record<ExpenseInput['status'], string> = {
    planned: 'Planifiee',
    partial: 'Partielle',
    paid: 'Payee',
    cancelled: 'Annulee'
  };
  return labels[status];
}

function formatExpenseType(type: ExpenseInput['type']) {
  const labels: Record<ExpenseInput['type'], string> = {
    fixed: 'Fixe',
    variable: 'Variable',
    exceptional: 'Exceptionnelle'
  };
  return labels[type];
}

export function FinanceWorkspace() {
  const { confirm } = useFeedback();
  const {
    setCurrentModule,
    dashboard,
    expenses,
    financeTransactions,
    expenseCategories,
    cashSessions,
    shiftTemplates,
    upsertExpense,
    removeExpense,
    addExpenseCategory,
    removeExpenseCategory,
    saveCashSession,
    removeCashSession
  } = usePosStore();
  const [view, setView] = useState<FinanceView>('journal');
  const [expenseForm, setExpenseForm] = useState<ExpenseInput>(emptyExpenseForm);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [expenseCategoryForm, setExpenseCategoryForm] = useState({ name: '', description: '' });
  const [cashSessionForm, setCashSessionForm] = useState<CashSessionInput>(emptyCashSessionForm);
  const [editingCashSessionId, setEditingCashSessionId] = useState<number | null>(null);
  const [periodFilter, setPeriodFilter] = useState<FinancePeriodFilter>('month');
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<FinanceStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<FinanceSourceFilter>('all');
  const [financeDashboard, setFinanceDashboard] = useState<DashboardData | null>(dashboard);
  const canSaveExpense = expenseForm.amount > 0 && Boolean(expenseForm.categoryId);
  const canSaveCategory = expenseCategoryForm.name.trim().length > 0;
  const canSaveCashSession = Boolean(cashSessionForm.businessDate) && Boolean(cashSessionForm.shiftTemplateId) && cashSessionForm.openingAmount >= 0;

  useEffect(() => {
    setFinanceDashboard(dashboard);
  }, [dashboard]);

  useEffect(() => {
    let cancelled = false;
    const filters: Partial<ReportFilters> =
      periodFilter === 'today'
        ? { period: 'today' }
        : periodFilter === 'month'
          ? { period: '30d' }
          : { period: 'custom', dateFrom, dateTo };

    async function loadFinanceDashboard() {
      try {
        const nextDashboard = await fetchDashboard(filters);
        if (!cancelled) {
          setFinanceDashboard(nextDashboard);
        }
      } catch {
        if (!cancelled) {
          setFinanceDashboard(dashboard);
        }
      }
    }

    void loadFinanceDashboard();
    return () => {
      cancelled = true;
    };
  }, [dashboard, dateFrom, dateTo, periodFilter]);

  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((expense) => {
        const date = new Date(expense.date);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      const expenseIsoDate = dateOnly(expense.date);
      const matchesPeriod =
        periodFilter === 'today'
          ? isSameDay(expenseDate, now)
          : periodFilter === 'month'
            ? isSameMonth(expenseDate, now)
            : (!dateFrom || expenseIsoDate >= dateFrom) && (!dateTo || expenseIsoDate <= dateTo);
      const matchesCategory = categoryFilter === 'all' || String(expense.categoryId ?? '') === categoryFilter;
      const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || expense.sourceType === sourceFilter;
      return matchesPeriod && matchesCategory && matchesStatus && matchesSource;
    });
  }, [categoryFilter, dateFrom, dateTo, expenses, periodFilter, sourceFilter, statusFilter]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return financeTransactions.filter((transaction) => {
      const date = new Date(transaction.occurredAt);
      const isoDate = dateOnly(transaction.occurredAt);
      const matchesPeriod =
        periodFilter === 'today'
          ? isSameDay(date, now)
          : periodFilter === 'month'
            ? isSameMonth(date, now)
            : (!dateFrom || isoDate >= dateFrom) && (!dateTo || isoDate <= dateTo);
      const matchesSource = sourceFilter === 'all' || transaction.sourceModule === sourceFilter || transaction.sourceType === sourceFilter;
      return matchesPeriod && matchesSource;
    });
  }, [dateFrom, dateTo, financeTransactions, periodFilter, sourceFilter]);

  const financeStats = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, transaction) => {
        if (transaction.status === 'cancelled') return acc;
        if (transaction.direction === 'in') {
          acc.in += transaction.amount;
        }
        if (transaction.direction === 'out') {
          acc.out += transaction.amount;
        }
        if (transaction.status !== 'paid') {
          acc.pending += transaction.amount;
          acc.pendingCount += 1;
        }
        return acc;
      },
      { in: 0, out: 0, net: 0, pending: 0, pendingCount: 0 }
    );
  }, [filteredTransactions]);
  financeStats.net = financeStats.in - financeStats.out;

  const cashSessionStats = useMemo(() => {
    return cashSessions.reduce(
      (acc, session) => {
        acc.opening += session.openingAmount;
        acc.expected += session.expectedCash;
        acc.closed += session.closingAmount ?? 0;
        acc.difference += session.difference;
        if (session.status === 'open') acc.openSessions += 1;
        return acc;
      },
      { opening: 0, expected: 0, closed: 0, difference: 0, openSessions: 0 }
    );
  }, [cashSessions]);

  function editExpense(expenseId: number) {
    const expense = expenses.find((entry) => entry.id === expenseId);
    if (!expense) return;
    if (expense.isSystemGenerated) return;
    setEditingExpenseId(expenseId);
    setExpenseForm({
      id: expense.id,
      amount: expense.amount,
      categoryId: expense.categoryId,
      type: expense.type,
      status: expense.status,
      paymentMethod: expense.paymentMethod,
      supplierName: expense.supplierName ?? '',
      description: expense.description ?? '',
      dueDate: expense.dueDate?.slice(0, 10) ?? '',
      paidAt: expense.paidAt?.slice(0, 10) ?? '',
      date: expense.date.slice(0, 10)
    });
  }

  function resetExpenseForm() {
    setEditingExpenseId(null);
    setExpenseForm(emptyExpenseForm);
  }

  function editCashSession(sessionId: number) {
    const session = cashSessions.find((entry) => entry.id === sessionId);
    if (!session) return;
    setEditingCashSessionId(session.id);
    setCashSessionForm({
      id: session.id,
      businessDate: session.businessDate,
      openingAmount: session.openingAmount,
      shiftTemplateId: session.shiftTemplateId,
      closingAmount: session.closingAmount,
      status: session.status,
      notes: session.notes ?? ''
    });
    setView('caisse');
  }

  function resetCashSessionForm() {
    setEditingCashSessionId(null);
    setCashSessionForm(emptyCashSessionForm);
  }

  return (
    <WorkspaceShell
      title="Finance"
      subtitle="Suivi des depenses, des categories de charge et des echeances de paiement."
      accent="var(--gradient-finance)"
      icon="💸"
      sectionLabel="Module finance"
      onBack={() => setCurrentModule('apps')}
      navigation={[
        { id: 'journal', label: 'Journal', hint: 'Depenses & suivi' },
        { id: 'caisse', label: 'Caisse', hint: 'Ouverture & cloture' },
        { id: 'categories', label: 'Categories', hint: 'Structure des charges' }
      ]}
      activeView={view}
      onChangeView={(next) => setView(next as FinanceView)}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricPanel label="Entrees" value={formatMoney(financeStats.in)} hint="Encaissements dans la selection" />
        <MetricPanel label="Sorties" value={formatMoney(financeStats.out)} hint="Achats, charges et paie" />
        <MetricPanel label="Net finance" value={formatMoney(financeStats.net)} hint={`${filteredTransactions.length} operation(s) tracee(s)`} />
        <MetricPanel label="Ce mois" value={formatMoney(currentMonthExpenses)} hint="Total depenses du mois courant" />
        <MetricPanel label="Tresorerie nette" value={formatMoney(financeDashboard?.financials.cashBenefitTotal ?? 0)} hint="Encaissements - sorties sur la periode" />
      </div>

      {view === 'journal' ? (
        <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Depenses</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">{editingExpenseId ? 'Modifier une depense' : 'Nouvelle depense'}</h2>
            <div className="mt-4 space-y-3">
              <Field label="Montant" type="number" value={numberInputValue(expenseForm.amount)} onChange={(value) => setExpenseForm((current) => ({ ...current, amount: parseNumberInput(value) }))} placeholder="Ex: 12000" />
              <SelectField
                label="Categorie"
                value={String(expenseForm.categoryId ?? 0)}
                onChange={(value) => setExpenseForm((current) => ({ ...current, categoryId: Number(value) || null }))}
                options={[
                  ['0', 'Choisir une categorie'],
                  ...expenseCategories.map((category) => [String(category.id), category.name] as [string, string])
                ]}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Type" value={expenseForm.type} onChange={(value) => setExpenseForm((current) => ({ ...current, type: value as ExpenseInput['type'] }))} options={[['fixed', 'Fixe'], ['variable', 'Variable'], ['exceptional', 'Exceptionnelle']]} />
                <SelectField label="Statut" value={expenseForm.status} onChange={(value) => setExpenseForm((current) => ({ ...current, status: value as ExpenseInput['status'] }))} options={[['planned', 'Planifiee'], ['partial', 'Partielle'], ['paid', 'Payee'], ['cancelled', 'Annulee']]} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Paiement" value={expenseForm.paymentMethod ?? 'cash'} onChange={(value) => setExpenseForm((current) => ({ ...current, paymentMethod: value as ExpenseInput['paymentMethod'] }))} options={[['cash', 'Especes'], ['card', 'Carte'], ['transfer', 'Virement']]} />
                <Field label="Date operation" type="date" value={expenseForm.date ?? ''} onChange={(value) => setExpenseForm((current) => ({ ...current, date: value }))} placeholder="" />
              </div>
              <Field label="Fournisseur / beneficiaire" value={expenseForm.supplierName ?? ''} onChange={(value) => setExpenseForm((current) => ({ ...current, supplierName: value }))} placeholder="Ex: Sonelgaz, Grossiste centre" />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Echeance" type="date" value={expenseForm.dueDate ?? ''} onChange={(value) => setExpenseForm((current) => ({ ...current, dueDate: value }))} placeholder="" />
                <Field label="Date paiement" type="date" value={expenseForm.paidAt ?? ''} onChange={(value) => setExpenseForm((current) => ({ ...current, paidAt: value }))} placeholder="" />
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-zinc-600">Description</span>
                <textarea value={expenseForm.description ?? ''} onChange={(event) => setExpenseForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ex: Achat emballage semaine 18" className="mt-1 min-h-24 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                disabled={!canSaveExpense}
                onClick={async () => {
                  await upsertExpense(expenseForm);
                  resetExpenseForm();
                }}
                className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {editingExpenseId ? 'Mettre a jour' : 'Ajouter depense'}
              </button>
              <button onClick={resetExpenseForm} className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700">Reinitialiser</button>
            </div>
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Grand livre</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Toutes les operations finance</h2>
            <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <SelectField
                  label="Periode"
                  value={periodFilter}
                  onChange={(value) => setPeriodFilter(value as FinancePeriodFilter)}
                  options={[
                    ['today', "Aujourd'hui"],
                    ['month', 'Ce mois'],
                    ['custom', 'Personnalise']
                  ]}
                />
                <Field label="Du" type="date" value={dateFrom} onChange={setDateFrom} placeholder="" />
                <Field label="Au" type="date" value={dateTo} onChange={setDateTo} placeholder="" />
                <SelectField
                  label="Categorie"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={[
                    ['all', 'Toutes'],
                    ...expenseCategories.map((category) => [String(category.id), category.name] as [string, string])
                  ]}
                />
                <SelectField
                  label="Statut"
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as FinanceStatusFilter)}
                  options={[
                    ['all', 'Tous'],
                    ['planned', 'Planifiee'],
                    ['partial', 'Partielle'],
                    ['paid', 'Payee'],
                    ['cancelled', 'Annulee']
                  ]}
                />
                <SelectField
                  label="Source"
                  value={sourceFilter}
                  onChange={(value) => setSourceFilter(value as FinanceSourceFilter)}
                  options={[
                    ['all', 'Toutes'],
                    ['finance', 'Finance'],
                    ['pos', 'POS'],
                    ['stock', 'Stock'],
                    ['payroll', 'Paie'],
                    ['caisse', 'Caisse'],
                    ['orders', 'Commandes']
                  ]}
                />
              </div>
              <div className="mt-3 text-xs font-semibold text-zinc-500">
                {filteredTransactions.length} operation(s) affichee(s)
              </div>
            </div>
            {financeDashboard?.charts.cashBenefitPerDay.length ? (
              <div className="mt-4 rounded-2xl border border-zinc-100 bg-white/80 p-3">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Benefice cash par jour</div>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {financeDashboard.charts.cashBenefitPerDay.slice(-6).map((day) => (
                    <div key={day.date} className="rounded-2xl bg-zinc-50 px-3 py-2 ring-1 ring-zinc-100">
                      <div className="text-xs font-semibold text-zinc-500">{day.date}</div>
                      <div className={`mt-1 text-sm font-black ${day.cashBenefit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatMoney(day.cashBenefit)}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        In {formatMoney(day.cashIn)} / Out {formatMoney(day.cashOut)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              {filteredTransactions.map((transaction) => (
                <article key={transaction.id} className="premium-card rounded-2xl p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-zinc-950">{formatFinanceTransactionType(transaction.type)}</div>
                        <FinanceDirectionBadge transaction={transaction} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span>{new Date(transaction.occurredAt).toLocaleString('fr-DZ')}</span>
                        <span>{formatFinanceModule(transaction.sourceModule)}</span>
                        <span>{formatFinanceStatus(transaction.status)}</span>
                        {transaction.paymentMethod ? <span>{formatPaymentMethod(transaction.paymentMethod)}</span> : null}
                      </div>
                      {transaction.sourceLabel ? <div className="mt-2 text-xs font-semibold text-zinc-500">Source: {transaction.sourceLabel}</div> : null}
                      {transaction.employeeName ? <div className="mt-2 text-xs font-semibold text-zinc-500">Employe: {transaction.employeeName}</div> : null}
                      {transaction.description ? <div className="mt-2 text-sm text-zinc-700">{transaction.description}</div> : null}
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-black ${transaction.direction === 'in' ? 'text-emerald-700' : transaction.direction === 'out' ? 'text-red-600' : 'text-zinc-950'}`}>
                        {transaction.direction === 'in' ? '+' : transaction.direction === 'out' ? '-' : ''}
                        {formatMoney(transaction.amount)}
                      </div>
                      <div className="mt-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-500">
                        Auto journal
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {filteredTransactions.length === 0 ? (
                <div className="premium-card rounded-2xl border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">
                  Aucune operation finance ne correspond aux filtres.
                </div>
              ) : null}
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Depenses detaillees</div>
              <div className="mt-3 space-y-3">
              {filteredExpenses.map((expense) => (
                <article key={expense.id} className="premium-card rounded-2xl p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">{expense.category}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span>{new Date(expense.date).toLocaleDateString('fr-DZ')}</span>
                        <span>{formatExpenseType(expense.type)}</span>
                        <StatusBadge status={expense.status} />
                        <SourceBadge sourceType={expense.sourceType} />
                      </div>
                      {expense.sourceLabel ? <div className="mt-2 text-xs font-semibold text-zinc-500">Source: {expense.sourceLabel}</div> : null}
                      {expense.supplierName ? <div className="mt-2 text-xs font-semibold text-zinc-500">{expense.supplierName}</div> : null}
                      {expense.description ? <div className="mt-2 text-sm text-zinc-700">{expense.description}</div> : null}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-zinc-950">{formatMoney(expense.amount)}</div>
                      {expense.isSystemGenerated ? (
                        <div className="mt-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-500">
                          Generee automatiquement
                        </div>
                      ) : (
                        <div className="mt-2 flex justify-end gap-2">
                          <button onClick={() => editExpense(expense.id)} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-zinc-700">Modifier</button>
                          <button
                            onClick={() => {
                              void confirm({
                                title: 'Supprimer la depense ?',
                                message: `${expense.category} - ${formatMoney(expense.amount)} sera retiree du journal.`,
                                confirmLabel: 'Supprimer',
                                tone: 'danger'
                              }).then((confirmed) => {
                                if (confirmed) void removeExpense(expense.id);
                              });
                            }}
                            className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              {filteredExpenses.length === 0 ? (
                <div className="premium-card rounded-2xl border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">
                  Aucune depense ne correspond aux filtres.
                </div>
              ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {view === 'caisse' ? (
        <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Caisse</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">{editingCashSessionId ? 'Modifier la caisse' : 'Ouvrir un service'}</h2>
            <div className="mt-4 space-y-3">
              <Field label="Date caisse" type="date" value={cashSessionForm.businessDate} onChange={(value) => setCashSessionForm((current) => ({ ...current, businessDate: value }))} placeholder="" />
              <SelectField
                label="Service"
                value={String(cashSessionForm.shiftTemplateId ?? 0)}
                onChange={(value) => setCashSessionForm((current) => ({ ...current, shiftTemplateId: Number(value) || null }))}
                options={[
                  ['0', 'Choisir un service'],
                  ...shiftTemplates.filter((shift) => shift.isActive).map((shift) => [String(shift.id), `${shift.name} · ${shift.startTime}-${shift.endTime}`] as [string, string])
                ]}
              />
              <Field label="Fond de caisse" type="number" value={numberInputValue(cashSessionForm.openingAmount)} onChange={(value) => setCashSessionForm((current) => ({ ...current, openingAmount: parseNumberInput(value) }))} placeholder="Ex: 30000" />
              <Field label="Cloture comptee" type="number" value={cashSessionForm.closingAmount === null || cashSessionForm.closingAmount === undefined ? '' : numberInputValue(cashSessionForm.closingAmount)} onChange={(value) => setCashSessionForm((current) => ({ ...current, closingAmount: value === '' ? null : parseNumberInput(value), status: value === '' ? 'open' : 'closed' }))} placeholder="Optionnel en fin de journee" />
              <SelectField label="Statut" value={cashSessionForm.status ?? 'open'} onChange={(value) => setCashSessionForm((current) => ({ ...current, status: value as CashSessionInput['status'] }))} options={[['open', 'Ouverte'], ['closed', 'Cloturee']]} />
              <Field label="Note" value={cashSessionForm.notes ?? ''} onChange={(value) => setCashSessionForm((current) => ({ ...current, notes: value }))} placeholder="Ex: rendu monnaie, ecart explique..." />
              <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                La caisse attendue est calculee automatiquement sur le service: fond + especes encaissees - sorties especes.
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={!canSaveCashSession}
                  onClick={async () => {
                    await saveCashSession(cashSessionForm);
                    resetCashSessionForm();
                  }}
                  className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {editingCashSessionId ? 'Mettre a jour' : 'Ouvrir le service'}
                </button>
                <button onClick={resetCashSessionForm} className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700">Reinitialiser</button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <MetricPanel label="Ouverture" value={formatMoney(financeDashboard?.financials.cashDrawerOpeningTotal ?? cashSessionStats.opening)} hint="Fond de caisse cumule" />
              <MetricPanel label="Attendu" value={formatMoney(financeDashboard?.financials.cashDrawerExpectedTotal ?? cashSessionStats.expected)} hint="Apres ventes et sorties especes" />
              <MetricPanel label="Compte" value={formatMoney(financeDashboard?.financials.cashDrawerClosingTotal ?? cashSessionStats.closed)} hint="Total cloture renseigne" />
              <MetricPanel label="Ecart" value={formatMoney(financeDashboard?.financials.cashDrawerDifferenceTotal ?? cashSessionStats.difference)} hint="Compte - attendu" />
            </div>

            <div className="premium-panel rounded-[1.6rem] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Historique caisse</div>
              <h2 className="mt-1 text-xl font-bold text-zinc-950">Ouvertures & clotures</h2>
              <div className="mt-4 space-y-3">
                {cashSessions.map((session) => (
                  <article key={session.id} className="premium-card rounded-2xl p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-zinc-950">
                          {session.shiftName ?? 'Service manuel'} · {new Date(session.businessDate).toLocaleDateString('fr-DZ')}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <CashStatusBadge status={session.status} />
                          {session.shiftStartAt && session.shiftEndAt ? <span>{new Date(session.shiftStartAt).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}-{new Date(session.shiftEndAt).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</span> : null}
                          {session.closedBySystem ? <span>Cloture auto</span> : null}
                          <span>In {formatMoney(session.cashIn)}</span>
                          <span>Out {formatMoney(session.cashOut)}</span>
                        </div>
                        {session.notes ? <div className="mt-2 text-sm text-zinc-600">{session.notes}</div> : null}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-zinc-950">Attendu {formatMoney(session.expectedCash)}</div>
                        <div className={`mt-1 text-xs font-semibold ${session.difference === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          Ecart {formatMoney(session.difference)}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button onClick={() => editCashSession(session.id)} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-zinc-700">Modifier</button>
                          <button
                            onClick={() => {
                              void confirm({
                                title: 'Supprimer cette caisse ?',
                                message: `La caisse du ${new Date(session.businessDate).toLocaleDateString('fr-DZ')} sera retiree.`,
                                confirmLabel: 'Supprimer',
                                tone: 'danger'
                              }).then((confirmed) => {
                                if (confirmed) void removeCashSession(session.id);
                              });
                            }}
                            className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
                {cashSessions.length === 0 ? (
                  <div className="premium-card rounded-2xl border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">
                    Aucune caisse ouverte. Enregistrez le fond de caisse du jour pour commencer.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {view === 'categories' ? (
        <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Categories</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Nouvelle categorie</h2>
            <div className="mt-4 space-y-3">
              <Field label="Nom categorie" value={expenseCategoryForm.name} onChange={(value) => setExpenseCategoryForm((current) => ({ ...current, name: value }))} placeholder="Ex: Maintenance" />
              <Field label="Description" value={expenseCategoryForm.description} onChange={(value) => setExpenseCategoryForm((current) => ({ ...current, description: value }))} placeholder="Ex: Entretien, reparation et SAV" />
              <button
                disabled={!canSaveCategory}
                onClick={() => {
                  void addExpenseCategory(expenseCategoryForm);
                  setExpenseCategoryForm({ name: '', description: '' });
                }}
                className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Ajouter categorie
              </button>
            </div>
          </div>

          <div className="premium-panel rounded-[1.6rem] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Referentiel</div>
            <h2 className="mt-1 text-xl font-bold text-zinc-950">Structure des charges</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {expenseCategories.map((category) => (
                <article key={category.id} className="premium-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">{category.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">{category.expensesCount} depense(s)</div>
                    </div>
                    {!category.isSystem ? (
                      <button
                        onClick={() => {
                          void confirm({
                            title: 'Supprimer la categorie ?',
                            message: `"${category.name}" sera supprimee si aucune depense ne la bloque.`,
                            confirmLabel: 'Supprimer',
                            tone: 'danger'
                          }).then((confirmed) => {
                            if (confirmed) void removeExpenseCategory(category.id);
                          });
                        }}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-zinc-700"
                      >
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                  {category.description ? <div className="mt-3 text-sm text-zinc-600">{category.description}</div> : null}
                </article>
              ))}
              {expenseCategories.length === 0 ? (
                <div className="premium-card rounded-2xl border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 md:col-span-2">
                  Creez une premiere categorie pour classer vos charges.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </WorkspaceShell>
  );
}

function StatusBadge({ status }: { status: ExpenseInput['status'] }) {
  const toneClass: Record<ExpenseInput['status'], string> = {
    planned: 'bg-amber-50 text-amber-700',
    partial: 'bg-brand/10 text-brand',
    paid: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-zinc-100 text-zinc-500'
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[status]}`}>
      {formatExpenseStatus(status)}
    </span>
  );
}

function SourceBadge({ sourceType }: { sourceType: ExpenseSourceType }) {
  const labels: Record<ExpenseSourceType, string> = {
    manual: 'Manuelle',
    stock_purchase: 'Auto stock',
    payroll_payment: 'Auto paie',
    salary_advance: 'Auto avance',
    employee_account_payment: 'Compte paie',
    employee_account_acompte: 'A compte'
  };
  const toneClass: Record<ExpenseSourceType, string> = {
    manual: 'bg-white text-zinc-600',
    stock_purchase: 'bg-emerald-50 text-emerald-700',
    payroll_payment: 'bg-brand/10 text-brand',
    salary_advance: 'bg-amber-50 text-amber-700',
    employee_account_payment: 'bg-brand/10 text-brand',
    employee_account_acompte: 'bg-amber-50 text-amber-700'
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[sourceType]}`}>
      {labels[sourceType]}
    </span>
  );
}

function CashStatusBadge({ status }: { status: 'open' | 'closed' }) {
  const labels: Record<typeof status, string> = {
    open: 'Ouverte',
    closed: 'Cloturee'
  };
  const toneClass: Record<typeof status, string> = {
    open: 'bg-amber-50 text-amber-700',
    closed: 'bg-emerald-50 text-emerald-700'
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[status]}`}>{labels[status]}</span>;
}

function formatFinanceTransactionType(type: FinanceTransaction['type']) {
  const labels: Record<FinanceTransaction['type'], string> = {
    sale_payment: 'Encaissement vente',
    stock_purchase: 'Achat stock',
    manual_expense: 'Depense',
    payroll_payment: 'Paiement salaire',
    salary_advance: 'Avance salaire',
    payroll_adjustment: 'Retenue / penalite',
    cash_opening: 'Ouverture caisse',
    cash_closing: 'Cloture caisse',
    cash_difference: 'Ecart caisse',
    order_loss: 'Commande perdue',
    refund: 'Remboursement'
  };
  return labels[type];
}

function formatFinanceModule(module: string) {
  const labels: Record<string, string> = {
    finance: 'Finance',
    pos: 'POS',
    stock: 'Stock',
    payroll: 'Paie',
    caisse: 'Caisse',
    orders: 'Commandes'
  };
  return labels[module] ?? module;
}

function formatFinanceStatus(status: FinanceTransaction['status']) {
  const labels: Record<FinanceTransaction['status'], string> = {
    pending: 'En attente',
    partial: 'Partiel',
    paid: 'Valide',
    cancelled: 'Annule'
  };
  return labels[status];
}

function formatPaymentMethod(method: NonNullable<FinanceTransaction['paymentMethod']>) {
  const labels: Record<NonNullable<FinanceTransaction['paymentMethod']>, string> = {
    cash: 'Especes',
    card: 'Carte',
    transfer: 'Virement'
  };
  return labels[method];
}

function FinanceDirectionBadge({ transaction }: { transaction: FinanceTransaction }) {
  const labels: Record<FinanceTransaction['direction'], string> = {
    in: 'Entree',
    out: 'Sortie',
    neutral: 'Neutre'
  };
  const toneClass: Record<FinanceTransaction['direction'], string> = {
    in: 'bg-emerald-50 text-emerald-700',
    out: 'bg-red-50 text-red-600',
    neutral: 'bg-zinc-100 text-zinc-600'
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[transaction.direction]}`}>
      {labels[transaction.direction]}
    </span>
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

function MetricPanel({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="premium-card rounded-2xl p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand">{label}</div>
      <div className="mt-3 text-2xl font-black text-zinc-950">{value}</div>
      <div className="mt-2 text-sm text-zinc-500">{hint}</div>
    </article>
  );
}
