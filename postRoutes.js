const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database');

// GET posts feed
// Parameters: ?feedType=all|following|user & userId=1 & currentUserId=1
router.get('/', async (req, res) => {
  try {
    const { feedType = 'all', userId, currentUserId = 0 } = req.query;
    const cUserId = parseInt(currentUserId) || 0;

    let sql = `
      SELECT p.id, p.content, p.image_url, p.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (CASE WHEN EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) THEN 1 ELSE 0 END) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;

    const params = [cUserId];

    if (feedType === 'following' && cUserId > 0) {
      sql += ` WHERE p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) OR p.user_id = ? `;
      params.push(cUserId, cUserId);
    } else if (feedType === 'user' && userId) {
      sql += ` WHERE p.user_id = ? `;
      params.push(parseInt(userId));
    } else if (feedType === 'trending') {
      sql += ` ORDER BY likes_count DESC, p.created_at DESC `;
      const posts = await dbAsync.all(sql, params);
      return res.json(posts);
    }

    sql += ` ORDER BY p.created_at DESC `;

    const posts = await dbAsync.all(sql, params);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single post
router.get('/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const currentUserId = parseInt(req.query.currentUserId) || 0;

    const post = await dbAsync.get(`
      SELECT p.id, p.content, p.image_url, p.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (CASE WHEN EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) THEN 1 ELSE 0 END) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [currentUserId, postId]);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create post
router.post('/', async (req, res) => {
  try {
    const { user_id, content, image_url } = req.body;

    if (!user_id || !content || content.trim() === '') {
      return res.status(400).json({ error: 'user_id and non-empty content are required' });
    }

    const result = await dbAsync.run(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [parseInt(user_id), content.trim(), image_url || null]
    );

    const createdPost = await dbAsync.get(`
      SELECT p.id, p.content, p.image_url, p.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar_url,
        0 as likes_count, 0 as comments_count, 0 as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [result.lastID]);

    res.status(201).json(createdPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE post
router.delete('/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { user_id } = req.body;

    const post = await dbAsync.get('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (user_id && post.user_id !== parseInt(user_id)) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    await dbAsync.run('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST toggle like/unlike post
router.post('/:id/like', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const existing = await dbAsync.get(
      'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, user_id]
    );

    let is_liked = false;
    if (existing) {
      await dbAsync.run('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, user_id]);
      is_liked = false;
    } else {
      await dbAsync.run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, user_id]);
      is_liked = true;
    }

    const likes_count = await dbAsync.get(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = ?',
      [postId]
    );

    res.json({
      success: true,
      is_liked,
      likes_count: likes_count.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
