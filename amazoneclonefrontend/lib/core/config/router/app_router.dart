import 'package:go_router/go_router.dart';
import '../../../features/auth/presentation/pages/auth_screen.dart';
import '../../../features/main/presentation/pages/main_screen.dart';
import '../../../features/search/presentation/pages/search_screen.dart';
import '../../../features/product/presentation/pages/category_products_screen.dart';
import '../../../features/product/presentation/pages/product_details_screen.dart';
import '../../../features/splash/presentation/pages/splash_screen.dart';
import '../../../features/account/presentation/pages/account_screen.dart';
import '../../../features/account/presentation/pages/edit_profile_screen.dart';

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
      GoRoute(path: splash, builder: (context, state) => const SplashScreen()),
      GoRoute(path: auth, builder: (context, state) => const AuthScreen()),
      GoRoute(path: main, builder: (context, state) => const MainScreen()),
      GoRoute(path: search, builder: (context, state) => const SearchScreen()),
      GoRoute(
        path: '/account',
        builder: (context, state) => const AccountScreen(),
      ),
      GoRoute(
        path: '$category/:categoryName',
        builder: (context, state) {
          final categoryName = state.pathParameters['categoryName']!;
          return CategoryProductsScreen(category: categoryName);
        },
      ),
      GoRoute(
        path: EditProfileScreen.routeName,
        builder: (context, state) => const EditProfileScreen(),
      ),
    ],
  );
}
