import '../../../../core/utils/typedef.dart';
import '../../../order/domain/entities/order_entity.dart';
import '../repositories/admin_repository.dart';

class GetAdminOrders {
  final AdminRepository repository;

  GetAdminOrders(this.repository);

  ResultFuture<List<OrderEntity>> call() async {
    return await repository.getAdminOrders();
  }
}
