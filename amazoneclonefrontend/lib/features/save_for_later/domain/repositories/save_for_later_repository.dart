import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';

abstract class SaveForLaterRepository {
  ResultFuture<List<ProductEntity>> getSaveForLater();
  
  ResultVoid saveForLater(String productId);
  
  ResultVoid deleteFromLater(String productId);
  
  ResultVoid moveToCart(String productId);
}
