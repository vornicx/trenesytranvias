import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarkInquiryWon } from '../studio/lib/sales.js';

const inquiry = {
  id: 'inquiry-1',
  name: 'María',
  company: 'Ayuntamiento de Écija',
  email: 'MAYOR@ECIJA.ES',
  phone: '600 123 123',
  location: 'Écija',
  message: 'Necesitamos un tren'
};

function createApi(responses = {}) {
  const calls = [];
  const apiFetch = async (path, options = {}) => {
    calls.push({ path, options, body: options.body ? JSON.parse(options.body) : undefined });
    for (const [prefix, queue] of Object.entries(responses)) {
      if (path.startsWith(prefix) && queue.length) return queue.shift();
    }
    return [];
  };
  return { apiFetch, calls };
}

test('markInquiryWon creates a municipal client, nullable sale, aggregates, and activity', async () => {
  const { apiFetch, calls } = createApi({
    'tyt_settings': [[{ value: 3 }]],
    'tyt_clients?': [[]],
    'tyt_clients': [[{ id: 'client-1', sales_count: 0, sales_total: 0 }]],
    'tyt_sales': [[{ id: 'sale-1' }]]
  });
  const markInquiryWon = createMarkInquiryWon({ apiFetch, getActorEmail: () => 'admin@example.com' });

  const result = await markInquiryWon(inquiry);

  assert.equal(result.sale.id, 'sale-1');
  assert.deepEqual(calls.map(call => [call.options.method, call.path]), [
    ['PATCH', 'tyt_inquiries?id=eq.inquiry-1'],
    [undefined, 'tyt_settings?key=eq.client_fiche_threshold&select=value&limit=1'],
    [undefined, 'tyt_clients?select=*'],
    ['POST', 'tyt_clients'],
    ['POST', 'tyt_sales'],
    ['PATCH', 'tyt_clients?id=eq.client-1'],
    ['POST', 'tyt_activity_log']
  ]);
  assert.equal(calls[3].body.is_municipality, true);
  assert.equal(calls[4].body.amount_eur, null);
  assert.deepEqual(calls[5].body, { sales_count: 1, sales_total: 0 });
  assert.deepEqual(calls[6].body, {
    entity_type: 'inquiry',
    entity_id: 'inquiry-1',
    action: 'won',
    actor_email: 'admin@example.com',
    meta: { client_id: 'client-1', sale_id: 'sale-1', amount_eur: null, client_fiche_threshold: 3 }
  });
});

test('markInquiryWon reuses normalized contact and adds amount to existing totals', async () => {
  const existing = {
    id: 'client-2',
    name: 'Maria',
    company: 'Ayuntamiento de Écija',
    email: 'mayor@ecija.es',
    sales_count: 2,
    sales_total: '125.50'
  };
  const { apiFetch, calls } = createApi({
    'tyt_settings': [[{ value: '4' }]],
    'tyt_clients?': [[existing]],
    'tyt_sales': [[{ id: 'sale-2' }]]
  });
  const markInquiryWon = createMarkInquiryWon({ apiFetch });

  await markInquiryWon(inquiry, { amountEur: 1500, concept: 'Tren turístico' });

  assert.equal(calls.some(call => call.path === 'tyt_clients' && call.options.method === 'POST'), false);
  const saleCall = calls.find(call => call.path === 'tyt_sales');
  assert.deepEqual(saleCall.body, {
    client_id: 'client-2',
    inquiry_id: 'inquiry-1',
    amount_eur: 1500,
    concept: 'Tren turístico'
  });
  const aggregateCall = calls.find(call => call.path === 'tyt_clients?id=eq.client-2');
  assert.deepEqual(aggregateCall.body, { sales_count: 3, sales_total: 1625.5 });
});

test('markInquiryWon uses threshold 3 when settings cannot be loaded', async () => {
  const calls = [];
  const apiFetch = async (path, options = {}) => {
    calls.push({ path, options, body: options.body ? JSON.parse(options.body) : undefined });
    if (path.startsWith('tyt_settings')) throw new Error('settings unavailable');
    if (path.startsWith('tyt_clients?')) return [];
    if (path === 'tyt_clients') return [{ id: 'client-3', sales_count: 0, sales_total: 0 }];
    if (path === 'tyt_sales') return [{ id: 'sale-3' }];
    return [];
  };

  await createMarkInquiryWon({ apiFetch })(inquiry, { amountEur: 10 });

  const activityCall = calls.find(call => call.path === 'tyt_activity_log');
  assert.equal(activityCall.body.meta.client_fiche_threshold, 3);
});
