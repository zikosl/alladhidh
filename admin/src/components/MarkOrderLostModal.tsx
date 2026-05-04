import { useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';
import { EmployeeProfile, MarkOrderLostInput, Order } from '../types/pos';
import { AppModal } from './AppModal';

interface MarkOrderLostModalProps {
  order: Order;
  employees: EmployeeProfile[];
  onClose: () => void;
  onConfirm: (payload: MarkOrderLostInput) => Promise<void> | void;
}

export function MarkOrderLostModal({ order, employees, onClose, onConfirm }: MarkOrderLostModalProps) {
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.isActive), [employees]);
  const [deductFromPayroll, setDeductFromPayroll] = useState(false);
  const [employeeId, setEmployeeId] = useState(activeEmployees[0]?.id ?? 0);
  const [amount, setAmount] = useState(order.totalPrice);
  const [note, setNote] = useState('');

  const canConfirm = !deductFromPayroll || (employeeId > 0 && amount > 0);

  return (
    <AppModal title={`Commande perdue #${order.id}`} onClose={onClose} maxWidthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <div className="text-sm font-black text-zinc-950">Cette action ne restaure pas le stock.</div>
          <p className="mt-1 text-xs font-semibold text-zinc-600">
            Utilisez ce statut quand la commande est produite/perdue suite a une erreur. Elle sort du chiffre d'affaires et reste visible dans l'historique.
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-zinc-600">Total commande</span>
            <span className="font-black text-zinc-950">{formatMoney(order.totalPrice)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {order.items.map((item) => (
              <span key={item.id} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-600 ring-1 ring-zinc-100">
                {item.quantity}x {item.productName}
              </span>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3">
          <input
            type="checkbox"
            checked={deductFromPayroll}
            onChange={(event) => setDeductFromPayroll(event.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          <span>
            <span className="block text-sm font-black text-zinc-950">Imputer a un employe</span>
            <span className="text-xs font-semibold text-zinc-500">Cree automatiquement une penalite dans Paie.</span>
          </span>
        </label>

        {deductFromPayroll ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">Employe responsable</span>
              <select
                value={employeeId}
                onChange={(event) => setEmployeeId(Number(event.target.value))}
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold outline-none"
              >
                <option value={0}>Choisir employe</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">Montant a retenir</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold outline-none"
              />
            </label>
          </div>
        ) : null}

        <label className="block">
          <span className="text-xs font-semibold text-zinc-600">Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex: Erreur de preparation, mauvaise table, produit casse..."
            className="mt-1 min-h-24 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold outline-none"
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700">
            Annuler
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() =>
              void onConfirm({
                deductFromPayroll,
                employeeId: deductFromPayroll ? employeeId : null,
                amount: deductFromPayroll ? amount : null,
                note: note.trim() || null
              })
            }
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-soft disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            Marquer perdue
          </button>
        </div>
      </div>
    </AppModal>
  );
}
