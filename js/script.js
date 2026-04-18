/* ========================================
   BOOTHDROP ENTERTAINMENT — script.js
   ======================================== */

/* ── Booth Modal Data (from boothdrop.co.uk) ── */
const boothData = {
  slimpod: {
    name: 'LCD SlimPod',
    tag: 'Most Popular',
    desc: 'Make your event unforgettable with our LCD SlimPod iPad Photo Booth! For an affordable price, you\'ll get 2 high-quality prints per session, plus instant digital sharing to keep the memories going long after the event. Our packages include unlimited sessions, stick props for added fun, and a guest book where you and your guests can leave personalised messages alongside their photos. We also provide email sharing so guests can send their photos directly to their inboxes, and free delivery and setup, so you don\'t have to worry about a thing. Smart background removal also included so you do not have to worry about your venue background.',
    includes: [
      '2 Prints Per Session', 'Unlimited Sessions', 'Guest Book & Glue Sticks',
      'Stick Props', 'Free Delivery & Setup', 'Email Sharing',
      'Smart Background Removal', 'Customisable Text & Logo', 'Virtual Props & Filters',
      'Touch Screen Interface', 'GIFs & Boomerangs', 'Digital Sharing'
    ]
  },
  selfie: {
    name: 'Selfie Mirror Pod',
    tag: 'Fan Favourite',
    desc: 'Elevate your event with our Selfie Mirror Pod, featuring a sleek half mirror screen that creates an interactive, elegant experience for your guests. Equipped with a professional DSLR camera, this booth delivers high-quality photos every time. Your guests will enjoy unlimited sessions and instant prints, ensuring they take home a beautiful keepsake from your special event. Each package includes a guest book, so your guests can leave personal messages alongside their photos, adding an extra touch of sentiment to the memories they create. Whether it\'s a wedding, corporate event, or any celebration, our Selfie Mirror Pod will provide fun, luxury, and lasting memories.',
    includes: [
      'Guest Book & Glue Sticks', 'Prints for Each Guest', 'Unlimited Sessions',
      'Booth Attendant', 'USB for Digital Copies', 'Email Sharing',
      'Personalised Templates & Logos', 'GIFs & Filters', 'Social Media Sharing',
      'Huge Selection of Props', 'Professional DSLR Camera', 'Instant Prints'
    ]
  },
  retro: {
    name: 'Retro Pod',
    tag: 'Classic Charm',
    desc: 'Streamline your event with our Retro Pod, featuring an inbuilt printer for instant, high-quality prints with no need for bulky external setups. This innovative design reduces visible cables, keeping your venue clean and clutter-free while still offering unlimited sessions and instant prints for each guest. Running on a standard DSLR camera, you can expect crisp, professional photos that your guests will love. Every session also comes with a guest book where guests can leave messages and photos for a personal touch. Perfect for weddings, parties and corporate events.',
    includes: [
      'Guest Book & Glue Sticks', 'Prints for Each Guest', 'Unlimited Sessions',
      'Booth Attendant', 'USB for Digital Copies', 'Email Sharing',
      'Personalised Templates & Logos', 'GIFs & Filters', 'Social Media Sharing',
      'Huge Selection of Props', 'Inbuilt Printer', 'Minimal Cables Setup'
    ]
  },
  magic: {
    name: 'Magic Mirror',
    tag: 'Wedding Favourite',
    desc: 'Step into the future of photo booths with our Big Magic Mirror Photo Booth! Featuring a stunning full-length mirror display, this booth is perfect for capturing your guests in their best light. Powered by a professional DSLR camera, it guarantees high-quality photos for every shot. Your guests can enjoy unlimited sessions and receive instant prints to take home as a keepsake. Plus, our booth includes a guest book, so every photo becomes a personal memento with fun messages from your guests. Whether it\'s a wedding, birthday party, or corporate event, our Magic Mirror adds a touch of glamour and fun to any occasion.',
    includes: [
      'Guest Book & Glue Sticks', 'Prints for Each Guest', 'Unlimited Sessions',
      'Booth Attendant', 'USB for Digital Copies', 'Email Sharing',
      'Personalised Templates & Logos', 'GIFs & Filters', 'Social Media Sharing',
      'Huge Selection of Props', 'Full-Length Mirror Display', 'Professional DSLR Camera'
    ]
  },
  party: {
    name: 'Party Booth',
    tag: 'Up to 8 People',
    desc: 'Give your guests the ultimate photo experience with our Enclosed Party Booth! Perfect for those who want a little more privacy, this booth offers a cosy, intimate space where up to 8 people can join in for a fun photo session. Whether it\'s a group of friends or a family, everyone can fit comfortably while enjoying the privacy to let loose and capture memorable moments. With its sleek, modern design, our Enclosed Party Booth ensures a seamless experience, and each session comes with instant prints for guests to take home. Whether it\'s a wedding, party, or corporate event, our booth adds an extra layer of fun and keeps the memories private and personal.',
    includes: [
      'Guest Book & Glue Sticks', '2 Prints Per Session', 'Unlimited Sessions',
      'Set Up & Pack Down', 'Email Sharing', 'Personalised Templates & Logos',
      'GIFs & Filters', 'Social Media Sharing', 'Stick Props',
      'Private Enclosed Space', 'Up to 8 People', 'Sleek Modern Design'
    ]
  },
  inflatable: {
    name: 'Inflatable Booth',
    tag: 'Up to 10 People',
    desc: 'Add a unique and exciting touch to your event with our Inflatable Photo Booth! This spacious booth offers privacy for your guests while allowing up to 10 people to capture fun, unforgettable moments together. Perfect for large groups, it provides the perfect setting for everyone to let loose and have a great time. What makes this booth even more special is that your clients can choose the colour of the inflatable to match the theme of their event, creating a personalised, vibrant experience. Whether it\'s a wedding, birthday party, or corporate gathering, our Inflatable Photo Booth is sure to be a hit!',
    includes: [
      'Guest Book & Glue Sticks', 'Prints for Each Guest', 'Unlimited Sessions',
      'Booth Attendant', 'USB for Digital Copies', 'Email Sharing',
      'Personalised Templates & Logos', 'GIFs & Filters', 'Social Media Sharing',
      'Huge Selection of Props', 'Up to 10 People', 'Custom Colour Choice'
    ]
  },
  gif: {
    name: 'GIF Booth',
    tag: 'Social Media Ready',
    desc: 'Perfect for weddings, parties, corporate events, and brand activations, our GIF Booth delivers high-quality photos, fun GIFs, boomerangs, and instant sharing via email. With a user-friendly touch screen, customisable text and logo, and a wide range of virtual props and filters, guests of all ages can strike a pose and create memories in seconds. No prints, no fuss — just digital magic that keeps the fun going long after the event ends. Smart background removal also included so you do not have to worry about your venue background.',
    includes: [
      'Animated GIF Creation', 'Boomerang Mode', 'Instant Digital Delivery',
      'Social Media Ready Files', 'Custom GIF Overlay', 'QR Code Sharing',
      'Email Delivery', 'Professional Attendant', 'Custom Backdrop',
      'Virtual Props & Filters', 'Smart Background Removal', 'Unlimited GIFs'
    ]
  }
};

