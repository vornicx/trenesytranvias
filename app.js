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

const contactForm = $('[data-contact-form]');
const contactSuccess = $('[data-contact-success]');
const formStatus = $('[data-form-status]');
const requestSummary = $('[data-request-summary]');
const projectSelect = $('[data-project-select]');
const copyButton = $('[data-copy-request]');

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

contactForm?.addEventListener('submit', event => {
  event.preventDefault();
  if (formStatus) formStatus.textContent = '';

  const data = new FormData(contactForm);
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const privacy = data.get('privacy');

  if (!name || !email || !email.includes('@') || !privacy) {
    if (formStatus) formStatus.textContent = 'Revisa nombre, email y aceptación antes de continuar.';
    return;
  }

  const summary = buildRequestSummary(data);
  localStorage.setItem('ciudadDelSolQuoteDraft', JSON.stringify({ summary, createdAt: new Date().toISOString() }));
  if (requestSummary) requestSummary.value = summary;
  contactForm.hidden = true;
  if (contactSuccess) {
    contactSuccess.hidden = false;
    contactSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

copyButton?.addEventListener('click', async () => {
  const text = requestSummary?.value || '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = 'Solicitud copiada';
  } catch {
    requestSummary?.focus();
    requestSummary?.select();
    copyButton.textContent = 'Seleccionado para copiar';
  }
});
