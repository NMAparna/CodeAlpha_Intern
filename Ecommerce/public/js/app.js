/* ==========================================================================
   ALPHASTORE - FRONTEND APP ENGINE
   ========================================================================== */

// Determine API base URL (supports both http://localhost:3000 and direct file:// opening)
const API_BASE = (window.location.protocol === 'file:' || window.location.origin === 'null')
  ? 'http://localhost:3000'
  : '';

// Global State Management
window.state = {
  user: JSON.parse(localStorage.getItem('alpha_user')) || null,
  token: localStorage.getItem('alpha_token') || null,
  products: [],
  cart: JSON.parse(localStorage.getItem('alpha_guest_cart')) || [],
  activeCategory: 'All',
  searchTerm: '',
  sortBy: 'featured',
  activeProduct: null,
  detailQty: 1,
  theme: localStorage.getItem('alpha_theme') || 'dark',
  backendOnline: false
};

// ==================== UI & THEME HELPERS ====================

function updateThemeIcon() {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = window.state.theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span style="font-size:0.9rem; font-weight:600; flex:1;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
window.showToast = showToast;

function updateUserUI() {
  const btnLabel = document.getElementById('user-btn-label');
  const profName = document.getElementById('profile-name');
  const profEmail = document.getElementById('profile-email');

  if (window.state.user) {
    if (btnLabel) btnLabel.textContent = window.state.user.name.split(' ')[0] || 'Account';
    if (profName) profName.textContent = window.state.user.name;
    if (profEmail) profEmail.textContent = window.state.user.email;
  } else {
    if (btnLabel) btnLabel.textContent = 'Sign In';
  }
}
window.updateUserUI = updateUserUI;

// ==================== MODAL & DRAWER CONTROLLERS ====================

function openAuthModal() {
  const backdrop = document.getElementById('auth-modal-backdrop');
  const formView = document.getElementById('auth-form-view');
  const profileView = document.getElementById('user-profile-view');

  if (!backdrop) return;

  if (window.state.user) {
    if (formView) formView.style.display = 'none';
    if (profileView) profileView.style.display = 'block';
    loadOrderHistory();
  } else {
    if (formView) formView.style.display = 'block';
    if (profileView) profileView.style.display = 'none';
  }

  backdrop.classList.add('active');
  backdrop.style.opacity = '1';
  backdrop.style.visibility = 'visible';
  backdrop.style.pointerEvents = 'auto';
  backdrop.style.display = 'flex';
}
window.openAuthModal = openAuthModal;

function closeAuthModal() {
  const backdrop = document.getElementById('auth-modal-backdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
    backdrop.style.opacity = '0';
    backdrop.style.visibility = 'hidden';
    backdrop.style.pointerEvents = 'none';
    backdrop.style.display = 'none';
  }
}
window.closeAuthModal = closeAuthModal;

function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (drawer) drawer.classList.add('active');
  if (backdrop) {
    backdrop.classList.add('active');
    backdrop.style.opacity = '1';
    backdrop.style.visibility = 'visible';
    backdrop.style.pointerEvents = 'auto';
  }
}
window.openCartDrawer = openCartDrawer;

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) {
    backdrop.classList.remove('active');
    backdrop.style.opacity = '0';
    backdrop.style.visibility = 'hidden';
    backdrop.style.pointerEvents = 'none';
  }
}
window.closeCartDrawer = closeCartDrawer;

function closeProductModal() {
  const backdrop = document.getElementById('product-modal-backdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
    backdrop.style.opacity = '0';
    backdrop.style.visibility = 'hidden';
    backdrop.style.pointerEvents = 'none';
    backdrop.style.display = 'none';
  }
}
window.closeProductModal = closeProductModal;

function closeCheckoutModal() {
  const backdrop = document.getElementById('checkout-modal-backdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
    backdrop.style.opacity = '0';
    backdrop.style.visibility = 'hidden';
    backdrop.style.pointerEvents = 'none';
    backdrop.style.display = 'none';
  }
}
window.closeCheckoutModal = closeCheckoutModal;

// ==================== AUTHENTICATION & LOGIN LOGIC ====================

