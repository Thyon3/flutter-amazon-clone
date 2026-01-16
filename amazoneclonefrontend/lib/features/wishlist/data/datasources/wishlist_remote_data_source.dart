import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/error/exceptions.dart';
import '../../../product/data/models/product_model.dart';

abstract class WishlistRemoteDataSource {
  Future<List<ProductModel>> getWishlist();
  Future<void> addToWishlist(String productId);
  Future<void> removeFromWishlist(String productId);
  Future<List<ProductModel>> addToCartFromWishlist(String productId);
  Future<bool> checkIsWishlisted(String productId);
}

class WishlistRemoteDataSourceImpl implements WishlistRemoteDataSource {
  final http.Client client;
  final SharedPreferences sharedPreferences;

  WishlistRemoteDataSourceImpl({
    required this.client,
    required this.sharedPreferences,
  });

  @override
  Future<List<ProductModel>> getWishlist() async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.getWishList}'),
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
          jsonDecode(response.body)['error'] ?? 'Failed to get wishlist',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }

  @override
  Future<void> addToWishlist(String productId) async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.post(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.addToWishList}'),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: jsonEncode({'id': productId}),
      );

      if (response.statusCode != 200) {
        throw ServerException(
          jsonDecode(response.body)['error'] ?? 'Failed to add to wishlist',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }

  @override
  Future<void> removeFromWishlist(String productId) async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.delete(
        Uri.parse(
          '${ApiConstants.baseUrl}${ApiConstants.deleteFromWishList}/$productId',
        ),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      );

      if (response.statusCode != 200) {
        throw ServerException(
          jsonDecode(response.body)['error'] ?? 'Failed to remove from wishlist',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }

  @override
  Future<List<ProductModel>> addToCartFromWishlist(String productId) async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.post(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.addToCartFromWishList}'),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: jsonEncode({'id': productId}),
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body);
        return jsonList.map((json) => ProductModel.fromJson(json)).toList();
      } else {
        throw ServerException(
          jsonDecode(response.body)['error'] ?? 'Failed to add to cart',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }

  @override
  Future<bool> checkIsWishlisted(String productId) async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.isWishlisted}/$productId'),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as bool;
      } else {
        throw ServerException(
          jsonDecode(response.body)['error'] ?? 'Failed to check wishlist status',
        );
      }
    } catch (e) {
      if (e is ServerException || e is AuthenticationException) rethrow;
      throw NetworkException(e.toString());
    }
  }
}
