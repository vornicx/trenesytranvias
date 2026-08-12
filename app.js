const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

if (!document.querySelector('link[href$="pages.css"]')) {
  const coherenceStyles = document.createElement('link');
  coherenceStyles.rel = 'stylesheet';
  coherenceStyles.href = './pages.css';
  document.head.appendChild(coherenceStyles);
}

const header = $('[data-header]');
const menuButton = $('[data-menu-button]');
const mobileMenu = $('[data-mobile-menu]');

const desktopNav = $('.desktop-nav');
if (desktopNav && !$('.management-nav-link', desktopNav)) {
  const managementNavLink = document.createElement('a');
  managementNavLink.href = './gestion';
  managementNavLink.className = 'management-nav-link';
  managementNavLink.textContent = 'Gestión';
  managementNavLink.setAttribute('aria-label', 'Abrir área privada de gestión');
  desktopNav.appendChild(managementNavLink);
}

const mobileNav = $('.mobile-menu nav');
if (mobileNav && !$('.management-nav-link', mobileNav)) {
  const managementMobileLink = document.createElement('a');
  managementMobileLink.href = './gestion';
  managementMobileLink.className = 'management-nav-link';
  managementMobileLink.textContent = 'Área de gestión';
  managementMobileLink.setAttribute('aria-label', 'Abrir área privada de gestión');
  mobileNav.appendChild(managementMobileLink);
}

const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 22);
syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

function closeMenu(){
  if (!mobileMenu || !menuButton) return;
  mobileMenu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
}

menuButton?.addEventListener('click', () => {
  const willOpen = mobileMenu.hidden;
  mobileMenu.hidden = !willOpen;
  menuButton.setAttribute('aria-expanded', String(willOpen));
});

$$('.mobile-menu a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px' })
  : null;

$$('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('is-visible'));

const footerBottom = $('.footer-bottom');
if (footerBottom && !$('.management-access', footerBottom)) {
  const managementLink = document.createElement('a');
  managementLink.href = './gestion';
  managementLink.className = 'management-access';
  managementLink.textContent = 'Área de gestión';
  managementLink.setAttribute('aria-label', 'Abrir área privada de gestión');
  footerBottom.appendChild(managementLink);
}

const contactForm = $('[data-contact-form]');
const contactSuccess = $('[data-contact-success]');
const formStatus = $('[data-form-status]');
const requestSummary = $('[data-request-summary]');
const projectSelect = $('[data-project-select]');
const copyButton = $('[data-copy-request]');
const contactSubmit = $('[data-contact-submit]');

if (projectSelect) {
  const requestedProject = new URLSearchParams(window.location.search).get('proyecto');
  if (requestedProject && [...projectSelect.options].some(option => option.value === requestedProject)) {
    projectSelect.value = requestedProject;
  }
}

function buildRequestSummary(data){
  const labels = {
    turismo: 'Turismo y ciudad', eventos: 'Ferias y eventos', recintos: 'Empresas y recintos',
    tren: 'Tren turístico', tranvia: 'Tranvía turístico', otro: 'Otro',
    alquiler: 'Alquiler', compra: 'Compra', fabricacion: 'Fabricación / proyecto especial'
  };
  const value = key => String(data.get(key) || '').trim();
  return [
    'SOLICITUD · TRENES Y TRANVÍAS CIUDAD DEL SOL',
    '',
    `Nombre: ${value('name')}`,
    `Empresa / entidad: ${value('company') || '—'}`,
    `Email: ${value('email')}`,
    `Teléfono: ${value('phone') || '—'}`,
    `Proyecto: ${labels[value('project')] || value('project') || '—'}`,
    `Modalidad: ${labels[value('operation')] || 'Por definir'}`,
    `Localidad / provincia: ${value('location') || '—'}`,
    '',
    'Necesidad:',
    value('message') || '—'
  ].join('\n');
}

async function persistInquiry(data){
  const config = window.TYT_SUPABASE;
  if (!config?.url || !config?.publishableKey) throw new Error('backend_not_configured');
  const value = key => String(data.get(key) || '').trim();
  const payload = {
    name: value('name'),
    company: value('company') || null,
    email: value('email'),
    phone: value('phone') || null,
    project_type: value('project') || null,
    operation: value('operation') || null,
    location: value('location') || null,
    message: value('message') || null,
    source: 'website',
    status: 'new'
  };

  const response = await fetch(`${config.url}/rest/v1/tyt_inquiries`, {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('Inquiry submission failed', response.status, details);
    throw new Error('submission_failed');
  }
  return response.json();
}

contactForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (formStatus) formStatus.textContent = '';

  const data = new FormData(contactForm);
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const privacy = data.get('privacy');
  const honeypot = String(data.get('website') || '').trim();

  if (honeypot) return;
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email) || !privacy) {
    if (formStatus) formStatus.textContent = 'Revisa nombre, email y aceptación antes de continuar.';
    return;
  }

  contactSubmit?.setAttribute('disabled', '');
  if (contactSubmit) contactSubmit.textContent = 'Enviando…';
  if (formStatus) formStatus.textContent = 'Registrando la solicitud…';

  try {
    await persistInquiry(data);
    const summary = buildRequestSummary(data);
    if (requestSummary) requestSummary.value = summary;
    contactForm.hidden = true;
    if (contactSuccess) {
      contactSuccess.hidden = false;
      contactSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch (error) {
    console.error(error);
    if (formStatus) formStatus.textContent = 'No hemos podido registrar la solicitud. Inténtalo de nuevo en unos segundos.';
    contactSubmit?.removeAttribute('disabled');
    if (contactSubmit) contactSubmit.textContent = 'Enviar solicitud →';
  }
});

copyButton?.addEventListener('click', async () => {
  const text = requestSummary?.value || '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = 'Resumen copiado';
  } catch {
    requestSummary?.focus();
    requestSummary?.select();
    copyButton.textContent = 'Seleccionado para copiar';
  }
});
