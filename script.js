/* script.js */

// State Management
const state = {
    cart: JSON.parse(localStorage.getItem('summerrio_cart')) || [],
    sizeUnit: localStorage.getItem('summerrio_size_pref') || 'BR', // 'BR', 'AU', 'INTL'
    drawerOpen: false
};

// DOM Elements
const cartDrawer = document.querySelector('.cart-drawer');
const menuOverlay = document.querySelector('.menu-overlay');
const cartOverlay = document.querySelector('.cart-overlay');
const mobileMenu = document.querySelector('.mobile-menu');
const cartCount = document.querySelector('.cart-count');
const cartItemsContainer = document.querySelector('.cart-items');
const cartTotal = document.querySelector('.cart-total-price');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    initEventListeners();
    initSizeGuide();
});

// Event Listeners
function initEventListeners() {
    // Mobile Menu
    document.querySelector('.hamburger')?.addEventListener('click', toggleMobileMenu);
    document.querySelector('.close-menu')?.addEventListener('click', toggleMobileMenu);

    // Cart Drawer
    document.querySelector('.cart-icon')?.addEventListener('click', toggleCart);
    document.querySelector('.close-cart')?.addEventListener('click', toggleCart);
    overlay?.addEventListener('click', () => {
        closeAllDrawers();
    });

    // Add to Cart Buttons (Global delegation)
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.add-to-cart-btn')) {
            const btn = e.target.closest('.add-to-cart-btn');
            const product = {
                id: btn.dataset.id,
                name: btn.dataset.name,
                price: parseFloat(btn.dataset.price),
                size: document.querySelector('.size-select')?.value || 'M',
                image: btn.dataset.image
            };
            addToCart(product);
        }
    });

    // Cart Actions (Remove/Qty)
    cartItemsContainer?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item')) {
            const id = e.target.dataset.id;
            const size = e.target.dataset.size;
            removeFromCart(id, size);
        }
    });

    // Modal Close
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
}

// UI Functions
function toggleMobileMenu() {
    mobileMenu.classList.toggle('active');
    menuOverlay.classList.toggle('active');
}

function toggleCart() {
    cartDrawer.classList.toggle('active');
    cartOverlay.classList.toggle('active');
}

function closeAllDrawers() {
    mobileMenu?.classList.remove('active');
    cartDrawer?.classList.remove('active');
    menuOverlay?.classList.remove('active');
    cartOverlay?.classList.remove('active');
    document.querySelector('.modal')?.classList.remove('active');
}

function closeModal() {
    document.querySelector('.modal')?.classList.remove('active');

    if (!cartDrawer.classList.contains('active')) {
        cartOverlay?.classList.remove('active');
        menuOverlay?.classList.remove('active');
    }
}

// Cart Logic
function addToCart(product) {
    const existing = state.cart.find(p => p.id === product.id && p.size === product.size);
    if (existing) {
        existing.qty++;
    } else {
        state.cart.push({ ...product, qty: 1 });
    }
    saveCart();
    updateCartUI();
    if (!cartDrawer.classList.contains('active')) toggleCart();
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
    // Count
    const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartCount) cartCount.textContent = totalQty;

    // Items
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = state.cart.map(item => `
            <div class="cart-item">
                <img src="${item.image || 'https://via.placeholder.com/80x100'}" class="cart-item-img" alt="${item.name}">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>Size: ${item.size}</p>
                    <p>$${item.price} x ${item.qty}</p>
                    <span class="remove-item" style="cursor:pointer; text-decoration:underline; font-size:0.8rem;" data-id="${item.id}" data-size="${item.size}">Remove</span>
                </div>
            </div>
        `).join('');
    }

    // Total
    if (cartTotal) {
        const total = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        cartTotal.textContent = '$' + total.toFixed(2);
    }

    // Update checkout button state
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = state.cart.length === 0;
        checkoutBtn.style.opacity = state.cart.length === 0 ? '0.5' : '1';
    }
}

// Quantity Update
function updateQty(id, size, delta) {
    const item = state.cart.find(p => p.id === id && p.size === size);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        removeFromCart(id, size);
        return;
    }
    saveCart();
    updateCartUI();
}

// Checkout — Stripe Integration
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

// Size Guide Logic
function initSizeGuide() {
    const unitSelectors = document.querySelectorAll('.unit-selector');

    // Set initial active state
    updateSizeTables(state.sizeUnit);

    unitSelectors.forEach(btn => {
        if (btn.dataset.unit === state.sizeUnit) btn.classList.add('active');

        btn.addEventListener('click', (e) => {
            // Update state
            state.sizeUnit = e.target.dataset.unit;
            localStorage.setItem('summerrio_size_pref', state.sizeUnit);

            // Update UI buttons
            unitSelectors.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Update Tables
            updateSizeTables(state.sizeUnit);
        });
    });
}

function updateSizeTables(unit) {
    document.querySelectorAll('.size-table').forEach(table => {
        if (table.dataset.unit === unit || table.dataset.unit === 'ALL') {
            table.style.display = 'table';
        } else {
            table.style.display = 'none';
        }
    });
}
