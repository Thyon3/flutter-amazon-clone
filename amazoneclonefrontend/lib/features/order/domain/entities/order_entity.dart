import 'package:equatable/equatable.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';

class OrderEntity extends Equatable {
  final String id;
  final List<ProductEntity> products;
  final List<int> quantity;
  final String address;
  final String userId;
  final int orderedAt;
  final OrderStatus status;
  final double totalPrice;

  const OrderEntity({
    required this.id,
    required this.products,
    required this.quantity,
    required this.address,
    required this.userId,
    required this.orderedAt,
    required this.status,
    required this.totalPrice,
  });

  @override
  List<Object?> get props => [
        id,
        products,
        quantity,
        address,
        userId,
        orderedAt,
        status,
        totalPrice,
      ];

  DateTime get orderedDate => DateTime.fromMillisecondsSinceEpoch(orderedAt);
}

enum OrderStatus {
  pending(0),
  completed(1),
  received(2),
  delivered(3);

  final int value;
  const OrderStatus(this.value);

  static OrderStatus fromValue(int value) {
    return OrderStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => OrderStatus.pending,
    );
  }
}
