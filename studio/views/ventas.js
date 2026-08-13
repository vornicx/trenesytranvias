import { exportSalesPdf, exportSalesXlsx } from '../lib/export.js';

const escapeHTML = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function clientName(client) {
  const relation = Array.isArray(client) ? client[0] : client;
  return relation?.name || relation?.company || '';
}

function joinClients(sales, clients) {
  const clientsById = new Map(clients.map(client => [client.id, client]));
  return sales.map(sale => ({
    ...sale,
    client_name: clientName(sale.tyt_clients) || clientName(clientsById.get(sale.client_id))
  }));
}

export async function loadSales(apiFetch) {
  try {
    const rows = await apiFetch(
      'tyt_sales?select=*,tyt_clients(name,company,is_municipality)&order=sold_at.desc'
    );
    return joinClients(Array.isArray(rows) ? rows : [], []);
  } catch {
    const [sales, clients] = await Promise.all([
      apiFetch('tyt_sales?select=*&order=sold_at.desc'),
      apiFetch('tyt_clients?select=id,name,company,is_municipality')
    ]);
    return joinClients(
      Array.isArray(sales) ? sales : [],
      Array.isArray(clients) ? clients : []
    );
  }
}

export function filterSales(rows, from = '', to = '') {
  const fromTime = from ? Date.parse(`${from}T00:00:00.000Z`) : -Infinity;
  const toTime = to ? Date.parse(`${to}T23:59:59.999Z`) : Infinity;
  return rows.filter(row => {
    const soldTime = Date.parse(row.sold_at);
    return Number.isFinite(soldTime) && soldTime >= fromTime && soldTime <= toTime;
  });
}

export function shapeSalesRows(rows) {
  return rows.map(({ sold_at, client_name, concept, amount_eur, inquiry_id }) => ({
    sold_at,
    client_name,
    concept,
    amount_eur,
    inquiry_id
  }));
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function formatCurrency(value) {
  return value == null
    ? 'Importe no indicado'
    : new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2
    }).format(Number(value));
}

export function initVentasView({ apiFetch, root }) {
  if (!root) return;

  const select = selector => root.querySelector(selector);
  const list = select('[data-sales-list]');
  const loading = select('[data-sales-loading]');
  const empty = select('[data-sales-empty]');
  const error = select('[data-sales-error]');
  const from = select('[data-sales-from]');
  const to = select('[data-sales-to]');
  const total = select('[data-sales-total]');
  const count = select('[data-sales-count]');
  const excelButton = select('[data-sales-export-xlsx]');
  const pdfButton = select('[data-sales-export-pdf]');
  let sales = [];

  function visibleSales() {
    return filterSales(sales, from?.value || '', to?.value || '');
  }

  function setError(message = '') {
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  }

  function render() {
    const visible = visibleSales();
    if (list) {
      list.innerHTML = visible.map(sale => `
        <article class="sales-row">
          <div class="person-cell"><strong>${escapeHTML(sale.client_name || 'Cliente sin nombre')}</strong><span>${escapeHTML(sale.inquiry_id ? `Solicitud ${sale.inquiry_id}` : 'Sin solicitud vinculada')}</span></div>
          <div class="sales-concept">${escapeHTML(sale.concept || 'Venta')}</div>
          <div class="sales-amount">${escapeHTML(formatCurrency(sale.amount_eur))}</div>
          <div class="date-cell">${escapeHTML(formatDate(sale.sold_at))}</div>
        </article>
      `).join('');
    }
    if (empty) empty.hidden = visible.length > 0;
    if (count) count.textContent = String(visible.length);
    if (total) {
      total.textContent = formatCurrency(
        visible.reduce((sum, sale) => sum + Number(sale.amount_eur || 0), 0)
      );
    }
    if (excelButton) excelButton.disabled = visible.length === 0;
    if (pdfButton) pdfButton.disabled = visible.length === 0;
  }

  async function refreshSales() {
    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    setError('');
    try {
      sales = await loadSales(apiFetch);
      render();
    } catch (loadError) {
      if (loadError?.message !== 'not_authenticated') {
        console.error(loadError);
        setError('No se han podido cargar las ventas. Comprueba la conexión y vuelve a intentarlo.');
      }
    } finally {
      if (loading) loading.hidden = true;
    }
  }

  from?.addEventListener('input', render);
  to?.addEventListener('input', render);
  select('[data-sales-refresh]')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    await refreshSales();
    event.currentTarget.disabled = false;
  });
  excelButton?.addEventListener('click', () => exportSalesXlsx(shapeSalesRows(visibleSales())));
  pdfButton?.addEventListener('click', () => exportSalesPdf(shapeSalesRows(visibleSales())));
  document.addEventListener('tyt:view', event => {
    if (event.detail?.name === 'ventas') refreshSales();
  });

  return { refresh: refreshSales };
}