/* ── DOM Ready ── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initBoothCards();
  initModal();
  initCarousel();
  initScrollReveal();
  initFooterBoothLinks();
  initGalleryFilter();
});

/* ── Sticky Nav ── */
function initNav() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ── Booth Cards → now linked to pages, no modal needed ── */
function initBoothCards() {
  // Booth cards are now <a> tags linking to detail pages — no action needed
}

/* ── Modal (kept for backward compat, safely guarded) ── */
function initModal() {
  const backdrop = document.getElementById('modalBackdrop');
  const closeBtn = document.getElementById('modalClose');
  if (!backdrop || !closeBtn) return; // modal HTML removed — skip safely

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(key) {
  const data = boothData[key];
  if (!data) return;

  const content = document.getElementById('modalContent');
  content.innerHTML = `
    <div class="modal-header">
      <h2>${data.name}</h2>
      ${data.tag ? `<span class="modal-tag">${data.tag}</span>` : ''}
    </div>
    <p class="modal-desc">${data.desc}</p>
    <div class="modal-includes">
      <h4>What's Included</h4>
      <div class="modal-includes-grid">
        ${data.includes.map(item => `<div class="modal-inc-item">${item}</div>`).join('')}
      </div>
    </div>
    <div class="modal-cta">
      <a href="#booking" class="btn-primary" onclick="closeModal()">Book This Booth</a>
      <a href="tel:07368631516" class="btn-secondary">Call Us</a>
    </div>
  `;

  document.getElementById('modalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

window.closeModal = closeModal;

/* ── Testimonials Carousel ── */
function initCarousel() {
  const track = document.getElementById('testimonialsTrack');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const dotsContainer = document.getElementById('carouselDots');

  if (!track) return;

  const cards = track.querySelectorAll('.testimonial-card');
  const total = cards.length;
  let current = 0;
  let autoTimer;

  const getPerPage = () => window.innerWidth < 768 ? 1 : window.innerWidth < 992 ? 2 : 3;

  function getPages() { return Math.ceil(total / getPerPage()); }

  function buildDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < getPages(); i++) {
      const dot = document.createElement('button');
      dot.className = 'dot' + (i === current ? ' active' : '');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }
  }

  function goTo(idx) {
    const pages = getPages();
    current = Math.max(0, Math.min(idx, pages - 1));
    const perPage = getPerPage();
    const cardWidth = track.parentElement.offsetWidth;
    const gap = parseFloat(getComputedStyle(track).gap) || 24;
    const offset = current * (cardWidth / perPage + gap) * perPage;
    track.style.transform = `translateX(-${offset}px)`;

    dotsContainer.querySelectorAll('.dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
    resetAuto();
  }

  function next() { goTo(current + 1 >= getPages() ? 0 : current + 1); }
  function prev() { goTo(current - 1 < 0 ? getPages() - 1 : current - 1); }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(next, 5000);
  }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  // Touch/swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
  }, { passive: true });

  window.addEventListener('resize', () => { buildDots(); goTo(0); });

  buildDots();
  resetAuto();
}

