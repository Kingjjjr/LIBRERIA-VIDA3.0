/* ====== Utilidades globales ====== */
const money = (n) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

/* ====== Carrito global (compartido en toda la tienda) ====== */
(() => {
  const CART_KEY = 'vida_cart_v1';

  const safeParse = (v) => {
    try { return JSON.parse(v); } catch { return null; }
  };

  const readCart  = () => safeParse(localStorage.getItem(CART_KEY)) || [];
  const writeCart = (items) => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
    catch (e) { console.error('No se pudo guardar el carrito:', e); }
  };

  function refreshCartUI() {
    // Si la página no tiene UI del carrito, salir silenciosamente
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    const cartWhats = document.getElementById('cartWhats'); // opcional

    if (!cartItems || !cartCount || !cartTotal) return;

    const items = readCart();
    cartItems.innerHTML = '';
    let total = 0;

    items.forEach((it, idx) => {
      total += it.price * it.qty;
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${it.title} × ${it.qty}</span>
        <span>
          <button data-idx="${idx}" class="minus" aria-label="Quitar uno">−</button>
          <button data-idx="${idx}" class="plus"  aria-label="Agregar uno">+</button>
          <strong>${money(it.price * it.qty)}</strong>
        </span>`;
      cartItems.appendChild(li);
    });

    cartCount.textContent = items.reduce((a,b)=>a+b.qty, 0);
    cartTotal.textContent = money(total);

    if (cartWhats) {
      const msg = items.length
        ? 'Hola, deseo comprar: ' + items.map(i => `${i.title} (x${i.qty})`).join(', ') + ` — Total ${money(total)}`
        : 'Hola, estoy interesado en productos.';
      cartWhats.href = `https://wa.me/528443288521?text=${encodeURIComponent(msg)}`;
    }
  }

  function addToCart({ title, price, qty = 1 }) {
    // Validaciones fuertes
    if (!title || typeof title !== 'string') {
      console.error('addToCart: título inválido', title);
      return false;
    }
    const p = parseFloat(String(price).replace(/[^\d.]/g, ''));
    if (!isFinite(p) || p <= 0) {
      console.error('addToCart: precio inválido', price);
      return false;
    }
    const q = Math.max(1, parseInt(qty, 10) || 1);

    const items = readCart();
    const i = items.findIndex(x => x.title === title && Number(x.price) === p);
    if (i >= 0) items[i].qty += q;
    else items.push({ title, price: p, qty: q });

    writeCart(items);
    refreshCartUI();

    // Abrir mini-cart si existe
    const miniCart = document.querySelector('.mini-cart');
    const cartToggle = document.querySelector('.mini-cart__toggle');
    if (miniCart && cartToggle) {
      miniCart.classList.add('open');
      cartToggle.setAttribute('aria-expanded', 'true');
    }
    return true;
  }

  // Exponer API global para todas las páginas
  window.vidaCart = {
    read: readCart,
    write: writeCart,
    add: addToCart,
    refresh: refreshCartUI,
  };
})();

