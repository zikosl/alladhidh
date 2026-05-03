import { formatDeliveryStatus, formatOrderStatus, formatOrderType } from '../lib/format';
import { DeliveryStatus, OrderStatus, OrderType } from '../types/pos';

export function orderStatusClass(status: OrderStatus) {
  const classes: Record<OrderStatus, string> = {
    pending: 'bg-amber-100 text-amber-800 ring-amber-200',
    preparing: 'bg-brand/10 text-brand ring-brand/15',
    ready: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    paid: 'bg-charcoal text-white ring-charcoal',
    cancelled: 'bg-red-100 text-red-700 ring-red-200'
  };
  return classes[status];
}

export function deliveryStatusClass(status: DeliveryStatus | null) {
  const classes: Record<DeliveryStatus, string> = {
    pending: 'bg-amber-100 text-amber-800 ring-amber-200',
    on_the_way: 'bg-brand/10 text-brand ring-brand/15',
    delivered: 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  };
  return classes[status ?? 'pending'];
}

export function orderTypeClass(type: OrderType) {
  const classes: Record<OrderType, string> = {
    dine_in: 'bg-orange-50 text-orange-700 ring-orange-100',
    take_away: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
    delivery: 'bg-brand/10 text-brand ring-brand/15'
  };
  return classes[type];
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${orderStatusClass(status)}`}>
      {formatOrderStatus(status)}
    </span>
  );
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus | null }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${deliveryStatusClass(status)}`}>
      {formatDeliveryStatus(status)}
    </span>
  );
}

export function OrderTypeBadge({ type }: { type: OrderType }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${orderTypeClass(type)}`}>
      {formatOrderType(type)}
    </span>
  );
}

export function nextKitchenAction(status: OrderStatus) {
  if (status === 'pending') return { status: 'preparing' as const, label: 'Demarrer', className: 'bg-brand text-white' };
  if (status === 'preparing') return { status: 'ready' as const, label: 'Pret', className: 'bg-emerald-600 text-white' };
  return null;
}

export function nextDeliveryAction(status: DeliveryStatus | null) {
  if ((status ?? 'pending') === 'pending') return { status: 'on_the_way' as const, label: 'Depart', className: 'bg-brand text-white' };
  if (status === 'on_the_way') return { status: 'delivered' as const, label: 'Livree', className: 'bg-emerald-600 text-white' };
  return null;
}
