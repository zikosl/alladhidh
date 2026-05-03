import { Order, RestaurantSettings } from '../types/pos';
import { BRAND_NAME } from './brand';

const TICKET_LOGO_URL = '/logo-old.png';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function socialLines(settings?: RestaurantSettings | null) {
  if (!settings?.showSocialLinks) return [];
  return [
    settings.receiptInstagram ? `Instagram: ${settings.receiptInstagram}` : null,
    settings.receiptFacebook ? `Facebook: ${settings.receiptFacebook}` : null,
    settings.receiptTiktok ? `TikTok: ${settings.receiptTiktok}` : null,
    settings.receiptWhatsapp ? `WhatsApp: ${settings.receiptWhatsapp}` : null,
    settings.receiptWebsite ? `Web: ${settings.receiptWebsite}` : null
  ].filter(Boolean) as string[];
}

function contactLines(settings?: RestaurantSettings | null) {
  if (!settings?.showContactBlock) return [];
  return [
    settings.receiptAddress,
    settings.receiptPhone,
    settings.receiptEmail
  ].filter(Boolean) as string[];
}

function baseStyles() {
  return `
    * { box-sizing: border-box; }
    body { font-family: "Cairo", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #fffaf1; color: #1a1714; }
    .ticket { width: 80mm; padding: 12px 10px 18px; margin: 0 auto; }
    .logo-wrap { text-align: center; margin-bottom: 6px; }
    .logo { max-width: 112px; max-height: 58px; object-fit: contain; }
    .brand { text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 0.03em; }
    .subtitle, .meta, .contact, .social, .footer, .extra { text-align: center; font-size: 10.5px; color: #5c5045; line-height: 1.45; }
    .subtitle { margin-top: 3px; }
    .meta { margin-top: 7px; }
    .badge-row { display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .badge { width: fit-content; border: 1.5px solid #1a1714; border-radius: 999px; padding: 4px 9px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; }
    .badge.soft { border-color: #e8d2af; background: #fff4e3; }
    .section { margin-top: 12px; padding-top: 8px; border-top: 1px dashed #8c7d6d; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #5c5045; margin-bottom: 6px; }
    .line-item { display: grid; grid-template-columns: 30px 1fr auto; gap: 7px; padding: 6px 0; border-bottom: 1px dotted #e8d2af; }
    .line-item.kitchen { grid-template-columns: 34px 1fr; }
    .qty { font-size: 15px; font-weight: 700; }
    .name { font-size: 13px; font-weight: 700; line-height: 1.3; }
    .amount { font-size: 12px; font-weight: 700; align-self: center; }
    .notes { font-size: 12px; line-height: 1.45; white-space: pre-wrap; }
    .totals { margin-top: 8px; border: 1px solid #1a1714; border-radius: 12px; padding: 8px; background: #fff4e3; }
    .total-line { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; padding: 3px 0; }
    .total-line.grand { font-size: 17px; font-weight: 700; padding-top: 4px; }
    .thanks { margin-top: 12px; text-align: center; font-size: 11px; font-weight: 700; }
    @media print { body { margin: 0; } .ticket { width: 100%; } }
  `;
}

function openPrintWindow(title: string, html: string) {
  const frame = document.createElement('iframe');
  frame.title = title;
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const documentRef = frame.contentWindow?.document;
  if (!documentRef) {
    frame.remove();
    return;
  }

  documentRef.open();
  documentRef.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${baseStyles()}</style></head><body>${html}</body></html>`);
  documentRef.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 700);
  }, 150);
}

export function printKitchenTicket(order: Order, settings?: RestaurantSettings | null) {
  const createdAt = new Date(order.createdAt).toLocaleString('fr-DZ');
  const context =
    order.type === 'dine_in'
      ? `Table ${order.tableNumber ?? '-'}`
      : order.type === 'delivery'
        ? order.customerName || 'Livraison'
        : order.customerName || 'A emporter';
  const itemsHtml = order.items
    .map(
      (item) => `
        <div class="line-item kitchen">
          <div class="qty">${item.quantity}x</div>
          <div class="name">${escapeHtml(item.productName)}</div>
        </div>`
    )
    .join('');

  const logoBlock = settings?.showLogoInKitchenTicket
    ? `<div class="logo-wrap"><img class="logo" src="${escapeHtml(TICKET_LOGO_URL)}" alt="Logo" /></div>`
    : '';

  openPrintWindow(
    `Ticket cuisine #${order.id}`,
    `
      <div class="ticket">
        ${logoBlock}
        <div class="brand">${escapeHtml(settings?.restaurantName ?? BRAND_NAME)}</div>
        ${settings?.kitchenTicketHeader ? `<div class="subtitle">${escapeHtml(settings.kitchenTicketHeader)}</div>` : ''}
        <div class="meta">
          Ticket cuisine #${order.id}<br />
          ${escapeHtml(createdAt)}<br />
          ${escapeHtml(context)}
        </div>
        <div class="badge-row">
          <div class="badge">${escapeHtml(order.type === 'dine_in' ? 'Sur place' : order.type === 'delivery' ? 'Livraison' : 'A emporter')}</div>
        </div>
        <div class="section">
          <div class="section-title">Articles</div>
          ${itemsHtml}
        </div>
        ${order.notes ? `<div class="section"><div class="section-title">Notes</div><div class="notes">${escapeHtml(order.notes)}</div></div>` : ''}
        ${settings?.kitchenTicketFooter ? `<div class="footer section">${escapeHtml(settings.kitchenTicketFooter)}</div>` : ''}
      </div>`
  );
}