async function handleLogin(email, password) {
  const loginBtns = document.querySelectorAll('#login-form button');
  loginBtns.forEach(btn => btn.disabled = true);

  try {
    let data;
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or password');
    } catch (netErr) {
      if (netErr.message && netErr.message !== 'Failed to fetch') throw netErr;
      // Fallback guest session mode
      data = {
        token: 'jwt_token_' + Date.now(),
        user: { id: 1, name: email.split('@')[0] || 'Demo User', email: email, role: 'user' }
      };
    }

    window.state.token = data.token;
    window.state.user = data.user;
    localStorage.setItem('alpha_token', data.token);
    localStorage.setItem('alpha_user', JSON.stringify(data.user));

    updateUserUI();
    await fetchCart();
    closeAuthModal();
    showToast(`Welcome back, ${data.user.name}!`, 'success');
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  } finally {
    loginBtns.forEach(btn => btn.disabled = false);
  }
}
window.handleLogin = handleLogin;

async function handleRegister(name, email, password) {
  const regBtns = document.querySelectorAll('#register-form button');
  regBtns.forEach(btn => btn.disabled = true);

  try {
    let data;
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
    } catch (netErr) {
      if (netErr.message && netErr.message !== 'Failed to fetch') throw netErr;
      data = {
        token: 'jwt_token_' + Date.now(),
        user: { id: Date.now(), name: name, email: email, role: 'user' }
      };
    }

    window.state.token = data.token;
    window.state.user = data.user;
    localStorage.setItem('alpha_token', data.token);
    localStorage.setItem('alpha_user', JSON.stringify(data.user));

    updateUserUI();
    await fetchCart();
    closeAuthModal();
    showToast(`Account created! Welcome, ${data.user.name}!`, 'success');
  } catch (err) {
    showToast(err.message || 'Failed to create account', 'error');
  } finally {
    regBtns.forEach(btn => btn.disabled = false);
  }
}
window.handleRegister = handleRegister;

window.handleDemoLogin = function(e) {
  if (e) e.preventDefault();
  handleLogin('alex@example.com', 'Password123!');
  return false;
};

window.submitLoginForm = function(e) {
  if (e) e.preventDefault();
  const emailEl = document.getElementById('login-email');
  const passEl = document.getElementById('login-password');
  const email = emailEl ? emailEl.value.trim() : 'alex@example.com';
  const password = passEl ? passEl.value : 'Password123!';
  handleLogin(email, password);
  return false;
};

window.submitRegisterForm = function(e) {
  if (e) e.preventDefault();
  const nameEl = document.getElementById('reg-name');
  const emailEl = document.getElementById('reg-email');
  const passEl = document.getElementById('reg-password');
  const name = nameEl ? nameEl.value.trim() : 'New User';
  const email = emailEl ? emailEl.value.trim() : 'user@example.com';
  const password = passEl ? passEl.value : 'Password123!';
  handleRegister(name, email, password);
  return false;
};

function handleLogout() {
  window.state.user = null;
  window.state.token = null;
  window.state.cart = [];
  localStorage.removeItem('alpha_token');
  localStorage.removeItem('alpha_user');
  localStorage.removeItem('alpha_guest_cart');
  updateUserUI();
  renderCart();
  closeAuthModal();
  showToast('Logged out successfully.', 'info');
}
window.handleLogout = handleLogout;

// ==================== API FETCHING & CART ====================

async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      const data = await res.json();
      window.state.backendOnline = true;
      const pill = document.getElementById('server-status-pill');
      const text = document.getElementById('server-status-text');
      if (pill) pill.className = 'server-status-pill';
      if (text) text.textContent = `Express + SQLite Live (${data.stats.products} Products)`;
    } else {
      throw new Error();
    }
  } catch (err) {
    window.state.backendOnline = false;
    const pill = document.getElementById('server-status-pill');
    const text = document.getElementById('server-status-text');
    if (pill) pill.className = 'server-status-pill offline';
    if (text) text.textContent = 'Backend Offline';
  }
}

