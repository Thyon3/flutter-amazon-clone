import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:dartz/dartz.dart';

enum SocialAuthProvider {
  google,
  facebook,
  apple,
}

class SocialAuthResult {
  final bool success;
  final String? token;
  final String? errorMessage;
  final SocialUserInfo? userInfo;

  SocialAuthResult({
    required this.success,
    this.token,
    this.errorMessage,
    this.userInfo,
  });
}

class SocialUserInfo {
  final String id;
  final String name;
  final String email;
  final String? photoUrl;
  final SocialAuthProvider provider;

  SocialUserInfo({
    required this.id,
    required this.name,
    required this.email,
    this.photoUrl,
    required this.provider,
  });
}

class SocialAuthService {
  static final SocialAuthService _instance = SocialAuthService._internal();
  factory SocialAuthService() => _instance;
  SocialAuthService._internal();

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  bool _isInitialized = false;
  Map<SocialAuthProvider, bool> _providerAvailability = {};

  bool get isInitialized => _isInitialized;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Initialize Google Sign-In
      await _googleSignIn.signInSilently();
      _providerAvailability[SocialAuthProvider.google] = true;

      // Check Facebook availability
      _providerAvailability[SocialAuthProvider.facebook] = !kIsWeb;

      // Check Apple Sign-In availability (iOS only)
      _providerAvailability[SocialAuthProvider.apple] = 
          !kIsWeb && Platform.isIOS;

