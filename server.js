const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'alphastore_secret_key_2026_jwt_token';

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
app.use(express.static(path.join(__dirname, '..', 'public')));

// Authentication Helper Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in first.' });
  }
  next();
}

// Attach auth middleware to all routes
app.use(authenticateToken);

// ==================== HEALTH & STATUS ROUTE ====================
app.get('/api/health', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;

  res.json({
    status: 'online',
    message: 'Express.js Backend & SQLite Database Operational',
    database: 'SQLite (ecommerce.db)',
    stats: {
      users: userCount,
      products: productCount,
      orders: orderCount
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== AUTH API ROUTES ====================

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, password) VALUES (?, ?, ?)
    `).run(name.trim(), email.toLowerCase().trim(), hashedPassword);

    const userId = result.lastInsertRowid;
    const token = jwt.sign({ id: userId, name: name.trim(), email: email.toLowerCase().trim(), role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: { id: userId, name: name.trim(), email: email.toLowerCase().trim(), role: 'user' }
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ user });
});

// ==================== PRODUCTS API ROUTES ====================

// Get All Products with Filtering, Search & Sorting
app.get('/api/products', (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort, featured } = req.query;

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (minPrice) {
      sql += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      sql += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (featured === 'true' || featured === '1') {
      sql += ' AND featured = 1';
    }

    // Sorting
    if (sort === 'price-low') {
      sql += ' ORDER BY price ASC';
    } else if (sort === 'price-high') {
      sql += ' ORDER BY price DESC';
    } else if (sort === 'rating') {
      sql += ' ORDER BY rating DESC';
    } else if (sort === 'newest') {
      sql += ' ORDER BY id DESC';
    } else {
      sql += ' ORDER BY featured DESC, rating DESC';
    }

    const products = db.prepare(sql).all(...params);

    // Parse specs JSON
    const parsedProducts = products.map(p => ({
      ...p,
      specs: p.specs ? JSON.parse(p.specs) : {}
    }));

    res.json(parsedProducts);
  } catch (err) {
    console.error('Fetch Products Error:', err);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Get Product Categories
app.get('/api/products/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC
    `).all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// Get Single Product details + Reviews
app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    product.specs = product.specs ? JSON.parse(product.specs) : {};

    const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC').all(req.params.id);

    res.json({ ...product, reviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product details.' });
  }
});

// Add Review to Product
app.post('/api/products/:id/reviews', (req, res) => {
  try {
    const productId = req.params.id;
    const { userName, rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ error: 'Rating and comment are required.' });
    }

    const reviewerName = req.user ? req.user.name : (userName || 'Anonymous');

    db.prepare(`
      INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)
    `).run(productId, reviewerName, parseInt(rating), comment.trim());

    // Update Product average rating and rating_count
    const stats = db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ?
    `).get(productId);

    db.prepare(`
      UPDATE products SET rating = ?, rating_count = ? WHERE id = ?
    `).run(Math.round(stats.avg_rating * 10) / 10, stats.count, productId);

    res.status(201).json({ message: 'Review added successfully!' });
  } catch (err) {
    console.error('Review Error:', err);
    res.status(500).json({ error: 'Failed to post review.' });
  }
});

// ==================== CART API ROUTES ====================

// Get Cart Items
app.get('/api/cart', (req, res) => {
  try {
    if (!req.user) {
      return res.json([]);
    }

    const items = db.prepare(`
      SELECT c.id as cart_id, c.quantity, p.* 
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `).all(req.user.id);

    const parsedItems = items.map(item => ({
      cart_id: item.cart_id,
      product_id: item.id,
      title: item.title,
      price: item.price,
      image: item.image,
      category: item.category,
      stock: item.stock,
      quantity: item.quantity,
      specs: item.specs ? JSON.parse(item.specs) : {}
    }));

    res.json(parsedItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cart.' });
  }
});

// Add / Update Cart Item
app.post('/api/cart', (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID required.' });
    }

    if (req.user) {
      const existing = db.prepare('SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
      if (existing) {
        db.prepare('UPDATE cart SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
      } else {
        db.prepare('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, productId, quantity);
      }
    }

    res.json({ message: 'Item added to cart!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart.' });
  }
});

// Update Cart Quantity
app.put('/api/cart/:cartId', (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity <= 0) {
      db.prepare('DELETE FROM cart WHERE id = ? AND user_id = ?').run(req.params.cartId, req.user.id);
    } else {
      db.prepare('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?').run(quantity, req.params.cartId, req.user.id);
    }
    res.json({ message: 'Cart updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item quantity.' });
  }
});

// Remove Cart Item
app.delete('/api/cart/:cartId', (req, res) => {
  try {
    db.prepare('DELETE FROM cart WHERE id = ? AND user_id = ?').run(req.params.cartId, req.user.id);
    res.json({ message: 'Item removed from cart.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item.' });
  }
});

// Clear Cart
app.delete('/api/cart/clear/all', (req, res) => {
  try {
    if (req.user) {
      db.prepare('DELETE FROM cart WHERE user_id = ?').run(req.user.id);
    }
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart.' });
  }
});

// ==================== ORDERS API ROUTES ====================

// Process Order Checkout
app.post('/api/orders', (req, res) => {
  try {
    const { items, totalAmount, shippingAddress, paymentMethod } = req.body;

    if (!items || !items.length || !totalAmount || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ error: 'Incomplete order payload. Address, items, and payment method are required.' });
    }

    const orderNumber = 'ORD-' + Date.now().toString().slice(-6) + '-' + Math.floor(1000 + Math.random() * 9000);
    const userId = req.user ? req.user.id : null;

    db.prepare(`
      INSERT INTO orders (order_number, user_id, items, total_amount, shipping_address, payment_method, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Processing')
    `).run(
      orderNumber,
      userId,
      JSON.stringify(items),
      totalAmount,
      JSON.stringify(shippingAddress),
      paymentMethod
    );

    // Decrement stock for products
    const updateStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
    items.forEach(item => {
      const pid = item.product_id || item.id;
      if (pid) {
        updateStock.run(item.quantity || 1, pid);
      }
    });

    // Clear user's backend cart if logged in
    if (userId) {
      db.prepare('DELETE FROM cart WHERE user_id = ?').run(userId);
    }

    res.status(201).json({
      message: 'Order placed successfully!',
      orderNumber,
      order: {
        order_number: orderNumber,
        total_amount: totalAmount,
        status: 'Processing',
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Order Processing Error:', err);
    res.status(500).json({ error: 'Failed to process order.' });
  }
});

// Get User Orders History
app.get('/api/orders', requireAuth, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC
    `).all(req.user.id);

    const parsedOrders = orders.map(o => ({
      ...o,
      items: JSON.parse(o.items),
      shipping_address: JSON.parse(o.shipping_address)
    }));

    res.json(parsedOrders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order history.' });
  }
});

// Get Specific Order Details by Order Number
app.get('/api/orders/:orderNumber', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    order.items = JSON.parse(order.items);
    order.shipping_address = JSON.parse(order.shipping_address);

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 AlphaStore E-commerce server running at http://localhost:${PORT}`);
});
