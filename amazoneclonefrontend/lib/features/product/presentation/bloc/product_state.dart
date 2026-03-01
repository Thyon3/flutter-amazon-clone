part of 'product_bloc.dart';

abstract class ProductState extends Equatable {
  const ProductState();

  @override
  List<Object?> get props => [];
}

class ProductInitial extends ProductState {}

class ProductLoading extends ProductState {}

class ProductsLoaded extends ProductState {
  final List<ProductEntity> products;

  const ProductsLoaded(this.products);

  @override
  List<Object?> get props => [products];
}

class DealOfTheDayLoaded extends ProductState {
  final ProductEntity product;

  const DealOfTheDayLoaded(this.product);

  @override
  List<Object?> get props => [product];
}

class ProductError extends ProductState {
  final String message;

  const ProductError(this.message);

  @override
  List<Object?> get props => [message];
}

class ProductReviewsLoaded extends ProductState {
  final List<RatingEntity> reviews;

  const ProductReviewsLoaded(this.reviews);

  @override
  List<Object?> get props => [reviews];
}

class ProductRated extends ProductState {}
