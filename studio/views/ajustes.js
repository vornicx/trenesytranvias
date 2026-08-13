export const CLIENT_FICHE_THRESHOLD_KEY = 'client_fiche_threshold';
export const DEFAULT_CLIENT_FICHE_THRESHOLD = 3;
export const MUNICIPAL_ELECTION_YEAR_KEY = 'default_municipal_election_year';
export const DEFAULT_MUNICIPAL_ELECTION_YEAR = 2027;

export async function loadSettings(apiFetch) {
  const rows = await apiFetch(
    `tyt_settings?key=in.(${CLIENT_FICHE_THRESHOLD_KEY},${MUNICIPAL_ELECTION_YEAR_KEY})&select=key,value`
  );
  const byKey = new Map((rows || []).map(row => [row.key, Number(row.value)]));
  const threshold = byKey.get(CLIENT_FICHE_THRESHOLD_KEY);
  const electionYear = byKey.get(MUNICIPAL_ELECTION_YEAR_KEY);
  return {
    clientFicheThreshold:
      Number.isInteger(threshold) && threshold >= 1 ? threshold : DEFAULT_CLIENT_FICHE_THRESHOLD,
    defaultMunicipalElectionYear:
      validateElectionYear(electionYear) || DEFAULT_MUNICIPAL_ELECTION_YEAR
  };
}

export function validateThreshold(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export function validateElectionYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 9999 ? year : null;
}

async function saveSetting(apiFetch, key, value) {
  const updated = await apiFetch(`tyt_settings?key=eq.${key}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ value })
  });
  if (updated?.length) return updated[0];

  const created = await apiFetch('tyt_settings', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ key, value })
  });
  return created?.[0] || null;
}

export async function saveThreshold(apiFetch, n) {
  const threshold = validateThreshold(n);
  if (threshold === null) throw new Error('invalid_threshold');
  return saveSetting(apiFetch, CLIENT_FICHE_THRESHOLD_KEY, threshold);
}

export async function saveElectionYear(apiFetch, value) {
  const year = validateElectionYear(value);
  if (year === null) throw new Error('invalid_election_year');
  return saveSetting(apiFetch, MUNICIPAL_ELECTION_YEAR_KEY, year);
}

export function initAjustesView({ apiFetch, root }) {
  const thresholdInput = root.querySelector('[data-ajustes-threshold]');
  const electionYearInput = root.querySelector('[data-ajustes-election-year]');
  const saveButton = root.querySelector('[data-ajustes-save]');
  const statusEl = root.querySelector('[data-ajustes-status]');

  function setStatus(message = '', type = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `ajustes-status${type ? ` ${type}` : ''}`;
  }

  async function refreshSettings() {
    setStatus('Cargando ajustes…');
    if (saveButton) saveButton.disabled = true;
    try {
      const settings = await loadSettings(apiFetch);
      if (thresholdInput) thresholdInput.value = String(settings.clientFicheThreshold);
      if (electionYearInput) electionYearInput.value = String(settings.defaultMunicipalElectionYear);
      setStatus('');
    } catch (error) {
      console.error(error);
      if (thresholdInput) thresholdInput.value = String(DEFAULT_CLIENT_FICHE_THRESHOLD);
      if (electionYearInput) electionYearInput.value = String(DEFAULT_MUNICIPAL_ELECTION_YEAR);
      setStatus('No se han podido cargar los ajustes.', 'error');
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }

  async function handleSave(event) {
    event?.preventDefault();
    const threshold = validateThreshold(thresholdInput?.value);
    const electionYear = validateElectionYear(electionYearInput?.value);
    if (threshold === null || electionYear === null) {
      setStatus('Revisa el umbral y el año electoral.', 'error');
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Guardando…';
    }
    setStatus('');
    try {
      await Promise.all([
        saveThreshold(apiFetch, threshold),
        saveElectionYear(apiFetch, electionYear)
      ]);
      if (thresholdInput) thresholdInput.value = String(threshold);
      if (electionYearInput) electionYearInput.value = String(electionYear);
      setStatus('Ajustes guardados correctamente.', 'success');
    } catch (error) {
      console.error(error);
      setStatus('No se han podido guardar los ajustes.', 'error');
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Guardar';
      }
    }
  }

  root.querySelector('[data-ajustes-form]')?.addEventListener('submit', handleSave);
  document.addEventListener('tyt:view', event => {
    if (event.detail?.name === 'ajustes') refreshSettings();
  });
}
