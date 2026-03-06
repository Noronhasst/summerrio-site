/* ═══════════════════════════════════════════════════════════
   Summer Rio — script.js
   Cart, checkout, interactivity
   ═══════════════════════════════════════════════════════════ */

// ── STATE ───────────────────────────────────────────────────
const state = {
    cart: JSON.parse(localStorage.getItem('summerrio_cart')) || [],
};

// ── PRODUCT DATA ────────────────────────────────────────────
const PRODUCTS = {
    'brasileira-sand': {
        id: 'brasileira-sand',
        name: 'The Brasileira — Ipanema Sand',
        price: 89,
        image: 'https://images.unsplash.com/photo-1570976447640-ac859083963f?w=200&q=80&fit=crop&crop=top',
    },
    'brasileira-blue': {
        id: 'brasileira-blue',
        name: 'The Brasileira — Copacabana Blue',
        price: 89,
        image: 'https://images.unsplash.com/photo-1760473200349-4c25a37d2a47?w=200&q=80&fit=crop&crop=top',
    },
    'brasileira-red': {
        id: 'brasileira-red',
        name: 'The Brasileira — Carnaval Red',
        price: 89,
        image: 'https://images.unsplash.com/photo-1584431620769-c5d32b5f936b?w=200&q=80&fit=crop&crop=top',
    },
};

// ── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    initSwatches();
    initSizeButtons();
    initAddToBag();
    initQuickAdd();
    initCartDrawer();
    initMobileMenu();
    initScrollAnimations();
});

// ── CART LOGIC ──────────────────────────────────────────────
function addToCart(product) {
    const existing = state.cart.find(p => p.id === product.id && p.size === product.size);
    if (existing) {
        existing.qty++;
    } else {
        state.cart.push({ ...product, qty: 1 });
    }
    saveCart();
    updateCartUI();
    openCart();
}

function removeFromCart(id, size) {
    state.cart = state.cart.filter(p => !(p.id === id && p.size === size));
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('summerrio_cart', JSON.stringify(state.cart));
}

function updateCartUI() {
    // Bag count in nav
    const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
    const bagLink = document.querySelector('.bag-link');
    if (bagLink) bagLink.textContent = `Bag (${totalQty})`;

    // Cart items
    const container = document.querySelector('.cart-items');
    if (!container) return;

    if (state.cart.length === 0) {
        container.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
    } else {
        container.innerHTML = state.cart.map(item => `
      <div class="cart-item">
        <img src="${item.image || ''}" class="cart-item-img" alt="${item.name}">
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <p>Size: ${item.size} · Qty: ${item.qty}</p>
          <p>$${(item.price * item.qty).toFixed(2)}</p>
          <span class="remove-item" data-id="${item.id}" data-size="${item.size}">Remove</span>
        </div>
      </div>
    `).join('');
    }

    // Total
    const totalEl = document.querySelector('.cart-total-price');
    if (totalEl) {
        const total = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        totalEl.textContent = '$' + total.toFixed(2);
    }

    // Checkout button
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = state.cart.length === 0;
    }
}

// ── CART DRAWER ─────────────────────────────────────────────
function initCartDrawer() {
    const overlay = document.querySelector('.cart-overlay');
    const closeBtn = document.querySelector('.close-cart');

    overlay?.addEventListener('click', closeCart);
    closeBtn?.addEventListener('click', closeCart);

    // Remove item delegation
    document.querySelector('.cart-items')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item')) {
            removeFromCart(e.target.dataset.id, e.target.dataset.size);
        }
    });
}

function openCart() {
    document.querySelector('.cart-drawer')?.classList.add('active');
    document.querySelector('.cart-overlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.querySelector('.cart-drawer')?.classList.remove('active');
    document.querySelector('.cart-overlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

// ── STRIPE CHECKOUT ─────────────────────────────────────────
async function checkout() {
    if (state.cart.length === 0) return;

    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Processing...';
    }

    try {
        const response = await fetch('/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: state.cart.map(item => ({
                    name: item.name,
                    price: item.price,
                    qty: item.qty,
                    size: item.size,
                })),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Checkout failed.');
        }

        // Redirect to Stripe Checkout
        window.location.href = data.url;

    } catch (error) {
        console.error('Checkout error:', error);
        alert('Something went wrong. Please try again.');
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Checkout';
        }
    }
}

// ── COLOR SWATCHES ──────────────────────────────────────────
function initSwatches() {
    const swatches = document.querySelectorAll('.swatch');
    const colorLabel = document.querySelector('.color-section .label strong');

    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            swatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            if (colorLabel) colorLabel.textContent = swatch.title;
        });
    });
}

// ── SIZE BUTTONS ────────────────────────────────────────────
function initSizeButtons() {
    const sizeBtns = document.querySelectorAll('.size-btn');

    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// ── ADD TO BAG (main product) ───────────────────────────────
function initAddToBag() {
    const addBtn = document.querySelector('.btn-add');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        const activeColor = document.querySelector('.swatch.active');
        const activeSize = document.querySelector('.size-btn.active');
        const colorName = activeColor?.title || 'Ipanema Sand';
        const size = activeSize?.textContent || 'S';

        // Map color to product
        let productId = 'brasileira-sand';
        if (colorName.includes('Blue')) productId = 'brasileira-blue';
        if (colorName.includes('Red')) productId = 'brasileira-red';

        const product = PRODUCTS[productId];
        addToCart({ ...product, size });

        // Button feedback
        addBtn.textContent = '✓ Added!';
        addBtn.style.background = '#2d7a4f';
        setTimeout(() => {
            addBtn.textContent = 'Add to Bag';
            addBtn.style.background = '';
        }, 1500);
    });
}

// ── QUICK ADD (from product cards) ──────────────────────────
function initQuickAdd() {
    document.querySelectorAll('.quick-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const card = btn.closest('.product-card');
            const title = card.querySelector('h4')?.textContent || '';

            let productId = 'brasileira-sand';
            if (title.includes('Blue')) productId = 'brasileira-blue';
            if (title.includes('Red')) productId = 'brasileira-red';

            const product = PRODUCTS[productId];
            addToCart({ ...product, size: 'M' }); // Default size M for quick-add

            // Button feedback
            btn.textContent = '✓ Added!';
            setTimeout(() => { btn.textContent = '+ Quick Add'; }, 1200);
        });
    });
}

// ── MOBILE MENU ─────────────────────────────────────────────
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeBtn = document.querySelector('.close-mobile');
    const overlay = document.querySelector('.mobile-menu-overlay');

    function toggleMenu() {
        mobileMenu?.classList.toggle('active');
        overlay?.classList.toggle('active');
        document.body.style.overflow = mobileMenu?.classList.contains('active') ? 'hidden' : '';
    }

    hamburger?.addEventListener('click', toggleMenu);
    closeBtn?.addEventListener('click', toggleMenu);
    overlay?.addEventListener('click', toggleMenu);

    // Close on link click
    mobileMenu?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', toggleMenu);
    });
}

// ── SCROLL ANIMATIONS ───────────────────────────────────────
function initScrollAnimations() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// ── BAG LINK CLICK → OPEN CART ──────────────────────────────
document.addEventListener('click', (e) => {
    if (e.target.closest('.bag-link')) {
        e.preventDefault();
        openCart();
    }
});
