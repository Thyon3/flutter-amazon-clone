import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';

abstract class WishlistRepository {
  ResultFuture<List<ProductEntity>> getWishlist();
  
  ResultVoid addToWishlist(String productId);
  
  ResultVoid removeFromWishlist(String productId);
  
  ResultFuture<List<ProductEntity>> addToCartFromWishlist(String productId);
  
  Future<Either<Failure, bool>> checkIsWishlisted(String productId);
}
