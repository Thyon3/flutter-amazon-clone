import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/typedef.dart';
import '../entities/order_entity.dart';
import '../repositories/order_repository.dart';

class PlaceOrder {
  final OrderRepository repository;

  PlaceOrder(this.repository);

  ResultFuture<OrderEntity> call(PlaceOrderParams params) async {
    return await repository.placeOrder(
      address: params.address,
      totalPrice: params.totalPrice,
    );
  }
}

class PlaceOrderParams {
  final String address;
  final double totalPrice;

  PlaceOrderParams({
    required this.address,
    required this.totalPrice,
  });
}
