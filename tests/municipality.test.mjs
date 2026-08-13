import test from 'node:test';
import assert from 'node:assert/strict';
import { findOrCreateClient } from '../studio/lib/clients.js';
import { detectMunicipality } from '../studio/lib/municipality.js';

test('detects ayuntamiento in company', () => {
  assert.equal(detectMunicipality('Juan', 'Ayuntamiento de Écija', ''), true);
});
test('ignores unrelated', () => {
  assert.equal(detectMunicipality('Ana', 'Turismo Sur', 'alquiler tren'), false);
});

test('upgrades an existing matching client when an inquiry identifies an ayuntamiento', async () => {
  const calls = [];
  const apiFetch = async (path, options = {}) => {
    calls.push({
      path,
      method: options.method,
      headers: options.headers,
      body: options.body ? JSON.parse(options.body) : undefined
    });
    if (path === 'tyt_clients?select=*') {
      return [{ id: 'client-1', email: 'turismo@ecija.es', is_municipality: false }];
    }
    if (path.startsWith('tyt_clients?id=')) {
      return [{ id: 'client-1', email: 'turismo@ecija.es', is_municipality: true }];
    }
    return [];
  };

  const client = await findOrCreateClient(apiFetch, {
    name: 'Turismo',
    company: 'Ayuntamiento de Écija',
    email: 'turismo@ecija.es'
  });

  assert.equal(client.is_municipality, true);
  assert.deepEqual(calls[1], {
    path: 'tyt_clients?id=eq.client-1',
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: { is_municipality: true }
  });
});
