import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';
import '../repositories/wishlist_repository.dart';

class AddToCartFromWishlist {
  final WishlistRepository repository;

  AddToCartFromWishlist(this.repository);

  ResultFuture<List<ProductEntity>> call(String productId) async {
    return await repository.addToCartFromWishlist(productId);
  }
}
