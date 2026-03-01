import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/app_colors.dart';

class AppTheme {
  static ThemeData get light {
    return ThemeData(
      fontFamily: 'AmazonEmber',
      scaffoldBackgroundColor: AppColors.backgroundColor,
      bottomSheetTheme: const BottomSheetThemeData(
        surfaceTintColor: Colors.white,
        backgroundColor: Colors.white,
        modalBackgroundColor: Colors.white,
      ),
      colorScheme: const ColorScheme.light(
        primary: AppColors.secondaryColor,
        secondary: AppColors.teal,
      ),
      appBarTheme: const AppBarTheme(
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.black),
        backgroundColor: AppColors.teal,
      ),
      useMaterial3: true,
    );
  }

  static ThemeData get dark {
    return ThemeData(
      fontFamily: 'AmazonEmber',
      scaffoldBackgroundColor: AppColors.darkBackgroundColor,
      bottomSheetTheme: const BottomSheetThemeData(
        surfaceTintColor: AppColors.darkSurfaceColor,
        backgroundColor: AppColors.darkSurfaceColor,
        modalBackgroundColor: AppColors.darkSurfaceColor,
      ),
      colorScheme: const ColorScheme.dark(
        primary: AppColors.secondaryColor,
        secondary: AppColors.darkTeal,
        surface: AppColors.darkSurfaceColor,
        background: AppColors.darkBackgroundColor,
      ),
      appBarTheme: const AppBarTheme(
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.white),
        backgroundColor: AppColors.darkTeal,
      ),
      cardTheme: const CardTheme(
        color: AppColors.darkCardColor,
      ),
      useMaterial3: true,
    );
  }
}
