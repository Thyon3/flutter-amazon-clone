import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/error/exceptions.dart';
import '../../../product/data/models/product_model.dart';

abstract class KeepShoppingForRemoteDataSource {
  Future<List<ProductModel>> getKeepShoppingFor();
  Future<void> addKeepShoppingFor(String productId);
}

class KeepShoppingForRemoteDataSourceImpl implements KeepShoppingForRemoteDataSource {
  final http.Client client;
  final SharedPreferences sharedPreferences;

  KeepShoppingForRemoteDataSourceImpl({
    required this.client,
    required this.sharedPreferences,
  });

  @override
  Future<List<ProductModel>> getKeepShoppingFor() async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.getKeepShoppingFor}'),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body);
        return jsonList.map((json) => ProductModel.fromJson(json)).toList();
      } else {
        throw ServerException(
          jsonDecode(response.body)['error'] ?? 'Failed to get keep shopping for',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }

  @override
  Future<void> addKeepShoppingFor(String productId) async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.addKeepShoppingFor}/$productId'),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      );

      if (response.statusCode != 200) {
        throw ServerException(
          jsonDecode(response.body)['error'] ?? 'Failed to add to keep shopping for',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }
}
