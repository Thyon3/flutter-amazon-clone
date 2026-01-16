import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';
import '../repositories/wishlist_repository.dart';

class GetWishlist {
  final WishlistRepository repository;

  GetWishlist(this.repository);

  ResultFuture<List<ProductEntity>> call() async {
    return await repository.getWishlist();
  }
}
