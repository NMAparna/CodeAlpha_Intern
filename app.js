// Nexus Social — Main Application Logic
const AppState = {
  activeUserId: 1,
  currentView: 'feed', // 'feed' | 'profile'
  currentFeedType: 'all', // 'all' | 'following' | 'trending'
  viewingUserId: 1,
  users: []
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  async init() {
    console.log('Initializing Nexus Social Platform...');

    // Bind event listeners
    this.bindEvents();

    // Load initial users
    await this.loadUsers();

    // Set default active user
    if (AppState.users.length > 0) {
      AppState.activeUserId = AppState.users[0].id;
      this.updateActiveUserUI();
    }

    // Load feed and sidebar suggestions
    await this.loadFeed();
    await this.loadSuggestions();
  },

  async loadUsers() {
    try {
      AppState.users = await API.getUsers(AppState.activeUserId);
      UI.renderUserDropdown(AppState.users, AppState.activeUserId);
    } catch (err) {
      console.error('Failed to load users:', err);
      UI.showToast('Error connecting to backend server', 'error');
    }
  },

  updateActiveUserUI() {
    const activeUser = AppState.users.find(u => u.id === AppState.activeUserId);
    if (activeUser) {
      UI.renderActiveUserWidget(activeUser);
    }
  },

  bindEvents() {
    // Brand Logo -> Go to Home Feed
    document.getElementById('brand-logo').addEventListener('click', () => {
      this.switchView('feed');
      this.switchFeedTab('all');
    });

    // User Switcher Dropdown
    document.getElementById('user-select-dropdown').addEventListener('change', async (e) => {
      AppState.activeUserId = parseInt(e.target.value);
      const activeUser = AppState.users.find(u => u.id === AppState.activeUserId);
      UI.showToast(`Switched account to ${activeUser ? activeUser.display_name : 'User'}`, 'info');

      await this.loadUsers();
      this.updateActiveUserUI();

      if (AppState.currentView === 'feed') {
        await this.loadFeed();
      } else if (AppState.currentView === 'profile') {
        await this.loadProfile(AppState.viewingUserId);
      }
      await this.loadSuggestions();
    });

    // Navigation Menu Links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        const view = link.dataset.view;
        const feedType = link.dataset.feedType;

        if (view === 'profile') {
          this.loadProfile(AppState.activeUserId);
        } else if (view === 'feed') {
          this.switchFeedTab(feedType || 'all');
        }
      });
    });

    // Feed Filter Tabs
    document.querySelectorAll('.tab-btn[data-feed]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchFeedTab(tab.dataset.feed);
      });
    });

    // Compose Post — Toggle Image URL Input & Presets
    const toggleImgBtn = document.getElementById('btn-toggle-image-input');
    const imgUrlWrapper = document.getElementById('image-url-input-wrapper');
    const presetsContainer = document.getElementById('preset-image-chips-container');
    const applyImgBtn = document.getElementById('btn-apply-image-url');
    const imgPreviewContainer = document.getElementById('compose-image-preview-container');
    const imgPreview = document.getElementById('compose-image-preview');
    const removeImgBtn = document.getElementById('btn-remove-compose-image');

    toggleImgBtn.addEventListener('click', () => {
      imgUrlWrapper.classList.toggle('hidden');
      if (presetsContainer) presetsContainer.classList.toggle('hidden');
    });

    applyImgBtn.addEventListener('click', () => {
      const url = document.getElementById('post-image-url-input').value.trim();
      if (url) {
        imgPreview.src = url;
        imgPreviewContainer.classList.remove('hidden');
        imgUrlWrapper.classList.add('hidden');
        if (presetsContainer) presetsContainer.classList.add('hidden');
      }
    });

    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const url = chip.dataset.url;
        imgPreview.src = url;
        imgPreviewContainer.classList.remove('hidden');
        imgUrlWrapper.classList.add('hidden');
        if (presetsContainer) presetsContainer.classList.add('hidden');
      });
    });

    removeImgBtn.addEventListener('click', () => {
      imgPreview.src = '';
      imgPreviewContainer.classList.add('hidden');
      document.getElementById('post-image-url-input').value = '';
    });

    // Create Post Submit
    document.getElementById('btn-submit-post').addEventListener('click', () => this.handleCreatePost());
    document.getElementById('btn-create-post-header').addEventListener('click', () => {
      this.switchView('feed');
      document.getElementById('post-content-input').focus();
    });

    // Edit Profile Modal
    document.getElementById('btn-open-edit-profile').addEventListener('click', () => {
      const activeUser = AppState.users.find(u => u.id === AppState.activeUserId);
      if (activeUser) {
        document.getElementById('edit-display-name').value = activeUser.display_name;
        document.getElementById('edit-bio').value = activeUser.bio || '';
        document.getElementById('edit-avatar-url').value = activeUser.avatar_url || '';
        document.getElementById('edit-banner-url').value = activeUser.banner_url || '';
        document.getElementById('edit-profile-modal').classList.remove('hidden');
      }
    });

    document.getElementById('btn-close-edit-modal').addEventListener('click', () => {
      document.getElementById('edit-profile-modal').classList.add('hidden');
    });

    document.getElementById('btn-cancel-edit-modal').addEventListener('click', () => {
      document.getElementById('edit-profile-modal').classList.add('hidden');
    });

    document.getElementById('edit-profile-form').addEventListener('submit', (e) => this.handleSaveProfile(e));

    // Connections Modal (Followers/Following view)
    document.getElementById('btn-close-connections-modal').addEventListener('click', () => {
      document.getElementById('connections-modal').classList.add('hidden');
    });

    document.getElementById('btn-view-followers').addEventListener('click', async () => {
      const followers = await API.getFollowers(AppState.viewingUserId, AppState.activeUserId);
      UI.renderConnectionsList('Followers', followers, AppState.activeUserId, (targetId) => this.handleFollowToggle(targetId), (uId) => this.loadProfile(uId));
    });

    document.getElementById('btn-view-following').addEventListener('click', async () => {
      const following = await API.getFollowing(AppState.viewingUserId, AppState.activeUserId);
      UI.renderConnectionsList('Following', following, AppState.activeUserId, (targetId) => this.handleFollowToggle(targetId), (uId) => this.loadProfile(uId));
    });

    // Global Search Filter (Local filtering on feed)
    document.getElementById('global-search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.post-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(query)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  },

  switchView(viewName) {
    AppState.currentView = viewName;
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));

    if (viewName === 'feed') {
      document.getElementById('view-feed').classList.remove('hidden');
    } else if (viewName === 'profile') {
      document.getElementById('view-profile').classList.remove('hidden');
    }
  },

  async switchFeedTab(feedType) {
    AppState.currentFeedType = feedType;
    this.switchView('feed');

    document.querySelectorAll('.tab-btn[data-feed]').forEach(btn => {
      if (btn.dataset.feed === feedType) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    await this.loadFeed();
  },

  async loadFeed() {
    const container = document.getElementById('posts-container');
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim);"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;"></i><br><br>Loading posts...</div>`;

    try {
      const posts = await API.getPosts(AppState.currentFeedType, null, AppState.activeUserId);
      container.innerHTML = '';

      if (posts.length === 0) {
        container.innerHTML = `
          <div class="glass-card" style="text-align:center; padding:40px;">
            <i class="fa-regular fa-paper-plane" style="font-size:2.5rem; color:var(--text-dim); margin-bottom:12px;"></i>
            <h3 style="color:var(--text-main); margin-bottom:6px;">No posts in this feed yet</h3>
            <p style="color:var(--text-muted); font-size:0.9rem;">Be the first to post something exciting or follow more creators!</p>
          </div>
        `;
        return;
      }

      posts.forEach(post => {
        const postCard = UI.createPostElement(
          post,
          AppState.activeUserId,
          (postId, card) => this.handleLike(postId, card),
          (postId, card) => this.handleToggleComments(postId, card),
          (userId) => this.loadProfile(userId),
          (postId) => this.handleDeletePost(postId)
        );
        container.appendChild(postCard);
      });
    } catch (err) {
      console.error('Failed to load feed posts:', err);
      container.innerHTML = `<div style="color:red; text-align:center; padding:20px;">Failed to load feed.</div>`;
    }
  },

  async handleCreatePost() {
    const contentInput = document.getElementById('post-content-input');
    const content = contentInput.value.trim();
    const imgPreviewContainer = document.getElementById('compose-image-preview-container');
    const imgPreview = document.getElementById('compose-image-preview');

    if (!content) {
      UI.showToast('Please enter some text for your post!', 'warning');
      return;
    }

    const imageUrl = !imgPreviewContainer.classList.contains('hidden') ? imgPreview.src : null;

    try {
      const newPost = await API.createPost(AppState.activeUserId, content, imageUrl);
      UI.showToast('Post published successfully! 🚀', 'success');

      // Reset form
      contentInput.value = '';
      imgPreview.src = '';
      imgPreviewContainer.classList.add('hidden');
      document.getElementById('post-image-url-input').value = '';
      document.getElementById('image-url-input-wrapper').classList.add('hidden');

      // Refresh user stats
      await this.loadUsers();
      this.updateActiveUserUI();

      // Prepend to feed if on feed view
      if (AppState.currentView === 'feed') {
        const container = document.getElementById('posts-container');
        const postCard = UI.createPostElement(
          newPost,
          AppState.activeUserId,
          (postId, card) => this.handleLike(postId, card),
          (postId, card) => this.handleToggleComments(postId, card),
          (userId) => this.loadProfile(userId),
          (postId) => this.handleDeletePost(postId)
        );
        container.insertBefore(postCard, container.firstChild);
      }
    } catch (err) {
      console.error('Error creating post:', err);
      UI.showToast('Failed to publish post', 'error');
    }
  },

  async handleDeletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await API.deletePost(postId, AppState.activeUserId);
      UI.showToast('Post deleted', 'info');

      // Remove card from DOM
      const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (card) card.remove();

      // Refresh user stats
      await this.loadUsers();
      this.updateActiveUserUI();
    } catch (err) {
      console.error('Failed to delete post:', err);
      UI.showToast('Failed to delete post', 'error');
    }
  },

  async handleLike(postId, card) {
    try {
      const res = await API.toggleLike(postId, AppState.activeUserId);
      const likeBtn = card.querySelector('.like-btn');
      const countSpan = likeBtn.querySelector('.like-count');
      const icon = likeBtn.querySelector('i');

      countSpan.textContent = res.likes_count;

      if (res.is_liked) {
        likeBtn.classList.add('liked');
        icon.className = 'fa-solid fa-heart';
      } else {
        likeBtn.classList.remove('liked');
        icon.className = 'fa-regular fa-heart';
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  },

  async handleToggleComments(postId, card) {
    const commentsSec = card.querySelector('.comments-section');
    commentsSec.classList.toggle('hidden');

    if (!commentsSec.classList.contains('hidden')) {
      await this.loadComments(postId);

      // Attach comment submit handler
      const submitBtn = commentsSec.querySelector('.submit-comment-btn');
      const input = commentsSec.querySelector('.comment-input');

      submitBtn.onclick = async () => {
        const text = input.value.trim();
        if (!text) return;

        try {
          await API.addComment(postId, AppState.activeUserId, text);
          input.value = '';

          // Increment count badge
          const commentCountSpan = card.querySelector('.comment-count');
          commentCountSpan.textContent = parseInt(commentCountSpan.textContent) + 1;

          await this.loadComments(postId);
          UI.showToast('Comment added', 'success');
        } catch (err) {
          console.error('Error adding comment:', err);
        }
      };
    }
  },

  async loadComments(postId) {
    try {
      const comments = await API.getComments(postId);
      UI.renderCommentsList(
        postId,
        comments,
        AppState.activeUserId,
        (commentId, pId) => this.handleDeleteComment(commentId, pId),
        (userId) => this.loadProfile(userId)
      );
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  },

  async handleDeleteComment(commentId, postId) {
    try {
      await API.deleteComment(commentId, AppState.activeUserId);
      UI.showToast('Comment removed', 'info');

      const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (card) {
        const commentCountSpan = card.querySelector('.comment-count');
        const currentCount = parseInt(commentCountSpan.textContent);
        if (currentCount > 0) commentCountSpan.textContent = currentCount - 1;
      }

      await this.loadComments(postId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  },

  async handleFollowToggle(targetUserId) {
    try {
      const res = await API.toggleFollow(targetUserId, AppState.activeUserId);
      UI.showToast(res.is_following ? 'User followed!' : 'Unfollowed user', 'info');

      // Refresh users list & state
      await this.loadUsers();
      this.updateActiveUserUI();
      await this.loadSuggestions();

      if (AppState.currentView === 'profile' && AppState.viewingUserId === targetUserId) {
        await this.loadProfile(targetUserId);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  },

  async loadSuggestions() {
    try {
      const users = await API.getUsers(AppState.activeUserId);
      UI.renderSuggestions(
        users,
        AppState.activeUserId,
        (targetId) => this.handleFollowToggle(targetId),
        (userId) => this.loadProfile(userId)
      );
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  },

  async loadProfile(userId, subTab = 'posts') {
    AppState.viewingUserId = userId;
    this.switchView('profile');

    const postsTabBtn = document.getElementById('tab-profile-posts');
    const likesTabBtn = document.getElementById('tab-profile-likes');

    if (subTab === 'posts') {
      if (postsTabBtn) postsTabBtn.classList.add('active');
      if (likesTabBtn) likesTabBtn.classList.remove('active');
    } else {
      if (postsTabBtn) postsTabBtn.classList.remove('active');
      if (likesTabBtn) likesTabBtn.classList.add('active');
    }

    if (postsTabBtn) postsTabBtn.onclick = () => this.loadProfile(userId, 'posts');
    if (likesTabBtn) likesTabBtn.onclick = () => this.loadProfile(userId, 'likes');

    const profileContainer = document.getElementById('profile-posts-container');
    profileContainer.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim);"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;"></i><br><br>Loading profile...</div>`;

    try {
      const user = await API.getUserProfile(userId, AppState.activeUserId);
      UI.renderProfileHeader(
        user,
        AppState.activeUserId,
        (targetId) => this.handleFollowToggle(targetId),
        () => {}
      );

      // Load user's posts or liked posts
      let posts = [];
      if (subTab === 'posts') {
        posts = await API.getPosts('user', userId, AppState.activeUserId);
      } else {
        posts = await API.getUserLikedPosts(userId, AppState.activeUserId);
      }

      profileContainer.innerHTML = '';

      if (posts.length === 0) {
        profileContainer.innerHTML = `<div class="glass-card" style="text-align:center; padding:30px; color:var(--text-muted);">${subTab === 'posts' ? `No posts from @${user.username} yet.` : `No liked posts found.`}</div>`;
        return;
      }

      posts.forEach(post => {
        const postCard = UI.createPostElement(
          post,
          AppState.activeUserId,
          (postId, card) => this.handleLike(postId, card),
          (postId, card) => this.handleToggleComments(postId, card),
          (uId) => this.loadProfile(uId),
          (postId) => this.handleDeletePost(postId)
        );
        profileContainer.appendChild(postCard);
      });
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  },

  async handleSaveProfile(e) {
    e.preventDefault();

    const displayName = document.getElementById('edit-display-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const avatarUrl = document.getElementById('edit-avatar-url').value.trim();
    const bannerUrl = document.getElementById('edit-banner-url').value.trim();

    try {
      await API.updateProfile(AppState.activeUserId, {
        display_name: displayName,
        bio: bio,
        avatar_url: avatarUrl,
        banner_url: bannerUrl
      });

      UI.showToast('Profile updated successfully! ✨', 'success');
      document.getElementById('edit-profile-modal').classList.add('hidden');

      await this.loadUsers();
      this.updateActiveUserUI();
      if (AppState.currentView === 'profile') {
        await this.loadProfile(AppState.activeUserId);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
      UI.showToast('Failed to update profile', 'error');
    }
  }
};
