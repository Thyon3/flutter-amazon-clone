import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/repositories/product_repository.dart';

class GetProductsByCategory {
  final ProductRepository repository;

  GetProductsByCategory(this.repository);

  ResultFuture<List<ProductEntity>> call(String category) async {
    return await repository.getProductsByCategory(category);
  }
}
