/* =========================================================
   BIBLIAS.JS – Librería Vida
   - Menú móvil
   - Chips rápidas + Drawer tipo Amazon (checkbox + precio)
   - Búsqueda + orden
   - Vista Grid/Lista
   - Modal de producto con galería y cantidad
   - Mini-carrito con localStorage
   - Checkout por WhatsApp
   ========================================================= */

// Utilidad: formatear moneda MXN
const money = (n) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

document.addEventListener('DOMContentLoaded', () => {
  /* ======================
     Menú móvil
  ====================== */
  const btnMenu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  btnMenu?.addEventListener('click', () => {
    const open = nav?.style.display === 'flex';
    if (nav) nav.style.display = open ? 'none' : 'flex';
    btnMenu.setAttribute('aria-expanded', (!open).toString());
  });

  /* ======================
     Elementos base
  ====================== */
  const grid = document.getElementById('grid');
  const cards = Array.from(document.querySelectorAll('.card-product'));
  const resultsCount = document.getElementById('resultsCount');
  const search = document.getElementById('search');
  const sortSel = document.getElementById('sort');
  const gridBtn = document.getElementById('gridView');
  const listBtn = document.getElementById('listView');

  // Chips rápidas (si existen)
  const chips = document.querySelectorAll('.chip');
  let chipVariant = 'all';
  let chipSize = null;

  // Drawer de filtros (si existe)
  const drawer = document.getElementById('filtersDrawer');
  const backdrop = document.getElementById('filtersBackdrop');
  const openFilters = document.getElementById('openFilters');
  const closeFilters = document.getElementById('closeFilters');
  const applyFiltersBtn = document.getElementById('applyFilters');
  const clearFiltersBtn = document.getElementById('clearFilters');
  const filtersForm = document.getElementById('filtersForm');
  const minPrice = document.getElementById('minPrice');
  const maxPrice = document.getElementById('maxPrice');

  /* ======================
     Drawer (abrir/cerrar)
  ====================== */
  function openDrawer(){
    if(!drawer || !backdrop) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden','false');
    backdrop.hidden = false;
    openFilters?.setAttribute('aria-expanded','true');
  }
  function closeDrawer(){
    if(!drawer || !backdrop) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden','true');
    backdrop.hidden = true;
    openFilters?.setAttribute('aria-expanded','false');
  }
  openFilters?.addEventListener('click', openDrawer);
  closeFilters?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeDrawer(); });

  /* ======================
     Data helpers
  ====================== */
  const getData = (card) => ({
    title: (card.dataset.title || ''),
    price: Number(card.dataset.price || 0),
    variant: (card.dataset.variant || '').toLowerCase(),
    size: (card.dataset.size || '').toLowerCase()
  });

  // Activos del drawer
  function activeDrawerFilters(){
    if(!filtersForm) return { variants: [], sizes: [], pmin: 0, pmax: 0 };
    const f = new FormData(filtersForm);
    const variants = f.getAll('variant').map(v => String(v).toLowerCase());
    const sizes    = f.getAll('size').map(v => String(v).toLowerCase());
    const pmin = Number(minPrice?.value || 0);
    const pmax = Number(maxPrice?.value || 0);
    return { variants, sizes, pmin, pmax };
  }

  /* ======================
     Chips rápidas (si hay)
  ====================== */
  if (chips.length){
    // Por versión
    chips.forEach(ch => {
      if (ch.dataset.filter){
        ch.addEventListener('click', () => {
          // sólo un chip versión activo a la vez
          chips.forEach(x => { if (x.dataset.filter) x.classList.remove('active'); });
          ch.classList.add('active');
          chipVariant = ch.dataset.filter || 'all';
          applyFilters(); // re-filtrar
        });
      }
    });
    // Por tamaño
    chips.forEach(ch => {
      if (ch.dataset.size){
        ch.addEventListener('click', () => {
          // sólo un chip tamaño activo a la vez
          chips.forEach(x => { if (x.dataset.size) x.classList.remove('active'); });
          ch.classList.add('active');
          chipSize = ch.dataset.size || null;
          applyFilters();
        });
      }
    });
  }

  /* ======================
     Filtrar / Buscar / Precio / Orden
  ====================== */
  function applyFilters(){
    const q = (search?.value || '').toLowerCase().trim();

    // Drawer
    const { variants, sizes, pmin, pmax } = activeDrawerFilters();

    let shown = 0;
    cards.forEach(card => {
      const d = getData(card);

      // 1) Variante: pasa si NO hay checkbox seleccionados o si coincide
      const byVariantDrawer = !variants.length || variants.includes(d.variant);
      // 2) Tamaño: idem
      const bySizeDrawer = !sizes.length || sizes.includes(d.size);
      // 3) Chips (si existen): además deben coincidir con chip si hay selección
      const byVariantChip = (chipVariant === 'all') || d.variant.includes(chipVariant);
      const bySizeChip = !chipSize || d.size.includes(chipSize);

      // 4) Búsqueda
      const byQuery = !q || d.title.toLowerCase().includes(q);

      // 5) Precio
      const byPrice = (!pmin || d.price >= pmin) && (!pmax || d.price <= pmax);

      const visible = byVariantDrawer && bySizeDrawer && byVariantChip && bySizeChip && byQuery && byPrice;
      card.style.display = visible ? '' : 'none';
      if (visible) shown++;
    });

    resultsCount && (resultsCount.textContent = shown.toString());
    // tras filtrar, mantén orden aplicado
    applySort();
  }

  function clearFilters(){
    filtersForm?.reset();
    if (minPrice) minPrice.value = '';
    if (maxPrice) maxPrice.value = '';

    // Limpia chips tamaño pero deja versión en "Todas" si hay
    if (chips.length){
      chips.forEach(x => {
        if (x.dataset.size) x.classList.remove('active');
        if (x.dataset.filter === 'all'){ x.classList.add('active'); chipVariant='all'; }
      });
      chipSize = null;
    }
    applyFilters();
  }

  applyFiltersBtn?.addEventListener('click', () => { applyFilters(); closeDrawer(); });
  clearFiltersBtn?.addEventListener('click', () => { clearFilters(); });
  search?.addEventListener('input', applyFilters);

  function applySort(){
    if (!grid) return;
    const val = sortSel?.value || 'relevance';
    const visibles = cards.filter(c => c.style.display !== 'none');
    const hidden   = cards.filter(c => c.style.display === 'none');

    visibles.sort((a,b)=>{
      const da = getData(a), db = getData(b);
      switch(val){
        case 'price-asc':  return da.price - db.price;
        case 'price-desc': return db.price - da.price;
        case 'title-asc':  return da.title.localeCompare(db.title);
        case 'title-desc': return db.title.localeCompare(da.title);
        default: return 0;
      }
    });

    [...visibles, ...hidden].forEach(el => grid.appendChild(el));
  }
  sortSel?.addEventListener('change', applySort);

  // Alternar vista
  gridBtn?.addEventListener('click', ()=>{
    grid?.classList.remove('list');
    gridBtn.classList.add('active'); listBtn?.classList.remove('active');
    gridBtn.setAttribute('aria-pressed','true'); listBtn?.setAttribute('aria-pressed','false');
  });
  listBtn?.addEventListener('click', ()=>{
    grid?.classList.add('list');
    listBtn.classList.add('active'); gridBtn?.classList.remove('active');
    listBtn.setAttribute('aria-pressed','true'); gridBtn?.setAttribute('aria-pressed','false');
  });

  /* ======================
     Modal de producto
  ====================== */
  const productModal = document.getElementById('productModal');
  const pmClose = productModal?.querySelector('.modal__close');
  const pmBackdrop = productModal?.querySelector('.modal__backdrop');
  const pmTitle = document.getElementById('modalTitle');
  const pmPrice = document.getElementById('modalPrice');
  const pmDesc  = document.getElementById('modalDesc');     // opcional
  const pmSpecs = document.getElementById('modalSpecs');    // opcional
  const pmQty   = document.getElementById('qty');           // opcional
  const pmWhats = document.getElementById('whatsBuy');
  const pmAdd   = document.getElementById('addFromModal');
  const gMain   = document.getElementById('galleryMain');
  const gThumbs = document.getElementById('galleryThumbs');

  let gImgs = [], gIndex = 0, gTitle = '', gPrice = 0, gVariant = '', gSize = '';

  function openProductModal({title, price, images, variant, size}){
    gTitle = title; gPrice = price; gVariant = variant || ''; gSize = size || '';
    pmTitle && (pmTitle.textContent = title);
    pmPrice && (pmPrice.textContent = money(price));

    if (pmDesc) pmDesc.textContent  = 'Edición con excelentes materiales y acabados. Entrega rápida y garantía de satisfacción.';
    if (pmSpecs){
      pmSpecs.querySelector('[data-spec="variant"]') && (pmSpecs.querySelector('[data-spec="variant"]').textContent = (variant || '—').toUpperCase());
      pmSpecs.querySelector('[data-spec="size"]') && (pmSpecs.querySelector('[data-spec="size"]').textContent = (size || '—').toUpperCase());
    }
    if (pmQty) pmQty.value = '1';

    gImgs = images;
    gIndex = 0;
    renderGallery();

    if (pmWhats){
      pmWhats.href = `https://wa.me/528443288521?text=${encodeURIComponent('Hola, me interesa ' + title + ' (' + money(price) + ')')}`;
    }

    productModal?.classList.add('open');
    productModal?.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeProductModal(){
    productModal?.classList.remove('open');
    productModal?.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  function renderGallery(){
    if(!gImgs.length || !gMain || !gThumbs) return;
    gMain.src = gImgs[gIndex];
    gMain.alt = `${gTitle} – imagen ${gIndex+1}`;
    gThumbs.innerHTML = '';
    gImgs.forEach((src,i)=>{
      const t = document.createElement('img');
      t.src = src; t.alt = `miniatura ${i+1}`;
      if(i===gIndex) t.classList.add('active');
      t.addEventListener('click', ()=>{ gIndex=i; renderGallery(); });
      gThumbs.appendChild(t);
    });
  }
  productModal?.querySelector('.gallery__nav.left')?.addEventListener('click', ()=>{
    gIndex = (gIndex - 1 + gImgs.length) % gImgs.length; renderGallery();
  });
  productModal?.querySelector('.gallery__nav.right')?.addEventListener('click', ()=>{
    gIndex = (gIndex + 1) % gImgs.length; renderGallery();
  });
  pmClose?.addEventListener('click', closeProductModal);
  pmBackdrop?.addEventListener('click', closeProductModal);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeProductModal(); });

  // Abrir modal desde card (botón Ver, imagen o título)
  document.querySelectorAll('.card-product').forEach(card=>{
    const openFrom = () => {
      const title = card.dataset.title || 'Producto';
      const price = Number(card.dataset.price || 0);
      const images = (card.dataset.images || '').split('|').map(s=>s.trim()).filter(Boolean);
      const variant = (card.dataset.variant || '').toLowerCase();
      const size = (card.dataset.size || '').toLowerCase();
      if(images.length) openProductModal({title, price, images, variant, size});
    };
    card.querySelector('.view')?.addEventListener('click', openFrom);
    card.querySelector('img')?.addEventListener('click', openFrom);
    card.querySelector('h3')?.addEventListener('click', openFrom);
  });

  /* ======================
     Carrito (localStorage)
  ====================== */
  const CART_KEY = 'vida_cart_v1';
  const cartToggle = document.querySelector('.mini-cart__toggle');
  const miniCart = document.querySelector('.mini-cart');
  const cartItems = document.getElementById('cartItems');
  const cartCount = document.getElementById('cartCount');
  const cartTotal = document.getElementById('cartTotal');
  const cartWhats = document.getElementById('cartWhats');          // puede no existir
  const cartClear = document.getElementById('cartClear');
  const openCheckoutBtn = document.getElementById('openCheckout'); // puede no existir

  const readCart  = () => JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  const writeCart = (items) => localStorage.setItem(CART_KEY, JSON.stringify(items));

  function refreshCartUI(){
    const items = readCart();
    if (cartItems) cartItems.innerHTML = '';
    let total = 0;

    items.forEach((it, idx) => {
      total += it.price * it.qty;
      if (!cartItems) return;
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${it.title} × ${it.qty}</span>
        <span>
          <button data-idx="${idx}" class="minus" aria-label="Quitar uno">−</button>
          <button data-idx="${idx}" class="plus" aria-label="Agregar uno">+</button>
          <strong>${money(it.price * it.qty)}</strong>
        </span>
      `;
      cartItems.appendChild(li);
    });

    cartCount && (cartCount.textContent = items.reduce((a,b)=>a+b.qty, 0));
    cartTotal && (cartTotal.textContent = money(total));

    // Enlace directo a WhatsApp si existe (modo rápido)
    if (cartWhats){
      const msg = items.length
        ? 'Hola, deseo comprar: ' + items.map(i => `${i.title} (x${i.qty})`).join(', ') + ` — Total ${money(total)}`
        : 'Hola, estoy interesado en productos de Biblias.';
      cartWhats.href = `https://wa.me/528443288521?text=${encodeURIComponent(msg)}`;
    }
  }

  function addToCart(title, price, qty=1){
    const items = readCart();
    const i = items.findIndex(x=>x.title===title && x.price===price);
    if(i>=0) items[i].qty += qty;
    else items.push({title, price, qty});
    writeCart(items);
    refreshCartUI();
  }

  // Botón agregar en cards
  document.querySelectorAll('.card-product .add-cart').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const card = e.currentTarget.closest('.card-product');
      addToCart(card.dataset.title, Number(card.dataset.price||0), 1);
      if (miniCart && cartToggle){
        miniCart.classList.add('open');
        cartToggle.setAttribute('aria-expanded','true');
      }
    });
  });

  // Botón agregar desde modal (respeta cantidad si existe)
  pmAdd?.addEventListener('click', ()=>{
    const q = pmQty ? Math.max(1, Number(pmQty.value||1)) : 1;
    addToCart(gTitle, gPrice, q);
  });

  // Toggle mini-cart
  cartToggle?.addEventListener('click', ()=>{
    const open = miniCart?.classList.toggle('open');
    cartToggle.setAttribute('aria-expanded', (!!open).toString());
  });

  // Más/menos en mini-cart
  cartItems?.addEventListener('click', (e)=>{
    const idx = e.target.dataset?.idx;
    if (idx == null) return;
    const items = readCart();
    if (e.target.classList.contains('plus')) items[idx].qty++;
    if (e.target.classList.contains('minus')) items[idx].qty = Math.max(0, items[idx].qty-1);
    writeCart(items.filter(i=>i.qty>0));
    refreshCartUI();
  });

  // Vaciar
  cartClear?.addEventListener('click', ()=>{
    localStorage.removeItem(CART_KEY);
    refreshCartUI();
  });

  /* ======================
     Checkout por WhatsApp (form)
  ====================== */
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutClose = checkoutModal?.querySelector('.modal__close');
  const checkoutBackdrop = checkoutModal?.querySelector('.modal__backdrop');
  const checkoutForm = document.getElementById('checkoutForm');

  function openCheckout(){
    checkoutModal?.classList.add('open');
    checkoutModal?.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeCheckout(){
    checkoutModal?.classList.remove('open');
    checkoutModal?.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  openCheckoutBtn?.addEventListener('click', openCheckout);
  checkoutClose?.addEventListener('click', closeCheckout);
  checkoutBackdrop?.addEventListener('click', closeCheckout);

  checkoutForm?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const items = readCart();
    if (!items.length){
      alert('Tu carrito está vacío.');
      return;
    }
    const data = Object.fromEntries(new FormData(checkoutForm));
    const total = items.reduce((s,i)=>s+i.price*i.qty,0);
    const lines = items.map(i => `• ${i.title} × ${i.qty} — ${money(i.price*i.qty)}`).join('%0A');
    const info  = [
      `Nombre: ${data.name || ''}`,
      `Teléfono: ${data.phone || ''}`,
      `Entrega: ${data.delivery || ''}`,
      data.address ? `Dirección: ${data.address}` : '',
      data.notes ? `Notas: ${data.notes}` : ''
    ].filter(Boolean).join('%0A');

    const msg = `Hola, quiero confirmar mi pedido:%0A%0A${lines}%0A%0ATotal: ${money(total)}%0A%0A${info}`;
    const url = `https://wa.me/528443288521?text=${msg}`;
    window.open(url, '_blank', 'noopener');
    closeCheckout();
  });

  /* ======================
     Init
  ====================== */
  applyFilters();
  applySort();
  refreshCartUI();
});
