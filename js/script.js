/* ========================================
   BOOTHDROP ENTERTAINMENT — script.js
   Loaded with `defer` on every page. Every feature is guarded so the
   script works on pages where the markup is absent. No inline handlers.
   ======================================== */
(function () {
  'use strict';

  /* ── Non-blocking web font CSS (link is loaded with media="print") ── */
  function activateFontCss() {
    document.querySelectorAll('link[data-font-css]').forEach(function (link) {
      link.media = 'all';
    });
  }

  /* ── Sticky nav + mobile menu ── */
  function initNav() {
    var navbar = document.getElementById('navbar');
    var hamburger = document.getElementById('hamburger');
    var navLinks = document.getElementById('navLinks');
    if (!navbar) return;

    var onScroll = function () {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (!hamburger || !navLinks) return;

    function setOpen(open) {
      hamburger.classList.toggle('active', open);
      navLinks.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    hamburger.addEventListener('click', function () {
      setOpen(!navLinks.classList.contains('open'));
    });
    navLinks.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navLinks.classList.contains('open')) {
        setOpen(false);
        hamburger.focus();
      }
    });
  }

  /* ── Scroll reveal (progressive enhancement; content is visible without JS) ── */
  function initScrollReveal() {
    var revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('js-on');

    // Safety net: anything near the viewport is shown after a short delay even
    // if the observer has not fired (e.g. after an anchor jump).
    function revealNearViewport() {
      var limit = window.innerHeight * 1.5;
      revealEls.forEach(function (el) {
        if (el.getBoundingClientRect().top < limit) el.classList.add('visible');
      });
    }
    setTimeout(revealNearViewport, 1000);
    window.addEventListener('load', revealNearViewport);
    window.addEventListener('hashchange', function () { setTimeout(revealNearViewport, 300); });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = ((i % 3) * 0.08) + 's';
      observer.observe(el);
    });
  }

  /* ── Testimonials carousel (home page) ── */
  function initCarousel() {
    var track = document.getElementById('testimonialsTrack');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    var dotsContainer = document.getElementById('carouselDots');
    if (!track || !prevBtn || !nextBtn || !dotsContainer) return;

    var cards = track.querySelectorAll('.testimonial-card');
    var total = cards.length;
    if (!total) return;
    var current = 0;
    var autoTimer = null;

    var perPage = function () { return window.innerWidth < 768 ? 1 : window.innerWidth < 992 ? 2 : 3; };
    var pages = function () { return Math.ceil(total / perPage()); };

    function buildDots() {
      dotsContainer.textContent = '';
      for (var i = 0; i < pages(); i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'dot' + (i === current ? ' active' : '');
        dot.setAttribute('aria-label', 'Go to review page ' + (i + 1));
        dot.dataset.index = String(i);
        dotsContainer.appendChild(dot);
      }
    }

    function goTo(index) {
      current = Math.max(0, Math.min(index, pages() - 1));
      var per = perPage();
      var width = track.parentElement.offsetWidth;
      var gap = parseFloat(getComputedStyle(track).gap) || 24;
      track.style.transform = 'translateX(-' + (current * (width / per + gap) * per) + 'px)';
      dotsContainer.querySelectorAll('.dot').forEach(function (d, i) { d.classList.toggle('active', i === current); });
      resetAuto();
    }

    function next() { goTo(current + 1 >= pages() ? 0 : current + 1); }
    function prev() { goTo(current - 1 < 0 ? pages() - 1 : current - 1); }
    function resetAuto() { clearInterval(autoTimer); autoTimer = setInterval(next, 6000); }

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    dotsContainer.addEventListener('click', function (event) {
      var dot = event.target.closest('.dot');
      if (dot) goTo(Number(dot.dataset.index));
    });
    track.addEventListener('mouseenter', function () { clearInterval(autoTimer); });
    track.addEventListener('mouseleave', resetAuto);

    var touchStartX = 0;
    track.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { if (diff > 0) next(); else prev(); }
    }, { passive: true });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { buildDots(); goTo(0); }, 150);
    });

    buildDots();
    resetAuto();
  }

  /* ── Enquiry form: FormSubmit (activated hashed endpoint) ──
     Progressive enhancement over a plain POST. With JS we submit the form's own
     fields via fetch to the AJAX endpoint and show an inline success/error state;
     if the request fails for any reason we fall back to the native POST so the
     enquiry is never lost. Without JS the form posts natively and FormSubmit
     redirects to the _next page. */
  function initEnquiryForm() {
    var form = document.getElementById('enquiryForm');
    if (!form) return;
    var button = document.getElementById('enquirySubmitBtn');
    var status = document.getElementById('formStatus');
    var handler = form.dataset.handler;
    var whatsapp = form.dataset.whatsapp;
    if (!handler || !window.fetch || !window.FormData) return; // native POST fallback

    function setStatus(message, isError) {
      if (!status) return;
      status.textContent = message;
      status.classList.toggle('is-error', Boolean(isError));
      status.classList.toggle('is-success', !isError && Boolean(message));
    }

    function fieldValue(name) {
      var field = form.elements[name];
      return field && typeof field.value === 'string' ? field.value.trim() : '';
    }

    var nativeFallbackArmed = false;

    form.addEventListener('submit', function (event) {
      if (nativeFallbackArmed) return; // let the browser POST natively
      event.preventDefault();
      if (fieldValue('_honey')) return; // bot
      if (!form.checkValidity()) {
        form.reportValidity();
        setStatus('Please check the highlighted fields.', true);
        return;
      }

      var payload = new FormData(form);
      var summary = {
        booth: fieldValue('booth') || 'Not sure yet',
        name: fieldValue('name'),
        phone: fieldValue('phone'),
        email: fieldValue('email'),
        date: fieldValue('event_date') || 'Not given',
        type: fieldValue('event_type'),
        postcode: fieldValue('postcode') || 'Not given',
        notes: fieldValue('notes') || 'None'
      };

      var originalLabel = button ? button.textContent : '';
      if (button) { button.disabled = true; button.textContent = 'Sending\u2026'; }
      setStatus('');

      fetch(handler, { method: 'POST', body: payload, headers: { Accept: 'application/json' } })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            if (!response.ok || (data && data.success === 'false')) {
              throw new Error((data && data.message) || ('Form service responded ' + response.status));
            }
            return data;
          });
        })
        .then(function () {
          setStatus('Thank you! Your enquiry has been sent. We reply within 24 hours.', false);
          form.reset();
          if (whatsapp) {
            var text = 'New enquiry from boothdrop.co.uk\n' +
              'Booth: ' + summary.booth + '\n' +
              'Name: ' + summary.name + '\n' +
              'Phone: ' + summary.phone + '\n' +
              'Email: ' + summary.email + '\n' +
              'Date: ' + summary.date + '\n' +
              'Event: ' + summary.type + '\n' +
              'Postcode: ' + summary.postcode + '\n' +
              'Notes: ' + summary.notes;
            var link = document.createElement('a');
            link.href = whatsapp + '?text=' + encodeURIComponent(text);
            link.textContent = 'Send the same details to us on WhatsApp';
            link.target = '_blank';
            link.rel = 'noopener';
            link.className = 'form-whatsapp-link';
            if (status) { status.appendChild(document.createTextNode(' ')); status.appendChild(link); }
          }
          if (button) { button.disabled = false; button.textContent = originalLabel; }
        })
        .catch(function () {
          // Network or service failure: hand over to a normal POST so the lead still arrives.
          setStatus('One moment, sending your enquiry another way\u2026', false);
          nativeFallbackArmed = true;
          if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit();
        });
    });
  }

  function init() {
    activateFontCss();
    initNav();
    initScrollReveal();
    initCarousel();
    initEnquiryForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
