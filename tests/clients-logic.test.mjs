import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldCreateClientFiche, normalizeContactKey } from '../studio/lib/clients-logic.js';

test('threshold default 3', () => {
  assert.equal(shouldCreateClientFiche(2, 3), false);
  assert.equal(shouldCreateClientFiche(3, 3), true);
});
test('email key preferred', () => {
  assert.equal(normalizeContactKey({ email: 'A@B.com', phone: '600', name: 'x', company: 'y' }), 'email:a@b.com');
});
