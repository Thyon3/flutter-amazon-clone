import '../../../../core/utils/typedef.dart';
import '../entities/product_entity.dart';
import '../repositories/product_repository.dart';

class GetProductReviews {
  final ProductRepository repository;

  GetProductReviews(this.repository);

  ResultFuture<List<RatingEntity>> call(String productId) async {
    return await repository.getProductReviews(productId);
  }
}
