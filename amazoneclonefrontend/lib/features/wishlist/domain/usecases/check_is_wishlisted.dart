import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/wishlist_repository.dart';

class CheckIsWishlisted {
  final WishlistRepository repository;

  CheckIsWishlisted(this.repository);

  Future<Either<Failure, bool>> call(String productId) async {
    return await repository.checkIsWishlisted(productId);
  }
}
