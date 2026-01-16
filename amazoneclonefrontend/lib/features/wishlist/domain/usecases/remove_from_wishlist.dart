import '../../../../core/utils/typedef.dart';
import '../repositories/wishlist_repository.dart';

class RemoveFromWishlist {
  final WishlistRepository repository;

  RemoveFromWishlist(this.repository);

  ResultVoid call(String productId) async {
    return await repository.removeFromWishlist(productId);
  }
}
