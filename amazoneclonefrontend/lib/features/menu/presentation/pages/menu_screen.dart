import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/show_snackbar.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  String _appVersion = '';

  @override
  void initState() {
    super.initState();
    _loadAppVersion();
  }

  Future<void> _loadAppVersion() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      setState(() {
        _appVersion = '${packageInfo.version} (${packageInfo.buildNumber})';
      });
    } catch (e) {
      setState(() {
        _appVersion = '1.0.0';
      });
    }
  }

  Future<void> _logout() async {
    try {
      final sharedPreferences = await SharedPreferences.getInstance();
      await sharedPreferences.setString('x-auth-token', '');

      if (mounted) {
        context.go('/auth');
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Failed to logout: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(50),
        child: AppBar(
          flexibleSpace: Container(
            decoration: const BoxDecoration(
              gradient: AppColors.appBarGradient,
            ),
          ),
          title: const Text('Menu & Settings'),
        ),
      ),
      body: ListView(
        children: [
          // Account Section
          _buildSectionHeader('Account'),
          _buildMenuItem(
            icon: Icons.person_outline,
            title: 'Profile',
            subtitle: 'View and edit your profile',
            onTap: () {
              // Navigate to profile
              showSnackBar(context, 'Profile feature coming soon');
            },
          ),
          _buildMenuItem(
            icon: Icons.location_on_outlined,
            title: 'Addresses',
            subtitle: 'Manage delivery addresses',
            onTap: () {
              // Navigate to addresses
              showSnackBar(context, 'Addresses feature coming soon');
            },
          ),
          _buildMenuItem(
            icon: Icons.payment_outlined,
            title: 'Payment Methods',
            subtitle: 'Manage your payment methods',
            onTap: () {
              // Navigate to payment methods
              showSnackBar(context, 'Payment methods feature coming soon');
            },
          ),

          const Divider(height: 1),

          // Orders Section
          _buildSectionHeader('Orders & History'),
          _buildMenuItem(
            icon: Icons.shopping_bag_outlined,
            title: 'Your Orders',
            subtitle: 'Track, return, or buy things again',
            onTap: () {
              context.push('/orders');
            },
          ),
          _buildMenuItem(
            icon: Icons.search,
            title: 'Search Orders',
            subtitle: 'Find orders by product name',
            onTap: () {
              context.push('/order-search');
            },
          ),
          _buildMenuItem(
            icon: Icons.history,
            title: 'Browsing History',
            subtitle: 'View your recently viewed products',
            onTap: () {
              context.push('/browsing-history');
            },
          ),

          const Divider(height: 1),

          // Shopping Section
          _buildSectionHeader('Shopping'),
          _buildMenuItem(
            icon: Icons.favorite_border,
            title: 'Wishlist',
            subtitle: 'View your saved items',
            onTap: () {
              context.push('/wishlist');
            },
          ),
          _buildMenuItem(
            icon: Icons.bookmark_border,
            title: 'Saved for Later',
            subtitle: 'Items saved from your cart',
            onTap: () {
              context.push('/save-for-later');
            },
          ),

          const Divider(height: 1),

          // App Settings Section
          _buildSectionHeader('App Settings'),
          _buildMenuItem(
            icon: Icons.notifications_outlined,
            title: 'Notifications',
            subtitle: 'Manage notification preferences',
            onTap: () {
              showSnackBar(context, 'Notifications settings coming soon');
            },
          ),
          _buildMenuItem(
            icon: Icons.language_outlined,
            title: 'Language',
            subtitle: 'English (US)',
            onTap: () {
              showSnackBar(context, 'Language settings coming soon');
            },
          ),
          _buildMenuItem(
            icon: Icons.dark_mode_outlined,
            title: 'Dark Mode',
            subtitle: 'Switch between light and dark theme',
            onTap: () {
              showSnackBar(context, 'Theme settings coming soon');
            },
          ),

          const Divider(height: 1),

          // Help & Support Section
          _buildSectionHeader('Help & Support'),
          _buildMenuItem(
            icon: Icons.help_outline,
            title: 'Help Center',
            subtitle: 'Get help with your orders and account',
            onTap: () {
              showSnackBar(context, 'Help center coming soon');
            },
          ),
          _buildMenuItem(
            icon: Icons.feedback_outlined,
            title: 'Send Feedback',
            subtitle: 'Tell us what you think',
            onTap: () {
              showSnackBar(context, 'Feedback feature coming soon');
            },
          ),
          _buildMenuItem(
            icon: Icons.privacy_tip_outlined,
            title: 'Privacy Policy',
            subtitle: 'Read our privacy policy',
            onTap: () {
              showSnackBar(context, 'Privacy policy coming soon');
            },
          ),
          _buildMenuItem(
            icon: Icons.description_outlined,
            title: 'Terms of Service',
            subtitle: 'Read our terms and conditions',
            onTap: () {
              showSnackBar(context, 'Terms of service coming soon');
            },
          ),

          const Divider(height: 1),

          // About Section
          _buildSectionHeader('About'),
          _buildMenuItem(
            icon: Icons.info_outline,
            title: 'App Version',
            subtitle: _appVersion.isNotEmpty ? _appVersion : 'Loading...',
            onTap: null,
          ),

          const Divider(height: 1),
          const SizedBox(height: 16),

          // Logout Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: ElevatedButton.icon(
              onPressed: () => _showLogoutConfirmation(),
              icon: const Icon(Icons.logout),
              label: const Text('Logout'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: Colors.grey,
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback? onTap,
  }) {
    return ListTile(
      leading: Icon(icon, size: 28),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(
          fontSize: 13,
          color: Colors.grey,
        ),
      ),
      trailing: onTap != null ? const Icon(Icons.chevron_right) : null,
      onTap: onTap,
    );
  }

  void _showLogoutConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _logout();
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}
