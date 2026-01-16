import 'dart:io';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../domain/usecases/add_product.dart';

part 'admin_add_product_state.dart';

class AdminAddProductCubit extends Cubit<AdminAddProductState> {
  final AddProduct addProduct;

  AdminAddProductCubit({required this.addProduct}) : super(AdminAddProductInitial());

  Future<void> addProduct({
    required String name,
    required String description,
    required double price,
    required int quantity,
    required String category,
    required List<File> images,
  }) async {
    emit(AdminAddProductLoading());
    
    final result = await addProduct(
      AddProductParams(
        name: name,
        description: description,
        price: price,
        quantity: quantity,
        category: category,
        images: images,
      ),
    );
    
    result.fold(
      (failure) => emit(AdminAddProductError(failure.message)),
      (_) => emit(AdminAddProductSuccess()),
    );
  }
}