      _isInitialized = true;
      debugPrint('Social auth initialized');
    } catch (e) {
      debugPrint('Failed to initialize social auth: $e');
      _isInitialized = true;
    }
  }

  // Get available providers
  List<SocialAuthProvider> getAvailableProviders() {
    return _providerAvailability.entries
        .where((entry) => entry.value)
        .map((entry) => entry.key)
        .toList();
  }

  // Google Sign-In
  Future<SocialAuthResult> signInWithGoogle() async {
    try {
      if (!_providerAvailability[SocialAuthProvider.google]!) {
        return SocialAuthResult(
          success: false,
          errorMessage: 'Google Sign-In not available',
        );
      }

      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        return SocialAuthResult(
          success: false,
          errorMessage: 'Google Sign-In cancelled',
        );
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? token = googleAuth.accessToken;

      final userInfo = SocialUserInfo(
        id: googleUser.id,
        name: googleUser.displayName ?? '',
        email: googleUser.email,
        photoUrl: googleUser.photoUrl,
        provider: SocialAuthProvider.google,
      );

      return SocialAuthResult(
        success: true,
        token: token,
        userInfo: userInfo,
      );
    } catch (e) {
      debugPrint('Google Sign-In error: $e');
      return SocialAuthResult(
        success: false,
        errorMessage: 'Google Sign-In failed: $e',
      );
    }
  }

  // Facebook Sign-In
  Future<SocialAuthResult> signInWithFacebook() async {
    try {
      if (!_providerAvailability[SocialAuthProvider.facebook]!) {
        return SocialAuthResult(
          success: false,
          errorMessage: 'Facebook Sign-In not available',
        );
      }

      final LoginResult result = await FacebookAuth.instance.login();
      
      if (result.status == LoginStatus.success) {
        final AccessToken? accessToken = result.accessToken;
        final userData = await FacebookAuth.instance.getUserData();

        final userInfo = SocialUserInfo(
          id: userData['id'] ?? '',
          name: userData['name'] ?? '',
          email: userData['email'] ?? '',
          photoUrl: userData['picture']['data']['url'],
          provider: SocialAuthProvider.facebook,
        );

        return SocialAuthResult(
          success: true,
          token: accessToken?.token,
          userInfo: userInfo,
        );
      } else {
        return SocialAuthResult(
          success: false,
          errorMessage: 'Facebook Sign-In cancelled',
        );
      }
    } catch (e) {
      debugPrint('Facebook Sign-In error: $e');
      return SocialAuthResult(
        success: false,
        errorMessage: 'Facebook Sign-In failed: $e',
      );
    }
  }

  // Apple Sign-In
  Future<SocialAuthResult> signInWithApple() async {
    try {
      if (!_providerAvailability[SocialAuthProvider.apple]!) {
        return SocialAuthResult(
          success: false,
          errorMessage: 'Apple Sign-In not available',
        );
      }

      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      final userInfo = SocialUserInfo(
        id: credential.userIdentifier ?? '',
        name: '${credential.givenName ?? ''} ${credential.familyName ?? ''}'.trim(),
        email: credential.email ?? '',
        photoUrl: null, // Apple doesn't provide profile photos
        provider: SocialAuthProvider.apple,
      );

      return SocialAuthResult(
        success: true,
        token: credential.identityToken,
        userInfo: userInfo,
      );
    } catch (e) {
      debugPrint('Apple Sign-In error: $e');
      return SocialAuthResult(
        success: false,
        errorMessage: 'Apple Sign-In failed: $e',
      );
    }
  }

  // Sign out from all providers
  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
      await FacebookAuth.instance.logOut();
      // Apple Sign-In doesn't require explicit sign out
    } catch (e) {
      debugPrint('Error signing out: $e');
    }
  }

  // Sign out from specific provider
  Future<void> signOutFromProvider(SocialAuthProvider provider) async {
    try {
      switch (provider) {
        case SocialAuthProvider.google:
          await _googleSignIn.signOut();
          break;
        case SocialAuthProvider.facebook:
          await FacebookAuth.instance.logOut();
          break;
        case SocialAuthProvider.apple:
          // Apple Sign-In doesn't require explicit sign out
          break;
      }
    } catch (e) {
      debugPrint('Error signing out from $provider: $e');
    }
  }

  // Check if user is signed in with any provider
  Future<bool> isSignedIn() async {
    try {
      final googleUser = _googleSignIn.currentUser;
      if (googleUser != null) return true;

      final facebookUser = await FacebookAuth.instance.getUserData();
      if (facebookUser.isNotEmpty) return true;

      // Apple Sign-In state check would require additional implementation
      return false;
    } catch (e) {
      debugPrint('Error checking sign-in status: $e');
      return false;
    }
  }

  // Get current signed-in user info
  Future<SocialUserInfo?> getCurrentUser() async {
    try {
      // Check Google
      final googleUser = _googleSignIn.currentUser;
      if (googleUser != null) {
        return SocialUserInfo(
          id: googleUser.id,
          name: googleUser.displayName ?? '',
          email: googleUser.email,
          photoUrl: googleUser.photoUrl,
          provider: SocialAuthProvider.google,
        );
      }

      // Check Facebook
      final facebookUser = await FacebookAuth.instance.getUserData();
      if (facebookUser.isNotEmpty) {
        return SocialUserInfo(
          id: facebookUser['id'] ?? '',
          name: facebookUser['name'] ?? '',
          email: facebookUser['email'] ?? '',
          photoUrl: facebookUser['picture']['data']['url'],
          provider: SocialAuthProvider.facebook,
        );
      }

      return null;
    } catch (e) {
      debugPrint('Error getting current user: $e');
      return null;
    }
  }

  // Link social account to existing user
  Future<SocialAuthResult> linkSocialAccount(
    SocialAuthProvider provider,
    String userId,
  ) async {
    try {
      switch (provider) {
        case SocialAuthProvider.google:
          return await _linkGoogleAccount(userId);
        case SocialAuthProvider.facebook:
          return await _linkFacebookAccount(userId);
        case SocialAuthProvider.apple:
          return await _linkAppleAccount(userId);
      }
    } catch (e) {
      return SocialAuthResult(
        success: false,
        errorMessage: 'Failed to link $provider account: $e',
      );
    }
  }

  Future<SocialAuthResult> _linkGoogleAccount(String userId) async {
    // In a real app, this would call your backend to link the account
    return SocialAuthResult(
      success: true,
      errorMessage: 'Google account linked successfully',
    );
  }

  Future<SocialAuthResult> _linkFacebookAccount(String userId) async {
    // In a real app, this would call your backend to link the account
    return SocialAuthResult(
      success: true,
      errorMessage: 'Facebook account linked successfully',
    );
  }

  Future<SocialAuthResult> _linkAppleAccount(String userId) async {
    // In a real app, this would call your backend to link the account
    return SocialAuthResult(
      success: true,
      errorMessage: 'Apple account linked successfully',
    );
  }

  // Unlink social account
  Future<SocialAuthResult> unlinkSocialAccount(
    SocialAuthProvider provider,
    String userId,
  ) async {
    try {
      await signOutFromProvider(provider);
      
      // In a real app, this would call your backend to unlink the account
      return SocialAuthResult(
        success: true,
        errorMessage: '$provider account unlinked successfully',
      );
    } catch (e) {
      return SocialAuthResult(
        success: false,
        errorMessage: 'Failed to unlink $provider account: $e',
      );
    }
  }

  // Get provider-specific configuration
  Map<String, dynamic> getProviderConfig(SocialAuthProvider provider) {
    switch (provider) {
      case SocialAuthProvider.google:
        return {
          'clientId': 'your-google-client-id',
          'scopes': ['email', 'profile'],
          'hostedDomain': null,
        };
      case SocialAuthProvider.facebook:
        return {
          'appId': 'your-facebook-app-id',
          'version': 'v18.0',
          'permissions': ['email', 'public_profile'],
        };
      case SocialAuthProvider.apple:
        return {
          'clientId': 'your-apple-client-id',
          'scopes': ['email', 'fullName'],
        };
    }
  }

  void dispose() {
    _googleSignIn.disconnect();
  }
}
