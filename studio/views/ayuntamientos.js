const ITEM_STATUSES = ['pending', 'contacted', 'continues', 'stopped'];

const statusLabels = {
  pending: 'Pendiente',
  contacted: 'Contactado',
  continues: 'Continúa',
  stopped: 'No continúa'
};

const escapeHTML = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function formatDate(value, withTime = false) {
  if (!value) return '—';
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit' });
  return new Intl.DateTimeFormat('es-ES', options).format(new Date(value));
}

export async function loadMunicipalities(apiFetch) {
  const rows = await apiFetch(
    'tyt_clients?is_municipality=eq.true&select=*&order=next_recontact_at.asc.nullslast'
  );
  return Array.isArray(rows) ? rows : [];
}

export async function loadCampaigns(apiFetch) {
  const rows = await apiFetch('tyt_recontact_campaigns?select=*&order=created_at.desc');
  return Array.isArray(rows) ? rows : [];
}

export async function loadCampaignItems(apiFetch, campaignId) {
  if (!campaignId) return [];
  const rows = await apiFetch(
    `tyt_recontact_items?campaign_id=eq.${encodeURIComponent(campaignId)}&select=*,client:tyt_clients(*)&order=updated_at.desc`
  );
  return Array.isArray(rows) ? rows : [];
}

export async function createCampaign({ name, electionYear }, apiFetch) {
  const cleanName = String(name || '').trim();
  const year = Number(electionYear);
  if (!cleanName) throw new Error('invalid_campaign_name');
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new Error('invalid_election_year');
  }

  const municipalities = await loadMunicipalities(apiFetch);
  const campaignRows = await apiFetch('tyt_recontact_campaigns', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name: cleanName, election_year: year })
  });
  const campaign = campaignRows?.[0];
  if (!campaign) throw new Error('campaign_creation_failed');

  if (!municipalities.length) return { campaign, items: [] };
  const itemRows = await apiFetch('tyt_recontact_items', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(municipalities.map(client => ({
      campaign_id: campaign.id,
      client_id: client.id,
      status: 'pending'
    })))
  });
  if (!Array.isArray(itemRows) || itemRows.length !== municipalities.length) {
    throw new Error('campaign_items_creation_failed');
  }
  return { campaign, items: itemRows };
}

export async function updateCampaignItem(
  apiFetch,
  item,
  status,
  changedAt = new Date().toISOString()
) {
  if (!ITEM_STATUSES.includes(status)) throw new Error('invalid_campaign_item_status');
  if (!item?.id || !item?.client_id) throw new Error('campaign_item_required');

  const rows = await apiFetch(`tyt_recontact_items?id=eq.${encodeURIComponent(item.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status, updated_at: changedAt })
  });
  const updated = rows?.[0];
  if (!updated) throw new Error('campaign_item_update_failed');

  if (status === 'contacted') {
    await apiFetch(`tyt_clients?id=eq.${encodeURIComponent(item.client_id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ last_recontact_at: changedAt })
    });
  }
  return updated;
}

