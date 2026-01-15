import 'package:go_router/go_router.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/presentation/pages/auth_screen.dart';
import 'package:flutter_amazon_clone_bloc/features/home/presentation/pages/home_screen.dart';

class AppRouter {
  static const String splash = '/';
  static const String auth = '/auth';
  static const String home = '/home';
  static const String productDetails = '/product/:id';
  static const String cart = '/cart';
  static const String search = '/search';
  static const String category = '/category/:name';
  static const String account = '/account';
  static const String orders = '/orders';
  
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
        path: home,
        builder: (context, state) => const HomeScreen(),
      ),
    ],
  );
}
