/* THJP Enterprises — shared.js */

/* ─── MOBILE NAV ─── */
const burger = document.getElementById('nav-burger');
const mobileMenu = document.getElementById('mobile-menu');
if (burger && mobileMenu) {
  burger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => {
    if (!burger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
    }
  });
}

/* ─── ACTIVE NAV LINK ─── */
(function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#nav a[data-page], #mobile-menu a[data-page]').forEach(a => {
    if (a.dataset.page === page) a.classList.add('active');
  });
})();

/* ─── BACK TO TOP ─── */
const btt = document.getElementById('back-top');
if (btt) {
  window.addEventListener('scroll', () => btt.classList.toggle('visible', scrollY > 500));
  btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ─── SCROLL REVEAL ─── */
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  revealEls.forEach(el => io.observe(el));
}

/* ─── CONTACT FORM (mailto fallback) ─── */
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name    = form.querySelector('[name=name]')?.value    || '';
    const email   = form.querySelector('[name=email]')?.value   || '';
    const subject = form.querySelector('[name=subject]')?.value || 'THJP Enquiry';
    const msg     = form.querySelector('[name=message]')?.value || '';
    if (!name || !email) {
      alert('Please fill in your name and email address.');
      return;
    }
    const body = encodeURIComponent('Name: ' + name + '\nEmail: ' + email + '\n\n' + msg);
    window.location.href = 'mailto:info@thjpenterprises.com?subject=' + encodeURIComponent(subject) + '&body=' + body;
    const success = document.getElementById('form-success');
    if (success) { success.style.display = 'flex'; success.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });
}
