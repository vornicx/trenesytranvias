import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMunicipality } from '../studio/lib/municipality.js';

test('detects ayuntamiento in company', () => {
  assert.equal(detectMunicipality('Juan', 'Ayuntamiento de Écija', ''), true);
});
test('ignores unrelated', () => {
  assert.equal(detectMunicipality('Ana', 'Turismo Sur', 'alquiler tren'), false);
});
