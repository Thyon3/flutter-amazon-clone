import '../../../../core/utils/typedef.dart';
import '../entities/order_entity.dart';
import '../repositories/order_repository.dart';

class SearchOrders {
  final OrderRepository repository;

  SearchOrders(this.repository);

  ResultFuture<List<OrderEntity>> call(String query) async {
    return await repository.searchOrders(query);
  }
}