/* ── Scroll Reveal ── */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 0.1}s`;
    observer.observe(el);
  });
}

/* ── Footer Booth Links ── */
function initFooterBoothLinks() {
  document.querySelectorAll('[data-open]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const key = link.dataset.open;
      setTimeout(() => openModal(key), 300);
    });
  });
}

/* ── Set selected booth from radio picker ── */
function setCqBooth(value) {
  document.getElementById('enquiryBooth').value = value;
}
window.setCqBooth = setCqBooth;

/* ── Enquiry Form Submit ── */
function submitEnquiry(e) {
  e.preventDefault();
  const btn     = document.getElementById('enquirySubmitBtn');
  const success = document.getElementById('formSuccess');
  const form    = document.getElementById('enquiryForm');

  const booth     = document.getElementById('enquiryBooth').value || 'Not specified';
  const firstName = (document.getElementById('cqFirstName')  || {}).value || '';
  const lastName  = (document.getElementById('cqLastName')   || {}).value || '';
  const email     = (document.getElementById('cqEmail')      || {}).value || '';
  const phone     = (document.getElementById('cqTel')        || {}).value || '';
  const date      = (document.getElementById('cqDate')       || {}).value || '';
  const eventType = (document.getElementById('cqEventType')  || {}).value || '';
  const startTime = (document.getElementById('cqStartTime')  || {}).value || '';
  const endTime   = (document.getElementById('cqEndTime')    || {}).value || '';
  const postcode  = (document.getElementById('cqPostcode')   || {}).value || '';
  const notes     = (document.getElementById('cqNotes')      || {}).value || '';

  btn.textContent = 'Sending\u2026';
  btn.disabled = true;

  // 1. Send email via FormSubmit.co (free, no backend needed)
  const emailData = new FormData();
  emailData.append('_subject', '\uD83C\uDF89 New Booth Enquiry \u2014 ' + booth + ' | Boothdrop');
  emailData.append('_template', 'table');
  emailData.append('_captcha', 'false');
  emailData.append('Booth',       booth);
  emailData.append('Name',        firstName + ' ' + lastName);
  emailData.append('Email',       email);
  emailData.append('Phone',       phone);
  emailData.append('Date',        date);
  emailData.append('Event_Type',  eventType);
  emailData.append('Time',        startTime + ' \u2013 ' + endTime);
  emailData.append('Postcode',    postcode);
  emailData.append('Notes',       notes || 'None');

  fetch('https://formsubmit.co/ajax/info.boothdrop@boothdrop.co.uk', {
    method: 'POST',
    body: emailData,
    headers: { 'Accept': 'application/json' }
  }).catch(function() {}); // silently handle network errors

  // 2. Open WhatsApp with the same details
  const waText = encodeURIComponent(
    'New Enquiry from Website!\n\nBooth: ' + booth +
    '\nName: ' + firstName + ' ' + lastName +
    '\nEmail: ' + email +
    '\nPhone: ' + phone +
    '\nDate: ' + date +
    '\nEvent Type: ' + eventType +
    '\nTime: ' + startTime + ' \u2013 ' + endTime +
    '\nPostcode: ' + postcode +
    '\n\nNotes: ' + (notes || 'None')
  );

  setTimeout(function() {
    success.style.display = 'block';
    form.reset();
    btn.textContent = 'Send Enquiry \u2709\uFE0F';
    btn.disabled = false;
    window.open('https://wa.me/447368631516?text=' + waText, '_blank');
  }, 800);
}

window.submitEnquiry = submitEnquiry;


/* ── Gallery Filter ── */
function initGalleryFilter() {
  const filterBtns = document.querySelectorAll('.gallery-filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      galleryItems.forEach(item => {
        const cat = item.dataset.cat;
        const show = filter === 'all' || cat === filter;

        if (show) {
          item.classList.remove('hidden');
          item.classList.add('fade-in');
          setTimeout(() => item.classList.remove('fade-in'), 500);
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });
}

/* ── Scroll Reveal ── */
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  // Tell CSS that JS is working — only then will elements be hidden for animation
  document.documentElement.classList.add('js-on');

  // Emergency fallback: if IntersectionObserver fails or is slow, show everything after 800ms
  const emergencyTimer = setTimeout(() => {
    revealEls.forEach(el => el.classList.add('visible'));
  }, 800);

  if (!('IntersectionObserver' in window)) {
    clearTimeout(emergencyTimer);
    revealEls.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px -20px 0px'
  });

  revealEls.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 0.08}s`;
    observer.observe(el);
  });
}

