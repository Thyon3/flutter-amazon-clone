import '../../../../core/utils/typedef.dart';
import '../repositories/admin_repository.dart';

class DeleteProduct {
  final AdminRepository repository;

  DeleteProduct(this.repository);

  ResultVoid call(String productId) async {
    return await repository.deleteProduct(productId);
  }
}
