import '../../../../core/utils/typedef.dart';
import '../repositories/account_repository.dart';

class ClearBrowsingHistory {
  final AccountRepository repository;

  ClearBrowsingHistory(this.repository);

  ResultVoid call() async {
    return await repository.clearBrowsingHistory();
  }
}
