const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'ecommerce.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDatabase() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Products Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      category TEXT NOT NULL,
      image TEXT NOT NULL,
      rating REAL DEFAULT 4.5,
      rating_count INTEGER DEFAULT 12,
      stock INTEGER DEFAULT 50,
      featured INTEGER DEFAULT 0,
      badge TEXT,
      specs TEXT
    );
  `);

  // 3. Reviews Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // 4. Orders Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      items TEXT NOT NULL,
      total_amount REAL NOT NULL,
      shipping_address TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT DEFAULT 'Processing',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 5. Cart Table (User-specific persistent cart)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );
  `);

  // Seed default demo user if not existing
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const hashedPassword = bcrypt.hashSync('Password123!', 10);
    db.prepare(`
      INSERT INTO users (name, email, password, role) 
      VALUES ('Alex Morgan', 'alex@example.com', ?, 'user')
    `).run(hashedPassword);

    const adminPassword = bcrypt.hashSync('AdminPass123!', 10);
    db.prepare(`
      INSERT INTO users (name, email, password, role) 
      VALUES ('System Admin', 'admin@alphastore.com', ?, 'admin')
    `).run(adminPassword);

    console.log('✅ Demo users seeded (alex@example.com / Password123!)');
  }

  // Seed products if not existing
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (productCount.count === 0) {
    const productsData = [
      {
        title: "Aura Pro Wireless Headphones",
        description: "Immerse yourself in high-fidelity acoustics with active noise cancellation, 40-hour battery life, and ultra-soft memory foam ear cushions.",
        price: 299.99,
        original_price: 349.99,
        category: "Audio",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
        rating_count: 142,
        stock: 35,
        featured: 1,
        badge: "Best Seller",
        specs: JSON.stringify({
          "Connectivity": "Bluetooth 5.3 & 3.5mm Aux",
          "Battery Life": "Up to 40 Hours (ANC On)",
          "Driver Size": "40mm Custom Titanium",
          "Weight": "250g",
          "Warranty": "2 Years"
        })
      },
      {
        title: "Nova Ultra Smartwatch Series X",
        description: "Next-generation health metrics, bright AMOLED sapphire display, dual-frequency GPS, and sleek aerospace-grade titanium frame.",
        price: 399.00,
        original_price: 450.00,
        category: "Wearables",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
        rating: 4.9,
        rating_count: 98,
        stock: 20,
        featured: 1,
        badge: "Hot Choice",
        specs: JSON.stringify({
          "Display": "1.92-inch AMOLED Sapphire Glass",
          "Water Resistance": "50 Meters (5 ATM)",
          "Sensors": "ECG, SpO2, Heart Rate, Temperature",
          "Battery Life": "Up to 7 Days",
          "Compatibility": "iOS & Android"
        })
      },
      {
        title: "Apex Mechanical Gaming Keyboard",
        description: "Crafted for speed and tactile feedback with hot-swappable optical switches, per-key RGB backlighting, and solid aluminum chassis.",
        price: 149.50,
        original_price: 179.99,
        category: "Accessories",
        image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
        rating: 4.7,
        rating_count: 76,
        stock: 45,
        featured: 1,
        badge: "15% OFF",
        specs: JSON.stringify({
          "Switch Type": "Tactile Optical Switches",
          "Layout": "75% Compact Layout",
          "Keycaps": "Double-shot PBT",
          "RGB": "16.8 Million Colors",
          "Cable": "Detachable Braided USB-C"
        })
      },
      {
        title: "Zenith Studio Monitor Speakers",
        description: "Professional reference studio monitors delivering crystal-clear highs, warm mids, and deep resonance for producers and audiophiles.",
        price: 449.00,
        original_price: 499.00,
        category: "Audio",
        image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80",
        rating: 4.9,
        rating_count: 54,
        stock: 12,
        featured: 0,
        badge: "Top Rated",
        specs: JSON.stringify({
          "Power Output": "120W RMS Peak",
          "Frequency Range": "42Hz - 22kHz",
          "Inputs": "XLR, 1/4\" TRS, RCA, Bluetooth",
          "Enclosure": "High-Density MDF Cabinet"
        })
      },
      {
        title: "Vortex Ergonomic Wireless Mouse",
        description: "Ergonomic vertical design engineered to prevent wrist strain with hyper-fast scroll wheel and multi-device seamless switching.",
        price: 89.99,
        original_price: 109.99,
        category: "Accessories",
        image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
        rating: 4.6,
        rating_count: 110,
        stock: 60,
        featured: 0,
        badge: "Popular",
        specs: JSON.stringify({
          "DPI Range": "200 to 8000 DPI",
          "Battery": "Rechargeable Li-Po (70 Days)",
          "Connectivity": "Logi Bolt & Bluetooth",
          "Buttons": "7 Programmable Buttons"
        })
      },
      {
        title: "Lumien Ambient Smart Light Bar",
        description: "Dynamic RGB light bars with screen sync technology, voice assistant control, and customizable ambient light presets.",
        price: 119.00,
        original_price: 139.00,
        category: "Smart Home",
        image: "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=800&q=80",
        rating: 4.5,
        rating_count: 62,
        stock: 25,
        featured: 1,
        badge: "New Arrival",
        specs: JSON.stringify({
          "Color Options": "16 Million Colors + Tunable White",
          "Smart Ecosystems": "Alexa, Google Home, Apple Home",
          "Control Method": "App, Voice, Touch Control Box",
          "Mounting": "Desk Stands & TV Mounts Included"
        })
      },
      {
        title: "Prism 4K HDR USB-C Monitor",
        description: "27-inch 4K IPS display with 99% DCI-P3 color accuracy, 90W USB-C power delivery, and ultra-thin bezel design for creators.",
        price: 649.99,
        original_price: 729.99,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
        rating_count: 83,
        stock: 15,
        featured: 1,
        badge: "Featured",
        specs: JSON.stringify({
          "Resolution": "3840 x 2160 (4K UHD)",
          "Panel Type": "IPS Anti-glare",
          "Refresh Rate": "75Hz",
          "Ports": "USB-C (90W), HDMI 2.1, DisplayPort 1.4",
          "Color Gamut": "99% DCI-P3 / 100% sRGB"
        })
      },
      {
        title: "SonicBuds ANC True Wireless",
        description: "Pocket-sized wireless earbuds featuring spatial audio, custom EQ tuning, IPX5 sweat resistance, and wireless charging case.",
        price: 129.99,
        original_price: 159.99,
        category: "Audio",
        image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80",
        rating: 4.7,
        rating_count: 215,
        stock: 80,
        featured: 0,
        badge: "Best Value",
        specs: JSON.stringify({
          "Playtime": "8h + 24h with Charging Case",
          "Microphones": "6 Mics with AI Beamforming",
          "Water Resistance": "IPX5",
          "Codec Support": "LDAC, AAC, SBC"
        })
      },
      {
        title: "Quantum PowerBank 25,000mAh",
        description: "High-capacity portable charger with 100W Fast Charging, digital LED status display, and simultaneous charging for 3 devices.",
        price: 79.99,
        original_price: 99.99,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1609592424089-8d1844284d72?auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
        rating_count: 140,
        stock: 50,
        featured: 0,
        badge: "Essential",
        specs: JSON.stringify({
          "Capacity": "25,000 mAh (92.5Wh)",
          "Max Output": "100W PD USB-C",
          "Ports": "2x USB-C PD, 1x USB-A QC 3.0",
          "Weight": "480g"
        })
      },
      {
        title: "Helix Desk Organizer Dock",
        description: "Minimalist solid walnut wood and aluminum desk station with fast MagSafe wireless charger and cable management channels.",
        price: 85.00,
        original_price: 95.00,
        category: "Accessories",
        image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80",
        rating: 4.6,
        rating_count: 47,
        stock: 30,
        featured: 0,
        badge: "Handcrafted",
        specs: JSON.stringify({
          "Material": "American Walnut Wood & Anodized Aluminum",
          "Wireless Charging": "15W MagSafe Compatible",
          "Dimensions": "28 x 14 x 4 cm"
        })
      },
      {
        title: "Aero Drone 4K Pro Camera",
        description: "Ultra-compact folding quadcopter featuring 3-axis mechanical gimbal 4K HDR camera, 34-min flight time, and obstacle sensing.",
        price: 799.00,
        original_price: 899.00,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80",
        rating: 4.9,
        rating_count: 88,
        stock: 10,
        featured: 1,
        badge: "Premium",
        specs: JSON.stringify({
          "Video Resolution": "4K at 60fps / 1080p at 120fps",
          "Flight Time": "Up to 34 Minutes",
          "Transmission Range": "10 km HD Transmission",
          "Weight": "249g Ultra Lightweight"
        })
      },
      {
        title: "Pulse Smart Fitness Band",
        description: "Lightweight 24/7 activity tracker with vivid color touch screen, sleep quality scoring, stress tracking, and 14-day battery.",
        price: 59.99,
        original_price: 69.99,
        category: "Wearables",
        image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80",
        rating: 4.4,
        rating_count: 175,
        stock: 65,
        featured: 0,
        badge: "Bestseller",
        specs: JSON.stringify({
          "Display": "1.47-inch AMOLED Touchscreen",
          "Battery Life": "Up to 14 Days Normal Usage",
          "Sports Modes": "96 Exercise Modes",
          "Water Resistance": "5 ATM Water Resistant"
        })
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO products (title, description, price, original_price, category, image, rating, rating_count, stock, featured, badge, specs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    productsData.forEach(p => {
      insertStmt.run(p.title, p.description, p.price, p.original_price, p.category, p.image, p.rating, p.rating_count, p.stock, p.featured, p.badge, p.specs);
    });

    console.log('✅ Products seeded successfully (12 base products)');

    // Seed sample reviews
    const insertReview = db.prepare(`
      INSERT INTO reviews (product_id, user_name, rating, comment)
      VALUES (?, ?, ?, ?)
    `);

    insertReview.run(1, "David K.", 5, "Outstanding sound clarity! The ANC blocks out airplane noise perfectly.");
    insertReview.run(1, "Sarah M.", 4, "Super comfortable for long study sessions. Battery life is true to promise.");
    insertReview.run(2, "James L.", 5, "Best smart watch I've owned. The titanium body feels very luxurious.");
    insertReview.run(3, "Emily R.", 5, "Key feel and switches are super responsive for competitive gaming.");
  }

  // Seed additional products to expand catalog
  const currentProdCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (currentProdCount < 18) {
    const additionalProducts = [
      {
        title: "Titanium 3-in-1 Wireless Charging Stand",
        description: "Charge your phone, smartwatch, and wireless earbuds simultaneously on a single ultra-sleek anodized aluminum stand.",
        price: 119.99,
        original_price: 139.99,
        category: "Accessories",
        image: "https://images.unsplash.com/photo-1622445268465-843dcb074a3f?auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
        rating_count: 89,
        stock: 40,
        featured: 1,
        badge: "New Arrival",
        specs: JSON.stringify({
          "Charging Speed": "15W Fast MagSafe + 5W Watch + 5W Buds",
          "Materials": "Aircraft Grade Aluminum & Silicone",
          "Safety": "Overheat & Foreign Object Protection"
        })
      },
      {
        title: "Nebula 1080p Smart Cinema Mini Projector",
        description: "Portable Full HD cinema projector with built-in autofocus, dual 8W speakers, Android TV app ecosystem, and 4-hour battery.",
        price: 299.00,
        original_price: 349.00,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
        rating: 4.7,
        rating_count: 112,
        stock: 18,
        featured: 1,
        badge: "Hot Deal",
        specs: JSON.stringify({
          "Native Resolution": "1920 x 1080 Full HD",
          "Brightness": "500 ANSI Lumens",
          "Screen Size": "Up to 120-inch Projection",
          "Battery": "12,500 mAh (4 Hours Playback)"
        })
      },
      {
        title: "EchoSphere Smart Home AI Hub",
        description: "Centralized smart home controller featuring 360-degree spatial audio, room occupancy sensors, and responsive voice recognition.",
        price: 159.99,
        original_price: 189.99,
        category: "Smart Home",
        image: "https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&w=800&q=80",
        rating: 4.6,
        rating_count: 64,
        stock: 22,
        featured: 0,
        badge: "Top Rated",
        specs: JSON.stringify({
          "Speakers": "3-inch Woofer + Dual Tweeters",
          "Wireless Protocols": "Wi-Fi 6, Zigbee, Thread, Matter",
          "Privacy": "Physical Mic Mute Switch"
        })
      },
      {
        title: "OmniSound Wooden Studio Headphones",
        description: "Hand-turned natural walnut earcups providing acoustic resonance, high-grade planar magnetic drivers, and plush leather headband.",
        price: 219.00,
        original_price: 249.00,
        category: "Audio",
        image: "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80",
        rating: 4.9,
        rating_count: 95,
        stock: 14,
        featured: 1,
        badge: "Craftsman",
        specs: JSON.stringify({
          "Driver Type": "50mm Planar Magnetic",
          "Frequency Response": "10Hz - 40kHz",
          "Impedance": "32 Ohms",
          "Earcups": "Natural American Walnut Wood"
        })
      },
      {
        title: "Chronos Vintage Leather Smartwatch",
        description: "Classic timepiece aesthetics fused with modern heart rate monitoring, sleep tracking, notifications, and genuine Italian leather strap.",
        price: 279.50,
        original_price: 310.00,
        category: "Wearables",
        image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80",
        rating: 4.7,
        rating_count: 73,
        stock: 28,
        featured: 0,
        badge: "Luxury",
        specs: JSON.stringify({
          "Case Material": "316L Stainless Steel",
          "Strap": "22mm Quick-Release Italian Leather",
          "Battery Life": "Up to 10 Days",
          "Display": "1.3-inch Circular OLED"
        })
      },
      {
        title: "CyberDeck XL RGB Gaming Desk Mat",
        description: "Micro-textured cloth surface for optical precision mouse tracking with 12 dynamic RGB lighting modes and water-resistant coating.",
        price: 45.00,
        original_price: 55.00,
        category: "Accessories",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
        rating_count: 130,
        stock: 75,
        featured: 0,
        badge: "Gamer Choice",
        specs: JSON.stringify({
          "Dimensions": "900 x 400 x 4 mm",
          "Base": "Non-Slip Natural Rubber",
          "RGB Modes": "12 Modes with Memory Function"
        })
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO products (title, description, price, original_price, category, image, rating, rating_count, stock, featured, badge, specs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    additionalProducts.forEach(p => {
      const exists = db.prepare('SELECT id FROM products WHERE title = ?').get(p.title);
      if (!exists) {
        insertStmt.run(p.title, p.description, p.price, p.original_price, p.category, p.image, p.rating, p.rating_count, p.stock, p.featured, p.badge, p.specs);
      }
    });

    console.log('✅ Additional products seeded successfully into SQLite');
  }
}

// Run DB setup on require
initDatabase();

module.exports = db;