async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1rem;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:2.5rem; color:var(--accent-primary); margin-bottom:1rem;"></i>
      <p style="color:var(--text-secondary);">Connecting to Express.js Backend & SQLite Database...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams();
    if (window.state.activeCategory && window.state.activeCategory !== 'All') params.append('category', window.state.activeCategory);
    if (window.state.searchTerm) params.append('search', window.state.searchTerm);
    if (window.state.sortBy) params.append('sort', window.state.sortBy);

    const response = await fetch(`${API_BASE}/api/products?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to load products');

    window.state.products = await response.json();
    renderProducts();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 3rem 1rem; color:var(--danger);">
        <i class="fa-solid fa-circle-exclamation" style="font-size:2.5rem; margin-bottom:1rem;"></i>
        <h3>Express Backend Not Connected</h3>
        <p style="margin:0.5rem 0;">Make sure your server is running by typing <code>npm start</code> in terminal.</p>
      </div>
    `;
  }
}

async function fetchCart() {
  if (window.state.token) {
    try {
      const response = await fetch(`${API_BASE}/api/cart`, {
        headers: { 'Authorization': `Bearer ${window.state.token}` }
      });
      if (response.ok) {
        window.state.cart = await response.json();
      }
    } catch (err) {
      console.error('Error fetching backend cart:', err);
    }
  }
  renderCart();
}

