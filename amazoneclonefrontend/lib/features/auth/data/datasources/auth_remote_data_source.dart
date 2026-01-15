import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_amazon_clone_bloc/core/constants/api_constants.dart';
import 'package:flutter_amazon_clone_bloc/core/error/exceptions.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/data/models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<UserModel> signUp({
    required String name,
    required String email,
    required String password,
  });

  Future<UserModel> signIn({
    required String email,
    required String password,
  });

  Future<bool> validateToken(String token);

  Future<UserModel> getUserData(String token);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final http.Client client;

  AuthRemoteDataSourceImpl({required this.client});

  @override
  Future<UserModel> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      final response = await client.post(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.signUp}'),
        headers: {'Content-Type': 'application/json; charset=UTF-8'},
        body: jsonEncode({
          'name': name,
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.body);
      } else {
        final error = jsonDecode(response.body);
        throw ServerException(error['msg'] ?? 'Sign up failed');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<UserModel> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await client.post(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.signIn}'),
        headers: {'Content-Type': 'application/json; charset=UTF-8'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.body);
      } else {
        final error = jsonDecode(response.body);
        throw AuthenticationException(error['msg'] ?? 'Sign in failed');
      }
    } catch (e) {
      throw AuthenticationException(e.toString());
    }
  }

  @override
  Future<bool> validateToken(String token) async {
    try {
      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.tokenValidation}'),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as bool;
      }
      return false;
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<UserModel> getUserData(String token) async {
    try {
      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.getUserData}'),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.body);
      } else {
        throw UnauthorizedException('Failed to get user data');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }
}
