import 'dart:convert';
import 'package:flutter_amazon_clone_bloc/features/order/domain/entities/order_entity.dart';
import 'package:flutter_amazon_clone_bloc/features/product/data/models/product_model.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';

class OrderModel extends OrderEntity {
  const OrderModel({
    required super.id,
    required super.products,
    required super.quantity,
    required super.address,
    required super.userId,
    required super.orderedAt,
    required super.status,
    required super.totalPrice,
  });

  Map<String, dynamic> toMap() {
    return {
      '_id': id,
      'products': products
          .map((x) => (x as ProductModel).toMap())
          .toList(),
      'quantity': quantity,
      'address': address,
      'userId': userId,
      'orderedAt': orderedAt,
      'status': status.value,
      'totalPrice': totalPrice,
    };
  }

  factory OrderModel.fromMap(Map<String, dynamic> map) {
    return OrderModel(
      id: map['_id'] ?? '',
      products: List<ProductEntity>.from(
        map['products']?.map(
              (x) => ProductModel.fromMap(x['product']),
        ) ??
            [],
      ),
      quantity: List<int>.from(
        map['products']?.map(
              (x) => x['quantity'],
        ) ??
            [],
      ),
      address: map['address'] ?? '',
      userId: map['userId'] ?? '',
      orderedAt: map['orderedAt']?.toInt() ?? 0,
      status: OrderStatus.fromValue(map['status']?.toInt() ?? 0),
      totalPrice: map['totalPrice']?.toDouble() ?? 0.0,
    );
  }

  String toJson() => json.encode(toMap());

  factory OrderModel.fromJson(String source) =>
      OrderModel.fromMap(json.decode(source));
}
