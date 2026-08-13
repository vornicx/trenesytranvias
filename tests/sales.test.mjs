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

test('markInquiryWon calls the atomic RPC with sale details', async () => {
  const { apiFetch, calls } = createApi({
    'rpc/tyt_mark_inquiry_won': [{
      inquiry: { ...inquiry, status: 'won' },
      client: { id: 'client-1', sales_count: 1 },
      sale: { id: 'sale-1', amount_eur: null },
      created: true
    }]
  });
  const markInquiryWon = createMarkInquiryWon({ apiFetch });

  const result = await markInquiryWon(inquiry);

  assert.equal(result.sale.id, 'sale-1');
  assert.deepEqual(calls, [{
    path: 'rpc/tyt_mark_inquiry_won',
    options: {
      method: 'POST',
      body: JSON.stringify({
        p_inquiry_id: 'inquiry-1',
        p_amount_eur: null,
        p_concept: null
      })
    },
    body: {
      p_inquiry_id: 'inquiry-1',
      p_amount_eur: null,
      p_concept: null
    }
  }]);
});

test('markInquiryWon passes amount and concept to the RPC', async () => {
  const { apiFetch, calls } = createApi({
    'rpc/tyt_mark_inquiry_won': [{
      inquiry: { ...inquiry, status: 'won' },
      client: { id: 'client-2', sales_count: 3 },
      sale: { id: 'sale-2', amount_eur: 1500 },
      created: true
    }]
  });
  const markInquiryWon = createMarkInquiryWon({ apiFetch });

  const result = await markInquiryWon(inquiry, { amountEur: 1500, concept: 'Tren turístico' });

  assert.equal(result.client.id, 'client-2');
  assert.deepEqual(calls[0].body, {
    p_inquiry_id: 'inquiry-1',
    p_amount_eur: 1500,
    p_concept: 'Tren turístico'
  });
});

test('markInquiryWon rejects invalid amounts before calling the RPC', async () => {
  const { apiFetch, calls } = createApi();

  await assert.rejects(
    () => createMarkInquiryWon({ apiFetch })(inquiry, { amountEur: -1 }),
    /invalid_sale_amount/
  );

  assert.equal(calls.length, 0);
});
