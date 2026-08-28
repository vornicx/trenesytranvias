const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const appScriptUrl = document.currentScript?.src || new URL('./app.js', window.location.href).href;
const assetUrl = file => new URL(file, appScriptUrl).href;

if (!document.querySelector('link[href$="pages.css"]')) {
  const coherenceStyles = document.createElement('link');
  coherenceStyles.rel = 'stylesheet';
  coherenceStyles.href = assetUrl('pages.css');
  document.head.appendChild(coherenceStyles);
}

if (!document.querySelector('link[data-archic-layer]')) {
  const archicStyles = document.createElement('link');
  archicStyles.rel = 'stylesheet';
  archicStyles.href = assetUrl('archic.css');
  archicStyles.dataset.archicLayer = 'true';
  document.head.appendChild(archicStyles);
}

if (document.body.classList.contains('internal-page') && !document.querySelector('link[data-industrial-layer]')) {
  const industrialStyles = document.createElement('link');
  industrialStyles.rel = 'stylesheet';
  industrialStyles.href = assetUrl('industrial-shared.css');
  industrialStyles.dataset.industrialLayer = 'true';
  document.head.appendChild(industrialStyles);
}

const header = $('[data-header]');
const menuButton = $('[data-menu-button]');
const mobileMenu = $('[data-mobile-menu]');

/* Management stays available, but it is intentionally kept out of the public navigation. */
$$('.desktop-nav .management-nav-link, .mobile-menu .management-nav-link').forEach(link => link.remove());

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

const revealNow = el => el.classList.add('is-visible');
const inView = el => {
  const rect = el.getBoundingClientRect();
  return rect.bottom > 48 && rect.top < window.innerHeight - 24;
};

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' })
  : null;

$$('.reveal').forEach(el => {
  if (!observer || inView(el)) revealNow(el);
  else observer.observe(el);
});

const footerBottom = $('.footer-bottom');
if (footerBottom) {
  const developmentLabel = [...footerBottom.querySelectorAll('span')]
    .find(span => span.textContent.trim() === 'Sitio web en desarrollo');
  if (developmentLabel) developmentLabel.textContent = 'Écija · Sevilla · Proyectos en España';

  if (!$('.management-access', footerBottom)) {
    const managementLink = document.createElement('a');
    managementLink.href = new URL('gestion', appScriptUrl).href;
    managementLink.className = 'management-access';
    managementLink.textContent = 'Acceso gestión';
    managementLink.setAttribute('aria-label', 'Abrir área privada de gestión');
    footerBottom.appendChild(managementLink);
  }
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
    `Localidad / provincia: ${value('location') || '—'}`,
    `Fechas aproximadas: ${value('dates') || 'Por definir'}`,
    `Recorrido / zona: ${value('route') || 'Por definir'}`,
    `Proyecto: ${labels[value('project')] || value('project') || '—'}`,
    `Modalidad: ${labels[value('operation')] || 'Por definir'}`,
    '',
    'Contexto adicional:',
    value('message') || '—',
    '',
    `Nombre: ${value('name')}`,
    `Empresa / entidad: ${value('company') || '—'}`,
    `Email: ${value('email')}`,
    `Teléfono: ${value('phone') || '—'}`
  ].join('\n');
}

async function persistInquiry(data){
  const config = window.TYT_SUPABASE;
  if (!config?.url || !config?.publishableKey) throw new Error('backend_not_configured');
  const value = key => String(data.get(key) || '').trim();
  const messageParts = [
    value('dates') ? `Fechas aproximadas: ${value('dates')}` : '',
    value('route') ? `Recorrido / zona: ${value('route')}` : '',
    value('message') ? `Contexto adicional: ${value('message')}` : ''
  ].filter(Boolean);
  const payload = {
    name: value('name'),
    company: value('company') || null,
    email: value('email'),
    phone: value('phone') || null,
    project_type: value('project') || null,
    operation: value('operation') || null,
    location: value('location') || null,
    message: messageParts.join('\n\n') || null,
    source: 'website',
    status: 'new',
    priority: 'normal'
  };

  const response = await fetch(`${config.url}/rest/v1/tyt_inquiries`, {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${config.publishableKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('Inquiry submission failed', response.status, details);
    throw new Error('submission_failed');
  }
  return true;
}

contactForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (formStatus) {
    formStatus.textContent = '';
    formStatus.classList.remove('is-ok');
  }

  const data = new FormData(contactForm);
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const location = String(data.get('location') || '').trim();
  const project = String(data.get('project') || '').trim();
  const privacy = data.get('privacy');
  const honeypot = String(data.get('website') || '').trim();

  if (honeypot) return;
  if (!location || !project || !name || !email || !/^\S+@\S+\.\S+$/.test(email) || !privacy) {
    if (formStatus) formStatus.textContent = 'Completa localidad, tipo de proyecto, nombre, email y aceptación antes de enviar.';
    const firstMissing = !location ? contactForm.querySelector('[name="location"]')
      : !project ? contactForm.querySelector('[name="project"]')
      : !name ? contactForm.querySelector('[name="name"]')
      : (!email || !/^\S+@\S+\.\S+$/.test(email)) ? contactForm.querySelector('[name="email"]')
      : contactForm.querySelector('[name="privacy"]');
    firstMissing?.focus();
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
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      contactSuccess.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  } catch (error) {
    console.error(error);
    if (error?.message === 'backend_not_configured') {
      if (formStatus) formStatus.textContent = 'El formulario no está configurado todavía. Vuelve a intentarlo más tarde.';
    } else if (formStatus) {
      formStatus.textContent = 'No hemos podido registrar la solicitud. Inténtalo de nuevo en unos segundos.';
    }
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
