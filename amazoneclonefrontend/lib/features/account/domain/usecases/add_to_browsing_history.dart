import '../../../../core/utils/typedef.dart';
import '../repositories/account_repository.dart';

class AddToBrowsingHistory {
  final AccountRepository repository;

  AddToBrowsingHistory(this.repository);

  ResultVoid call(String productId) async {
    return await repository.addToBrowsingHistory(productId);
  }
}
