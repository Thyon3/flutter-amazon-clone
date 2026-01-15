import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_amazon_clone_bloc/core/config/router/app_router.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/app_theme.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:flutter_amazon_clone_bloc/core/di/injection_container.dart' as di;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Lock orientation to portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  
  // Load environment variables
  try {
    await dotenv.load(fileName: "config.env");
  } catch (e) {
    debugPrint('Error loading .env file: $e');
  }
  
  // Initialize dependencies
  await di.init();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => di.sl<AuthBloc>(),
        ),
        BlocProvider(
          create: (_) => di.sl<ProductBloc>(),
        ),
        BlocProvider(
          create: (_) => di.sl<CartBloc>(),
        ),
      ],
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        title: 'Amazon Clone',
        theme: AppTheme.light,
        routerConfig: AppRouter.router,
      ),
    );
  }
}
