import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';

abstract class KeepShoppingForRepository {
  ResultFuture<List<ProductEntity>> getKeepShoppingFor();
  
  ResultVoid addKeepShoppingFor(String productId);
}
