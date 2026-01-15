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
}
