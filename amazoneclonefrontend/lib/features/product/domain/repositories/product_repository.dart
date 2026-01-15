import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';

abstract class ProductRepository {
  ResultFuture<List<ProductEntity>> getProductsByCategory(String category);
  
  ResultFuture<List<ProductEntity>> searchProducts(String query);
  
  ResultFuture<ProductEntity> getProductById(String id);
  
  ResultFuture<void> rateProduct(String productId, double rating);
  
  ResultFuture<double> getUserRating(String productId);
  
  ResultFuture<double> getAverageRating(String productId);
  
  ResultFuture<int> getRatingCount(String productId);
  
  ResultFuture<ProductEntity> getDealOfTheDay();
}
