import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { exportSalesPdf, exportSalesXlsx } from '../studio/lib/export.js';
import { filterSales, loadSales, shapeSalesRows } from '../studio/views/ventas.js';

const root = new URL('../', import.meta.url);

test('loadSales joins client names from the embedded relation', async () => {
  const calls = [];
  const apiFetch = async path => {
    calls.push(path);
    return [{
      id: 'sale-1',
      sold_at: '2026-08-10T09:30:00Z',
      amount_eur: 1250,
      concept: 'Tren turístico',
      inquiry_id: 'inquiry-1',
      tyt_clients: { name: 'María', company: 'Ayuntamiento de Écija', is_municipality: true }
    }];
  };

  const rows = await loadSales(apiFetch);

  assert.match(calls[0], /^tyt_sales\?select=\*,tyt_clients\(name,company,is_municipality\)&order=sold_at\.desc$/);
  assert.equal(rows[0].client_name, 'María');
});

test('filterSales applies inclusive date and municipality filters', () => {
  const rows = [
    { sold_at: '2026-08-09T23:59:59Z', is_municipality: false },
    { sold_at: '2026-08-10T12:00:00Z', is_municipality: true },
    { sold_at: '2026-08-12T23:59:59Z', is_municipality: false },
    { sold_at: '2026-08-13T00:00:00Z', is_municipality: true }
  ];

  assert.deepEqual(filterSales(rows, '2026-08-10', '2026-08-12'), rows.slice(1, 3));
  assert.deepEqual(filterSales(rows, '', '2026-08-10'), rows.slice(0, 2));
  assert.deepEqual(filterSales(rows, '2026-08-12', ''), rows.slice(2));
  assert.deepEqual(filterSales(rows, '', '', 'municipality'), [rows[1], rows[3]]);
  assert.deepEqual(filterSales(rows, '', '', 'non-municipality'), [rows[0], rows[2]]);
});

test('shapeSalesRows exposes only the exporter fields', () => {
  assert.deepEqual(shapeSalesRows([{
    id: 'sale-1',
    sold_at: '2026-08-10T09:30:00Z',
    client_name: 'Ayuntamiento de Écija',
    concept: 'Tren turístico',
    amount_eur: 1250,
    inquiry_id: 'inquiry-1'
  }]), [{
    sold_at: '2026-08-10T09:30:00Z',
    client_name: 'Ayuntamiento de Écija',
    concept: 'Tren turístico',
    amount_eur: 1250,
    inquiry_id: 'inquiry-1'
  }]);
});

test('export helpers use the required browser globals and row shape', () => {
  const rows = [{
    sold_at: '2026-08-10',
    client_name: 'Ayuntamiento de Écija',
    concept: 'Tren turístico',
    amount_eur: 1250,
    inquiry_id: 'inquiry-1'
  }];
  const xlsxCalls = [];
  globalThis.XLSX = {
    utils: {
      aoa_to_sheet: aoa => (xlsxCalls.push(['sheet', aoa]), { aoa }),
      book_new: () => ({ sheets: [] }),
      book_append_sheet: (book, sheet, name) => xlsxCalls.push(['append', book, sheet, name])
    },
    writeFile: (book, filename) => xlsxCalls.push(['write', book, filename])
  };
  const pdfCalls = [];
  globalThis.jspdf = {
    jsPDF: class {
      setFontSize(size) { pdfCalls.push(['font', size]); }
      text(text, x, y) { pdfCalls.push(['text', text, x, y]); }
      addPage() { pdfCalls.push(['page']); }
      save(filename) { pdfCalls.push(['save', filename]); }
    }
  };

  exportSalesXlsx(rows);
  exportSalesPdf(rows);

  assert.deepEqual(xlsxCalls[0][1], [
    ['Fecha', 'Cliente', 'Concepto', 'Importe €', 'Inquiry'],
    ['2026-08-10', 'Ayuntamiento de Écija', 'Tren turístico', 1250, 'inquiry-1']
  ]);
  assert.match(xlsxCalls.at(-1)[2], /^ventas-\d{4}-\d{2}-\d{2}\.xlsx$/);
  assert.deepEqual(pdfCalls[1], ['text', 'Ventas — Trenes y Tranvías', 14, 16]);
  assert.match(pdfCalls.at(-1)[1], /^ventas-\d{4}-\d{2}-\d{2}\.pdf$/);

  delete globalThis.XLSX;
  delete globalThis.jspdf;
});

test('Studio wires the Ventas view and export CDN libraries', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('studio.html', root), 'utf8'),
    readFile(new URL('studio.js', root), 'utf8')
  ]);

  assert.match(html, /data-sales-from/);
  assert.match(html, /data-sales-to/);
  assert.match(html, /data-sales-municipality-filter/);
  assert.match(html, /data-sales-export-xlsx[^>]*>Exportar Excel/);
  assert.match(html, /data-sales-export-pdf[^>]*>Exportar PDF/);
  assert.match(html, /xlsx\.full\.min\.js/);
  assert.match(html, /jspdf\.umd\.min\.js/);
  assert.match(script, /initVentasView/);
});
