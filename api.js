// API Client helper for Nexus Social
const API_BASE = '/api';

const API = {
  // User API calls
  async getUsers(currentUserId = 0) {
    const res = await fetch(`${API_BASE}/users?currentUserId=${currentUserId}`);
    return res.json();
  },

  async getUserProfile(userIdOrUsername, currentUserId = 0) {
    const res = await fetch(`${API_BASE}/users/${userIdOrUsername}?currentUserId=${currentUserId}`);
    return res.json();
  },

  async updateProfile(userId, data) {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async toggleFollow(targetUserId, followerId) {
    const res = await fetch(`${API_BASE}/users/${targetUserId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower_id: followerId })
    });
    return res.json();
  },

  async getFollowers(userId, currentUserId = 0) {
    const res = await fetch(`${API_BASE}/users/${userId}/followers?currentUserId=${currentUserId}`);
    return res.json();
  },

  async getFollowing(userId, currentUserId = 0) {
    const res = await fetch(`${API_BASE}/users/${userId}/following?currentUserId=${currentUserId}`);
    return res.json();
  },

  async getUserLikedPosts(userId, currentUserId = 0) {
    const res = await fetch(`${API_BASE}/users/${userId}/likes?currentUserId=${currentUserId}`);
    return res.json();
  },

  // Post API calls
  async getPosts(feedType = 'all', userId = null, currentUserId = 0) {
    let url = `${API_BASE}/posts?feedType=${feedType}&currentUserId=${currentUserId}`;
    if (userId) url += `&userId=${userId}`;
    const res = await fetch(url);
    return res.json();
  },

  async createPost(userId, content, imageUrl = null) {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, content, image_url: imageUrl })
    });
    return res.json();
  },

  async deletePost(postId, userId) {
    const res = await fetch(`${API_BASE}/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    return res.json();
  },

  async toggleLike(postId, userId) {
    const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    return res.json();
  },

  // Comment API calls
  async getComments(postId) {
    const res = await fetch(`${API_BASE}/posts/${postId}/comments`);
    return res.json();
  },

  async addComment(postId, userId, content) {
    const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, content })
    });
    return res.json();
  },

  async deleteComment(commentId, userId) {
    const res = await fetch(`${API_BASE}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    return res.json();
  }
};
