import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';
import '../repositories/admin_repository.dart';

class GetProductsByCategory {
  final AdminRepository repository;

  GetProductsByCategory(this.repository);

  ResultFuture<List<ProductEntity>> call(String category) async {
    return await repository.getProductsByCategory(category);
  }
}
