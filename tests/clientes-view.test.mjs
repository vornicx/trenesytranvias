import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  filterClients,
  loadClientHistory,
  loadClients,
  updateClient
} from '../studio/views/clientes.js';

const root = new URL('../', import.meta.url);

function createApi(responses = {}) {
  const calls = [];
  const apiFetch = async (path, options = {}) => {
    calls.push({
      path,
      method: options.method,
      headers: options.headers,
      body: options.body ? JSON.parse(options.body) : undefined
    });
    for (const [prefix, response] of Object.entries(responses)) {
      if (path.startsWith(prefix)) return typeof response === 'function' ? response(calls.at(-1)) : response;
    }
    return [];
  };
  return { apiFetch, calls };
}

const clients = [
  { id: '1', name: 'María Pérez', company: 'Eventos Sur', email: 'maria@example.com', location: 'Écija', is_municipality: false },
  { id: '2', name: 'Ayuntamiento de Córdoba', company: null, email: 'turismo@cordoba.es', location: 'Córdoba', is_municipality: true }
];

test('filterClients searches contact data without accents', () => {
  assert.deepEqual(filterClients(clients, 'maria', 'all').map(client => client.id), ['1']);
  assert.deepEqual(filterClients(clients, 'cordoba', 'all').map(client => client.id), ['2']);
});

test('filterClients separates municipalities from other clients', () => {
  assert.deepEqual(filterClients(clients, '', 'non-municipality').map(client => client.id), ['1']);
  assert.deepEqual(filterClients(clients, '', 'municipality').map(client => client.id), ['2']);
});

test('loadClients uses the requested updated order', async () => {
  const { apiFetch, calls } = createApi({ tyt_clients: clients });

  assert.equal((await loadClients(apiFetch)).length, 2);
  assert.equal(calls[0].path, 'tyt_clients?select=*&order=updated_at.desc');
});

test('loadClientHistory links sales by client and inquiries by encoded email', async () => {
  const { apiFetch, calls } = createApi({
    'tyt_sales?': [{ id: 'sale-1' }],
    'tyt_inquiries?': [{ id: 'inquiry-1' }]
  });

  const history = await loadClientHistory(apiFetch, {
    id: 'client/1',
    email: 'ventas+sur@example.com'
  });

  assert.deepEqual(history, {
    sales: [{ id: 'sale-1' }],
    inquiries: [{ id: 'inquiry-1' }]
  });
  assert.equal(calls[0].path, 'tyt_sales?client_id=eq.client%2F1&order=sold_at.desc');
  assert.equal(calls[1].path, 'tyt_inquiries?email=eq.ventas%2Bsur%40example.com&order=created_at.desc');
});

test('loadClientHistory skips inquiry lookup when the client has no email', async () => {
  const { apiFetch, calls } = createApi({ 'tyt_sales?': [] });

  const history = await loadClientHistory(apiFetch, { id: 'client-1', email: null });

  assert.deepEqual(history, { sales: [], inquiries: [] });
  assert.equal(calls.length, 1);
});

test('updateClient patches only editable fiche fields and returns the row', async () => {
  const { apiFetch, calls } = createApi({
    'tyt_clients?id=': [{ id: 'client-1', notes: 'Llamar en septiembre' }]
  });
  const patch = {
    notes: 'Llamar en septiembre',
    is_municipality: true,
    election_year: 2027,
    next_recontact_at: '2026-09-15'
  };

  const updated = await updateClient(apiFetch, 'client-1', patch);

  assert.equal(updated.notes, patch.notes);
  assert.deepEqual(calls[0], {
    path: 'tyt_clients?id=eq.client-1',
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: patch
  });
});

test('Studio renders and initializes the Clientes view', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('studio.html', root), 'utf8'),
    readFile(new URL('studio.js', root), 'utf8')
  ]);

  assert.match(html, /data-client-search/);
  assert.match(html, /data-client-filter/);
  assert.match(html, /data-client-drawer/);
  assert.match(html, /data-client-edit-municipality/);
  assert.match(html, /data-client-edit-election/);
  assert.match(html, /data-client-edit-recontact/);
  assert.match(html, /data-client-history/);
  assert.match(script, /import \{ initClientesView \} from '.\/studio\/views\/clientes\.js'/);
  assert.match(script, /initClientesView\(\{\s*apiFetch,\s*root: document\.querySelector\('\[data-view="clientes"\]'\)/);
});
