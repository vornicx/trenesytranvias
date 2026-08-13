const escapeHTML = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase();

const inquiryStatusLabels = {
  new: 'Nueva',
  contacted: 'Contactado',
  qualified: 'Cualificada',
  quoted: 'Presupuestado',
  won: 'Vendido',
  lost: 'Perdida',
  archived: 'Archivada'
};

export const DEFAULT_CLIENT_FICHE_THRESHOLD = 3;

function hasClientFiche(client, threshold) {
  return Number(client.sales_count || 0) >= threshold
    || client.is_important
    || client.is_municipality;
}

export function filterClients(
  clients,
  query = '',
  filter = 'all',
  threshold = DEFAULT_CLIENT_FICHE_THRESHOLD
) {
  const needle = normalize(query.trim());
  return clients.filter(client => {
    const haystack = normalize([
      client.name,
      client.company,
      client.email,
      client.phone,
      client.location
    ].filter(Boolean).join(' '));
    const hasFiche = hasClientFiche(client, threshold);
    const matchesType = filter === 'pending'
      ? !hasFiche
      : hasFiche && (
        filter === 'all'
        || (filter === 'municipality' && client.is_municipality)
        || (filter === 'non-municipality' && !client.is_municipality)
      );
    return matchesType && (!needle || haystack.includes(needle));
  });
}

export async function loadClientFicheThreshold(apiFetch) {
  try {
    const rows = await apiFetch('tyt_settings?key=eq.client_fiche_threshold&select=value&limit=1');
    const threshold = Number(rows?.[0]?.value);
    return Number.isInteger(threshold) && threshold >= 1
      ? threshold
      : DEFAULT_CLIENT_FICHE_THRESHOLD;
  } catch {
    return DEFAULT_CLIENT_FICHE_THRESHOLD;
  }
}

export async function loadClients(
  apiFetch,
  threshold = DEFAULT_CLIENT_FICHE_THRESHOLD,
  includeBelowThreshold = false
) {
  const rows = await apiFetch('tyt_clients?select=*&order=updated_at.desc');
  if (!Array.isArray(rows)) return [];
  return includeBelowThreshold ? rows : rows.filter(client => hasClientFiche(client, threshold));
}

export async function loadClientHistory(apiFetch, client) {
  const salesRequest = apiFetch(
    `tyt_sales?client_id=eq.${encodeURIComponent(client.id)}&order=sold_at.desc`
  );
  const inquiriesRequest = client.email
    ? apiFetch(
      `tyt_inquiries?email=eq.${encodeURIComponent(client.email)}&order=created_at.desc`
    )
    : Promise.resolve([]);
  const [sales, inquiries] = await Promise.all([salesRequest, inquiriesRequest]);
  return {
    sales: Array.isArray(sales) ? sales : [],
    inquiries: Array.isArray(inquiries) ? inquiries : []
  };
}

