const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const config = window.TYT_SUPABASE || {};
const SESSION_KEY = 'tyt_studio_session';

const loginScreen = $('[data-login-screen]');
const studioApp = $('[data-studio-app]');
const loginForm = $('[data-login-form]');
const loginButton = $('[data-login-button]');
const signupButton = $('[data-signup-button]');
const authMessage = $('[data-auth-message]');
const logoutButton = $('[data-logout]');
const userEmail = $('[data-user-email]');
const userName = $('[data-user-name]');
const refreshButton = $('[data-refresh]');
const studioError = $('[data-studio-error]');
const inquiryList = $('[data-inquiry-list]');
const loading = $('[data-loading]');
const empty = $('[data-empty]');
const searchInput = $('[data-search]');
const statusFilter = $('[data-filter-status]');
const priorityFilter = $('[data-filter-priority]');
const projectFilter = $('[data-filter-project]');
const newCount = $('[data-new-count]');
const sidebar = $('[data-sidebar]');
const sidebarToggle = $('[data-sidebar-toggle]');
const drawer = $('[data-drawer]');
const drawerBackdrop = $('[data-drawer-backdrop]');
const closeDrawerButton = $('[data-close-drawer]');

let session = null;
let currentUser = null;
let inquiries = [];
let selectedInquiryId = null;

const labels = {
  status: { new: 'Nueva', contacted: 'Contactado', qualified: 'Cualificada', quoted: 'Presupuesto', won: 'Ganada', lost: 'Perdida', archived: 'Archivada' },
  priority: { high: 'Alta', normal: 'Normal', low: 'Baja' },
  project: { turismo: 'Turismo y ciudad', eventos: 'Ferias y eventos', recintos: 'Empresas y recintos', tren: 'Tren turístico', tranvia: 'Tranvía turístico', otro: 'Otro' },
  operation: { alquiler: 'Alquiler', compra: 'Compra', fabricacion: 'Fabricación / especial' }
};

const escapeHTML = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function setAuthMessage(message = '', type = ''){
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.className = `auth-message${type ? ` ${type}` : ''}`;
}

function showError(message = ''){
  if (!studioError) return;
  studioError.textContent = message;
  studioError.hidden = !message;
}

function saveSession(nextSession){
  session = nextSession;
  if (nextSession) localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
  else localStorage.removeItem(SESSION_KEY);
}

function readSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

async function authFetch(path, options = {}){
  const response = await fetch(`${config.url}/auth/v1${path}`, {
    ...options,
    headers: { apikey: config.publishableKey, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.msg || body.message || 'auth_error'), { status: response.status, body });
  return body;
}

async function refreshSession(){
  if (!session?.refresh_token) throw new Error('no_refresh_token');
  const next = await authFetch('/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) });
  saveSession(next);
  return next;
}

async function apiFetch(path, options = {}, retry = true){
  if (!session?.access_token) throw new Error('not_authenticated');
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (response.status === 401 && retry) {
    await refreshSession();
    return apiFetch(path, options, false);
  }
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw Object.assign(new Error(details || `HTTP ${response.status}`), { status: response.status });
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

async function getCurrentUser(){
  if (!session?.access_token) throw new Error('not_authenticated');
  let response = await fetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.publishableKey, Authorization: `Bearer ${session.access_token}` } });
  if (response.status === 401 && session.refresh_token) {
    await refreshSession();
    response = await fetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.publishableKey, Authorization: `Bearer ${session.access_token}` } });
  }
  if (!response.ok) throw new Error('session_expired');
  return response.json();
}

async function verifyAccess(){
  const access = await apiFetch('tyt_admin_allowlist?select=email,display_name&limit=1');
  return access?.[0] || null;
}

async function signIn(email, password){
  const nextSession = await authFetch('/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
  saveSession(nextSession);
  return nextSession;
}

async function signUp(email, password){
  return authFetch('/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
}

function signOut(){
  saveSession(null);
  currentUser = null;
  inquiries = [];
  selectedInquiryId = null;
  studioApp.hidden = true;
  loginScreen.hidden = false;
  closeDrawer();
  loginForm?.reset();
  setAuthMessage('Sesión cerrada.', 'success');
}

async function initAuthenticated(){
  try {
    currentUser = await getCurrentUser();
    const access = await verifyAccess();
    if (!access) {
      signOut();
      setAuthMessage('Esta cuenta existe, pero no tiene acceso al panel de Ciudad del Sol.', 'error');
      return;
    }
    loginScreen.hidden = true;
    studioApp.hidden = false;
    if (userEmail) userEmail.textContent = currentUser.email || '';
    if (userName) userName.textContent = access.display_name || 'Administrador';
    await loadInquiries();
  } catch (error) {
    console.error(error);
    signOut();
    setAuthMessage('La sesión ha caducado. Vuelve a iniciar sesión.', 'error');
  }
}

loginForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(loginForm);
  const email = String(data.get('email') || '').trim().toLowerCase();
  const password = String(data.get('password') || '');
  if (!email || password.length < 8) return setAuthMessage('Introduce un email y una contraseña de al menos 8 caracteres.', 'error');
  loginButton.disabled = true;
  loginButton.textContent = 'Entrando…';
  setAuthMessage('');
  try {
    await signIn(email, password);
    await initAuthenticated();
  } catch (error) {
    console.error(error);
    setAuthMessage('No se ha podido iniciar sesión. Comprueba el email, la contraseña y que el correo esté confirmado.', 'error');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Entrar';
  }
});

