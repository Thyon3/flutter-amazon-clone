import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';
import '../repositories/keep_shopping_for_repository.dart';

class GetKeepShoppingFor {
  final KeepShoppingForRepository repository;

  GetKeepShoppingFor(this.repository);

  ResultFuture<List<ProductEntity>> call() async {
    return await repository.getKeepShoppingFor();
  }
}
