import 'package:flutter/material.dart';
import './account_button.dart';
import '../pages/edit_profile_screen.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/utils/show_snackbar.dart';

class TopButtons extends StatelessWidget {
  const TopButtons({super.key});

  Future<void> _logout(BuildContext context) async {
    try {
      final sharedPreferences = await SharedPreferences.getInstance();
      await sharedPreferences.setString('x-auth-token', '');
      if (context.mounted) {
        context.go('/auth');
      }
    } catch (e) {
      if (context.mounted) {
        showErrorSnackBar(context, 'Failed to logout: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            AccountButton(text: 'Your Orders', onTap: () {}),
            AccountButton(text: 'Turn Seller', onTap: () {}),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            AccountButton(text: 'Log Out', onTap: () => _logout(context)),
            AccountButton(
              text: 'Edit Profile',
              onTap: () {
                context.push('/edit-profile');
              },
            ),
          ],
        ),
      ],
    );
  }
}
