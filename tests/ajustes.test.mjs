import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  DEFAULT_CLIENT_FICHE_THRESHOLD,
  DEFAULT_MUNICIPAL_ELECTION_YEAR,
  loadSettings,
  saveElectionYear,
  saveThreshold,
  validateElectionYear,
  validateThreshold
} from '../studio/views/ajustes.js';

const root = new URL('../', import.meta.url);

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
    'tyt_settings?key=in.': [[
      { key: 'client_fiche_threshold', value: 4 },
      { key: 'default_municipal_election_year', value: 2031 }
    ]]
  });

  const settings = await loadSettings(apiFetch);

  assert.equal(settings.clientFicheThreshold, 4);
  assert.equal(settings.defaultMunicipalElectionYear, 2031);
});

test('loadSettings falls back when values are missing or invalid', async () => {
  const { apiFetch: emptyApi } = createApi({
    'tyt_settings?key=in.': [[]]
  });
  const { apiFetch: invalidApi } = createApi({
    'tyt_settings?key=in.': [[
      { key: 'client_fiche_threshold', value: 0 },
      { key: 'default_municipal_election_year', value: 12 }
    ]]
  });

  assert.equal((await loadSettings(emptyApi)).clientFicheThreshold, DEFAULT_CLIENT_FICHE_THRESHOLD);
  assert.equal((await loadSettings(invalidApi)).clientFicheThreshold, DEFAULT_CLIENT_FICHE_THRESHOLD);
  assert.equal((await loadSettings(emptyApi)).defaultMunicipalElectionYear, DEFAULT_MUNICIPAL_ELECTION_YEAR);
  assert.equal((await loadSettings(invalidApi)).defaultMunicipalElectionYear, DEFAULT_MUNICIPAL_ELECTION_YEAR);
});

test('validateThreshold accepts integers >= 1 only', () => {
  assert.equal(validateThreshold(1), 1);
  assert.equal(validateThreshold('4'), 4);
  assert.equal(validateThreshold(0), null);
  assert.equal(validateThreshold(1.5), null);
  assert.equal(validateThreshold(''), null);
});

test('validateElectionYear accepts four digit years only', () => {
  assert.equal(validateElectionYear('2027'), 2027);
  assert.equal(validateElectionYear(9999), 9999);
  assert.equal(validateElectionYear(1899), null);
  assert.equal(validateElectionYear(10000), null);
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

test('saveElectionYear upserts the municipal election setting', async () => {
  const { apiFetch, calls } = createApi({
    'tyt_settings?key=eq.default_municipal_election_year': [[]],
    'tyt_settings': [[{ key: 'default_municipal_election_year', value: 2031 }]]
  });

  const saved = await saveElectionYear(apiFetch, 2031);

  assert.equal(saved.value, 2031);
  assert.deepEqual(calls[1].body, {
    key: 'default_municipal_election_year',
    value: 2031
  });
});

test('Ajustes renders the default municipal election year input', async () => {
  const html = await readFile(new URL('studio.html', root), 'utf8');

  assert.match(html, /data-ajustes-election-year/);
  assert.match(html, /Año electoral municipal por defecto/);
});
