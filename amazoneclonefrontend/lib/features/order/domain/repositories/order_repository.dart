import '../../../../core/utils/typedef.dart';
import '../entities/order_entity.dart';

abstract class OrderRepository {
  ResultFuture<OrderEntity> placeOrder({
    required String address,
    required double totalPrice,
  });

  ResultFuture<List<OrderEntity>> getOrders();
  
  ResultFuture<List<OrderEntity>> searchOrders(String query);
}
