import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/product_entity.dart';
import '../../domain/usecases/get_products_by_category.dart';
import '../../domain/usecases/search_products.dart';
import '../../domain/usecases/get_deal_of_the_day.dart';
import '../../domain/usecases/rate_product.dart';
import '../../domain/usecases/get_product_reviews.dart';

part 'product_event.dart';
part 'product_state.dart';

class ProductBloc extends Bloc<ProductEvent, ProductState> {
  final GetProductsByCategory getProductsByCategoryUseCase;
  final SearchProducts searchProductsUseCase;
  final GetDealOfTheDay getDealOfTheDayUseCase;
  final RateProduct rateProductUseCase;
  final GetProductReviews getProductReviewsUseCase;

  ProductBloc({
    required this.getProductsByCategoryUseCase,
    required this.searchProductsUseCase,
    required this.getDealOfTheDayUseCase,
    required this.rateProductUseCase,
    required this.getProductReviewsUseCase,
  }) : super(ProductInitial()) {
    on<FetchProductsByCategoryEvent>(_onFetchProductsByCategory);
    on<SearchProductsEvent>(_onSearchProducts);
    on<FetchDealOfTheDayEvent>(_onFetchDealOfTheDay);
    on<RateProductEvent>(_onRateProduct);
    on<FetchProductReviewsEvent>(_onFetchProductReviews);
  }

  Future<void> _onFetchProductsByCategory(
    FetchProductsByCategoryEvent event,
    Emitter<ProductState> emit,
  ) async {
    emit(ProductLoading());

    final result = await getProductsByCategoryUseCase(event.category);

    result.fold(
      (failure) => emit(ProductError(failure.message)),
      (products) => emit(ProductsLoaded(products)),
    );
  }

  Future<void> _onSearchProducts(
    SearchProductsEvent event,
    Emitter<ProductState> emit,
  ) async {
    emit(ProductLoading());

    final result = await searchProductsUseCase(event.query);

    result.fold(
      (failure) => emit(ProductError(failure.message)),
      (products) => emit(ProductsLoaded(products)),
    );
  }

  Future<void> _onFetchDealOfTheDay(
    FetchDealOfTheDayEvent event,
    Emitter<ProductState> emit,
  ) async {
    emit(ProductLoading());

    final result = await getDealOfTheDayUseCase();

    result.fold(
      (failure) => emit(ProductError(failure.message)),
      (product) => emit(DealOfTheDayLoaded(product)),
    );
  }

  Future<void> _onRateProduct(
    RateProductEvent event,
    Emitter<ProductState> emit,
  ) async {
    emit(ProductLoading());

    final result = await rateProductUseCase(
      productId: event.productId,
      rating: event.rating,
      review: event.review,
    );

    result.fold(
      (failure) => emit(ProductError(failure.message)),
      (_) => emit(ProductRated()),
    );
  }

  Future<void> _onFetchProductReviews(
    FetchProductReviewsEvent event,
    Emitter<ProductState> emit,
  ) async {
    emit(ProductLoading());

    final result = await getProductReviewsUseCase(event.productId);

    result.fold(
      (failure) => emit(ProductError(failure.message)),
      (reviews) => emit(ProductReviewsLoaded(reviews)),
    );
  }
}
