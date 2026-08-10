# ⚡ AlphaStore — Modern E-Commerce Application

AlphaStore is a full-stack, responsive e-commerce web application featuring a modern glassmorphic UI, dynamic product catalog, interactive cart drawer, product details modal, multi-step checkout workflow, and JWT user authentication with SQLite database persistence.

---

## ✨ Features

- 🛒 **Shopping Cart Drawer**: Add items, update quantities, remove items, and view live subtotal calculation.
- 🔍 **Product Details Modal**: Detailed product specs table, star ratings, customer reviews, and quantity selector.
- 💳 **Order Processing**: Multi-step checkout flow with stock reduction and unique order tracking IDs (`ORD-XXXXXX`).
- 🔐 **User Registration & Login**: Hashed passwords (`bcryptjs`) with JWT authentication token management.
- 🗄️ **SQLite Database**: Auto-initialized schema and seeded catalog (`better-sqlite3`).
- 🎨 **Glassmorphism Design**: Dark/light theme switcher, responsive layout, dynamic toast popups, and smooth micro-animations.

---

## 📁 Project Structure

```
codealpha-ecommerce/
├── public/                # Frontend Web Application
│   ├── css/
│   │   └── styles.css     # Design system, glassmorphism & responsive CSS
│   ├── js/
│   │   └── app.js         # Single-Page App engine & REST API consumer
│   └── index.html         # HTML layout, navbar, drawer & modal views
├── server/                # Backend API & Database
│   ├── db.js              # SQLite database initialization & seed dataset
│   └── server.js          # Express.js REST API routes & auth logic
├── .gitignore             # Git ignore rule file
├── package.json           # Node.js project manifest & script commands
└── README.md              # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (installed automatically with Node.js)

### Installation & Local Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/codealpha-ecommerce.git
   cd codealpha-ecommerce
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Server**:
   ```bash
   npm start
   ```

4. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Account Credentials

- **Email**: `alex@example.com`
- **Password**: `Password123!`
- *(Or click the **1-Click Demo Login** button inside the Sign In modal).*
