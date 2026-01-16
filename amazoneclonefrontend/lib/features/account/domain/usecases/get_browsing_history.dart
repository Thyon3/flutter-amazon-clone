import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';
import '../repositories/account_repository.dart';

class GetBrowsingHistory {
  final AccountRepository repository;

  GetBrowsingHistory(this.repository);

  ResultFuture<List<ProductEntity>> call() async {
    return await repository.getBrowsingHistory();
  }
}
