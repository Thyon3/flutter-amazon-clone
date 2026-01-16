import '../../../../core/utils/typedef.dart';
import '../repositories/keep_shopping_for_repository.dart';

class AddKeepShoppingFor {
  final KeepShoppingForRepository repository;

  AddKeepShoppingFor(this.repository);

  ResultVoid call(String productId) async {
    return await repository.addKeepShoppingFor(productId);
  }
}
