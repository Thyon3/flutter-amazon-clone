import 'package:flutter_amazon_clone_bloc/features/auth/domain/entities/user.dart';
import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';

abstract class AccountRepository {
  // Browsing History
  ResultFuture<List<ProductEntity>> getBrowsingHistory();

  ResultVoid clearBrowsingHistory();

  ResultVoid addToBrowsingHistory(String productId);

  ResultFuture<User> updateProfile({String? name, String? email});
}
