import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/app_colors.dart';

class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const BottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: onTap,
      type: BottomNavigationBarType.fixed,
      selectedItemColor: AppColors.selectedNavBarColor,
      unselectedItemColor: AppColors.unselectedNavBarColor,
      selectedLabelStyle: const TextStyle(fontSize: 12),
      unselectedLabelStyle: const TextStyle(fontSize: 12),
      items: [
        BottomNavigationBarItem(
          icon: Image.asset(
            'assets/images/bottom_nav_bar/home.png',
            height: 24,
            color: currentIndex == 0 ? AppColors.selectedNavBarColor : AppColors.unselectedNavBarColor,
          ),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Image.asset(
            'assets/images/bottom_nav_bar/you.png',
            height: 24,
            color: currentIndex == 1 ? AppColors.selectedNavBarColor : AppColors.unselectedNavBarColor,
          ),
          label: 'Account',
        ),
        BottomNavigationBarItem(
          icon: Image.asset(
            'assets/images/bottom_nav_bar/cart.png',
            height: 24,
            color: currentIndex == 2 ? AppColors.selectedNavBarColor : AppColors.unselectedNavBarColor,
          ),
          label: 'Cart',
        ),
        BottomNavigationBarItem(
          icon: Image.asset(
            'assets/images/bottom_nav_bar/menu.png',
            height: 24,
            color: currentIndex == 3 ? AppColors.selectedNavBarColor : AppColors.unselectedNavBarColor,
          ),
          label: 'Menu',
        ),
      ],
    );
  }
}
