import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../product/domain/entities/product_entity.dart';
import '../../../domain/usecases/get_products_by_category.dart';
import '../../../domain/usecases/delete_product.dart';

part 'admin_products_state.dart';

class AdminProductsCubit extends Cubit<AdminProductsState> {
  final GetProductsByCategory getProductsByCategory;
  final DeleteProduct deleteProduct;

  AdminProductsCubit({
    required this.getProductsByCategory,
    required this.deleteProduct,
  }) : super(AdminProductsInitial());

  Future<void> getProductsByCategory(String category) async {
    emit(AdminProductsLoading());
    
    final result = await getProductsByCategory(category);
    
    result.fold(
      (failure) => emit(AdminProductsError(failure.message)),
      (products) => emit(AdminProductsLoaded(products)),
    );
  }

  Future<void> deleteProduct(String productId) async {
    final result = await deleteProduct(productId);
    
    result.fold(
      (failure) => emit(AdminProductsError(failure.message)),
      (_) => emit(AdminProductDeleteSuccess()),
    );
  }
}
