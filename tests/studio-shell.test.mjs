import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const [html, script, publicScript] = await Promise.all([
  readFile(new URL('studio.html', root), 'utf8'),
  readFile(new URL('studio.js', root), 'utf8'),
  readFile(new URL('app.js', root), 'utf8')
]);

test('Studio exposes the five Spanish module views', () => {
  const modules = ['solicitudes', 'clientes', 'ayuntamientos', 'ventas', 'ajustes'];

  for (const name of modules) {
    assert.match(html, new RegExp(`data-nav="${name}"`));
    assert.match(html, new RegExp(`data-view="${name}"`));
  }

  assert.match(html, /data-nav="solicitudes">Solicitudes <b data-new-count>0<\/b>/);
  assert.match(html, /<h1>Gestión comercial<\/h1>/);
});

test('showView switches panels, updates navigation, hash, and event', () => {
  const match = script.match(/function showView\(name\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'showView must exist');

  const panels = ['solicitudes', 'clientes'].map(view => ({ dataset: { view }, hidden: false }));
  const links = ['solicitudes', 'clientes'].map(nav => ({
    dataset: { nav },
    active: false,
    classList: { toggle(_className, active) { this.owner.active = active; }, owner: null }
  }));
  links.forEach(link => { link.classList.owner = link; });
  const events = [];
  const context = {
    $$: selector => selector === '[data-view]' ? panels : links,
    location: { hash: '' },
    CustomEvent: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init.detail; }
    },
    document: { dispatchEvent: event => events.push(event) }
  };

  vm.runInNewContext(`${match[0]}; showView('clientes');`, context);

  assert.deepEqual(panels.map(panel => panel.hidden), [true, false]);
  assert.deepEqual(links.map(link => link.active), [false, true]);
  assert.equal(context.location.hash, 'clientes');
  assert.equal(events[0].type, 'tyt:view');
  assert.equal(events[0].detail.name, 'clientes');
});

test('primary sales statuses use the approved Spanish labels', () => {
  assert.match(script, /new: 'Nueva'/);
  assert.match(script, /contacted: 'Contactado'/);
  assert.match(script, /quoted: 'Presupuestado'/);
  assert.match(script, /won: 'Vendido'/);
});

test('sold status has an optional amount modal and dedicated action', () => {
  assert.match(html, /data-won-modal/);
  assert.match(html, /name="amount_eur"/);
  assert.match(html, /data-mark-won>Marcar vendido/);
  assert.match(script, /createMarkInquiryWon/);
  assert.match(script, /if \(nextStatus === 'won' && item\.status !== 'won'\)/);
});

test('public inquiry payload explicitly starts as new', () => {
  assert.match(publicScript, /source: 'website',\s+status: 'new',\s+priority: 'normal'/);
  assert.match(publicScript, /Prefer: 'return=minimal'/);
});