function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  let starsHtml = '';
  for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fa-solid fa-star"></i>';
  if (halfStar) starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
  for (let i = 0; i < emptyStars; i++) starsHtml += '<i class="fa-regular fa-star"></i>';
  return starsHtml;
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (window.state.products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1rem; color:var(--text-muted);">
        <i class="fa-solid fa-magnifying-glass" style="font-size:3rem; margin-bottom:1rem;"></i>
        <h3>No products found</h3>
        <p>Try searching for something else or reset your filter criteria.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = window.state.products.map(p => `
    <div class="product-card" data-id="${p.id}" onclick="openProductModal(${p.id})">
      <div class="product-image-wrap">
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
        <img src="${p.image}" alt="${p.title}" loading="lazy">
        <div class="product-quick-actions">
          <button class="btn-icon quick-view-btn" onclick="event.stopPropagation(); openProductModal(${p.id})" title="Quick Details">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>
      <div class="product-info">
        <span class="product-category">${p.category}</span>
        <h3 class="product-title">${p.title}</h3>
        <div class="product-rating">
          ${renderStars(p.rating)}
          <span class="rating-count">(${p.rating_count})</span>
        </div>
        <div class="product-bottom">
          <div class="product-price">
            <span class="current-price">$${p.price.toFixed(2)}</span>
            ${p.original_price ? `<span class="original-price">$${p.original_price.toFixed(2)}</span>` : ''}
          </div>
          <button class="btn btn-primary add-cart-btn" onclick="event.stopPropagation(); addToCart(${p.id}, 1)">
            <i class="fa-solid fa-cart-plus"></i> Add
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCart() {
  const countBadge = document.getElementById('cart-count');
  const cartBody = document.getElementById('cart-body');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');

  const totalCount = window.state.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (countBadge) {
    countBadge.textContent = totalCount;
    countBadge.classList.add('bump');
    setTimeout(() => countBadge.classList.remove('bump'), 200);
  }

  if (!cartBody) return;

  if (window.state.cart.length === 0) {
    cartBody.innerHTML = `
      <div class="cart-empty-state">
        <i class="fa-solid fa-bag-shopping"></i>
        <h3>Your cart is empty</h3>
        <p style="font-size:0.9rem; margin-top:0.4rem;">Browse our catalog and discover amazing gear!</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '$0.00';
    if (totalEl) totalEl.textContent = '$0.00';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (checkoutBtn) checkoutBtn.disabled = false;
  let subtotal = 0;

  cartBody.innerHTML = `
    <div class="cart-items-list">
      ${window.state.cart.map((item, index) => {
        const price = item.price || 0;
        subtotal += price * item.quantity;
        const cartId = item.cart_id || index;
        const prodId = item.product_id || item.id;
        return `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.title}" class="cart-item-img">
            <div class="cart-item-details">
              <div class="cart-item-title">${item.title}</div>
              <div class="cart-item-price">$${price.toFixed(2)}</div>
              <div class="cart-item-controls">
                <div class="qty-stepper">
                  <button class="qty-btn" onclick="updateCartItemQty('${cartId}', ${prodId}, -1)">-</button>
                  <span class="qty-val">${item.quantity}</span>
                  <button class="qty-btn" onclick="updateCartItemQty('${cartId}', ${prodId}, 1)">+</button>
                </div>
                <button class="btn-icon" onclick="removeCartItem('${cartId}', ${prodId})" style="width:28px; height:28px; font-size:0.8rem; color:var(--danger);" title="Remove Item">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${subtotal.toFixed(2)}`;
}

async function addToCart(productId, quantity = 1) {
  const product = window.state.products.find(p => p.id === productId);
  if (!product) return;

  if (window.state.token) {
    try {
      await fetch(`${API_BASE}/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.state.token}`
        },
        body: JSON.stringify({ productId, quantity })
      });
      await fetchCart();
    } catch (err) {
      console.error(err);
    }
  } else {
    const existing = window.state.cart.find(item => item.product_id === productId || item.id === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      window.state.cart.push({
        id: product.id,
        product_id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        category: product.category,
        stock: product.stock,
        quantity: quantity
      });
    }
    localStorage.setItem('alpha_guest_cart', JSON.stringify(window.state.cart));
    renderCart();
  }

  showToast(`Added "${product.title}" to cart!`, 'success');
}
window.addToCart = addToCart;

async function updateCartItemQty(cartId, productId, change) {
  if (window.state.token) {
    const item = window.state.cart.find(i => i.cart_id == cartId || i.product_id == productId);
    if (!item) return;
    const newQty = item.quantity + change;
    try {
      await fetch(`${API_BASE}/api/cart/${cartId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.state.token}`
        },
        body: JSON.stringify({ quantity: newQty })
      });
      await fetchCart();
    } catch (err) { console.error(err); }
  } else {
    const item = window.state.cart.find(i => i.id === productId || i.product_id === productId);
    if (item) {
      item.quantity += change;
      if (item.quantity <= 0) {
        window.state.cart = window.state.cart.filter(i => i !== item);
      }
      localStorage.setItem('alpha_guest_cart', JSON.stringify(window.state.cart));
      renderCart();
    }
  }
}
window.updateCartItemQty = updateCartItemQty;

async function removeCartItem(cartId, productId) {
  if (window.state.token) {
    try {
      await fetch(`${API_BASE}/api/cart/${cartId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${window.state.token}` }
      });
      await fetchCart();
    } catch (err) { console.error(err); }
  } else {
    window.state.cart = window.state.cart.filter(i => (i.id !== productId && i.product_id !== productId));
    localStorage.setItem('alpha_guest_cart', JSON.stringify(window.state.cart));
    renderCart();
  }
  showToast('Item removed from cart', 'info');
}
window.removeCartItem = removeCartItem;

async function openProductModal(productId) {
  const backdrop = document.getElementById('product-modal-backdrop');
  window.state.detailQty = 1;
  const qtyVal = document.getElementById('detail-qty-val');
  if (qtyVal) qtyVal.textContent = 1;

  try {
    const res = await fetch(`${API_BASE}/api/products/${productId}`);
    if (!res.ok) throw new Error('Product not found');
    const product = await res.json();
    window.state.activeProduct = product;

    const img = document.getElementById('detail-img');
    const cat = document.getElementById('detail-category');
    const title = document.getElementById('detail-title');
    const rating = document.getElementById('detail-rating');
    const price = document.getElementById('detail-price');
    const origPrice = document.getElementById('detail-original-price');
    const desc = document.getElementById('detail-desc');
    const specsTable = document.getElementById('detail-specs-table');
    const reviewsList = document.getElementById('detail-reviews-list');
    const authorInput = document.getElementById('review-author-input');

    if (img) img.src = product.image;
    if (cat) cat.textContent = product.category;
    if (title) title.textContent = product.title;
    if (rating) rating.innerHTML = `${renderStars(product.rating)} <span>${product.rating.toFixed(1)} / 5.0 (${product.rating_count} reviews)</span>`;
    if (price) price.textContent = `$${product.price.toFixed(2)}`;
    if (origPrice) origPrice.textContent = product.original_price ? `$${product.original_price.toFixed(2)}` : '';
    if (desc) desc.textContent = product.description;

    if (specsTable) {
      if (product.specs && Object.keys(product.specs).length > 0) {
        specsTable.innerHTML = Object.entries(product.specs).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
      } else {
        specsTable.innerHTML = '<tr><td colspan="2">Standard specs apply.</td></tr>';
      }
    }

    if (reviewsList) {
      if (product.reviews && product.reviews.length > 0) {
        reviewsList.innerHTML = product.reviews.map(r => `
          <div class="review-card">
            <div class="review-header">
              <span class="review-author">${r.user_name}</span>
              <span style="color:var(--warning); font-size:0.85rem;">${renderStars(r.rating)}</span>
            </div>
            <p style="font-size:0.9rem; color:var(--text-secondary);">${r.comment}</p>
          </div>
        `).join('');
      } else {
        reviewsList.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No customer reviews yet.</p>';
      }
    }

    if (authorInput) {
      if (window.state.user) {
        authorInput.value = window.state.user.name;
        authorInput.disabled = true;
      } else {
        authorInput.value = '';
        authorInput.disabled = false;
      }
    }

    if (backdrop) {
      backdrop.classList.add('active');
      backdrop.style.opacity = '1';
      backdrop.style.visibility = 'visible';
      backdrop.style.pointerEvents = 'auto';
      backdrop.style.display = 'flex';
    }
  } catch (err) {
    showToast('Could not load product details.', 'error');
  }
}
window.openProductModal = openProductModal;

function openCheckout() {
  const backdrop = document.getElementById('checkout-modal-backdrop');
  if (window.state.cart.length === 0) {
    showToast('Your cart is empty! Add products first.', 'error');
    return;
  }

  let subtotal = window.state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalPayable = document.getElementById('checkout-total-payable');
  if (totalPayable) totalPayable.textContent = `$${subtotal.toFixed(2)}`;

  const shipName = document.getElementById('ship-name');
  const shipEmail = document.getElementById('ship-email');

  if (window.state.user) {
    if (shipName) shipName.value = window.state.user.name || '';
    if (shipEmail) shipEmail.value = window.state.user.email || '';
  }

  const formEl = document.getElementById('checkout-form');
  const successEl = document.getElementById('order-success-view');
  if (formEl) formEl.style.display = 'block';
  if (successEl) successEl.style.display = 'none';

  closeCartDrawer();

  if (backdrop) {
    backdrop.classList.add('active');
    backdrop.style.opacity = '1';
    backdrop.style.visibility = 'visible';
    backdrop.style.pointerEvents = 'auto';
    backdrop.style.display = 'flex';
  }
}
window.openCheckout = openCheckout;

async function handleCheckoutSubmit(e) {
  if (e) e.preventDefault();

  const shipName = document.getElementById('ship-name');
  const shipEmail = document.getElementById('ship-email');
  const shipPhone = document.getElementById('ship-phone');
  const shipAddress = document.getElementById('ship-address');
  const shipCity = document.getElementById('ship-city');
  const shipZip = document.getElementById('ship-zip');
  const paySelect = document.getElementById('payment-method-select');
  const btnPlace = document.getElementById('place-order-btn');
  const formEl = document.getElementById('checkout-form');

  const shippingAddress = {
    name: shipName ? shipName.value : 'Guest User',
    email: shipEmail ? shipEmail.value : 'guest@example.com',
    phone: shipPhone ? shipPhone.value : '555-0192',
    address: shipAddress ? shipAddress.value : '123 Main St',
    city: shipCity ? shipCity.value : 'San Francisco',
    zip: shipZip ? shipZip.value : '94107'
  };

  const paymentMethod = paySelect ? paySelect.value : 'Credit Card';
  const totalAmount = window.state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (btnPlace) {
    btnPlace.disabled = true;
    btnPlace.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...';
  }

  try {
    const response = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(window.state.token ? { 'Authorization': `Bearer ${window.state.token}` } : {})
      },
      body: JSON.stringify({
        items: window.state.cart,
        totalAmount,
        shippingAddress,
        paymentMethod
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Checkout failed');

    window.state.cart = [];
    localStorage.removeItem('alpha_guest_cart');
    renderCart();

    if (formEl) formEl.style.display = 'none';
    const successOrderEl = document.getElementById('success-order-id');
    if (successOrderEl) successOrderEl.textContent = data.orderNumber;
    const successViewEl = document.getElementById('order-success-view');
    if (successViewEl) successViewEl.style.display = 'block';

    showToast('Order placed successfully!', 'success');
  } catch (err) {
    showToast(err.message || 'Error processing order.', 'error');
  } finally {
    if (btnPlace) {
      btnPlace.disabled = false;
      btnPlace.innerHTML = '<i class="fa-solid fa-check-circle"></i> Place Order & Pay Now';
    }
  }
}
window.submitCheckoutForm = handleCheckoutSubmit;

async function loadOrderHistory() {
  const container = document.getElementById('orders-history-list');
  if (!container || !window.state.token) return;

  container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:1rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading order history...</p>';

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: { 'Authorization': `Bearer ${window.state.token}` }
    });
    if (!res.ok) throw new Error();
    const orders = await res.json();

    if (orders.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:1rem;">No previous orders found.</p>';
      return;
    }

    container.innerHTML = orders.map(o => `
      <div style="background:var(--bg-tertiary); padding:0.85rem; border-radius:var(--radius-sm); margin-bottom:0.75rem;">
        <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.85rem; margin-bottom:0.3rem;">
          <span class="gradient-text">${o.order_number}</span>
          <span style="color:var(--success); background:rgba(16,185,129,0.15); padding:0.1rem 0.5rem; border-radius:var(--radius-full);">${o.status}</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; justify-content:space-between;">
          <span>${new Date(o.created_at).toLocaleDateString()} • ${o.items.length} items</span>
          <strong style="color:var(--text-primary);">$${o.total_amount.toFixed(2)}</strong>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger); font-size:0.85rem;">Failed to load order history.</p>';
  }
}

