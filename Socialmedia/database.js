const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'social_media.db');
const db = new sqlite3.Database(dbPath);

// Helper methods returning Promises for async/await usage
const dbAsync = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

async function initDatabase() {
  db.serialize(async () => {
    // Enable foreign keys
    await dbAsync.run('PRAGMA foreign_keys = ON;');

    // Users table
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        bio TEXT,
        avatar_url TEXT,
        banner_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Posts table
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Comments table
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Likes table
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Follows table
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Check if seeding is needed
    const userCount = await dbAsync.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      console.log('Seeding initial demo data...');
      await seedData();
    }
  });
}

async function seedData() {
  // Insert initial users
  const users = [
    {
      username: 'alex_dev',
      display_name: 'Alex Rivera',
      bio: 'Full-stack Architect & UI Enthusiast 🚀 Building the future of social apps.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
    },
    {
      username: 'sarah_design',
      display_name: 'Sarah Chen',
      bio: 'Lead Product Designer ✨ Passionate about minimal aesthetics & micro-interactions.',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
      banner_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80'
    },
    {
      username: 'tech_guru',
      display_name: 'Marcus Vance',
      bio: 'AI Researcher & Open Source Contributor. Coffee lover ☕',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      banner_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80'
    },
    {
      username: 'elena_photos',
      display_name: 'Elena Rostova',
      bio: 'Digital artist & landscape photographer 📸 Wandering around the globe.',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
      banner_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
    }
  ];

  for (const u of users) {
    await dbAsync.run(
      'INSERT INTO users (username, display_name, bio, avatar_url, banner_url) VALUES (?, ?, ?, ?, ?)',
      [u.username, u.display_name, u.bio, u.avatar_url, u.banner_url]
    );
  }

  // Insert sample posts
  const posts = [
    {
      user_id: 1,
      content: 'Just launched our new glassmorphism UI framework! 🎨 Glass effects and smooth gradient micro-interactions make all the difference. What do you think?',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80'
    },
    {
      user_id: 2,
      content: 'Designing for accessibility isn\'t an afterthought—it\'s the core foundation of great product design. Typography, contrast ratios, and clear spatial hierarchy lead to happier users! 💡',
      image_url: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=1000&q=80'
    },
    {
      user_id: 3,
      content: 'Exploring the latest breakthroughs in local LLMs and agentic coding workflows. The speed of innovation right now is truly incredible! 🤖🔥',
      image_url: null
    },
    {
      user_id: 4,
      content: 'Sunset over the Nordic fjords yesterday evening. Nature always provides the best color palettes! 🏔️✨',
      image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80'
    }
  ];

  for (const p of posts) {
    await dbAsync.run(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [p.user_id, p.content, p.image_url]
    );
  }

  // Insert sample comments
  const comments = [
    { post_id: 1, user_id: 2, content: 'This looks stunning Alex! Love the frosted glass vibe.' },
    { post_id: 1, user_id: 3, content: 'Clean code and sleek animations! Is this live on GitHub?' },
    { post_id: 2, user_id: 1, content: '100% agreed Sarah. Spatial hierarchy is so underrated.' },
    { post_id: 4, user_id: 2, content: 'Breathtaking capture Elena! The lighting is magical.' }
  ];

  for (const c of comments) {
    await dbAsync.run(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [c.post_id, c.user_id, c.content]
    );
  }

  // Insert sample likes
  const likes = [
    { post_id: 1, user_id: 2 },
    { post_id: 1, user_id: 3 },
    { post_id: 1, user_id: 4 },
    { post_id: 2, user_id: 1 },
    { post_id: 2, user_id: 3 },
    { post_id: 4, user_id: 1 },
    { post_id: 4, user_id: 2 }
  ];

  for (const l of likes) {
    await dbAsync.run(
      'INSERT INTO likes (post_id, user_id) VALUES (?, ?)',
      [l.post_id, l.user_id]
    );
  }

  // Insert sample follows
  // User 1 (Alex) follows User 2 (Sarah) and User 4 (Elena)
  // User 2 (Sarah) follows User 1 (Alex) and User 3 (Marcus)
  // User 3 (Marcus) follows User 1 (Alex)
  // User 4 (Elena) follows User 2 (Sarah)
  const follows = [
    { follower_id: 1, following_id: 2 },
    { follower_id: 1, following_id: 4 },
    { follower_id: 2, following_id: 1 },
    { follower_id: 2, following_id: 3 },
    { follower_id: 3, following_id: 1 },
    { follower_id: 4, following_id: 2 }
  ];

  for (const f of follows) {
    await dbAsync.run(
      'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
      [f.follower_id, f.following_id]
    );
  }

  console.log('Demo data successfully seeded.');
}

module.exports = { db, dbAsync, initDatabase };
