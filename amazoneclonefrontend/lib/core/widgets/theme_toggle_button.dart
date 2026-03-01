import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/theme_manager.dart';

class ThemeToggleButton extends StatelessWidget {
  final ThemeManager themeManager;

  const ThemeToggleButton({
    super.key,
    required this.themeManager,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: themeManager,
      builder: (context, child) {
        return IconButton(
          icon: Icon(
            themeManager.isDarkMode ? Icons.light_mode : Icons.dark_mode,
            color: Theme.of(context).iconTheme.color,
          ),
          onPressed: () async {
            await themeManager.toggleTheme();
          },
          tooltip: themeManager.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode',
        );
      },
    );
  }
}
