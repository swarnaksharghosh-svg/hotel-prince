/* Hotel Prince, Kakdwip: site interactions (no dependencies) */
(() => {
  'use strict';

  // TEMPLATE: number that receives booking enquiries (country code, no + or spaces).
  const WHATSAPP_NUMBER = '919339044141';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const pad = (n) => String(n).padStart(2, '0');
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const debounce = (fn, ms) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  /* ---------- Intro screen ---------- */
  function initLoader() {
    const done = () => {
      root.classList.add('is-loaded');
      try { sessionStorage.setItem('hp:loaded', '1'); } catch (e) { /* private mode */ }
    };
    if (root.classList.contains('skip-loader')) { requestAnimationFrame(done); return; }

    const heroImg = $('.hero__slide.is-active img');
    const imgReady = heroImg && !heroImg.complete
      ? new Promise((r) => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); })
      : Promise.resolve();
    const minTime = new Promise((r) => setTimeout(r, 1900));
    const maxTime = new Promise((r) => setTimeout(r, 3400));
    Promise.race([Promise.all([minTime, imgReady]), maxTime]).then(done);
  }

  /* ---------- Header ---------- */
  function initHeader() {
    const hdr = $('[data-hdr]');
    let lastY = window.scrollY;
    return () => {
      const y = window.scrollY;
      hdr.classList.toggle('is-solid', y > 40);
      if (root.classList.contains('menu-open')) return;
      if (y > lastY + 6 && y > window.innerHeight * 0.8) hdr.classList.add('is-hidden');
      else if (y < lastY - 6 || y < window.innerHeight * 0.8) hdr.classList.remove('is-hidden');
      if (Math.abs(y - lastY) > 6) lastY = y;
    };
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    const btn = $('.burger');
    const menu = $('#menu');
    if (!btn || !menu) return;
    const links = $$('a', menu);

    const setOpen = (open) => {
      root.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.inert = !open;
      if (open) setTimeout(() => links[0] && links[0].focus({ preventScroll: true }), 450);
    };

    btn.addEventListener('click', () => setOpen(!root.classList.contains('menu-open')));
    links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setOpen(false); btn.focus(); }
    });
    matchMedia('(min-width: 1100px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- Hero slideshow ---------- */
  function initHero() {
    const slides = $$('.hero__slide');
    if (slides.length < 2) return;
    const hero = $('.hero');
    const num = $('[data-slide-num]');
    const cap = $('[data-slide-caption]');
    const bar = $('.hero__bar');
    const toggle = $('[data-hero-toggle]');
    const DURATION = 7000;
    bar.style.setProperty('--dur', `${DURATION}ms`);

    let index = 0;
    let timer = null;
    let startedAt = 0;
    let remaining = DURATION;
    let userPaused = reduceMotion;
    let inView = true;

    const restartBar = () => {
      bar.classList.remove('is-run');
      void bar.offsetWidth;
      bar.classList.add('is-run');
    };

    const go = (n) => {
      const prev = slides[index];
      index = (n + slides.length) % slides.length;
      const next = slides[index];
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(() => prev.classList.remove('is-leaving'), 2000);
      next.classList.remove('is-leaving');
      next.classList.add('is-active');
      num.textContent = pad(index + 1);
      cap.textContent = next.dataset.caption || '';
    };

    const canRun = () => !userPaused && inView && !document.hidden;

    const start = () => {
      if (timer || !canRun()) return;
      startedAt = performance.now();
      bar.classList.remove('is-paused');
      timer = setTimeout(() => {
        timer = null;
        remaining = DURATION;
        go(index + 1);
        restartBar();
        start();
      }, remaining);
    };

    const stop = () => {
      bar.classList.add('is-paused');
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      remaining = Math.max(400, remaining - (performance.now() - startedAt));
    };

    const sync = () => (canRun() ? start() : stop());

    toggle.addEventListener('click', () => {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
      sync();
    });
    toggle.setAttribute('aria-pressed', String(userPaused));
    toggle.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');

    document.addEventListener('visibilitychange', sync);
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(hero);

    restartBar();
    if (userPaused) bar.classList.add('is-paused');
    sync();
  }

  /* ---------- Scroll reveals & counters ---------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) { el.textContent = target.toFixed(dec); return; }
    const dur = 1700;
    const t0 = performance.now();
    const tick = (t) => {
      const k = clamp((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * e).toFixed(dec);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function initReveals() {
    $$('.rv-lines').forEach((h) => $$('.ln > span', h).forEach((s, i) => s.style.setProperty('--i', i)));
    $$('[data-stagger]').forEach((g) => {
      const step = parseFloat(g.dataset.stagger) || 0.08;
      [...g.children].forEach((c, i) => c.style.setProperty('--d', `${(i * step).toFixed(2)}s`));
    });

    // Split the footer wordmark into letters.
    $$('[data-split]').forEach((el) => {
      const text = el.textContent.trim();
      el.textContent = '';
      [...text].forEach((ch, i) => {
        const s = document.createElement('span');
        s.textContent = ch === ' ' ? ' ' : ch;
        s.style.setProperty('--i', i);
        el.append(s);
      });
    });

    const els = $$('.rv, .rv-lines, .rv-clip, [data-count], .stars, [data-split]');
    const reveal = (el) => {
      el.classList.add('is-in');
      if (el.hasAttribute('data-count')) countUp(el);
    };

    if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach(reveal); return; }

    $$('[data-count]').forEach((el) => { el.textContent = (0).toFixed(parseInt(el.dataset.decimals || '0', 10)); });

    // A fully clipped element never reports as visible, so image frames are
    // watched through their (unclipped) parent instead.
    const groups = new Map();
    els.forEach((el) => {
      const target = el.classList.contains('rv-clip') ? el.parentElement : el;
      if (!groups.has(target)) groups.set(target, []);
      groups.get(target).push(el);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        groups.get(en.target).forEach(reveal);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    groups.forEach((_, target) => io.observe(target));
  }

  /* ---------- Word-by-word statement ---------- */
  function initStatement() {
    const el = $('[data-words]');
    if (!el) return null;
    const words = [];
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.append(s);
            words.push(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);

    if (reduceMotion) { words.forEach((w) => w.classList.add('is-lit')); return null; }

    let lit = -1;
    return () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh * 0.85 - r.top) / (vh * 0.3 + r.height), 0, 1);
      const n = Math.round(p * words.length);
      if (n === lit) return;
      words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
      lit = n;
    };
  }

  /* ---------- Parallax ---------- */
  function initParallax() {
    if (reduceMotion) return null;
    const items = $$('[data-speed]').map((el) => ({
      el,
      box: el.classList.contains('px') ? el.parentElement : el,
      speed: parseFloat(el.dataset.speed) || 0,
    }));
    if (!items.length) return null;
    return () => {
      const vh = window.innerHeight;
      const factor = window.innerWidth < 768 ? 0.55 : 1;
      const rects = items.map((it) => it.box.getBoundingClientRect());
      items.forEach((it, i) => {
        const r = rects[i];
        if (r.bottom < -200 || r.top > vh + 200) return;
        const y = (r.top + r.height / 2 - vh / 2) * it.speed * factor;
        it.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      });
    };
  }

  /* ---------- Marquee ---------- */
  function initMarquee() {
    const track = $('[data-marquee]');
    if (!track || reduceMotion) return null;
    let x = 0;
    let half = track.scrollWidth / 2;
    let last = performance.now();
    let dir = -1;
    let boost = 0;
    let visible = false;
    let raf = null;

    const loop = (t) => {
      const dt = Math.min(64, t - last);
      last = t;
      x += dir * (0.045 + boost) * dt;
      boost *= 0.93;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      raf = visible ? requestAnimationFrame(loop) : null;
    };

    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    }).observe(track.parentElement);
    window.addEventListener('resize', debounce(() => { half = track.scrollWidth / 2; }, 200));
    if (document.fonts) document.fonts.ready.then(() => { half = track.scrollWidth / 2; });

    let lastY = window.scrollY;
    return () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (!dy) return;
      dir = dy > 0 ? -1 : 1;
      boost = Math.min(0.5, boost + Math.abs(dy) * 0.0035);
    };
  }

  /* ---------- Rooms slider ---------- */
  function initRooms() {
    const wrap = $('[data-rooms]');
    if (!wrap) return;
    const figs = $$('.room-img', wrap);
    const panels = $$('.room', wrap);
    const dots = $$('[data-room-dot]', wrap);
    const num = $('[data-room-num]', wrap);
    const media = $('.rooms__media', wrap);
    const roomSelect = $('#f-room');
    let index = 0;
    let busy = false;

    panels.forEach((p) => [...p.children].forEach((c, k) => c.style.setProperty('--k', k)));

    const go = (n, dir) => {
      n = (n + figs.length) % figs.length;
      if (n === index || busy) return;
      busy = true;
      setTimeout(() => { busy = false; }, 650);
      const d = dir || (n > index ? 1 : -1);
      const prev = figs[index];
      const next = figs[n];

      figs.forEach((f) => f.classList.remove('is-prev'));
      prev.classList.remove('is-active');
      prev.classList.add('is-prev');
      next.classList.toggle('from-left', d < 0);
      void next.offsetWidth; // commit the hidden start position before animating
      next.classList.add('is-active');

      panels[index].classList.remove('is-active');
      panels[index].setAttribute('aria-hidden', 'true');
      panels[n].classList.add('is-active');
      panels[n].removeAttribute('aria-hidden');
      dots.forEach((dot, k) => dot.setAttribute('aria-current', String(k === n)));
      num.textContent = pad(n + 1);
      index = n;
    };

    $('[data-room-prev]', wrap).addEventListener('click', () => go(index - 1, -1));
    $('[data-room-next]', wrap).addEventListener('click', () => go(index + 1, 1));
    dots.forEach((dot) => dot.addEventListener('click', () => go(parseInt(dot.dataset.roomDot, 10))));
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(index - 1, -1);
      if (e.key === 'ArrowRight') go(index + 1, 1);
    });

    // swipe / drag on the photo
    let x0 = null;
    media.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    media.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    media.addEventListener('pointercancel', () => { x0 = null; });

    $('[data-room-book]', wrap).addEventListener('click', () => {
      if (roomSelect) roomSelect.value = panels[index].dataset.room;
    });
  }

  /* ---------- Gallery: pinned horizontal scroll on desktop, swipe on mobile ---------- */
  function initGallery() {
    const sec = $('[data-hscroll]');
    if (!sec) return {};
    const track = $('[data-track]', sec);
    const viewport = $('.gallery__viewport', sec);
    const bar = $('[data-g-bar]', sec);
    const num = $('[data-g-num]', sec);
    const items = $$('.g-item', track);
    const mq = matchMedia('(min-width: 1024px)');
    const RATIO = 0.6; // vertical scroll needed per pixel of horizontal travel
    let pinned = false;
    let distance = 0;

    const measure = () => {
      pinned = mq.matches;
      sec.classList.toggle('is-pinned', pinned);
      track.style.transform = '';
      if (pinned) {
        distance = Math.max(0, track.offsetWidth - viewport.clientWidth);
        sec.style.height = `${Math.round(distance * RATIO + window.innerHeight)}px`;
      } else {
        distance = 0;
        sec.style.height = '';
      }
      update();
    };

    const update = () => {
      let p;
      if (pinned) {
        const r = sec.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        p = distance ? clamp(-r.top / (distance * RATIO), 0, 1) : 0;
        track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
      } else {
        const max = track.scrollWidth - track.clientWidth;
        p = max > 0 ? track.scrollLeft / max : 0;
      }
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      num.textContent = pad(Math.round(p * (items.length - 1)) + 1);
    };

    track.addEventListener('scroll', () => { if (!pinned) update(); }, { passive: true });

    // Keep keyboard focus visible while the row is pinned.
    track.addEventListener('focusin', (e) => {
      if (!pinned) return;
      viewport.scrollLeft = 0;
      const item = e.target.closest('.g-item');
      if (!item) return;
      const target = clamp(item.offsetLeft - viewport.clientWidth * 0.3, 0, distance);
      const top = sec.getBoundingClientRect().top + window.scrollY + target * RATIO;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, top);
      root.style.scrollBehavior = '';
    });

    mq.addEventListener('change', measure);
    window.addEventListener('load', measure);
    if (document.fonts) document.fonts.ready.then(measure);
    measure();
    return { update, measure };
  }

  /* ---------- Photo viewer ---------- */
  function initLightbox() {
    const dlg = $('[data-lb]');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    const img = $('[data-lb-img]', dlg);
    const cap = $('[data-lb-cap]', dlg);
    const count = $('[data-lb-count]', dlg);
    const triggers = $$('[data-lightbox]');
    const data = triggers.map((t) => ({ src: t.dataset.full, alt: $('img', t).alt, caption: t.dataset.caption }));
    let i = 0;
    let lastTrigger = null;
    let swiped = false;

    const show = (n, dir = 0) => {
      i = (n + data.length) % data.length;
      const d = data[i];
      dlg.style.setProperty('--dir', dir);
      img.classList.remove('is-ready');
      img.onload = () => img.classList.add('is-ready');
      img.src = d.src;
      img.alt = d.alt;
      if (img.complete && img.naturalWidth) requestAnimationFrame(() => img.classList.add('is-ready'));
      cap.textContent = d.caption;
      count.textContent = `${pad(i + 1)} / ${pad(data.length)}`;
      // warm the next image
      const pre = new Image();
      pre.src = data[(i + 1) % data.length].src;
    };

    triggers.forEach((t, n) => t.addEventListener('click', () => {
      lastTrigger = t;
      show(n);
      dlg.showModal();
      root.classList.add('lb-open');
    }));
    $('[data-lb-prev]', dlg).addEventListener('click', () => show(i - 1, -1));
    $('[data-lb-next]', dlg).addEventListener('click', () => show(i + 1, 1));
    $('[data-lb-close]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => {
      root.classList.remove('lb-open');
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    });
    dlg.addEventListener('click', (e) => {
      if (swiped) { swiped = false; return; }
      if (e.target === dlg || e.target.classList.contains('lb__stage')) dlg.close();
    });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(i - 1, -1);
      if (e.key === 'ArrowRight') show(i + 1, 1);
    });

    let x0 = null;
    dlg.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    dlg.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) { swiped = true; show(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
    });
  }

  /* ---------- Booking ---------- */
  function initBooking() {
    const form = $('#enquiry');
    const quick = $('#quickbook');
    if (!form) return;

    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const addDays = (s, n) => { const d = new Date(`${s}T00:00`); d.setDate(d.getDate() + n); return iso(d); };
    const today = iso(new Date());

    const pairs = [[$('#qb-in'), $('#qb-out')], [$('#f-in'), $('#f-out')]];
    pairs.forEach(([a, b]) => {
      if (!a || !b) return;
      a.min = today;
      b.min = addDays(today, 1);
      a.addEventListener('change', () => {
        if (!a.value) return;
        const minOut = addDays(a.value, 1);
        b.min = minOut;
        if (!b.value || b.value < minOut) b.value = minOut;
      });
    });

    if (quick) {
      quick.addEventListener('submit', (e) => {
        e.preventDefault();
        $('#f-in').value = $('#qb-in').value;
        $('#f-in').dispatchEvent(new Event('change'));
        if ($('#qb-out').value) $('#f-out').value = $('#qb-out').value;
        $('#f-guests').value = $('#qb-guests').value;
        $('#reserve').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        setTimeout(() => $('#f-name').focus({ preventScroll: true }), 1100);
      });
    }

    const status = $('.form__status', form);
    const setErr = (el, msg) => {
      const field = el.closest('.field');
      field.classList.toggle('has-error', Boolean(msg));
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      const out = $('.field__err', field);
      if (out) out.textContent = msg || '';
    };
    $$('input', form).forEach((el) => el.addEventListener('input', () => setErr(el, '')));

    const fmt = (s) => new Date(`${s}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#f-name');
      const phone = $('#f-phone');
      const cin = $('#f-in');
      const cout = $('#f-out');
      const checks = [
        [name, name.value.trim().length < 2 ? 'Please tell us your name.' : ''],
        [phone, phone.value.replace(/\D/g, '').length < 10 ? 'Please enter a phone number we can reach you on.' : ''],
        [cin, !cin.value ? 'Choose a check-in date.' : (cin.value < today ? 'Check-in can’t be in the past.' : '')],
        [cout, !cout.value ? 'Choose a check-out date.' : (cin.value && cout.value <= cin.value ? 'Check-out must be after check-in.' : '')],
      ];
      let firstBad = null;
      checks.forEach(([el, msg]) => { setErr(el, msg); if (msg && !firstBad) firstBad = el; });
      if (firstBad) { firstBad.focus(); return; }

      const nights = Math.round((new Date(`${cout.value}T00:00`) - new Date(`${cin.value}T00:00`)) / 864e5);
      const notes = $('#f-notes').value.trim();
      const lines = [
        'Hello Hotel Prince, I would like to enquire about a stay.',
        '',
        `Name: ${name.value.trim()}`,
        `Phone: ${phone.value.trim()}`,
        `Check-in: ${fmt(cin.value)}`,
        `Check-out: ${fmt(cout.value)} (${nights} night${nights === 1 ? '' : 's'})`,
        `Guests: ${$('#f-guests').value}`,
        `Room: ${$('#f-room').value}`,
      ];
      if (notes) lines.push(`Notes: ${notes}`);

      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
      status.textContent = 'Opening WhatsApp with your enquiry…';
      const w = window.open(url, '_blank');
      if (w) w.opener = null;
      else window.location.href = url;
    });
  }

  /* ---------- Mobile action bar ---------- */
  function initDock() {
    const dock = $('[data-dock]');
    const hero = $('.hero');
    const reserve = $('#reserve');
    if (!dock) return null;
    return () => {
      const r = reserve.getBoundingClientRect();
      const inReserve = r.top < window.innerHeight * 0.9 && r.bottom > 0;
      const show = window.scrollY > hero.offsetHeight * 0.6 && !inReserve && !root.classList.contains('menu-open');
      dock.classList.toggle('is-shown', show);
    };
  }

  /* ---------- Current section in nav ---------- */
  function initActiveNav() {
    const links = $$('.nav a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-current'));
        const a = byId.get(en.target.id);
        if (a) a.classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['hotel', 'stay', 'dining', 'amenities', 'gallery', 'reviews', 'location', 'reserve'].forEach((id) => {
      const s = document.getElementById(id);
      if (s) io.observe(s);
    });
  }

  /* ---------- Map (loads when near) ---------- */
  function initMap() {
    const box = $('[data-map]');
    if (!box) return;
    const load = () => {
      if (box.dataset.loaded) return;
      box.dataset.loaded = '1';
      const f = document.createElement('iframe');
      f.src = box.dataset.src;
      f.title = 'Map showing Hotel Prince on NH117, Kakdwip';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.allowFullscreen = true;
      f.addEventListener('load', () => box.classList.add('is-loaded'));
      box.append(f);
    };
    if (!('IntersectionObserver' in window)) { load(); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { load(); io.disconnect(); } }, { rootMargin: '600px 0px' });
    io.observe(box);
  }

  /* ---------- Cursor label (mouse only) ---------- */
  function initCursor() {
    if (!finePointer || reduceMotion) return;
    const c = $('.cursor');
    const label = $('[data-cursor-label]', c);
    if (!c) return;
    root.classList.add('has-cursor');
    let x = -200; let y = -200; let cx = -200; let cy = -200;
    let raf = null;
    let started = false;
    const loop = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      c.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.4 ? requestAnimationFrame(loop) : null;
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!started) { cx = x; cy = y; started = true; }
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    $$('[data-cursor]').forEach((el) => {
      el.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        label.textContent = el.dataset.cursor;
        c.classList.add('is-on');
      });
      el.addEventListener('pointerleave', () => c.classList.remove('is-on'));
    });
  }

  /* ---------- Boot ---------- */
  initLoader();
  initMenu();
  initHero();
  initReveals();
  initRooms();
  initLightbox();
  initBooking();
  initActiveNav();
  initMap();
  initCursor();
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  const gallery = initGallery();
  const onScroll = [initHeader(), initStatement(), initParallax(), initMarquee(), initDock(), gallery.update].filter(Boolean);

  let ticking = false;
  const run = () => { ticking = false; onScroll.forEach((fn) => fn()); };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(run); }
  }, { passive: true });
  window.addEventListener('resize', debounce(() => { if (gallery.measure) gallery.measure(); run(); }, 150));
  run();
})();
