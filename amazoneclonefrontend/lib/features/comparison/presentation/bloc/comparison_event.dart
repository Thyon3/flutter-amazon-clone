part of 'comparison_bloc.dart';

import 'package:equatable/equatable.dart';
import '../../../product/domain/entities/product_entity.dart';

abstract class ComparisonEvent extends Equatable {
  const ComparisonEvent();

  @override
  List<Object?> get props => [];
}

class AddProductToComparison extends ComparisonEvent {
  final ProductEntity product;

  const AddProductToComparison(this.product);

  @override
  List<Object?> get props => [product];
}

class RemoveProductFromComparison extends ComparisonEvent {
  final String productId;

  const RemoveProductFromComparison(this.productId);

  @override
  List<Object?> get props => [productId];
}

class ClearComparison extends ComparisonEvent {
  const ClearComparison();
}

class LoadComparison extends ComparisonEvent {
  const LoadComparison();
}
