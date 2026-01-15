import 'package:go_router/go_router.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/presentation/pages/auth_screen.dart';
import 'package:flutter_amazon_clone_bloc/features/main/presentation/pages/main_screen.dart';
import 'package:flutter_amazon_clone_bloc/features/search/presentation/pages/search_screen.dart';
import 'package:flutter_amazon_clone_bloc/features/product/presentation/pages/category_products_screen.dart';
import 'package:flutter_amazon_clone_bloc/features/product/presentation/pages/product_details_screen.dart';

class AppRouter {
  static const String splash = '/';
  static const String auth = '/auth';
  static const String main = '/main';
  static const String search = '/search';
  static const String category = '/category';
  static const String productDetails = '/product';
  
  static final router = GoRouter(
    initialLocation: splash,
    routes: [
      GoRoute(
        path: splash,
        builder: (context, state) => const AuthScreen(),
      ),
      GoRoute(
        path: auth,
        builder: (context, state) => const AuthScreen(),
      ),
      GoRoute(
        path: main,
        builder: (context, state) => const MainScreen(),
      ),
      GoRoute(
        path: search,
        builder: (context, state) => const SearchScreen(),
      ),
      GoRoute(
        path: '$category/:categoryName',
        builder: (context, state) {
          final categoryName = state.pathParameters['categoryName']!;
          return CategoryProductsScreen(category: categoryName);
        },
      ),
    ],
  );
}
