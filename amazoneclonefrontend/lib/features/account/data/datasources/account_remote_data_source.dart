import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_amazon_clone_bloc/core/constants/global_variables.dart';
import 'package:flutter_amazon_clone_bloc/core/error/exceptions.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/data/models/user_model.dart';

abstract class AccountRemoteDataSource {
  Future<UserModel> updateProfile({
    required String token,
    String? name,
    String? email,
  });
}

class AccountRemoteDataSourceImpl implements AccountRemoteDataSource {
  final http.Client client;

  AccountRemoteDataSourceImpl(this.client);

  @override
  Future<UserModel> updateProfile({
    required String token,
    String? name,
    String? email,
  }) async {
    final response = await client.post(
      Uri.parse('$uri/api/update-profile'),
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'x-auth-token': token,
      },
      body: jsonEncode({
        if (name != null) 'name': name,
        if (email != null) 'email': email,
      }),
    );

    if (response.statusCode == 200) {
      return UserModel.fromJson(response.body);
    } else {
      throw ServerException();
    }
  }
}
