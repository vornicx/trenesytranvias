import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const migrations = new URL('../supabase/migrations/', import.meta.url);

test('base inquiries migration sorts before CRM migration', async () => {
  const files = (await readdir(migrations)).filter(file => file.endsWith('.sql')).sort();

  assert.deepEqual(files, [
    '20260812_init_inquiries_and_allowlist.sql',
    '20260813_crm_clients_sales.sql'
  ]);
});

test('public inquiry insert policy rejects CRM-only fields', async () => {
  const sql = await readFile(new URL('20260812_init_inquiries_and_allowlist.sql', migrations), 'utf8');

  assert.match(sql, /for insert to anon/);
  assert.match(sql, /create policy tyt_inquiries_admin_all[\s\S]*for all to authenticated/);
  assert.match(sql, /function public\.tyt_set_updated_at\(\)[\s\S]*set search_path = pg_catalog, public/);
  assert.match(sql, /status = 'new'/);
  for (const field of ['internal_notes', 'assigned_to', 'next_follow_up_at', 'last_contacted_at']) {
    assert.match(sql, new RegExp(`${field} is null`));
  }
  assert.doesNotMatch(sql, /with check \(true\)/);
  assert.match(sql, /revoke execute on function public\.tyt_is_admin\(\) from public/);
});

test('CRM migration defines idempotent atomic won RPC and unique inquiry sale', async () => {
  const sql = await readFile(new URL('20260813_crm_clients_sales.sql', migrations), 'utf8');

  assert.match(sql, /create unique index[\s\S]*tyt_sales[\s\S]*inquiry_id[\s\S]*where inquiry_id is not null/i);
  assert.match(sql, /create or replace function public\.tyt_mark_inquiry_won/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /if not public\.tyt_is_admin\(\)/i);
  assert.match(sql, /grant execute on function public\.tyt_mark_inquiry_won/i);
});
