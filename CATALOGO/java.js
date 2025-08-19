/* =========================================================
   Librería Vida – JS principal
   - Navegación móvil
   - Slider full-bleed
   - Cover-flow centrado (tarjetas pegadas)
   - Filtros + buscador (debounce)
   - Modal con galería multi-foto
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  /* ------------------ Helpers ------------------ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const debounce = (fn, ms = 250) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  /* ------------------ Navegación móvil ------------------ */
  const btnMenu = $('.menu-toggle');
  const nav = $('.nav');

  on(btnMenu, 'click', () => nav.classList.toggle('open'));
  // Cerrar al hacer click en un enlace
  $$('.nav a').forEach(a => on(a, 'click', () => nav.classList.remove('open')));

  /* =========================================================
     Slider principal (full-bleed)
     Estructura esperada:
     <section id="slider" class="slider">
       <div class="slides"><img>...</div>
       <button.prev> <button.next> <div.dots>
     </section>
     ========================================================= */
  (function sliderFullBleed() {
    const slider = $('#slider');
    if (!slider) return;

    const track = $('.slides', slider);
    const imgs = $$('.slides img', slider);
    const dotsC = $('.dots', slider);
    const prevB = $('.prev', slider);
    const nextB = $('.next', slider);

    if (!track || !imgs.length) return;

    let index = 0;
    let timer = null;

    // Crea dots
    if (dotsC) {
      dotsC.innerHTML = '';
      imgs.forEach((_, i) => {
        const b = document.createElement('button');
        b.className = 'dot';
        b.type = 'button';
        b.setAttribute('aria-label', `Ir a la diapositiva ${i + 1}`);
        on(b, 'click', () => show(i));
        dotsC.appendChild(b);
      });
    }

    const paintDots = () => {
      if (!dotsC) return;
      [...dotsC.children].forEach((d, i) => d.classList.toggle('active', i === index));
    };

    // Layout: cada img ocupa 100% del viewport del slider
    const layout = () => {
      const W = slider.clientWidth;
      imgs.forEach(img => {
        img.style.flex = '0 0 100%';
        // (No es obligatorio forzar width aquí, pero ayuda cuando el track usa translate por px)
        img.style.width = W + 'px';
      });
      track.style.transform = `translateX(${-index * W}px)`;
    };

    const show = (i) => {
      const len = imgs.length;
      index = (i + len) % len;
      const W = slider.clientWidth;
      track.style.transform = `translateX(${-index * W}px)`;
      paintDots();
    };

    const next = () => { show(index + 1); reset(); };
    const prev = () => { show(index - 1); reset(); };
    const auto = () => { timer = setInterval(() => show(index + 1), 4500); };
    const stop = () => { clearInterval(timer); timer = null; };
    const reset = () => { stop(); auto(); };

    // Controles
    on(nextB, 'click', next);
    on(prevB, 'click', prev);

    // Hover / touch pausa
    on(slider, 'mouseenter', stop);
    on(slider, 'mouseleave', reset);
    on(slider, 'touchstart', stop, { passive: true });
    on(slider, 'touchend', reset);

    // Teclado
    on(document, 'keydown', (e) => {
      if (!slider.matches(':hover')) return; // evita robar teclado si no estás encima
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });

    // Recalcular en resize y cuando carguen imágenes
    const ro = new ResizeObserver(layout);
    ro.observe(slider);

    let pending = imgs.length;
    if (pending) {
      imgs.forEach(img => {
        if (img.complete) {
          if (--pending === 0) { layout(); show(0); auto(); }
        } else {
          on(img, 'load', () => { if (--pending === 0) { layout(); show(0); auto(); } }, { once: true });
          on(img, 'error', () => { if (--pending === 0) { layout(); show(0); auto(); } }, { once: true });
        }
      });
    } else {
      layout(); show(0); auto();
    }

    // Pausar autoplay si pestaña no visible (ahorra batería)
    on(document, 'visibilitychange', () => {
      if (document.hidden) stop(); else reset();
    });
  })();

  /* =========================================================
     Cover-flow (2º carrusel) — centrado y tarjetas pegadas
     Estructura esperada:
     <section class="coverflow">
       <div class="carousel-container">
         <div class="carousel">
           <div class="card"><img ...></div>...
         </div>
         <div class="carousel-controls">
           <button id="cf-prev">Prev</button>
           <button id="cf-next">Next</button>
         </div>
       </div>
     </section>
     ========================================================= */
  (function coverFlow() {
    const container = $('.carousel-container');
    const track = $('.carousel', container || document);
    const cards = $$('.carousel .card', container || document);
    const prev = $('#cf-prev');
    const next = $('#cf-next');
    if (!container || !track || !cards.length) return;

    let index = 0;
    let timer = null;

    const getCardW = () => cards[0].getBoundingClientRect().width;

    const center = () => {
      const w = getCardW();
      // offset = centro del contenedor - mitad de tarjeta activa - desplazamiento por índice
      const offset = (container.clientWidth - w) / 2 - (index * w);
      track.style.transform = `translateX(${offset}px)`;
      cards.forEach((c, i) => c.classList.toggle('active', i === index));
    };

    const go = (to) => { index = (to + cards.length) % cards.length; center(); };

    // Controles
    on(prev, 'click', () => { go(index - 1); reset(); });
    on(next, 'click', () => { go(index + 1); reset(); });
    cards.forEach((c, i) => on(c, 'click', () => { go(i); reset(); }));

    // Teclado (cuando el carrusel está en viewport)
    on(document, 'keydown', (e) => {
      const rect = container.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (!visible) return;
      if (e.key === 'ArrowRight') { go(index + 1); reset(); }
      if (e.key === 'ArrowLeft')  { go(index - 1); reset(); }
    });

    // Hover pausa
    on(container, 'mouseenter', stop);
    on(container, 'mouseleave', reset);

    // Recalcular al redimensionar
    const ro = new ResizeObserver(center);
    ro.observe(container);

    // Autoplay
    const auto = () => { timer = setInterval(() => go(index + 1), 3000); };
    const stop = () => { clearInterval(timer); timer = null; };
    const reset = () => { stop(); auto(); };

    // Esperar a que las imágenes tengan tamaño
    const imgs = $$('img', track);
    let pending = imgs.length;
    if (pending) {
      imgs.forEach(img => {
        if (img.complete) {
          if (--pending === 0) { center(); auto(); }
        } else {
          on(img, 'load', () => { if (--pending === 0) { center(); auto(); } }, { once: true });
          on(img, 'error', () => { if (--pending === 0) { center(); auto(); } }, { once: true });
        }
      });
    } else {
      center(); auto();
    }

    // Pausar si pestaña no visible
    on(document, 'visibilitychange', () => {
      if (document.hidden) stop(); else reset();
    });
  })();

  /* =========================================================
     Filtros + buscador (debounce)
     ========================================================= */
  (function filtersAndSearch() {
    const chips = $$('.chip');
    const search = $('#search');
    const items = $$('.card-product');
    if (!items.length) return;

    let activeCat = 'all';

    const apply = () => {
      const q = (search?.value || '').toLowerCase().trim();
      items.forEach(card => {
        const inCat = activeCat === 'all' || card.classList.contains(activeCat);
        const title = (card.dataset.title || card.querySelector('h3')?.textContent || '').toLowerCase();
        const txtOk = !q || title.includes(q);
        card.style.display = (inCat && txtOk) ? '' : 'none';
      });
    };

    chips.forEach(ch => on(ch, 'click', () => {
      chips.forEach(x => x.classList.remove('active'));
      ch.classList.add('active');
      activeCat = ch.dataset.filter || 'all'; // usa data-filter="BIBLIAS" (debe coincidir con la clase del item)
      apply();
    }));

    on(search, 'input', debounce(apply, 180));
  })();

  /* =========================================================
     Modal de producto con galería multi-foto
     Estructura esperada:
     - Cada .card-product puede incluir data-images="url1,url2,..."
     ========================================================= */
  (function productModal() {
    const modal = $('#productModal');
    if (!modal) return;

    const closeBtn = $('.modal__close', modal);
    const mainImg  = $('#galleryMain', modal);
    const thumbsC  = $('#galleryThumbs', modal);
    const titleEl  = $('#modalTitle', modal);
    const buyBtn   = $('#whatsBuy', modal);

    let gIndex = 0;
    let gImgs  = [];

    const render = () => {
      if (!gImgs.length) return;
      mainImg.src = gImgs[gIndex];
      mainImg.alt = `${titleEl.textContent} – imagen ${gIndex + 1}`;
      thumbsC.innerHTML = '';
      gImgs.forEach((src, i) => {
        const t = new Image();
        t.src = src; t.alt = 'miniatura';
        if (i === gIndex) t.classList.add('active');
        on(t, 'click', () => { gIndex = i; render(); });
        thumbsC.appendChild(t);
      });
      const msg = encodeURIComponent(`Hola, me interesa "${titleEl.textContent}"`);
      if (buyBtn) buyBtn.href = `https://wa.me/528443288521?text=${msg}`;
    };

    const open = (title, images) => {
      titleEl.textContent = title || 'Producto';
      gImgs = (images || []).filter(Boolean);
      gIndex = 0;
      render();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    // Flechas de galería
    on($('.gallery__nav.left', modal), 'click', () => { gIndex = (gIndex - 1 + gImgs.length) % gImgs.length; render(); });
    on($('.gallery__nav.right', modal), 'click', () => { gIndex = (gIndex + 1) % gImgs.length; render(); });

    on(closeBtn, 'click', close);
    on(modal, 'click', (e) => { if (e.target.classList.contains('modal__backdrop')) close(); });
    on(document, 'keydown', (e) => { if (modal.classList.contains('open') && e.key === 'Escape') close(); });

    // Abrir modal al clickear tarjetas
    $$('.card-product').forEach(card => {
      on(card, 'click', () => {
        const title = card.dataset.title || card.querySelector('h3')?.textContent || 'Producto';
        const images = (card.dataset.images || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        if (images.length) open(title, images);
      });
    });
  })();
});
