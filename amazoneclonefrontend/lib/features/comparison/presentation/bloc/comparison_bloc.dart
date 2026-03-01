import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/models/product_comparison.dart';
import '../../../product/domain/entities/product_entity.dart';

part 'comparison_event.dart';
part 'comparison_state.dart';

class ComparisonBloc extends Bloc<ComparisonEvent, ComparisonState> {
  ProductComparison _comparison = const ProductComparison(products: []);

  ComparisonBloc() : super(ComparisonInitial()) {
    on<AddProductToComparison>(_onAddProductToComparison);
    on<RemoveProductFromComparison>(_onRemoveProductFromComparison);
    on<ClearComparison>(_onClearComparison);
    on<LoadComparison>(_onLoadComparison);
  }

  ProductComparison get currentComparison => _comparison;

  Future<void> _onAddProductToComparison(
    AddProductToComparison event,
    Emitter<ComparisonState> emit,
  ) async {
    if (_comparison.isFull) {
      emit(const ComparisonError('Cannot add more than 4 products for comparison'));
      return;
    }

    if (_comparison.products.any((p) => p.id == event.product.id)) {
      emit(const ComparisonError('Product already added to comparison'));
      return;
    }

    _comparison = _comparison.addProduct(event.product);
    emit(ComparisonUpdated(_comparison));
  }

  Future<void> _onRemoveProductFromComparison(
    RemoveProductFromComparison event,
    Emitter<ComparisonState> emit,
  ) async {
    _comparison = _comparison.removeProduct(event.productId);
    emit(ComparisonUpdated(_comparison));
  }

  Future<void> _onClearComparison(
    ClearComparison event,
    Emitter<ComparisonState> emit,
  ) async {
    _comparison = _comparison.clear();
    emit(ComparisonUpdated(_comparison));
  }

  Future<void> _onLoadComparison(
    LoadComparison event,
    Emitter<ComparisonState> emit,
  ) async {
    emit(ComparisonUpdated(_comparison));
  }
}