export function initAyuntamientosView({ apiFetch, root }) {
  if (!root) return;

  const select = selector => root.querySelector(selector);
  const selectAll = selector => [...root.querySelectorAll(selector)];
  const municipalityList = select('[data-municipality-list]');
  const campaignSelect = select('[data-campaign-select]');
  const campaignItems = select('[data-campaign-items]');
  const campaignForm = select('[data-campaign-form]');
  const campaignStatus = select('[data-campaign-status]');
  const loading = select('[data-municipality-loading]');
  const empty = select('[data-municipality-empty]');
  const error = select('[data-municipality-error]');
  let municipalities = [];
  let campaigns = [];
  let items = [];

  function setError(message = '') {
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  }

  function selectedCampaign() {
    return campaigns.find(campaign => campaign.id === campaignSelect?.value) || null;
  }

  function clientForItem(item) {
    return item.client || municipalities.find(client => client.id === item.client_id) || null;
  }

  function renderStats() {
    const setText = (selector, value) => {
      const element = select(selector);
      if (element) element.textContent = String(value);
    };
    setText('[data-municipality-stat-total]', municipalities.length);
    setText(
      '[data-municipality-stat-recontact]',
      municipalities.filter(client => client.next_recontact_at).length
    );
    setText('[data-municipality-stat-campaigns]', campaigns.length);
    setText(
      '[data-municipality-stat-pending]',
      items.filter(item => item.status === 'pending').length
    );
  }

  function renderCampaignSelect() {
    if (!campaignSelect) return;
    const previous = campaignSelect.value;
    campaignSelect.innerHTML = campaigns.length
      ? campaigns.map(campaign => `
        <option value="${escapeHTML(campaign.id)}">${escapeHTML(campaign.name)} · ${escapeHTML(campaign.election_year)}</option>
      `).join('')
      : '<option value="">Sin campañas</option>';
    if (campaigns.some(campaign => campaign.id === previous)) campaignSelect.value = previous;
  }

  function renderMunicipalities() {
    if (!municipalityList || !empty) return;
    const itemByClient = new Map(items.map(item => [item.client_id, item]));
    municipalityList.innerHTML = municipalities.map(client => {
      const item = itemByClient.get(client.id);
      return `
        <article class="municipality-row">
          <div class="person-cell">
            <strong>${escapeHTML(client.name || client.company || 'Ayuntamiento sin nombre')}</strong>
            <span>${escapeHTML(client.location || client.email || 'Sin localidad')}</span>
          </div>
          <div class="municipality-cycle"><strong>${escapeHTML(client.election_year || '—')}</strong><span>Año electoral</span></div>
          <div class="date-cell">${escapeHTML(formatDate(client.next_recontact_at))}</div>
          <div class="date-cell">${escapeHTML(formatDate(client.last_recontact_at, true))}</div>
          <span class="campaign-status status-${escapeHTML(item?.status || 'none')}">${escapeHTML(item ? statusLabels[item.status] : 'Sin campaña')}</span>
        </article>
      `;
    }).join('');
    empty.hidden = municipalities.length > 0;
  }

  function renderCampaignItems() {
    if (!campaignItems) return;
    const campaign = selectedCampaign();
    if (!campaign) {
      campaignItems.innerHTML = '<div class="empty-state compact"><strong>No hay ninguna campaña.</strong><p>Crea una campaña para preparar el recontacto municipal.</p></div>';
      renderStats();
      return;
    }
    campaignItems.innerHTML = items.length
      ? items.map(item => {
        const client = clientForItem(item);
        return `
          <article class="campaign-item-row">
            <div class="person-cell">
              <strong>${escapeHTML(client?.name || client?.company || 'Ayuntamiento')}</strong>
              <span>${escapeHTML(client?.location || client?.email || 'Sin datos de contacto')}</span>
            </div>
            <select aria-label="Estado de ${escapeHTML(client?.name || 'ayuntamiento')}" data-campaign-item-status="${escapeHTML(item.id)}">
              ${ITEM_STATUSES.map(status => `<option value="${status}"${item.status === status ? ' selected' : ''}>${statusLabels[status]}</option>`).join('')}
            </select>
            <span>${escapeHTML(formatDate(item.updated_at, true))}</span>
          </article>
        `;
      }).join('')
      : '<div class="empty-state compact"><strong>Campaña sin ayuntamientos.</strong><p>No había fichas municipales al crearla.</p></div>';
    selectAll('[data-campaign-item-status]').forEach(control => {
      control.addEventListener('change', () => handleItemStatus(control));
    });
    renderStats();
  }

  async function refreshCampaignItems() {
    items = await loadCampaignItems(apiFetch, campaignSelect?.value);
    renderMunicipalities();
    renderCampaignItems();
  }

  async function refresh() {
    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    setError('');
    try {
      [municipalities, campaigns] = await Promise.all([
        loadMunicipalities(apiFetch),
        loadCampaigns(apiFetch)
      ]);
      renderCampaignSelect();
      items = await loadCampaignItems(apiFetch, campaignSelect?.value);
      renderStats();
      renderMunicipalities();
      renderCampaignItems();
    } catch (loadError) {
      if (loadError?.message !== 'not_authenticated') {
        console.error(loadError);
        setError('No se han podido cargar los ayuntamientos y sus campañas.');
      }
    } finally {
      if (loading) loading.hidden = true;
    }
  }

  async function handleItemStatus(control) {
    const item = items.find(candidate => candidate.id === control.dataset.campaignItemStatus);
    if (!item) return;
    const previousStatus = item.status;
    control.disabled = true;
    setError('');
    try {
      const updated = await updateCampaignItem(apiFetch, item, control.value);
      items = items.map(candidate => candidate.id === updated.id
        ? { ...candidate, ...updated }
        : candidate);
      if (updated.status === 'contacted') {
        municipalities = municipalities.map(client => client.id === item.client_id
          ? { ...client, last_recontact_at: new Date().toISOString() }
          : client);
      }
      renderMunicipalities();
      renderCampaignItems();
    } catch (updateError) {
      console.error(updateError);
      control.value = previousStatus;
      control.disabled = false;
      setError('No se ha podido actualizar el estado de recontacto.');
    }
  }

  campaignSelect?.addEventListener('change', async () => {
    setError('');
    try {
      await refreshCampaignItems();
    } catch (loadError) {
      console.error(loadError);
      setError('No se ha podido cargar la campaña seleccionada.');
    }
  });

  campaignForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = select('[data-campaign-submit]');
    const data = new FormData(campaignForm);
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Creando…';
    }
    if (campaignStatus) campaignStatus.textContent = '';
    setError('');
    try {
      const result = await createCampaign({
        name: data.get('name'),
        electionYear: data.get('election_year')
      }, apiFetch);
      campaigns.unshift(result.campaign);
      renderCampaignSelect();
      campaignSelect.value = result.campaign.id;
      items = await loadCampaignItems(apiFetch, result.campaign.id);
      campaignForm.reset();
      if (campaignStatus) {
        campaignStatus.textContent = `Campaña creada con ${result.items.length} ayuntamientos.`;
      }
      renderMunicipalities();
      renderCampaignItems();
    } catch (createError) {
      console.error(createError);
      if (campaignStatus) {
        campaignStatus.textContent = createError.message === 'invalid_campaign_name'
          || createError.message === 'invalid_election_year'
          ? 'Introduce un nombre y un año electoral válidos.'
          : 'No se ha podido crear la campaña.';
      }
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Crear campaña';
      }
    }
  });

  select('[data-municipality-refresh]')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    await refresh();
    event.currentTarget.disabled = false;
  });
  document.addEventListener('tyt:view', event => {
    if (event.detail?.name === 'ayuntamientos') refresh();
  });

  return { refresh };
}
