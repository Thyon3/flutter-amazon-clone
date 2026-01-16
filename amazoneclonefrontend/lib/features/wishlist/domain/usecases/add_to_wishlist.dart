import '../../../../core/utils/typedef.dart';
import '../repositories/wishlist_repository.dart';

class AddToWishlist {
  final WishlistRepository repository;

  AddToWishlist(this.repository);

  ResultVoid call(String productId) async {
    return await repository.addToWishlist(productId);
  }
}
