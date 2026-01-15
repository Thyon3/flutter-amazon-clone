import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_amazon_clone_bloc/core/constants/app_constants.dart';
import 'package:flutter_amazon_clone_bloc/core/error/exceptions.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/data/models/user_model.dart';

abstract class AuthLocalDataSource {
  Future<void> cacheToken(String token);
  Future<String?> getToken();
  Future<void> cacheUser(UserModel user);
  Future<UserModel?> getCachedUser();
  Future<void> clearAuthData();
}

class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  final SharedPreferences sharedPreferences;

  AuthLocalDataSourceImpl({required this.sharedPreferences});

  @override
  Future<void> cacheToken(String token) async {
    try {
      await sharedPreferences.setString(AppConstants.authTokenKey, token);
    } catch (e) {
      throw CacheException('Failed to cache token');
    }
  }

  @override
  Future<String?> getToken() async {
    try {
      return sharedPreferences.getString(AppConstants.authTokenKey);
    } catch (e) {
      throw CacheException('Failed to get token');
    }
  }

  @override
  Future<void> cacheUser(UserModel user) async {
    try {
      await sharedPreferences.setString(
        AppConstants.userDataKey,
        user.toJson(),
      );
    } catch (e) {
      throw CacheException('Failed to cache user');
    }
  }

  @override
  Future<UserModel?> getCachedUser() async {
    try {
      final userJson = sharedPreferences.getString(AppConstants.userDataKey);
      if (userJson != null) {
        return UserModel.fromJson(userJson);
      }
      return null;
    } catch (e) {
      throw CacheException('Failed to get cached user');
    }
  }

  @override
  Future<void> clearAuthData() async {
    try {
      await sharedPreferences.remove(AppConstants.authTokenKey);
      await sharedPreferences.remove(AppConstants.userDataKey);
    } catch (e) {
      throw CacheException('Failed to clear auth data');
    }
  }
}
