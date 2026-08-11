// UI Templates & DOM Helpers for Nexus Social
const UI = {
  // Time formatting helper
  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  // Show toast notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-bell'}"></i>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // Render User Selector Dropdown in Navbar
  renderUserDropdown(users, activeUserId) {
    const select = document.getElementById('user-select-dropdown');
    select.innerHTML = users.map(u => `
      <option value="${u.id}" ${u.id === activeUserId ? 'selected' : ''}>
        ${u.display_name} (@${u.username})
      </option>
    `).join('');
  },

  // Render Left Sidebar Active User Widget
  renderActiveUserWidget(user) {
    const container = document.getElementById('active-user-widget');
    if (!user) return;

    container.innerHTML = `
      <img src="${user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'}" alt="${user.display_name}" class="avatar avatar-lg">
      <div class="active-user-name">${user.display_name}</div>
      <div class="active-user-handle">@${user.username}</div>
      <div class="user-quick-stats">
        <div class="stat-box">
          <span class="num">${user.posts_count || 0}</span>
          <span class="lbl">Posts</span>
        </div>
        <div class="stat-box">
          <span class="num">${user.followers_count || 0}</span>
          <span class="lbl">Followers</span>
        </div>
        <div class="stat-box">
          <span class="num">${user.following_count || 0}</span>
          <span class="lbl">Following</span>
        </div>
      </div>
    `;

    // Update compose avatar
    const composeAvatar = document.getElementById('compose-user-avatar');
    if (composeAvatar) composeAvatar.src = user.avatar_url;
  },

  // Render Post Card
  createPostElement(post, activeUserId, onLike, onCommentToggle, onProfileClick, onDelete) {
    const card = document.createElement('div');
    card.className = 'glass-card post-card';
    card.dataset.postId = post.id;

    const isOwner = post.user_id === activeUserId;
    const mediaHtml = post.image_url ? `
      <div class="post-media">
        <img src="${post.image_url}" alt="Post attachment" loading="lazy">
      </div>
    ` : '';

    card.innerHTML = `
      <div class="post-header">
        <div class="post-author" data-user-id="${post.user_id}">
          <img src="${post.avatar_url}" alt="${post.display_name}" class="avatar avatar-md">
          <div class="author-meta">
            <span class="author-name">${post.display_name}</span>
            <span class="author-handle-time">@${post.username} • ${this.formatTime(post.created_at)}</span>
          </div>
        </div>
        ${isOwner ? `
          <button class="btn-icon delete-post-btn" title="Delete post" data-post-id="${post.id}">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        ` : ''}
      </div>

      <div class="post-content">${this.escapeHtml(post.content)}</div>

      ${mediaHtml}

      <div class="post-actions">
        <button class="action-btn like-btn ${post.is_liked ? 'liked' : ''}" data-post-id="${post.id}">
          <i class="${post.is_liked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          <span class="like-count">${post.likes_count}</span>
        </button>

        <button class="action-btn comment-btn" data-post-id="${post.id}">
          <i class="fa-regular fa-comment"></i>
          <span class="comment-count">${post.comments_count}</span>
        </button>
      </div>

      <!-- Comments Container -->
      <div class="comments-section hidden" id="comments-container-${post.id}">
        <div class="comment-input-box">
          <input type="text" placeholder="Write a comment..." class="comment-input" data-post-id="${post.id}">
          <button class="btn btn-sm btn-primary submit-comment-btn" data-post-id="${post.id}">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
        <div class="comments-list" id="comments-list-${post.id}">
          <!-- Comments loaded dynamically -->
        </div>
      </div>
    `;

    // Event Listeners for Card
    const authorEl = card.querySelector('.post-author');
    if (authorEl && onProfileClick) {
      authorEl.addEventListener('click', () => onProfileClick(post.user_id));
    }

    const likeBtn = card.querySelector('.like-btn');
    if (likeBtn && onLike) {
      likeBtn.addEventListener('click', () => onLike(post.id, card));
    }

    const commentBtn = card.querySelector('.comment-btn');
    if (commentBtn && onCommentToggle) {
      commentBtn.addEventListener('click', () => onCommentToggle(post.id, card));
    }

    const deleteBtn = card.querySelector('.delete-post-btn');
    if (deleteBtn && onDelete) {
      deleteBtn.addEventListener('click', () => onDelete(post.id));
    }

    return card;
  },

  // Render Comments List under Post
  renderCommentsList(postId, comments, activeUserId, onDeleteComment, onProfileClick) {
    const listContainer = document.getElementById(`comments-list-${postId}`);
    if (!listContainer) return;

    if (comments.length === 0) {
      listContainer.innerHTML = `<div style="text-align:center; padding:10px; color:var(--text-dim); font-size:0.85rem;">No comments yet. Be the first!</div>`;
      return;
    }

    listContainer.innerHTML = comments.map(c => {
      const isOwner = c.user_id === activeUserId;
      return `
        <div class="comment-item" data-comment-id="${c.id}">
          <img src="${c.avatar_url}" alt="${c.display_name}" class="avatar avatar-sm comment-avatar" data-user-id="${c.user_id}">
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-author" data-user-id="${c.user_id}">${c.display_name}</span>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="comment-time">${this.formatTime(c.created_at)}</span>
                ${isOwner ? `<button class="btn-icon delete-comment-btn" style="width:24px;height:24px;font-size:0.75rem;" data-comment-id="${c.id}"><i class="fa-solid fa-xmark"></i></button>` : ''}
              </div>
            </div>
            <div class="comment-text">${this.escapeHtml(c.content)}</div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events to comment authors and delete buttons
    listContainer.querySelectorAll('.comment-author, .comment-avatar').forEach(el => {
      el.addEventListener('click', (e) => {
        const uId = e.currentTarget.dataset.userId;
        if (uId && onProfileClick) onProfileClick(parseInt(uId));
      });
    });

    listContainer.querySelectorAll('.delete-comment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cId = parseInt(e.currentTarget.dataset.commentId);
        if (cId && onDeleteComment) onDeleteComment(cId, postId);
      });
    });
  },

  // Render Suggested Creators in Right Sidebar
  renderSuggestions(users, activeUserId, onFollowToggle, onProfileClick) {
    const container = document.getElementById('suggestions-container');
    const suggestions = users.filter(u => u.id !== activeUserId);

    if (suggestions.length === 0) {
      container.innerHTML = `<div style="color:var(--text-dim); font-size:0.85rem;">No user suggestions.</div>`;
      return;
    }

    container.innerHTML = suggestions.map(u => `
      <div class="suggestion-item">
        <div class="suggestion-user" data-user-id="${u.id}">
          <img src="${u.avatar_url}" alt="${u.display_name}" class="avatar avatar-sm">
          <div class="suggestion-info">
            <span class="suggestion-name">${u.display_name}</span>
            <span class="suggestion-handle">@${u.username}</span>
          </div>
        </div>
        <button class="btn btn-sm ${u.is_following ? 'btn-secondary' : 'btn-outline'} follow-btn" data-user-id="${u.id}">
          ${u.is_following ? 'Following' : 'Follow'}
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.suggestion-user').forEach(el => {
      el.addEventListener('click', () => onProfileClick(parseInt(el.dataset.userId)));
    });

    container.querySelectorAll('.follow-btn').forEach(btn => {
      btn.addEventListener('click', () => onFollowToggle(parseInt(btn.dataset.userId)));
    });
  },

  // Render User Profile View
  renderProfileHeader(user, activeUserId, onFollowToggle, onEditClick) {
    const isSelf = user.id === activeUserId;

    document.getElementById('profile-banner-img').src = user.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe';
    document.getElementById('profile-avatar-img').src = user.avatar_url;
    document.getElementById('profile-display-name').textContent = user.display_name;
    document.getElementById('profile-username').textContent = `@${user.username}`;
    document.getElementById('profile-bio').textContent = user.bio || 'No bio provided.';
    document.getElementById('profile-posts-count').textContent = user.posts_count || 0;
    document.getElementById('profile-followers-count').textContent = user.followers_count || 0;
    document.getElementById('profile-following-count').textContent = user.following_count || 0;

    const actionBox = document.getElementById('profile-follow-action-box');
    const editBtn = document.getElementById('btn-open-edit-profile');

    if (isSelf) {
      editBtn.classList.remove('hidden');
      actionBox.innerHTML = '';
    } else {
      editBtn.classList.add('hidden');
      actionBox.innerHTML = `
        <button class="btn ${user.is_following ? 'btn-secondary' : 'btn-primary'} follow-btn" id="btn-profile-follow" data-user-id="${user.id}">
          ${user.is_following ? '<i class="fa-solid fa-user-check"></i> Following' : '<i class="fa-solid fa-user-plus"></i> Follow'}
        </button>
      `;

      document.getElementById('btn-profile-follow').addEventListener('click', () => {
        onFollowToggle(user.id);
      });
    }
  },

  // Render Connections Modal List
  renderConnectionsList(title, users, activeUserId, onFollowToggle, onProfileClick) {
    document.getElementById('connections-modal-title').textContent = title;
    const container = document.getElementById('connections-list-container');

    if (users.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-dim);">No users found.</div>`;
    } else {
      container.innerHTML = users.map(u => `
        <div class="suggestion-item">
          <div class="suggestion-user" data-user-id="${u.id}">
            <img src="${u.avatar_url}" alt="${u.display_name}" class="avatar avatar-sm">
            <div class="suggestion-info">
              <span class="suggestion-name">${u.display_name}</span>
              <span class="suggestion-handle">@${u.username}</span>
            </div>
          </div>
          ${u.id !== activeUserId ? `
            <button class="btn btn-sm ${u.is_following ? 'btn-secondary' : 'btn-outline'} follow-btn" data-user-id="${u.id}">
              ${u.is_following ? 'Following' : 'Follow'}
            </button>
          ` : ''}
        </div>
      `).join('');

      container.querySelectorAll('.suggestion-user').forEach(el => {
        el.addEventListener('click', () => {
          document.getElementById('connections-modal').classList.add('hidden');
          onProfileClick(parseInt(el.dataset.userId));
        });
      });

      container.querySelectorAll('.follow-btn').forEach(btn => {
        btn.addEventListener('click', () => onFollowToggle(parseInt(btn.dataset.userId)));
      });
    }

    document.getElementById('connections-modal').classList.remove('hidden');
  },

  escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
};