signupButton?.addEventListener('click', async () => {
  const data = new FormData(loginForm);
  const email = String(data.get('email') || '').trim().toLowerCase();
  const password = String(data.get('password') || '');
  if (!email || password.length < 8) return setAuthMessage('Escribe primero el email autorizado y una contraseña de al menos 8 caracteres.', 'error');
  signupButton.disabled = true;
  signupButton.textContent = 'Creando…';
  try {
    const result = await signUp(email, password);
    if (result.access_token) {
      saveSession(result);
      await initAuthenticated();
    } else {
      setAuthMessage('Acceso creado. Revisa el correo para confirmar la cuenta y después inicia sesión.', 'success');
    }
  } catch (error) {
    console.error(error);
    setAuthMessage('No se ha podido crear el acceso. Puede que la cuenta ya exista.', 'error');
  } finally {
    signupButton.disabled = false;
    signupButton.textContent = 'Crear acceso inicial';
  }
});

logoutButton?.addEventListener('click', async () => {
  try {
    if (session?.access_token) await fetch(`${config.url}/auth/v1/logout`, { method: 'POST', headers: { apikey: config.publishableKey, Authorization: `Bearer ${session.access_token}` } });
  } catch {}
  signOut();
});

function formatDate(value){
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function relativeDate(value){
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} d`;
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(new Date(value));
}

function filteredInquiries(){
  const query = String(searchInput?.value || '').trim().toLowerCase();
  const status = statusFilter?.value || 'all';
  const priority = priorityFilter?.value || 'all';
  const project = projectFilter?.value || 'all';
  return inquiries.filter(item => {
    const haystack = [item.name, item.company, item.email, item.phone, item.location, item.message].filter(Boolean).join(' ').toLowerCase();
    return (!query || haystack.includes(query))
      && (status === 'all' || item.status === status)
      && (priority === 'all' || item.priority === priority)
      && (project === 'all' || item.project_type === project);
  });
}

function renderStats(){
  $('[data-stat-total]').textContent = inquiries.filter(i => i.status !== 'archived').length;
  $('[data-stat-new]').textContent = inquiries.filter(i => i.status === 'new').length;
  $('[data-stat-followup]').textContent = inquiries.filter(i => ['contacted','qualified','quoted'].includes(i.status)).length;
  $('[data-stat-won]').textContent = inquiries.filter(i => i.status === 'won').length;
  if (newCount) newCount.textContent = inquiries.filter(i => i.status === 'new').length;
}

function renderList(){
  const visible = filteredInquiries();
  inquiryList.innerHTML = visible.map(item => `
    <article class="inquiry-row">
      <div class="person-cell"><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.company || item.email)}</span></div>
      <div class="project-cell">${escapeHTML(labels.project[item.project_type] || item.project_type || 'Sin definir')}<span>${escapeHTML(item.location || 'Sin localidad')}</span></div>
      <div class="status-cell"><span class="status-badge status-${escapeHTML(item.status)}">${escapeHTML(labels.status[item.status] || item.status)}</span></div>
      <div class="priority-cell"><span class="priority-badge priority-${escapeHTML(item.priority)}">${escapeHTML(labels.priority[item.priority] || item.priority)}</span></div>
      <div class="date-cell">${escapeHTML(relativeDate(item.created_at))}</div>
      <button class="row-open" type="button" aria-label="Abrir inquiry de ${escapeHTML(item.name)}" data-open-inquiry="${item.id}">→</button>
    </article>`).join('');
  empty.hidden = visible.length > 0;
  $$('[data-open-inquiry]', inquiryList).forEach(button => button.addEventListener('click', () => openDrawer(button.dataset.openInquiry)));
}

async function loadInquiries(){
  loading.hidden = false;
  empty.hidden = true;
  showError('');
  try {
    const data = await apiFetch('tyt_inquiries?select=*&order=created_at.desc');
    inquiries = Array.isArray(data) ? data : [];
    renderStats();
    renderList();
  } catch (error) {
    console.error(error);
    showError('No se han podido cargar las inquiries. Comprueba la conexión y vuelve a intentarlo.');
  } finally {
    loading.hidden = true;
  }
}

[searchInput, statusFilter, priorityFilter, projectFilter].forEach(control => control?.addEventListener('input', renderList));
refreshButton?.addEventListener('click', async () => {
  refreshButton.disabled = true;
  await loadInquiries();
  refreshButton.disabled = false;
});

function selectedInquiry(){ return inquiries.find(item => item.id === selectedInquiryId) || null; }

function setText(selector, value){ const element = $(selector); if (element) element.textContent = value || '—'; }

function openDrawer(id){
  selectedInquiryId = id;
  const item = selectedInquiry();
  if (!item) return;
  setText('[data-detail-name]', item.name);
  setText('[data-detail-company]', item.company || 'Particular');
  setText('[data-detail-email]', item.email);
  setText('[data-detail-phone]', item.phone || 'No indicado');
  setText('[data-detail-project]', labels.project[item.project_type] || item.project_type || 'Sin definir');
  setText('[data-detail-operation]', labels.operation[item.operation] || item.operation || 'Por definir');
  setText('[data-detail-location]', item.location || 'No indicada');
  setText('[data-detail-created]', formatDate(item.created_at));
  setText('[data-detail-message]', item.message || 'Sin detalles adicionales.');

  const statusBadge = $('[data-detail-status-badge]');
  statusBadge.textContent = labels.status[item.status] || item.status;
  statusBadge.className = `status-badge status-${item.status}`;
  const priorityBadge = $('[data-detail-priority-badge]');
  priorityBadge.textContent = labels.priority[item.priority] || item.priority;
  priorityBadge.className = `priority-badge priority-${item.priority}`;

  $('[data-edit-status]').value = item.status;
  $('[data-edit-priority]').value = item.priority;
  $('[data-edit-assigned]').value = item.assigned_to || '';
  $('[data-edit-notes]').value = item.internal_notes || '';
  $('[data-save-state]').textContent = item.updated_at ? `Última actualización: ${formatDate(item.updated_at)}` : '';

  drawer.classList.add('is-open');
  drawerBackdrop.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDrawer(){
  drawer?.classList.remove('is-open');
  drawerBackdrop?.classList.remove('is-open');
  drawer?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  selectedInquiryId = null;
}

closeDrawerButton?.addEventListener('click', closeDrawer);
drawerBackdrop?.addEventListener('click', closeDrawer);
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeDrawer(); sidebar?.classList.remove('is-open'); } });

async function updateInquiry(id, patch, successMessage = 'Cambios guardados.'){
  const saveState = $('[data-save-state]');
  if (saveState) saveState.textContent = 'Guardando…';
  try {
    const result = await apiFetch(`tyt_inquiries?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch)
    });
    const updated = result?.[0];
    if (updated) inquiries = inquiries.map(item => item.id === id ? updated : item);
    renderStats();
    renderList();
    if (saveState) saveState.textContent = successMessage;
    if (updated) openDrawer(id);
    return updated;
  } catch (error) {
    console.error(error);
    if (saveState) saveState.textContent = 'No se han podido guardar los cambios.';
    return null;
  }
}

