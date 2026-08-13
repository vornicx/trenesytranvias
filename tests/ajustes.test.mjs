import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_CLIENT_FICHE_THRESHOLD,
  loadSettings,
  saveThreshold,
  validateThreshold
} from '../studio/views/ajustes.js';

function createApi(responses = {}) {
  const calls = [];
  const apiFetch = async (path, options = {}) => {
    calls.push({
      path,
      method: options.method,
      body: options.body ? JSON.parse(options.body) : undefined,
      headers: options.headers
    });
    for (const [prefix, handler] of Object.entries(responses)) {
      if (path.startsWith(prefix)) {
        return typeof handler === 'function' ? handler(calls.at(-1)) : handler.shift();
      }
    }
    return [];
  };
  return { apiFetch, calls };
}

test('loadSettings returns stored threshold', async () => {
  const { apiFetch } = createApi({
    'tyt_settings?key=eq.client_fiche_threshold': [[{ key: 'client_fiche_threshold', value: 4 }]]
  });

  const settings = await loadSettings(apiFetch);

  assert.equal(settings.clientFicheThreshold, 4);
});

test('loadSettings falls back to default 3 when missing or invalid', async () => {
  const { apiFetch: emptyApi } = createApi({
    'tyt_settings?key=eq.client_fiche_threshold': [[]]
  });
  const { apiFetch: invalidApi } = createApi({
    'tyt_settings?key=eq.client_fiche_threshold': [[{ value: 0 }]]
  });

  assert.equal((await loadSettings(emptyApi)).clientFicheThreshold, DEFAULT_CLIENT_FICHE_THRESHOLD);
  assert.equal((await loadSettings(invalidApi)).clientFicheThreshold, DEFAULT_CLIENT_FICHE_THRESHOLD);
});

test('validateThreshold accepts integers >= 1 only', () => {
  assert.equal(validateThreshold(1), 1);
  assert.equal(validateThreshold('4'), 4);
  assert.equal(validateThreshold(0), null);
  assert.equal(validateThreshold(1.5), null);
  assert.equal(validateThreshold(''), null);
});

test('saveThreshold patches existing row', async () => {
  const { apiFetch, calls } = createApi({
    'tyt_settings?key=eq.client_fiche_threshold': [[{ key: 'client_fiche_threshold', value: 5 }]]
  });

  const saved = await saveThreshold(apiFetch, 5);

  assert.equal(saved.value, 5);
  assert.deepEqual(calls, [{
    path: 'tyt_settings?key=eq.client_fiche_threshold',
    method: 'PATCH',
    body: { value: 5 },
    headers: { Prefer: 'return=representation' }
  }]);
});

test('saveThreshold posts when patch matches no rows', async () => {
  const { apiFetch, calls } = createApi({
    'tyt_settings?key=eq.client_fiche_threshold': [[]],
    'tyt_settings': [[{ key: 'client_fiche_threshold', value: 4 }]]
  });

  const saved = await saveThreshold(apiFetch, 4);

  assert.equal(saved.value, 4);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, 'PATCH');
  assert.deepEqual(calls[1], {
    path: 'tyt_settings',
    method: 'POST',
    body: { key: 'client_fiche_threshold', value: 4 },
    headers: { Prefer: 'return=representation' }
  });
});

test('saveThreshold rejects invalid values', async () => {
  const { apiFetch, calls } = createApi({});

  await assert.rejects(() => saveThreshold(apiFetch, 0), /invalid_threshold/);
  assert.equal(calls.length, 0);
});
