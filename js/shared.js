/* THJP Enterprises — shared.js (no dependencies) */
(function () {
  'use strict';

  /* Header: solid background once scrolled */
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (header) header.classList.toggle('scrolled', open || window.scrollY > 24);
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
      });
    });
  }

  /* Active nav link */
  var page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-page]').forEach(function (a) {
    if (a.getAttribute('data-page') === page) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
  });

  /* Scroll reveal */
  var els = document.querySelectorAll('.reveal, .chain');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('visible'); });
  }

  /* Count-up numbers: <b data-count="100">0</b> */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, end = parseFloat(el.getAttribute('data-count')), t0 = null, dur = 1400;
        var suffix = el.querySelector('small'); var sfx = suffix ? suffix.outerHTML : '';
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
          el.innerHTML = v + sfx;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        cio.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* Broken images: hide gracefully, keep the styled placeholder */
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    function hide() { img.style.display = 'none'; }
    if (img.complete && img.naturalWidth === 0) hide();
    img.addEventListener('error', hide);
  });

  /* Contact form
     - If the form has an action (e.g. Formspree), submit via fetch.
     - Otherwise fall back to opening the visitor's email app. */
  var form = document.getElementById('contact-form');
  if (form) {
    var params = new URLSearchParams(location.search);
    var preset = params.get('type');
    if (preset) {
      var r = form.querySelector('input[name="enquiry_type"][value="' + preset + '"]');
      if (r) r.checked = true;
    }
    var okBox = document.getElementById('form-success');
    var errBox = document.getElementById('form-error');
    var btn = form.querySelector('button[type="submit"]');
    var btnHTML = btn ? btn.innerHTML : '';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      okBox.classList.remove('show'); errBox.classList.remove('show');
      if (!form.reportValidity()) return;
      var data = new FormData(form);
      if (data.get('_honey')) return; // bot
      var labels = { retailer: 'Stockist application', brand: 'Brand distribution', wholesale: 'Existing account', general: 'General enquiry' };
      data.set('_subject', 'Website enquiry — ' + (labels[data.get('enquiry_type')] || 'General') + ' — ' + (data.get('company') || ''));
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      fetch(form.getAttribute('action'), { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, j: j }; }); })
        .then(function (r) {
          if (!r.ok || String(r.j.success) === 'false') throw new Error(r.j.message || 'Failed');
          form.reset(); okBox.classList.add('show'); okBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        })
        .catch(function () { errBox.classList.add('show'); })
        .then(function () { if (btn) { btn.disabled = false; btn.innerHTML = btnHTML; } });
    });
  }

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });
})();
