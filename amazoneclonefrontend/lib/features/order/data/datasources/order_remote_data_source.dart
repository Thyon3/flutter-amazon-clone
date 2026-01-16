import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/error/exceptions.dart';
import '../models/order_model.dart';

abstract class OrderRemoteDataSource {
  Future<OrderModel> placeOrder({
    required String address,
    required double totalPrice,
  });

  Future<List<OrderModel>> getOrders();
  
  Future<List<OrderModel>> searchOrders(String query);
}

class OrderRemoteDataSourceImpl implements OrderRemoteDataSource {
  final http.Client client;
  final SharedPreferences sharedPreferences;

  OrderRemoteDataSourceImpl({
    required this.client,
    required this.sharedPreferences,
  });

  @override
  Future<OrderModel> placeOrder({
    required String address,
    required double totalPrice,
  }) async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.post(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.placeOrder}'),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: jsonEncode({
          'address': address,
          'totalPrice': totalPrice,
        }),
      );

      if (response.statusCode == 200) {
        return OrderModel.fromJson(jsonDecode(response.body));
      } else {
        throw ServerException(jsonDecode(response.body)['error'] ?? 'Failed to place order');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<List<OrderModel>> getOrders() async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.getMyOrders}'),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body);
        return jsonList.map((json) => OrderModel.fromJson(json)).toList();
      } else {
        throw ServerException(jsonDecode(response.body)['error'] ?? 'Failed to get orders');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }

  @override
  Future<List<OrderModel>> searchOrders(String query) async {
    try {
      final token = sharedPreferences.getString('x-auth-token');
      if (token == null) throw AuthenticationException('No token found');

      final response = await client.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.searchOrders}/$query'),
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body);
        return jsonList.map((json) => OrderModel.fromJson(json)).toList();
      } else {
        throw ServerException(jsonDecode(response.body)['error'] ?? 'Failed to search orders');
      }
    } catch (e) {
      throw ServerException(e.toString());
    }
  }
}
