# Nexus Social Media Platform 🌐

A modern, full-stack mini social media application featuring **User Profiles**, **Posts & Comments**, and a **Like/Follow System** with dark glassmorphism aesthetics.

![Nexus Social](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80)

## ✨ Key Features

- 👤 **User Profiles**: Profiles with cover banners, avatars, bio text, post counts, follower & following counts.
- 🔄 **Multi-Account Switcher**: Easily switch active logged-in users (`@alex_dev`, `@sarah_design`, `@tech_guru`, `@elena_photos`) to test multi-user interactions.
- 📝 **Posts & Feed Filtering**: Create text and image posts. Filter feed by **All Posts**, **Following Feed**, or **Trending**.
- 💬 **Comments System**: Inline comment threads under every post with dynamic updates and deletion.
- ❤️ **Like System**: Heart button with micro-animations and favorited post tracking.
- 👥 **Follow System**: Follow / unfollow creators with dynamic feed integration and interactive followers/following modals.

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS (Dark Glassmorphism, CSS Variables, Flexbox/Grid), JavaScript (Fetch API, DOM Utilities)
- **Backend**: Node.js, Express.js REST API
- **Database**: SQLite (`sqlite3`) with automatic table creation & sample data seeding

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- Git

### Installation & Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nexus-social-media.git
   cd nexus-social-media
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   Navigate to `http://localhost:5000`

## 📁 Project Structure

```
├── routes/
│   ├── userRoutes.js      # User profiles & follow routes
│   ├── postRoutes.js      # Posts feed & likes routes
│   └── commentRoutes.js   # Comment thread routes
├── public/
│   ├── index.html         # Single Page App layout
│   ├── css/styles.css     # Glassmorphism design system
│   └── js/
│       ├── api.js         # API client module
│       ├── ui.js          # DOM rendering templates
│       └── app.js         # State & event handlers
├── database.js            # SQLite connection & auto-seeding
├── server.js              # Express server entry point
├── package.json           # Project metadata & scripts
└── .gitignore             # Ignored files (node_modules, db)
```

## 📜 License

MIT License
