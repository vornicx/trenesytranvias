const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const header = $('[data-header]');
const menuButton = $('[data-menu-button]');
const mobileMenu = $('[data-mobile-menu]');
const modal = $('[data-quote-modal]');
const projectSelect = $('[data-project-select]');
const form = $('[data-quote-form]');
const success = $('[data-quote-success]');
const formError = $('[data-form-error]');
let lastFocused = null;

const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 22);
syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

function closeMenu(){
  if (!mobileMenu || !menuButton) return;
  mobileMenu.hidden = true;
  menuButton.setAttribute('aria-expanded','false');
}
menuButton?.addEventListener('click', () => {
  const willOpen = mobileMenu.hidden;
  mobileMenu.hidden = !willOpen;
  menuButton.setAttribute('aria-expanded', String(willOpen));
});
$$('.mobile-menu a').forEach(a => a.addEventListener('click', closeMenu));

function openQuote(trigger){
  if (!modal) return;
  lastFocused = trigger || document.activeElement;
  const project = trigger?.dataset?.project;
  if (project && projectSelect) projectSelect.value = project;
  form.hidden = false;
  success.hidden = true;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  setTimeout(() => $('.quote-panel input', modal)?.focus(), 220);
}
function closeQuote(){
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
  lastFocused?.focus?.();
}
$$('[data-open-quote]').forEach(btn => btn.addEventListener('click', () => openQuote(btn)));
$$('[data-close-quote]').forEach(btn => btn.addEventListener('click', closeQuote));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeQuote(); closeMenu(); } });

form?.addEventListener('submit', e => {
  e.preventDefault();
  formError.textContent = '';
  const data = new FormData(form);
  const email = String(data.get('email') || '').trim();
  const name = String(data.get('name') || '').trim();
  const privacy = data.get('privacy');
  if (!name || !email || !email.includes('@') || !privacy) {
    formError.textContent = 'Revisa nombre, email y aceptación de privacidad antes de continuar.';
    return;
  }
  const payload = Object.fromEntries(data.entries());
  localStorage.setItem('ciudadDelSolQuoteDraft', JSON.stringify({ ...payload, createdAt: new Date().toISOString() }));
  form.hidden = true;
  success.hidden = false;
});

const tabs = $$('.vehicle-tab');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected','false'); });
  tab.classList.add('is-active'); tab.setAttribute('aria-selected','true');
  const filter = tab.dataset.filter;
  $$('[data-tags]').forEach(card => {
    const match = filter === 'all' || card.dataset.tags.split(' ').includes(filter);
    card.classList.toggle('is-hidden', !match);
  });
}));

const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
}, { threshold: .12, rootMargin: '0px 0px -40px' }) : null;
$$('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('is-visible'));