$('[data-save-inquiry]')?.addEventListener('click', async () => {
  if (!selectedInquiryId) return;
  const status = $('[data-edit-status]').value;
  const previous = selectedInquiry();
  await updateInquiry(selectedInquiryId, {
    status,
    priority: $('[data-edit-priority]').value,
    assigned_to: $('[data-edit-assigned]').value.trim() || null,
    internal_notes: $('[data-edit-notes]').value.trim() || null,
    last_contacted_at: status === 'contacted' && previous?.status !== 'contacted' ? new Date().toISOString() : previous?.last_contacted_at
  });
});

$('[data-mark-contacted]')?.addEventListener('click', () => {
  if (!selectedInquiryId) return;
  updateInquiry(selectedInquiryId, { status: 'contacted', last_contacted_at: new Date().toISOString() }, 'Marcada como contactada.');
});

$('[data-archive]')?.addEventListener('click', () => {
  if (!selectedInquiryId) return;
  updateInquiry(selectedInquiryId, { status: 'archived' }, 'Inquiry archivada.');
});

$$('[data-copy-field]').forEach(button => button.addEventListener('click', async () => {
  const item = selectedInquiry();
  if (!item) return;
  const value = button.dataset.copyField === 'email' ? item.email : item.phone;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    const original = button.textContent;
    button.textContent = 'Copiado';
    setTimeout(() => button.textContent = original, 1200);
  } catch {}
}));

sidebarToggle?.addEventListener('click', () => sidebar?.classList.toggle('is-open'));

(async function boot(){
  if (!config.url || !config.publishableKey) {
    setAuthMessage('El backend del panel no está configurado.', 'error');
    return;
  }
  const stored = readSession();
  if (!stored?.access_token) return;
  saveSession(stored);
  await initAuthenticated();
})();
