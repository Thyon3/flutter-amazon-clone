import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/bottom_nav_bar.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/theme_toggle_button.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/language_selector.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/theme_manager.dart';
import 'package:flutter_amazon_clone_bloc/features/comparison/presentation/bloc/comparison_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/comparison/presentation/pages/comparison_screen.dart';
import 'package:flutter_amazon_clone_bloc/features/home/presentation/pages/home_screen.dart';
import 'package:flutter_amazon_clone_bloc/features/cart/presentation/pages/cart_screen.dart';
import 'package:flutter_amazon_clone_bloc/features/menu/presentation/pages/menu_screen.dart';
import 'package:flutter_amazon_clone_bloc/features/account/presentation/pages/account_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const AccountScreen(),
    const CartScreen(),
    const MenuScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Amazon Clone'),
        actions: [
          BlocBuilder<ComparisonBloc, ComparisonState>(
            builder: (context, state) {
              int comparisonCount = 0;
              if (state is ComparisonUpdated) {
                comparisonCount = state.comparison.products.length;
              }
              
              return Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.compare),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ComparisonScreen(),
                        ),
                      );
                    },
                    tooltip: 'Product Comparison',
                  ),
                  if (comparisonCount > 0)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: Colors.orange,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          comparisonCount.toString(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          const LanguageSelector(),
          Consumer<ThemeManager>(
            builder: (context, themeManager, child) {
              return ThemeToggleButton(themeManager: themeManager);
            },
          ),
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
      ),
    );
  }
}
