import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:hydrated_bloc/hydrated_bloc.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_amazon_clone_bloc/core/config/router/app_router.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/app_theme.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/theme_manager.dart';
import 'package:flutter_amazon_clone_bloc/core/localization/app_localizations.dart';
import 'package:flutter_amazon_clone_bloc/core/localization/locale_manager.dart';
import 'package:flutter_amazon_clone_bloc/core/services/notification_service.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/comparison/presentation/bloc/comparison_bloc.dart';
import 'package:flutter_amazon_clone_bloc/core/di/injection_container.dart' as di;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Initialize notification service
  final notificationService = NotificationService();
  await notificationService.initialize();
  
  // Lock orientation to portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  // Load environment variables
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    debugPrint('Error loading .env file: $e');
  }
  
  // Initialize HydratedBloc storage for state persistence
  HydratedBloc.storage = await HydratedStorage.build(
    storageDirectory: await getApplicationDocumentsDirectory(),
  );
  
  // Initialize dependencies
  await di.init();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ThemeManager(),
      child: ChangeNotifierProvider(
        create: (_) => LocaleManager(),
        child: Consumer2<ThemeManager, LocaleManager>(
          builder: (context, themeManager, localeManager, child) {
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
                BlocProvider(
                  create: (_) => ComparisonBloc(),
                ),
              ],
              child: MaterialApp.router(
                debugShowCheckedModeBanner: false,
                title: 'Amazon Clone',
                theme: AppTheme.light,
                darkTheme: AppTheme.dark,
                themeMode: themeManager.themeMode,
                locale: localeManager.locale,
                supportedLocales: localeManager.supportedLocales,
                localizationsDelegates: const [
                  AppLocalizations.delegate,
                  GlobalMaterialLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                ],
                routerConfig: AppRouter.router,
              ),
            );
          },
        ),
      ),
    );
  }
}
