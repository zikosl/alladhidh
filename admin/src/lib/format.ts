import { DeliveryStatus, OrderStatus, OrderType } from '../types/pos';

export function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    maximumFractionDigits: 2
  }).format(value);
}

export function formatOrderType(type: OrderType) {
  switch (type) {
    case 'dine_in':
      return 'Sur place';
    case 'take_away':
      return 'A emporter';
    case 'delivery':
      return 'Livraison';
  }
}

export function formatOrderStatus(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'preparing':
      return 'En preparation';
    case 'ready':
      return 'Pret';
    case 'paid':
      return 'Paye';
    case 'cancelled':
      return 'Annule';
  }
}

export function formatDeliveryStatus(status: DeliveryStatus | null) {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'on_the_way':
      return 'En route';
    case 'delivered':
      return 'Livre';
    default:
      return 'En attente';
  }
}