export async function updateClient(apiFetch, id, patch) {
  const rows = await apiFetch(`tyt_clients?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      notes: patch.notes || null,
      is_municipality: Boolean(patch.is_municipality),
      is_important: Boolean(patch.is_important),
      election_year: patch.election_year || null,
      next_recontact_at: patch.next_recontact_at || null
    })
  });
  if (!rows?.[0]) throw new Error('client_update_failed');
  return rows[0];
}

function formatDate(value, withTime = false) {
  if (!value) return '—';
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit' });
  return new Intl.DateTimeFormat('es-ES', options).format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

export function initClientesView({ apiFetch, root }) {
  if (!root) return;

  const select = selector => root.querySelector(selector);
  const selectAll = selector => [...root.querySelectorAll(selector)];
  const list = select('[data-client-list]');
  const loading = select('[data-client-loading]');
  const empty = select('[data-client-empty]');
  const error = select('[data-client-error]');
  const search = select('[data-client-search]');
  const filter = select('[data-client-filter]');
  const drawer = select('[data-client-drawer]');
  const backdrop = select('[data-client-drawer-backdrop]');
  const saveButton = select('[data-client-save]');
  const saveState = select('[data-client-save-state]');
  const history = select('[data-client-history]');
  let clients = [];
  let threshold = DEFAULT_CLIENT_FICHE_THRESHOLD;
  let selectedClientId = null;

  const selectedClient = () => clients.find(client => client.id === selectedClientId) || null;
  const setText = (selector, value) => {
    const element = select(selector);
    if (element) element.textContent = value || '—';
  };

  function setError(message = '') {
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  }

  function renderStats() {
    const fiches = clients.filter(client => hasClientFiche(client, threshold));
    setText('[data-client-stat-total]', String(fiches.length));
    setText('[data-client-stat-municipalities]', String(fiches.filter(client => client.is_municipality).length));
    setText('[data-client-stat-sales]', String(fiches.reduce((total, client) => total + Number(client.sales_count || 0), 0)));
    setText('[data-client-stat-value]', formatCurrency(fiches.reduce((total, client) => total + Number(client.sales_total || 0), 0)));
  }

  function renderList() {
    if (!list || !empty) return;
    const visible = filterClients(clients, search?.value || '', filter?.value || 'all', threshold);
    list.innerHTML = visible.map(client => `
      <article class="client-row">
        <div class="person-cell">
          <strong>${escapeHTML(client.name || 'Sin nombre')}</strong>
          <span>${escapeHTML(client.company || client.email || 'Sin empresa')}</span>
        </div>
        <div><span class="client-type ${client.is_municipality ? 'is-municipality' : ''}">${client.is_municipality ? 'Ayuntamiento' : 'Cliente'}</span></div>
        <div class="client-metric"><strong>${escapeHTML(client.sales_count || 0)}</strong><span>ventas</span></div>
        <div class="client-metric"><strong>${escapeHTML(formatCurrency(client.sales_total))}</strong><span>facturado</span></div>
        <div class="date-cell">${escapeHTML(formatDate(client.updated_at || client.created_at))}</div>
        <button class="row-open" type="button" aria-label="Abrir ficha de ${escapeHTML(client.name)}" data-open-client="${escapeHTML(client.id)}">→</button>
      </article>
    `).join('');
    empty.hidden = visible.length > 0;
    selectAll('[data-open-client]').forEach(button => {
      button.addEventListener('click', () => openDrawer(button.dataset.openClient));
    });
  }

  function renderHistory({ sales, inquiries }) {
    if (!history) return;
    const salesMarkup = sales.length
      ? sales.map(sale => `
        <article class="history-item">
          <div><strong>${escapeHTML(sale.concept || 'Venta')}</strong><span>${escapeHTML(formatDate(sale.sold_at))}</span></div>
          <b>${sale.amount_eur == null ? 'Importe no indicado' : escapeHTML(formatCurrency(sale.amount_eur))}</b>
        </article>
      `).join('')
      : '<p class="history-empty">No hay ventas vinculadas.</p>';
    const inquiriesMarkup = inquiries.length
      ? inquiries.map(inquiry => `
        <article class="history-item">
          <div><strong>${escapeHTML(inquiry.message || inquiry.project_type || 'Solicitud')}</strong><span>${escapeHTML(formatDate(inquiry.created_at, true))}</span></div>
          <span class="status-badge status-${escapeHTML(inquiry.status || 'new')}">${escapeHTML(inquiryStatusLabels[inquiry.status] || inquiry.status || 'Nueva')}</span>
        </article>
      `).join('')
      : '<p class="history-empty">No hay solicitudes vinculadas por email.</p>';
    history.innerHTML = `
      <div class="history-group"><h3>Ventas · ${sales.length}</h3>${salesMarkup}</div>
      <div class="history-group"><h3>Solicitudes · ${inquiries.length}</h3>${inquiriesMarkup}</div>
    `;
  }

  async function openDrawer(id) {
    selectedClientId = id;
    const client = selectedClient();
    if (!client || !drawer) return;
    setText('[data-client-detail-name]', client.name);
    setText('[data-client-detail-company]', client.company || 'Particular');
    setText('[data-client-detail-email]', client.email || 'No indicado');
    setText('[data-client-detail-phone]', client.phone || 'No indicado');
    setText('[data-client-detail-location]', client.location || 'No indicada');
    setText('[data-client-detail-created]', formatDate(client.created_at));
    setText('[data-client-detail-sales]', `${Number(client.sales_count || 0)} · ${formatCurrency(client.sales_total)}`);
    select('[data-client-edit-notes]').value = client.notes || '';
    select('[data-client-edit-municipality]').checked = Boolean(client.is_municipality);
    select('[data-client-edit-important]').checked = Boolean(client.is_important);
    select('[data-client-edit-election]').value = client.election_year || '';
    select('[data-client-edit-recontact]').value = client.next_recontact_at || '';
    if (saveState) saveState.textContent = client.updated_at ? `Última actualización: ${formatDate(client.updated_at, true)}` : '';
    if (history) history.innerHTML = '<p class="history-empty">Cargando historial…</p>';
    drawer.classList.add('is-open');
    backdrop?.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    try {
      renderHistory(await loadClientHistory(apiFetch, client));
    } catch (loadError) {
      console.error(loadError);
      if (history) history.innerHTML = '<p class="history-empty error">No se ha podido cargar el historial.</p>';
    }
  }

  function closeDrawer() {
    drawer?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    drawer?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    selectedClientId = null;
  }

  async function refreshClients() {
    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    setError('');
    try {
      threshold = await loadClientFicheThreshold(apiFetch);
      clients = await loadClients(apiFetch, threshold, true);
      setText('[data-client-threshold]', String(threshold));
      renderStats();
      renderList();
    } catch (loadError) {
      if (loadError?.message !== 'not_authenticated') {
        console.error(loadError);
        setError('No se han podido cargar los clientes. Comprueba la conexión y vuelve a intentarlo.');
      }
    } finally {
      if (loading) loading.hidden = true;
    }
  }

  search?.addEventListener('input', renderList);
  filter?.addEventListener('change', renderList);
  select('[data-client-refresh]')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    await refreshClients();
    event.currentTarget.disabled = false;
  });
  select('[data-client-close]')?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drawer?.classList.contains('is-open')) closeDrawer();
  });
  document.addEventListener('tyt:view', event => {
    if (event.detail?.name === 'clientes') refreshClients();
    else if (drawer?.classList.contains('is-open')) closeDrawer();
  });
  saveButton?.addEventListener('click', async () => {
    const client = selectedClient();
    if (!client) return;
    const electionValue = select('[data-client-edit-election]').value;
    const electionYear = electionValue ? Number(electionValue) : null;
    if (electionYear !== null && (!Number.isInteger(electionYear) || electionYear < 1900 || electionYear > 9999)) {
      if (saveState) saveState.textContent = 'Introduce un año electoral válido.';
      return;
    }
    saveButton.disabled = true;
    saveButton.textContent = 'Guardando…';
    if (saveState) saveState.textContent = '';
    try {
      const updated = await updateClient(apiFetch, client.id, {
        notes: select('[data-client-edit-notes]').value.trim(),
        is_municipality: select('[data-client-edit-municipality]').checked,
        is_important: select('[data-client-edit-important]').checked,
        election_year: electionYear,
        next_recontact_at: select('[data-client-edit-recontact]').value || null
      });
      clients = clients.map(item => item.id === updated.id ? updated : item);
      renderStats();
      renderList();
      await openDrawer(updated.id);
      if (saveState) saveState.textContent = 'Ficha guardada.';
    } catch (saveError) {
      console.error(saveError);
      if (saveState) saveState.textContent = 'No se han podido guardar los cambios.';
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Guardar cambios';
    }
  });

  return { refresh: refreshClients };
}
