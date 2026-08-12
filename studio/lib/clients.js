import { normalizeContactKey } from './clients-logic.js';
import { detectMunicipality } from './municipality.js';

function clientPayload(inquiry) {
  return {
    name: inquiry.name,
    company: inquiry.company || null,
    email: inquiry.email || null,
    phone: inquiry.phone || null,
    location: inquiry.location || null,
    is_municipality: detectMunicipality(inquiry.name, inquiry.company, inquiry.message)
  };
}

export async function findOrCreateClient(apiFetch, inquiry) {
  const clients = await apiFetch('tyt_clients?select=*');
  const inquiryKey = normalizeContactKey(inquiry);
  const existing = (clients || []).find(client => normalizeContactKey(client) === inquiryKey);
  if (existing) return existing;

  const created = await apiFetch('tyt_clients', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(clientPayload(inquiry))
  });
  if (!created?.[0]) throw new Error('client_creation_failed');
  return created[0];
}
