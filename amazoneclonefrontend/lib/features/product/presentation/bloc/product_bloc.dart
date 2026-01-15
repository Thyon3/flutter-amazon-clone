import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/usecases/get_products_by_category.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/usecases/search_products.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/usecases/get_deal_of_the_day.dart';

part 'product_event.dart';
part 'product_state.dart';

class ProductBloc extends Bloc<ProductEvent, ProductState> {
  final GetProductsByCategory getProductsByCategoryUseCase;
  final SearchProducts searchProductsUseCase;
  final GetDealOfTheDay getDealOfTheDayUseCase;

  ProductBloc({
    required this.getProductsByCategoryUseCase,
    required this.searchProductsUseCase,
    required this.getDealOfTheDayUseCase,
  }) : super(ProductInitial()) {
    on<FetchProductsByCategoryEvent>(_onFetchProductsByCategory);
    on<SearchProductsEvent>(_onSearchProducts);
    on<FetchDealOfTheDayEvent>(_onFetchDealOfTheDay);
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
}
