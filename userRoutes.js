const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database');

// GET all users (with follower/following metrics)
router.get('/', async (req, res) => {
  try {
    const currentUserId = req.query.currentUserId ? parseInt(req.query.currentUserId) : 0;
    const users = await dbAsync.all(`
      SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.banner_url, u.created_at,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
        (CASE WHEN EXISTS (SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) THEN 1 ELSE 0 END) as is_following
      FROM users u
      ORDER BY u.id ASC
    `, [currentUserId]);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single user profile
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.query.currentUserId ? parseInt(req.query.currentUserId) : 0;

    let user;
    if (isNaN(userId)) {
      user = await dbAsync.get('SELECT * FROM users WHERE username = ?', [userId]);
    } else {
      user = await dbAsync.get('SELECT * FROM users WHERE id = ?', [parseInt(userId)]);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get statistics
    const stats = await dbAsync.get(`
      SELECT 
        (SELECT COUNT(*) FROM posts WHERE user_id = ?) as posts_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
        (CASE WHEN EXISTS (SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?) THEN 1 ELSE 0 END) as is_following
    `, [user.id, user.id, user.id, currentUserId, user.id]);

    res.json({
      ...user,
      ...stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update user profile
router.put('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { display_name, bio, avatar_url, banner_url } = req.body;

    await dbAsync.run(`
      UPDATE users 
      SET display_name = COALESCE(?, display_name),
          bio = COALESCE(?, bio),
          avatar_url = COALESCE(?, avatar_url),
          banner_url = COALESCE(?, banner_url)
      WHERE id = ?
    `, [display_name, bio, avatar_url, banner_url, userId]);

    const updatedUser = await dbAsync.get('SELECT * FROM users WHERE id = ?', [userId]);
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST toggle follow/unfollow user
router.post('/:id/follow', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { follower_id } = req.body;

    if (!follower_id) {
      return res.status(400).json({ error: 'follower_id is required' });
    }

    if (parseInt(follower_id) === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existing = await dbAsync.get(
      'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?',
      [follower_id, targetUserId]
    );

    let is_following = false;
    if (existing) {
      // Unfollow
      await dbAsync.run(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [follower_id, targetUserId]
      );
      is_following = false;
    } else {
      // Follow
      await dbAsync.run(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [follower_id, targetUserId]
      );
      is_following = true;
    }

    const followers_count = await dbAsync.get(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
      [targetUserId]
    );

    res.json({
      success: true,
      is_following,
      followers_count: followers_count.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET followers of user
router.get('/:id/followers', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.query.currentUserId ? parseInt(req.query.currentUserId) : 0;

    const followers = await dbAsync.all(`
      SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url,
        (CASE WHEN EXISTS (SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) THEN 1 ELSE 0 END) as is_following
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `, [currentUserId, userId]);

    res.json(followers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user liked posts
router.get('/:id/likes', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.query.currentUserId ? parseInt(req.query.currentUserId) : 0;

    const posts = await dbAsync.all(`
      SELECT p.id, p.content, p.image_url, p.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (CASE WHEN EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) THEN 1 ELSE 0 END) as is_liked
      FROM likes l
      JOIN posts p ON l.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `, [currentUserId, userId]);

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