// ==================== DOM CONTENT LOADED BINDINGS ====================

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-theme', window.state.theme);
  updateThemeIcon();
  updateUserUI();

  checkBackendHealth();
  fetchCart();
  loadProducts();

  // Search Debounce
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        window.state.searchTerm = e.target.value.trim();
        loadProducts();
      }, 300);
    });
  }

  // Category Pills
  const categoryPills = document.getElementById('category-pills');
  if (categoryPills) {
    categoryPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      window.state.activeCategory = pill.getAttribute('data-category');
      loadProducts();
    });
  }

  // Sort Select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      window.state.sortBy = e.target.value;
      loadProducts();
    });
  }

  // Tabs Switcher inside Auth Modal
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      if (loginForm) loginForm.style.display = 'block';
      if (regForm) regForm.style.display = 'none';
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      if (loginForm) loginForm.style.display = 'none';
      if (regForm) regForm.style.display = 'block';
    });
  }

  // Detail Modal Qty Stepper
  const minusBtn = document.getElementById('detail-qty-minus');
  const plusBtn = document.getElementById('detail-qty-plus');
  const qtyVal = document.getElementById('detail-qty-val');

  if (minusBtn && plusBtn && qtyVal) {
    minusBtn.addEventListener('click', () => {
      if (window.state.detailQty > 1) {
        window.state.detailQty--;
        qtyVal.textContent = window.state.detailQty;
      }
    });

    plusBtn.addEventListener('click', () => {
      window.state.detailQty++;
      qtyVal.textContent = window.state.detailQty;
    });
  }

  const detailAddBtn = document.getElementById('detail-add-cart-btn');
  if (detailAddBtn) {
    detailAddBtn.addEventListener('click', () => {
      if (window.state.activeProduct) {
        addToCart(window.state.activeProduct.id, window.state.detailQty);
        closeProductModal();
      }
    });
  }
});
