import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/core/services/social_auth_service.dart';

class SocialLoginButtons extends StatelessWidget {
  final Function(SocialAuthResult) onSocialLoginSuccess;
  final Function(String) onSocialLoginError;

  const SocialLoginButtons({
    super.key,
    required this.onSocialLoginSuccess,
    required this.onSocialLoginError,
  });

  @override
  Widget build(BuildContext context) {
    final socialAuthService = SocialAuthService();
    final availableProviders = socialAuthService.getAvailableProviders();

    return Column(
      children: [
        const SizedBox(height: 16),
        const Row(
          children: [
            Expanded(child: Divider()),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text('Or continue with'),
            ),
            Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: availableProviders.map((provider) {
            return _buildSocialButton(context, provider);
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildSocialButton(BuildContext context, SocialAuthProvider provider) {
    switch (provider) {
      case SocialAuthProvider.google:
        return _buildGoogleButton();
      case SocialAuthProvider.facebook:
        return _buildFacebookButton();
      case SocialAuthProvider.apple:
        return _buildAppleButton();
    }
  }

  Widget _buildGoogleButton() {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: IconButton(
        onPressed: () => _handleSocialLogin(SocialAuthProvider.google),
        icon: Image.asset(
          'assets/images/google_logo.png',
          width: 24,
          height: 24,
        ),
        tooltip: 'Sign in with Google',
      ),
    );
  }

  Widget _buildFacebookButton() {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: IconButton(
        onPressed: () => _handleSocialLogin(SocialAuthProvider.facebook),
        icon: Image.asset(
          'assets/images/facebook_logo.png',
          width: 24,
          height: 24,
        ),
        tooltip: 'Sign in with Facebook',
      ),
    );
  }

  Widget _buildAppleButton() {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: IconButton(
        onPressed: () => _handleSocialLogin(SocialAuthProvider.apple),
        icon: const Icon(Icons.apple, size: 24),
        tooltip: 'Sign in with Apple',
      ),
    );
  }

  Future<void> _handleSocialLogin(SocialAuthProvider provider) async {
    final socialAuthService = SocialAuthService();
    
    SocialAuthResult result;
    switch (provider) {
      case SocialAuthProvider.google:
        result = await socialAuthService.signInWithGoogle();
        break;
      case SocialAuthProvider.facebook:
        result = await socialAuthService.signInWithFacebook();
        break;
      case SocialAuthProvider.apple:
        result = await socialAuthService.signInWithApple();
        break;
    }

    if (result.success) {
      onSocialLoginSuccess(result);
    } else {
      onSocialLoginError(result.errorMessage ?? 'Unknown error');
    }
  }
}
