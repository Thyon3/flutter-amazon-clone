import '../../../../core/utils/typedef.dart';
import '../entities/analytics_entity.dart';
import '../../../order/domain/entities/order_entity.dart';
import '../../../product/domain/entities/product_entity.dart';

abstract class AdminRepository {
  // Analytics
  ResultFuture<AnalyticsEntity> getAnalytics();
  
  // Orders
  ResultFuture<List<OrderEntity>> getAdminOrders();
  ResultVoid changeOrderStatus({
    required String orderId,
    required int status,
  });
  
  // Products
  ResultVoid addProduct({
    required String name,
    required String description,
    required double price,
    required int quantity,
    required String category,
    required List<dynamic> images, // Can be List<File> or List<String>
  });
  
  ResultVoid deleteProduct(String productId);
  
  ResultFuture<List<ProductEntity>> getProductsByCategory(String category);
}
