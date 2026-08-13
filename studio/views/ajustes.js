export const CLIENT_FICHE_THRESHOLD_KEY = 'client_fiche_threshold';
export const DEFAULT_CLIENT_FICHE_THRESHOLD = 3;

export async function loadSettings(apiFetch) {
  const rows = await apiFetch(
    `tyt_settings?key=eq.${CLIENT_FICHE_THRESHOLD_KEY}&select=key,value&limit=1`
  );
  const value = Number(rows?.[0]?.value);
  return {
    clientFicheThreshold:
      Number.isInteger(value) && value >= 1 ? value : DEFAULT_CLIENT_FICHE_THRESHOLD
  };
}

export function validateThreshold(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export async function saveThreshold(apiFetch, n) {
  const threshold = validateThreshold(n);
  if (threshold === null) throw new Error('invalid_threshold');

  const updated = await apiFetch(`tyt_settings?key=eq.${CLIENT_FICHE_THRESHOLD_KEY}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ value: threshold })
  });
  if (updated?.length) return updated[0];

  const created = await apiFetch('tyt_settings', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ key: CLIENT_FICHE_THRESHOLD_KEY, value: threshold })
  });
  return created?.[0] || null;
}

export function initAjustesView({ apiFetch, root }) {
  const thresholdInput = root.querySelector('[data-ajustes-threshold]');
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
      setStatus('');
    } catch (error) {
      console.error(error);
      if (thresholdInput) thresholdInput.value = String(DEFAULT_CLIENT_FICHE_THRESHOLD);
      setStatus('No se han podido cargar los ajustes.', 'error');
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }

  async function handleSave(event) {
    event?.preventDefault();
    const threshold = validateThreshold(thresholdInput?.value);
    if (threshold === null) {
      setStatus('Introduce un número entero mayor o igual que 1.', 'error');
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Guardando…';
    }
    setStatus('');
    try {
      await saveThreshold(apiFetch, threshold);
      if (thresholdInput) thresholdInput.value = String(threshold);
      setStatus('Umbral guardado correctamente.', 'success');
    } catch (error) {
      console.error(error);
      setStatus('No se ha podido guardar el umbral.', 'error');
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
