import '../../../../core/utils/typedef.dart';
import '../repositories/admin_repository.dart';

class ChangeOrderStatus {
  final AdminRepository repository;

  ChangeOrderStatus(this.repository);

  ResultVoid call(ChangeOrderStatusParams params) async {
    return await repository.changeOrderStatus(
      orderId: params.orderId,
      status: params.status,
    );
  }
}

class ChangeOrderStatusParams {
  final String orderId;
  final int status;

  ChangeOrderStatusParams({
    required this.orderId,
    required this.status,
  });
}
