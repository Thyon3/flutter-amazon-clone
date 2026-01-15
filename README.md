# Amazon Clone - Full Stack E-commerce Application

## Overview
A comprehensive e-commerce platform featuring a Flutter mobile application and TypeScript Express backend, following Clean Architecture and modern best practices.

## Project Structure

```
Amazon Clone/
├── amazoneclonefrontend/    # Flutter mobile app (Clean Architecture + BLoC)
├── server/                  # Express.js TypeScript backend
└── README.md               # This file
```

## Features

### User Features
- ✅ User authentication (Sign Up, Sign In)
- ✅ Token-based session management
- 🚧 Product browsing by category
- 🚧 Product search
- 🚧 Shopping cart management
- 🚧 Order placement and tracking
- 🚧 Product ratings and reviews
- 🚧 Wishlist management
- 🚧 Address management

### Admin Features
- 🚧 Product management (CRUD)
- 🚧 Order management
- 🚧 Sales analytics
- 🚧 Category-wise reporting
- 🚧 Promotional offers management

## Technology Stack

### Frontend (Flutter)
- **Language**: Dart 3.1.5+
- **Framework**: Flutter 3.1.5+
- **Architecture**: Clean Architecture
- **State Management**: BLoC (flutter_bloc)
- **Navigation**: go_router
- **Dependency Injection**: get_it
- **Networking**: http
- **Local Storage**: shared_preferences
- **Functional Programming**: dartz

### Backend (TypeScript)
- **Language**: TypeScript 5.3+
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT + bcryptjs
- **Validation**: Zod (planned)
- **Dev Tools**: ts-node-dev, ESLint, Prettier

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Flutter SDK 3.1.5+
- MongoDB instance (local or cloud)
- Android Studio / Xcode (for mobile development)

### Setup

#### 1. Clone and navigate
```bash
cd "Amazon Clone"
```

#### 2. Backend Setup
```bash
cd server
npm install

# Create config.env
echo "PORT=3000
DB_USERNAME=your_mongodb_username
DB_PASSWORD=your_mongodb_password" > config.env

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

#### 3. Frontend Setup
```bash
cd ../amazoneclonefrontend
flutter pub get

# Create config.env
echo "API_BASE_URL=http://localhost:3000
APP_NAME=Amazon Clone" > config.env

# Run on device/emulator
flutter run

# Build APK
flutter build apk --release
```

## Architecture

### Frontend - Clean Architecture Layers

1. **Domain Layer** (Business Logic)
   - Entities: Pure business objects
   - Repositories: Abstract interfaces
   - Use Cases: Single-responsibility business logic

2. **Data Layer** (Data Management)
   - Models: Serializable data classes
   - Data Sources: Remote (API) and Local (Cache)
   - Repository Implementations

3. **Presentation Layer** (UI)
   - BLoC: State management
   - Pages: Full-screen components
   - Widgets: Reusable UI elements

### Backend - Layered Architecture

```
server/
├── src/
│   ├── middlewares/    # Auth, admin, error handling
│   ├── model/          # Mongoose schemas
│   ├── routes/         # API route definitions
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Entry point
├── tsconfig.json
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/signup` - Register new user
- `POST /api/signin` - User login
- `GET /IsTokenValid` - Validate JWT token
- `GET /` - Get authenticated user data

### Products
- `GET /api/products?category={category}` - Get products by category
- `GET /api/products/search/:name` - Search products
- `GET /api/deal-of-the-day` - Get featured product
- `POST /api/rate-product` - Rate a product
- `GET /api/get-product-rating/:id` - Get user rating
- `GET /api/get-ratings-average/:id` - Get average rating

### Cart & Orders
- `POST /api/add-to-cart` - Add product to cart
- `DELETE /api/remove-from-cart/:id` - Remove from cart
- `POST /api/order` - Place an order
- `GET /api/orders/me` - Get user's orders

### Admin
- `POST /admin/add-product` - Add new product
- `GET /admin/get-products` - Get all products
- `GET /admin/get-orders` - Get all orders
- `POST /admin/change-order-status` - Update order status
- `GET /admin/analytics` - Get sales analytics

## Development Workflow

### Git Commit Convention
We follow conventional commits for clear history:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `chore:` Build/config changes
- `refactor:` Code refactoring

### Current Progress

**Total Commits: 20+**

#### Backend (5 commits)
- Initial TypeScript setup
- Models and middleware
- Routes implementation
- Analytics and reporting
- Documentation and tooling

#### Frontend (15+ commits)
- Core architecture setup
- Auth feature (complete)
- Product domain layer
- Cart domain layer
- Theme and widgets
- Dependency injection
- Asset migration

## Testing

### Backend
```bash
cd server
npm test
```

### Frontend
```bash
cd amazoneclonefrontend
flutter test
flutter test --coverage
```

## Deployment

### Backend (Node.js)
- Can be deployed to: Heroku, Railway, Render, AWS, DigitalOcean
- Requires: MongoDB connection string, environment variables

### Frontend (Flutter)
- Android: `flutter build apk --release`
- iOS: `flutter build ios --release`
- Distribute via: Google Play Store, Apple App Store

## Contributing
This is a private project demonstrating Clean Architecture and modern development practices.

## Migration Notes
- Migrated from JavaScript to TypeScript for backend
- Implemented Clean Architecture for Flutter frontend
- Proper separation of concerns across all layers
- Comprehensive error handling
- Type-safe development

## License
Private Project - All Rights Reserved

---

**Status**: 🚧 Active Development
**Last Updated**: January 2026
