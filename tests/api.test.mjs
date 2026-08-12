import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiFetch } from '../studio/lib/api.js';

test('api fetch refreshes once after an expired access token', async () => {
  let token = 'old-token';
  let refreshes = 0;
  const requests = [];
  const fetchImpl = async (_url, options) => {
    requests.push(options.headers.Authorization);
    return requests.length === 1
      ? { status: 401, ok: false }
      : { status: 200, ok: true, json: async () => [{ id: 1 }] };
  };
  const apiFetch = createApiFetch({
    config: { url: 'https://example.supabase.co', publishableKey: 'key' },
    getAccessToken: () => token,
    refreshSession: async () => { refreshes += 1; token = 'new-token'; },
    fetchImpl
  });

  const result = await apiFetch('tyt_inquiries');

  assert.deepEqual(result, [{ id: 1 }]);
  assert.equal(refreshes, 1);
  assert.deepEqual(requests, ['Bearer old-token', 'Bearer new-token']);
});
