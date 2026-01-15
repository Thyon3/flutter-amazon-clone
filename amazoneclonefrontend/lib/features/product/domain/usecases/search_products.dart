import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/repositories/product_repository.dart';

class SearchProducts {
  final ProductRepository repository;

  SearchProducts(this.repository);

  ResultFuture<List<ProductEntity>> call(String query) async {
    return await repository.searchProducts(query);
  }
}
