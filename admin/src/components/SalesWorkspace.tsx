import { formatMoney, formatOrderStatus, formatOrderType } from '../lib/format';
import { usePosStore } from '../store/usePosStore';
import { WorkspaceShell } from './WorkspaceShell';

export function SalesWorkspace() {
  const { orders, setCurrentModule } = usePosStore();

  return (
    <WorkspaceShell
      title="Ventes / Commandes"
      subtitle="Consultez les commandes, les types de service, les totaux et les statuts de paiement dans un espace separe."
      accent="linear-gradient(135deg, #7c3aed, #8b5cf6)"
      icon="📋"
      sectionLabel="Module ventes"
      onBack={() => setCurrentModule('apps')}
      navigation={[{ id: 'orders', label: 'Commandes', hint: 'Liste et suivi' }]}
      activeView="orders"
      onChangeView={() => undefined}
    >
      <div className="rounded-2xl bg-white/90 p-4 shadow-soft">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand">Commandes</div>
        <div className="mt-1 text-xl font-bold text-zinc-950">Historique recent</div>

        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-100">
          <table className="min-w-full divide-y divide-zinc-100">
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-zinc-500">
                <th className="px-4 py-3">Commande</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {orders.map((order) => (
                <tr key={order.id} className="text-sm text-zinc-700">
                  <td className="px-4 py-3 font-semibold text-zinc-950">#{order.id}</td>
                  <td className="px-4 py-3">{formatOrderType(order.type)}</td>
                  <td className="px-4 py-3">{order.customerName ?? order.tableNumber ?? 'Passage caisse'}</td>
                  <td className="px-4 py-3">{formatMoney(order.totalPrice)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                      {formatOrderStatus(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceShell>
  );
}
