import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { loadInquiryActivity, logInquiryStatusChange } from '../studio/lib/activity.js';

const root = new URL('../', import.meta.url);

test('logInquiryStatusChange records only actual status changes', async () => {
  const calls = [];
  const apiFetch = async (path, options) => {
    calls.push({ path, body: JSON.parse(options.body) });
    return [];
  };

  await logInquiryStatusChange(apiFetch, {
    inquiryId: 'inquiry-1',
    previousStatus: 'new',
    nextStatus: 'contacted',
    actorEmail: 'admin@example.com'
  });
  await logInquiryStatusChange(apiFetch, {
    inquiryId: 'inquiry-1',
    previousStatus: 'contacted',
    nextStatus: 'contacted',
    actorEmail: 'admin@example.com'
  });

  assert.deepEqual(calls, [{
    path: 'tyt_activity_log',
    body: {
      entity_type: 'inquiry',
      entity_id: 'inquiry-1',
      action: 'status_changed',
      actor_email: 'admin@example.com',
      meta: { from: 'new', to: 'contacted' }
    }
  }]);
});

test('loadInquiryActivity requests the latest ten entries', async () => {
  const calls = [];
  const apiFetch = async path => {
    calls.push(path);
    return [{ id: 'activity-1' }];
  };

  assert.deepEqual(await loadInquiryActivity(apiFetch, 'inquiry/1'), [{ id: 'activity-1' }]);
  assert.equal(
    calls[0],
    'tyt_activity_log?entity_type=eq.inquiry&entity_id=eq.inquiry%2F1&select=*&order=created_at.desc&limit=10'
  );
});

test('inquiry drawer includes and initializes activity history', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('studio.html', root), 'utf8'),
    readFile(new URL('studio.js', root), 'utf8')
  ]);

  assert.match(html, /data-inquiry-activity/);
  assert.match(script, /loadInquiryActivity/);
  assert.match(script, /logInquiryStatusChange/);
});
