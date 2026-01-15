# Amazon Clone - Backend (TypeScript + Express)

## Overview
RESTful API for the Amazon Clone application built with Express.js, TypeScript, MongoDB, and JWT authentication.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT + bcryptjs
- **Validation**: Zod (planned)
- **Dev Tools**: ts-node-dev, ESLint, Prettier

## Project Structure
```
server/
├── src/
│   ├── middlewares/     # Auth and admin middleware
│   ├── model/           # Mongoose models
│   ├── routes/          # API routes
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Entry point
├── tsconfig.json        # TypeScript configuration
└── package.json
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create `config.env`** in the root:
   ```
   PORT=3000
   DB_USERNAME=your_mongodb_username
   DB_PASSWORD=your_mongodb_password
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Auth
- `POST /api/signup` - Register new user
- `POST /api/signin` - Login user
- `GET /IsTokenValid` - Validate JWT token
- `GET /` - Get user data (auth required)

### Products
- `GET /api/products?category={category}` - Get products by category
- `GET /api/products/search/:name` - Search products
- `POST /api/rate-product` - Rate a product
- `GET /api/get-product-rating/:id` - Get user's rating for product
- `GET /api/get-ratings-average/:id` - Get average rating
- `GET /api/deal-of-the-day` - Get most-rated product

### User
- `POST /api/add-to-cart` - Add product to cart
- `DELETE /api/remove-from-cart/:id` - Remove from cart
- `POST /api/save-address` - Save delivery address
- `POST /api/order` - Place an order
- `GET /api/orders/me` - Get user's orders
- `POST /api/add-to-wishlist` - Add to wishlist
- `DELETE /api/remove-from-wishlist/:id` - Remove from wishlist

### Admin
- `POST /admin/add-product` - Add new product
- `GET /admin/get-products` - Get all products
- `GET /admin/get-category-product/:category` - Get products by category
- `POST /admin/delete-product` - Delete product
- `GET /admin/get-orders` - Get all orders
- `POST /admin/change-order-status` - Update order status
- `GET /admin/analytics` - Get sales analytics

### Offers
- `POST /admin/add-four-image-offer` - Add promotional offer
- `GET /admin/get-offers` - Get all offers
- `DELETE /admin/delete-offer/:id` - Delete offer

## Migration Notes
- Migrated from JavaScript to TypeScript
- Added strong typing for all models and routes
- Improved error handling and middleware structure
- Ready for Zod validation integration
