const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database');

// GET comments for a post
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);

    const comments = await dbAsync.all(`
      SELECT c.id, c.post_id, c.content, c.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);

    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add comment to post
router.post('/posts/:postId/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const { user_id, content } = req.body;

    if (!user_id || !content || content.trim() === '') {
      return res.status(400).json({ error: 'user_id and non-empty content are required' });
    }

    const postExists = await dbAsync.get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!postExists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const result = await dbAsync.run(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, parseInt(user_id), content.trim()]
    );

    const createdComment = await dbAsync.get(`
      SELECT c.id, c.post_id, c.content, c.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.lastID]);

    res.status(201).json(createdComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE comment
router.delete('/comments/:id', async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const { user_id } = req.body;

    const comment = await dbAsync.get('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (user_id && comment.user_id !== parseInt(user_id)) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await dbAsync.run('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
