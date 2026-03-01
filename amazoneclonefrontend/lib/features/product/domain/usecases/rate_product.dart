import '../../../../core/utils/typedef.dart';
import '../repositories/product_repository.dart';

class RateProduct {
  final ProductRepository repository;

  RateProduct(this.repository);

  ResultFuture<void> call({
    required String productId,
    required double rating,
    String? review,
  }) async {
    return await repository.rateProduct(productId, rating, review: review);
  }
}
