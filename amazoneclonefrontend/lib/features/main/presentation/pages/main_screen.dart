import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/bottom_nav_bar.dart';
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
