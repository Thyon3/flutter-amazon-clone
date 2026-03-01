import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/error/exceptions.dart';
import '../../../product/data/models/product_model.dart';

abstract class SaveForLaterRemoteDataSource {
  Future<List<ProductModel>> getSaveForLater();
  Future<void> saveForLater(String productId);
  Future<void> deleteFromLater(String productId);
  Future<void> moveToCart(String productId);
}

class SaveForLaterRemoteDataSourceImpl implements SaveForLaterRemoteDataSource {
  final http.Client client;
  final SharedPreferences sharedPreferences;

  SaveForLaterRemoteDataSourceImpl({
    required this.client,
    required this.sharedPreferences,
  });

  @override
  Future<List<ProductModel>> getSaveForLater() async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.getSaveForLater}'),
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
          jsonDecode(response.body)['error'] ?? 'Failed to get save for later items',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }

  @override
  Future<void> saveForLater(String productId) async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.post(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.saveForLater}'),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: jsonEncode({'id': productId}),
      );

      if (response.statusCode != 200) {
        throw ServerException(
          jsonDecode(response.body)['error'] ?? 'Failed to save for later',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }

  @override
  Future<void> deleteFromLater(String productId) async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.delete(
        Uri.parse(
          '${ApiConstants.baseUrl}${ApiConstants.deleteFromLater}/$productId',
        ),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      );

      if (response.statusCode != 200) {
        throw ServerException(
          jsonDecode(response.body)['error'] ?? 'Failed to delete from save for later',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }

  @override
  Future<void> moveToCart(String productId) async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.post(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.moveToCart}'),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: jsonEncode({'id': productId}),
      );

      if (response.statusCode != 200) {
        throw ServerException(
          jsonDecode(response.body)['error'] ?? 'Failed to move to cart',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }
}
