import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createCampaign,
  loadCampaignItems,
  loadCampaigns,
  loadMunicipalities,
  updateCampaignItem
} from '../studio/views/ayuntamientos.js';

const root = new URL('../', import.meta.url);

function createApi(handler) {
  const calls = [];
  const apiFetch = async (path, options = {}) => {
    const call = {
      path,
      method: options.method,
      headers: options.headers,
      body: options.body ? JSON.parse(options.body) : undefined
    };
    calls.push(call);
    return handler(call, calls);
  };
  return { apiFetch, calls };
}

test('loads only municipality clients and electoral campaigns', async () => {
  const { apiFetch, calls } = createApi(call => (
    call.path.startsWith('tyt_clients?') ? [{ id: 'client-1' }] : [{ id: 'campaign-1' }]
  ));

  assert.deepEqual(await loadMunicipalities(apiFetch), [{ id: 'client-1' }]);
  assert.deepEqual(await loadCampaigns(apiFetch), [{ id: 'campaign-1' }]);
  assert.equal(
    calls[0].path,
    'tyt_clients?is_municipality=eq.true&select=*&order=next_recontact_at.asc.nullslast'
  );
  assert.equal(calls[1].path, 'tyt_recontact_campaigns?select=*&order=created_at.desc');
});

test('loads campaign items with their municipality client', async () => {
  const { apiFetch, calls } = createApi(() => [{ id: 'item-1' }]);

  assert.deepEqual(await loadCampaignItems(apiFetch, 'campaign/1'), [{ id: 'item-1' }]);
  assert.equal(
    calls[0].path,
    'tyt_recontact_items?campaign_id=eq.campaign%2F1&select=*,client:tyt_clients(*)&order=updated_at.desc'
  );
});

test('createCampaign creates pending items for every municipality', async () => {
  const municipalities = [{ id: 'client-1' }, { id: 'client-2' }];
  const { apiFetch, calls } = createApi(call => {
    if (call.path.startsWith('tyt_clients?')) return municipalities;
    if (call.path === 'tyt_recontact_campaigns') return [{ id: 'campaign-1', name: 'Municipales 2027' }];
    if (call.path === 'tyt_recontact_items') return call.body.map((item, index) => ({ id: `item-${index + 1}`, ...item }));
    return [];
  });

  const result = await createCampaign(
    { name: ' Municipales 2027 ', electionYear: 2027 },
    apiFetch
  );

  assert.equal(result.campaign.id, 'campaign-1');
  assert.equal(result.items.length, 2);
  assert.deepEqual(calls[1], {
    path: 'tyt_recontact_campaigns',
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: { name: 'Municipales 2027', election_year: 2027 }
  });
  assert.deepEqual(calls[2].body, [
    { campaign_id: 'campaign-1', client_id: 'client-1', status: 'pending' },
    { campaign_id: 'campaign-1', client_id: 'client-2', status: 'pending' }
  ]);
});

test('createCampaign validates name and electoral year before requests', async () => {
  const { apiFetch, calls } = createApi(() => []);

  await assert.rejects(
    createCampaign({ name: '', electionYear: 2027 }, apiFetch),
    /invalid_campaign_name/
  );
  await assert.rejects(
    createCampaign({ name: 'Municipales', electionYear: 20 }, apiFetch),
    /invalid_election_year/
  );
  assert.equal(calls.length, 0);
});

test('contacting a campaign item records the client recontact time', async () => {
  const { apiFetch, calls } = createApi(call => (
    call.path.startsWith('tyt_recontact_items?') ? [{ id: 'item-1', status: 'contacted' }] : []
  ));
  const contactedAt = '2026-08-13T18:00:00.000Z';

  const updated = await updateCampaignItem(
    apiFetch,
    { id: 'item-1', client_id: 'client-1' },
    'contacted',
    contactedAt
  );

  assert.equal(updated.status, 'contacted');
  assert.deepEqual(calls, [
    {
      path: 'tyt_recontact_items?id=eq.item-1',
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: { status: 'contacted', updated_at: contactedAt }
    },
    {
      path: 'tyt_clients?id=eq.client-1',
      method: 'PATCH',
      headers: undefined,
      body: { last_recontact_at: contactedAt }
    }
  ]);
});

test('rejects unsupported campaign item statuses', async () => {
  const { apiFetch, calls } = createApi(() => []);
  await assert.rejects(
    updateCampaignItem(apiFetch, { id: 'item-1', client_id: 'client-1' }, 'won'),
    /invalid_campaign_item_status/
  );
  assert.equal(calls.length, 0);
});

test('Studio renders and initializes the Ayuntamientos view', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('studio.html', root), 'utf8'),
    readFile(new URL('studio.js', root), 'utf8')
  ]);

  assert.match(html, /data-municipality-list/);
  assert.match(html, /data-campaign-form/);
  assert.match(html, /data-campaign-select/);
  assert.match(html, /data-campaign-items/);
  assert.match(script, /import \{ initAyuntamientosView \} from '.\/studio\/views\/ayuntamientos\.js'/);
  assert.match(script, /initAyuntamientosView\(\{\s*apiFetch,\s*root: document\.querySelector\('\[data-view="ayuntamientos"\]'\)/);
});

test('manual municipality inquiries create a detected municipality client', async () => {
  const script = await readFile(new URL('studio.js', root), 'utf8');

  assert.match(script, /detectMunicipality\(payload\.name, payload\.company, payload\.message\)/);
  assert.match(script, /findOrCreateClient\(apiFetch, created\[0\]\)/);
});
