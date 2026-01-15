# Amazon Clone - Flutter Frontend

## Overview
A full-featured e-commerce mobile application built with Flutter, implementing Clean Architecture and BLoC pattern.

## Architecture
This project follows **Clean Architecture** principles with clear separation of concerns:

```
lib/
├── core/                    # Core functionality
│   ├── constants/          # App-wide constants
│   ├── error/              # Error handling (failures & exceptions)
│   ├── network/            # Network utilities
│   ├── theme/              # App theme and colors
│   ├── utils/              # Utility functions
│   ├── widgets/            # Reusable widgets
│   ├── config/             # App configuration
│   └── di/                 # Dependency injection
│
├── features/               # Feature modules
│   ├── auth/
│   │   ├── data/
│   │   │   ├── datasources/    # Remote & local data sources
│   │   │   ├── models/         # Data models
│   │   │   └── repositories/   # Repository implementations
│   │   ├── domain/
│   │   │   ├── entities/       # Business entities
│   │   │   ├── repositories/   # Repository interfaces
│   │   │   └── usecases/       # Business logic
│   │   └── presentation/
│   │       ├── bloc/           # State management
│   │       ├── pages/          # UI screens
│   │       └── widgets/        # Feature-specific widgets
│   └── ...
│
└── main.dart               # App entry point
```

## Setup

### Prerequisites
- Flutter SDK 3.1.5 or higher
- Dart SDK 3.0.0 or higher

### Installation

1. **Install dependencies**:
   ```bash
   flutter pub get
   ```

2. **Create `config.env`** in the project root:
   ```
   API_BASE_URL=http://localhost:3000
   APP_NAME=Amazon Clone
   ```

3. **Run the app**:
   ```bash
   flutter run
   ```

## Commit Summary (So Far)

We have completed significant progress on this migration. Here's a summary:

### Backend (TypeScript Express) - 6 commits
1. `chore(monorepo): initialize repo at root` - Set up monorepo structure
2. `feat(server): scaffold TypeScript Express app` - Basic routes, models, middlewares
3. `feat(server): add Order model, user routes, offers routes` - Complete API endpoints
4. `chore(server): add ESLint, Prettier configs and comprehensive README` - Dev tools and docs

### Frontend (Flutter Clean Architecture) - 10 commits
1. `feat: Add core layer with constants, errors, and network utilities`
2. `feat: Add network info and error handling utilities`
3. `feat: Add domain entities and data models for User and Product`
4. `feat: Add Order entity and model with domain layer for Auth`
5. `feat(flutter): add auth data layer with remote and local data sources`
6. `feat(flutter): add auth local data source and repository implementation`
7. `feat(flutter): reorganize pubspec.yaml dependencies and add dartz`
8. `feat(flutter): add auth BLoC with events and states` + Assets copied
9. `feat(flutter): add theme, colors, and common widgets`
10. `feat(flutter): add auth screen UI and app router setup`
11. `docs(flutter): add comprehensive README and config.env template`
12. `feat(flutter): update main.dart and pubspec.yaml with complete dependencies`

**Total commits so far: 16**

The foundation is complete with Clean Architecture structure, authentication feature, and TypeScript backend fully migrated!
