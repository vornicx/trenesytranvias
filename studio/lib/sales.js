import { shouldCreateClientFiche } from './clients-logic.js';
import { findOrCreateClient } from './clients.js';

const DEFAULT_CLIENT_FICHE_THRESHOLD = 3;

async function loadClientFicheThreshold(apiFetch) {
  try {
    const rows = await apiFetch('tyt_settings?key=eq.client_fiche_threshold&select=value&limit=1');
    const value = Number(rows?.[0]?.value);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_CLIENT_FICHE_THRESHOLD;
  } catch {
    return DEFAULT_CLIENT_FICHE_THRESHOLD;
  }
}

export function createMarkInquiryWon({ apiFetch, getActorEmail = () => null }) {
  return async function markInquiryWon(inquiry, { amountEur, concept } = {}) {
    if (!inquiry?.id) throw new Error('inquiry_required');
    const amount = amountEur === undefined || amountEur === null || amountEur === ''
      ? null
      : Number(amountEur);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new Error('invalid_sale_amount');

    await apiFetch(`tyt_inquiries?id=eq.${encodeURIComponent(inquiry.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'won' })
    });

    const threshold = await loadClientFicheThreshold(apiFetch);
    const client = await findOrCreateClient(apiFetch, inquiry);
    const saleRows = await apiFetch('tyt_sales', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        client_id: client.id,
        inquiry_id: inquiry.id,
        amount_eur: amount,
        concept: concept || null
      })
    });
    const sale = saleRows?.[0];
    if (!sale) throw new Error('sale_creation_failed');

    const salesCount = Number(client.sales_count || 0) + 1;
    const salesTotal = Number(client.sales_total || 0) + (amount || 0);
    await apiFetch(`tyt_clients?id=eq.${encodeURIComponent(client.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ sales_count: salesCount, sales_total: salesTotal })
    });

    // A client is created above for every sale; at the configured threshold this
    // verifies that the required client fiche is present.
    const ficheRequired = shouldCreateClientFiche(salesCount, threshold);
    if (ficheRequired && !client.id) throw new Error('client_fiche_required');

    await apiFetch('tyt_activity_log', {
      method: 'POST',
      body: JSON.stringify({
        entity_type: 'inquiry',
        entity_id: inquiry.id,
        action: 'won',
        actor_email: getActorEmail() || null,
        meta: {
          client_id: client.id,
          sale_id: sale.id,
          amount_eur: amount,
          client_fiche_threshold: threshold
        }
      })
    });

    return { inquiry: { ...inquiry, status: 'won' }, client, sale, threshold, ficheRequired };
  };
}