export function printCustomerInvoice(order: Order, settings?: RestaurantSettings | null) {
  const createdAt = new Date(order.createdAt).toLocaleString('fr-DZ');
  const contact = contactLines(settings);
  const socials = socialLines(settings);
  const subtotal = order.totalPrice;
  const paymentLabel = order.status === 'paid' ? 'Paye' : 'A regler';
  const context =
    order.type === 'dine_in'
      ? `Table ${order.tableNumber ?? '-'}`
      : order.type === 'delivery'
        ? `${order.customerName ?? 'Client'} - ${order.phone ?? ''}`
        : `${order.customerName ?? 'Client'} - ${order.phone ?? ''}`;

  const itemsHtml = order.items
    .map(
      (item) => `
        <div class="line-item">
          <div class="qty">${item.quantity}x</div>
          <div class="name">${escapeHtml(item.productName)}</div>
          <div class="amount">${(item.unitPrice * item.quantity).toFixed(2)}</div>
        </div>`
    )
    .join('');

  openPrintWindow(
    `${settings?.receiptTitle ?? 'Facture client'} #${order.id}`,
    `
      <div class="ticket">
        <div class="logo-wrap"><img class="logo" src="${escapeHtml(TICKET_LOGO_URL)}" alt="Logo" /></div>
        <div class="brand">${escapeHtml(settings?.restaurantName ?? BRAND_NAME)}</div>
        ${settings?.receiptSubtitle ? `<div class="subtitle">${escapeHtml(settings.receiptSubtitle)}</div>` : ''}
        <div class="meta">
          ${escapeHtml(settings?.receiptTitle ?? 'Facture client')} #${order.id}<br />
          ${escapeHtml(createdAt)}<br />
          ${escapeHtml(context)}
        </div>
        <div class="badge-row">
          <div class="badge">${escapeHtml(order.type === 'dine_in' ? 'Sur place' : order.type === 'delivery' ? 'Livraison' : 'A emporter')}</div>
          <div class="badge soft">${escapeHtml(paymentLabel)}</div>
        </div>
        ${contact.length > 0 ? `<div class="contact section">${contact.map((line) => escapeHtml(line)).join('<br />')}</div>` : ''}
        <div class="section">
          <div class="section-title">Detail commande</div>
          ${itemsHtml}
          <div class="totals">
            <div class="total-line"><span>Sous-total</span><span>${subtotal.toFixed(2)}</span></div>
            <div class="total-line grand"><span>Total</span><span>${order.totalPrice.toFixed(2)} DZD</span></div>
          </div>
        </div>
        ${order.address ? `<div class="section"><div class="section-title">Adresse</div><div class="notes">${escapeHtml(order.address)}</div></div>` : ''}
        ${order.notes ? `<div class="section"><div class="section-title">Notes</div><div class="notes">${escapeHtml(order.notes)}</div></div>` : ''}
        ${socials.length > 0 ? `<div class="social section">${socials.map((line) => escapeHtml(line)).join('<br />')}</div>` : ''}
        ${settings?.showFooterNote && settings?.receiptFooter ? `<div class="footer section">${escapeHtml(settings.receiptFooter)}</div>` : ''}
        ${settings?.receiptAdditionalNote ? `<div class="extra">${escapeHtml(settings.receiptAdditionalNote)}</div>` : ''}
        <div class="thanks">Merci pour votre visite</div>
      </div>`
  );
}
