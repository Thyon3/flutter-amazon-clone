import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/constants/api_constants.dart';
import '../../../../core/error/exceptions.dart';
import '../models/product_model.dart';

abstract class ProductRemoteDataSource {
  Future<List<ProductModel>> getProductsByCategory(
    String category,
    String token,
  );
  Future<List<ProductModel>> searchProducts(String query, String token);
  Future<ProductModel> getDealOfTheDay(String token);
  Future<void> rateProduct(
    String productId,
    double rating,
    String token, {
    String? review,
  });
  Future<List<RatingModel>> getProductReviews(String productId, String token);
  Future<double> getUserRating(String productId, String token);
  Future<double> getAverageRating(String productId, String token);
  Future<int> getRatingCount(String productId, String token);
}

class ProductRemoteDataSourceImpl implements ProductRemoteDataSource {
  final http.Client client;

  ProductRemoteDataSourceImpl({required this.client});

  @override
  Future<List<ProductModel>> getProductsByCategory(
    String category,
    String token,
  ) async {
    try {
      final response = await client.get(
        Uri.parse(
          '${ApiConstants.baseUrl}${ApiConstants.getProducts}?category=$category',
        ),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body);
        return jsonList.map((json) => ProductModel.fromMap(json)).toList();
      } else {
        throw ServerException('Failed to load products');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<List<ProductModel>> searchProducts(String query, String token) async {
    try {
      final response = await client.get(
        Uri.parse(
          '${ApiConstants.baseUrl}${ApiConstants.searchProducts}/$query',
        ),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body);
        return jsonList.map((json) => ProductModel.fromMap(json)).toList();
      } else {
        throw ServerException('Failed to search products');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<ProductModel> getDealOfTheDay(String token) async {
    try {
      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.dealOfTheDay}'),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        return ProductModel.fromJson(response.body);
      } else {
        throw ServerException('Failed to load deal of the day');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<void> rateProduct(
    String productId,
    double rating,
    String token, {
    String? review,
  }) async {
    try {
      final response = await client.post(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.rateProduct}'),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        },
        body: jsonEncode({'id': productId, 'rating': rating, 'review': review}),
      );

      if (response.statusCode != 200) {
        throw ServerException('Failed to rate product');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<List<RatingModel>> getProductReviews(
    String productId,
    String token,
  ) async {
    try {
      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}/api/product-reviews/$productId'),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body);
        return jsonList.map((json) => RatingModel.fromMap(json)).toList();
      } else {
        throw ServerException('Failed to load product reviews');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<double> getUserRating(String productId, String token) async {
    try {
      final response = await client.get(
        Uri.parse(
          '${ApiConstants.baseUrl}${ApiConstants.getProductRating}/$productId',
        ),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body).toDouble();
      } else {
        throw ServerException('Failed to get user rating');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<double> getAverageRating(String productId, String token) async {
    try {
      final response = await client.get(
        Uri.parse(
          '${ApiConstants.baseUrl}${ApiConstants.getAverageRating}/$productId',
        ),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body).toDouble();
      } else {
        throw ServerException('Failed to get average rating');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<int> getRatingCount(String productId, String token) async {
    try {
      final response = await client.get(
        Uri.parse(
          '${ApiConstants.baseUrl}${ApiConstants.getAverageRatingLength}/$productId',
        ),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as int;
      } else {
        throw ServerException('Failed to get rating count');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }
}
