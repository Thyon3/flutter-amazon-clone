import '../../../../core/utils/typedef.dart';
import '../repositories/save_for_later_repository.dart';

class SaveForLater {
  final SaveForLaterRepository repository;

  SaveForLater(this.repository);

  ResultVoid call(String productId) async {
    return await repository.saveForLater(productId);
  }
}