/* ====== Interacciones de la página ====== */
document.addEventListener('DOMContentLoaded', () => {
  /* Menú móvil */
  const btnMenu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  btnMenu?.addEventListener('click', () => {
    const open = nav?.style.display === 'flex';
    if (nav) nav.style.display = open ? 'none' : 'flex';
    btnMenu.setAttribute('aria-expanded', (!open).toString());
  });

  /* Elementos base de catálogo (si existen en esta página) */
  const grid        = document.getElementById('grid');
  const cards       = Array.from(document.querySelectorAll('.card-product'));
  const resultsCnt  = document.getElementById('resultsCount');
  const search      = document.getElementById('search');
  const sortSel     = document.getElementById('sort');
  const gridBtn     = document.getElementById('gridView');
  const listBtn     = document.getElementById('listView');

  /* Drawer de filtros (tipo Amazon) */
  const drawer      = document.getElementById('filtersDrawer');
  const backdrop    = document.getElementById('filtersBackdrop');
  const openFilters = document.getElementById('openFilters');
  const closeFilters= document.getElementById('closeFilters');
  const applyBtn    = document.getElementById('applyFilters');
  const clearBtn    = document.getElementById('clearFilters');
  const filtersForm = document.getElementById('filtersForm');
  const minPrice    = document.getElementById('minPrice');
  const maxPrice    = document.getElementById('maxPrice');

  function openDrawer(){
    drawer?.classList.add('open');
    drawer?.setAttribute('aria-hidden','false');
    if (backdrop) backdrop.hidden = false;
    openFilters?.setAttribute('aria-expanded','true');
  }
  function closeDrawer(){
    drawer?.classList.remove('open');
    drawer?.setAttribute('aria-hidden','true');
    if (backdrop) backdrop.hidden = true;
    openFilters?.setAttribute('aria-expanded','false');
  }
  openFilters?.addEventListener('click', openDrawer);
  closeFilters?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeDrawer(); });

  /* Helpers de productos */
  const getData = (card) => ({
    title: (card.dataset.title || ''),
    price: Number(card.dataset.price || 0),
    variant: (card.dataset.variant || '').toLowerCase(),
    size: (card.dataset.size || '').toLowerCase(),
  });

  function activeFilters(){
    if (!filtersForm) return {variants: [], sizes: [], pmin:0, pmax:0};
    const f = new FormData(filtersForm);
    const variants = f.getAll('variant').map(v=>String(v).toLowerCase());
    const sizes    = f.getAll('size').map(v=>String(v).toLowerCase());
    const pmin = Number(minPrice?.value || 0);
    const pmax = Number(maxPrice?.value || 0);
    return { variants, sizes, pmin, pmax };
  }

  /* Filtrar / Buscar / Ordenar (si hay grid) */
  function applyFilters(){
    if (!grid || !cards.length) return;
    const q = (search?.value || '').toLowerCase().trim();
    const {variants, sizes, pmin, pmax} = activeFilters();
    let shown = 0;

    cards.forEach(card=>{
      const d = getData(card);
      const byVariant = !variants.length || variants.includes(d.variant);
      const bySize    = !sizes.length || sizes.includes(d.size);
      const byQuery   = !q || d.title.toLowerCase().includes(q);
      const byPrice   = (!pmin || d.price >= pmin) && (!pmax || d.price <= pmax);

      const visible = byVariant && bySize && byQuery && byPrice;
      card.style.display = visible ? '' : 'none';
      if (visible) shown++;
    });

    resultsCnt && (resultsCnt.textContent = shown.toString());
    applySort(); // mantener orden
  }

  function clearFilters(){
    filtersForm?.reset();
    if (minPrice) minPrice.value = '';
    if (maxPrice) maxPrice.value = '';
    applyFilters();
  }

  function applySort(){
    if (!grid || !cards.length) return;
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

  applyBtn?.addEventListener('click', () => { applyFilters(); closeDrawer(); });
  clearBtn?.addEventListener('click', clearFilters);
  sortSel?.addEventListener('change', applySort);
  search?.addEventListener('input', applyFilters);

  // Toggle vista
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

  /* Modal de producto con galería (si existe en esta página) */
  const productModal = document.getElementById('productModal');
  const pmClose      = productModal?.querySelector('.modal__close');
  const pmBackdrop   = productModal?.querySelector('.modal__backdrop');
  const pmTitle      = document.getElementById('modalTitle');
  const pmPrice      = document.getElementById('modalPrice');
  const pmDesc       = document.getElementById('modalDesc');
  const pmSpecs      = document.getElementById('modalSpecs');
  const pmQty        = document.getElementById('qty');
  const pmWhats      = document.getElementById('whatsBuy');
  const pmAdd        = document.getElementById('addFromModal');
  const gMain        = document.getElementById('galleryMain');
  const gThumbs      = document.getElementById('galleryThumbs');

  let gImgs = [], gIndex = 0, gTitle = '', gPrice = 0, gVariant = '', gSize = '';

  function openProductModal({title, price, images, variant, size}){
    if (!productModal) return;
    gTitle = title; gPrice = price; gVariant = variant || ''; gSize = size || '';
    pmTitle && (pmTitle.textContent = title);
    pmPrice && (pmPrice.textContent = money(price));
    pmDesc  && (pmDesc.textContent  = 'Edición con excelentes materiales y acabados. Entrega rápida y garantía.');
    if (pmSpecs){
      const v = pmSpecs.querySelector('[data-spec="variant"]');
      const s = pmSpecs.querySelector('[data-spec="size"]');
      v && (v.textContent = (variant || '—').toUpperCase());
      s && (s.textContent = (size || '—').toUpperCase());
    }
    pmQty && (pmQty.value = '1');

    gImgs = images; gIndex = 0; renderGallery();

    pmWhats && (pmWhats.href = `https://wa.me/528443288521?text=${encodeURIComponent('Hola, me interesa ' + title + ' (' + money(price) + ')')}`);

    productModal.classList.add('open');
    productModal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeProductModal(){
    if (!productModal) return;
    productModal.classList.remove('open');
    productModal.setAttribute('aria-hidden','true');
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

  // Abrir modal desde card (clic en Ver / imagen / título)
  document.querySelectorAll('.card-product').forEach(card=>{
    const openFrom = () => {
      const title = card.dataset.title || card.querySelector('h3')?.textContent?.trim() || 'Producto';
      const price = Number(card.dataset.price || 0);
      const images = (card.dataset.images || '').split('|').map(s=>s.trim()).filter(Boolean);
      const variant = (card.dataset.variant || '').toLowerCase();
      const size    = (card.dataset.size || '').toLowerCase();
      if (images.length) openProductModal({title, price, images, variant, size});
    };
    card.querySelector('.view')?.addEventListener('click', openFrom);
    card.querySelector('img')?.addEventListener('click', openFrom);
    card.querySelector('h3')?.addEventListener('click', openFrom);
  });

  /* ====== Delegación: Agregar al carrito desde cualquier botón .add-cart ====== */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-cart');
    if (!btn) return;

    const card = btn.closest('.card-product');
    if (!card) {
      console.error('No encontré la .card-product del botón');
      return;
    }

    // data-* obligatorios en cada tarjeta
    const title = card.dataset.title || card.querySelector('h3')?.textContent?.trim();
    const price = card.dataset.price || card.querySelector('.badge.price')?.textContent?.trim()?.replace(/[^\d.]/g,'');
    const ok = window.vidaCart.add({ title, price, qty: 1 });
    if (!ok) alert('No se pudo agregar al carrito. Revisa el título/precio en la tarjeta de producto.');
  });

  // Agregar desde modal con cantidad
  document.getElementById('addFromModal')?.addEventListener('click', ()=>{
    if (!gTitle || !gPrice) return;
    const q = Math.max(1, Number(pmQty?.value || 1));
    window.vidaCart.add({ title: gTitle, price: gPrice, qty: q });
  });

  /* ====== Controles del mini-cart ====== */
  const miniCart   = document.querySelector('.mini-cart');
  const cartToggle = document.querySelector('.mini-cart__toggle');
  const cartItems  = document.getElementById('cartItems');
  const cartClear  = document.getElementById('cartClear');
  const openCheckoutBtn = document.getElementById('openCheckout');

  cartToggle?.addEventListener('click', ()=>{
    if (!miniCart) return;
    const open = miniCart.classList.toggle('open');
    cartToggle.setAttribute('aria-expanded', open.toString());
  });

  cartItems?.addEventListener('click', (e)=>{
    const idx = e.target?.dataset?.idx;
    if (idx == null) return;
    const items = window.vidaCart.read();
    if (e.target.classList.contains('plus')) items[idx].qty++;
    if (e.target.classList.contains('minus')) items[idx].qty = Math.max(0, items[idx].qty - 1);
    window.vidaCart.write(items.filter(i=>i.qty>0));
    window.vidaCart.refresh();
  });

  cartClear?.addEventListener('click', ()=>{
    localStorage.removeItem('vida_cart_v1');
    window.vidaCart.refresh();
  });

  /* ====== Checkout por WhatsApp (si existe en esta página) ====== */
  const checkoutModal   = document.getElementById('checkoutModal');
  const checkoutClose   = checkoutModal?.querySelector('.modal__close');
  const checkoutBackdrop= checkoutModal?.querySelector('.modal__backdrop');
  const checkoutForm    = document.getElementById('checkoutForm');

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
    const data  = Object.fromEntries(new FormData(checkoutForm));
    const items = window.vidaCart.read();
    if (!items.length) { alert('Tu carrito está vacío.'); return; }

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

  /* ====== Init ====== */
  applyFilters();  // si no hay grid no pasa nada
  applySort();     // idem
  window.vidaCart.refresh(); // pinta mini-cart si existe
});
