import '../../../../core/utils/typedef.dart';
import '../repositories/save_for_later_repository.dart';

class DeleteFromLater {
  final SaveForLaterRepository repository;

  DeleteFromLater(this.repository);

  ResultVoid call(String productId) async {
    return await repository.deleteFromLater(productId);
  }
}
