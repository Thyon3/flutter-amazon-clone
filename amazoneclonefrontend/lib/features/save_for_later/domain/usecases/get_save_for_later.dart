import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';
import '../repositories/save_for_later_repository.dart';

class GetSaveForLater {
  final SaveForLaterRepository repository;

  GetSaveForLater(this.repository);

  ResultFuture<List<ProductEntity>> call() async {
    return await repository.getSaveForLater();
  }
}
