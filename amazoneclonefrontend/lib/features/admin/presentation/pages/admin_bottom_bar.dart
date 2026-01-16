import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/show_snackbar.dart';
import '../bloc/admin_bottom_bar/admin_bottom_bar_cubit.dart';
import 'admin_home_screen.dart';
import 'admin_analytics_screen.dart';
import 'admin_offers_screen.dart';
import 'admin_orders_screen.dart';

class AdminBottomBar extends StatelessWidget {
  const AdminBottomBar({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      const AdminHomeScreen(),
      const AdminAnalyticsScreen(),
      const AdminOffersScreen(),
      const AdminOrdersScreen(),
    ];

    return BlocBuilder<AdminBottomBarCubit, AdminBottomBarState>(
      builder: (context, state) {
        return Scaffold(
          appBar: PreferredSize(
            preferredSize: const Size.fromHeight(50),
            child: AppBar(
              flexibleSpace: Container(
                decoration: const BoxDecoration(
                  gradient: AppColors.appBarGradient,
                ),
              ),
              title: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    height: 45,
                    width: 120,
                    alignment: Alignment.centerLeft,
                    child: Image.asset('assets/images/amazon_black_logo.png'),
                  ),
                  Row(
                    children: [
                      const Text(
                        'Admin',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 6),
                      IconButton(
                        onPressed: () async {
                          try {
                            final sharedPreferences = await SharedPreferences.getInstance();
                            await sharedPreferences.setString('x-auth-token', '');

                            if (context.mounted) {
                              context.go('/auth');
                            }
                          } catch (e) {
                            if (context.mounted) {
                              showErrorSnackBar(context, e.toString());
                            }
                          }
                        },
                        icon: const Icon(
                          Icons.power_settings_new,
                          size: 25,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: Theme(
            data: ThemeData(
              splashColor: Colors.transparent,
              highlightColor: Colors.transparent,
            ),
            child: BottomNavigationBar(
              type: BottomNavigationBarType.fixed,
              currentIndex: state.index,
              selectedLabelStyle: const TextStyle(
                color: AppColors.selectedNavBarColor,
                fontSize: 13,
              ),
              unselectedLabelStyle: const TextStyle(
                color: Colors.black54,
                fontSize: 13,
              ),
              selectedItemColor: AppColors.selectedNavBarColor,
              unselectedItemColor: Colors.black54,
              backgroundColor: Colors.white,
              enableFeedback: false,
              iconSize: 28,
              elevation: 0,
              onTap: (page) {
                context.read<AdminBottomBarCubit>().changePage(page);
              },
              items: [
                _buildBottomNavBarItem(
                  icon: const Icon(Icons.home_outlined, size: 26),
                  label: 'Home',
                  page: 0,
                  index: state.index,
                ),
                _buildBottomNavBarItem(
                  icon: const Icon(Icons.analytics_outlined, size: 26),
                  label: 'Analytics',
                  page: 1,
                  index: state.index,
                ),
                _buildBottomNavBarItem(
                  icon: const Icon(Icons.featured_video_outlined, size: 26),
                  label: 'Offers',
                  page: 2,
                  index: state.index,
                ),
                _buildBottomNavBarItem(
                  icon: const Icon(Icons.local_shipping_outlined, size: 26),
                  label: 'Orders',
                  page: 3,
                  index: state.index,
                ),
              ],
            ),
          ),
          body: pages[state.index],
        );
      },
    );
  }

  BottomNavigationBarItem _buildBottomNavBarItem({
    required Widget icon,
    required int page,
    required String label,
    required int index,
  }) {
    return BottomNavigationBarItem(
      icon: Column(
        children: [
          Container(
            width: 38,
            height: 6,
            decoration: BoxDecoration(
              color: index == page ? AppColors.selectedNavBarColor : Colors.white,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(5),
                bottomRight: Radius.circular(5),
              ),
            ),
          ),
          const SizedBox(height: 2),
          icon,
          const SizedBox(height: 2),
        ],
      ),
      label: label,
    );
  }
}
