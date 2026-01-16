import '../../../../core/utils/typedef.dart';
import '../repositories/save_for_later_repository.dart';

class MoveToCart {
  final SaveForLaterRepository repository;

  MoveToCart(this.repository);

  ResultVoid call(String productId) async {
    return await repository.moveToCart(productId);
  }
}
