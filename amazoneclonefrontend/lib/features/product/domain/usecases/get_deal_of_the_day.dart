import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/repositories/product_repository.dart';

class GetDealOfTheDay {
  final ProductRepository repository;

  GetDealOfTheDay(this.repository);

  ResultFuture<ProductEntity> call() async {
    return await repository.getDealOfTheDay();
  }
}
